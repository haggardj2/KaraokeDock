import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { remapMediaPathCandidate } from './media.js';

const tempDirs: string[] = [];

function makeTempDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'karaokedock-media-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
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
