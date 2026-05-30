import { describe, expect, it } from 'vitest';
import { parseZipMediaRef } from './zipMediaRef.js';

describe('parseZipMediaRef', () => {
  it('parses lowercase zip references', () => {
    expect(parseZipMediaRef('zip:///media/karaoke/song.zip#track.cdg')).toEqual({
      zipPath: '/media/karaoke/song.zip',
      entryName: 'track.cdg',
    });
  });

  it('parses mixed-case zip extensions', () => {
    expect(parseZipMediaRef('zip:///media/karaoke/song.ZIP#track.cdg')).toEqual({
      zipPath: '/media/karaoke/song.ZIP',
      entryName: 'track.cdg',
    });
  });

  it('keeps hashes in the zip filename by splitting on the final .zip# marker', () => {
    expect(parseZipMediaRef('zip:///media/karaoke/disco#1.ZIP#track#1.cdg')).toEqual({
      zipPath: '/media/karaoke/disco#1.ZIP',
      entryName: 'track#1.cdg',
    });
  });

  it('returns null for non-zip references', () => {
    expect(parseZipMediaRef('/media/karaoke/song.cdg')).toBeNull();
  });
});
