import { describe, expect, it, vi } from 'vitest';
import { getOrderedBreakTracks, rotateBreakPlaylistToFront, validateBreakTrackIds } from './breakMusicPlaylists.js';
import { query } from './db.js';

vi.mock('./db.js', () => ({ query: vi.fn(), withTransaction: vi.fn() }));

describe('running break playlist rotation', () => {
  it('puts the current occurrence first and finished tracks last without mutating saved order', () => {
    const saved = [1, 2, 1, 3];
    expect(rotateBreakPlaylistToFront(saved, 2)).toEqual([1, 3, 1, 2]);
    expect(saved).toEqual([1, 2, 1, 3]);
  });
  it('supports previous, wraparound, empty and single-track playlists', () => {
    expect(rotateBreakPlaylistToFront([2, 3, 1], 2)).toEqual([1, 2, 3]);
    expect(rotateBreakPlaylistToFront([1, 2, 3], 0)).toEqual([1, 2, 3]);
    expect(rotateBreakPlaylistToFront([], 0)).toEqual([]);
    expect(rotateBreakPlaylistToFront([1], 0)).toEqual([1]);
  });
});

describe('break playlist IDs', () => {
  it.each([undefined, null, [], [null], [true], ['1'], [0], [-1], [1.2], [NaN], [Infinity], [Number.MAX_SAFE_INTEGER + 1], [1, 'bad']])(
    'rejects invalid IDs without dropping or coercing entries: %j', (ids) => {
      expect(() => validateBreakTrackIds(ids)).toThrow();
    }
  );
  it('retains order and repeated occurrences, and permits explicitly clearing active playback', () => {
    expect(validateBreakTrackIds([3, 1, 3])).toEqual([3, 1, 3]);
    expect(validateBreakTrackIds([], true)).toEqual([]);
  });
  it('hydrates each requested occurrence in ordinal order', async () => {
    vi.mocked(query).mockResolvedValue({ rows: [{ id: 3 }, { id: 1 }, { id: 3 }] } as any);
    expect(await getOrderedBreakTracks([3, 1, 3])).toEqual([{ id: 3 }, { id: 1 }, { id: 3 }]);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('WITH ORDINALITY'), [[3, 1, 3]]);
  });
});
