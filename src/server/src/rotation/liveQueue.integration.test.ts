import { readFile } from 'node:fs/promises';
import express from 'express';
import type { Server } from 'node:http';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSession, getSetting, query, setSetting } from '../db.js';
import { ensureSingerInActiveRotation } from '../queueIdentity.js';
import { getQueueState, reorderSingerQueue, restoreCompletedSongToQueue } from '../queueState.js';
import { advanceLiveQueue, clearLiveQueue, deleteLiveQueueSong, getLiveQueueAutoplayState, resortLiveQueue, setLiveQueueStatus, startLiveQueueSong, stopLiveQueue } from './liveQueue.js';
import { DEFAULT_ROTATION_CONFIG, type RotationConfig, type RotationType } from './types.js';
import { getPlayerPlaybackState } from '../playerPlayback.js';

const { enabled, schema } = vi.hoisted(() => {
  const url = process.env.ROTATION_TEST_DATABASE_URL;
  const schema = `rotation_test_${process.pid}`;
  if (url) {
    const database = new URL(url);
    if (database.pathname !== '/rotation_test') throw new Error('Rotation integration tests require a dedicated rotation_test database');
    database.searchParams.set('options', `-csearch_path=${schema},public`);
    process.env.DATABASE_URL = database.toString();
  }
  return { enabled: !!url, schema };
});

describe.runIf(enabled)('live queue rotation against PostgreSQL', () => {
  let server: Server | undefined;
  let baseUrl: string;
  let token: string;
  const updates = vi.fn();

  beforeAll(async () => {
    await query(`CREATE SCHEMA ${schema}`);
    await query(await readFile(new URL('../../migrations/init.sql', import.meta.url), 'utf8'));
    vi.useFakeTimers({ toFake: ['setInterval'] });
    const { apiRouter, setPostQueueUpdate } = await import('../routes/api.js');
    setPostQueueUpdate(updates);
    const { rotationRouter } = await import('../routes/rotation.js');
    vi.useRealTimers();
    const app = express();
    app.use(express.json());
    app.use('/api', apiRouter);
    app.use('/api', rotationRouter);
    app.use((error: Error & { status?: number }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      res.status(error.status ?? 500).json({ error: error.message });
    });
    await new Promise<void>((resolve, reject) => {
      server = app.listen(0, '127.0.0.1', (error) => error ? reject(error) : resolve());
    });
    const address = server?.address();
    if (!address || typeof address === 'string') throw new Error('Missing rotation test server address');
    baseUrl = `http://127.0.0.1:${address.port}/api`;
  }, 30_000);

  afterAll(async () => {
    vi.useRealTimers();
    if (server) {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) => server!.close((error) => error ? reject(error) : resolve()));
    }
    await query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
  });

  beforeEach(async () => {
    await query(`TRUNCATE queue, singers, rotations, tracks RESTART IDENTITY CASCADE`);
    await query(`DELETE FROM settings WHERE key IN ('player.manual_stop', 'player.playback') OR key LIKE 'break_music.%'`);
    updates.mockClear();
    await setSetting('autoplay.enabled', 'true');
    await setSetting('autoplay.delay', '5');
    token = await createSession(1, undefined, 'admin');
  });

  async function addSinger(name: string) {
    const singer = (await query<{ id: string }>(
      `INSERT INTO singers (display_name, normalized_name) VALUES ($1, lower($1)) RETURNING id`, [name],
    )).rows[0].id;
    await ensureSingerInActiveRotation(BigInt(singer));
    return singer;
  }

  async function addSong(singer: string, label: string) {
    const track = (await query<{ id: number }>(
      `INSERT INTO tracks (title, kind, path, duration_ms) VALUES ($1, 'mp4', $1, 120000) RETURNING id`, [label],
    )).rows[0].id;
    return Number((await query<{ id: string }>(
      `INSERT INTO queue (singer_id, track_id, position, created_at)
       VALUES ($1, $2, (SELECT COALESCE(MAX(position), -1) + 1 FROM queue),
         '2025-01-01'::timestamptz + $2::int * interval '1 second') RETURNING id`,
      [singer, track],
    )).rows[0].id);
  }

  async function seed(type: RotationType, extra: Partial<RotationConfig> = {}) {
    const config = { ...DEFAULT_ROTATION_CONFIG, type, ...extra };
    await query(`INSERT INTO rotations (name, type, base_policy, config) VALUES ('Test', $1, $2, $3)`, [type, config.basePolicy, config]);
    const ids: number[] = [];
    for (const name of ['A', 'B', 'C']) {
      const singer = await addSinger(name);
      ids.push(await addSong(singer, `${name}1`), await addSong(singer, `${name}2`));
    }
    return ids;
  }

  async function labels() {
    return (await query<{ title: string }>(
      `SELECT t.title FROM queue q JOIN tracks t ON t.id = q.track_id WHERE q.status = 'queued' ORDER BY q.position, q.id`,
    )).rows.map((row) => row.title);
  }

  async function configure(extra: Partial<RotationConfig>) {
    await query(`UPDATE rotations SET config = config || $1::jsonb`, [extra]);
    await resortLiveQueue();
  }

  async function request(path: string, body?: unknown, method = 'POST') {
    return fetch(`${baseUrl}${path}`, {
      method, headers: { 'Content-Type': 'application/json', 'x-session-token': token },
      body: method === 'GET' ? undefined : JSON.stringify(body),
    });
  }

  it.each<RotationType>(['strict_round_robin', 'least_recently_sung', 'signup_order', 'song_queue_only', 'hybrid'])(
    '%s previews and plays every queued song in the same order over multiple rounds', async (type) => {
      await seed(type);
      await resortLiveQueue();
      const expected = type === 'song_queue_only' ? ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] : ['A1', 'B1', 'C1', 'A2', 'B2', 'C2'];
      expect(await labels()).toEqual(expected);
      const played: string[] = [];
      let id = await startLiveQueueSong();
      while (id != null) {
        played.push((await query<{ title: string }>(`SELECT t.title FROM queue q JOIN tracks t ON t.id = q.track_id WHERE q.id = $1`, [id])).rows[0].title);
        expect(await labels()).toEqual(expected.slice(played.length));
        id = await advanceLiveQueue();
      }
      expect(played).toEqual(expected);
      expect((await query(`SELECT total_songs_sung FROM singers ORDER BY id`)).rows).toEqual([
        { total_songs_sung: 2 }, { total_songs_sung: 2 }, { total_songs_sung: 2 },
      ]);
      if (type === 'strict_round_robin' || type === 'hybrid') {
        expect((await query(`SELECT current_round FROM rotations`)).rows[0].current_round).toBe(3);
      }
    },
  );

  it('manual preserves host order and requires an explicit selection, including after completion', async () => {
    const ids = await seed('manual');
    await query(`UPDATE queue SET position = 10 - position`);
    const order = await labels();
    await resortLiveQueue();
    expect(await labels()).toEqual(order);
    expect(await startLiveQueueSong()).toBeNull();
    expect(await startLiveQueueSong(ids[4], true)).toBe(ids[4]);
    expect(await startLiveQueueSong(undefined, true)).toBe(ids[4]);
    expect((await query(`SELECT id::int FROM queue WHERE status = 'playing'`)).rows[0].id).toBe(ids[4]);
    expect(await advanceLiveQueue()).toBeNull();
    expect(await startLiveQueueSong(ids[0], true)).toBe(ids[0]);
  });

  it.each<RotationType>(['strict_round_robin', 'least_recently_sung', 'signup_order', 'song_queue_only', 'manual'])(
    'hybrid honors its %s base and consumes a host override once', async (policy) => {
      const ids = await seed('hybrid', { basePolicy: policy });
      await query(`INSERT INTO manual_overrides (rotation_id, singer_id) VALUES (1, 3)`);
      await resortLiveQueue();
      expect((await labels())[0]).toBe('C1');
      expect(await startLiveQueueSong()).toBe(ids[4]);
      expect((await query(`SELECT status FROM manual_overrides`)).rows[0].status).toBe('consumed');
      const next = await advanceLiveQueue();
      expect(next).toBe(policy === 'manual' ? null : ids[0]);
    },
  );

  it('switching to song queue restores immutable request chronology', async () => {
    await seed('strict_round_robin');
    await resortLiveQueue();
    expect(await labels()).toEqual(['A1', 'B1', 'C1', 'A2', 'B2', 'C2']);
    await configure({ type: 'song_queue_only' });
    expect(await labels()).toEqual(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);
  });

  it.each<RotationType>(['least_recently_sung', 'signup_order'])('%s does not penalize historical join rounds', async (type) => {
    await seed(type);
    await query(`UPDATE rotations SET current_round = 8`);
    await query(`UPDATE rotation_singers SET current_round_joined = singer_id + 4`);
    await resortLiveQueue();
    expect(await labels()).toEqual(['A1', 'B1', 'C1', 'A2', 'B2', 'C2']);
    if (type === 'least_recently_sung') {
      await query(`UPDATE singers SET last_sang_at = CASE id WHEN 1 THEN '2025-01-02'::timestamptz WHEN 2 THEN '2025-01-01'::timestamptz ELSE NULL END`);
      await resortLiveQueue();
      expect(await labels()).toEqual(['C1', 'B1', 'A1', 'C2', 'B2', 'A2']);
    }
  });

  it.each([
    ['end_of_current_round', ['B1', 'C1', 'D1', 'A2', 'B2', 'C2']],
    ['next_round', ['B1', 'C1', 'A2', 'B2', 'C2', 'D1']],
    ['next_available', ['D1', 'B1', 'C1', 'A2', 'B2', 'C2']],
  ] as const)('places new singers using %s during a playing turn', async (placement, expected) => {
    await seed('strict_round_robin');
    await startLiveQueueSong();
    await configure({ newSingerPlacement: placement });
    await addSong(await addSinger('D'), 'D1');
    await resortLiveQueue();
    expect(await labels()).toEqual(expected);
  });

  it('empty singers never block rounds and a lone singer can continue', async () => {
    await seed('strict_round_robin');
    await addSinger('Empty');
    await query(`DELETE FROM queue WHERE singer_id <> 1`);
    await startLiveQueueSong();
    expect(await advanceLiveQueue()).toBe(2);
    expect((await query(`SELECT current_round FROM rotations`)).rows[0].current_round).toBe(2);
    expect(await advanceLiveQueue()).toBeNull();
  });

  it.each(['inactive', 'absent', 'banned'])('does not automatically play a globally %s singer', async (status) => {
    const ids = await seed('strict_round_robin');
    await query(`UPDATE singers SET status = $1 WHERE id = 1`, [status]);
    expect(await startLiveQueueSong()).toBe(ids[2]);
    const scroller = await (await request('/overlay/rotation-singers', undefined, 'GET')).json() as Array<{ displayName: string }>;
    expect(scroller.some((singer) => singer.displayName === 'A')).toBe(false);
  });

  it.each(['move_to_end', 'keep_position', 'remove_until_reactivated'] as const)('applies skip policy %s without counting a performance', async (skipPolicy) => {
    const ids = await seed('strict_round_robin', { skipPolicy });
    await startLiveQueueSong();
    await setLiveQueueStatus(ids[0], 'skipped');
    expect(await startLiveQueueSong()).toBe(skipPolicy === 'keep_position' ? ids[1] : ids[2]);
    expect((await query(`SELECT total_songs_sung FROM singers WHERE id = 1`)).rows[0].total_songs_sung).toBe(0);
    if (skipPolicy === 'remove_until_reactivated') {
      expect((await query(`SELECT status FROM rotation_singers WHERE singer_id = 1`)).rows[0].status).toBe('inactive');
      expect((await getQueueState()).queueOrder.find((singer) => singer.singerId === '1')?.status).toBe('inactive');
      await ensureSingerInActiveRotation(1n);
      expect((await query(`SELECT status FROM rotation_singers WHERE singer_id = 1`)).rows[0].status).toBe('active');
    }
  });

  it('stop does not consume a turn and ignores stale completion reports', async () => {
    const ids = await seed('strict_round_robin');
    await startLiveQueueSong();
    await stopLiveQueue();
    expect(await setLiveQueueStatus(ids[0], 'done', true)).toBe(false);
    expect((await query(`SELECT total_songs_sung FROM singers WHERE id = 1`)).rows[0].total_songs_sung).toBe(0);
    expect(await startLiveQueueSong()).toBe(ids[0]);
  });

  it('duplicate completion is idempotent and does not refresh waiting times or rounds', async () => {
    const ids = await seed('strict_round_robin');
    await startLiveQueueSong();
    expect(await setLiveQueueStatus(ids[0], 'done', true)).toBe(true);
    const before = (await query(`SELECT * FROM rotation_singers WHERE singer_id = 1`)).rows[0];
    expect(await setLiveQueueStatus(ids[0], 'done', true)).toBe(false);
    await setLiveQueueStatus(ids[0], 'done');
    expect((await query(`SELECT * FROM rotation_singers WHERE singer_id = 1`)).rows[0]).toEqual(before);
  });

  it('concurrent autoplay starts only one song and concurrent reports complete it once', async () => {
    const ids = await seed('strict_round_robin');
    const started = await Promise.all([startLiveQueueSong(), startLiveQueueSong(), startLiveQueueSong()]);
    expect(started.filter((id) => id != null)).toEqual([ids[0]]);
    const completed = await Promise.all([setLiveQueueStatus(ids[0], 'done', true), setLiveQueueStatus(ids[0], 'done', true)]);
    expect(completed.sort()).toEqual([false, true]);
    expect((await query(`SELECT total_songs_sung FROM singers WHERE id = 1`)).rows[0].total_songs_sung).toBe(1);
  });

  it('respects paused rotations and persisted manual stop', async () => {
    await seed('strict_round_robin');
    await query(`UPDATE rotations SET status = 'paused'`);
    await addSinger('D');
    expect((await query(`SELECT COUNT(*)::int AS count FROM rotations`)).rows[0].count).toBe(1);
    expect(await startLiveQueueSong()).toBeNull();
    await query(`UPDATE rotations SET status = 'active'`);
    await query(`INSERT INTO settings (key, value) VALUES ('player.manual_stop', 'true')`);
    expect(await startLiveQueueSong()).toBeNull();
  });

  it('rolls back queue status, round bookkeeping, and next-song selection together on failure', async () => {
    const ids = await seed('strict_round_robin');
    await startLiveQueueSong();
    await query(`CREATE FUNCTION reject_test_stats() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'rotation test failure'; END $$`);
    await query(`CREATE TRIGGER reject_test_stats BEFORE UPDATE ON singers FOR EACH ROW EXECUTE FUNCTION reject_test_stats()`);
    try {
      await expect(advanceLiveQueue()).rejects.toThrow('rotation test failure');
      expect((await query(`SELECT id::int FROM queue WHERE status = 'playing'`)).rows).toEqual([{ id: ids[0] }]);
      expect((await query(`SELECT last_round_sang FROM rotation_singers WHERE singer_id = 1`)).rows[0].last_round_sang).toBeNull();
      expect((await query(`SELECT COUNT(*)::int AS count FROM queue WHERE status = 'done'`)).rows[0].count).toBe(0);
    } finally {
      await query(`DROP TRIGGER reject_test_stats ON singers`);
      await query(`DROP FUNCTION reject_test_stats()`);
    }
  });

  it.each<RotationType>(['strict_round_robin', 'least_recently_sung', 'signup_order', 'song_queue_only', 'manual', 'hybrid'])(
    '%s is wired through the actual Host play/next and Player completion endpoints', async (type) => {
      const ids = await seed(type);
      await setSetting('autoplay.enabled', 'false');
      expect((await request('/player/play', { id: ids[0] })).status).toBe(200);
      expect((await request('/player/next')).status).toBe(200);
      let current = await (await request('/player/now', undefined, 'GET')).json();
      if (type === 'manual') {
        expect(current).toBeNull();
        expect((await request('/player/play', { id: ids[2] })).status).toBe(200);
        current = await (await request('/player/now', undefined, 'GET')).json();
      }
      expect(Number(current.id)).toBe(type === 'song_queue_only' ? ids[1] : ids[2]);
      expect((await request('/player/timing', { queueId: current.id, currentTime: 120, duration: 120 })).status).toBe(200);
      expect((await query(`SELECT COUNT(*)::int AS count FROM queue WHERE status = 'done'`)).rows[0].count).toBe(2);
      expect((await request('/player/now', undefined, 'GET')).status).toBe(200);
    },
  );

  it('does not advertise an autoplay countdown for manual, paused, or ineligible queues', async () => {
    await seed('manual');
    await setSetting('autoplay.enabled', 'true');
    expect(await (await request('/autoplay/settings', undefined, 'GET')).json()).toMatchObject({ enabled: true, rotationAllowsAutoplay: false });
    await configure({ type: 'strict_round_robin' });
    expect((await getLiveQueueAutoplayState()).allowed).toBe(true);
    await query(`UPDATE rotations SET status = 'paused'`);
    expect((await getLiveQueueAutoplayState()).allowed).toBe(false);
    await query(`UPDATE rotations SET status = 'active'`);
    await query(`UPDATE rotation_singers SET status = 'absent'`);
    expect((await getLiveQueueAutoplayState()).allowed).toBe(false);
  });

  it('rechecks autoplay settings before a delayed automatic start', async () => {
    const ids = await seed('strict_round_robin');
    await setSetting('autoplay.enabled', 'false');
    expect(await startLiveQueueSong()).toBeNull();
    expect(await startLiveQueueSong(ids[0], true)).toBe(ids[0]);
  });

  it('restores history as a new FIFO request and reactivates depleted singers', async () => {
    const ids = await seed('song_queue_only', { emptySingerPolicy: 'remove_from_rotation' });
    await startLiveQueueSong();
    await advanceLiveQueue();
    await advanceLiveQueue();
    expect((await query(`SELECT status FROM rotation_singers WHERE singer_id = 1`)).rows[0].status).toBe('inactive');
    expect(await restoreCompletedSongToQueue(ids[0])).toBe(true);
    expect((await labels()).at(-1)).toBe('A1');
    expect((await query(`SELECT status FROM rotation_singers WHERE singer_id = 1`)).rows[0].status).toBe('active');
    expect((await query(`SELECT total_songs_sung FROM singers WHERE id = 1`)).rows[0].total_songs_sung).toBe(1);
  });

  it('preserves all songs when a host submits a partial song reorder and rejects duplicates or foreign songs', async () => {
    const ids = await seed('strict_round_robin');
    await resortLiveQueue();
    expect(await reorderSingerQueue(1n, [ids[1]])).toEqual({ ok: true });
    await resortLiveQueue();
    expect(await labels()).toEqual(['A2', 'B1', 'C1', 'A1', 'B2', 'C2']);
    expect((await reorderSingerQueue(1n, [ids[0], ids[0]])).ok).toBe(false);
    expect((await reorderSingerQueue(1n, [ids[2]])).ok).toBe(false);
    expect(new Set((await query(`SELECT position FROM queue WHERE status = 'queued'`)).rows.map((row) => row.position)).size).toBe(6);
    expect((await getQueueState()).queueOrder.map((singer) => singer.displayName)).toEqual(['A', 'B', 'C']);
  });

  it('an explicit host selection does not skip the unfinished strict round', async () => {
    const ids = await seed('strict_round_robin');
    await startLiveQueueSong();
    await setLiveQueueStatus(ids[0], 'done');
    await startLiveQueueSong(ids[1], true);
    expect((await query(`SELECT current_round FROM rotations`)).rows[0].current_round).toBe(1);
    expect(await advanceLiveQueue()).toBe(ids[2]);
  });

  it('clearing a show resets rounds and overrides, and deleting a song keeps scheduling coherent', async () => {
    const ids = await seed('strict_round_robin');
    await startLiveQueueSong();
    expect(await deleteLiveQueueSong(ids[0])).toBe(true);
    expect(await startLiveQueueSong()).toBe(ids[2]);
    await advanceLiveQueue();
    await query(`INSERT INTO manual_overrides (rotation_id, singer_id) VALUES (1, 1)`);
    await clearLiveQueue();
    expect((await query(`SELECT current_round FROM rotations`)).rows[0].current_round).toBe(1);
    expect((await query(`SELECT last_round_sang FROM rotation_singers`)).rows.every((row) => row.last_round_sang === null)).toBe(true);
    expect((await query(`SELECT status FROM manual_overrides`)).rows[0].status).toBe('cancelled');
    expect((await query(`SELECT total_songs_sung FROM singers`)).rows.every((row) => row.total_songs_sung === 0)).toBe(true);
    const next = await addSong('1', 'New show');
    expect(await startLiveQueueSong()).toBe(next);
  });

  it.each([false, true])('preserves explicit song ordering in FIFO, including hybrid=%s', async (hybrid) => {
    const ids = await seed(hybrid ? 'hybrid' : 'song_queue_only', { basePolicy: 'song_queue_only' });
    const timestamps = (await query(`SELECT id, created_at FROM queue ORDER BY id`)).rows;
    expect(await reorderSingerQueue(1n, [ids[1], ids[0]])).toEqual({ ok: true });
    await resortLiveQueue();
    expect(await labels()).toEqual(['A2', 'A1', 'B1', 'B2', 'C1', 'C2']);
    expect((await query(`SELECT id, created_at FROM queue ORDER BY id`)).rows).toEqual(timestamps);
    expect(await startLiveQueueSong()).toBe(ids[1]);
    expect(await advanceLiveQueue()).toBe(ids[0]);
  });

  it.each([false, true])('keeps strict preview and playback aligned through consecutive overrides, initiallyPlaying=%s', async (initiallyPlaying) => {
    const ids = await seed('strict_round_robin', { newSingerPlacement: 'next_round', priorityPolicy: 'none' });
    if (initiallyPlaying) await startLiveQueueSong(ids[0], true);
    await query(`INSERT INTO manual_overrides (rotation_id, singer_id, position) VALUES (1, $1, 0), (1, $2, 1)`, initiallyPlaying ? [2, 3] : [1, 2]);
    await resortLiveQueue();
    const expected = initiallyPlaying ? ['B1', 'C1', 'A2', 'B2', 'C2'] : ['A1', 'B1', 'A2', 'C1', 'B2', 'C2'];
    expect(await labels()).toEqual(expected);
    let id = initiallyPlaying ? await advanceLiveQueue() : await startLiveQueueSong();
    const played: string[] = [];
    while (id != null) {
      played.push((await query<{ title: string }>(`SELECT t.title FROM queue q JOIN tracks t ON t.id = q.track_id WHERE q.id = $1`, [id])).rows[0].title);
      expect(await labels()).toEqual(expected.slice(played.length));
      id = await advanceLiveQueue();
    }
    expect(played).toEqual(expected);
  });

  it('upgrades an existing queue without changing its requests and applies migration 022 idempotently', async () => {
    await seed('strict_round_robin');
    const before = (await query(`SELECT id, created_at FROM queue ORDER BY id`)).rows;
    await query(`ALTER TABLE queue DROP COLUMN fifo_order_at, DROP COLUMN fifo_order_id`);
    const migration = await readFile(new URL('../../migrations/022_queue_manual_order.sql', import.meta.url), 'utf8');
    await query(migration);
    await query(migration);
    expect((await query(`SELECT id, created_at FROM queue ORDER BY id`)).rows).toEqual(before);
    await resortLiveQueue();
    expect(await labels()).toEqual(['A1', 'B1', 'C1', 'A2', 'B2', 'C2']);
  });

  it.each<RotationType>(['strict_round_robin', 'least_recently_sung', 'signup_order', 'song_queue_only', 'manual', 'hybrid'])(
    'Host insert-next survives live re-sorts and is consumed by Player in %s', async (type) => {
      const ids = await seed(type, { priorityPolicy: 'none' });
      await startLiveQueueSong(ids[0], true);
      expect((await request('/rotations/1/singers/3/insert-next')).status).toBe(200);
      await resortLiveQueue();
      expect((await labels())[0]).toBe('C1');
      expect((await request('/player/next')).status).toBe(200);
      expect(Number((await (await request('/player/now', undefined, 'GET')).json()).id)).toBe(ids[4]);
      expect((await query(`SELECT status FROM manual_overrides`)).rows[0].status).toBe('consumed');
    },
  );

  it('Host hybrid reorder persists through live re-sorts while a song is playing', async () => {
    const ids = await seed('hybrid');
    await startLiveQueueSong(ids[0], true);
    expect((await request('/rotations/1/singers/reorder', { orderedSingerIds: ['3', '2', '1'] }, 'PATCH')).status).toBe(200);
    await resortLiveQueue();
    expect(await labels()).toEqual(['C1', 'B1', 'A2', 'C2', 'B2']);
    expect(await advanceLiveQueue()).toBe(ids[4]);
    expect(await advanceLiveQueue()).toBe(ids[2]);
    expect(await advanceLiveQueue()).toBe(ids[1]);
    expect((await query(`SELECT status FROM manual_overrides`)).rows.every((row) => row.status === 'consumed')).toBe(true);
  });

  it('Host config and pause endpoints immediately govern the live Player', async () => {
    await seed('strict_round_robin');
    await resortLiveQueue();
    expect((await request('/rotations/1/config', { type: 'song_queue_only' }, 'PATCH')).status).toBe(200);
    expect(await labels()).toEqual(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);
    expect((await request('/rotations/1/pause')).status).toBe(200);
    expect(await startLiveQueueSong()).toBeNull();
    expect((await request('/rotations/1/resume')).status).toBe(200);
    expect(await startLiveQueueSong()).toBe(1);
  });

  describe('singer playback controls', () => {
    it.each<RotationType>(['strict_round_robin', 'least_recently_sung', 'signup_order', 'song_queue_only', 'hybrid'])(
      'Play without an ID restarts %s after Stop with autoplay enabled', async (type) => {
        const ids = await seed(type);
        expect((await request('/player/play')).status).toBe(200);
        expect((await request('/player/stop')).status).toBe(200);
        expect(await getPlayerPlaybackState()).toMatchObject({ queueId: null, manualStop: true, paused: false });
        expect((await request('/player/play')).status).toBe(200);
        expect(await getPlayerPlaybackState()).toMatchObject({ queueId: ids[0], manualStop: false, paused: false });
        expect((await query(`SELECT COUNT(*)::int AS count FROM queue WHERE status = 'done'`)).rows[0].count).toBe(0);
      },
    );

    it('automatically advances after Stop then Play without requiring Next', async () => {
      const ids = await seed('strict_round_robin');
      await setSetting('autoplay.delay', '0');
      await request('/player/play');
      await request('/player/stop');
      await request('/player/play');
      expect((await request('/player/timing', { queueId: ids[0], currentTime: 120, duration: 120 })).status).toBe(200);
      await expect.poll(() => updates.mock.calls.some(([type]) => type === 'player.next')).toBe(true);
      expect(await getPlayerPlaybackState()).toMatchObject({ queueId: ids[2], paused: false, manualStop: false });
      expect((await query(`SELECT status FROM queue WHERE id = $1`, [ids[0]])).rows[0].status).toBe('done');
    });

    it.each(['/player/play', '/player/pause'])('pauses in place and resumes via %s without resetting the song or its turn', async (resumePath) => {
      const ids = await seed('strict_round_robin');
      await request('/player/play', { id: ids[0] });
      await request('/player/timing', { queueId: ids[0], currentTime: 34.25, duration: 120 });
      const before = (await query(`SELECT started_at, status FROM queue WHERE id = $1`, [ids[0]])).rows[0];
      const paused = await request('/player/pause', { queueId: ids[0], paused: true });
      expect(paused.status).toBe(200);
      expect(await paused.json()).toMatchObject({ paused: true, queueId: ids[0], positionSec: 34.25 });
      expect(await getSetting('player.playback')).toEqual({ queueId: ids[0], paused: true, positionSec: 34.25 });
      expect(updates).toHaveBeenCalledWith('player.pause', expect.objectContaining({ paused: true, positionSec: 34.25 }));
      expect(await (await request('/player/state', undefined, 'GET')).json()).toMatchObject({ paused: true, queueId: ids[0], positionSec: 34.25 });
      expect((await request('/player/timing', { queueId: ids[0], currentTime: 120, duration: 120 })).status).toBe(200);
      expect(await setLiveQueueStatus(ids[0], 'done', true)).toBe(false);
      expect(await startLiveQueueSong()).toBeNull();
      expect(await request('/player/pause', { queueId: ids[0], paused: true, positionSec: 90 }).then((response) => response.json())).toMatchObject({ positionSec: 34.25 });
      const resumed = await request(resumePath, resumePath === '/player/pause' ? { queueId: ids[0], paused: false } : undefined);
      expect(resumed.status).toBe(200);
      expect(await getPlayerPlaybackState()).toMatchObject({ paused: false, queueId: ids[0], positionSec: 34.25 });
      expect((await query(`SELECT started_at, status FROM queue WHERE id = $1`, [ids[0]])).rows[0]).toEqual(before);
      expect((await query(`SELECT last_round_sang FROM rotation_singers WHERE singer_id = 1`)).rows[0].last_round_sang).toBeNull();
    });

    it('Stop and Next clear singer pause state, and stale pause commands cannot pause the next singer', async () => {
      const ids = await seed('strict_round_robin');
      await request('/player/play');
      await request('/player/pause', { queueId: ids[0], paused: true, positionSec: 20 });
      await request('/player/stop');
      expect(await getPlayerPlaybackState()).toMatchObject({ paused: false, queueId: null });
      await request('/player/play');
      expect(await getPlayerPlaybackState()).toMatchObject({ paused: false, queueId: ids[0], positionSec: 0 });
      await request('/player/pause', { queueId: ids[0], paused: true });
      await request('/player/next');
      expect(await getPlayerPlaybackState()).toMatchObject({ paused: false, queueId: ids[2], positionSec: 0 });
      expect((await request('/player/pause', { queueId: ids[0], paused: true })).status).toBe(409);
    });

    it('can resume the active song without unpausing a paused rotation', async () => {
      const ids = await seed('strict_round_robin');
      await request('/player/play');
      await request('/player/pause', { queueId: ids[0], paused: true, positionSec: 10 });
      await request('/rotations/1/pause');
      expect((await request('/player/play')).status).toBe(200);
      expect(await getPlayerPlaybackState()).toMatchObject({ paused: false, queueId: ids[0], positionSec: 10 });
      expect((await query(`SELECT status FROM rotations`)).rows[0].status).toBe('paused');
    });

    it('rejects invalid pause requests and requires Host authorization', async () => {
      const ids = await seed('strict_round_robin');
      await request('/player/play');
      for (const body of [{ queueId: ids[0] }, { queueId: 0, paused: true }, { queueId: ids[0], paused: 'true' }, { queueId: ids[0], paused: true, positionSec: -1 }]) {
        expect((await request('/player/pause', body)).status).toBe(400);
      }
      expect((await fetch(`${baseUrl}/player/pause`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queueId: ids[0], paused: true }),
      })).status).toBe(403);
      expect((await getPlayerPlaybackState()).paused).toBe(false);
    });
  });

  describe('break music during singer playback', () => {
    beforeEach(async () => {
      await query(`TRUNCATE break_music_tracks RESTART IDENTITY CASCADE`);
    });

    async function prepareBreakMusic() {
      const tracks = (await query<{ id: number }>(
        `INSERT INTO break_music_tracks (title, duration_ms, file_path)
         VALUES ('Break A', 10000, '/test/break-a.mp3'), ('Break B', 10000, '/test/break-b.mp3') RETURNING id`,
      )).rows.map((row) => row.id);
      await setSetting('break_music.playlist_track_ids', tracks);
      await setSetting('break_music.current_track_id', tracks[0]);
      await setSetting('break_music.current_position_sec', 3);
      await setSetting('break_music.current_started_at', new Date(Date.now() - 3000).toISOString());
      await setSetting('break_music.volume_percent', 87);
      return tracks;
    }

    it('defaults to pausing break music at its position and resuming it when karaoke stops', async () => {
      await seed('strict_round_robin');
      const tracks = await prepareBreakMusic();
      await request('/player/play');
      const state = await (await request('/break-music/state', undefined, 'GET')).json();
      expect(state).toMatchObject({ paused: true, pauseDuringKaraoke: true, mutedForKaraoke: true, volumePercent: 87, currentTrack: { id: tracks[0] } });
      expect(state.elapsedSec).toBeGreaterThanOrEqual(3);
      expect(await getSetting('break_music.current_started_at')).toBeNull();
      await request('/player/stop');
      expect(await (await request('/break-music/state', undefined, 'GET')).json()).toMatchObject({
        paused: false, mutedForKaraoke: false, currentTrack: { id: tracks[0] },
      });
    });

    it('keeps break music and its playlist advancing silently while a singer is active, including paused singers', async () => {
      const ids = await seed('strict_round_robin');
      const tracks = await prepareBreakMusic();
      expect((await request('/break-music/settings', { pauseDuringKaraoke: false })).status).toBe(200);
      await request('/player/play');
      expect(await (await request('/break-music/state', undefined, 'GET')).json()).toMatchObject({
        pauseDuringKaraoke: false, paused: false, mutedForKaraoke: true, volumePercent: 87,
      });
      await request('/player/pause', { queueId: ids[0], paused: true });
      await setSetting('break_music.current_started_at', new Date(Date.now() - 12000).toISOString());
      expect(await (await request('/break-music/state', undefined, 'GET')).json()).toMatchObject({
        paused: false, mutedForKaraoke: true, currentTrack: { id: tracks[1] }, playlistIndex: 1,
      });
      await request('/player/stop');
      expect(await (await request('/break-music/state', undefined, 'GET')).json()).toMatchObject({
        paused: false, mutedForKaraoke: false, currentTrack: { id: tracks[1] }, volumePercent: 87,
      });
    });

    it('applies policy changes immediately without undoing an intentional break-music pause', async () => {
      await seed('strict_round_robin');
      await prepareBreakMusic();
      await request('/player/play');
      expect(await getSetting('break_music.auto_paused')).toBe(true);
      await request('/break-music/settings', { pauseDuringKaraoke: false });
      expect(await getSetting('break_music.paused')).toBe(false);
      expect(await getSetting('break_music.auto_paused')).toBe(false);
      await request('/break-music/settings', { pauseDuringKaraoke: true });
      expect(await getSetting('break_music.paused')).toBe(true);
      await request('/break-music/control', { action: 'pause' });
      await request('/break-music/settings', { pauseDuringKaraoke: false });
      await request('/player/stop');
      expect(await getSetting('break_music.paused')).toBe(true);
      expect(await getSetting('break_music.auto_paused')).toBe(false);
      expect(updates).toHaveBeenCalledWith('break_music.updated');
    });

    it('validates the new option without changing existing volume, and denies unauthenticated changes', async () => {
      await prepareBreakMusic();
      expect((await request('/break-music/settings', { pauseDuringKaraoke: 'false', volumePercent: 5 })).status).toBe(400);
      expect(await getSetting('break_music.volume_percent')).toBe(87);
      expect((await fetch(`${baseUrl}/break-music/settings`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pauseDuringKaraoke: false }),
      })).status).toBe(403);
      expect(await getSetting('break_music.pause_during_karaoke')).toBeNull();
    });
  });
});
