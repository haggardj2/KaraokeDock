// server/src/scanner.ts
import fs from 'fs/promises';
import path from 'path';
import { upsertArtist, upsertTrack } from './db';
import { parseFromFilename } from './parsing';
import { createRequire } from 'module';
import { spawn } from 'child_process';
import { promisify } from 'util';
const require = createRequire(import.meta.url);
const yauzl = require('yauzl');
const execFile = promisify(spawn);

type ProgressCb = (evt: { type: 'file' | 'summary'; data: any }) => void;

const VIDEO_RE = /\.mp4$/i;
const ZIP_RE   = /\.zip$/i;
const CDG_RE   = /\.cdg$/i;
const MP3_RE   = /\.mp3$/i;

async function* walkFiles(dir: string) {
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
  try {
    return new Promise((resolve) => {
      const ffprobe = spawn('ffprobe', [
        '-v', 'error',
        '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1',
        filePath
      ]);

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

      ffprobe.on('error', () => {
        resolve(null);
      });
    });
  } catch {
    return null;
  }
}

/**
 * Get duration of MP3 inside a ZIP file
 */
export async function getZipMp3Duration(zipPath: string, mp3Name: string): Promise<number | null> {
  try {
    return new Promise((resolve) => {
      yauzl.open(zipPath, { lazyEntries: true }, (err: any, zipFile: any) => {
        if (err || !zipFile) {
          resolve(null);
          return;
        }

        zipFile.readEntry();
        
        zipFile.on('entry', (entry: any) => {
          if (entry.fileName === mp3Name) {
            // Extract MP3 to temp file to analyze duration
            const tmpFile = path.join('/tmp', `temp_${Date.now()}.mp3`);
            const writeStream = require('fs').createWriteStream(tmpFile);
            
            zipFile.openReadStream(entry, (err2: any, readStream: any) => {
              if (err2 || !readStream) {
                resolve(null);
                return;
              }
              
              readStream.pipe(writeStream);
              
              writeStream.on('finish', async () => {
                const duration = await getMediaDuration(tmpFile);
                // Clean up temp file
                try {
                  await fs.unlink(tmpFile);
                } catch {}
                resolve(duration);
              });
              
              writeStream.on('error', () => {
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

  console.log(`Scanning library path: ${libPath}`);

  for await (const abs of walkFiles(libPath)) {
    const basename = path.basename(abs);
    const dir = path.dirname(abs);

    if (VIDEO_RE.test(basename)) {
      const { artist, title, discId } = parseFromFilename(basename);
      const artistId = artist ? await upsertArtist(artist) : null;
      
      // Get duration of MP4 file
      const duration_ms = await getMediaDuration(abs);

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

      mp4Indexed++;
      console.log(`Indexed MP4: ${basename} (disc: ${discId}, duration: ${duration_ms ? Math.round(duration_ms/1000) + 's' : 'unknown'})`);
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
        
        // Get duration of MP3 inside ZIP
        const duration_ms = await getZipMp3Duration(abs, contents.mp3);

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

        zipPairsIndexed++;
        console.log(`Indexed ZIP CDG+MP3: ${basename} (disc: ${discId}, duration: ${duration_ms ? Math.round(duration_ms/1000) + 's' : 'unknown'})`);
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
        
        // Get duration of MP3 file
        const duration_ms = await getMediaDuration(mp3);
        
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
        
        loosePairsIndexed++;
        console.log(`Indexed loose CDG+MP3: ${basename} (disc: ${discId}, duration: ${duration_ms ? Math.round(duration_ms/1000) + 's' : 'unknown'})`);
        onProgress?.({ type: 'file', data: { kind: 'loosePair', file: abs } });
      } catch {
        console.warn(`CDG file missing matching MP3: ${basename}`);
      }
    }
  }

  const summary = { mp4Indexed, zipsSeen, zipPairsIndexed, loosePairsIndexed };
  console.log('Scan summary:', summary);
  onProgress?.({ type: 'summary', data: summary });
  return summary;
}