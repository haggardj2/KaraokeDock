// Pure selection policies shared by scheduling and read-only previews.
import {
  effectiveRotationType,
  type SingerSnapshot,
  type SongRequestSnapshot,
  type PolicyContext,
  type PolicyResult,
  type RotationConfig,
} from './types.js';

const compareId = (a: bigint, b: bigint) => a < b ? -1 : a > b ? 1 : 0;
const byPosition = (a: SingerSnapshot, b: SingerSnapshot) =>
  a.position - b.position || a.joinedAt.getTime() - b.joinedAt.getTime() || compareId(a.singerId, b.singerId);
const byRequest = (a: SongRequestSnapshot, b: SongRequestSnapshot) =>
  Math.max(a.requestedAt.getTime(), a.lastSkippedAt?.getTime() ?? -Infinity) -
    Math.max(b.requestedAt.getTime(), b.lastSkippedAt?.getTime() ?? -Infinity) || compareId(a.id, b.id);

export function eligibleSingers(
  singers: SingerSnapshot[], config: RotationConfig, lastCompletedSingerId: bigint | null,
): SingerSnapshot[] {
  let pool = singers.filter((s) =>
    s.singerStatus === 'active' && s.rotationStatus === 'active' && s.pendingSongs.length > 0);
  if (config.preventSameSingerBackToBack && pool.some((s) => s.singerId !== lastCompletedSingerId)) {
    pool = pool.filter((s) => s.singerId !== lastCompletedSingerId);
  }
  return pool;
}

export function selectSong(singer: SingerSnapshot, config: RotationConfig): SongRequestSnapshot | null {
  if (config.songSelectionPolicy === 'manual_host_selection') return null;
  const priorityFirst = config.songSelectionPolicy === 'highest_priority_first' ||
    config.songSelectionPolicy === 'singer_selected_next';
  return [...singer.pendingSongs].sort((a, b) =>
    (priorityFirst ? b.priority - a.priority : 0) || byRequest(a, b))[0] ?? null;
}

function resultFor(singer: SingerSnapshot | undefined, config: RotationConfig): PolicyResult | null {
  const song = singer && selectSong(singer, config);
  return singer && song ? { singerId: singer.singerId, songRequestId: song.id } : null;
}

export function strictRoundRobin(singers: SingerSnapshot[], ctx: PolicyContext): PolicyResult | null {
  const current = singers.filter((s) => s.currentRoundJoined <= ctx.currentRound &&
    (s.lastRoundSang === null || s.lastRoundSang < ctx.currentRound));
  return resultFor(eligibleSingers(current, ctx.config, ctx.lastCompletedSingerId).sort(byPosition)[0], ctx.config);
}

/** Empty singers never hold up a round, but an empty rotation does not advance indefinitely. */
export function isRoundComplete(singers: SingerSnapshot[], currentRound: number): boolean {
  const active = singers.filter((s) => s.singerStatus === 'active' && s.rotationStatus === 'active' &&
    s.currentRoundJoined <= currentRound);
  return active.length > 0 && active.every((s) => s.pendingSongs.length === 0 ||
    (s.lastRoundSang !== null && s.lastRoundSang >= currentRound));
}

export function leastRecentlySung(singers: SingerSnapshot[], ctx: PolicyContext): PolicyResult | null {
  const pool = eligibleSingers(singers, ctx.config, ctx.lastCompletedSingerId);
  pool.sort((a, b) => {
    const left = Math.max(a.lastSangAt?.getTime() ?? -Infinity, a.lastSkippedAt?.getTime() ?? -Infinity);
    const right = Math.max(b.lastSangAt?.getTime() ?? -Infinity, b.lastSkippedAt?.getTime() ?? -Infinity);
    return (left === right ? 0 : left < right ? -1 : 1) ||
      a.joinedAt.getTime() - b.joinedAt.getTime() || byPosition(a, b);
  });
  return resultFor(pool[0], ctx.config);
}

export function signupOrder(singers: SingerSnapshot[], ctx: PolicyContext): PolicyResult | null {
  return resultFor(eligibleSingers(singers, ctx.config, ctx.lastCompletedSingerId).sort(byPosition)[0], ctx.config);
}

export function songQueueOnly(singers: SingerSnapshot[], ctx: PolicyContext): PolicyResult | null {
  if (ctx.config.songSelectionPolicy === 'manual_host_selection') return null;
  const priorityFirst = ctx.config.songSelectionPolicy === 'highest_priority_first' ||
    ctx.config.songSelectionPolicy === 'singer_selected_next';
  const songs = eligibleSingers(singers, { ...ctx.config, preventSameSingerBackToBack: false }, null)
    .flatMap((s) => s.pendingSongs);
  songs.sort((a, b) => (priorityFirst ? b.priority - a.priority : 0) || byRequest(a, b));
  return songs[0] ? { singerId: songs[0].singerId, songRequestId: songs[0].id } : null;
}

/** Manual overrides are applied by the caller before automatic dispatch. */
export function selectNextByPolicy(singers: SingerSnapshot[], ctx: PolicyContext): PolicyResult | null {
  const mode = effectiveRotationType(ctx.config);
  if (mode === 'manual' || ctx.config.songSelectionPolicy === 'manual_host_selection') return null;
  let pool = singers;
  if (ctx.config.priorityPolicy === 'weighted' || ctx.config.priorityPolicy === 'vip_next') {
    let candidates = singers.filter((s) => mode !== 'strict_round_robin' || s.currentRoundJoined <= ctx.currentRound);
    if (mode === 'strict_round_robin' && ctx.config.priorityPolicy === 'weighted') {
      candidates = candidates.filter((s) => s.lastRoundSang === null || s.lastRoundSang < ctx.currentRound);
    }
    candidates = eligibleSingers(candidates, {
      ...ctx.config, preventSameSingerBackToBack: mode !== 'song_queue_only' && ctx.config.preventSameSingerBackToBack,
    }, ctx.lastCompletedSingerId);
    const highest = Math.max(0, ...candidates.flatMap((s) => s.pendingSongs.map((song) => song.priority)));
    if (highest > 0) {
      pool = candidates.filter((s) => s.pendingSongs.some((song) => song.priority === highest))
        .map((s) => ({ ...s, pendingSongs: s.pendingSongs.filter((song) => song.priority === highest) }));
      if (ctx.config.priorityPolicy === 'vip_next') return resultFor(pool.sort(byPosition)[0], ctx.config);
    }
  }
  switch (mode) {
    case 'strict_round_robin': return strictRoundRobin(pool, ctx);
    case 'least_recently_sung': return leastRecentlySung(pool, ctx);
    case 'signup_order': return signupOrder(pool, ctx);
    case 'song_queue_only': return songQueueOnly(pool, ctx);
    default: throw new Error(`Unsupported rotation type: ${mode}`);
  }
}
