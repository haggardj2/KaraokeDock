import type { RotationType } from './types';

export type QueueSortBasePolicy = Exclude<RotationType, 'hybrid'>;

export interface QueuedRotationSortItem {
  id: number;
  round: number;
  origPos: number;
  rotPos: number;
  lastSangAt: Date | null;
}

export interface QueuedRotationSortInput {
  id: number;
  singerKey?: string;
  requestedAt?: Date;
  requestOrderId?: number;
  joinedAt?: Date;
  origPos: number;
  rotPos: number;
  lastSangAt: Date | null;
  currentRoundJoined: number;
  lastRoundSang: number | null;
  isCurrentlyPlaying: boolean;
  songIndex: number;
}

export function computeStrictQueuedSongRound(input: {
  currentRound: number;
  currentRoundJoined: number;
  lastRoundSang: number | null;
  isCurrentlyPlaying: boolean;
  songIndex: number;
}): number {
  const baseRound = Math.max(
    input.currentRound,
    input.currentRoundJoined,
    (input.lastRoundSang ?? 0) + 1,
    input.isCurrentlyPlaying ? input.currentRound + 1 : 1,
  );

  return baseRound + input.songIndex;
}

export function sortQueuedRotationItems(
  items: QueuedRotationSortInput[],
  options: {
    currentRound: number;
    basePolicy: QueueSortBasePolicy;
    preventSameSingerBackToBack?: boolean;
    previousSingerKey?: string | null;
    playingSingerKey?: string | null;
    overrideIds?: number[];
  }
): QueuedRotationSortItem[] {
  const keyOf = (item: QueuedRotationSortInput) => item.singerKey ?? String(item.rotPos);
  const pending = [...items].sort((a, b) => a.origPos - b.origPos || a.id - b.id);
  const singers = new Map<string, {
    position: number; lastSang: number; round: number; joinedAt: number;
  }>();
  let clock = Math.max(0, ...items.map((item) => item.lastSangAt?.getTime() ?? 0));
  let lastPosition = Math.max(-1, ...items.map((item) => item.rotPos));
  for (const item of pending) {
    const key = keyOf(item);
    if (singers.has(key)) continue;
    singers.set(key, {
      position: item.isCurrentlyPlaying && options.basePolicy === 'signup_order' ? ++lastPosition : item.rotPos,
      lastSang: item.isCurrentlyPlaying ? ++clock : item.lastSangAt?.getTime() ?? -Infinity,
      round: computeStrictQueuedSongRound({ ...item, currentRound: options.currentRound, songIndex: 0 }),
      joinedAt: item.joinedAt?.getTime() ?? 0,
    });
  }
  const previous = items.find((item) => item.isCurrentlyPlaying);
  let previousKey = previous ? keyOf(previous) : options.previousSingerKey;
  let round = options.currentRound;
  const hasPendingTurnInRound = () => pending.some((item) => singers.get(keyOf(item))!.round <= round);
  if (options.basePolicy === 'strict_round_robin'
      && (options.playingSingerKey || previous) && !hasPendingTurnInRound()) round++;
  const overrides = [...(options.overrideIds ?? [])];
  const result: QueuedRotationSortItem[] = [];

  // Project successive turns, not historical join rounds. This keeps the
  // displayed queue identical to the choices made after each completion.
  while (pending.length) {
    let selected: QueuedRotationSortInput | undefined;
    while (overrides.length && !selected) {
      const id = overrides.shift();
      selected = pending.find((item) => item.id === id);
    }
    if (!selected && options.basePolicy === 'song_queue_only') {
      selected = [...pending].sort((a, b) =>
        (a.requestedAt?.getTime() ?? a.id) - (b.requestedAt?.getTime() ?? b.id)
        || (a.requestOrderId ?? a.id) - (b.requestOrderId ?? b.id)
        || a.id - b.id
      )[0];
    } else if (!selected && options.basePolicy === 'manual') {
      selected = pending[0];
    } else if (!selected) {
      const firstBySinger = new Map<string, QueuedRotationSortInput>();
      for (const item of pending) {
        if (!firstBySinger.has(keyOf(item))) firstBySinger.set(keyOf(item), item);
      }
      let candidates = [...firstBySinger.values()];
      if (options.basePolicy === 'strict_round_robin') {
        round = Math.max(round, Math.min(...candidates.map((item) => singers.get(keyOf(item))!.round)));
        candidates = candidates.filter((item) => singers.get(keyOf(item))!.round <= round);
      }
      if (options.preventSameSingerBackToBack && candidates.some((item) => keyOf(item) !== previousKey)) {
        candidates = candidates.filter((item) => keyOf(item) !== previousKey);
      }
      candidates.sort((a, b) => {
        const left = singers.get(keyOf(a))!;
        const right = singers.get(keyOf(b))!;
        if (options.basePolicy === 'least_recently_sung' && left.lastSang !== right.lastSang) {
          return left.lastSang < right.lastSang ? -1 : 1;
        }
        if (options.basePolicy === 'least_recently_sung' && left.joinedAt !== right.joinedAt) {
          return left.joinedAt - right.joinedAt;
        }
        return left.position - right.position || a.origPos - b.origPos || a.id - b.id;
      });
      selected = candidates[0];
    }
    const state = singers.get(keyOf(selected))!;
    result.push({ ...selected, round });
    pending.splice(pending.indexOf(selected), 1);
    state.round = Math.max(state.round, round + 1);
    state.lastSang = ++clock;
    if (options.basePolicy === 'signup_order') state.position = ++lastPosition;
    previousKey = keyOf(selected);
    if (options.basePolicy === 'strict_round_robin' && !hasPendingTurnInRound()) round++;
  }
  return result;
}
