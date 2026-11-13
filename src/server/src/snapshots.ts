// Automatic database snapshots: taken on a schedule, kept for a chosen number of days, and
// restorable from Admin › Backup & Restore. They use the same encrypted format as a manual
// database backup (uploaded images included), but with a random key kept in a key file in the
// snapshots folder instead of a passphrase, so the schedule needs no one to type one.
//
// Folder: SNAPSHOTS_DIR, or "snapshots" under the server's working directory
// (/app/snapshots in the Docker image; Station sets SNAPSHOTS_DIR to its user data folder).
import { randomBytes } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  BackupError, decryptBackupWithKey, encryptBackupWithKey, exportDatabase, restoreDatabase, withBackupLock,
} from './backup.js';
import { getSetting, setSetting } from './db.js';
import { logger } from './logger.js';

export const SNAPSHOT_INTERVALS = {
  hourly: 60 * 60_000,
  '6h': 6 * 60 * 60_000,
  '12h': 12 * 60 * 60_000,
  daily: 24 * 60 * 60_000,
  weekly: 7 * 24 * 60 * 60_000,
} as const;
export type SnapshotInterval = keyof typeof SNAPSHOT_INTERVALS;
export const SNAPSHOT_RETENTION_DAYS = [1, 3, 7, 14, 30, 90] as const;

export type SnapshotSettings = { enabled: boolean; interval: SnapshotInterval; retentionDays: number };
const SETTINGS_KEY = 'backup.snapshots';
const DEFAULT_SETTINGS: SnapshotSettings = { enabled: false, interval: 'daily', retentionDays: 7 };

const KEY_FILE = '.snapshot-key';
// snapshot-20261028-164301-123.kdbackup, or ...-before-restore.kdbackup for the safety copy.
const NAME_PATTERN = /^snapshot-(\d{8})-(\d{6})-(\d{3})(-before-restore)?\.kdbackup$/;
// Wait at least this long after startup or a settings change before a due snapshot runs.
const MIN_DELAY_MS = 60_000;
const MAX_TIMER_MS = 2 ** 31 - 1;

export type SnapshotInfo = { name: string; createdAt: string; size: number; beforeRestore: boolean };
type SnapshotDeps = { appVersion: string; getImageUploadsDir: () => Promise<string>; onRestored: () => void };

let deps: SnapshotDeps | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let nextRunAt: Date | null = null;
let lastRun: { at: string; ok: boolean; name?: string; error?: string } | null = null;

export function configureSnapshots(next: SnapshotDeps) {
  deps = next;
}

function requireDeps(): SnapshotDeps {
  if (!deps) throw new Error('Snapshots are not configured');
  return deps;
}

export function getSnapshotDir(): string {
  return path.resolve(process.env.SNAPSHOTS_DIR?.trim() || 'snapshots');
}

export function normalizeSnapshotSettings(value: unknown): SnapshotSettings {
  const input = (value && typeof value === 'object' ? value : {}) as Partial<SnapshotSettings>;
  return {
    enabled: typeof input.enabled === 'boolean' ? input.enabled : DEFAULT_SETTINGS.enabled,
    interval: input.interval && input.interval in SNAPSHOT_INTERVALS ? input.interval : DEFAULT_SETTINGS.interval,
    retentionDays: (SNAPSHOT_RETENTION_DAYS as readonly number[]).includes(Number(input.retentionDays))
      ? Number(input.retentionDays)
      : DEFAULT_SETTINGS.retentionDays,
  };
}

export async function getSnapshotSettings(): Promise<SnapshotSettings> {
  return normalizeSnapshotSettings(await getSetting(SETTINGS_KEY));
}

export async function saveSnapshotSettings(value: unknown): Promise<SnapshotSettings> {
  const input = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  if (input.interval !== undefined && !(String(input.interval) in SNAPSHOT_INTERVALS)) throw new BackupError('Unknown snapshot frequency.');
  if (input.retentionDays !== undefined && !(SNAPSHOT_RETENTION_DAYS as readonly number[]).includes(Number(input.retentionDays))) {
    throw new BackupError('Unknown retention period.');
  }
  const settings = normalizeSnapshotSettings({ ...(await getSnapshotSettings()), ...input });
  await setSetting(SETTINGS_KEY, settings);
  await syncSnapshotSchedule();
  return settings;
}

// The key is created on first use and only ever read from disk, never stored in the database.
async function loadSnapshotKey(directory: string): Promise<Buffer> {
  const keyPath = path.join(directory, KEY_FILE);
  try {
    const key = Buffer.from((await fs.readFile(keyPath, 'utf8')).trim(), 'base64');
    if (key.length !== 32) throw new BackupError(`The snapshot key file ${keyPath} is damaged.`, 500);
    return key;
  } catch (error: any) {
    if (error?.code !== 'ENOENT') throw error;
  }
  await fs.mkdir(directory, { recursive: true, mode: 0o700 });
  const key = randomBytes(32);
  try {
    await fs.writeFile(keyPath, `${key.toString('base64')}\n`, { mode: 0o600, flag: 'wx' });
    return key;
  } catch (error: any) {
    // Another process created it first; use that one.
    if (error?.code === 'EEXIST') return loadSnapshotKey(directory);
    throw error;
  }
}

function snapshotName(now: Date, beforeRestore: boolean) {
  const iso = now.toISOString();
  const stamp = `${iso.slice(0, 10).replace(/-/g, '')}-${iso.slice(11, 19).replace(/:/g, '')}-${iso.slice(20, 23)}`;
  return `snapshot-${stamp}${beforeRestore ? '-before-restore' : ''}.kdbackup`;
}

function createdAtFromName(name: string): Date | null {
  const match = NAME_PATTERN.exec(name);
  if (!match) return null;
  const [, day, time, ms] = match;
  return new Date(`${day.slice(0, 4)}-${day.slice(4, 6)}-${day.slice(6, 8)}T${time.slice(0, 2)}:${time.slice(2, 4)}:${time.slice(4, 6)}.${ms}Z`);
}

// Newest first.
export async function listSnapshots(): Promise<SnapshotInfo[]> {
  let names: string[];
  try {
    names = await fs.readdir(getSnapshotDir());
  } catch (error: any) {
    if (error?.code === 'ENOENT') return [];
    throw error;
  }
  const snapshots: SnapshotInfo[] = [];
  for (const name of names) {
    const createdAt = createdAtFromName(name);
    if (!createdAt) continue;
    const stat = await fs.stat(path.join(getSnapshotDir(), name)).catch(() => null);
    if (!stat?.isFile()) continue;
    snapshots.push({ name, createdAt: createdAt.toISOString(), size: stat.size, beforeRestore: name.endsWith('-before-restore.kdbackup') });
  }
  return snapshots.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

async function writeSnapshot(beforeRestore: boolean): Promise<SnapshotInfo> {
  const { appVersion, getImageUploadsDir } = requireDeps();
  const directory = getSnapshotDir();
  const key = await loadSnapshotKey(directory);
  const now = new Date();
  const file = await encryptBackupWithKey('database', await exportDatabase(await getImageUploadsDir()), key, { appVersion, now });
  const name = snapshotName(now, beforeRestore);
  const target = path.join(directory, name);
  // Write then rename, so a crash never leaves a half-written snapshot that looks complete.
  const temporary = `${target}.partial`;
  await fs.writeFile(temporary, file, { mode: 0o600 });
  await fs.rename(temporary, target);
  return { name, createdAt: now.toISOString(), size: file.length, beforeRestore };
}

// Removes snapshots older than the retention period, always keeping the newest one.
export async function pruneSnapshots(retentionDays: number, now = new Date()): Promise<string[]> {
  const cutoff = now.getTime() - retentionDays * 24 * 60 * 60_000;
  const removed: string[] = [];
  for (const snapshot of (await listSnapshots()).slice(1)) {
    if (Date.parse(snapshot.createdAt) >= cutoff) continue;
    await fs.rm(path.join(getSnapshotDir(), snapshot.name), { force: true });
    removed.push(snapshot.name);
  }
  return removed;
}

export function takeSnapshot(): Promise<SnapshotInfo> {
  return withBackupLock(async () => {
    const snapshot = await writeSnapshot(false);
    await pruneSnapshots((await getSnapshotSettings()).retentionDays);
    logger.info(`[snapshots] Saved ${snapshot.name}`);
    return snapshot;
  });
}

function checkName(name: string) {
  if (!NAME_PATTERN.test(name)) throw new BackupError('Snapshot not found.', 404);
}

// Restores a snapshot, first saving the current state as a "before restore" snapshot so the
// restore itself can be undone.
export async function restoreSnapshot(name: string) {
  checkName(name);
  return withBackupLock(async () => {
    const directory = getSnapshotDir();
    let file: Buffer;
    try {
      file = await fs.readFile(path.join(directory, name));
    } catch (error: any) {
      if (error?.code === 'ENOENT') throw new BackupError('Snapshot not found.', 404);
      throw error;
    }
    const { header, payload } = await decryptBackupWithKey(file, await loadSnapshotKey(directory));
    const safety = await writeSnapshot(true);
    const result = await restoreDatabase(payload as any, await requireDeps().getImageUploadsDir());
    logger.info(`[snapshots] Restored ${name}; previous state saved as ${safety.name}`, result);
    requireDeps().onRestored();
    return { ...result, createdAt: header.createdAt, safetySnapshot: safety.name };
  });
}

export async function deleteSnapshot(name: string) {
  checkName(name);
  await fs.rm(path.join(getSnapshotDir(), name), { force: true });
}

export function getSnapshotStatus() {
  return { directory: getSnapshotDir(), nextRunAt: nextRunAt?.toISOString() ?? null, lastRun };
}

async function runScheduledSnapshot() {
  timer = null;
  nextRunAt = null;
  try {
    const snapshot = await takeSnapshot();
    lastRun = { at: new Date().toISOString(), ok: true, name: snapshot.name };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    lastRun = { at: new Date().toISOString(), ok: false, error: message };
    logger.error('[snapshots] Scheduled snapshot failed:', error);
  }
  await syncSnapshotSchedule().catch((error) => logger.error('[snapshots] Could not schedule the next snapshot:', error));
}

// (Re)plans the next snapshot from the settings and the newest snapshot on disk.
export async function syncSnapshotSchedule() {
  if (timer) clearTimeout(timer);
  timer = null;
  nextRunAt = null;
  const settings = await getSnapshotSettings();
  if (!settings.enabled || !deps) return;
  const interval = SNAPSHOT_INTERVALS[settings.interval];
  const newest = (await listSnapshots()).find((snapshot) => !snapshot.beforeRestore);
  const due = newest ? Date.parse(newest.createdAt) + interval : Date.now();
  const delay = Math.min(Math.max(due - Date.now(), MIN_DELAY_MS), MAX_TIMER_MS);
  nextRunAt = new Date(Date.now() + delay);
  timer = setTimeout(() => void runScheduledSnapshot(), delay);
  timer.unref?.();
}
