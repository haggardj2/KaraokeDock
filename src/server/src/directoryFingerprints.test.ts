import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { detectChangedDirectoryRoots, snapshotDirectoryTree } from './directoryFingerprints.js';

let root: string;
const options = { recursive: true, includeFile: (file: string) => /\.(mp4|zip|cdg|mp3)$/i.test(file) };
beforeEach(async () => { root = await fs.mkdtemp(path.join(os.tmpdir(), 'karaokedock-fingerprints-')); });
afterEach(async () => { await fs.rm(root, { recursive: true, force: true }); });

describe('media directory change detection', () => {
  it('detects same-count renames despite a restored directory timestamp', async () => {
    await fs.writeFile(path.join(root, 'First.mp4'), 'media');
    const stat = await fs.stat(root);
    const before = await snapshotDirectoryTree(root, options);
    await fs.rename(path.join(root, 'First.mp4'), path.join(root, 'Renamed.mp4'));
    await fs.utimes(root, stat.atime, stat.mtime);
    expect(detectChangedDirectoryRoots(before, await snapshotDirectoryTree(root, options), root)).toEqual([root]);
  });

  it('detects file modifications without directory timestamp or size changes', async () => {
    const file = path.join(root, 'Song.mp4');
    await fs.writeFile(file, 'old');
    const before = await snapshotDirectoryTree(root, options);
    await fs.writeFile(file, 'new');
    await fs.utimes(file, new Date(10000), new Date(20000));
    expect(detectChangedDirectoryRoots(before, await snapshotDirectoryTree(root, options), root)).toEqual([root]);
  });

  it('watches supported symlink files just as the manual scanner does', async () => {
    const target = path.join(root, 'target.bin');
    await fs.writeFile(target, 'media');
    await fs.symlink(target, path.join(root, 'Linked.mp4'));
    const before = await snapshotDirectoryTree(root, options);
    expect(before[0].relevantFileCount).toBe(1);
    await fs.appendFile(target, 'more');
    expect(detectChangedDirectoryRoots(before, await snapshotDirectoryTree(root, options), root)).toEqual([root]);
  });

  it('rescans the surviving parent after directory removal and collapses descendant requests', async () => {
    await fs.mkdir(path.join(root, 'nested', 'child'), { recursive: true });
    const before = await snapshotDirectoryTree(root, options);
    await fs.rmdir(path.join(root, 'nested', 'child'));
    expect(detectChangedDirectoryRoots(before, await snapshotDirectoryTree(root, options), root)).toEqual([path.join(root, 'nested')]);
  });

  it('returns stable snapshots and ignores edits to unsupported files', async () => {
    const file = path.join(root, 'notes.txt');
    await fs.writeFile(file, 'notes');
    const before = await snapshotDirectoryTree(root, options);
    await fs.appendFile(file, 'updated');
    expect(await snapshotDirectoryTree(`${root}/`, options)).toEqual(before);
    expect(detectChangedDirectoryRoots(before, before, root)).toEqual([]);
    expect(detectChangedDirectoryRoots(null, before, root)).toEqual([root]);
  });

  it('compares values rather than key order after PostgreSQL JSONB persistence', async () => {
    await fs.writeFile(path.join(root, 'Song.mp4'), 'media');
    const current = await snapshotDirectoryTree(root, options);
    const persisted = current.map(entry => ({
      relevantFileCount: entry.relevantFileCount, fileSignature: entry.fileSignature,
      selfMtimeMs: entry.selfMtimeMs, exists: entry.exists, path: entry.path,
    }));
    expect(detectChangedDirectoryRoots(persisted, current, root)).toEqual([]);
  });
});
