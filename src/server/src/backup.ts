// Encrypted backups of the whole database (with uploaded images) or of just the settings.
//
// File layout: "KDBACKUP\n" + one line of JSON header + "\n" + AES-256-GCM ciphertext + 16-byte tag.
// The header (kind, date, KDF parameters, IV) is readable without the passphrase, and is
// authenticated as additional data so it cannot be altered or swapped onto another backup.
// Manual backups derive the key from the admin's passphrase via scrypt (nothing secret is stored);
// automatic snapshots use a random key kept in a key file beside them ("keyfile", see snapshots.ts).
import { createHash, randomBytes, scrypt as scryptCallback, createCipheriv, createDecipheriv, type ScryptOptions } from 'node:crypto';
import { promisify } from 'node:util';
import { gzip as gzipCallback, gunzip as gunzipCallback } from 'node:zlib';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { PoolClient } from 'pg';
import { withTransaction } from './db.js';

const scrypt = promisify(scryptCallback) as (password: string, salt: Buffer, keylen: number, options: ScryptOptions) => Promise<Buffer>;
const gzip = promisify(gzipCallback);
const gunzip = promisify(gunzipCallback);

const MAGIC = Buffer.from('KDBACKUP\n');
const TAG_BYTES = 16;
const MIN_PASSPHRASE_LENGTH = 10;
const MAX_PASSPHRASE_LENGTH = 1024;
// Default scrypt cost; restores accept a bounded range so a crafted file can't exhaust memory.
const DEFAULT_KDF = { N: 2 ** 17, r: 8, p: 1 };
const MAX_KDF_N = 2 ** 20;
const MIN_KDF_N = 2 ** 14;
// Sessions are never backed up: restoring them would revive old sign-ins.
const EXCLUDED_TABLES = new Set(['sessions']);
const MAX_IMAGE_BYTES = 1024 * 1024 * 1024;
const INSERT_CHUNK_ROWS = 2000;

export type BackupKind = 'database' | 'settings';

export type BackupHeader = {
  format: 'karaokedock-backup';
  version: 1;
  kind: BackupKind;
  createdAt: string;
  appVersion: string;
  kdf: { name: 'scrypt'; N: number; r: number; p: number; salt: string } | { name: 'keyfile'; keyId: string };
  cipher: { name: 'aes-256-gcm'; iv: string };
};

// jsonText lists json/jsonb columns exported as text: a JSON null and an empty (SQL NULL)
// value look the same once inside JSON, so those columns travel as their text form.
type TableDump = { columns: string[]; jsonText?: string[]; rows: Record<string, unknown>[] };
type DatabasePayload = { tables: Record<string, TableDump>; files: { path: string; data: string }[] };
type SettingsPayload = { settings: { key: string; value: unknown }[] };

export class BackupError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}

export function validatePassphrase(passphrase: unknown): string {
  if (typeof passphrase !== 'string' || passphrase.length < MIN_PASSPHRASE_LENGTH) {
    throw new BackupError(`The passphrase must be at least ${MIN_PASSPHRASE_LENGTH} characters.`);
  }
  if (passphrase.length > MAX_PASSPHRASE_LENGTH) throw new BackupError('The passphrase is too long.');
  return passphrase;
}

type ScryptKdf = Extract<BackupHeader['kdf'], { name: 'scrypt' }>;

// Only one backup, restore or snapshot runs at a time: each holds a whole database in memory.
let backupBusy = false;

export async function withBackupLock<T>(task: () => Promise<T>): Promise<T> {
  if (backupBusy) throw new BackupError('Another backup, restore or snapshot is already running. Try again when it finishes.', 409);
  backupBusy = true;
  try {
    return await task();
  } finally {
    backupBusy = false;
  }
}

// Short fingerprint of a snapshot key, so a snapshot can say which key it needs.
export function snapshotKeyId(key: Buffer): string {
  return createHash('sha256').update(key).digest('hex').slice(0, 16);
}

async function deriveKey(passphrase: string, kdf: ScryptKdf): Promise<Buffer> {
  return scrypt(passphrase, Buffer.from(kdf.salt, 'base64'), 32, {
    N: kdf.N, r: kdf.r, p: kdf.p, maxmem: 256 * kdf.N * kdf.r + 16 * 1024 * 1024,
  });
}

async function seal(header: BackupHeader, key: Buffer, payload: unknown): Promise<Buffer> {
  const headerLine = Buffer.from(`${JSON.stringify(header)}\n`);
  const cipher = createCipheriv('aes-256-gcm', key, Buffer.from(header.cipher.iv, 'base64'));
  cipher.setAAD(headerLine);
  const plaintext = await gzip(Buffer.from(JSON.stringify(payload)));
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return Buffer.concat([MAGIC, headerLine, ciphertext, cipher.getAuthTag()]);
}

function newHeader(kind: BackupKind, kdf: BackupHeader['kdf'], options: { appVersion: string; now?: Date }): BackupHeader {
  return {
    format: 'karaokedock-backup',
    version: 1,
    kind,
    createdAt: (options.now ?? new Date()).toISOString(),
    appVersion: options.appVersion,
    kdf,
    cipher: { name: 'aes-256-gcm', iv: randomBytes(12).toString('base64') },
  };
}

export async function encryptBackup(
  kind: BackupKind,
  payload: unknown,
  passphrase: string,
  options: { appVersion: string; kdf?: { N: number; r: number; p: number }; now?: Date },
): Promise<Buffer> {
  const header = newHeader(kind, { name: 'scrypt', ...(options.kdf ?? DEFAULT_KDF), salt: randomBytes(16).toString('base64') }, options);
  return seal(header, await deriveKey(passphrase, header.kdf as ScryptKdf), payload);
}

export async function encryptBackupWithKey(kind: BackupKind, payload: unknown, key: Buffer, options: { appVersion: string; now?: Date }) {
  return seal(newHeader(kind, { name: 'keyfile', keyId: snapshotKeyId(key) }, options), key, payload);
}

// Reads the plaintext header without the passphrase (also used to show what a file is).
export function readBackupHeader(file: Buffer): { header: BackupHeader; headerLine: Buffer; body: Buffer } {
  if (file.length < MAGIC.length || !file.subarray(0, MAGIC.length).equals(MAGIC)) {
    throw new BackupError('This is not a KaraokeDock backup file.');
  }
  const end = file.indexOf(0x0a, MAGIC.length);
  if (end < 0) throw new BackupError('The backup file is damaged.');
  const headerLine = file.subarray(MAGIC.length, end + 1);
  let header: BackupHeader;
  try {
    header = JSON.parse(headerLine.toString('utf8'));
  } catch {
    throw new BackupError('The backup file is damaged.');
  }
  const { kdf, cipher } = header ?? {};
  const scryptOk = kdf?.name === 'scrypt' && Number.isInteger(kdf.N) && kdf.N >= MIN_KDF_N && kdf.N <= MAX_KDF_N &&
    (kdf.N & (kdf.N - 1)) === 0 && kdf.r === 8 && Number.isInteger(kdf.p) && kdf.p >= 1 && kdf.p <= 4 && typeof kdf.salt === 'string';
  const keyfileOk = kdf?.name === 'keyfile' && typeof kdf.keyId === 'string';
  if (header?.format !== 'karaokedock-backup' || header.version !== 1 ||
      (header.kind !== 'database' && header.kind !== 'settings') ||
      !(scryptOk || keyfileOk) || cipher?.name !== 'aes-256-gcm' || typeof cipher.iv !== 'string') {
    throw new BackupError('This backup was made by a different version of KaraokeDock and cannot be read.');
  }
  const body = file.subarray(end + 1);
  if (body.length < TAG_BYTES) throw new BackupError('The backup file is damaged.');
  return { header, headerLine, body };
}

export async function decryptBackup(file: Buffer, passphrase: string): Promise<{ header: BackupHeader; payload: unknown }> {
  const { header } = readBackupHeader(file);
  if (header.kdf.name !== 'scrypt') {
    throw new BackupError('This is an automatic snapshot. Restore it from the Automatic snapshots card on the server that made it.');
  }
  return open(file, await deriveKey(passphrase, header.kdf), 'Wrong passphrase, or the backup file is damaged.');
}

export async function decryptBackupWithKey(file: Buffer, key: Buffer): Promise<{ header: BackupHeader; payload: unknown }> {
  const { header } = readBackupHeader(file);
  if (header.kdf.name !== 'keyfile') throw new BackupError('This file is a manual backup, not a snapshot.');
  if (header.kdf.keyId !== snapshotKeyId(key)) {
    throw new BackupError('This snapshot was made with a different snapshot key and cannot be opened with this server\'s key file.');
  }
  return open(file, key, 'The snapshot file is damaged.');
}

async function open(file: Buffer, key: Buffer, failure: string): Promise<{ header: BackupHeader; payload: unknown }> {
  const { header, headerLine, body } = readBackupHeader(file);
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(header.cipher.iv, 'base64'));
  decipher.setAAD(headerLine);
  decipher.setAuthTag(body.subarray(body.length - TAG_BYTES));
  let plaintext: Buffer;
  try {
    plaintext = Buffer.concat([decipher.update(body.subarray(0, body.length - TAG_BYTES)), decipher.final()]);
  } catch {
    throw new BackupError(failure);
  }
  return { header, payload: JSON.parse((await gunzip(plaintext)).toString('utf8')) };
}

// ---------------------------------------------------------------------------
// Database
// ---------------------------------------------------------------------------

const ident = (name: string) => `"${name.replace(/"/g, '""')}"`;

async function listTables(client: PoolClient): Promise<string[]> {
  const res = await client.query<{ tablename: string }>(
    `SELECT tablename FROM pg_tables WHERE schemaname = current_schema() ORDER BY tablename`,
  );
  return res.rows.map((row) => row.tablename);
}

type TableMeta = {
  columns: string[];
  jsonColumns: Map<string, string>;
  insertable: Set<string>;
  notNull: Set<string>;
  identityAlways: boolean;
  primaryKey: string[];
  foreignKeys: { columns: string[]; references: string }[];
};

async function loadTableMeta(client: PoolClient, tables: string[]): Promise<Map<string, TableMeta>> {
  const meta = new Map<string, TableMeta>(tables.map((table) => [table, {
    columns: [], jsonColumns: new Map(), insertable: new Set(), notNull: new Set(), identityAlways: false, primaryKey: [], foreignKeys: [],
  }]));
  const columns = await client.query<{ table_name: string; column_name: string; data_type: string; is_generated: string; is_nullable: string; identity_generation: string | null }>(
    `SELECT table_name, column_name, data_type, is_generated, is_nullable, identity_generation
       FROM information_schema.columns
      WHERE table_schema = current_schema()
      ORDER BY table_name, ordinal_position`,
  );
  for (const column of columns.rows) {
    const table = meta.get(column.table_name);
    if (!table) continue;
    table.columns.push(column.column_name);
    if (column.data_type === 'json' || column.data_type === 'jsonb') table.jsonColumns.set(column.column_name, column.data_type);
    if (column.is_generated === 'NEVER') table.insertable.add(column.column_name);
    if (column.is_nullable === 'NO') table.notNull.add(column.column_name);
    if (column.identity_generation === 'ALWAYS') table.identityAlways = true;
  }
  const keys = await client.query<{ table_name: string; contype: string; columns: string[]; references: string | null }>(
    `SELECT cr.relname AS table_name, c.contype, cf.relname AS references,
            array_agg(a.attname::text ORDER BY k.ord) AS columns
       FROM pg_constraint c
       JOIN pg_class cr ON cr.oid = c.conrelid
       LEFT JOIN pg_class cf ON cf.oid = c.confrelid
       CROSS JOIN LATERAL unnest(c.conkey) WITH ORDINALITY AS k(attnum, ord)
       JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum
      WHERE c.connamespace = current_schema()::regnamespace AND c.contype IN ('p', 'f')
      GROUP BY c.oid, cr.relname, c.contype, cf.relname`,
  );
  for (const key of keys.rows) {
    const table = meta.get(key.table_name);
    if (!table) continue;
    if (key.contype === 'p') table.primaryKey = key.columns;
    else if (key.references) table.foreignKeys.push({ columns: key.columns, references: key.references });
  }
  return meta;
}

async function listImageFiles(root: string): Promise<{ path: string; data: string }[]> {
  const files: { path: string; data: string }[] = [];
  let total = 0;
  async function walk(directory: string) {
    let entries;
    try {
      entries = await fs.readdir(directory, { withFileTypes: true });
    } catch (error: any) {
      if (error?.code === 'ENOENT') return;
      throw error;
    }
    for (const entry of entries) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.isFile()) {
        const data = await fs.readFile(full);
        total += data.length;
        if (total > MAX_IMAGE_BYTES) throw new BackupError('Uploaded images are larger than 1 GB and cannot be included in a backup.', 413);
        files.push({ path: path.relative(root, full).split(path.sep).join('/'), data: data.toString('base64') });
      }
    }
  }
  await walk(root);
  return files;
}

export async function exportDatabase(imagesDir: string | null): Promise<DatabasePayload> {
  const tables = await withTransaction(async (client) => {
    // One consistent snapshot of every table.
    await client.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
    const names = (await listTables(client)).filter((name) => !EXCLUDED_TABLES.has(name));
    const meta = await loadTableMeta(client, names);
    const dump: Record<string, TableDump> = {};
    for (const name of names) {
      // json_agg keeps PostgreSQL's own text forms (timestamps, bytea, arrays), so restore is exact.
      const info = meta.get(name)!;
      const select = info.columns
        .map((column) => (info.jsonColumns.has(column) ? `${ident(column)}::text AS ${ident(column)}` : ident(column)))
        .join(', ');
      const res = await client.query<{ rows: Record<string, unknown>[] }>(
        `SELECT COALESCE(json_agg(t), '[]'::json) AS rows FROM (SELECT ${select} FROM ${ident(name)}) t`,
      );
      dump[name] = { columns: info.columns, jsonText: [...info.jsonColumns.keys()], rows: res.rows[0].rows };
    }
    return dump;
  });
  return { tables, files: imagesDir ? await listImageFiles(imagesDir) : [] };
}

// Insert order that respects foreign keys. Where tables reference each other (or themselves),
// the referencing columns are inserted empty and filled in once every row exists.
function planInsertOrder(tables: string[], meta: Map<string, TableMeta>) {
  const remaining = new Set(tables);
  const order: string[] = [];
  const deferred = new Map<string, Set<string>>();
  const defer = (table: string, columns: string[]) => {
    const set = deferred.get(table) ?? new Set<string>();
    columns.forEach((column) => set.add(column));
    deferred.set(table, set);
  };
  for (const table of tables) {
    for (const fk of meta.get(table)!.foreignKeys) if (fk.references === table) defer(table, fk.columns);
  }
  const blockers = (table: string) => meta.get(table)!.foreignKeys.filter((fk) =>
    fk.references !== table && remaining.has(fk.references) && !fk.columns.every((c) => deferred.get(table)?.has(c)));
  while (remaining.size > 0) {
    const ready = [...remaining].find((table) => blockers(table).length === 0);
    if (ready) {
      order.push(ready);
      remaining.delete(ready);
      continue;
    }
    // A cycle: break it at a table whose outstanding references can all be left empty for now
    // (nullable columns), preferring the one with the fewest.
    const nullable = (table: string) => blockers(table).every((fk) => fk.columns.every((c) => !meta.get(table)!.notNull.has(c)));
    const table = [...remaining]
      .filter(nullable)
      .sort((a, b) => blockers(a).length - blockers(b).length || a.localeCompare(b))[0];
    if (!table) throw new BackupError(`Cannot restore: ${[...remaining].join(', ')} reference each other through required columns.`, 500);
    for (const fk of blockers(table)) defer(table, fk.columns);
  }
  for (const [table, columns] of deferred) {
    const required = [...columns].filter((column) => meta.get(table)!.notNull.has(column));
    if (required.length > 0) {
      throw new BackupError(`Cannot restore ${table}: ${required.join(', ')} must be filled in before related rows exist.`, 500);
    }
  }
  return { order, deferred };
}

// Row source for one backup chunk: each column comes from json_populate_record, except json/jsonb
// columns exported as text, which are parsed back from that text.
function rowSource(table: string, info: TableMeta, dump: TableDump) {
  const asText = new Set(dump.jsonText ?? []);
  const value = (column: string) => (asText.has(column) && info.jsonColumns.has(column)
    ? `(x->>'${column.replace(/'/g, "''")}')::${info.jsonColumns.get(column)}`
    : `p.${ident(column)}`);
  return {
    from: `json_array_elements($1::json) AS x, LATERAL json_populate_record(NULL::${ident(table)}, x) AS p`,
    value,
  };
}

export async function restoreDatabase(payload: DatabasePayload, imagesDir: string | null) {
  if (!payload || typeof payload.tables !== 'object') throw new BackupError('The backup file is damaged.');
  const summary = await withTransaction(async (client) => {
    const current = await listTables(client);
    const meta = await loadTableMeta(client, current);
    const restorable = current.filter((name) => name in payload.tables && !EXCLUDED_TABLES.has(name));
    const { order, deferred } = planInsertOrder(restorable, meta);

    await client.query(`TRUNCATE ${current.map(ident).join(', ')} RESTART IDENTITY CASCADE`);

    let rows = 0;
    for (const table of order) {
      const info = meta.get(table)!;
      const dump = payload.tables[table];
      const later = deferred.get(table) ?? new Set();
      const columns = dump.columns.filter((column) => info.insertable.has(column) && !later.has(column));
      if (columns.length === 0 || dump.rows.length === 0) continue;
      const list = columns.map(ident).join(', ');
      const source = rowSource(table, info, dump);
      for (let i = 0; i < dump.rows.length; i += INSERT_CHUNK_ROWS) {
        await client.query(
          `INSERT INTO ${ident(table)} (${list}) ${info.identityAlways ? 'OVERRIDING SYSTEM VALUE ' : ''}` +
          `SELECT ${columns.map(source.value).join(', ')} FROM ${source.from}`,
          [JSON.stringify(dump.rows.slice(i, i + INSERT_CHUNK_ROWS))],
        );
      }
      rows += dump.rows.length;
    }

    for (const [table, columns] of deferred) {
      const info = meta.get(table)!;
      const restoreColumns = [...columns].filter((column) => payload.tables[table].columns.includes(column));
      if (restoreColumns.length === 0 || payload.tables[table].rows.length === 0) continue;
      if (info.primaryKey.length === 0) throw new BackupError(`Cannot restore ${table}: it has no primary key.`, 500);
      const source = rowSource(table, info, payload.tables[table]);
      const match = info.primaryKey.map((key) => `t.${ident(key)} = s.${ident(key)}`).join(' AND ');
      const assign = restoreColumns.map((column) => `${ident(column)} = s.${ident(column)}`).join(', ');
      const values = [...new Set([...info.primaryKey, ...restoreColumns])]
        .map((column) => `${source.value(column)} AS ${ident(column)}`).join(', ');
      const rowsWithLinks = payload.tables[table].rows.filter((row) => restoreColumns.some((column) => row[column] != null));
      for (let i = 0; i < rowsWithLinks.length; i += INSERT_CHUNK_ROWS) {
        await client.query(
          `UPDATE ${ident(table)} AS t SET ${assign}
             FROM (SELECT ${values} FROM ${source.from}) AS s
            WHERE ${match}`,
          [JSON.stringify(rowsWithLinks.slice(i, i + INSERT_CHUNK_ROWS))],
        );
      }
    }

    // New rows must not collide with restored ids.
    for (const table of current) {
      for (const column of meta.get(table)!.columns) {
        const seq = await client.query<{ seq: string | null }>('SELECT pg_get_serial_sequence($1, $2) AS seq', [ident(table), column]);
        if (!seq.rows[0].seq) continue;
        await client.query(
          `SELECT setval($1, COALESCE((SELECT MAX(${ident(column)}) FROM ${ident(table)}), 0) + 1, false)`,
          [seq.rows[0].seq],
        );
      }
    }
    return { tables: order.length, rows, skippedTables: Object.keys(payload.tables).filter((name) => !current.includes(name)) };
  });

  let files = 0;
  if (imagesDir && Array.isArray(payload.files)) {
    const root = path.resolve(imagesDir);
    for (const file of payload.files) {
      const target = path.resolve(root, String(file.path));
      // Never write outside the uploads folder.
      if (target !== root && !target.startsWith(root + path.sep)) continue;
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, Buffer.from(String(file.data), 'base64'));
      files++;
    }
  }
  return { ...summary, files };
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export async function exportSettings(): Promise<SettingsPayload> {
  return withTransaction(async (client) => {
    const res = await client.query<{ key: string; value: unknown }>('SELECT key, value FROM settings ORDER BY key');
    return { settings: res.rows };
  });
}

// Merge: settings in the backup overwrite current values; others are left alone.
export async function restoreSettings(payload: SettingsPayload) {
  if (!payload || !Array.isArray(payload.settings)) throw new BackupError('The backup file is damaged.');
  return withTransaction(async (client) => {
    let count = 0;
    for (const setting of payload.settings) {
      if (typeof setting?.key !== 'string' || !setting.key) continue;
      await client.query(
        'INSERT INTO settings (key, value) VALUES ($1, $2::jsonb) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value',
        [setting.key, JSON.stringify(setting.value)],
      );
      count++;
    }
    return { settings: count };
  });
}
