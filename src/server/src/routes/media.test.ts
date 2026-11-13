import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getMediaRoots, remapMediaPathCandidate, resolveExistingMediaPath } from './media.js';

const tempDirs: string[] = [];

function makeTempDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'karaokedock-media-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  vi.unstubAllEnvs();
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('remapMediaPathCandidate', () => {
  it('maps stale host library paths onto mounted media roots by suffix', () => {
    const mediaRoot = makeTempDir();
    const mountedTrack = path.join(mediaRoot, 'karaoke', 'Homebrew', 'Funbox', 'track.zip');
    fs.mkdirSync(path.dirname(mountedTrack), { recursive: true });
    fs.writeFileSync(mountedTrack, 'test');

    const stalePath = '/mnt/user/karaoke/Karaoke Tracks/Homebrew/Funbox/track.zip';

    expect(remapMediaPathCandidate(stalePath, [path.join(mediaRoot, 'karaoke')])).toBe(mountedTrack);
  });

  it('returns null when no mounted path matches the candidate suffix', () => {
    const mediaRoot = makeTempDir();
    fs.mkdirSync(path.join(mediaRoot, 'karaoke'), { recursive: true });

    const stalePath = '/mnt/user/karaoke/Karaoke Tracks/Homebrew/Funbox/missing.zip';

    expect(remapMediaPathCandidate(stalePath, [path.join(mediaRoot, 'karaoke')])).toBeNull();
  });
});

describe('media roots', () => {
  it('reads several folders from MEDIA_ROOT', () => {
    const first = makeTempDir();
    const second = makeTempDir();
    vi.stubEnv('MEDIA_ROOT', [first, second, ''].join(path.delimiter));
    expect(getMediaRoots()).toEqual([fs.realpathSync.native(first), fs.realpathSync.native(second)]);
  });

  it('defaults to /media', () => {
    vi.stubEnv('MEDIA_ROOT', '');
    expect(getMediaRoots()).toEqual([path.resolve('/media')]);
  });

  it('serves files from any media folder and nothing outside them', () => {
    const first = makeTempDir();
    const second = makeTempDir();
    const outside = makeTempDir();
    for (const dir of [first, second, outside]) fs.writeFileSync(path.join(dir, 'song.mp4'), 'x');
    vi.stubEnv('MEDIA_ROOT', [first, second].join(path.delimiter));

    expect(resolveExistingMediaPath(path.join(first, 'song.mp4'))).toBe(fs.realpathSync.native(path.join(first, 'song.mp4')));
    expect(resolveExistingMediaPath(path.join(second, 'song.mp4'))).toBe(fs.realpathSync.native(path.join(second, 'song.mp4')));
    expect(resolveExistingMediaPath(path.join(outside, 'song.mp4'))).toBeNull();
    expect(resolveExistingMediaPath(path.join(first, '..', path.basename(outside), 'song.mp4'))).toBeNull();
  });
});
