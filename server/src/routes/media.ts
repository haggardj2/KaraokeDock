import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const yauzl = require('yauzl');

function getPitchParams(req: express.Request) {
  const pitchSemitones = Number(req.query.pitch || 0);
  const hasPitch = Number.isFinite(pitchSemitones) && pitchSemitones !== 0;
  const pitchRatio = hasPitch ? Math.pow(2, pitchSemitones / 12) : 1;
  return { hasPitch, pitchRatio, pitchSemitones };
}

function buildPitchFilter(pitchRatio: number, pitchSemitones: number): string {
  // rubberband pitch is a SCALE FACTOR (ratio), not semitones
  // e.g. -2 semitones => 2^(-2/12) ~= 0.8908987
  if (!Number.isFinite(pitchRatio) || Math.abs(pitchRatio - 1) < 1e-6) return '';

  // Keep it stable/short for logs
  const ratio = pitchRatio.toFixed(6);
  return `rubberband=pitch=${ratio}`;
}


// Fallback filter for systems without rubberband (kept for reference)
// This can be used if rubberband filter is not available in the FFmpeg build
// To use: replace buildPitchFilter() call with buildPitchFilterFallback()
// Uses asetrate to shift pitch, then atempo to restore original tempo
function buildPitchFilterFallback(pitchRatio: number): string {
  if (pitchRatio === 1) return '';
  
  // asetrate changes pitch AND tempo, so we need to compensate with atempo
  // pitchRatio > 1 means higher pitch (faster), so we need to slow down with atempo < 1
  // pitchRatio < 1 means lower pitch (slower), so we need to speed up with atempo > 1
  const tempoCorrection = 1 / pitchRatio;
  
  // atempo filter has range [0.5, 2.0], so we may need to chain multiple filters
  const atempoFilters: string[] = [];
  let remainingTempo = tempoCorrection;
  
  // Chain atempo filters to handle values outside [0.5, 2.0] range
  while (remainingTempo > 2.0) {
    atempoFilters.push('atempo=2.0');
    remainingTempo /= 2.0;
  }
  while (remainingTempo < 0.5) {
    atempoFilters.push('atempo=0.5');
    remainingTempo /= 0.5;
  }
  
  // Add the final atempo adjustment
  atempoFilters.push(`atempo=${remainingTempo.toFixed(6)}`);
  
  // Build the complete filter: asetrate to shift pitch, then atempo(s) to restore tempo
  return `asetrate=44100*${pitchRatio.toFixed(6)},${atempoFilters.join(',')},aresample=44100`;
}

export const mediaRouter = express.Router();

function isUnderMediaRoot(p: string) {
  const root = (process.env.MEDIA_ROOT || '/media').replace(/\\/g,'/');
  const resolved = path.resolve(p).replace(/\\/g,'/');
  return resolved.startsWith(path.resolve(root));
}

mediaRouter.get('/file', (req, res) => {
  const p = (req.query.path as string) || '';
  if (!p || !isUnderMediaRoot(p)) return res.status(400).send('Invalid path');
  const stat = fs.statSync(p);
  const range = req.headers.range;
  res.setHeader('Accept-Ranges','bytes');
  if (range) {
    const [s,e] = range.replace(/bytes=/,'').split('-').map(x=>parseInt(x,10));
    const start = isNaN(s)?0:s;
    const end = isNaN(e)?(stat.size-1):e;
    res.status(206);
    res.setHeader('Content-Range', `bytes ${start}-${end}/${stat.size}`);
    res.setHeader('Content-Length', String(end - start + 1));
    fs.createReadStream(p, { start, end }).pipe(res);
  } else {
    res.setHeader('Content-Length', String(stat.size));
    fs.createReadStream(p).pipe(res);
  }
});

mediaRouter.get('/zip', async (req, res) => {
  const zipPath = (req.query.zip as string) || '';
  const entryName = (req.query.file as string) || '';
  
  if (!zipPath || !entryName || !isUnderMediaRoot(zipPath)) {
    return res.status(400).send('Invalid zip request');
  }

  yauzl.open(zipPath, { lazyEntries: true, autoClose: true }, (err: any, zip: any) => {
    if (err || !zip) return res.status(404).send('Unable to open zip');
    let found = false;
    zip.readEntry();
    zip.on('entry', (e: any) => {
      if (e.fileName === entryName) {
        found = true;
        zip.openReadStream(e, (err2: any, stream: any) => {
          if (err2 || !stream) {
            res.status(500).send('Stream error'); 
            try { zip.close(); } catch {}; 
            return;
          }
          res.setHeader('Cache-Control','no-cache');
          stream.on('end', ()=> { try { zip.close(); } catch {} });
          stream.pipe(res);
        });
      } else {
        zip.readEntry();
      }
    });
    zip.on('end', ()=> {
      if (!found) res.status(404).send('Entry not found in zip: ' + entryName);
    });
    zip.on('error', ()=> res.status(500).send('Zip error'));
  });
});

// Optimized CDG to MP4 transcoding - fixed for smoother playback
mediaRouter.get('/cdgmp4', async (req, res) => {
  const file = (req.query.file as string) || '';
  const cdg = (req.query.cdg as string) || '';
  const mp3 = (req.query.mp3 as string) || '';
  const { hasPitch, pitchRatio, pitchSemitones } = getPitchParams(req);

  if (!cdg || !mp3) return res.status(400).send('cdg and mp3 are required');

  const tmpDir = os.tmpdir();
  const tmpCdg = path.join(tmpDir, `kara_${Date.now()}_${Math.random().toString(36).slice(2)}.cdg`);
  const tmpMp3 = path.join(tmpDir, `kara_${Date.now()}_${Math.random().toString(36).slice(2)}.mp3`);

  const cleanup = () => {
    try { if (fs.existsSync(tmpCdg)) fs.unlinkSync(tmpCdg); } catch {}
    try { if (fs.existsSync(tmpMp3)) fs.unlinkSync(tmpMp3); } catch {}
  };

  try {
    // Extract files from ZIP or copy loose files
    if (file) {
      if (!isUnderMediaRoot(file)) return res.status(400).send('Invalid zip path');
      await new Promise<void>((resolve, reject) => {
        yauzl.open(file, { lazyEntries: true, autoClose: true }, (err: any, zip: any) => {
          if (err || !zip) return reject(err || new Error('Unable to open zip'));
          let gotCdg = false, gotMp3 = false;
          zip.readEntry();
          zip.on('entry', (e: any) => {
            if (e.fileName === cdg || e.fileName === mp3) {
              zip.openReadStream(e, (err2: any, stream: any) => {
                if (err2 || !stream) return reject(err2 || new Error('stream open failed'));
                const out = fs.createWriteStream(e.fileName === cdg ? tmpCdg : tmpMp3);
                stream.pipe(out);
                out.on('finish', () => {
                  if (e.fileName === cdg) gotCdg = true;
                  else gotMp3 = true;
                  if (gotCdg && gotMp3) { 
                    try { zip.close(); } catch {}
                    resolve(); 
                  } else {
                    zip.readEntry();
                  }
                });
                out.on('error', reject);
              });
            } else {
              zip.readEntry();
            }
          });
          zip.on('error', reject);
          zip.on('end', () => { 
            if (!(gotCdg && gotMp3)) reject(new Error('entries not found')); 
          });
        });
      });
    } else {
      if (!isUnderMediaRoot(cdg) || !isUnderMediaRoot(mp3)) return res.status(400).send('Invalid media path');
      await fs.promises.copyFile(cdg, tmpCdg);
      await fs.promises.copyFile(mp3, tmpMp3);
    }

    // Optimized FFmpeg settings for smooth CDG playback
    // Use tpad filter to hold last frame if CDG is shorter than audio (prevents looping)
    const args = [
      '-loglevel', 'error',
      '-y',
      '-i', tmpCdg, 
      '-i', tmpMp3,
      // Video processing with proper frame rate, scaling, and padding to hold last frame
      // tpad=stop=-1:stop_mode=clone extends video by cloning last frame until audio ends
      '-vf', 'scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,fps=30,tpad=stop=-1:stop_mode=clone',
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      // Video codec options (must come after -c:v)
      '-preset', 'veryfast',       // Balance between speed and quality
      '-tune', 'animation',         // Better for CDG graphics
      '-profile:v', 'main',         
      '-level', '3.1',
      '-crf', '25',                 // Better quality than 30
      '-g', '60',                   // Keyframe every 2 seconds at 30fps
      '-keyint_min', '30',          // Minimum keyframe interval
      '-sc_threshold', '0',         // Disable scene change detection
      '-bf', '2',                   // B-frames for better compression
      '-b_strategy', '1',
      // Audio settings
      '-c:a', 'aac',
      ...(hasPitch ? ['-af', buildPitchFilter(pitchRatio, pitchSemitones)] : []),
      '-b:a', '128k',
      '-ar', '44100',
      '-shortest',                  // Stop when shortest stream ends (audio controls duration)
      // Streaming optimizations
      '-movflags', '+frag_keyframe+empty_moov+default_base_moof+faststart',
      '-frag_duration', '1000000',   // 1 second fragments
      '-f', 'mp4',
      'pipe:1'
    ];

    console.log('[mp4stream] pitchSemitones=', pitchSemitones, 'pitchRatio=', pitchRatio, 'af=', buildPitchFilter(pitchRatio, pitchSemitones));
    
    const ff = spawn('ffmpeg', args);
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Cache-Control', 'no-cache, no-store');
    
    ff.stdout.pipe(res);
    
    ff.stderr.on('data', (data) => {
      console.error(`FFmpeg error: ${data}`);
    });
    
    ff.on('close', (code) => { 
      if (code !== 0) {
        console.error(`FFmpeg exited with code ${code}`);
      }
      cleanup(); 
    });
    
    req.on('close', () => { 
      try { ff.kill('SIGKILL'); } catch {}
      cleanup(); 
    });
  } catch (e:any) {
    cleanup();
    console.error('CDG transcoding error:', e);
    res.status(500).send(String(e?.message || e));
  }
});

// Simple MP4 serving without re-encoding
mediaRouter.get('/mp4stream', (req, res) => {
  const mp4Path = (req.query.path as string) || '';
  const { hasPitch, pitchRatio, pitchSemitones } = getPitchParams(req);
  
  if (!mp4Path || !isUnderMediaRoot(mp4Path)) {
    return res.status(400).send('Invalid path');
  }

  // If pitch shifting requested, re-encode audio with pitch adjustment
  if (hasPitch) {
    const args = [
      '-loglevel', 'error',
      '-y',
      '-i', mp4Path,
      '-map', '0:v?',
      '-map', '0:a?',
      '-c:v', 'copy',
      '-af', buildPitchFilter(pitchRatio, pitchSemitones),
      '-c:a', 'aac',
      '-b:a', '128k',
      '-movflags', '+frag_keyframe+empty_moov+default_base_moof+faststart',
      '-f', 'mp4',
      'pipe:1'
    ];

    const ff = spawn('ffmpeg', args);
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Cache-Control', 'no-cache, no-store');
    ff.stdout.pipe(res);
    ff.stderr.on('data', (data) => console.error(`FFmpeg error: ${data}`));
    ff.on('close', (code) => {
      if (code !== 0) console.error(`FFmpeg exited with code ${code}`);
    });
    req.on('close', () => {
      try { ff.kill('SIGKILL'); } catch {}
    });
    return;
  }

  const stat = fs.statSync(mp4Path);
  const range = req.headers.range;
  
  res.setHeader('Content-Type', 'video/mp4');
  res.setHeader('Accept-Ranges', 'bytes');
  
  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
    const chunksize = (end - start) + 1;
    
    res.status(206);
    res.setHeader('Content-Range', `bytes ${start}-${end}/${stat.size}`);
    res.setHeader('Content-Length', String(chunksize));
    
    fs.createReadStream(mp4Path, { start, end }).pipe(res);
  } else {
    res.setHeader('Content-Length', String(stat.size));
    fs.createReadStream(mp4Path).pipe(res);
  }
});
