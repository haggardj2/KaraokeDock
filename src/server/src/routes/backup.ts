import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  BackupError, decryptBackup, encryptBackup, exportDatabase, exportSettings,
  readBackupHeader, restoreDatabase, restoreSettings, validatePassphrase, withBackupLock, type BackupKind,
} from '../backup.js';
import { logger } from '../logger.js';
import {
  configureSnapshots, deleteSnapshot, getSnapshotSettings, getSnapshotStatus, listSnapshots,
  restoreSnapshot, saveSnapshotSettings, SNAPSHOT_INTERVALS, SNAPSHOT_RETENTION_DAYS, syncSnapshotSchedule, takeSnapshot,
} from '../snapshots.js';

// Admin › Backup & Restore. Backups download as an encrypted .kdbackup file; restores upload one.
// The passphrase is sent with each request and never stored. Automatic snapshots stay on the
// server and are listed, taken, restored and deleted here (see snapshots.ts).
export function createBackupRouter(
  adminGuard: express.RequestHandler,
  options: {
    appVersion: string;
    getImageUploadsDir: () => Promise<string>;
    onRestored: (kind: BackupKind) => void;
  },
) {
  const router = express.Router();
  configureSnapshots({ appVersion: options.appVersion, getImageUploadsDir: options.getImageUploadsDir, onRestored: () => options.onRestored('database') });
  const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false });

  const handle = (handler: express.RequestHandler): express.RequestHandler => async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      if (error instanceof BackupError) {
        res.status(error.status).json({ error: error.message });
      } else {
        logger.error('[backup] Backup or restore failed:', error);
        res.status(500).json({ error: 'Backup or restore failed. Check the server log for details.' });
      }
    }
  };
  // Manual backups and restores hold a whole database in memory, so they share one lock with snapshots.
  const exclusive = (handler: express.RequestHandler) => handle((req, res, next) => withBackupLock(async () => handler(req, res, next)));

  const sendBackup = (res: express.Response, kind: BackupKind, file: Buffer) => {
    const stamp = new Date().toISOString().slice(0, 16).replace('T', '-').replace(':', '');
    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="karaokedock-${kind}-${stamp}.kdbackup"`,
      'Cache-Control': 'no-store',
    });
    res.send(file);
  };

  router.post('/admin/backup/database', limiter, adminGuard, express.json({ limit: '4kb' }), exclusive(async (req, res) => {
    const passphrase = validatePassphrase(req.body?.passphrase);
    const payload = await exportDatabase(await options.getImageUploadsDir());
    sendBackup(res, 'database', await encryptBackup('database', payload, passphrase, { appVersion: options.appVersion }));
  }));

  router.post('/admin/backup/settings', limiter, adminGuard, express.json({ limit: '4kb' }), exclusive(async (req, res) => {
    const passphrase = validatePassphrase(req.body?.passphrase);
    sendBackup(res, 'settings', await encryptBackup('settings', await exportSettings(), passphrase, { appVersion: options.appVersion }));
  }));

  // The file is the raw request body; the passphrase travels base64-encoded in a header.
  router.post(
    '/admin/restore/:kind',
    limiter,
    adminGuard,
    express.raw({ type: 'application/octet-stream', limit: '2gb' }),
    exclusive(async (req, res) => {
      const kind = req.params.kind;
      if (kind !== 'database' && kind !== 'settings') throw new BackupError('Unknown backup type.', 404);
      const encoded = String(req.headers['x-backup-passphrase'] ?? '');
      const passphrase = validatePassphrase(Buffer.from(encoded, 'base64').toString('utf8'));
      if (!Buffer.isBuffer(req.body) || req.body.length === 0) throw new BackupError('Choose a backup file to restore.');
      const { header } = readBackupHeader(req.body);
      if (header.kind !== kind) {
        throw new BackupError(`This is a ${header.kind} backup. Use Restore ${header.kind === 'database' ? 'Database' : 'Settings'} instead.`);
      }
      const { payload } = await decryptBackup(req.body, passphrase);
      const result = kind === 'database'
        ? await restoreDatabase(payload as any, await options.getImageUploadsDir())
        : await restoreSettings(payload as any);
      logger.info(`[backup] Restored ${kind} backup from ${header.createdAt}`, result);
      options.onRestored(kind);
      res.json({ ok: true, kind, createdAt: header.createdAt, appVersion: header.appVersion, ...result });
    }),
  );

  router.get('/admin/snapshots', adminGuard, handle(async (_req, res) => {
    res.json({
      settings: await getSnapshotSettings(),
      ...getSnapshotStatus(),
      snapshots: await listSnapshots(),
      options: { intervals: Object.keys(SNAPSHOT_INTERVALS), retentionDays: SNAPSHOT_RETENTION_DAYS },
    });
  }));

  router.put('/admin/snapshots/settings', adminGuard, express.json({ limit: '4kb' }), handle(async (req, res) => {
    const settings = await saveSnapshotSettings(req.body);
    res.json({ settings, ...getSnapshotStatus() });
  }));

  router.post('/admin/snapshots', limiter, adminGuard, handle(async (_req, res) => {
    const snapshot = await takeSnapshot();
    // A manual snapshot restarts the clock: the next automatic one is a full interval later.
    await syncSnapshotSchedule();
    res.json({ ok: true, snapshot, ...getSnapshotStatus() });
  }));

  router.post('/admin/snapshots/:name/restore', limiter, adminGuard, handle(async (req, res) => {
    const result = await restoreSnapshot(String(req.params.name));
    res.json({ ok: true, ...result });
  }));

  router.delete('/admin/snapshots/:name', adminGuard, handle(async (req, res) => {
    await deleteSnapshot(String(req.params.name));
    res.json({ ok: true });
  }));

  return router;
}
