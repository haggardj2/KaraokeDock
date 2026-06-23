import { describe, expect, it } from 'vitest';
import type { QueueSinger } from './queueState.js';
import { compareQueueSingersForDisplay } from './queueState.js';

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
      },
    });

    const sorted = [waitingSinger, queuedSinger].sort(compareQueueSingersForDisplay);
    expect(sorted.map((singer) => singer.singerId)).toEqual(['2', '1']);
  });
});
