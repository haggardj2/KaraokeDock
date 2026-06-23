import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LIBRARY_PARSE_MODE,
  parseFromFilename,
  type LibraryParseMode,
} from './parsing.js';

describe('parseFromFilename', () => {
  it('preserves the legacy default parsing behavior', () => {
    expect(parseFromFilename('SC1234-01 - Queen - Bohemian Rhapsody.mp4')).toEqual({
      artist: 'Queen',
      title: 'Bohemian Rhapsody',
      discId: 'SC1234-01',
    });

    expect(parseFromFilename('Queen - Bohemian Rhapsody.mp4', DEFAULT_LIBRARY_PARSE_MODE)).toEqual({
      artist: 'Queen',
      title: 'Bohemian Rhapsody',
      discId: null,
    });
  });

  it.each([
    [
      'discid-title-artist',
      'SC1234-01 - Bohemian Rhapsody - Queen.mp4',
      { artist: 'Queen', title: 'Bohemian Rhapsody', discId: 'SC1234-01' },
    ],
    [
      'artist-title-discid',
      'Queen - Bohemian Rhapsody - SC1234-01.mp4',
      { artist: 'Queen', title: 'Bohemian Rhapsody', discId: 'SC1234-01' },
    ],
    [
      'title-artist-discid',
      'Bohemian Rhapsody - Queen - SC1234-01.mp4',
      { artist: 'Queen', title: 'Bohemian Rhapsody', discId: 'SC1234-01' },
    ],
    [
      'artist-title',
      'Queen - Bohemian Rhapsody.mp4',
      { artist: 'Queen', title: 'Bohemian Rhapsody', discId: null },
    ],
    [
      'title-artist',
      'Bohemian Rhapsody - Queen.mp4',
      { artist: 'Queen', title: 'Bohemian Rhapsody', discId: null },
    ],
    [
      'discid_title_artist',
      'SC1234-01_Bohemian_Rhapsody_Queen.mp4',
      { artist: 'Queen', title: 'Bohemian_Rhapsody', discId: 'SC1234-01' },
    ],
  ] satisfies [LibraryParseMode, string, { artist: string | null; title: string | null; discId: string | null }][])(
    'parses %s filenames',
    (mode, filename, expected) => {
      expect(parseFromFilename(filename, mode)).toEqual(expected);
    }
  );

  it('treats the title field as greedy when the selected mode places title in the middle', () => {
    expect(parseFromFilename('Queen - We Will - Rock You - SC1234-01.mp4', 'artist-title-discid')).toEqual({
      artist: 'Queen',
      title: 'We Will - Rock You',
      discId: 'SC1234-01',
    });

    expect(parseFromFilename('SC1234-01 - We Will - Rock You - Queen.mp4', 'discid-title-artist')).toEqual({
      artist: 'Queen',
      title: 'We Will - Rock You',
      discId: 'SC1234-01',
    });
  });
});
