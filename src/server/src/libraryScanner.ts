import { EventEmitter } from 'events';
import { getSetting, query, setSetting } from './db.js';
import { logger } from './logger.js';
import { scanPath } from './scanner.js';

export class LibraryScanAlreadyInProgressError extends Error {
  constructor() {
    super('scan already in progress');
    this.name = 'LibraryScanAlreadyInProgressError';
  }
}

type LastScan = { finishedAt?: string; perLibrary?: Record<number, any> } | null;
type LibraryScanEvent = 'start' | 'progress' | 'done';
export interface LibraryScanRequest {
  libraryId: number;
  libraryPath: string;
  scanRoot?: string;
  cleanupRoot?: string;
}

const scanBus = new EventEmitter();
let scanInProgress = false;
let lastScan: LastScan = null;
let loadLastScanPromise: Promise<void> | null = null;

async function ensureLastScanLoaded(): Promise<void> {
  if (!loadLastScanPromise) {
    loadLastScanPromise = getSetting('scan.last_scan')
      .then((saved: LastScan) => {
        if (saved) lastScan = saved;
      })
      .catch((error) => {
        logger.error('[libraryScanner] Failed to load persisted last scan state:', error);
      });
  }

  await loadLastScanPromise;
}

async function persistLastScan(data: LastScan): Promise<void> {
  try {
    await setSetting('scan.last_scan', data);
  } catch (error) {
    logger.error('[libraryScanner] Failed to persist last scan state:', error);
  }
}

export function onLibraryScanEvent(event: LibraryScanEvent, listener: (payload?: any) => void): void {
  scanBus.on(event, listener);
}

export function offLibraryScanEvent(event: LibraryScanEvent, listener: (payload?: any) => void): void {
  scanBus.off(event, listener);
}

export async function getLibraryScanStatus(): Promise<{ scanInProgress: boolean; lastScan: LastScan }> {
  await ensureLastScanLoaded();
  return { scanInProgress, lastScan };
}

function mergeLibraryScanStats(left: any, right: any): any {
  if (!left) return right;
  if (!right) return left;
  if (left.error) return left;
  if (right.error) return right;

  return {
    mp4Indexed: (left.mp4Indexed || 0) + (right.mp4Indexed || 0),
    zipsSeen: (left.zipsSeen || 0) + (right.zipsSeen || 0),
    zipPairsIndexed: (left.zipPairsIndexed || 0) + (right.zipPairsIndexed || 0),
    loosePairsIndexed: (left.loosePairsIndexed || 0) + (right.loosePairsIndexed || 0),
    tracksRemoved: (left.tracksRemoved || 0) + (right.tracksRemoved || 0),
  };
}

async function runLibraryScanRequestsInternal(
  requests: LibraryScanRequest[]
): Promise<{ stats: Record<number, any> }> {
  await ensureLastScanLoaded();

  if (scanInProgress) {
    throw new LibraryScanAlreadyInProgressError();
  }

  scanInProgress = true;
  scanBus.emit('start');

  try {
    const allStats: Record<number, any> = {};

    for (const request of requests) {
      try {
        const progressPath = request.scanRoot ?? request.libraryPath;
        scanBus.emit('progress', { libraryId: request.libraryId, state: 'scanning', path: progressPath });
        const stats = await scanPath(
          request.libraryId,
          request.libraryPath,
          (evt) => scanBus.emit('progress', { libraryId: request.libraryId, ...evt }),
          {
            scanRoot: request.scanRoot,
            cleanupRoot: request.cleanupRoot,
          }
        );
        allStats[request.libraryId] = mergeLibraryScanStats(allStats[request.libraryId], stats);
        scanBus.emit('progress', { libraryId: request.libraryId, state: 'done', stats: allStats[request.libraryId] });
      } catch (error: any) {
        allStats[request.libraryId] = { error: String(error?.message || error) };
        scanBus.emit('progress', { libraryId: request.libraryId, state: 'error', error: allStats[request.libraryId].error });
      }
    }

    lastScan = { finishedAt: new Date().toISOString(), perLibrary: allStats };
    await persistLastScan(lastScan);
    scanBus.emit('done', { ...lastScan });
    return { stats: allStats };
  } finally {
    scanInProgress = false;
  }
}

export async function runLibraryScanRequests(
  requests: LibraryScanRequest[]
): Promise<{ stats: Record<number, any> }> {
  return runLibraryScanRequestsInternal(requests);
}

export async function runLibraryScan(libraryId?: number | null): Promise<{ stats: Record<number, any> | any }> {
  if (libraryId != null) {
    const result = await query<{ id: number; path: string }>(
      `SELECT id, path FROM libraries WHERE id = $1`,
      [libraryId]
    );
    if (!result.rows.length) {
      throw new Error('library not found');
    }

    const lib = result.rows[0];
    const scanResult = await runLibraryScanRequestsInternal([{ libraryId: lib.id, libraryPath: lib.path }]);
    return { stats: scanResult.stats[lib.id] };
  }

  const libs = await query<{ id: number; path: string }>(`SELECT id, path FROM libraries ORDER BY id`);
  return runLibraryScanRequestsInternal(
    libs.rows.map((lib) => ({ libraryId: lib.id, libraryPath: lib.path }))
  );
}
