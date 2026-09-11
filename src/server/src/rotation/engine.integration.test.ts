import { readFile } from 'node:fs/promises';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { query } from '../db.js';
import {
  addManualOverride, addSingerToRotation, addSongRequest, clearManualOverrides, completeTurn,
  createRotation, createSinger, getNextTurn, getRotation, getRotationState, insertSingerNext,
  moveSinger, pauseRotation, removeSingerFromRotation, removeSongRequest, reorderSingers,
  resumeRotation, setRotationSingerStatus, setSingerStatus, skipTurn, startTurn, updateRotationConfig,
} from './rotationService.js';
import { type RotationConfig, type RotationType } from './types.js';

const { enabled, schema } = vi.hoisted(() => {
  const url = process.env.ROTATION_TEST_DATABASE_URL;
  const schema = `engine_test_${process.pid}`;
  if (url) {
    const database = new URL(url);
    if (database.pathname !== '/rotation_test') throw new Error('Engine tests require the dedicated rotation_test database');
    database.searchParams.set('options', `-csearch_path=${schema},public`);
    process.env.DATABASE_URL = database.toString();
  }
  return { enabled: !!url, schema };
});

describe.runIf(enabled)('rotation service against PostgreSQL', () => {
  beforeAll(async () => {
    await query(`CREATE SCHEMA ${schema}`);
    // Only the rotation schema is needed here. Avoid installing database-wide
    // search extensions concurrently with the independent live-queue suite.
    await query('CREATE TABLE tracks (id SERIAL PRIMARY KEY)');
    await query(await readFile(new URL('../../migrations/014_add_rotation.sql', import.meta.url), 'utf8'));
    await query('ALTER TABLE singers ADD COLUMN normalized_name TEXT NOT NULL UNIQUE');
  }, 30_000);
  afterAll(async () => { await query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`); });
  beforeEach(async () => { await query('TRUNCATE singers, rotations, tracks RESTART IDENTITY CASCADE'); });

  async function seed(type: RotationType = 'strict_round_robin', extra: Partial<RotationConfig> = {}, count = 2) {
    const rotation = await createRotation({ name: 'Test', config: { type, ...extra } });
    const singers: bigint[] = [];
    const songs: bigint[][] = [];
    for (const name of ['A', 'B', 'C']) {
      const singer = await createSinger(name);
      singers.push(singer.id);
      await addSingerToRotation(rotation.id, singer.id);
      const requests: bigint[] = [];
      for (let i = 0; i < count; i++) {
        const song = await addSongRequest({ singerId: singer.id, title: `${name}${i + 1}` });
        requests.push(song.id);
        await query(`UPDATE song_requests SET requested_at = '2025-01-01'::timestamptz + id * interval '1 second' WHERE id = $1`, [song.id]);
      }
      songs.push(requests);
    }
    return { rotation: rotation.id, singers, songs };
  }

  async function expectNext(rotation: bigint, singerId: bigint | null, round?: number) {
    const preview = (await getRotationState(rotation))?.nextTurnPreview;
    const turn = await getNextTurn(rotation);
    expect(preview).toEqual(turn ? { singerId: turn.singer_id, songRequestId: turn.song_request_id } : null);
    expect(turn?.singer_id ?? null).toBe(singerId);
    if (round !== undefined) expect(turn?.round_number).toBe(round);
    if (turn) expect((await getRotationState(rotation))?.nextTurnPreview).toEqual(preview);
    return turn;
  }

  async function perform(rotation: bigint, singer: bigint, round?: number) {
    const turn = await expectNext(rotation, singer, round);
    expect(await startTurn(turn!.id)).toMatchObject({ status: 'active' });
    expect(await completeTurn(turn!.id)).toMatchObject({ status: 'completed' });
    return turn!;
  }

  it.each<RotationType>([
    'strict_round_robin', 'least_recently_sung', 'signup_order', 'song_queue_only', 'manual', 'hybrid',
  ])('schedules, previews, starts and completes every song in %s', async (type) => {
    const { rotation, singers, songs } = await seed(type);
    const order = type === 'song_queue_only' ? [0, 0, 1, 1, 2, 2] : [0, 1, 2, 0, 1, 2];
    if (type === 'manual') await expectNext(rotation, null);
    const completed: bigint[] = [];
    for (const index of order) {
      if (type === 'manual') await addManualOverride({ rotationId: rotation, singerId: singers[index] });
      const turn = await perform(rotation, singers[index],
        type === 'strict_round_robin' || type === 'hybrid' ? Math.floor(completed.length / 3) + 1 : 1);
      completed.push(turn.song_request_id!);
    }
    expect(new Set(completed)).toEqual(new Set(songs.flat()));
    await expectNext(rotation, null);
    expect((await query('SELECT total_songs_sung FROM singers ORDER BY id')).rows.map((row) => row.total_songs_sung)).toEqual([2, 2, 2]);
  });

  it.each<RotationType>(['strict_round_robin', 'least_recently_sung', 'signup_order', 'song_queue_only', 'manual'])(
    'hybrid dispatches its %s base rather than falling back to round robin', async (basePolicy) => {
      const { rotation, singers } = await seed('hybrid', { basePolicy, preventSameSingerBackToBack: false });
      if (basePolicy === 'manual') { await expectNext(rotation, null); return; }
      await perform(rotation, singers[0]);
      await expectNext(rotation, singers[basePolicy === 'song_queue_only' ? 0 : 1]);
    });

  it('serializes concurrent scheduling and lifecycle retries without double counting', async () => {
    const { rotation, singers } = await seed();
    const turns = await Promise.all(Array.from({ length: 8 }, () => getNextTurn(rotation)));
    expect(new Set(turns.map((turn) => turn?.id)).size).toBe(1);
    const id = turns[0]!.id;
    expect((await Promise.all([startTurn(id), startTurn(id)])).every((turn) => turn?.status === 'active')).toBe(true);
    expect((await Promise.all([completeTurn(id), completeTurn(id)])).every((turn) => turn?.status === 'completed')).toBe(true);
    expect(await startTurn(id)).toBeNull();
    expect(await skipTurn(id)).toBeNull();
    expect((await query('SELECT total_songs_sung FROM singers WHERE id = $1', [singers[0]])).rows[0].total_songs_sung).toBe(1);
    expect((await query('SELECT COUNT(*) AS c FROM rotation_turns')).rows[0].c).toBe('1');
  });

  it('cannot complete an unstarted turn or start a removed song', async () => {
    const { rotation, songs } = await seed();
    const turn = (await getNextTurn(rotation))!;
    expect(await completeTurn(turn.id)).toBeNull();
    await removeSongRequest(songs[0][0]);
    expect(await startTurn(turn.id)).toBeNull();
    expect((await query('SELECT status FROM song_requests WHERE id = $1', [songs[0][0]])).rows[0].status).toBe('removed');
    expect((await getNextTurn(rotation))?.song_request_id).toBe(songs[0][1]);
  });

  it('atomically reserves a song shared by two rotations', async () => {
    const singer = await createSinger('Shared');
    const rotations = await Promise.all(['First', 'Second'].map((name) => createRotation({ name })));
    for (const rotation of rotations) await addSingerToRotation(rotation.id, singer.id);
    await addSongRequest({ singerId: singer.id, title: 'Only song' });
    const turns = await Promise.all(rotations.map((rotation) => getNextTurn(rotation.id)));
    expect(turns.filter(Boolean)).toHaveLength(1);
  });

  it('rolls back the reservation and round if turn insertion fails', async () => {
    const { rotation, songs } = await seed();
    await query(`CREATE FUNCTION ${schema}.reject_turn() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'injected turn failure'; END $$`);
    await query(`CREATE TRIGGER reject_turn BEFORE INSERT ON rotation_turns FOR EACH ROW EXECUTE FUNCTION ${schema}.reject_turn()`);
    try {
      await expect(getNextTurn(rotation)).rejects.toThrow('injected turn failure');
      expect((await query('SELECT status FROM song_requests WHERE id = $1', [songs[0][0]])).rows[0].status).toBe('pending');
      expect(await getRotation(rotation)).toMatchObject({ current_turn_id: null, current_round: 1 });
    } finally {
      await query('DROP TRIGGER reject_turn ON rotation_turns');
      await query(`DROP FUNCTION ${schema}.reject_turn()`);
    }
    expect(await getNextTurn(rotation)).not.toBeNull();
  });

  it('does not let empty singers block strict and hybrid rounds', async () => {
    const { rotation, singers } = await seed('hybrid', {}, 0);
    for (let i = 0; i < 2; i++) await addSongRequest({ singerId: singers[0], title: `Solo${i}` });
    await perform(rotation, singers[0], 1);
    expect((await getRotation(rotation))?.current_round).toBe(2);
    await perform(rotation, singers[0], 2);
    expect((await getRotation(rotation))?.current_round).toBe(3);
    await expectNext(rotation, null);
    expect((await getRotation(rotation))?.current_round).toBe(3);
  });

  it('advances to the actual join round when only future-round singers have songs', async () => {
    const { rotation, singers } = await seed('strict_round_robin', {}, 0);
    await query('UPDATE rotation_singers SET current_round_joined = 4 WHERE rotation_id = $1', [rotation]);
    await addSongRequest({ singerId: singers[0], title: 'Later' });
    await expectNext(rotation, singers[0], 4);
  });

  it.each([
    ['end_of_current_round', 1, 3],
    ['next_round', 2, 3],
    ['next_available', 1, 1],
  ] as const)('places new singers correctly for %s', async (newSingerPlacement, round, position) => {
    const { rotation, singers } = await seed();
    const current = (await getNextTurn(rotation))!;
    await startTurn(current.id);
    await updateRotationConfig(rotation, { newSingerPlacement });
    const newcomer = await createSinger('New');
    const joined = await addSingerToRotation(rotation, newcomer.id);
    expect(joined).toMatchObject({ current_round_joined: round, position });
    await addSongRequest({ singerId: newcomer.id, title: 'New song' });
    await completeTurn(current.id);
    await expectNext(rotation, newSingerPlacement === 'next_available' ? newcomer.id : singers[1], 1);
  });

  it('adding an already active member is idempotent; reactivation applies the new placement', async () => {
    const { rotation, singers } = await seed();
    await perform(rotation, singers[0], 1);
    await updateRotationConfig(rotation, { newSingerPlacement: 'next_round' });
    const active = await addSingerToRotation(rotation, singers[0]);
    expect(active).toMatchObject({ position: 0, current_round_joined: 1, last_round_sang: 1 });
    await removeSingerFromRotation(rotation, singers[0]);
    const rejoined = await addSingerToRotation(rotation, singers[0]);
    expect(rejoined).toMatchObject({ status: 'active', current_round_joined: 2, last_round_sang: 1 });
  });

  it.each<RotationType>([
    'strict_round_robin', 'least_recently_sung', 'signup_order', 'song_queue_only', 'manual', 'hybrid',
  ])('move_to_end skips are idempotent and requeue songs safely in %s', async (type) => {
    const { rotation, singers, songs } = await seed(type, { preventSameSingerBackToBack: false }, 1);
    if (type === 'manual') await addManualOverride({ rotationId: rotation, singerId: singers[0] });
    const turn = (await getNextTurn(rotation))!;
    expect(await skipTurn(turn.id)).toMatchObject({ status: 'skipped' });
    const position = (await query('SELECT position FROM rotation_singers WHERE rotation_id = $1 AND singer_id = $2', [rotation, singers[0]])).rows[0].position;
    expect(await skipTurn(turn.id)).toMatchObject({ status: 'skipped' });
    expect((await query('SELECT position FROM rotation_singers WHERE rotation_id = $1 AND singer_id = $2', [rotation, singers[0]])).rows[0].position).toBe(position);
    expect(await startTurn(turn.id)).toBeNull();
    expect(await completeTurn(turn.id)).toBeNull();
    expect((await query('SELECT status FROM song_requests WHERE id = $1', [songs[0][0]])).rows[0].status).toBe('pending');
    if (type === 'manual') await addManualOverride({ rotationId: rotation, singerId: singers[1] });
    await expectNext(rotation, singers[1]);
    expect((await query('SELECT total_songs_sung FROM singers WHERE id = $1', [singers[0]])).rows[0].total_songs_sung).toBe(0);
  });

  it.each(['keep_position', 'remove_until_reactivated'] as const)('honors %s skip behavior', async (skipPolicy) => {
    const { rotation, singers } = await seed('strict_round_robin', { skipPolicy });
    const turn = (await getNextTurn(rotation))!;
    await startTurn(turn.id);
    await skipTurn(turn.id);
    await expectNext(rotation, singers[skipPolicy === 'keep_position' ? 0 : 1]);
    if (skipPolicy === 'remove_until_reactivated') {
      expect((await query('SELECT status FROM rotation_singers WHERE rotation_id = $1 AND singer_id = $2', [rotation, singers[0]])).rows[0].status).toBe('absent');
      await setRotationSingerStatus(rotation, singers[0], 'active');
      expect((await query('SELECT status FROM rotation_singers WHERE rotation_id = $1 AND singer_id = $2', [rotation, singers[0]])).rows[0].status).toBe('active');
    }
  });

  it('overrides replace scheduled automatic turns and are consumed only when used', async () => {
    const { rotation, singers, songs } = await seed('hybrid');
    const automatic = (await getNextTurn(rotation))!;
    const override = await addManualOverride({ rotationId: rotation, singerId: singers[2], songRequestId: songs[2][1] });
    expect(await startTurn(automatic.id)).toBeNull();
    const selected = (await expectNext(rotation, singers[2]))!;
    expect(selected).toMatchObject({ song_request_id: songs[2][1], source: 'manual_override' });
    expect((await query('SELECT status FROM manual_overrides WHERE id = $1', [override.id])).rows[0].status).toBe('pending');
    await updateRotationConfig(rotation, { basePolicy: 'signup_order' });
    expect((await getNextTurn(rotation))?.song_request_id).toBe(songs[2][1]);
    const replacement = (await getNextTurn(rotation))!;
    await startTurn(replacement.id);
    expect((await query('SELECT status FROM manual_overrides WHERE id = $1', [override.id])).rows[0].status).toBe('consumed');
    await completeTurn(replacement.id);
    await expectNext(rotation, singers[0]);
  });

  it('clearing overrides cancels reserved override turns without losing their requests', async () => {
    const { rotation, singers, songs } = await seed('manual');
    await addManualOverride({ rotationId: rotation, singerId: singers[1], songRequestId: songs[1][0] });
    const turn = (await getNextTurn(rotation))!;
    await clearManualOverrides(rotation);
    expect(await startTurn(turn.id)).toBeNull();
    await expectNext(rotation, null);
    expect((await query('SELECT status FROM song_requests WHERE id = $1', [songs[1][0]])).rows[0].status).toBe('pending');
  });

  it('clearing overrides does not interrupt an active performance', async () => {
    const { rotation, singers } = await seed('manual');
    await addManualOverride({ rotationId: rotation, singerId: singers[0], expiresAfterTurn: false });
    const turn = (await getNextTurn(rotation))!;
    await startTurn(turn.id);
    await clearManualOverrides(rotation);
    expect(await completeTurn(turn.id)).toMatchObject({ status: 'completed' });
    await expectNext(rotation, null);
  });

  it('persistent singer overrides continue while one-shot and unavailable song overrides do not', async () => {
    const { rotation, singers } = await seed('manual');
    const override = await addManualOverride({ rotationId: rotation, singerId: singers[0], expiresAfterTurn: false });
    await perform(rotation, singers[0]);
    await perform(rotation, singers[0]);
    await expectNext(rotation, null);
    expect((await query('SELECT status FROM manual_overrides WHERE id = $1', [override.id])).rows[0].status).toBe('pending');
    await addSongRequest({ singerId: singers[0], title: 'Third' });
    await expectNext(rotation, singers[0]);
  });

  it('rejects mismatched, unavailable, banned and nonmember overrides', async () => {
    const { rotation, singers, songs } = await seed();
    await expect(addManualOverride({ rotationId: rotation, singerId: singers[0], songRequestId: songs[1][0] })).rejects.toThrow('belong');
    await setSingerStatus(singers[0], 'banned');
    await expect(addManualOverride({ rotationId: rotation, singerId: singers[0] })).rejects.toThrow('active');
    await removeSongRequest(songs[1][0]);
    await expect(addManualOverride({ rotationId: rotation, singerId: singers[1], songRequestId: songs[1][0] })).rejects.toThrow('pending');
    const outsider = await createSinger('Outside');
    await expect(addManualOverride({ rotationId: rotation, singerId: outsider.id })).rejects.toThrow('active');
  });

  it('invalid queued overrides do not starve valid automatic choices', async () => {
    const { rotation, singers } = await seed();
    const override = await addManualOverride({ rotationId: rotation, singerId: singers[0] });
    await setRotationSingerStatus(rotation, singers[0], 'absent');
    await expectNext(rotation, singers[1]);
    expect((await query('SELECT status FROM manual_overrides WHERE id = $1', [override.id])).rows[0].status).toBe('cancelled');
  });

  it('pausing blocks scheduling and starting but permits completion of an active turn', async () => {
    const { rotation, singers } = await seed();
    const turn = (await getNextTurn(rotation))!;
    await pauseRotation(rotation);
    await expectNext(rotation, null);
    expect(await startTurn(turn.id)).toBeNull();
    await resumeRotation(rotation);
    await startTurn(turn.id);
    await pauseRotation(rotation);
    expect(await completeTurn(turn.id)).toMatchObject({ status: 'completed' });
    await resumeRotation(rotation);
    await expectNext(rotation, singers[1]);
  });

  it('configuration switches preserve active turns and invalidate scheduled previews', async () => {
    const { rotation, singers } = await seed();
    const scheduled = (await getNextTurn(rotation))!;
    const updated = await updateRotationConfig(rotation, { type: 'manual' });
    expect(updated?.current_turn_id).toBeNull();
    expect(await startTurn(scheduled.id)).toBeNull();
    await expectNext(rotation, null);
    await updateRotationConfig(rotation, { type: 'signup_order' });
    const active = (await getNextTurn(rotation))!;
    await startTurn(active.id);
    await updateRotationConfig(rotation, { type: 'song_queue_only', basePolicy: 'signup_order' });
    expect((await getNextTurn(rotation))?.id).toBe(active.id);
    await completeTurn(active.id);
    expect((await query('SELECT position FROM rotation_singers WHERE rotation_id = $1 AND singer_id = $2', [rotation, singers[0]])).rows[0].position).toBe(0);
    await expectNext(rotation, singers[0]);
  });

  it('status changes invalidate scheduled turns and exclude ineligible singers', async () => {
    const { rotation, singers } = await seed();
    const scheduled = (await getNextTurn(rotation))!;
    await setSingerStatus(singers[0], 'banned');
    expect(await startTurn(scheduled.id)).toBeNull();
    await removeSingerFromRotation(rotation, singers[1]);
    await expectNext(rotation, singers[2]);
  });

  it('reordering, moving and inserting next change a reserved selection atomically', async () => {
    const { rotation, singers } = await seed();
    const first = (await getNextTurn(rotation))!;
    await reorderSingers(rotation, [singers[2], singers[2], 999n]);
    expect(await startTurn(first.id)).toBeNull();
    await expectNext(rotation, singers[2]);
    await moveSinger(rotation, singers[1], 0);
    await expectNext(rotation, singers[1]);
    const active = (await getNextTurn(rotation))!;
    await startTurn(active.id);
    await insertSingerNext(rotation, singers[0]);
    await completeTurn(active.id);
    await expectNext(rotation, singers[0]);
  });

  it.each(['primary_only', 'all_participants', 'group_as_singer'] as const)('updates duet statistics once for %s', async (duetPolicy) => {
    const { rotation, singers } = await seed('strict_round_robin', { duetPolicy }, 0);
    await addSongRequest({ singerId: singers[0], title: 'Duet', participantSingerIds: [singers[0], singers[1], singers[1]] });
    await addSongRequest({ singerId: singers[1], title: 'Solo' });
    const turn = await perform(rotation, singers[0]);
    await completeTurn(turn.id);
    expect((await query('SELECT total_songs_sung FROM singers ORDER BY id')).rows.map((row) => row.total_songs_sung))
      .toEqual([1, duetPolicy === 'all_participants' ? 1 : 0, 0]);
    expect((await getNextTurn(rotation))?.round_number).toBe(duetPolicy === 'all_participants' ? 2 : 1);
  });

  it.each<RotationType>(['strict_round_robin', 'least_recently_sung', 'signup_order', 'song_queue_only', 'hybrid'])(
    'applies emptySingerPolicy consistently in %s', async (type) => {
      const { rotation, singers } = await seed(type, { emptySingerPolicy: 'remove_from_rotation' }, 1);
      await perform(rotation, singers[0]);
      expect((await query('SELECT status FROM rotation_singers WHERE rotation_id = $1 AND singer_id = $2', [rotation, singers[0]])).rows[0].status).toBe('inactive');
    });

  it.each(['none', 'host_override_only', 'weighted', 'vip_next'] as const)('honors the %s priority policy', async (priorityPolicy) => {
    const { rotation, singers, songs } = await seed('hybrid', { priorityPolicy });
    await query('UPDATE song_requests SET priority = 10 WHERE id = $1', [songs[1][1]]);
    const enabled = priorityPolicy === 'weighted' || priorityPolicy === 'vip_next';
    const turn = (await expectNext(rotation, singers[enabled ? 1 : 0]))!;
    expect(turn.source).toBe(enabled ? 'priority' : 'automatic');
    if (enabled) expect(turn.song_request_id).toBe(songs[1][1]);
  });

  it('weighted priority respects rounds while vip_next may bypass an already-used turn', async () => {
    const { rotation, singers, songs } = await seed('strict_round_robin', { priorityPolicy: 'weighted', preventSameSingerBackToBack: false });
    await perform(rotation, singers[0]);
    await query('UPDATE song_requests SET priority = 10 WHERE id = $1', [songs[0][1]]);
    await expectNext(rotation, singers[1]);
    await updateRotationConfig(rotation, { priorityPolicy: 'vip_next' });
    await expectNext(rotation, singers[0], 1);
  });

  it('manual song selection requires an override even with eligible songs', async () => {
    const { rotation, singers, songs } = await seed('hybrid', { songSelectionPolicy: 'manual_host_selection' });
    await expectNext(rotation, null);
    await addManualOverride({ rotationId: rotation, singerId: singers[0], songRequestId: songs[0][1] });
    expect((await getNextTurn(rotation))?.song_request_id).toBe(songs[0][1]);
  });

  it('enforces queue limits without racing simultaneous submissions', async () => {
    const { rotation, singers } = await seed('hybrid', { allowSingerMultipleSongsInQueue: false }, 0);
    const submissions = await Promise.allSettled([1, 2].map((i) => addSongRequest({ singerId: singers[0], title: `Song${i}` })));
    expect(submissions.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    await updateRotationConfig(rotation, { allowSingerMultipleSongsInQueue: true, maxPendingSongsPerSinger: 2 });
    await addSongRequest({ singerId: singers[0], title: 'Second' });
    await expect(addSongRequest({ singerId: singers[0], title: 'Third' })).rejects.toThrow('at most 2');
  });

  it.each(['complete', 'skip'] as const)('does not consume a second override when the first active turn is %s', async (action) => {
    const { rotation, singers } = await seed('manual');
    const first = await addManualOverride({ rotationId: rotation, singerId: singers[0] });
    const second = await addManualOverride({ rotationId: rotation, singerId: singers[0] });
    const turn = (await getNextTurn(rotation))!;
    await startTurn(turn.id);
    await (action === 'complete' ? completeTurn(turn.id) : skipTurn(turn.id));
    expect((await query('SELECT id, status FROM manual_overrides ORDER BY id')).rows).toEqual([
      { id: String(first.id), status: 'consumed' }, { id: String(second.id), status: 'pending' },
    ]);
    await expectNext(rotation, singers[0]);
  });

  it('consumes a persistent explicit-song override after its song finishes', async () => {
    const { rotation, singers, songs } = await seed('manual');
    const override = await addManualOverride({
      rotationId: rotation, singerId: singers[0], songRequestId: songs[0][0], expiresAfterTurn: false,
    });
    await perform(rotation, singers[0]);
    expect((await query('SELECT status FROM manual_overrides WHERE id = $1', [override.id])).rows[0].status).toBe('consumed');
    await expectNext(rotation, null);
  });

  it('previews a scheduled song released by a changed join round without mutating the reservation', async () => {
    const { rotation, singers } = await seed('strict_round_robin', {}, 0);
    await addSongRequest({ singerId: singers[0], title: 'Only song' });
    const old = (await getNextTurn(rotation))!;
    await query('UPDATE rotation_singers SET current_round_joined = 3 WHERE rotation_id = $1 AND singer_id = $2', [rotation, singers[0]]);
    const preview = (await getRotationState(rotation))!.nextTurnPreview;
    expect(preview?.songRequestId).toBe(old.song_request_id);
    expect((await query('SELECT status FROM rotation_turns WHERE id = $1', [old.id])).rows[0].status).toBe('scheduled');
    const next = (await getNextTurn(rotation))!;
    expect(next.round_number).toBe(3);
    expect(next.song_request_id).toBe(preview?.songRequestId);
  });

  it('non-round-based modes remain playable after a strict next-round join', async () => {
    const { rotation, singers } = await seed('strict_round_robin', { newSingerPlacement: 'next_round' });
    await updateRotationConfig(rotation, { type: 'song_queue_only' });
    const turn = (await expectNext(rotation, singers[0], 1))!;
    expect(await startTurn(turn.id)).toMatchObject({ status: 'active' });
    expect(await completeTurn(turn.id)).toMatchObject({ status: 'completed' });
  });

  it('insert-next handles a singer currently positioned before the active singer', async () => {
    const { rotation, singers } = await seed();
    await addManualOverride({ rotationId: rotation, singerId: singers[1] });
    const active = (await getNextTurn(rotation))!;
    await startTurn(active.id);
    await insertSingerNext(rotation, singers[0]);
    expect((await query('SELECT singer_id FROM rotation_singers WHERE rotation_id = $1 ORDER BY position', [rotation])).rows.map((row) => BigInt(row.singer_id)))
      .toEqual([singers[1], singers[0], singers[2]]);
    await completeTurn(active.id);
    await expectNext(rotation, singers[0]);
  });

  it('invalid config updates preserve the reservation and previous config', async () => {
    const { rotation } = await seed();
    const turn = (await getNextTurn(rotation))!;
    await expect(updateRotationConfig(rotation, { type: 'wrong' as RotationType })).rejects.toThrow('type');
    await expect(updateRotationConfig(rotation, { maxPendingSongsPerSinger: -1 })).rejects.toThrow('positive integer');
    expect((await getRotation(rotation))?.config.type).toBe('strict_round_robin');
    expect((await getNextTurn(rotation))?.id).toBe(turn.id);
  });

  it.each<RotationType>([
    'strict_round_robin', 'least_recently_sung', 'signup_order', 'song_queue_only', 'manual', 'hybrid',
  ])('insert-next persists explicit host intent ahead of pending overrides in %s', async (type) => {
    const { rotation, singers } = await seed(type);
    await addManualOverride({ rotationId: rotation, singerId: singers[0] });
    await insertSingerNext(rotation, singers[2]);
    const turn = (await expectNext(rotation, singers[2]))!;
    expect(turn.source).toBe('manual_override');
    await startTurn(turn.id);
    await completeTurn(turn.id);
    await expectNext(rotation, singers[0]);
  });

  it.each<RotationType>(['strict_round_robin', 'least_recently_sung', 'signup_order', 'song_queue_only', 'manual'])(
    'hybrid reorders persist one-shot host intent for the %s base even with priority disabled', async (basePolicy) => {
      const { rotation, singers } = await seed('hybrid', { basePolicy, priorityPolicy: 'none' });
      await addManualOverride({ rotationId: rotation, singerId: singers[0] });
      const playing = (await getNextTurn(rotation))!;
      await startTurn(playing.id);
      await reorderSingers(rotation, [singers[2], singers[1]]);
      await reorderSingers(rotation, [singers[1], singers[2]]);
      for (let i = 0; i < 3; i++) {
        expect((await getNextTurn(rotation))?.id).toBe(playing.id);
        expect((await getRotationState(rotation))?.currentTurn?.id).toBe(playing.id);
      }
      expect((await query(
        `SELECT singer_id FROM manual_overrides WHERE status = 'pending' ORDER BY position`,
      )).rows.map((row) => BigInt(row.singer_id))).toEqual([singers[1], singers[2]]);
      await completeTurn(playing.id);
      await perform(rotation, singers[1]);
      await perform(rotation, singers[2]);
      expect((await query(`SELECT COUNT(*) AS c FROM manual_overrides WHERE status = 'pending'`)).rows[0].c).toBe('0');
    });
});
