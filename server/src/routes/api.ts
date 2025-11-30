// server/src/routes/api.ts
import express from 'express';
import path from 'path';
import fs from 'fs/promises';
import { EventEmitter } from 'events';
import { query, ensureHelpfulIndexes, getSetting, setSetting } from '../db';
import { scanPath, getMediaDuration, getZipMp3Duration } from '../scanner';
import QRCode from 'qrcode';
import { searchKaraokeNerds } from '../karaoke-nerds';

ensureHelpfulIndexes().catch(e => console.error('ensureHelpfulIndexes failed', e));

export const apiRouter = express.Router();

let postQueueUpdate: (type?: string, data?: any) => void = () => {};
export function setPostQueueUpdate(fn: (type?: string, data?: any) => void) {
  postQueueUpdate = typeof fn === 'function' ? fn : () => {};
}

const ah =
  (fn: express.RequestHandler): express.RequestHandler =>
  (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

const adminGuard: express.RequestHandler = async (req, res, next) => {
  const token = req.headers['x-admin-token'];
  if (!token) {
    res.status(403).send('Forbidden');
    return;
  }
  
  try {
    // Check if token matches the database value
    const storedToken = await getSetting('admin.token');
    if (storedToken && token === storedToken) {
      next();
      return;
    }
    
    // Fallback to env variable for backward compatibility (during migration)
    if (process.env.ADMIN_TOKEN && token === process.env.ADMIN_TOKEN) {
      next();
      return;
    }
    
    res.status(403).send('Forbidden');
  } catch (err) {
    console.error('adminGuard error:', err);
    res.status(403).send('Forbidden');
  }
};

const toInt = (v: any): number | null => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
};

apiRouter.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ===================== ADMIN AUTHENTICATION =====================

// Admin login endpoint - validates username/password from env
apiRouter.post(
  '/admin/login',
  ah(async (req, res) => {
    const { username, password } = req.body;
    
    const envUsername = process.env.ADMIN_USERNAME || 'admin';
    const envPassword = process.env.ADMIN_PASSWORD || 'changeme-password';
    
    if (username === envUsername && password === envPassword) {
      res.json({ ok: true });
    } else {
      res.status(401).json({ ok: false, message: 'Invalid credentials' });
    }
  })
);

// Get current admin token (requires authentication)
apiRouter.get(
  '/admin/token',
  adminGuard,
  ah(async (_req, res) => {
    const token = await getSetting('admin.token');
    res.json({ token: token || '' });
  })
);

// Set admin token (requires authentication via token OR username/password)
apiRouter.post(
  '/admin/token',
  ah(async (req, res) => {
    const { token, username, password } = req.body;
    const adminTokenHeader = req.headers['x-admin-token'];
    
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Token is required' });
    }
    
    // Check authentication - either via admin token OR username/password
    let authenticated = false;
    
    // Method 1: Admin token authentication (for updates)
    if (adminTokenHeader) {
      try {
        const storedToken = await getSetting('admin.token');
        if (storedToken && adminTokenHeader === storedToken) {
          authenticated = true;
        } else if (process.env.ADMIN_TOKEN && adminTokenHeader === process.env.ADMIN_TOKEN) {
          authenticated = true;
        }
      } catch (err) {
        console.error('Token check error:', err);
      }
    }
    
    // Method 2: Username/password authentication (for initial setup)
    if (!authenticated && username && password) {
      const envUsername = process.env.ADMIN_USERNAME || 'admin';
      const envPassword = process.env.ADMIN_PASSWORD || 'changeme-password';
      
      if (username === envUsername && password === envPassword) {
        authenticated = true;
      }
    }
    
    if (!authenticated) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    await setSetting('admin.token', token);
    res.json({ ok: true });
  })
);

// ===================== SCAN EVENTS (SSE) =====================
const scanBus = new EventEmitter();
let scanInProgress = false;
let lastScan: { finishedAt?: string; perLibrary?: Record<number, any> } | null = null;

function sseSend(res: express.Response, event: string, data: any) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

apiRouter.get('/scan/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();
  sseSend(res, 'hello', { scanInProgress, lastScan });

  const onStart = () => sseSend(res, 'scan_start', { at: new Date().toISOString() });
  const onProgress = (payload: any) => sseSend(res, 'scan_progress', payload);
  const onDone = (payload: any) => sseSend(res, 'scan_done', payload);

  scanBus.on('start', onStart);
  scanBus.on('progress', onProgress);
  scanBus.on('done', onDone);

  req.on('close', () => {
    scanBus.off('start', onStart);
    scanBus.off('progress', onProgress);
    scanBus.off('done', onDone);
    res.end();
  });
});

// ===================== LIBRARIES =====================

apiRouter.get(
  '/libraries',
  ah(async (_req, res) => {
    const r = await query<{ id: number; name: string; path: string }>(
      `SELECT id, name, path FROM libraries ORDER BY id`
    );
    res.json(r.rows);
  })
);

apiRouter.post(
  '/libraries',
  adminGuard,
  ah(async (req, res) => {
    const name = String(req.body?.name ?? '').trim();
    const libPath = String(req.body?.path ?? '').trim();
    if (!name || !libPath) return res.status(400).send('name and path required');
    await query(`INSERT INTO libraries (name, path) VALUES ($1, $2)`, [name, libPath]);
    res.json({ ok: true });
  })
);

apiRouter.delete(
  '/libraries/:id',
  adminGuard,
  ah(async (req, res) => {
    const id = toInt(req.params.id);
    if (id == null) return res.status(400).send('id required');
    await query(`DELETE FROM libraries WHERE id = $1`, [id]);
    res.json({ ok: true });
  })
);

// ===================== SCAN =====================

apiRouter.post(
  '/scan',
  adminGuard,
  ah(async (req, res) => {
    const libraryId = Number.isFinite(+req.body?.libraryId) ? +req.body.libraryId : null;

    if (scanInProgress) {
      return res.status(409).json({ ok: false, message: 'scan already in progress' });
    }

    scanInProgress = true;
    scanBus.emit('start');

    const progress = (evt: any) => scanBus.emit('progress', evt);

    try {
      if (libraryId != null) {
        const r = await query<{ id: number; path: string }>(`SELECT id, path FROM libraries WHERE id = $1`, [libraryId]);
        if (!r.rows.length) return res.status(404).send('library not found');

        const lib = r.rows[0];
        const stats = await scanPath(lib.id, lib.path, progress);
        lastScan = { finishedAt: new Date().toISOString(), perLibrary: { [lib.id]: stats } };
        scanBus.emit('done', { ...lastScan });
        return res.json({ ok: true, stats });
      }

      const libs = await query<{ id: number; path: string }>(`SELECT id, path FROM libraries ORDER BY id`);
      const allStats: Record<number, any> = {};

      for (const lib of libs.rows) {
        try {
          scanBus.emit('progress', { libraryId: lib.id, state: 'scanning', path: lib.path });
          allStats[lib.id] = await scanPath(lib.id, lib.path, (evt) =>
            scanBus.emit('progress', { libraryId: lib.id, ...evt })
          );
          scanBus.emit('progress', { libraryId: lib.id, state: 'done', stats: allStats[lib.id] });
        } catch (e: any) {
          allStats[lib.id] = { error: String(e?.message || e) };
          scanBus.emit('progress', { libraryId: lib.id, state: 'error', error: allStats[lib.id].error });
        }
      }

      lastScan = { finishedAt: new Date().toISOString(), perLibrary: allStats };
      scanBus.emit('done', { ...lastScan });
      res.json({ ok: true, stats: allStats });
    } finally {
      scanInProgress = false;
    }
  })
);

// ===================== ADMIN STATS =====================

apiRouter.get(
  '/admin/stats',
  adminGuard,
  ah(async (_req, res) => {
    const [artists, tracks, queued] = await Promise.all([
      query<{ c: string }>(`SELECT COUNT(*)::text AS c FROM artists`),
      query<{ c: string }>(`SELECT COUNT(*)::text AS c FROM tracks`),
      query<{ c: string }>(`SELECT COUNT(*)::text AS c FROM queue`),
    ]);
    res.json({
      artists: Number(artists.rows[0].c),
      tracks: Number(tracks.rows[0].c),
      queued: Number(queued.rows[0].c),
      lastScan,
    });
  })
);

// ===================== SEARCH =====================

// Find the /search endpoint and update it to include disc_id:

apiRouter.get(
  '/search',
  ah(async (req, res) => {
    const q = String(req.query.q ?? '').trim();
    if (!q) return res.json([]);

    try {
      const fts = await query(
        `
        SELECT t.id,
               t.title,
               t.disc_id,
               t.kind,
               a.name AS artist
          FROM tracks t
          LEFT JOIN artists a ON a.id = t.artist_id
         WHERE to_tsvector('english', COALESCE(t.title,'')) @@ plainto_tsquery($1)
            OR a.name ILIKE '%' || $1 || '%'
            OR t.disc_id ILIKE '%' || $1 || '%'
         ORDER BY a.name NULLS LAST, t.title
         LIMIT 100
        `,
        [q]
      );
      if (fts.rows.length) return res.json(fts.rows);
    } catch {}

    const like = await query(
      `
      SELECT t.id,
             t.title,
             t.disc_id,
             t.kind,
             a.name AS artist
        FROM tracks t
        LEFT JOIN artists a ON a.id = t.artist_id
       WHERE t.title ILIKE '%' || $1 || '%'
          OR a.name ILIKE '%' || $1 || '%'
          OR t.disc_id ILIKE '%' || $1 || '%'
       ORDER BY a.name NULLS LAST, t.title
       LIMIT 100
      `,
      [q]
    );
    res.json(like.rows);
  })
);

// ===================== KARAOKE NERDS SEARCH =====================

apiRouter.get(
  '/karaoke-nerds/search',
  ah(async (req, res) => {
    const q = String(req.query.q ?? '').trim();
    if (!q) return res.json([]);

    const results = await searchKaraokeNerds(q);
    res.json(results);
  })
);

// Add Karaoke Nerds track to queue
apiRouter.post(
  '/karaoke-nerds/add',
  ah(async (req, res) => {
    const { title, artist, url, requestedBy } = req.body;
    
    if (!title || !url) {
      return res.status(400).send('title and url required');
    }

    // Import upsertArtist and upsertExternalTrack
    const { upsertArtist, upsertExternalTrack } = await import('../db');
    const { getYouTubeDuration } = await import('../karaoke-nerds');
    
    // Insert artist if provided
    const artistId = artist ? await upsertArtist(artist) : null;
    
    // Try to get YouTube video duration (async, don't wait for it to fail)
    let duration_ms: number | null = null;
    try {
      const durationSeconds = await getYouTubeDuration(url);
      if (durationSeconds) {
        duration_ms = Math.round(durationSeconds * 1000);
        console.log(`Got YouTube duration for "${title}": ${durationSeconds}s`);
      }
    } catch (err) {
      console.warn('Failed to get YouTube duration:', err);
    }
    
    // Upsert the external track
    const track = await upsertExternalTrack({
      artist_id: artistId,
      title,
      external_url: url,
      source: 'karaoke-nerds',
      duration_ms
    });
    
    // Add to queue
    const posr = await query<{ p: number }>(`SELECT COALESCE(MAX(position),0)+1 AS p FROM queue`);
    const position = (posr.rows[0] as any).p;

    const r = await query(
      `INSERT INTO queue(track_id, requested_by, status, position)
       VALUES ($1,$2,'queued',$3)
       RETURNING id, track_id, requested_by, status, position, created_at`,
      [track.id, requestedBy || null, position]
    );
    
    res.json(r.rows[0]);
    postQueueUpdate('queue.updated');
  })
);

// ===================== MEDIA =====================

apiRouter.get(
  '/media/info',
  ah(async (req, res) => {
    const id = toInt(req.query.id);
    if (id == null) return res.status(400).send('id required');
    const r = await query(
      `SELECT id, kind, file_mp4, file_cdg, file_mp3, path FROM tracks WHERE id=$1`,
      [id]
    );
    if (!r.rows.length) return res.status(404).send('not found');
    res.json(r.rows[0]);
  })
);

apiRouter.get(
  '/media/file',
  ah(async (req, res) => {
    try {
      const p = String(req.query.path || '');
      if (!p) return res.status(400).send('path required');
      if (p.startsWith('zip://')) {
        const [zipPath, inner] = p.replace(/^zip:\/\//, '').split('#');
        res.redirect(`/media/zip?zip=${encodeURIComponent(zipPath)}&file=${encodeURIComponent(inner)}`);
        return;
      }
      const stat = await fs.stat(p);
      res.setHeader('Content-Length', String(stat.size));
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(path.resolve(p));
    } catch {
      res.status(404).send('file not found');
    }
  })
);

// Add to your browse endpoint - ensure it handles permissions correctly
apiRouter.get(
  '/browse',
  adminGuard,
  ah(async (req, res) => {
    const requestPath = String(req.query.path || '/media')
    
    try {
      // Try to access the directory
      const entries = await fs.readdir(requestPath, { withFileTypes: true })
      
      const items = entries
        .filter(entry => {
          // Filter out hidden and system directories
          return !entry.name.startsWith('.') && 
                 entry.name !== 'lost+found'
        })
        .map(entry => ({
          name: entry.name,
          path: path.join(requestPath, entry.name),
          isDirectory: entry.isDirectory()
        }))
        .sort((a, b) => {
          // Directories first, then alphabetical
          if (a.isDirectory && !b.isDirectory) return -1
          if (!a.isDirectory && b.isDirectory) return 1
          return a.name.localeCompare(b.name)
        })
      
      res.json(items)
    } catch (err: any) {
      console.error('Browse error:', err)
      
      // If permission denied, return empty list with error message
      if (err.code === 'EACCES' || err.code === 'EPERM') {
        res.json([{
          name: 'Permission denied - check volume mount permissions',
          path: requestPath,
          isDirectory: false
        }])
      } else if (err.code === 'ENOENT') {
        res.json([{
          name: 'Directory not found',
          path: requestPath,
          isDirectory: false
        }])
      } else {
        res.status(500).json({ error: 'Failed to browse directory' })
      }
    }
  })
);
// ===================== QUEUE =====================

// Update the /queue endpoint to include duration_ms:

apiRouter.get(
  '/queue',
  ah(async (_req, res) => {
    const result = await query(
      `
      SELECT q.id,
             q.track_id,
             q.requested_by,
             q.status,
             q.position,
             t.title,
             t.disc_id,
             t.duration_ms,
             t.kind,
             t.file_mp4,
             t.file_mp3,
             t.file_cdg,
             t.path,
             t.external_url,
             t.source,
             a.name AS artist
        FROM queue q
        JOIN tracks t ON t.id = q.track_id
        LEFT JOIN artists a ON a.id = t.artist_id
       ORDER BY q.position
      `
    );
    res.json(result.rows);
  })
);

apiRouter.post(
  '/queue',
  ah(async (req, res) => {
    const trackId = toInt(req.body?.trackId);
    const requestedBy = (req.body?.requestedBy ?? null) as string | null;
    if (trackId == null) return res.status(400).send('trackId required');

    const posr = await query<{ p: number }>(`SELECT COALESCE(MAX(position),0)+1 AS p FROM queue`);
    const position = (posr.rows[0] as any).p;

    const r = await query(
      `INSERT INTO queue(track_id, requested_by, status, position)
       VALUES ($1,$2,'queued',$3)
       RETURNING id, track_id, requested_by, status, position, created_at`,
      [trackId, requestedBy, position]
    );
    
    // Get track details for pre-caching and duration extraction
    const trackInfo = await query(
      `SELECT t.id, t.title, t.kind, t.file_mp4, t.file_mp3, t.file_cdg, t.path, t.duration_ms, a.name AS artist
       FROM tracks t
       LEFT JOIN artists a ON a.id = t.artist_id
       WHERE t.id = $1`,
      [trackId]
    );
    
    if (trackInfo.rows.length) {
      const track = trackInfo.rows[0];
      
      // If duration_ms is missing, try to extract it
      if (track.duration_ms === null) {
        let extractedDuration: number | null = null;
        
        if (track.kind === 'cdgmp3' && track.file_mp3) {
          const isFromZip = track.file_mp3.startsWith('zip://');
          
          if (isFromZip) {
            // Extract duration from MP3 inside ZIP
            const parsedPath = track.file_mp3.replace('zip://', '').split('#');
            const zipPath = parsedPath[0];
            const mp3Name = parsedPath[1];
            
            if (zipPath && mp3Name) {
              console.log(`Extracting duration for CDG+MP3 from ZIP: ${zipPath}#${mp3Name}`);
              extractedDuration = await getZipMp3Duration(zipPath, mp3Name);
            }
          } else {
            // Loose MP3 file
            console.log(`Extracting duration for CDG+MP3: ${track.file_mp3}`);
            extractedDuration = await getMediaDuration(track.file_mp3);
          }
        } else if (track.kind === 'mp4' && track.file_mp4) {
          console.log(`Extracting duration for MP4: ${track.file_mp4}`);
          extractedDuration = await getMediaDuration(track.file_mp4);
        }
        
        // Update the database with the extracted duration
        if (extractedDuration !== null) {
          console.log(`Updating duration for track ${track.id}: ${extractedDuration}ms (${Math.round(extractedDuration / 1000)}s)`);
          await query('UPDATE tracks SET duration_ms = $1 WHERE id = $2', [extractedDuration, track.id]);
          
          // Notify clients about the updated track (so Host page gets new duration)
          postQueueUpdate('queue.updated');
        }
      }
      
      // Trigger pre-caching for CDG+MP3 from ZIP
      if (track.kind === 'cdgmp3') {
        const isFromZip = track.file_cdg?.startsWith('zip://');
        
        if (isFromZip) {
          const parseCdgPath = track.file_cdg.replace('zip://', '').split('#');
          const parseMp3Path = track.file_mp3.replace('zip://', '').split('#');
          
          fetch(`http://localhost:${process.env.PORT || 5174}/media/precache`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              file: parseCdgPath[0],
              cdg: parseCdgPath[1],
              mp3: parseMp3Path[1],
              requestedBy,
              title: track.title,
              artist: track.artist
            })
          }).catch(err => console.error('Pre-cache request failed:', err));
        }
      }
    }
    
    res.json(r.rows[0]);
    postQueueUpdate('queue.updated');
  })
);

apiRouter.post(
  '/queue/reorder',
  adminGuard,
  ah(async (req, res) => {
    const id = toInt(req.body?.id);
    const newPosition = toInt(req.body?.newPosition);
    if (id == null || newPosition == null) return res.status(400).send('id and newPosition (integers) required');

    await query('BEGIN');
    try {
      const cur = await query<{ position: number }>(`SELECT position FROM queue WHERE id=$1 FOR UPDATE`, [id]);
      if (!cur.rows.length) throw new Error('not found');

      const oldPos = cur.rows[0].position as number;
      if (newPosition < oldPos) {
        await query(`UPDATE queue SET position = position + 1 WHERE position >= $1 AND position < $2`, [newPosition, oldPos]);
      } else if (newPosition > oldPos) {
        await query(`UPDATE queue SET position = position - 1 WHERE position > $1 AND position <= $2`, [oldPos, newPosition]);
      }
      await query(`UPDATE queue SET position = $1 WHERE id = $2`, [newPosition, id]);
      await query('COMMIT');

      res.json({ ok: true });
      postQueueUpdate('queue.updated');
    } catch (e) {
      await query('ROLLBACK');
      throw e;
    }
  })
);

apiRouter.post(
  '/queue/rename',
  adminGuard,
  ah(async (req, res) => {
    const id = toInt(req.body?.id);
    const requestedBy = String(req.body?.requestedBy ?? '').trim();
    if (id == null) return res.status(400).send('id required');

    await query(`UPDATE queue SET requested_by = $1 WHERE id = $2`, [requestedBy, id]);
    res.json({ ok: true });
    postQueueUpdate('queue.updated');
  })
);

apiRouter.post(
  '/queue/delete',
  adminGuard,
  ah(async (req, res) => {
    const id = toInt(req.body?.id);
    if (id == null) return res.status(400).send('id required');

    await query('BEGIN');
    try {
      const cur = await query(`SELECT position FROM queue WHERE id=$1 FOR UPDATE`, [id]);
      if (!cur.rows.length) throw new Error('not found');
      const pos = (cur.rows[0] as any).position as number;

      await query(`DELETE FROM queue WHERE id=$1`, [id]);
      await query(`UPDATE queue SET position = position - 1 WHERE position > $1`, [pos]);

      await query('COMMIT');
      res.json({ ok: true });
      postQueueUpdate('queue.updated');
    } catch (e) {
      await query('ROLLBACK');
      throw e;
    }
  })
);

apiRouter.post(
  '/queue/clear',
  adminGuard,
  ah(async (_req, res) => {
    await query(`DELETE FROM queue`);
    res.json({ ok: true });
    postQueueUpdate('queue.updated');
  })
);

// ===================== PLAYER (Host controls) =====================
// These are minimal and keep logic server-side so Player can react via your postQueueUpdate hook.

apiRouter.get(
  '/player/now',
  ah(async (_req, res) => {
    const r = await query(
      `
      SELECT q.id, q.track_id, q.position, q.requested_by, q.status,
             t.title, t.kind, t.file_mp4, t.file_mp3, t.file_cdg, t.path,
             t.external_url, t.source,
             a.name AS artist
        FROM queue q
        JOIN tracks t ON t.id = q.track_id
        LEFT JOIN artists a ON a.id = t.artist_id
       WHERE q.status = 'playing'
       ORDER BY q.position
       LIMIT 1
      `
    );
    res.json(r.rows[0] || null);
  })
);

apiRouter.post(
  '/player/play',
  adminGuard,
  ah(async (req, res) => {
    const id = toInt(req.body?.id ?? null);
    await query('BEGIN');
    try {
      // Set all to queued
      await query(`UPDATE queue SET status = 'queued' WHERE status <> 'queued'`);
      if (id != null) {
        await query(`UPDATE queue SET status = 'playing' WHERE id = $1`, [id]);
      } else {
        // play top
        await query(`
          UPDATE queue SET status = 'playing'
           WHERE id = (SELECT id FROM queue ORDER BY position LIMIT 1)
        `);
      }
      await query('COMMIT');
    } catch (e) {
      await query('ROLLBACK'); throw e;
    }
    postQueueUpdate('player.play');
    res.json({ ok: true });
  })
);

apiRouter.post(
  '/player/next',
  adminGuard,
  ah(async (_req, res) => {
    await query('BEGIN');
    try {
      // mark current as done (if any)
      await query(`UPDATE queue SET status = 'done' WHERE status = 'playing'`);
      // play next by position
      await query(`
        UPDATE queue SET status = 'playing'
         WHERE id IN (
           SELECT id FROM queue
           WHERE status = 'queued'
           ORDER BY position
           LIMIT 1
         )
      `);
      await query('COMMIT');
    } catch (e) {
      await query('ROLLBACK'); throw e;
    }
    postQueueUpdate('player.next');
    res.json({ ok: true });
  })
);

apiRouter.post(
  '/player/stop',
  adminGuard,
  ah(async (_req, res) => {
    await query(`UPDATE queue SET status = 'queued' WHERE status = 'playing'`);
    postQueueUpdate('player.stop');
    res.json({ ok: true });
  })
);

// Report playback timing from Player
apiRouter.post(
  '/player/timing',
  ah(async (req, res) => {
    const { currentTime, duration, queueId } = req.body;
    
    // Validate inputs
    if (typeof currentTime !== 'number' || typeof duration !== 'number') {
      return res.status(400).json({ error: 'currentTime and duration must be numbers' });
    }
    
    // Validate ranges
    if (currentTime < 0 || !isFinite(currentTime) || 
        duration <= 0 || !isFinite(duration)) {
      return res.status(400).json({ error: 'Invalid timing values: must be finite, non-negative, and duration must be positive' });
    }
    
    // Broadcast timing update to all connected clients via WebSocket
    postQueueUpdate('player.timing', {
      currentTime,
      duration,
      queueId
    });
    
    res.json({ ok: true });
  })
);

// ==================== QR CODE GENERATION =====================
// QR endpoint is now handled by routes/qr.ts

// ===================== OVERLAY SETTINGS =====================

// Get overlay settings
apiRouter.get(
  '/overlay/settings',
  ah(async (_req, res) => {
    const visible = await getSetting('overlay.visible');
    const height = await getSetting('overlay.height');
    const qrSize = await getSetting('overlay.qrSize');
    const customMessage = await getSetting('overlay.customMessage');
    res.json({
      visible: visible === null ? true : visible === 'true',
      height: height === null ? 90 : parseInt(height, 10),
      qrSize: qrSize === null ? 60 : parseInt(qrSize, 10),
      customMessage: customMessage || ''
    });
  })
);

// Update overlay settings (requires admin)
apiRouter.post(
  '/overlay/settings',
  adminGuard,
  ah(async (req, res) => {
    const { visible, height, qrSize, customMessage } = req.body;
    
    if (typeof visible === 'boolean') {
      await setSetting('overlay.visible', String(visible));
    }
    if (typeof height === 'number' && height >= 40 && height <= 150) {
      await setSetting('overlay.height', String(height));
    }
    if (typeof qrSize === 'number' && qrSize >= 40 && qrSize <= 150) {
      await setSetting('overlay.qrSize', String(qrSize));
    }
    if (typeof customMessage === 'string') {
      // Limit custom message length to 500 characters
      const truncatedMessage = customMessage.slice(0, 500);
      await setSetting('overlay.customMessage', truncatedMessage);
    }
    
    // Broadcast settings update to all clients
    const currentVisible = await getSetting('overlay.visible');
    const currentHeight = await getSetting('overlay.height');
    const currentQrSize = await getSetting('overlay.qrSize');
    const currentCustomMessage = await getSetting('overlay.customMessage');
    
    postQueueUpdate('overlay.settings', {
      visible: currentVisible === null ? true : currentVisible === 'true',
      height: currentHeight === null ? 90 : parseInt(currentHeight, 10),
      qrSize: currentQrSize === null ? 60 : parseInt(currentQrSize, 10),
      customMessage: currentCustomMessage || ''
    });
    
    res.json({ ok: true });
  })
);

// ===================== AUTOPLAY SETTINGS =====================

// Get autoplay settings
apiRouter.get(
  '/autoplay/settings',
  ah(async (_req, res) => {
    const enabled = await getSetting('autoplay.enabled');
    const delay = await getSetting('autoplay.delay');
    res.json({
      enabled: enabled === null ? false : enabled === 'true',
      delay: delay === null ? 5 : parseInt(delay, 10)
    });
  })
);

// Update autoplay settings (requires admin)
apiRouter.post(
  '/autoplay/settings',
  adminGuard,
  ah(async (req, res) => {
    const { enabled, delay } = req.body;
    
    if (typeof enabled === 'boolean') {
      await setSetting('autoplay.enabled', String(enabled));
    }
    if (typeof delay === 'number' && delay >= 0 && delay <= 60) {
      await setSetting('autoplay.delay', String(delay));
    }
    
    // Broadcast settings update to all clients
    const currentEnabled = await getSetting('autoplay.enabled');
    const currentDelay = await getSetting('autoplay.delay');
    
    postQueueUpdate('autoplay.settings', {
      enabled: currentEnabled === null ? false : currentEnabled === 'true',
      delay: currentDelay === null ? 5 : parseInt(currentDelay, 10)
    });
    
    res.json({ ok: true });
  })
);

// ===================== CLEAR DATABASE (FK-safe, verifiable) =====================

apiRouter.post(
  '/admin/clear-db',
  adminGuard,
  ah(async (_req, res) => {
    const [a1, t1, q1] = await Promise.all([
      query<{ c: string }>(`SELECT COUNT(*)::text AS c FROM artists`),
      query<{ c: string }>(`SELECT COUNT(*)::text AS c FROM tracks`),
      query<{ c: string }>(`SELECT COUNT(*)::text AS c FROM queue`),
    ]);

    await query(`
      TRUNCATE TABLE queue, tracks, artists
      RESTART IDENTITY
      CASCADE
    `);

    const [a2, t2, q2] = await Promise.all([
      query<{ c: string }>(`SELECT COUNT(*)::text AS c FROM artists`),
      query<{ c: string }>(`SELECT COUNT(*)::text AS c FROM tracks`),
      query<{ c: string }>(`SELECT COUNT(*)::text AS c FROM queue`),
    ]);

    res.json({
      ok: true,
      before: { artists: Number(a1.rows[0].c), tracks: Number(t1.rows[0].c), queue: Number(q1.rows[0].c) },
      after:  { artists: Number(a2.rows[0].c), tracks: Number(t2.rows[0].c), queue: Number(q2.rows[0].c) }
    });

    postQueueUpdate('queue.updated');
  })
);

// JSON error handler
apiRouter.use((err: any, _req, res, _next) => {
  console.error('API error:', err);
  res.status(500).json({ error: String(err?.message || err) });
});
