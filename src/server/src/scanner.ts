// server/src/scanner.ts
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { upsertArtist, upsertTrack } from './db';
import { parseFromFilename } from './parsing';
import { createRequire } from 'module';
import { spawn } from 'child_process';
import { promisify } from 'util';
import { logger } from './logger';
const require = createRequire(import.meta.url);
const yauzl = require('yauzl');
const execFile = promisify(spawn);

type ProgressCb = (evt: { type: 'file' | 'summary'; data: any }) => void;

const VIDEO_RE = /\.mp4$/i;
const ZIP_RE   = /\.zip$/i;
const CDG_RE   = /\.cdg$/i;
const MP3_RE   = /\.mp3$/i;
const BREAK_AUDIO_RE = /\.(mp3|flac|alac|wav|opus|aac|m4a|ogg|oga)$/i;
// .opus is intentionally excluded: its Vorbis Comments live in stream headers (not
// the container/format level), so ffmetadata writes an empty file for opus files.
// Opus is handled by the ffprobe path below which correctly reads stream-level tags.
const VORBIS_COMMENT_RE = /\.(flac|ogg|oga)$/i;

/**
 * Semaphore to limit concurrent ffprobe operations
 */
class Semaphore {
  private queue: Array<() => void> = [];
  private running = 0;

  constructor(private max: number) {}

  async acquire(): Promise<void> {
    if (this.running < this.max) {
      this.running++;
      return;
    }
    return new Promise(resolve => {
      this.queue.push(resolve);
    });
  }

  release(): void {
    this.running--;
    const next = this.queue.shift();
    if (next) {
      this.running++;
      next();
    }
  }
}

// Limit concurrent ffprobe processes to avoid EMFILE errors
const ffprobeSemaphore = new Semaphore(10);

async function* walkFiles(dir: string): AsyncGenerator<string> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      yield* walkFiles(p);
    } else {
      yield p;
    }
  }
}

/**
 * Get duration of a media file using ffprobe
 */
export async function getMediaDuration(filePath: string): Promise<number | null> {
  await ffprobeSemaphore.acquire();
  
  try {
    return await new Promise((resolve) => {
      let ffprobe;
      try {
        ffprobe = spawn('ffprobe', [
          '-v', 'error',
          '-show_entries', 'format=duration',
          '-of', 'default=noprint_wrappers=1:nokey=1',
          filePath
        ]);
      } catch (err) {
        // Handle synchronous spawn errors (e.g., EMFILE)
        console.error(`Failed to spawn ffprobe for ${filePath}:`, err);
        resolve(null);
        return;
      }

      // Handle spawn errors where process is returned but is invalid
      if (!ffprobe || !ffprobe.stdout) {
        console.error(`Invalid ffprobe process for ${filePath}`);
        resolve(null);
        return;
      }

      let output = '';
      ffprobe.stdout.on('data', (data) => {
        output += data.toString();
      });

      ffprobe.on('close', (code) => {
        if (code === 0) {
          const duration = parseFloat(output.trim());
          if (!isNaN(duration)) {
            // Convert seconds to milliseconds
            resolve(Math.round(duration * 1000));
          } else {
            resolve(null);
          }
        } else {
          resolve(null);
        }
      });

      ffprobe.on('error', (err) => {
        console.error(`ffprobe error for ${filePath}:`, err);
        resolve(null);
      });
    });
  } catch (err) {
    console.error(`Exception in getMediaDuration for ${filePath}:`, err);
    return null;
  } finally {
    ffprobeSemaphore.release();
  }
}

export function isBreakMusicFile(filePath: string): boolean {
  return BREAK_AUDIO_RE.test(filePath);
}

type AudioMetadata = {
  title: string | null;
  artist: string | null;
  genre: string | null;
  duration_ms: number | null;
};

function parseFfmetadataTag(content: string, key: string): string | null {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = content.match(new RegExp(`^${escapedKey}=(.*)$`, 'im'));
  return match ? match[1].trim() || null : null;
}

export async function extractAudioMetadata(filePath: string): Promise<AudioMetadata> {
  await ffprobeSemaphore.acquire();

  try {
    if (VORBIS_COMMENT_RE.test(filePath)) {
      // Write metadata to a temp file so ffmpeg can seek if needed (stdout is not seekable).
      // This is especially important for .opus files which fail with non-zero exit codes
      // when ffmetadata is directed to stdout.
      const tmpMetaFile = path.join(os.tmpdir(), `ffmeta_${Date.now()}_${Math.random().toString(36).slice(2)}.txt`);
      return await new Promise<AudioMetadata>((resolve) => {
        let proc;
        try {
          proc = spawn('ffmpeg', ['-y', '-i', filePath, '-f', 'ffmetadata', tmpMetaFile]);
        } catch {
          resolve({ title: null, artist: null, genre: null, duration_ms: null });
          return;
        }

        if (!proc || !proc.stderr) {
          resolve({ title: null, artist: null, genre: null, duration_ms: null });
          return;
        }

        // Drain stdout — ffmpeg may still emit some output to stdout even when the
        // primary output is a file, and not consuming it can cause the process to block.
        proc.stdout?.resume();

        let stderrData = '';
        proc.stderr.on('data', (data: Buffer) => { stderrData += data.toString(); });

        proc.on('close', async (_code) => {
          try {
            let metaContent = '';
            try {
              metaContent = await fs.readFile(tmpMetaFile, 'utf8');
            } catch {
              resolve({ title: null, artist: null, genre: null, duration_ms: null });
              return;
            }

            const title = parseFfmetadataTag(metaContent, 'title');
            const artist = parseFfmetadataTag(metaContent, 'artist');
            const genre = parseFfmetadataTag(metaContent, 'genre');

            // Parse duration from ffmpeg stderr (e.g. "Duration: 00:03:45.12")
            const durationMatch = stderrData.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
            let duration_ms: number | null = null;
            if (durationMatch) {
              const h = parseInt(durationMatch[1], 10);
              const m = parseInt(durationMatch[2], 10);
              const s = parseFloat(durationMatch[3]);
              const total = h * 3600 + m * 60 + s;
              if (total > 0) duration_ms = Math.round(total * 1000);
            }

            resolve({ title, artist, genre, duration_ms });
          } finally {
            fs.unlink(tmpMetaFile).catch(() => {});
          }
        });

        proc.on('error', () => {
          fs.unlink(tmpMetaFile).catch(() => {});
          resolve({ title: null, artist: null, genre: null, duration_ms: null });
        });
      });
    }

    return await new Promise<AudioMetadata>((resolve) => {
      let ffprobe;
      try {
        ffprobe = spawn('ffprobe', [
          '-v', 'error',
          '-show_entries', 'format=duration:format_tags=title,artist,genre:stream_tags=title,artist,genre',
          '-of', 'json',
          filePath
        ]);
      } catch {
        resolve({ title: null, artist: null, genre: null, duration_ms: null });
        return;
      }

      if (!ffprobe || !ffprobe.stdout) {
        resolve({ title: null, artist: null, genre: null, duration_ms: null });
        return;
      }

      let output = '';
      ffprobe.stdout.on('data', (data) => {
        output += data.toString();
      });

      ffprobe.on('close', (code) => {
        if (code !== 0) {
          resolve({ title: null, artist: null, genre: null, duration_ms: null });
          return;
        }

        try {
          const parsed = JSON.parse(output || '{}');
          // format.tags covers MP3/AAC/etc; streams[0].tags covers opus/FLAC Vorbis Comments.
          // Normalize keys to lowercase: Vorbis Comment tags (opus, flac, ogg) are returned
          // by ffprobe in UPPERCASE (e.g. TITLE, ARTIST, GENRE), so a case-insensitive merge
          // ensures consistent access regardless of file format.
          const normKeys = (obj: Record<string, string>) =>
            Object.fromEntries(Object.entries(obj).map(([k, v]) => [k.toLowerCase(), v]));
          const formatTags = normKeys(parsed?.format?.tags || {});
          const streamTags = (Array.isArray(parsed?.streams) && parsed.streams.length > 0)
            ? normKeys(parsed.streams[0].tags || {})
            : {};
          const tags = { ...streamTags, ...formatTags };
          const duration = Number(parsed?.format?.duration);
          resolve({
            title: typeof tags.title === 'string' ? tags.title.trim() || null : null,
            artist: typeof tags.artist === 'string' ? tags.artist.trim() || null : null,
            genre: typeof tags.genre === 'string' ? tags.genre.trim() || null : null,
            duration_ms: Number.isFinite(duration) && duration > 0 ? Math.round(duration * 1000) : null
          });
        } catch {
          resolve({ title: null, artist: null, genre: null, duration_ms: null });
        }
      });

      ffprobe.on('error', () => {
        resolve({ title: null, artist: null, genre: null, duration_ms: null });
      });
    });
  } finally {
    ffprobeSemaphore.release();
  }
}

/**
 * Utility function to extract duration from a track
 * Handles all track types: mp4, cdgmp3 (zip or loose)
 */
export async function extractTrackDuration(track: { 
  kind: string; 
  file_mp4: string | null; 
  file_mp3: string | null; 
}): Promise<number | null> {
  let extractedDuration: number | null = null;
  
  if (track.kind === 'cdgmp3' && track.file_mp3) {
    const isFromZip = track.file_mp3.startsWith('zip://');
    
    if (isFromZip) {
      // Extract duration from MP3 inside ZIP
      // Parse zip://path#entry format - split at .zip# to handle # in filenames
      const ZIP_EXT = '.zip';
      const ZIP_SEPARATOR = '.zip#';
      const withoutPrefix = track.file_mp3.replace('zip://', '');
      const separatorIdx = withoutPrefix.indexOf(ZIP_SEPARATOR);
      const zipPath = separatorIdx >= 0 ? withoutPrefix.substring(0, separatorIdx + ZIP_EXT.length) : withoutPrefix;
      const mp3Name = separatorIdx >= 0 ? withoutPrefix.substring(separatorIdx + ZIP_SEPARATOR.length) : '';
      
      if (zipPath && mp3Name) {
        extractedDuration = await getZipMp3Duration(zipPath, mp3Name);
      }
    } else {
      // Loose MP3 file
      extractedDuration = await getMediaDuration(track.file_mp3);
    }
  } else if (track.kind === 'mp4' && track.file_mp4) {
    extractedDuration = await getMediaDuration(track.file_mp4);
  }
  
  return extractedDuration;
}

/**
 * Get duration of MP3 inside a ZIP file
 */
export async function getZipMp3Duration(zipPath: string, mp3Name: string): Promise<number | null> {
  let tmpFile: string | null = null;
  let zipFile: any = null;
  
  try {
    return await new Promise((resolve) => {
      yauzl.open(zipPath, { lazyEntries: true }, (err: any, zf: any) => {
        if (err || !zf) {
          resolve(null);
          return;
        }

        zipFile = zf;
        zipFile.readEntry();
        
        zipFile.on('entry', (entry: any) => {
          if (entry.fileName === mp3Name) {
            // Extract MP3 to temp file to analyze duration
            tmpFile = path.join('/tmp', `temp_${Date.now()}_${Math.random().toString(36).substring(7)}.mp3`);
            const writeStream = require('fs').createWriteStream(tmpFile);
            
            zipFile.openReadStream(entry, (err2: any, readStream: any) => {
              if (err2 || !readStream) {
                writeStream.destroy();
                zipFile.close();
                resolve(null);
                return;
              }
              
              readStream.on('error', () => {
                writeStream.destroy();
                zipFile.close();
                resolve(null);
              });
              
              readStream.pipe(writeStream);
              
              writeStream.on('finish', async () => {
                try {
                  const duration = await getMediaDuration(tmpFile!);
                  resolve(duration);
                } catch (err) {
                  resolve(null);
                } finally {
                  // Close ZIP file handle
                  try {
                    zipFile.close();
                  } catch {}
                }
              });
              
              writeStream.on('error', () => {
                writeStream.destroy();
                try {
                  zipFile.close();
                } catch {}
                resolve(null);
              });
            });
          } else {
            zipFile.readEntry();
          }
        });

        zipFile.on('end', () => {
          resolve(null);
        });

        zipFile.on('error', () => {
          resolve(null);
        });
      });
    });
  } catch {
    return null;
  } finally {
    // Always clean up temp file and close ZIP file handle
    if (tmpFile) {
      try {
        await fs.unlink(tmpFile);
      } catch {}
    }
    if (zipFile) {
      try {
        zipFile.close();
      } catch {}
    }
  }
}

/**
 * Look inside ZIP files to find actual CDG/MP3 filenames
 */
async function getZipContents(zipPath: string): Promise<{ cdg: string | null; mp3: string | null }> {
  return new Promise((resolve) => {
    let cdgFile: string | null = null;
    let mp3File: string | null = null;

    yauzl.open(zipPath, { lazyEntries: true }, (err: any, zipFile: any) => {
      if (err || !zipFile) {
        resolve({ cdg: null, mp3: null });
        return;
      }

      zipFile.readEntry();
      
      zipFile.on('entry', (entry: any) => {
        const name = entry.fileName as string;
        if (CDG_RE.test(name)) cdgFile = name;
        if (MP3_RE.test(name)) mp3File = name;
        zipFile.readEntry();
      });

      zipFile.on('end', () => {
        resolve({ cdg: cdgFile, mp3: mp3File });
      });

      zipFile.on('error', () => {
        resolve({ cdg: null, mp3: null });
      });
    });
  });
}

export async function scanPath(libraryId: number, libPath: string, onProgress?: ProgressCb) {
  let mp4Indexed = 0;
  let zipsSeen = 0;
  let zipPairsIndexed = 0;
  let loosePairsIndexed = 0;

  // Track scanned files to remove orphaned tracks later
  const scannedKeys = new Set<string>();

  console.log(`Scanning library path: ${libPath}`);

  for await (const abs of walkFiles(libPath)) {
    const basename = path.basename(abs);
    const dir = path.dirname(abs);

    if (VIDEO_RE.test(basename)) {
      const { artist, title, discId } = parseFromFilename(basename);
      const artistId = artist ? await upsertArtist(artist) : null;
      
      // Skip duration extraction during scan for speed (lazy loading)
      // Duration will be extracted in background or when song is queued
      const duration_ms = null;

      await upsertTrack({
        artist_id: artistId,
        disc_id: discId,
        title: title,
        kind: 'mp4',
        duration_ms,
        file_mp4: abs,
        file_cdg: null,
        file_mp3: null,
        path: dir,
        basename,
        library_id: libraryId,
      });

      // Track this file as scanned (using kind + path + basename as key)
      scannedKeys.add(`mp4:${dir}:${basename}`);

      mp4Indexed++;
      console.log(`Indexed MP4: ${basename} (disc: ${discId}, duration: pending)`);
      onProgress?.({ type: 'file', data: { kind: 'mp4', file: abs } });
      continue;
    }

    if (ZIP_RE.test(basename)) {
      zipsSeen++;
      
      // Get actual contents of the ZIP
      const contents = await getZipContents(abs);
      
      if (contents.cdg && contents.mp3) {
        const { artist, title, discId } = parseFromFilename(basename);
        const artistId = artist ? await upsertArtist(artist) : null;
        
        // Skip duration extraction during scan for speed (lazy loading)
        // Duration will be extracted in background or when song is queued
        const duration_ms = null;

        await upsertTrack({
          artist_id: artistId,
          disc_id: discId,
          title: title,
          kind: 'cdgmp3',
          duration_ms,
          file_mp4: null,
          file_cdg: `zip://${abs}#${contents.cdg}`,
          file_mp3: `zip://${abs}#${contents.mp3}`,
          path: dir,
          basename,
          library_id: libraryId,
        });

        // Track this file as scanned (using kind + path + basename as key)
        scannedKeys.add(`cdgmp3:${dir}:${basename}`);

        zipPairsIndexed++;
        console.log(`Indexed ZIP CDG+MP3: ${basename} (disc: ${discId}, duration: pending)`);
        onProgress?.({ type: 'file', data: { kind: 'zipPair', file: abs } });
      } else {
        console.warn(`ZIP file missing CDG or MP3: ${basename}`);
      }
      continue;
    }

    // Handle loose CDG+MP3 pairs
    if (CDG_RE.test(basename)) {
      const stem = basename.replace(/\.cdg$/i, '');
      const mp3 = path.join(dir, `${stem}.mp3`);
      try {
        await fs.stat(mp3);
        const { artist, title, discId } = parseFromFilename(basename);
        const artistId = artist ? await upsertArtist(artist) : null;
        
        // Skip duration extraction during scan for speed (lazy loading)
        // Duration will be extracted in background or when song is queued
        const duration_ms = null;
        
        await upsertTrack({
          artist_id: artistId,
          disc_id: discId,
          title,
          kind: 'cdgmp3',
          duration_ms,
          file_mp4: null,
          file_cdg: abs,
          file_mp3: mp3,
          path: dir,
          basename,
          library_id: libraryId,
        });
        
        // Track this file as scanned (using kind + path + basename as key)
        scannedKeys.add(`cdgmp3:${dir}:${basename}`);
        
        loosePairsIndexed++;
        console.log(`Indexed loose CDG+MP3: ${basename} (disc: ${discId}, duration: pending)`);
        onProgress?.({ type: 'file', data: { kind: 'loosePair', file: abs } });
      } catch {
        console.warn(`CDG file missing matching MP3: ${basename}`);
      }
    }
  }

  // Remove tracks from this library that were not found during the scan
  const { query } = await import('./db');
  
  // Get all existing tracks for this library (excluding external tracks and tracks in queue)
  const existingTracks = await query<{ id: number; kind: string; path: string; basename: string }>(
    `SELECT t.id, t.kind, t.path, t.basename 
     FROM tracks t
     LEFT JOIN queue q ON t.id = q.track_id
     WHERE t.library_id = $1 
       AND t.external_url IS NULL
       AND q.track_id IS NULL`,
    [libraryId]
  );
  
  const tracksToDelete: number[] = [];
  for (const track of existingTracks.rows) {
    const key = `${track.kind}:${track.path}:${track.basename}`;
    if (!scannedKeys.has(key)) {
      tracksToDelete.push(track.id);
    }
  }
  
  let tracksRemoved = 0;
  if (tracksToDelete.length > 0) {
    console.log(`Removing ${tracksToDelete.length} tracks that are no longer in the library...`);
    const deleteResult = await query(
      `DELETE FROM tracks WHERE id = ANY($1)`,
      [tracksToDelete]
    );
    tracksRemoved = deleteResult.rowCount || 0;
    console.log(`Removed ${tracksRemoved} orphaned tracks`);
  }

  const summary = { mp4Indexed, zipsSeen, zipPairsIndexed, loosePairsIndexed, tracksRemoved };
  console.log('Scan summary:', summary);
  onProgress?.({ type: 'summary', data: summary });
  return summary;
}

/**
 * Background task to process tracks with missing duration_ms
 * Processes a batch of tracks at a time to avoid overwhelming the system
 */
export async function processMissingDurations(batchSize: number = 10): Promise<number> {
  const { query } = await import('./db');
  
  // Get tracks without duration
  const result = await query(
    `SELECT id, kind, file_mp4, file_mp3, file_cdg, title
     FROM tracks
     WHERE duration_ms IS NULL
     ORDER BY id
     LIMIT $1`,
    [batchSize]
  );
  
  if (result.rows.length === 0) {
    return 0;
  }
  
  logger.warn(`Processing ${result.rows.length} tracks with missing duration...`);
  let processed = 0;
  
  // Process tracks sequentially with a delay to prevent file descriptor exhaustion
  for (const track of result.rows) {
    try {
      const extractedDuration = await extractTrackDuration(track);
      
      // Update the database with the extracted duration
      if (extractedDuration !== null) {
        await query('UPDATE tracks SET duration_ms = $1 WHERE id = $2', [extractedDuration, track.id]);
        logger.warn(`Updated duration for track ${track.id} (${track.title}): ${Math.round(extractedDuration / 1000)}s`);
        processed++;
      } else {
        console.warn(`Failed to extract duration for track ${track.id} (${track.title})`);
      }
    } catch (err) {
      console.error(`Error processing track ${track.id}:`, err);
    }
    
    // Add a small delay between tracks to allow file descriptors to be released
    // This prevents EMFILE errors when processing many tracks
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return processed;
}
