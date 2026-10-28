import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { listSnapshots, normalizeSnapshotSettings, pruneSnapshots } from './snapshots.js';

describe('snapshot settings', () => {
  it('falls back to safe defaults for anything unknown', () => {
    expect(normalizeSnapshotSettings(null)).toEqual({ enabled: false, interval: 'daily', retentionDays: 7 });
    expect(normalizeSnapshotSettings({ enabled: true, interval: '6h', retentionDays: 30 })).toEqual({ enabled: true, interval: '6h', retentionDays: 30 });
    expect(normalizeSnapshotSettings({ enabled: 'yes', interval: 'minutely', retentionDays: 5 })).toEqual({ enabled: false, interval: 'daily', retentionDays: 7 });
  });
});

describe('snapshot files', () => {
  let directory: string;
  beforeEach(async () => {
    directory = await mkdtemp(path.join(tmpdir(), 'kd-snapshots-'));
    process.env.SNAPSHOTS_DIR = directory;
  });
  afterEach(async () => {
    delete process.env.SNAPSHOTS_DIR;
    await rm(directory, { recursive: true, force: true });
  });

  it('lists only snapshot files, newest first, and ignores partial writes and the key', async () => {
    for (const name of ['snapshot-20261020-030000-000.kdbackup', 'snapshot-20261027-030000-000.kdbackup',
      'snapshot-20261028-120000-500-before-restore.kdbackup', 'snapshot-20261028-130000-000.kdbackup.partial',
      '.snapshot-key', 'notes.txt']) {
      await writeFile(path.join(directory, name), 'x');
    }
    const snapshots = await listSnapshots();
    expect(snapshots.map((s) => s.name)).toEqual([
      'snapshot-20261028-120000-500-before-restore.kdbackup',
      'snapshot-20261027-030000-000.kdbackup',
      'snapshot-20261020-030000-000.kdbackup',
    ]);
    expect(snapshots[0]).toMatchObject({ createdAt: '2026-10-28T12:00:00.500Z', beforeRestore: true, size: 1 });
  });

  it('removes snapshots past the retention period but always keeps the newest', async () => {
    for (const name of ['snapshot-20261001-030000-000.kdbackup', 'snapshot-20261020-030000-000.kdbackup', 'snapshot-20261027-030000-000.kdbackup']) {
      await writeFile(path.join(directory, name), 'x');
    }
    const now = new Date('2026-10-28T12:00:00Z');
    expect(await pruneSnapshots(7, now)).toEqual(['snapshot-20261020-030000-000.kdbackup', 'snapshot-20261001-030000-000.kdbackup']);
    expect(await readdir(directory)).toEqual(['snapshot-20261027-030000-000.kdbackup']);
    // Even when every snapshot is old, the newest one stays.
    expect(await pruneSnapshots(1, new Date('2027-01-01T00:00:00Z'))).toEqual([]);
    expect(await readdir(directory)).toEqual(['snapshot-20261027-030000-000.kdbackup']);
  });
});
