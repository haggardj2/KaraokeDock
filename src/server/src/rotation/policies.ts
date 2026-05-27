// server/src/rotation/policies.ts
// Pure functions implementing each rotation policy.
// These functions operate entirely on in-memory snapshots so they can be
// unit-tested without a database connection.

import type {
  SingerSnapshot,
  SongRequestSnapshot,
  PolicyContext,
  PolicyResult,
  RotationConfig,
} from './types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Return the singers who are eligible to be chosen by any automatic policy. */
export function eligibleSingers(
  singers: SingerSnapshot[],
  config: RotationConfig,
  lastCompletedSingerId: bigint | null,
): SingerSnapshot[] {
  let pool = singers.filter(
    (s) =>
      // Must be active in both the global singer table and the rotation
      s.singerStatus === 'active' &&
      s.rotationStatus === 'active' &&
      // Must have at least one pending song
      s.pendingSongs.length > 0,
  );

  // preventSameSingerBackToBack: exclude last singer when other options exist
  if (config.preventSameSingerBackToBack && lastCompletedSingerId !== null && pool.length > 1) {
    const filtered = pool.filter((s) => s.singerId !== lastCompletedSingerId);
    if (filtered.length > 0) pool = filtered;
  }

  return pool;
}

/**
 * Choose the next song for a singer according to songSelectionPolicy.
 * Default (oldest_request_first): sort by priority DESC, then requestedAt ASC.
 */
export function selectSong(
  singer: SingerSnapshot,
  config: RotationConfig,
): SongRequestSnapshot | null {
  if (singer.pendingSongs.length === 0) return null;

  const policy = config.songSelectionPolicy;

  if (policy === 'highest_priority_first') {
    // Highest priority first, then oldest
    const sorted = [...singer.pendingSongs].sort(
      (a, b) => b.priority - a.priority || a.requestedAt.getTime() - b.requestedAt.getTime(),
    );
    return sorted[0];
  }

  // oldest_request_first (default), singer_selected_next (same ordering —
  // manual selection requires a separate host action), manual_host_selection
  const sorted = [...singer.pendingSongs].sort(
    (a, b) => b.priority - a.priority || a.requestedAt.getTime() - b.requestedAt.getTime(),
  );
  return sorted[0];
}

// ---------------------------------------------------------------------------
// strict_round_robin
// ---------------------------------------------------------------------------
// Each active singer gets exactly one turn per round.  Once all eligible
// singers have sung, the round increments.
//
// Eligibility:
//   - rotationStatus active, singerStatus active, pending songs exist
//   - has NOT yet sung in the current round (lastRoundSang < currentRound)
//
// New singer placement is handled when the singer joins (see rotationService).

export function strictRoundRobin(
  singers: SingerSnapshot[],
  ctx: PolicyContext,
): PolicyResult | null {
  const { currentRound, lastCompletedSingerId, config } = ctx;

  // Eligible for current round: active + pending song + not yet sung this round
  let pool = singers.filter(
    (s) =>
      s.singerStatus === 'active' &&
      s.rotationStatus === 'active' &&
      s.pendingSongs.length > 0 &&
      (s.lastRoundSang === null || s.lastRoundSang < currentRound) &&
      // Respect newSingerPlacement: skip singers who joined in a future round
      s.currentRoundJoined <= currentRound,
  );

  // If no eligible singers remain in this round, fall back to any active singer
  // with pending songs (the caller will need to increment the round counter).
  if (pool.length === 0) {
    pool = singers.filter(
      (s) =>
        s.singerStatus === 'active' && s.rotationStatus === 'active' && s.pendingSongs.length > 0,
    );
    if (pool.length === 0) return null;
  }

  // preventSameSingerBackToBack
  if (config.preventSameSingerBackToBack && lastCompletedSingerId !== null && pool.length > 1) {
    const filtered = pool.filter((s) => s.singerId !== lastCompletedSingerId);
    if (filtered.length > 0) pool = filtered;
  }

  // Sort by position to maintain a deterministic order within the round
  pool.sort((a, b) => a.position - b.position);
  const singer = pool[0];
  const song = selectSong(singer, config);
  if (!song) return null;

  return { singerId: singer.singerId, songRequestId: song.id };
}

/** Returns true when all currently eligible singers have already sung this round. */
export function isRoundComplete(singers: SingerSnapshot[], currentRound: number): boolean {
  const active = singers.filter(
    (s) =>
      s.singerStatus === 'active' &&
      s.rotationStatus === 'active' &&
      s.currentRoundJoined <= currentRound,
  );
  if (active.length === 0) return false;
  return active.every((s) => s.lastRoundSang !== null && s.lastRoundSang >= currentRound);
}

// ---------------------------------------------------------------------------
// least_recently_sung
// ---------------------------------------------------------------------------
// Choose the active singer with pending songs who has waited the longest.
// Sort order:
//   1. lastSangAt IS NULL first (never sung)
//   2. lastSangAt ASC (oldest sing time)
//   3. joinedAt ASC (earliest joiner as tie-breaker)

export function leastRecentlySung(
  singers: SingerSnapshot[],
  ctx: PolicyContext,
): PolicyResult | null {
  const pool = eligibleSingers(singers, ctx.config, ctx.lastCompletedSingerId);
  if (pool.length === 0) return null;

  pool.sort((a, b) => {
    // Never sung comes first
    if (a.lastSangAt === null && b.lastSangAt !== null) return -1;
    if (a.lastSangAt !== null && b.lastSangAt === null) return 1;
    if (a.lastSangAt !== null && b.lastSangAt !== null) {
      const diff = a.lastSangAt.getTime() - b.lastSangAt.getTime();
      if (diff !== 0) return diff;
    }
    // Tie-break by join time
    return a.joinedAt.getTime() - b.joinedAt.getTime();
  });

  const singer = pool[0];
  const song = selectSong(singer, ctx.config);
  if (!song) return null;

  return { singerId: singer.singerId, songRequestId: song.id };
}

// ---------------------------------------------------------------------------
// signup_order
// ---------------------------------------------------------------------------
// Singers perform in the order they joined (RotationSinger.position).
// After singing: move to end if they still have pending songs; otherwise
// respect the emptySingerPolicy.

export function signupOrder(singers: SingerSnapshot[], ctx: PolicyContext): PolicyResult | null {
  const pool = eligibleSingers(singers, ctx.config, ctx.lastCompletedSingerId);
  if (pool.length === 0) return null;

  // Pick the singer with the lowest position
  pool.sort((a, b) => a.position - b.position);
  const singer = pool[0];
  const song = selectSong(singer, ctx.config);
  if (!song) return null;

  return { singerId: singer.singerId, songRequestId: song.id };
}

// ---------------------------------------------------------------------------
// song_queue_only
// ---------------------------------------------------------------------------
// Pick the oldest pending song globally regardless of who sang last.
// Ignores all singer-fairness rules.

export function songQueueOnly(
  singers: SingerSnapshot[],
  ctx: PolicyContext,
): PolicyResult | null {
  // Collect all pending songs from all active singers
  const allSongs: { singer: SingerSnapshot; song: SongRequestSnapshot }[] = [];

  for (const s of singers) {
    if (s.singerStatus !== 'active' || s.rotationStatus !== 'active') continue;
    for (const song of s.pendingSongs) {
      allSongs.push({ singer: s, song });
    }
  }

  if (allSongs.length === 0) return null;

  // Sort by priority DESC, then requestedAt ASC
  allSongs.sort(
    (a, b) =>
      b.song.priority - a.song.priority ||
      a.song.requestedAt.getTime() - b.song.requestedAt.getTime(),
  );

  const { singer, song } = allSongs[0];
  return { singerId: singer.singerId, songRequestId: song.id };
}
