import fs from 'fs/promises';
import path from 'path';
import { createHash } from 'node:crypto';

export interface DirectoryFingerprint {
  path: string;
  recursive: boolean;
  exists: boolean;
  isDirectory: boolean;
  directoryCount: number;
  fileCount: number;
  maxDirectoryMtimeMs: number | null;
}

export interface DirectoryTreeEntry {
  path: string;
  exists: boolean;
  selfMtimeMs: number | null;
  relevantFileCount: number;
  fileSignature?: string;
}

type SnapshotOptions = {
  recursive: boolean;
  includeFile?: (filePath: string) => boolean;
};

async function statSafe(targetPath: string) {
  try {
    return await fs.stat(targetPath);
  } catch (error: any) {
    if (error?.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

export async function snapshotDirectoryFingerprint(
  rootPath: string,
  options: SnapshotOptions
): Promise<DirectoryFingerprint> {
  const rootStat = await statSafe(rootPath);
  if (!rootStat) {
    return {
      path: rootPath,
      recursive: options.recursive,
      exists: false,
      isDirectory: false,
      directoryCount: 0,
      fileCount: 0,
      maxDirectoryMtimeMs: null,
    };
  }

  if (!rootStat.isDirectory()) {
    return {
      path: rootPath,
      recursive: options.recursive,
      exists: true,
      isDirectory: false,
      directoryCount: 0,
      fileCount: 0,
      maxDirectoryMtimeMs: Math.trunc(rootStat.mtimeMs),
    };
  }

  let directoryCount = 1;
  let fileCount = 0;
  let maxDirectoryMtimeMs = Math.trunc(rootStat.mtimeMs);
  const pending = [rootPath];

  while (pending.length > 0) {
    const currentDir = pending.pop()!;
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const absolutePath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        directoryCount += 1;
        const dirStat = await statSafe(absolutePath);
        if (dirStat) {
          maxDirectoryMtimeMs = Math.max(maxDirectoryMtimeMs, Math.trunc(dirStat.mtimeMs));
        }
        if (options.recursive) {
          pending.push(absolutePath);
        }
        continue;
      }

      if (entry.isFile()) {
        if (!options.includeFile || options.includeFile(absolutePath)) {
          fileCount += 1;
        }
      }
    }
  }

  return {
    path: rootPath,
    recursive: options.recursive,
    exists: true,
    isDirectory: true,
    directoryCount,
    fileCount,
    maxDirectoryMtimeMs,
  };
}

export function fingerprintsEqual(
  left: DirectoryFingerprint[] | null,
  right: DirectoryFingerprint[]
): boolean {
  if (!left || left.length !== right.length) return false;
  return JSON.stringify(left) === JSON.stringify(right);
}

export async function snapshotDirectoryTree(
  rootPath: string,
  options: SnapshotOptions
): Promise<DirectoryTreeEntry[]> {
  rootPath = path.resolve(rootPath);
  const rootStat = await statSafe(rootPath);
  if (!rootStat) {
    return [{ path: rootPath, exists: false, selfMtimeMs: null, relevantFileCount: 0 }];
  }

  if (!rootStat.isDirectory()) {
    return [{ path: rootPath, exists: true, selfMtimeMs: Math.trunc(rootStat.mtimeMs), relevantFileCount: 0 }];
  }

  const entries: DirectoryTreeEntry[] = [];
  const pending = [rootPath];

  while (pending.length > 0) {
    const currentDir = pending.pop()!;
    const currentStat = currentDir === rootPath ? rootStat : await statSafe(currentDir);
    const dirEntries = await fs.readdir(currentDir, { withFileTypes: true });
    let relevantFileCount = 0;
    const files = createHash('sha256');

    for (const entry of dirEntries.sort((a, b) => a.name.localeCompare(b.name))) {
      const absolutePath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        if (options.recursive) {
          pending.push(absolutePath);
        }
        continue;
      }

      if ((entry.isFile() || entry.isSymbolicLink()) && (!options.includeFile || options.includeFile(absolutePath))) {
        const stat = await statSafe(absolutePath);
        if (!stat?.isFile()) continue;
        relevantFileCount += 1;
        files.update(JSON.stringify([entry.name, stat.size, stat.mtimeMs, stat.ctimeMs]));
      }
    }

    entries.push({
      path: currentDir,
      exists: true,
      selfMtimeMs: currentStat ? Math.trunc(currentStat.mtimeMs) : null,
      relevantFileCount,
      fileSignature: files.digest('hex'),
    });
  }

  entries.sort((a, b) => a.path.localeCompare(b.path));
  return entries;
}

function isPathWithinRoot(candidatePath: string, rootPath: string): boolean {
  const relative = path.relative(rootPath, candidatePath);
  return relative === '' || (!path.isAbsolute(relative) && relative !== '..' && !relative.startsWith(`..${path.sep}`));
}

export function detectChangedDirectoryRoots(
  previous: DirectoryTreeEntry[] | null,
  current: DirectoryTreeEntry[],
  rootPath: string
): string[] {
  if (!previous || previous.length === 0) {
    return [rootPath];
  }

  const previousMap = new Map(previous.map((entry) => [entry.path, entry]));
  const currentMap = new Map(current.map((entry) => [entry.path, entry]));
  const changed = new Set<string>();

  for (const entry of current) {
    const prior = previousMap.get(entry.path);
    if (!prior || prior.exists !== entry.exists || prior.selfMtimeMs !== entry.selfMtimeMs ||
        prior.relevantFileCount !== entry.relevantFileCount || prior.fileSignature !== entry.fileSignature) {
      changed.add(entry.path);
    }
  }

  for (const entry of previous) {
    if (!currentMap.has(entry.path)) {
      const parentPath = path.dirname(entry.path);
      changed.add(isPathWithinRoot(parentPath, rootPath) ? parentPath : rootPath);
    }
  }

  return Array.from(changed)
    .filter((candidate) => isPathWithinRoot(candidate, rootPath))
    .sort((a, b) => a.length - b.length)
    .filter((candidate, index, all) =>
      !all.slice(0, index).some((ancestor) => isPathWithinRoot(candidate, ancestor))
    );
}
