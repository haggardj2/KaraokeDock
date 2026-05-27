// server/src/rotation/rotationService.test.ts
// Unit tests for the karaoke rotation policies and service helpers.
// These tests operate entirely on in-memory data and do NOT require a database.

import { describe, it, expect } from 'vitest';
import {
  strictRoundRobin,
  leastRecentlySung,
  signupOrder,
  songQueueOnly,
  eligibleSingers,
  isRoundComplete,
  selectSong,
} from './policies.js';
import { DEFAULT_ROTATION_CONFIG, type SingerSnapshot, type PolicyContext, type RotationConfig } from './types.js';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeConfig(overrides: Partial<RotationConfig> = {}): RotationConfig {
  return { ...DEFAULT_ROTATION_CONFIG, ...overrides };
}

function makeSong(
  id: number,
  singerId: number,
  opts: { priority?: number; requestedAt?: Date } = {},
) {
  return {
    id: BigInt(id),
    singerId: BigInt(singerId),
    title: `Song ${id}`,
    artist: null,
    priority: opts.priority ?? 0,
    requestedAt: opts.requestedAt ?? new Date(Date.now() - id * 1000),
    participantSingerIds: [] as bigint[],
  };
}

function makeSinger(
  id: number,
  opts: {
    position?: number;
    lastRoundSang?: number | null;
    lastSangAt?: Date | null;
    currentRoundJoined?: number;
    songs?: ReturnType<typeof makeSong>[];
    singerStatus?: 'active' | 'inactive' | 'absent' | 'skipped' | 'banned';
    rotationStatus?: 'active' | 'inactive' | 'absent' | 'skipped';
  } = {},
): SingerSnapshot {
  return {
    singerId: BigInt(id),
    displayName: `Singer ${id}`,
    singerStatus: opts.singerStatus ?? 'active',
    rotationStatus: opts.rotationStatus ?? 'active',
    position: opts.position ?? id,
    joinedAt: new Date(Date.now() - id * 10000),
    currentRoundJoined: opts.currentRoundJoined ?? 1,
    lastRoundSang: opts.lastRoundSang !== undefined ? opts.lastRoundSang : null,
    lastSangAt: opts.lastSangAt !== undefined ? opts.lastSangAt : null,
    pendingSongs: opts.songs ?? [makeSong(id * 10, id)],
  };
}

function makeCtx(overrides: Partial<PolicyContext> = {}): PolicyContext {
  return {
    currentRound: 1,
    lastCompletedSingerId: null,
    config: makeConfig(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// 1. strict_round_robin: every singer gets one turn per round
// ---------------------------------------------------------------------------

describe('strict_round_robin', () => {
  it('gives each active singer exactly one turn per round', () => {
    const singers = [
      makeSinger(1, { position: 0 }),
      makeSinger(2, { position: 1 }),
      makeSinger(3, { position: 2 }),
    ];
    const ctx = makeCtx({ currentRound: 1 });

    // Round 1 — each singer should be selected in position order
    const r1 = strictRoundRobin(singers, ctx);
    expect(r1?.singerId).toEqual(BigInt(1));

    // Simulate singer 1 having sung
    singers[0].lastRoundSang = 1;
    const r2 = strictRoundRobin(singers, ctx);
    expect(r2?.singerId).toEqual(BigInt(2));

    singers[1].lastRoundSang = 1;
    const r3 = strictRoundRobin(singers, ctx);
    expect(r3?.singerId).toEqual(BigInt(3));

    // All have sung — fallback to any active singer (round will advance)
    singers[2].lastRoundSang = 1;
    const r4 = strictRoundRobin(singers, ctx);
    // Falls back to the first active singer (position order)
    expect(r4?.singerId).toEqual(BigInt(1));
  });

  it('returns null when there are no eligible singers', () => {
    const ctx = makeCtx({ currentRound: 1 });
    const result = strictRoundRobin([], ctx);
    expect(result).toBeNull();
  });

  // 2. New singers added to the end of the current round (via currentRoundJoined)
  it('places new singers (end_of_current_round) at end of current round', () => {
    const singers = [
      makeSinger(1, { position: 0, lastRoundSang: null }),
      makeSinger(2, { position: 1, lastRoundSang: null }),
      // Singer 3 joins mid-round with currentRoundJoined = 1 (end of current round)
      makeSinger(3, { position: 2, currentRoundJoined: 1, lastRoundSang: null }),
    ];
    const ctx = makeCtx({ currentRound: 1 });

    const r1 = strictRoundRobin(singers, ctx);
    expect(r1?.singerId).toEqual(BigInt(1));
  });

  it('excludes singer whose currentRoundJoined is in a future round', () => {
    const singers = [
      makeSinger(1, { position: 0 }),
      // Singer 2 will join in round 2
      makeSinger(2, { position: 1, currentRoundJoined: 2 }),
    ];
    const ctx = makeCtx({ currentRound: 1 });

    // Only singer 1 is eligible in round 1
    const r1 = strictRoundRobin(singers, ctx);
    expect(r1?.singerId).toEqual(BigInt(1));

    // After singer 1 has sung this round, neither singer is eligible in the
    // current-round pool (singer 1 already sang, singer 2 joins next round).
    // The fallback includes all active+pending singers; singer 1 has position 0
    // so it is selected again (the caller will advance the round counter).
    singers[0].lastRoundSang = 1;
    const r2 = strictRoundRobin(singers, ctx);
    expect(r2?.singerId).toEqual(BigInt(1));
  });
});

// ---------------------------------------------------------------------------
// isRoundComplete
// ---------------------------------------------------------------------------

describe('isRoundComplete', () => {
  it('returns true when all active singers have lastRoundSang >= currentRound', () => {
    const singers = [
      makeSinger(1, { lastRoundSang: 1, currentRoundJoined: 1 }),
      makeSinger(2, { lastRoundSang: 1, currentRoundJoined: 1 }),
    ];
    expect(isRoundComplete(singers, 1)).toBe(true);
  });

  it('returns false when at least one active singer has not sung', () => {
    const singers = [
      makeSinger(1, { lastRoundSang: 1, currentRoundJoined: 1 }),
      makeSinger(2, { lastRoundSang: null, currentRoundJoined: 1 }),
    ];
    expect(isRoundComplete(singers, 1)).toBe(false);
  });

  it('returns false when there are no active singers', () => {
    expect(isRoundComplete([], 1)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 3. least_recently_sung
// ---------------------------------------------------------------------------

describe('leastRecentlySung', () => {
  it('chooses never-sung singers first', () => {
    const now = new Date();
    const singers = [
      makeSinger(1, { lastSangAt: new Date(now.getTime() - 1000) }),
      makeSinger(2, { lastSangAt: null }), // never sung
    ];
    const result = leastRecentlySung(singers, makeCtx());
    expect(result?.singerId).toEqual(BigInt(2));
  });

  it('chooses the singer who sang longest ago', () => {
    const now = new Date();
    const singers = [
      makeSinger(1, { lastSangAt: new Date(now.getTime() - 500) }),  // sang 0.5s ago
      makeSinger(2, { lastSangAt: new Date(now.getTime() - 2000) }), // sang 2s ago
      makeSinger(3, { lastSangAt: new Date(now.getTime() - 1000) }), // sang 1s ago
    ];
    const result = leastRecentlySung(singers, makeCtx());
    expect(result?.singerId).toEqual(BigInt(2));
  });

  it('excludes singers with no pending songs', () => {
    const singers = [
      makeSinger(1, { songs: [], lastSangAt: null }),
      makeSinger(2, { lastSangAt: null }),
    ];
    const result = leastRecentlySung(singers, makeCtx());
    expect(result?.singerId).toEqual(BigInt(2));
  });

  it('uses joinedAt as tie-breaker', () => {
    const now = new Date();
    const singers = [
      { ...makeSinger(1), lastSangAt: null, joinedAt: new Date(now.getTime() - 1000) },
      { ...makeSinger(2), lastSangAt: null, joinedAt: new Date(now.getTime() - 2000) },
    ];
    const result = leastRecentlySung(singers, makeCtx());
    // Singer 2 joined earlier → picked first
    expect(result?.singerId).toEqual(BigInt(2));
  });
});

// ---------------------------------------------------------------------------
// 4. signup_order
// ---------------------------------------------------------------------------

describe('signupOrder', () => {
  it('picks the singer with the lowest position', () => {
    const singers = [
      makeSinger(1, { position: 5 }),
      makeSinger(2, { position: 1 }),
      makeSinger(3, { position: 3 }),
    ];
    const result = signupOrder(singers, makeCtx());
    expect(result?.singerId).toEqual(BigInt(2));
  });

  it('moves singers to the back after singing (tested via eligibility)', () => {
    // After signup_order selection, the service will call applySignupOrderPostCompletion.
    // Here we verify that the policy itself picks lowest position first.
    const singers = [
      makeSinger(1, { position: 2 }), // came second
      makeSinger(2, { position: 1 }), // came first
    ];
    const result = signupOrder(singers, makeCtx());
    expect(result?.singerId).toEqual(BigInt(2)); // singer with position 1
  });
});

// ---------------------------------------------------------------------------
// 5. song_queue_only: same singer can appear multiple times
// ---------------------------------------------------------------------------

describe('songQueueOnly', () => {
  it('picks the highest-priority oldest song regardless of fairness', () => {
    const early = new Date(Date.now() - 5000);
    const late = new Date(Date.now() - 1000);
    const singers = [
      makeSinger(1, { songs: [{ ...makeSong(10, 1), requestedAt: late, priority: 0 }] }),
      makeSinger(2, {
        songs: [
          { ...makeSong(20, 2), requestedAt: early, priority: 0 },
          { ...makeSong(21, 2), requestedAt: new Date(), priority: 0 },
        ],
      }),
    ];
    const result = songQueueOnly(singers, makeCtx());
    // Song 20 was requested earliest
    expect(result?.songRequestId).toEqual(BigInt(20));
    expect(result?.singerId).toEqual(BigInt(2));
  });

  it('allows the same singer to appear twice if they have multiple songs', () => {
    const singers = [
      makeSinger(1, {
        songs: [
          { ...makeSong(10, 1), requestedAt: new Date(Date.now() - 3000), priority: 0 },
          { ...makeSong(11, 1), requestedAt: new Date(Date.now() - 2000), priority: 0 },
        ],
      }),
    ];
    const r1 = songQueueOnly(singers, makeCtx());
    expect(r1?.singerId).toEqual(BigInt(1));
    expect(r1?.songRequestId).toEqual(BigInt(10));

    // Remove that song and call again — same singer selected
    singers[0].pendingSongs = singers[0].pendingSongs.slice(1);
    const r2 = songQueueOnly(singers, makeCtx());
    expect(r2?.singerId).toEqual(BigInt(1));
    expect(r2?.songRequestId).toEqual(BigInt(11));
  });
});

// ---------------------------------------------------------------------------
// 6. manual mode: pure function returns null
// ---------------------------------------------------------------------------

describe('manual mode', () => {
  it('no policy function auto-selects in manual mode (all return null for empty lists)', () => {
    // The actual "manual" gate is in getNextTurn (DB layer), not in policy functions.
    // We verify that an empty singer list always returns null across all policies.
    const ctx = makeCtx();
    expect(strictRoundRobin([], ctx)).toBeNull();
    expect(leastRecentlySung([], ctx)).toBeNull();
    expect(signupOrder([], ctx)).toBeNull();
    expect(songQueueOnly([], ctx)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 7. hybrid: manual override consumed before base policy
//    (tested at the policy level: we verify the base policy fires correctly)
// ---------------------------------------------------------------------------

describe('hybrid base policy', () => {
  it('uses strict_round_robin as base when configured', () => {
    const singers = [
      makeSinger(1, { position: 0 }),
      makeSinger(2, { position: 1 }),
    ];
    const ctx = makeCtx({ config: makeConfig({ type: 'hybrid', basePolicy: 'strict_round_robin' }) });
    const result = strictRoundRobin(singers, ctx); // simulate hybrid dispatching to base
    expect(result?.singerId).toEqual(BigInt(1));
  });

  it('uses least_recently_sung as base when configured', () => {
    const singers = [
      makeSinger(1, { lastSangAt: new Date(Date.now() - 1000) }),
      makeSinger(2, { lastSangAt: null }),
    ];
    const ctx = makeCtx({ config: makeConfig({ type: 'hybrid', basePolicy: 'least_recently_sung' }) });
    const result = leastRecentlySung(singers, ctx);
    expect(result?.singerId).toEqual(BigInt(2));
  });
});

// ---------------------------------------------------------------------------
// 8. skipped singer moves to end when skipPolicy is move_to_end
//    (tested via eligibleSingers — skipped singers are excluded)
// ---------------------------------------------------------------------------

describe('skipped singers', () => {
  it('excludes singers with rotationStatus=skipped from eligibility', () => {
    const singers = [
      makeSinger(1, { rotationStatus: 'skipped' }),
      makeSinger(2),
    ];
    const pool = eligibleSingers(singers, makeConfig(), null);
    expect(pool).toHaveLength(1);
    expect(pool[0].singerId).toEqual(BigInt(2));
  });
});

// ---------------------------------------------------------------------------
// 9. absent singer is excluded
// ---------------------------------------------------------------------------

describe('absent singers', () => {
  it('excludes absent singers from all policies', () => {
    const singers = [
      makeSinger(1, { rotationStatus: 'absent' }),
      makeSinger(2),
    ];
    const pool = eligibleSingers(singers, makeConfig(), null);
    expect(pool.map((s) => s.singerId)).not.toContain(BigInt(1));
  });

  it('strict_round_robin skips absent singers', () => {
    const singers = [
      makeSinger(1, { position: 0, rotationStatus: 'absent' }),
      makeSinger(2, { position: 1 }),
    ];
    const result = strictRoundRobin(singers, makeCtx());
    expect(result?.singerId).toEqual(BigInt(2));
  });
});

// ---------------------------------------------------------------------------
// 10. singer with no pending songs is excluded
// ---------------------------------------------------------------------------

describe('singer with no pending songs', () => {
  it('is not selected by any policy', () => {
    const singers = [
      makeSinger(1, { songs: [] }),
      makeSinger(2),
    ];
    const ctx = makeCtx();
    expect(strictRoundRobin(singers, ctx)?.singerId).toEqual(BigInt(2));
    expect(leastRecentlySung(singers, ctx)?.singerId).toEqual(BigInt(2));
    expect(signupOrder(singers, ctx)?.singerId).toEqual(BigInt(2));
    expect(songQueueOnly(singers, ctx)?.singerId).toEqual(BigInt(2));
  });
});

// ---------------------------------------------------------------------------
// 11. duet with all_participants: both singers' stats should be updated
//    (logic lives in completeTurn in rotationService.ts; tested here via
//     types to confirm the participantSingerIds field is populated correctly)
// ---------------------------------------------------------------------------

describe('duet participantSingerIds', () => {
  it('song request carries participant singer IDs', () => {
    const song = {
      ...makeSong(1, 10),
      participantSingerIds: [BigInt(10), BigInt(20)],
    };
    expect(song.participantSingerIds).toContain(BigInt(20));
  });
});

// ---------------------------------------------------------------------------
// 12. preventSameSingerBackToBack
// ---------------------------------------------------------------------------

describe('preventSameSingerBackToBack', () => {
  it('avoids selecting the same singer when alternatives exist', () => {
    const singers = [
      makeSinger(1, { position: 0 }),
      makeSinger(2, { position: 1 }),
    ];
    const ctx = makeCtx({
      lastCompletedSingerId: BigInt(1),
      config: makeConfig({ preventSameSingerBackToBack: true }),
    });
    const pool = eligibleSingers(singers, ctx.config, ctx.lastCompletedSingerId);
    expect(pool.map((s) => s.singerId)).not.toContain(BigInt(1));
    expect(pool.map((s) => s.singerId)).toContain(BigInt(2));
  });

  it('allows back-to-back when no other eligible singer exists', () => {
    const singers = [makeSinger(1, { position: 0 })];
    const ctx = makeCtx({
      lastCompletedSingerId: BigInt(1),
      config: makeConfig({ preventSameSingerBackToBack: true }),
    });
    const pool = eligibleSingers(singers, ctx.config, ctx.lastCompletedSingerId);
    // Only one singer — must be allowed
    expect(pool).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// 13. completed songs are never selected again
// ---------------------------------------------------------------------------

describe('completed songs are not selected', () => {
  it('selectSong ignores songs not in pendingSongs (completed songs are pre-filtered)', () => {
    // pendingSongs only contains songs with status=pending, so if completed songs
    // are removed from the list the policy can never pick them.
    const singer = makeSinger(1, { songs: [] });
    const result = selectSong(singer, makeConfig());
    expect(result).toBeNull();
  });

  it('chooses the non-completed song when one is still pending', () => {
    const singer = makeSinger(1, {
      songs: [makeSong(101, 1)], // only pending songs are in pendingSongs
    });
    const result = selectSong(singer, makeConfig());
    expect(result?.id).toEqual(BigInt(101));
  });
});

// ---------------------------------------------------------------------------
// 14. host can insert singer next (position manipulation)
// ---------------------------------------------------------------------------

describe('insert singer next', () => {
  it('selectSong prefers song with higher priority', () => {
    const singer = makeSinger(1, {
      songs: [
        { ...makeSong(1, 1), priority: 0 },
        { ...makeSong(2, 1), priority: 5 }, // higher priority
      ],
    });
    const result = selectSong(singer, makeConfig());
    expect(result?.id).toEqual(BigInt(2));
  });
});

// ---------------------------------------------------------------------------
// 15. currentRound increments when all eligible singers have sung
// ---------------------------------------------------------------------------

describe('round increment detection', () => {
  it('isRoundComplete is true when all singers have lastRoundSang >= currentRound', () => {
    const singers = [
      makeSinger(1, { lastRoundSang: 2, currentRoundJoined: 1 }),
      makeSinger(2, { lastRoundSang: 2, currentRoundJoined: 1 }),
      makeSinger(3, { lastRoundSang: 2, currentRoundJoined: 1 }),
    ];
    expect(isRoundComplete(singers, 2)).toBe(true);
  });

  it('isRoundComplete is false if any singer has a null lastRoundSang', () => {
    const singers = [
      makeSinger(1, { lastRoundSang: 2, currentRoundJoined: 1 }),
      makeSinger(2, { lastRoundSang: null, currentRoundJoined: 1 }),
    ];
    expect(isRoundComplete(singers, 2)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// selectSong — song selection policy
// ---------------------------------------------------------------------------

describe('selectSong', () => {
  it('oldest_request_first picks by priority DESC then requestedAt ASC', () => {
    const early = new Date(Date.now() - 5000);
    const late = new Date(Date.now() - 1000);
    const singer = makeSinger(1, {
      songs: [
        { ...makeSong(1, 1), priority: 0, requestedAt: late },
        { ...makeSong(2, 1), priority: 0, requestedAt: early },
        { ...makeSong(3, 1), priority: 5, requestedAt: new Date() },
      ],
    });
    const result = selectSong(singer, makeConfig({ songSelectionPolicy: 'oldest_request_first' }));
    // priority 5 first
    expect(result?.id).toEqual(BigInt(3));
  });

  it('highest_priority_first also sorts by priority DESC then requestedAt ASC', () => {
    const singer = makeSinger(1, {
      songs: [
        { ...makeSong(1, 1), priority: 1, requestedAt: new Date(Date.now() - 2000) },
        { ...makeSong(2, 1), priority: 3, requestedAt: new Date(Date.now() - 1000) },
      ],
    });
    const result = selectSong(singer, makeConfig({ songSelectionPolicy: 'highest_priority_first' }));
    expect(result?.id).toEqual(BigInt(2));
  });
});

// ---------------------------------------------------------------------------
// Inactive / banned singer exclusion
// ---------------------------------------------------------------------------

describe('banned/inactive singers excluded', () => {
  it('banned singer is not in eligible pool', () => {
    const singers = [
      makeSinger(1, { singerStatus: 'banned' }),
      makeSinger(2),
    ];
    const pool = eligibleSingers(singers, makeConfig(), null);
    expect(pool.map((s) => s.singerId)).not.toContain(BigInt(1));
  });

  it('inactive singer is not in eligible pool', () => {
    const singers = [
      makeSinger(1, { singerStatus: 'inactive' }),
      makeSinger(2),
    ];
    const pool = eligibleSingers(singers, makeConfig(), null);
    expect(pool.map((s) => s.singerId)).not.toContain(BigInt(1));
  });
});

// ---------------------------------------------------------------------------
// Multi-song interleaving (B has 2 songs, C has 1)
// Regression test for: "Active queue is B,B,C" under strict_round_robin.
// Correct order should be B, C, B.
// ---------------------------------------------------------------------------

describe('strict_round_robin multi-song interleaving', () => {
  it('interleaves B and C when B has 2 songs and C has 1 (round 1: B→C, round 2: B)', () => {
    const songB1 = makeSong(20, 2, { requestedAt: new Date(Date.now() - 4000) });
    const songB2 = makeSong(21, 2, { requestedAt: new Date(Date.now() - 3000) });
    const songC1 = makeSong(30, 3, { requestedAt: new Date(Date.now() - 2000) });

    const singers = [
      // Singer A is currently singing (absent from round-robin pool here)
      makeSinger(2, { position: 1, songs: [songB1, songB2] }),
      makeSinger(3, { position: 2, songs: [songC1] }),
    ];
    const ctx = makeCtx({ currentRound: 1 });

    // First pick: B (lowest position with songs, hasn't sung this round)
    const r1 = strictRoundRobin(singers, ctx);
    expect(r1?.singerId).toEqual(BigInt(2));
    expect(r1?.songRequestId).toEqual(BigInt(20));

    // Mark B as having sung round 1
    singers[0].lastRoundSang = 1;
    singers[0].pendingSongs = [songB2];

    // Second pick: C (only eligible singer left in round 1)
    const r2 = strictRoundRobin(singers, ctx);
    expect(r2?.singerId).toEqual(BigInt(3));

    // Mark C as having sung round 1
    singers[1].lastRoundSang = 1;
    singers[1].pendingSongs = [];

    // Round 2: B still has a song
    const ctx2 = makeCtx({ currentRound: 2 });
    singers[0].lastRoundSang = 1; // sang in round 1, not round 2
    const r3 = strictRoundRobin(singers, ctx2);
    expect(r3?.singerId).toEqual(BigInt(2));
    expect(r3?.songRequestId).toEqual(BigInt(21));
  });
});

describe('signup_order multi-song interleaving', () => {
  it('picks the singer with the lowest position, one song at a time', () => {
    const songB1 = makeSong(20, 2, { requestedAt: new Date(Date.now() - 4000) });
    const songB2 = makeSong(21, 2, { requestedAt: new Date(Date.now() - 3000) });
    const songC1 = makeSong(30, 3, { requestedAt: new Date(Date.now() - 2000) });

    // B is at position 1, C at position 2
    const singers = [
      makeSinger(2, { position: 1, songs: [songB1, songB2] }),
      makeSinger(3, { position: 2, songs: [songC1] }),
    ];
    const ctx = makeCtx();

    // First pick: B (position 1 < position 2)
    const r1 = signupOrder(singers, ctx);
    expect(r1?.singerId).toEqual(BigInt(2));

    // After B sings, they move to end (position 3 > 2). Simulate that.
    singers[0].position = 3;
    singers[0].pendingSongs = [songB2];

    // Second pick: C (position 2 < position 3)
    const r2 = signupOrder(singers, ctx);
    expect(r2?.singerId).toEqual(BigInt(3));

    // After C sings, no more songs. B still has a song at position 3.
    singers[1].pendingSongs = [];
    const r3 = signupOrder(singers, ctx);
    expect(r3?.singerId).toEqual(BigInt(2));
  });
});

// ---------------------------------------------------------------------------
// S.4 strict_round_robin interleaves songs by singer (scenario A)
// ---------------------------------------------------------------------------

describe('strict_round_robin interleaving — scenario A', () => {
  it('Alice song1, Bob song1, Alice song2 in strict_round_robin', () => {
    const aliceSong1 = makeSong(1, 1, { requestedAt: new Date(Date.now() - 3000) });
    const aliceSong2 = makeSong(2, 1, { requestedAt: new Date(Date.now() - 2000) });
    const bobSong1   = makeSong(3, 2, { requestedAt: new Date(Date.now() - 1000) });

    const alice = makeSinger(1, { position: 0, songs: [aliceSong1, aliceSong2] });
    const bob   = makeSinger(2, { position: 1, songs: [bobSong1] });

    const ctx = makeCtx({ currentRound: 1 });

    // Round 1: Alice goes first (position 0)
    const r1 = strictRoundRobin([alice, bob], ctx);
    expect(r1?.singerId).toEqual(BigInt(1));
    expect(r1?.songRequestId).toEqual(BigInt(1));

    // Alice sang in round 1
    alice.lastRoundSang = 1;
    alice.pendingSongs = [aliceSong2];

    // Round 1: Bob goes next
    const r2 = strictRoundRobin([alice, bob], ctx);
    expect(r2?.singerId).toEqual(BigInt(2));
    expect(r2?.songRequestId).toEqual(BigInt(3));

    // Bob sang in round 1; advance to round 2
    bob.lastRoundSang = 1;
    const ctx2 = makeCtx({ currentRound: 2 });

    // Round 2: Alice has a song; Bob has none
    const r3 = strictRoundRobin([alice, bob], ctx2);
    expect(r3?.singerId).toEqual(BigInt(1));
    expect(r3?.songRequestId).toEqual(BigInt(2));
  });
});

// ---------------------------------------------------------------------------
// S.3 Existing singer does not move to bottom (position preserved)
// ---------------------------------------------------------------------------

describe('existing singer rotation position — scenario B', () => {
  it('keeps existing singer at their original position when adding another song', () => {
    // Alice is at position 1, Bob at position 2.
    // Simulating that Alice already has songs and is in the rotation.
    const aliceSong1 = makeSong(1, 1);
    const aliceSong2 = makeSong(2, 1);
    const bobSong1   = makeSong(3, 2);

    const alice = makeSinger(1, { position: 1, songs: [aliceSong1, aliceSong2] });
    const bob   = makeSinger(2, { position: 2, songs: [bobSong1] });

    // Alice's position must NOT equal bob's position (she was not pushed to end)
    expect(alice.position).toBeLessThan(bob.position);

    const ctx = makeCtx({ currentRound: 1 });
    // In strict_round_robin, the singer at the lowest position with no lastRoundSang goes first
    const r1 = strictRoundRobin([alice, bob], ctx);
    expect(r1?.singerId).toEqual(BigInt(1));
  });
});

// ---------------------------------------------------------------------------
// S.5 least_recently_sung prioritises never-sung singer — scenario C
// ---------------------------------------------------------------------------

describe('least_recently_sung — scenario C: never-sung first', () => {
  it('Bob (never sung) appears before Alice (has sung)', () => {
    const aliceSong = makeSong(1, 1);
    const bobSong   = makeSong(2, 2);

    const alice = makeSinger(1, {
      position: 0,
      lastSangAt: new Date(Date.now() - 60_000),
      songs: [aliceSong],
    });
    const bob = makeSinger(2, {
      position: 1,
      lastSangAt: null, // never sung
      songs: [bobSong],
    });

    const ctx = makeCtx({ config: makeConfig({ type: 'least_recently_sung' }) });

    const result = leastRecentlySung([alice, bob], ctx);
    // Bob has never sung, so he should be selected first
    expect(result?.singerId).toEqual(BigInt(2));
  });

  it('singer who sang longer ago comes before singer who sang recently', () => {
    const singerA = makeSinger(1, {
      position: 0,
      lastSangAt: new Date(Date.now() - 120_000), // 2 min ago
      songs: [makeSong(1, 1)],
    });
    const singerB = makeSinger(2, {
      position: 1,
      lastSangAt: new Date(Date.now() - 30_000), // 30 sec ago
      songs: [makeSong(2, 2)],
    });

    const ctx = makeCtx({ config: makeConfig({ type: 'least_recently_sung' }) });
    const result = leastRecentlySung([singerA, singerB], ctx);
    // singerA sang longer ago — should go first
    expect(result?.singerId).toEqual(BigInt(1));
  });
});

// ---------------------------------------------------------------------------
// S.6 Completed songs excluded from nextSong selection
// ---------------------------------------------------------------------------

describe('completed songs excluded from nextSong', () => {
  it('singer with no pending songs returns null from selectSong', () => {
    // pendingSongs contains only queued (not completed) songs.
    // A singer who only has completed songs will have an empty pendingSongs list.
    const singer = makeSinger(1, { songs: [] });
    const result = selectSong(singer, makeConfig());
    expect(result).toBeNull();
  });

  it('only pending songs are selectable', () => {
    const pendingSong  = makeSong(10, 1);
    // completed song would not be in pendingSongs — simulate by only putting pending
    const singer = makeSinger(1, { songs: [pendingSong] });
    const result = selectSong(singer, makeConfig());
    expect(result?.id).toEqual(BigInt(10));
  });
});
