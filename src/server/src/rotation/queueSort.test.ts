import { describe, expect, it } from 'vitest';
import { computeStrictQueuedSongRound, sortQueuedRotationItems, type QueuedRotationSortInput, type QueueSortBasePolicy } from './queueSort.js';

function song(id: number, singerKey: string, extra: Partial<QueuedRotationSortInput> = {}): QueuedRotationSortInput {
  return {
    id, singerKey, requestedAt: new Date(id * 1000), origPos: id,
    rotPos: singerKey.charCodeAt(0), lastSangAt: null,
    currentRoundJoined: 1, lastRoundSang: null, isCurrentlyPlaying: false, songIndex: 0,
    ...extra,
  };
}

describe('queue rotation sorting', () => {
  it('keeps strict round robin based on the active rotation round instead of historical queue totals', () => {
    const sorted = sortQueuedRotationItems(
      [
        {
          id: 501,
          origPos: 20,
          rotPos: 4,
          lastSangAt: null,
          currentRoundJoined: 1,
          lastRoundSang: null,
          isCurrentlyPlaying: false,
          songIndex: 0,
        },
        {
          id: 401,
          origPos: 21,
          rotPos: 3,
          lastSangAt: null,
          currentRoundJoined: 1,
          lastRoundSang: null,
          isCurrentlyPlaying: false,
          songIndex: 0,
        },
        {
          id: 502,
          origPos: 22,
          rotPos: 4,
          lastSangAt: null,
          currentRoundJoined: 1,
          lastRoundSang: null,
          isCurrentlyPlaying: false,
          songIndex: 1,
        },
        {
          id: 201,
          origPos: 23,
          rotPos: 1,
          lastSangAt: null,
          currentRoundJoined: 1,
          lastRoundSang: null,
          isCurrentlyPlaying: false,
          songIndex: 0,
        },
      ],
      { currentRound: 2, basePolicy: 'strict_round_robin' }
    );

    expect(sorted.map((item) => item.id)).toEqual([201, 401, 501, 502]);
    expect(sorted.map((item) => item.round)).toEqual([2, 2, 2, 3]);
  });

  it('treats the currently playing singer as already used for this strict round', () => {
    expect(
      computeStrictQueuedSongRound({
        currentRound: 3,
        currentRoundJoined: 1,
        lastRoundSang: 2,
        isCurrentlyPlaying: true,
        songIndex: 0,
      })
    ).toBe(4);
  });

  it('pushes singers who already sang this round into the next strict round', () => {
    expect(
      computeStrictQueuedSongRound({
        currentRound: 4,
        currentRoundJoined: 1,
        lastRoundSang: 4,
        isCurrentlyPlaying: false,
        songIndex: 0,
      })
    ).toBe(5);
  });

  it('does not schedule a future-join singer before their join round', () => {
    expect(
      computeStrictQueuedSongRound({
        currentRound: 2,
        currentRoundJoined: 4,
        lastRoundSang: null,
        isCurrentlyPlaying: false,
        songIndex: 0,
      })
    ).toBe(4);
  });

  it.each<QueueSortBasePolicy>(['strict_round_robin', 'least_recently_sung', 'signup_order', 'song_queue_only', 'manual'])(
    'projects every song without mutating the input in %s', (basePolicy) => {
      const input = [song(1, 'A'), song(2, 'A'), song(3, 'B'), song(4, 'B')];
      const before = JSON.stringify(input);
      const sorted = sortQueuedRotationItems(input, { currentRound: 1, basePolicy });
      expect(sorted.map((item) => item.id)).toEqual(
        ['song_queue_only', 'manual'].includes(basePolicy) ? [1, 2, 3, 4] : [1, 3, 2, 4],
      );
      expect(JSON.stringify(input)).toBe(before);
    },
  );

  it.each<QueueSortBasePolicy>(['least_recently_sung', 'signup_order'])('ignores old join rounds in %s', (basePolicy) => {
    const input = [song(1, 'A', { currentRoundJoined: 20 }), song(2, 'A', { currentRoundJoined: 20 }), song(3, 'B')];
    expect(sortQueuedRotationItems(input, { currentRound: 20, basePolicy }).map((item) => item.id)).toEqual([1, 3, 2]);
  });

  it('orders least-recently-sung by waiting time before mutable queue positions', () => {
    const input = [song(1, 'A', { lastSangAt: new Date(1000) }), song(2, 'B'), song(3, 'C', { lastSangAt: new Date(500) })];
    expect(sortQueuedRotationItems(input, { currentRound: 4, basePolicy: 'least_recently_sung' }).map((item) => item.id)).toEqual([2, 3, 1]);
  });

  it('restores FIFO chronology after a previous policy changed the positions', () => {
    const input = [song(4, 'B', { origPos: 0 }), song(1, 'A', { origPos: 1 }), song(3, 'B', { origPos: 2 }), song(2, 'A', { origPos: 3 })];
    expect(sortQueuedRotationItems(input, { currentRound: 1, basePolicy: 'song_queue_only' }).map((item) => item.id)).toEqual([1, 2, 3, 4]);
    expect(sortQueuedRotationItems(input, { currentRound: 1, basePolicy: 'manual' }).map((item) => item.id)).toEqual([4, 1, 3, 2]);
  });

  it.each([true, false])('respects preventSameSingerBackToBack=%s across a round boundary', (preventSameSingerBackToBack) => {
    const input = [song(1, 'A'), song(2, 'A'), song(3, 'B', { currentRoundJoined: 2 })];
    const result = sortQueuedRotationItems(input, { currentRound: 1, basePolicy: 'strict_round_robin', preventSameSingerBackToBack });
    expect(result.map((item) => item.id)).toEqual(preventSameSingerBackToBack ? [1, 3, 2] : [1, 2, 3]);
  });

  it.each<QueueSortBasePolicy>(['strict_round_robin', 'least_recently_sung', 'signup_order'])('treats the playing singer as already served in %s previews', (basePolicy) => {
    const input = [song(1, 'A', { isCurrentlyPlaying: true }), song(2, 'B')];
    expect(sortQueuedRotationItems(input, { currentRound: 1, basePolicy }).map((item) => item.id)).toEqual([2, 1]);
  });

  it('honors explicit overrides without duplicating a song or skipping the rest of a strict round', () => {
    const input = [song(1, 'A'), song(2, 'B', { lastRoundSang: 1 }), song(3, 'C')];
    const result = sortQueuedRotationItems(input, { currentRound: 1, basePolicy: 'strict_round_robin', overrideIds: [999, 2, 2] });
    expect(result.map((item) => item.id)).toEqual([2, 1, 3]);
    expect(result.map((item) => item.round)).toEqual([1, 1, 1]);
  });

  it('projects round completion between consecutive overrides for future-join singers', () => {
    const input = [song(1, 'A'), song(2, 'A'), song(3, 'B'), song(4, 'B'), song(5, 'C')]
      .map((item) => ({ ...item, currentRoundJoined: 2 }));
    const result = sortQueuedRotationItems(input, {
      currentRound: 1, basePolicy: 'strict_round_robin', overrideIds: [1, 3], preventSameSingerBackToBack: true,
    });
    expect(result.map((item) => item.id)).toEqual([1, 3, 2, 5, 4]);
    expect(result.map((item) => item.round)).toEqual([1, 2, 2, 2, 3]);
  });
});
