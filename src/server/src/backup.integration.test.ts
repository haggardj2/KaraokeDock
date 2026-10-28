import { mkdtemp, readFile, rm, writeFile, mkdir, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { query } from './db.js';
import { runIntegrationTestMigrations } from './integrationTestMigrations.js';
import { decryptBackup, encryptBackup, exportDatabase, exportSettings, restoreDatabase, restoreSettings } from './backup.js';
import { configureSnapshots, listSnapshots, restoreSnapshot, takeSnapshot } from './snapshots.js';

// Same opt-in database as the singer merge tests; each run uses its own schema.
const { enabled, schema } = vi.hoisted(() => {
  const value = process.env.SINGER_MERGE_TEST_DATABASE_URL;
  const schema = `backup_test_${process.pid}`;
  if (value) {
    const url = new URL(value);
    if (url.pathname !== '/singer_merge_test') throw new Error('Backup tests require the dedicated singer_merge_test database');
    url.searchParams.set('options', `-csearch_path=${schema},public`);
    process.env.DATABASE_URL = url.toString();
  }
  return { enabled: Boolean(value), schema };
});

const fast = { appVersion: 'test', kdf: { N: 2 ** 14, r: 8, p: 1 } };
const passphrase = 'restore me please';

async function snapshot(tables: string[]) {
  const result: Record<string, unknown> = {};
  for (const table of tables) {
    const rows = await query(`SELECT COALESCE(json_agg(t ORDER BY t), '[]'::json) AS rows FROM "${table}" t`);
    result[table] = rows.rows[0].rows;
  }
  return result;
}

describe.runIf(enabled)('database and settings backups against PostgreSQL', () => {
  let imagesDir: string;

  beforeAll(async () => {
    await query(`CREATE SCHEMA ${schema}`);
    await runIntegrationTestMigrations();
    imagesDir = await mkdtemp(path.join(tmpdir(), 'kd-backup-images-'));
  }, 30_000);

  afterAll(async () => {
    await query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    if (imagesDir) await rm(imagesDir, { recursive: true, force: true });
  });

  it('restores every table exactly, including rows that reference each other, and the images', async () => {
    // Seed data that exercises both foreign-key cycles and the users self-reference.
    const artist = (await query(`INSERT INTO artists(name, name_norm) VALUES ('The Harbor Band', 'the harbor band') RETURNING id`)).rows[0].id;
    await query(`INSERT INTO tracks(title, artist_id, kind, path, disc_id) VALUES ('Northern Lights', $1, 'mp4', '/media/karaoke/northern-lights.mp4', 'SC01-02')`, [artist]);
    const singer = (await query(`INSERT INTO singers(display_name, normalized_name) VALUES ('Alex Rivera', 'alex rivera') RETURNING id`)).rows[0].id;
    const owner = (await query(`INSERT INTO users(username, role, singer_id) VALUES ('alex', 'admin', $1) RETURNING id`, [singer])).rows[0].id;
    await query(`INSERT INTO users(username, role, canonical_user_id, social_provider, social_subject) VALUES ('alex-google', 'user', $1, 'google', 'google-subject')`, [owner]);
    await query(`UPDATE singers SET profile_image_user_id = $1 WHERE id = $2`, [owner, singer]);
    const rotation = (await query(`INSERT INTO rotations(name) VALUES ('Tonight') RETURNING id`)).rows[0].id;
    const turn = (await query(`INSERT INTO rotation_turns(rotation_id, singer_id) VALUES ($1, $2) RETURNING id`, [rotation, singer])).rows[0].id;
    await query(`UPDATE rotations SET current_turn_id = $1 WHERE id = $2`, [turn, rotation]);
    await query(`INSERT INTO settings(key, value) VALUES ('oidc.client_secret', '"s3cret"') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`);
    await query(`INSERT INTO sessions(token, expires_at, user_id, role) VALUES ('old-session', now() + interval '1 day', $1, 'admin')`, [owner]);
    await mkdir(path.join(imagesDir, 'player-backgrounds'), { recursive: true });
    await writeFile(path.join(imagesDir, 'singer-1.png'), Buffer.from([1, 2, 3]));
    await writeFile(path.join(imagesDir, 'player-backgrounds', 'stage.jpg'), Buffer.from([4, 5, 6]));

    const tables = (await query(`SELECT tablename FROM pg_tables WHERE schemaname = current_schema() AND tablename <> 'sessions' ORDER BY tablename`))
      .rows.map((row) => row.tablename as string);
    const before = await snapshot(tables);

    const file = await encryptBackup('database', await exportDatabase(imagesDir), passphrase, fast);
    expect(file.toString('latin1')).not.toContain('s3cret');

    // Change everything after the backup.
    await query(`DELETE FROM rotation_turns`);
    await query(`UPDATE rotations SET current_turn_id = NULL, name = 'Changed'`);
    await query(`UPDATE singers SET profile_image_user_id = NULL`);
    await query(`DELETE FROM users WHERE canonical_user_id IS NOT NULL`);
    await query(`INSERT INTO singers(display_name, normalized_name) VALUES ('Intruder', 'intruder')`);
    await query(`UPDATE settings SET value = '"changed"' WHERE key = 'oidc.client_secret'`);
    await rm(path.join(imagesDir, 'singer-1.png'));

    const { payload } = await decryptBackup(file, passphrase);
    const result = await restoreDatabase(payload as any, imagesDir);
    expect(result.files).toBe(2);

    expect(await snapshot(tables)).toEqual(before);
    // Sign-ins are not part of a backup.
    expect((await query(`SELECT COUNT(*)::int AS n FROM sessions`)).rows[0].n).toBe(0);
    expect(await readFile(path.join(imagesDir, 'singer-1.png'))).toEqual(Buffer.from([1, 2, 3]));
    expect((await readdir(path.join(imagesDir, 'player-backgrounds')))).toEqual(['stage.jpg']);
    // New rows continue after the restored ids.
    const next = (await query(`INSERT INTO singers(display_name, normalized_name) VALUES ('New', 'new') RETURNING id`)).rows[0].id;
    expect(Number(next)).toBeGreaterThan(Number(singer));
  }, 60_000);

  it('merges a settings backup over the current settings', async () => {
    await query(`INSERT INTO settings(key, value) VALUES ('requests.theme', '"stage"') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`);
    const file = await encryptBackup('settings', await exportSettings(), passphrase, fast);

    await query(`UPDATE settings SET value = '"daylight"' WHERE key = 'requests.theme'`);
    await query(`INSERT INTO settings(key, value) VALUES ('added.after.backup', 'true')`);

    const { payload } = await decryptBackup(file, passphrase);
    await restoreSettings(payload as any);
    const rows = (await query(`SELECT key, value FROM settings WHERE key IN ('requests.theme', 'added.after.backup') ORDER BY key`)).rows;
    expect(rows).toEqual([{ key: 'added.after.backup', value: true }, { key: 'requests.theme', value: 'stage' }]);
  });

  it('takes a snapshot, restores it, and keeps the state it replaced as a safety snapshot', async () => {
    const snapshotsDir = await mkdtemp(path.join(tmpdir(), 'kd-snapshots-'));
    process.env.SNAPSHOTS_DIR = snapshotsDir;
    let restored = 0;
    configureSnapshots({ appVersion: 'test', getImageUploadsDir: async () => imagesDir, onRestored: () => { restored++; } });
    try {
      await query(`INSERT INTO singers(display_name, normalized_name) VALUES ('Snapshot Singer', 'snapshot singer')`);
      const snapshot = await takeSnapshot();
      expect((await readdir(snapshotsDir)).sort()).toEqual(['.snapshot-key', snapshot.name]);
      const file = await readFile(path.join(snapshotsDir, snapshot.name));
      expect(file.toString('latin1')).not.toContain('Snapshot Singer');

      await query(`DELETE FROM singers WHERE normalized_name = 'snapshot singer'`);
      await query(`INSERT INTO singers(display_name, normalized_name) VALUES ('After Snapshot', 'after snapshot')`);

      const result = await restoreSnapshot(snapshot.name);
      expect(restored).toBe(1);
      const names = (await query(`SELECT normalized_name FROM singers`)).rows.map((row) => row.normalized_name);
      expect(names).toContain('snapshot singer');
      expect(names).not.toContain('after snapshot');

      // The state just before the restore is kept, so the restore can be undone.
      const safety = (await listSnapshots()).find((entry) => entry.beforeRestore);
      expect(safety?.name).toBe(result.safetySnapshot);
      await restoreSnapshot(result.safetySnapshot);
      const undone = (await query(`SELECT normalized_name FROM singers`)).rows.map((row) => row.normalized_name);
      expect(undone).toContain('after snapshot');
      expect(undone).not.toContain('snapshot singer');

      await expect(restoreSnapshot('../../etc/passwd')).rejects.toThrow(/not found/);
    } finally {
      delete process.env.SNAPSHOTS_DIR;
      await rm(snapshotsDir, { recursive: true, force: true });
    }
  }, 60_000);
});
