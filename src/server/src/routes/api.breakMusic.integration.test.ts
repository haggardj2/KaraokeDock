import express from 'express';
import fs from 'fs/promises';
import type { Server } from 'node:http';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { getSetting, query, setSetting, validateSessionInfo } from '../db.js';
import { logger } from '../logger.js';
import { runBreakMusicScan } from '../breakMusicScanner.js';

const { enabled, schema } = vi.hoisted(() => {
  const value = process.env.BREAK_MUSIC_TEST_DATABASE_URL;
  const schema = `break_music_test_${process.pid}`;
  if (value) {
    const url = new URL(value);
    if (url.pathname !== '/break_music_test') throw new Error('Break music tests require a dedicated break_music_test database');
    url.searchParams.set('options', `-csearch_path=${schema},public`);
    process.env.DATABASE_URL = url.toString();
  }
  return { enabled: Boolean(value), schema };
});

vi.mock('../db.js', async (importOriginal) => ({
  ...await importOriginal<typeof import('../db.js')>(),
  ensureHelpfulIndexes: vi.fn().mockResolvedValue(undefined),
  validateSessionInfo: vi.fn(),
  getUserById: vi.fn().mockResolvedValue({ id: 1, role: 'admin', is_active: true }),
}));
vi.mock('../scanner.js', async (importOriginal) => ({
  ...await importOriginal<typeof import('../scanner.js')>(),
  extractAudioMetadata: vi.fn().mockResolvedValue({ title: 'Rescanned title' }),
}));

describe.runIf(enabled)('break music routes against isolated PostgreSQL', () => {
  let server: Server;
  let baseUrl: string;
  let writeFile: ReturnType<typeof vi.spyOn>;
  let mkdir: ReturnType<typeof vi.spyOn>;
  let warning: ReturnType<typeof vi.spyOn>;
  const tracks = [
    { id: 1, title: 'First', artist: 'Artist', genre: 'Pop', duration_ms: 180000, file_path: '/music/Party_100%/first.mp3' },
    { id: 2, title: 'Second', artist: null, genre: null, duration_ms: 200000, file_path: '/music/Elsewhere/second.mp3' },
    { id: 3, title: 'Third', artist: null, genre: null, duration_ms: null, file_path: '/music/PartyX100Y/third.mp3' },
  ];

  async function request(route: string, body?: unknown, token: string | null = 'host') {
    return fetch(`${baseUrl}/break-music/${route}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { 'x-session-token': token } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }
  async function save(name = 'Party', trackIds = [2, 1, 2]) {
    const response = await request('playlists', { name, trackIds });
    expect(response.status).toBe(200);
    return response.json();
  }
  async function savedIds(playlistId: number) {
    return (await query('SELECT track_id FROM break_music_playlist_tracks WHERE playlist_id = $1 ORDER BY position', [playlistId])).rows.map(row => row.track_id);
  }

  beforeAll(async () => {
    await query(`CREATE SCHEMA ${schema}`);
    await query('CREATE EXTENSION IF NOT EXISTS pg_trgm');
    await query('CREATE TABLE settings (key TEXT PRIMARY KEY, value JSONB); CREATE TABLE queue (id SERIAL PRIMARY KEY, status TEXT)');
    await query(await fs.readFile(new URL('../../migrations/013_add_break_music.sql', import.meta.url), 'utf8'));
    const migration = await fs.readFile(new URL('../../migrations/025_break_music_path_search.sql', import.meta.url), 'utf8');
    await query(migration);
    await query(migration);
    const interval = vi.spyOn(globalThis, 'setInterval').mockReturnValue({ unref() {} } as any);
    const { apiRouter } = await import('./api.js');
    interval.mockRestore();
    const app = express();
    app.use(express.json());
    app.use('/api', apiRouter);
    await new Promise<void>((resolve, reject) => {
      server = app.listen(0, '127.0.0.1', error => error ? reject(error) : resolve());
    });
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Missing test server address');
    baseUrl = `http://127.0.0.1:${address.port}/api`;
    mkdir = vi.spyOn(fs, 'mkdir').mockResolvedValue(undefined);
    writeFile = vi.spyOn(fs, 'writeFile').mockResolvedValue(undefined);
    warning = vi.spyOn(logger, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    mkdir.mockResolvedValue(undefined);
    writeFile.mockResolvedValue(undefined);
    vi.mocked(validateSessionInfo).mockResolvedValue({ valid: true, userId: 1, role: 'admin' });
    await query('TRUNCATE break_music_tracks, break_music_playlists, break_music_folders, settings, queue RESTART IDENTITY CASCADE');
    await query("INSERT INTO break_music_folders(name, path) VALUES ('Music', '/music')");
    for (const track of tracks) {
      await query('INSERT INTO break_music_tracks(id, folder_id, title, artist, genre, duration_ms, file_path) VALUES ($1, 1, $2, $3, $4, $5, $6)', Object.values(track));
    }
    await query("SELECT setval(pg_get_serial_sequence('break_music_tracks', 'id'), 3)");
    await setSetting('break_music.playlists_folder', './test-playlists');
  });

  afterAll(async () => {
    if (server) {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    }
    await query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    vi.restoreAllMocks();
  });

  it('saves duplicate occurrences in order, exports them, overwrites the same ID, and leaves playback unchanged', async () => {
    await setSetting('break_music.playlist_track_ids', [1, 2, 1]);
    await setSetting('break_music.current_track_id', 1);
    await setSetting('break_music.playlist_index', 2);
    await setSetting('break_music.current_started_at', '2026-01-01T00:00:00Z');
    const before = (await query('SELECT * FROM settings ORDER BY key')).rows;
    const saved = await save();
    expect(saved).toMatchObject({ ok: true, m3uPath: expect.stringContaining('Party.m3u') });
    expect(saved.warning).toBeUndefined();
    expect(await savedIds(saved.playlistId)).toEqual([2, 1, 2]);
    const exported = writeFile.mock.calls[0][1] as string;
    expect(exported.split('\r\n').filter(line => line.startsWith('/music'))).toEqual([tracks[1].file_path, tracks[0].file_path, tracks[1].file_path]);
    expect((await save('Party', [1, 1, 2])).playlistId).toBe(saved.playlistId);
    expect(await savedIds(saved.playlistId)).toEqual([1, 1, 2]);
    expect((await request('playlists')).status).toBe(200);
    expect(await (await request('playlists')).json()).toEqual([expect.objectContaining({ id: saved.playlistId, name: 'Party' })]);
    expect((await query('SELECT * FROM settings ORDER BY key')).rows).toEqual(before);
  });

  it.each(['mkdir', 'writeFile'])('reports %s export failures without rolling back the canonical saved playlist', async (operation) => {
    (operation === 'mkdir' ? mkdir : writeFile).mockRejectedValueOnce(Object.assign(new Error('permission denied'), { code: 'EACCES' }));
    const saved = await save();
    expect(saved).toMatchObject({ ok: true, m3uPath: null, warning: expect.stringContaining('saved in the database') });
    expect(warning).toHaveBeenCalled();
    expect(await savedIds(saved.playlistId)).toEqual([2, 1, 2]);
    const loaded = await request('playlists/load', { playlistId: saved.playlistId });
    expect(await loaded.json()).toMatchObject({
      ok: true, playlistId: saved.playlistId, activePlaylistId: saved.playlistId, trackIds: [2, 1, 2],
      tracks: [tracks[1], tracks[0], tracks[1]], playlistIndex: 0, currentTrack: tracks[1],
    });
  });

  it('rolls back failed overwrites and failed new playlists using one pinned transaction', async () => {
    const saved = await save();
    const before = (await query('SELECT * FROM break_music_playlists')).rows;
    await query('ALTER TABLE break_music_playlist_tracks ADD CONSTRAINT test_failure CHECK (position < 1) NOT VALID');
    try {
      expect((await request('playlists', { name: 'Party', trackIds: [1, 2] })).status).toBe(500);
      expect(await savedIds(saved.playlistId)).toEqual([2, 1, 2]);
      expect((await query('SELECT * FROM break_music_playlists')).rows).toEqual(before);
      expect((await request('playlists', { name: 'Failed new', trackIds: [1, 2] })).status).toBe(500);
      expect((await query('SELECT * FROM break_music_playlists')).rows).toEqual(before);
    } finally {
      await query('ALTER TABLE break_music_playlist_tracks DROP CONSTRAINT test_failure');
    }
  });

  it('rejects nonexistent tracks and malformed IDs without changing a saved playlist', async () => {
    const saved = await save();
    for (const trackIds of [[1, 999999], [1, Number.MAX_SAFE_INTEGER], [1, null], ['1'], [1.5], [0], [], [true]]) {
      expect((await request('playlists', { name: 'Party', trackIds })).status).toBe(400);
      expect(await savedIds(saved.playlistId)).toEqual([2, 1, 2]);
    }
  });

  it('serializes concurrent overwrites into one complete playlist, never mixed positions', async () => {
    const choices = [[1, 2, 1], [2, 2], [3, 1, 3, 2]];
    const saved = await Promise.all(choices.map(ids => save('Concurrent', ids)));
    expect(new Set(saved.map(result => result.playlistId)).size).toBe(1);
    expect(choices).toContainEqual(await savedIds(saved[0].playlistId));
    expect((await query('SELECT * FROM break_music_playlists')).rowCount).toBe(1);
  });

  it('returns 404 for missing playlists and rejects empty playlists without changing playback', async () => {
    await setSetting('break_music.current_track_id', 2);
    const before = (await query('SELECT * FROM settings ORDER BY key')).rows;
    expect((await request('playlists/load', { playlistId: 99999 })).status).toBe(404);
    const empty = await query("INSERT INTO break_music_playlists(name) VALUES ('Empty') RETURNING id");
    expect((await request('playlists/load', { playlistId: empty.rows[0].id })).status).toBe(400);
    expect((await request('playlists/load', { playlistId: '1x' })).status).toBe(400);
    expect((await query('SELECT * FROM settings ORDER BY key')).rows).toEqual(before);
  });

  it('hydrates active tracks independently of search without starting playback or coercing null IDs', async () => {
    await setSetting('break_music.playlist_track_ids', [2, 1, 2]);
    expect(await (await request('search?q=no-such-result')).json()).toEqual([]);
    expect(await (await request('playlist/active')).json()).toEqual({
      trackIds: [2, 1, 2], tracks: [tracks[1], tracks[0], tracks[1]],
      playlistId: null, activePlaylistId: null, playlistIndex: 0, currentTrack: null,
    });
    expect(await getSetting('break_music.current_track_id')).toBeNull();
    expect((await request('playlist/active', undefined, null)).status).toBe(403);
  });

  it('keeps duplicate occurrences through active updates, next/previous, wraparound, and timed advancement', async () => {
    const saved = await save('Repeat', [1, 1, 2]);
    await request('playlists/load', { playlistId: saved.playlistId });
    expect((await request('auto-next', {})).status).toBe(200);
    expect(await getSetting('break_music.playlist_index')).toBe(0);
    expect(await getSetting('break_music.playlist_track_ids')).toEqual([1, 2, 1]);
    await request('playlist/active', { trackIds: [1, 2, 1] });
    expect(await getSetting('break_music.playlist_index')).toBe(0);
    await request('control', { action: 'skip' });
    expect(await getSetting('break_music.playlist_track_ids')).toEqual([2, 1, 1]);
    await request('control', { action: 'previous' });
    expect(await getSetting('break_music.playlist_track_ids')).toEqual([1, 2, 1]);
    await setSetting('break_music.current_started_at', new Date(Date.now() - 190000).toISOString());
    await request('state');
    expect(await getSetting('break_music.playlist_track_ids')).toEqual([2, 1, 1]);
    await request('auto-next', {});
    expect(await getSetting('break_music.playlist_index')).toBe(0);
    expect(await getSetting('break_music.playlist_track_ids')).toEqual([1, 1, 2]);
    expect(await savedIds(saved.playlistId)).toEqual([1, 1, 2]);
    await request('playlist/active', { trackIds: [] });
    expect(await getSetting('break_music.current_track_id')).toBeNull();
  });

  it('exposes the playback start timestamp without changing it for active playlist reordering', async () => {
    const saved = await save('Occurrences', [1, 1, 2]);
    await request('playlists/load', { playlistId: saved.playlistId });
    const loaded = await (await request('state')).json();
    expect(loaded.currentStartedAt).toBe(await getSetting('break_music.current_started_at'));
    expect(Number.isFinite(Date.parse(loaded.currentStartedAt))).toBe(true);
    const startedAt = new Date(Date.now() - 1000).toISOString();
    await setSetting('break_music.current_started_at', startedAt);
    const edited = await (await request('playlist/active', { trackIds: [2, 1, 1] })).json();
    expect(edited).toMatchObject({ trackIds: [1, 1, 2], tracks: [tracks[0], tracks[0], tracks[1]], playlistIndex: 0 });
    const reordered = await (await request('state')).json();
    expect(reordered).toMatchObject({ currentStartedAt: startedAt, playlistIndex: 0, currentTrack: tracks[0] });
    await request('control', { action: 'skip' });
    const skipped = await (await request('state')).json();
    expect(skipped).toMatchObject({ playlistIndex: 0, playlistTrackIds: [1, 2, 1], currentTrack: tracks[0] });
    expect(Date.parse(skipped.currentStartedAt)).toBeGreaterThan(Date.parse(startedAt));
    expect(skipped.currentStartedAt).toBe(await getSetting('break_music.current_started_at'));
  });

  it('searches literal folder paths case-insensitively with escaped wildcard characters and a durable GIN index', async () => {
    expect(await (await request(`search?q=${encodeURIComponent('/music/party_100%/')}`)).json()).toEqual([tracks[0]]);
    expect(await (await request('search?q=Elsewhere')).json()).toEqual([tracks[1]]);
    expect(await (await request('search?q=Pop')).json()).toEqual([tracks[0]]);
    const index = await query("SELECT indexdef FROM pg_indexes WHERE schemaname = $1 AND indexname = 'idx_break_music_tracks_file_path_trgm'", [schema]);
    expect(index.rows[0].indexdef).toContain('USING gin (file_path gin_trgm_ops)');
  });

  it('keeps the current duplicate occurrence when a preceding library track disappears', async () => {
    const saved = await save('Pruned', [3, 1, 1, 2]);
    await request('playlists/load', { playlistId: saved.playlistId });
    await request('auto-next', {});
    await request('auto-next', {});
    expect(await getSetting('break_music.playlist_index')).toBe(0);
    expect(await getSetting('break_music.playlist_track_ids')).toEqual([1, 2, 3, 1]);
    await query('DELETE FROM break_music_tracks WHERE id = 3');
    expect(await (await request('playlist/active')).json()).toMatchObject({ trackIds: [1, 2, 1], playlistIndex: 0 });
    await request('auto-next', {});
    expect(await getSetting('break_music.playlist_index')).toBe(0);
    expect(await getSetting('break_music.current_track_id')).toBe(2);
    expect(await getSetting('break_music.playlist_track_ids')).toEqual([2, 1, 1]);
  });

  it.each(['state', 'playlist/active'])('rotates an existing paused playlist through %s without restarting playback', async (route) => {
    await setSetting('break_music.playlist_track_ids', [1, 2, 1, 3]);
    await setSetting('break_music.playlist_index', 2);
    await setSetting('break_music.current_track_id', 1);
    await setSetting('break_music.current_position_sec', 42);
    await setSetting('break_music.paused', true);
    const response = await (await request(route)).json();
    expect(response.playlistIndex).toBe(0);
    expect(response.playlistTrackIds ?? response.trackIds).toEqual([1, 3, 1, 2]);
    expect(await getSetting('break_music.playlist_track_ids')).toEqual([1, 3, 1, 2]);
    expect(await getSetting('break_music.current_position_sec')).toBe(42);
    expect(await getSetting('break_music.current_started_at')).toBeNull();
    expect(await getSetting('break_music.paused')).toBe(true);
    const refreshed = await (await request('playlist/active')).json();
    expect(refreshed).toMatchObject({ trackIds: [1, 3, 1, 2], playlistIndex: 0 });
  });

  it('rotates on natural completion and keeps saved order across repeated polls and reloads', async () => {
    const saved = await save('Cycle', [1, 2, 3]);
    await request('playlists/load', { playlistId: saved.playlistId });
    await setSetting('break_music.current_started_at', new Date(Date.now() - 181000).toISOString());
    const advanced = await (await request('state')).json();
    expect(advanced).toMatchObject({ playlistTrackIds: [2, 3, 1], playlistIndex: 0, currentTrack: tracks[1] });
    expect(await (await request('state')).json()).toMatchObject({
      playlistTrackIds: [2, 3, 1], currentStartedAt: advanced.currentStartedAt,
    });
    expect(await (await request('playlist/active')).json()).toMatchObject({
      trackIds: [2, 3, 1], tracks: [tracks[1], tracks[2], tracks[0]], playlistIndex: 0,
    });
    expect(await savedIds(saved.playlistId)).toEqual([1, 2, 3]);
    expect(await (await request('playlists/load', { playlistId: saved.playlistId })).json()).toMatchObject({
      trackIds: [1, 2, 3], playlistIndex: 0, currentTrack: tracks[0],
    });
  });

  it('preserves saved track IDs and duplicate positions when rescanning existing files', async () => {
    const saved = await save();
    const readdir = vi.spyOn(fs, 'readdir').mockResolvedValue(tracks.map(track => ({
      name: track.file_path.slice('/music/'.length), isDirectory: () => false, isFile: () => true,
    })) as any);
    try {
      expect(await runBreakMusicScan()).toEqual({ indexed: 3, foldersScanned: 1 });
      expect(await savedIds(saved.playlistId)).toEqual([2, 1, 2]);
      expect((await query('SELECT id FROM break_music_tracks ORDER BY id')).rows).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
    } finally {
      readdir.mockRestore();
    }
  });
});
