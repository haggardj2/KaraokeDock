import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { QueueSinger } from './queueState.js';
import { compareQueueSingersForDisplay, getQueueState, getSingerHistory } from './queueState.js';
import { query } from './db.js';

vi.mock('./db.js', () => ({ query: vi.fn() }));
beforeEach(() => vi.mocked(query).mockReset());

describe('queue and history crop metadata', () => {
  const crop = { x: 10, y: 20, width: 70, height: 60 };
  const singerRow = {
    id: '9', display_name: 'Singer', status: 'active', profile_image_source: 'oidc',
    profile_image_url: 'https://provider.example/original', profile_image_crop: crop,
  };

  it('includes OIDC avatar crop in grouped queue singers', async () => {
    vi.mocked(query)
      .mockResolvedValueOnce({ rows: [] } as any)
      .mockResolvedValueOnce({ rows: [{ id: 42, track_id: 1, singer_id: '9', status: 'queued', position: 1 }] } as any)
      .mockResolvedValueOnce({ rows: [singerRow] } as any);
    const state = await getQueueState();
    expect(state.queueOrder[0].profile).toMatchObject({ imageUrl: singerRow.profile_image_url, crop });
    expect(vi.mocked(query).mock.calls[2][0]).toContain('s.profile_image_crop');
  });

  it('includes original provider image and crop in singer history', async () => {
    vi.mocked(query)
      .mockResolvedValueOnce({ rows: [singerRow] } as any)
      .mockResolvedValueOnce({ rows: [] } as any);
    expect((await getSingerHistory(9n))?.singer.profile).toMatchObject({ imageUrl: singerRow.profile_image_url, crop });
    expect(vi.mocked(query).mock.calls[0][0]).toContain('profile_image_crop');
  });

  it.each(['inactive', 'absent'])('exposes %s rotation membership to Host controls', async (rotationStatus) => {
    vi.mocked(query)
      .mockResolvedValueOnce({ rows: [{ id: '1', type: 'strict_round_robin', current_round: 1 }] } as any)
      .mockResolvedValueOnce({ rows: [{ id: 42, track_id: 1, singer_id: '9', status: 'queued', position: 1 }] } as any)
      .mockResolvedValueOnce({ rows: [] } as any)
      .mockResolvedValueOnce({ rows: [{ ...singerRow, rotation_status: rotationStatus }] } as any);
    expect((await getQueueState()).queueOrder[0].status).toBe(rotationStatus);
  });
});

function makeSinger(overrides: Partial<QueueSinger> = {}): QueueSinger {
  return {
    singerId: overrides.singerId ?? '1',
    displayName: overrides.displayName ?? 'Singer',
    status: overrides.status ?? 'active',
    rotationPosition: overrides.rotationPosition ?? null,
    lastSangAt: overrides.lastSangAt ?? null,
    totalSongsSung: overrides.totalSongsSung ?? 0,
    nextSong: overrides.nextSong ?? null,
    queuedSongs: overrides.queuedSongs ?? [],
    completedSongs: overrides.completedSongs ?? [],
    completedSongsCount: overrides.completedSongsCount ?? 0,
    queuedSongsCount: overrides.queuedSongsCount ?? 0,
    profile: overrides.profile ?? {
      imageSource: null,
      imageUrl: null,
      focusX: 50,
      focusY: 50,
      updatedAt: null,
    },
  };
}

describe('compareQueueSingersForDisplay', () => {
  it('keeps the currently playing singer at the top', () => {
    const playingSinger = makeSinger({
      singerId: '1',
      queuedSongs: [{
        queueId: 11,
        trackId: 101,
        title: 'Now Playing',
        artist: 'Artist',
        status: 'playing',
        position: 4,
        requestedAt: null,
        startedAt: null,
        completedAt: null,
        keyAdjustment: 0,
        durationMs: null,
        discId: null,
        requestedBy: 'Singer',
      }],
      nextSong: null,
      rotationPosition: 4,
    });
    const queuedSinger = makeSinger({
      singerId: '2',
      nextSong: {
        queueId: 12,
        trackId: 102,
        title: 'Queued',
        artist: 'Artist',
        status: 'queued',
        position: 1,
        requestedAt: null,
        startedAt: null,
        completedAt: null,
        keyAdjustment: 0,
        durationMs: null,
        discId: null,
        requestedBy: 'Singer',
      },
      queuedSongs: [],
      rotationPosition: 1,
    });

    const sorted = [queuedSinger, playingSinger].sort(compareQueueSingersForDisplay);
    expect(sorted.map((singer) => singer.singerId)).toEqual(['1', '2']);
  });

  it('sorts queued singers by their next queued song position', () => {
    const laterRotationEarlierQueue = makeSinger({
      singerId: '1',
      displayName: 'B',
      rotationPosition: 5,
      nextSong: {
        queueId: 21,
        trackId: 201,
        title: 'Earlier Queue Slot',
        artist: 'Artist',
        status: 'queued',
        position: 2,
        requestedAt: null,
        startedAt: null,
        completedAt: null,
        keyAdjustment: 0,
        durationMs: null,
        discId: null,
        requestedBy: 'Singer',
      },
    });
    const earlierRotationLaterQueue = makeSinger({
      singerId: '2',
      displayName: 'A',
      rotationPosition: 1,
      nextSong: {
        queueId: 22,
        trackId: 202,
        title: 'Later Queue Slot',
        artist: 'Artist',
        status: 'queued',
        position: 5,
        requestedAt: null,
        startedAt: null,
        completedAt: null,
        keyAdjustment: 0,
        durationMs: null,
        discId: null,
        requestedBy: 'Singer',
      },
    });

    const sorted = [earlierRotationLaterQueue, laterRotationEarlierQueue].sort(compareQueueSingersForDisplay);
    expect(sorted.map((singer) => singer.singerId)).toEqual(['1', '2']);
  });

  it('places singers without queued songs after singers with queued songs', () => {
    const waitingSinger = makeSinger({
      singerId: '1',
      rotationPosition: 1,
      nextSong: null,
    });
    const queuedSinger = makeSinger({
      singerId: '2',
      rotationPosition: 2,
      nextSong: {
        queueId: 31,
        trackId: 301,
        title: 'Queued Song',
        artist: 'Artist',
        status: 'queued',
        position: 7,
        requestedAt: null,
        startedAt: null,
        completedAt: null,
        keyAdjustment: 0,
        durationMs: null,
        discId: null,
        requestedBy: 'Singer',
      },
    });

    const sorted = [waitingSinger, queuedSinger].sort(compareQueueSingersForDisplay);
    expect(sorted.map((singer) => singer.singerId)).toEqual(['2', '1']);
  });
});
