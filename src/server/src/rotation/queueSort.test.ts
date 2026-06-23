import { describe, expect, it } from 'vitest';
import { computeStrictQueuedSongRound, sortQueuedRotationItems } from './queueSort.js';

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
});
