import path from 'path';
import fs from 'fs/promises';
import { query } from './db.js';
import { logger } from './logger.js';
import { extractAudioMetadata, isBreakMusicFile } from './scanner.js';
import { parseBreakMusicFromFilename } from './parsing.js';

export class BreakMusicScanAlreadyInProgressError extends Error {
  constructor() {
    super('break music scan already in progress');
    this.name = 'BreakMusicScanAlreadyInProgressError';
  }
}

export type BreakMusicScanResult = {
  indexed: number;
  foldersScanned: number;
};

let breakMusicScanInFlight: Promise<BreakMusicScanResult> | null = null;

async function walkFilesRecursive(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const out: string[] = [];
  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...await walkFilesRecursive(abs));
    } else if (entry.isFile()) {
      out.push(abs);
    }
  }
  return out;
}

export async function runBreakMusicScan(folderId?: number | null): Promise<BreakMusicScanResult> {
  if (breakMusicScanInFlight) {
    throw new BreakMusicScanAlreadyInProgressError();
  }

  breakMusicScanInFlight = (async () => {
    const folders = folderId == null
      ? await query<{ id: number; path: string }>(`SELECT id, path FROM break_music_folders ORDER BY id`)
      : await query<{ id: number; path: string }>(`SELECT id, path FROM break_music_folders WHERE id = $1`, [folderId]);

    let indexed = 0;
    let foldersScanned = 0;

    for (const folder of folders.rows) {
      let files: string[] = [];
      try {
        files = await walkFilesRecursive(folder.path);
      } catch (error) {
        logger.warn(`[breakMusicScanner] Failed to scan break music folder ${folder.path}:`, error);
        continue;
      }

      foldersScanned += 1;
      const seen = new Set<string>();
      for (const filePath of files) {
        if (!isBreakMusicFile(filePath)) continue;
        const base = path.basename(filePath);
        const parsed = parseBreakMusicFromFilename(base);
        const meta = await extractAudioMetadata(filePath);
        const title = meta.title || parsed.title || base.replace(/\.[^.]+$/, '');
        const artist = meta.artist || parsed.artist || null;
        const genre = meta.genre || null;
        const duration_ms = meta.duration_ms || null;

        await query(
          `INSERT INTO break_music_tracks(folder_id, title, artist, genre, duration_ms, file_path)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (file_path) DO UPDATE
           SET folder_id = EXCLUDED.folder_id,
               title = EXCLUDED.title,
               artist = EXCLUDED.artist,
               genre = EXCLUDED.genre,
               duration_ms = EXCLUDED.duration_ms`,
          [folder.id, title, artist, genre, duration_ms, filePath]
        );
        seen.add(filePath);
        indexed++;
      }

      if (seen.size > 0) {
        await query(
          `DELETE FROM break_music_tracks
            WHERE folder_id = $1
              AND file_path <> ALL($2::text[])`,
          [folder.id, Array.from(seen)]
        );
      } else {
        await query(`DELETE FROM break_music_tracks WHERE folder_id = $1`, [folder.id]);
      }
    }

    return { indexed, foldersScanned };
  })();

  try {
    return await breakMusicScanInFlight;
  } finally {
    breakMusicScanInFlight = null;
  }
}
