import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';

const mocks = vi.hoisted(() => ({
  query: vi.fn(), getSetting: vi.fn(), setSetting: vi.fn(),
  upsertArtist: vi.fn(), upsertTrack: vi.fn(),
  info: vi.fn(), error: vi.fn(), warn: vi.fn(),
  scanDownloadLocation: vi.fn(), runBreakMusicScan: vi.fn(),
}));
vi.mock('./db', () => mocks);
vi.mock('./logger', () => ({ logger: { info: mocks.info, error: mocks.error, warn: mocks.warn } }));
vi.mock('./ytdlp.js', () => ({
  scanDownloadLocation: mocks.scanDownloadLocation,
  DownloadScanAlreadyInProgressError: class extends Error {},
}));
vi.mock('./breakMusicScanner.js', () => ({
  runBreakMusicScan: mocks.runBreakMusicScan,
  BreakMusicScanAlreadyInProgressError: class extends Error {},
}));

const snapshotKey = 'background.media_library_scan_snapshot';
let root: string;
let settings: Map<string, unknown>;
let libraries: { id: number; path: string; parse_mode: string | null }[];
let tasks: typeof import('./backgroundTasks.js');
let scanner: typeof import('./scanner.js');
let actualScan: typeof import('./scanner.js')['scanPath'];
let scan: MockInstance<typeof actualScan>;

beforeEach(async () => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  vi.stubEnv('BACKGROUND_MEDIA_SCAN_INTERVAL_MS', '1000');
  vi.stubEnv('BACKGROUND_DOWNLOAD_SCAN_INTERVAL_MS', '1000');
  vi.stubEnv('BACKGROUND_BREAK_MUSIC_SCAN_INTERVAL_MS', '1000');
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'karaokedock-media-watch-'));
  settings = new Map([['admin.background_media_scan_enabled', true]]);
  libraries = [{ id: 1, path: root, parse_mode: null }];
  mocks.getSetting.mockImplementation(async (key: string) => settings.get(key) ?? null);
  mocks.setSetting.mockImplementation(async (key: string, value: unknown) => { settings.set(key, value); });
  mocks.query.mockImplementation(async (sql: string) => ({
    rows: sql.includes('SELECT id, path, parse_mode FROM libraries') || sql.includes('FROM break_music_folders')
      ? libraries : [],
    rowCount: 0,
  }));
  mocks.upsertArtist.mockResolvedValue(1);
  mocks.upsertTrack.mockResolvedValue({ id: 1 });
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  scanner = await import('./scanner.js');
  actualScan = scanner.scanPath;
  scan = vi.spyOn(scanner, 'scanPath');
  tasks = await import('./backgroundTasks.js');
});

afterEach(async () => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  await fs.rm(root, { recursive: true, force: true });
});

function completedPasses(label: string) {
  return mocks.info.mock.calls.filter(([message]) =>
    message.includes(`${label} pass complete`) || message.includes(`${label} pass skipped`)).length
    + mocks.error.mock.calls.filter(([message]) => message.includes(`${label} pass failed`)).length;
}

async function scheduledPass(label = 'Media library scan') {
  const before = completedPasses(label);
  await vi.advanceTimersByTimeAsync(1000);
  for (let attempt = 0; attempt < 200 && completedPasses(label) === before; attempt++) await delay(5);
  expect(completedPasses(label)).toBe(before + 1);
}

async function write(relative: string, contents = 'media') {
  const file = path.join(root, relative);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, contents);
  return file;
}

describe('periodic media library scans with real directories and the manual scanner', () => {
  it('indexes existing files on the first scheduled pass rather than only acknowledging a baseline', async () => {
    const file = await write('Artist - First.mp4');
    await tasks.syncMediaLibraryScanTaskState();
    await scheduledPass();
    expect(mocks.upsertTrack).toHaveBeenCalledWith(expect.objectContaining({ file_mp4: file, library_id: 1 }));
    expect(settings.has(snapshotKey)).toBe(true);
    scan.mockClear();
    await scheduledPass();
    expect(scan).not.toHaveBeenCalled();
  });

  it('finds new media in existing nested folders, scans only the changed subtree and skips unchanged polls', async () => {
    await write('nested/First.mp4');
    await write('unchanged/Other.mp4');
    await tasks.syncMediaLibraryScanTaskState({ runImmediately: true });
    scan.mockClear();
    mocks.upsertTrack.mockClear();
    const added = await write('nested/New.mp4');
    await scheduledPass();
    expect(scan).toHaveBeenCalledExactlyOnceWith(1, root, expect.any(Function), expect.objectContaining({
      scanRoot: path.join(root, 'nested'), cleanupRoot: path.join(root, 'nested'),
    }));
    expect(mocks.upsertTrack).toHaveBeenCalledWith(expect.objectContaining({ file_mp4: added }));
    scan.mockClear();
    await scheduledPass();
    expect(scan).not.toHaveBeenCalled();
  });

  it('finds new subdirectories and does not ignore a newly configured library', async () => {
    await tasks.syncMediaLibraryScanTaskState({ runImmediately: true });
    const added = await write('new/deep/New.mp4');
    const other = await write('other/Second.mp4');
    libraries.push({ id: 2, path: path.join(root, 'other'), parse_mode: null });
    await scheduledPass();
    expect(mocks.upsertTrack).toHaveBeenCalledWith(expect.objectContaining({ file_mp4: added, library_id: 1 }));
    expect(mocks.upsertTrack).toHaveBeenCalledWith(expect.objectContaining({ file_mp4: other, library_id: 2 }));
  });

  it('retries a failed initial pass without committing a snapshot', async () => {
    await write('First.mp4');
    mocks.upsertTrack.mockRejectedValueOnce(new Error('database unavailable'));
    await tasks.syncMediaLibraryScanTaskState({ runImmediately: true });
    expect(settings.has(snapshotKey)).toBe(false);
    expect(mocks.error).toHaveBeenCalledWith(expect.stringContaining('pass failed'), expect.objectContaining({
      message: expect.stringContaining('database unavailable'),
    }));
    await scheduledPass();
    expect(settings.has(snapshotKey)).toBe(true);
    expect(mocks.upsertTrack).toHaveBeenCalledTimes(2);
  });

  it('retains the old snapshot when a changed-folder scan fails and retries without another filesystem change', async () => {
    await tasks.syncMediaLibraryScanTaskState({ runImmediately: true });
    const before = settings.get(snapshotKey);
    await write('New.mp4');
    mocks.upsertTrack.mockRejectedValueOnce(new Error('database unavailable'));
    await scheduledPass();
    expect(settings.get(snapshotKey)).toEqual(before);
    await scheduledPass();
    expect(settings.get(snapshotKey)).not.toEqual(before);
  });

  it('does not swallow indexing failures for loose CDG/MP3 pairs', async () => {
    await write('Pair.cdg');
    await write('Pair.mp3');
    mocks.upsertTrack.mockRejectedValueOnce(new Error('pair insert failed'));
    await tasks.syncMediaLibraryScanTaskState({ runImmediately: true });
    expect(settings.has(snapshotKey)).toBe(false);
    await scheduledPass();
    expect(mocks.upsertTrack).toHaveBeenLastCalledWith(expect.objectContaining({ kind: 'cdgmp3', basename: 'Pair.cdg' }));
    expect(settings.has(snapshotKey)).toBe(true);
  });

  it('picks up files arriving after directory scanning on the following poll', async () => {
    scan.mockImplementationOnce(async (...args) => {
      const result = await actualScan(...args);
      await write('ArrivedDuringScan.mp4');
      return result;
    });
    await tasks.syncMediaLibraryScanTaskState({ runImmediately: true });
    expect(mocks.error).not.toHaveBeenCalled();
    expect(mocks.upsertTrack).not.toHaveBeenCalled();
    await scheduledPass();
    expect(mocks.upsertTrack).toHaveBeenCalledWith(expect.objectContaining({ basename: 'ArrivedDuringScan.mp4' }));
  });

  it('reconciles legacy snapshots and catches file copies that continue without changing directory timestamps', async () => {
    const file = await write('Copy.mp4', 'partial');
    await tasks.syncMediaLibraryScanTaskState({ runImmediately: true });
    const legacy = settings.get(snapshotKey) as { entries: { fileSignature?: string }[] }[];
    for (const library of legacy) for (const entry of library.entries) delete entry.fileSignature;
    await scheduledPass();
    const directory = await fs.stat(root);
    scan.mockClear();
    await fs.appendFile(file, 'finished');
    await fs.utimes(root, directory.atime, directory.mtime);
    await scheduledPass();
    expect(scan).toHaveBeenCalledTimes(1);
  });

  it('keeps changes pending when a manual scan holds the scanner lock', async () => {
    await write('First.mp4');
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    scan.mockImplementationOnce(async (...args) => { await gate; return actualScan(...args); });
    const { runLibraryScan } = await import('./libraryScanner.js');
    const manual = runLibraryScan(1);
    await delay(5);
    try {
      await tasks.syncMediaLibraryScanTaskState({ runImmediately: true });
      expect(settings.has(snapshotKey)).toBe(false);
    } finally {
      release();
      await manual;
    }
    await scheduledPass();
    expect(settings.has(snapshotKey)).toBe(true);
  });

  it('does not scan while disabled and detects changes on re-enabling', async () => {
    await tasks.syncMediaLibraryScanTaskState({ runImmediately: true });
    settings.set('admin.background_media_scan_enabled', false);
    await tasks.syncMediaLibraryScanTaskState();
    scan.mockClear();
    await write('New.mp4');
    await vi.advanceTimersByTimeAsync(2000);
    expect(scan).not.toHaveBeenCalled();
    settings.set('admin.background_media_scan_enabled', true);
    await tasks.syncMediaLibraryScanTaskState({ runImmediately: true });
    expect(scan).toHaveBeenCalledTimes(1);
  });

  it('rescans when parsing configuration changes and supports trailing path separators', async () => {
    await write('Song.mp4');
    libraries[0].path += path.sep;
    await tasks.syncMediaLibraryScanTaskState({ runImmediately: true });
    scan.mockClear();
    libraries[0].parse_mode = 'artist-title';
    await scheduledPass();
    expect(scan).toHaveBeenCalledWith(1, root, expect.any(Function), expect.objectContaining({ parseMode: 'artist-title' }));
  });

  it('scans a replacement library path even when it contains no watched files yet', async () => {
    await tasks.syncMediaLibraryScanTaskState({ runImmediately: true });
    await fs.mkdir(path.join(root, 'replacement'));
    libraries[0].path = path.join(root, 'replacement');
    scan.mockClear();
    await scheduledPass();
    expect(scan).toHaveBeenCalledWith(1, libraries[0].path, expect.any(Function), expect.objectContaining({
      scanRoot: libraries[0].path,
    }));
  });

  it.each(['Download folder scan', 'Break music scan'])('does not acknowledge arrivals during a shared %s pass', async (label) => {
    const download = label === 'Download folder scan';
    const run = download ? mocks.scanDownloadLocation : mocks.runBreakMusicScan;
    const result = download ? { added: 0, removed: 0, skipped: 0 } : { indexed: 0, foldersScanned: 1 };
    settings.set(download ? 'admin.background_download_scan_enabled' : 'admin.background_break_music_scan_enabled', true);
    settings.set('ytdlp.download_location', root);
    run.mockResolvedValue(result);
    run.mockImplementationOnce(async () => {
      await write(download ? 'New.mp4' : 'New.mp3');
      return result;
    });
    const sync = download ? tasks.syncDownloadScanTaskState : tasks.syncBreakMusicScanTaskState;
    await sync({ runImmediately: true });
    await scheduledPass(label);
    expect(run).toHaveBeenCalledTimes(2);
    await scheduledPass(label);
    expect(run).toHaveBeenCalledTimes(2);
  });
});
