import type { RotationType } from './types';

export type QueueSortBasePolicy = Extract<
  RotationType,
  'strict_round_robin' | 'least_recently_sung' | 'signup_order'
>;

export interface QueuedRotationSortItem {
  id: number;
  round: number;
  origPos: number;
  rotPos: number;
  lastSangAt: Date | null;
}

export interface QueuedRotationSortInput {
  id: number;
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
  const alreadyUsedThisRound =
    input.isCurrentlyPlaying ||
    (input.lastRoundSang !== null && input.lastRoundSang >= input.currentRound);

  const baseRound = Math.max(
    input.currentRoundJoined,
    alreadyUsedThisRound ? input.currentRound + 1 : input.currentRound
  );

  return baseRound + input.songIndex;
}

function computeQueuedSongRound(
  item: QueuedRotationSortInput,
  options: {
    currentRound: number;
    basePolicy: QueueSortBasePolicy;
  }
): number {
  if (options.basePolicy === 'strict_round_robin') {
    return computeStrictQueuedSongRound({
      currentRound: options.currentRound,
      currentRoundJoined: item.currentRoundJoined,
      lastRoundSang: item.lastRoundSang,
      isCurrentlyPlaying: item.isCurrentlyPlaying,
      songIndex: item.songIndex,
    });
  }

  return Math.max(1, item.currentRoundJoined) + item.songIndex;
}

export function sortQueuedRotationItems(
  items: QueuedRotationSortInput[],
  options: {
    currentRound: number;
    basePolicy: QueueSortBasePolicy;
  }
): QueuedRotationSortItem[] {
  const sortable = items.map((item) => ({
    id: item.id,
    round: computeQueuedSongRound(item, options),
    origPos: item.origPos,
    rotPos: item.rotPos,
    lastSangAt: item.lastSangAt,
  }));

  if (options.basePolicy === 'least_recently_sung') {
    sortable.sort((a, b) => {
      if (a.round !== b.round) return a.round - b.round;
      if (a.lastSangAt === null && b.lastSangAt !== null) return -1;
      if (a.lastSangAt !== null && b.lastSangAt === null) return 1;
      if (a.lastSangAt !== null && b.lastSangAt !== null) {
        const diff = a.lastSangAt.getTime() - b.lastSangAt.getTime();
        if (diff !== 0) return diff;
      }
      return a.origPos - b.origPos;
    });
    return sortable;
  }

  sortable.sort((a, b) => {
    if (a.round !== b.round) return a.round - b.round;
    return a.rotPos - b.rotPos;
  });
  return sortable;
}
