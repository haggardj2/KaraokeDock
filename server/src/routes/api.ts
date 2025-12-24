// server/src/routes/api.ts
import express from 'express';
import path from 'path';
import fs from 'fs/promises';
import { EventEmitter } from 'events';
import { query, ensureHelpfulIndexes, getSetting, setSetting, createSession, validateSession, deleteSession, cleanupExpiredSessions, hashPassword, verifyPassword } from '../db';
import { scanPath, getMediaDuration, getZipMp3Duration, extractTrackDuration } from '../scanner';
import QRCode from 'qrcode';
import { searchKaraokeNerds } from '../karaoke-nerds';
import crypto from 'crypto';

ensureHelpfulIndexes().catch(e => console.error('ensureHelpfulIndexes failed', e));

export const apiRouter = express.Router();

// Type for public settings that don't require authentication
interface PublicSettings {
  'libraries.local_enabled': boolean;
  'libraries.external_enabled': boolean;
  'requests.acceptance': 'local' | 'external' | 'disabled';
}

let postQueueUpdate: (type?: string, data?: any) => void = () => {};
export function setPostQueueUpdate(fn: (type?: string, data?: any) => void) {
  postQueueUpdate = typeof fn === 'function' ? fn : () => {};
}

const ah =
  (fn: express.RequestHandler): express.RequestHandler =>
  (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

// Session-based authentication guard
const sessionGuard: express.RequestHandler = async (req, res, next) => {
  const token = req.headers['x-session-token'] as string;
  if (!token) {
    res.status(403).json({ error: 'Forbidden: No session token provided' });
    return;
  }
  
  try {
    const isValid = await validateSession(token);
    if (isValid) {
      next();
      return;
    }
    
    res.status(403).json({ error: 'Forbidden: Invalid or expired session' });
  } catch (err) {
    console.error('sessionGuard error:', err);
    res.status(403).json({ error: 'Forbidden: Authentication error' });
  }
};

const toInt = (v: any): number | null => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
};

const validateKeyAdjustment = (keyAdjustment: number | null): boolean => {
  if (keyAdjustment === null || keyAdjustment === undefined) return true; // null/undefined is valid (defaults to 0)
  return keyAdjustment >= -6 && keyAdjustment <= 6;
};

apiRouter.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Clean up expired sessions periodically
setInterval(() => {
  cleanupExpiredSessions().catch(err => console.error('Failed to cleanup sessions:', err));
}, 60 * 60 * 1000); // Run every hour

// ===================== AUTHENTICATION =====================

// Admin/Host login endpoint - validates username/password and creates a session
apiRouter.post(
  '/auth/login',
  ah(async (req, res) => {
    const { username, password } = req.body;
    
    // Get stored username (defaults to 'admin')
    const storedUsername = await getSetting('admin.username');
    const adminUsername = storedUsername || process.env.ADMIN_USERNAME || 'admin';
    
    // Check database first, then fall back to env variable
    const storedPassword = await getSetting('admin.password');
    const adminPassword = storedPassword || process.env.ADMIN_PASSWORD || 'changeme-password';
    
    // Check username first
    if (username !== adminUsername) {
      res.status(401).json({ ok: false, message: 'Invalid credentials' });
      return;
    }
    
    // Verify password using bcrypt
    const isPasswordValid = await verifyPassword(password, adminPassword);
    
    if (isPasswordValid) {
      // Check if using default password by comparing hash
      // The default password 'changeme-password' hashed with bcrypt will have a specific pattern
      // We'll check if the stored password matches the plaintext default (for migration compatibility)
      const isDefaultPassword = adminPassword === 'changeme-password';
      
      // Create a session that expires in 30 days
      const sessionToken = await createSession(30);
      res.json({ ok: true, sessionToken, isDefaultPassword });
    } else {
      res.status(401).json({ ok: false, message: 'Invalid credentials' });
    }
  })
);

// Validate session endpoint - check if a session is still valid
apiRouter.get(
  '/auth/validate',
  ah(async (req, res) => {
    const token = req.headers['x-session-token'] as string;
    if (!token) {
      return res.status(401).json({ valid: false });
    }
    
    const isValid = await validateSession(token);
    res.json({ valid: isValid });
  })
);

// Logout endpoint - invalidate session
apiRouter.post(
  '/auth/logout',
  ah(async (req, res) => {
    const token = req.headers['x-session-token'] as string;
    if (token) {
      await deleteSession(token);
    }
    res.json({ ok: true });
  })
);

// Change password endpoint - requires valid session
apiRouter.post(
  '/auth/change-password',
  sessionGuard,
  ah(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new passwords are required' });
    }
    
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }
    
    // Verify current password
    const storedPassword = await getSetting('admin.password');
    const envPassword = storedPassword || process.env.ADMIN_PASSWORD || 'changeme-password';
    
    const isPasswordValid = await verifyPassword(currentPassword, envPassword);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    
    // Hash and save new password
    const hashedPassword = await hashPassword(newPassword);
    await setSetting('admin.password', hashedPassword);
    res.json({ ok: true });
  })
);

// Change username endpoint - requires valid session
apiRouter.post(
  '/auth/change-username',
  sessionGuard,
  ah(async (req, res) => {
    const { currentPassword, newUsername } = req.body;
    
    if (!currentPassword || !newUsername) {
      return res.status(400).json({ error: 'Current password and new username are required' });
    }
    
    if (newUsername.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters long' });
    }
    
    // Verify current password
    const storedPassword = await getSetting('admin.password');
    const envPassword = storedPassword || process.env.ADMIN_PASSWORD || 'changeme-password';
    
    const isPasswordValid = await verifyPassword(currentPassword, envPassword);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    
    // Save new username
    await setSetting('admin.username', newUsername);
    res.json({ ok: true });
  })
);

// Username/password admin login endpoint (session-based)
apiRouter.post(
  '/admin/login',
  ah(async (req, res) => {
    const { username, password } = req.body;
    
    const storedUsername = await getSetting('admin.username');
    const adminUsername = storedUsername || process.env.ADMIN_USERNAME || 'admin';
    
    const storedPassword = await getSetting('admin.password');
    const adminPassword = storedPassword || process.env.ADMIN_PASSWORD || 'changeme-password';
    
    // Check username first
    if (username !== adminUsername) {
      res.status(401).json({ ok: false, message: 'Invalid credentials' });
      return;
    }
    
    // Verify password using bcrypt
    const isPasswordValid = await verifyPassword(password, adminPassword);
    
    if (isPasswordValid) {
      res.json({ ok: true });
    } else {
      res.status(401).json({ ok: false, message: 'Invalid credentials' });
    }
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
  sessionGuard,
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
  sessionGuard,
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
  sessionGuard,
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
  sessionGuard,
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

apiRouter.get(
  '/search',
  ah(async (req, res) => {
    // Check if local library is enabled
    const localLibraryEnabled = await getSetting('libraries.local_enabled');
    if (localLibraryEnabled === false) {
      return res.status(403).json({ error: 'Local library search is disabled' });
    }
    
    const q = String(req.query.q ?? '').trim();
    const kindFilter = req.query.kind as string | undefined;
    const libraryIdFilter = req.query.library_id ? Number(req.query.library_id) : undefined;
    
    if (!q) return res.json([]);

    // Build filter conditions
    let filterConditions = '';
    const queryParams: any[] = [q];
    let paramIndex = 2;

    if (kindFilter && (kindFilter === 'mp4' || kindFilter === 'cdgmp3')) {
      filterConditions += ` AND t.kind = $${paramIndex}`;
      queryParams.push(kindFilter);
      paramIndex++;
    }

    if (libraryIdFilter !== undefined) {
      filterConditions += ` AND t.library_id = $${paramIndex}`;
      queryParams.push(libraryIdFilter);
      paramIndex++;
    }

    try {
      // Enhanced search with better ranking
      // Priority order:
      // 1. Exact title match (highest)
      // 2. Title starts with query
      // 3. Exact artist match
      // 4. Artist starts with query
      // 5. Full-text search match in title
      // 6. Partial match in title or artist
      // 7. Disc ID match
      const searchResults = await query(
        `
        WITH ranked_results AS (
          SELECT DISTINCT ON (t.id)
                 t.id,
                 t.title,
                 t.disc_id,
                 t.kind,
                 a.name AS artist,
                 CASE
                   -- Exact title match (case-insensitive)
                   WHEN LOWER(t.title) = LOWER($1) THEN 1
                   -- Title starts with query
                   WHEN LOWER(t.title) LIKE LOWER($1) || '%' THEN 2
                   -- Exact artist match
                   WHEN LOWER(a.name) = LOWER($1) THEN 3
                   -- Artist starts with query
                   WHEN LOWER(a.name) LIKE LOWER($1) || '%' THEN 4
                   -- Full-text search in title
                   WHEN to_tsvector('english', COALESCE(t.title,'')) @@ plainto_tsquery('english', $1) THEN 5
                   -- Contains query in title
                   WHEN LOWER(t.title) LIKE '%' || LOWER($1) || '%' THEN 6
                   -- Contains query in artist
                   WHEN LOWER(a.name) LIKE '%' || LOWER($1) || '%' THEN 7
                   -- Disc ID match
                   WHEN t.disc_id ILIKE '%' || $1 || '%' THEN 8
                   ELSE 9
                 END AS rank
            FROM tracks t
            LEFT JOIN artists a ON a.id = t.artist_id
           WHERE (
                   LOWER(t.title) LIKE '%' || LOWER($1) || '%'
                   OR LOWER(a.name) LIKE '%' || LOWER($1) || '%'
                   OR t.disc_id ILIKE '%' || $1 || '%'
                   OR to_tsvector('english', COALESCE(t.title,'')) @@ plainto_tsquery('english', $1)
                 )
                 ${filterConditions}
        )
        SELECT id, title, disc_id, kind, artist
          FROM ranked_results
         ORDER BY rank ASC, 
                  LOWER(artist) NULLS LAST, 
                  LOWER(title)
         LIMIT 100
        `,
        queryParams
      );
      
      return res.json(searchResults.rows);
    } catch (err) {
      console.error('Search error:', err);
      
      // Fallback to simple ILIKE search
      const like = await query(
        `
        SELECT t.id,
               t.title,
               t.disc_id,
               t.kind,
               a.name AS artist
          FROM tracks t
          LEFT JOIN artists a ON a.id = t.artist_id
         WHERE (t.title ILIKE '%' || $1 || '%'
            OR a.name ILIKE '%' || $1 || '%'
            OR t.disc_id ILIKE '%' || $1 || '%')
            ${filterConditions}
         ORDER BY a.name NULLS LAST, t.title
         LIMIT 100
        `,
        queryParams
      );
      return res.json(like.rows);
    }
  })
);

// ===================== KARAOKE NERDS SEARCH =====================

apiRouter.get(
  '/karaoke-nerds/search',
  ah(async (req, res) => {
    // Check if external library is enabled
    const externalLibraryEnabled = await getSetting('libraries.external_enabled');
    if (externalLibraryEnabled === false) {
      return res.status(403).json({ error: 'External library search is disabled' });
    }
    
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
    // Check if external library is enabled
    const externalLibraryEnabled = await getSetting('libraries.external_enabled');
    if (externalLibraryEnabled === false) {
      return res.status(403).json({ error: 'External library is disabled' });
    }
    
    const { title, artist, url, requestedBy, keyAdjustment } = req.body;
    
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

    const keyAdj = toInt(keyAdjustment) ?? 0;
    if (!validateKeyAdjustment(keyAdj)) {
      return res.status(400).send('keyAdjustment must be between -6 and 6');
    }

    // Try to insert with key_adjustment if the column exists
    try {
      const r = await query(
        `INSERT INTO queue(track_id, requested_by, status, position, key_adjustment)
         VALUES ($1,$2,'queued',$3,$4)
         RETURNING id, track_id, requested_by, status, position, key_adjustment, created_at`,
        [track.id, requestedBy || null, position, keyAdj]
      );
      res.json(r.rows[0]);
      postQueueUpdate('queue.updated');
      return;
    } catch (err: any) {
      // If key_adjustment column doesn't exist, fall back to insert without it
      // PostgreSQL error code 42703 = undefined_column
      const isColumnNotFound = 
        err?.code === '42703' || 
        (err?.message?.includes('key_adjustment') && err?.message?.includes('does not exist'));
      
      if (isColumnNotFound) {
        console.warn('key_adjustment column does not exist in queue table, inserting without it');
        const r = await query(
          `INSERT INTO queue(track_id, requested_by, status, position)
           VALUES ($1,$2,'queued',$3)
           RETURNING id, track_id, requested_by, status, position, created_at`,
          [track.id, requestedBy || null, position]
        );
        res.json(r.rows[0]);
        postQueueUpdate('queue.updated');
        return;
      }
      // Re-throw if it's a different error
      throw err;
    }
  })
);

// Get video metadata from URL (title, etc.)
apiRouter.get(
  '/video-metadata',
  ah(async (req, res) => {
    const url = String(req.query.url ?? '').trim();
    if (!url) {
      return res.status(400).json({ error: 'url parameter required' });
    }

    try {
      const { getYouTubeTitle } = await import('../karaoke-nerds');
      const title = await getYouTubeTitle(url);
      
      if (title) {
        res.json({ title });
      } else {
        // Fallback: extract from URL
        const fallbackTitle = url.split('/').pop()?.split('?')[0] || 'Video';
        res.json({ title: fallbackTitle });
      }
    } catch (err) {
      console.error('Error fetching video metadata:', err);
      // Fallback: extract from URL
      const fallbackTitle = url.split('/').pop()?.split('?')[0] || 'Video';
      res.json({ title: fallbackTitle });
    }
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
        // Parse zip://path#entry format - split at .zip# to handle # in filenames
        const ZIP_EXT = '.zip';
        const ZIP_SEPARATOR = '.zip#';
        const withoutPrefix = p.replace(/^zip:\/\//, '');
        const separatorIdx = withoutPrefix.indexOf(ZIP_SEPARATOR);
        const zipPath = separatorIdx >= 0 ? withoutPrefix.substring(0, separatorIdx + ZIP_EXT.length) : withoutPrefix;
        const inner = separatorIdx >= 0 ? withoutPrefix.substring(separatorIdx + ZIP_SEPARATOR.length) : '';
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
  sessionGuard,
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
             q.key_adjustment,
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
    const keyAdjustment = toInt(req.body?.keyAdjustment) ?? 0;
    if (trackId == null) return res.status(400).send('trackId required');
    if (!validateKeyAdjustment(keyAdjustment)) return res.status(400).send('keyAdjustment must be between -6 and 6');

    // Check if the track is from local library or external
    const trackInfo = await query<{ source: string | null }>(
      'SELECT source FROM tracks WHERE id = $1',
      [trackId]
    );
    
    if (trackInfo.rows.length === 0) {
      return res.status(404).send('Track not found');
    }
    
    const track = trackInfo.rows[0];
    const isExternal = track.source && track.source !== 'local';
    
    // Check library settings
    if (isExternal) {
      const externalLibraryEnabled = await getSetting('libraries.external_enabled');
      if (externalLibraryEnabled === false) {
        return res.status(403).json({ error: 'External library is disabled' });
      }
    } else {
      const localLibraryEnabled = await getSetting('libraries.local_enabled');
      if (localLibraryEnabled === false) {
        return res.status(403).json({ error: 'Local library is disabled' });
      }
    }

    const posr = await query<{ p: number }>(`SELECT COALESCE(MAX(position),0)+1 AS p FROM queue`);
    const position = (posr.rows[0] as any).p;

    // Try to insert with key_adjustment if the column exists
    try {
      const r = await query(
        `INSERT INTO queue(track_id, requested_by, status, position, key_adjustment)
         VALUES ($1,$2,'queued',$3,$4)
         RETURNING id, track_id, requested_by, status, position, key_adjustment, created_at`,
        [trackId, requestedBy, position, keyAdjustment]
      );
      res.json(r.rows[0]);
    } catch (err: any) {
      // If key_adjustment column doesn't exist, fall back to insert without it
      // PostgreSQL error code 42703 = undefined_column
      const isColumnNotFound = 
        err?.code === '42703' || 
        (err?.message?.includes('key_adjustment') && err?.message?.includes('does not exist'));
      
      if (isColumnNotFound) {
        console.warn('key_adjustment column does not exist in queue table, inserting without it');
        const r = await query(
          `INSERT INTO queue(track_id, requested_by, status, position)
           VALUES ($1,$2,'queued',$3)
           RETURNING id, track_id, requested_by, status, position, created_at`,
          [trackId, requestedBy, position]
        );
        res.json(r.rows[0]);
      } else {
        // Re-throw if it's a different error
        throw err;
      }
    }
    
    // Notify clients about the queue update
    postQueueUpdate('queue.updated');
    
    // Get track details for pre-caching and duration extraction
    const trackDetails = await query(
      `SELECT t.id, t.title, t.kind, t.file_mp4, t.file_mp3, t.file_cdg, t.path, t.duration_ms, a.name AS artist
       FROM tracks t
       LEFT JOIN artists a ON a.id = t.artist_id
       WHERE t.id = $1`,
      [trackId]
    );
    
    if (trackDetails.rows.length) {
      const track = trackDetails.rows[0];
      
      // If duration_ms is missing, try to extract it
      if (track.duration_ms === null) {
        const extractedDuration = await extractTrackDuration(track);
        
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
          // Parse zip://path#entry format - split at .zip# to handle # in filenames
          const ZIP_EXT = '.zip';
          const ZIP_SEPARATOR = '.zip#';
          const cdgWithoutPrefix = track.file_cdg.replace('zip://', '');
          const mp3WithoutPrefix = track.file_mp3.replace('zip://', '');
          
          const cdgSeparatorIdx = cdgWithoutPrefix.indexOf(ZIP_SEPARATOR);
          const mp3SeparatorIdx = mp3WithoutPrefix.indexOf(ZIP_SEPARATOR);
          
          const zipPath = cdgSeparatorIdx >= 0 ? cdgWithoutPrefix.substring(0, cdgSeparatorIdx + ZIP_EXT.length) : cdgWithoutPrefix;
          const cdgEntry = cdgSeparatorIdx >= 0 ? cdgWithoutPrefix.substring(cdgSeparatorIdx + ZIP_SEPARATOR.length) : '';
          const mp3Entry = mp3SeparatorIdx >= 0 ? mp3WithoutPrefix.substring(mp3SeparatorIdx + ZIP_SEPARATOR.length) : '';
          
          fetch(`http://localhost:${process.env.PORT || 5174}/media/precache`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              file: zipPath,
              cdg: cdgEntry,
              mp3: mp3Entry,
              requestedBy,
              title: track.title,
              artist: track.artist
            })
          }).catch(err => console.error('Pre-cache request failed:', err));
        }
      }
    }
  })
);

apiRouter.post(
  '/queue/reorder',
  sessionGuard,
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
  sessionGuard,
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
  '/queue/update-key',
  sessionGuard,
  ah(async (req, res) => {
    const id = toInt(req.body?.id);
    const keyAdjustment = toInt(req.body?.keyAdjustment);
    if (id == null) return res.status(400).send('id required');
    if (keyAdjustment == null) return res.status(400).send('keyAdjustment required');
    if (!validateKeyAdjustment(keyAdjustment)) return res.status(400).send('keyAdjustment must be between -6 and 6');

    await query(`UPDATE queue SET key_adjustment = $1 WHERE id = $2`, [keyAdjustment, id]);
    res.json({ ok: true });
    postQueueUpdate('queue.updated');
  })
);

apiRouter.post(
  '/queue/delete',
  sessionGuard,
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
  sessionGuard,
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
  sessionGuard,
  ah(async (req, res) => {
    const id = toInt(req.body?.id ?? null);
    
    // First, determine which track will be played and ensure duration_ms is populated
    let trackToPlay: any = null;
    if (id != null) {
      const result = await query(`
        SELECT q.id, q.track_id, q.key_adjustment, t.duration_ms, t.kind, t.file_mp4, t.file_mp3, t.file_cdg
        FROM queue q
        JOIN tracks t ON t.id = q.track_id
        WHERE q.id = $1
      `, [id]);
      if (result.rows.length > 0) {
        trackToPlay = result.rows[0];
      }
    } else {
      // Get the top queued song
      const result = await query(`
        SELECT q.id, q.track_id, q.key_adjustment, t.duration_ms, t.kind, t.file_mp4, t.file_mp3, t.file_cdg
        FROM queue q
        JOIN tracks t ON t.id = q.track_id
        ORDER BY q.position
        LIMIT 1
      `);
      if (result.rows.length > 0) {
        trackToPlay = result.rows[0];
      }
    }
    
    // If we have a track to play with pitch adjustment or missing duration, ensure duration is cached
    if (trackToPlay) {
      const hasPitchAdjustment = trackToPlay.key_adjustment && trackToPlay.key_adjustment !== 0;
      const needsDuration = trackToPlay.duration_ms === null;
      
      // Extract duration if:
      // 1. Duration is missing (null), OR
      // 2. Pitch adjustment is applied (to ensure accurate duration is cached before re-encoding)
      if (needsDuration || hasPitchAdjustment) {
        console.log(`Track ${trackToPlay.track_id}: Ensuring duration is cached (hasPitch=${hasPitchAdjustment}, needsDuration=${needsDuration})`);
        
        const extractedDuration = await extractTrackDuration({
          kind: trackToPlay.kind,
          file_mp4: trackToPlay.file_mp4,
          file_mp3: trackToPlay.file_mp3
        });
        
        if (extractedDuration !== null && needsDuration) {
          console.log(`Caching duration for track ${trackToPlay.track_id}: ${extractedDuration}ms (${Math.round(extractedDuration / 1000)}s)`);
          await query('UPDATE tracks SET duration_ms = $1 WHERE id = $2', [extractedDuration, trackToPlay.track_id]);
        } else if (extractedDuration !== null) {
          console.log(`Duration already cached for track ${trackToPlay.track_id}: ${trackToPlay.duration_ms}ms (will be used for pitch-shifted playback)`);
        }
      }
    }
    
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
  sessionGuard,
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
  sessionGuard,
  ah(async (_req, res) => {
    await query(`UPDATE queue SET status = 'queued' WHERE status = 'playing'`);
    postQueueUpdate('player.stop');
    res.json({ ok: true });
  })
);

// Track song state for autoplay logic
const songState = new Map<number | string, {
  hasFinished: boolean;
  autoplayScheduled: boolean;
}>();

// Track initial autoplay state to prevent duplicate triggers
let initialAutoplayScheduled = false;
let lastQueueCheck = 0;

// Constants for initial autoplay timing
const INITIAL_AUTOPLAY_CHECK_INTERVAL_MS = 2000; // Check every 2 seconds
const INITIAL_AUTOPLAY_DEBOUNCE_MS = 3000; // Minimum time between scheduling attempts

// Helper function to check if initial autoplay conditions are met
async function checkInitialAutoplayConditions(): Promise<{ 
  shouldAutoplay: boolean; 
  autoplayEnabled: boolean;
  hasPlayingSong: boolean;
  hasQueuedSongs: boolean;
}> {
  const autoplayEnabled = await getSetting('autoplay.enabled');
  const isEnabled = autoplayEnabled === 'true';
  
  const currentlyPlaying = await query<{ id: number }>(`
    SELECT id FROM queue WHERE status = 'playing' LIMIT 1
  `);
  const hasPlayingSong = currentlyPlaying.rows.length > 0;
  
  const queuedSongs = await query<{ id: number }>(`
    SELECT id FROM queue WHERE status = 'queued' ORDER BY position LIMIT 1
  `);
  const hasQueuedSongs = queuedSongs.rows.length > 0;
  
  return {
    shouldAutoplay: isEnabled && !hasPlayingSong && hasQueuedSongs,
    autoplayEnabled: isEnabled,
    hasPlayingSong,
    hasQueuedSongs
  };
}

// Periodic check for initial autoplay - starts first song if:
// 1. No song is playing
// 2. Autoplay is enabled  
// 3. There are songs in queue
// 4. Enough time has passed since last check
setInterval(async () => {
  try {
    const now = Date.now();
    
    // Skip check if autoplay was recently scheduled to avoid unnecessary queries
    if (initialAutoplayScheduled && (now - lastQueueCheck) < INITIAL_AUTOPLAY_DEBOUNCE_MS) {
      return;
    }
    
    const conditions = await checkInitialAutoplayConditions();
    
    // Reset flag if conditions no longer met
    if (!conditions.autoplayEnabled || conditions.hasPlayingSong || !conditions.hasQueuedSongs) {
      initialAutoplayScheduled = false;
      return;
    }
    
    // Schedule initial autoplay if not already scheduled
    if (!initialAutoplayScheduled && conditions.shouldAutoplay) {
      initialAutoplayScheduled = true;
      lastQueueCheck = now;
      
      const delayStr = await getSetting('autoplay.delay');
      const delay = delayStr ? parseInt(delayStr, 10) : 5;
      
      console.log(`Initial autoplay: Waiting ${delay}s before starting first song...`);
      
      setTimeout(async () => {
        try {
          // Double-check conditions before starting song
          const stillValid = await checkInitialAutoplayConditions();
          
          if (!stillValid.shouldAutoplay) {
            console.log('Initial autoplay: Conditions changed, skipping');
            initialAutoplayScheduled = false;
            return;
          }
          
          // Start playing the first queued song with proper transaction handling
          try {
            await query('BEGIN');
            const result = await query<{ id: number }>(`
              UPDATE queue SET status = 'playing'
              WHERE id = (
                SELECT id FROM queue
                WHERE status = 'queued'
                ORDER BY position
                LIMIT 1
              )
              RETURNING id
            `);
            await query('COMMIT');
            
            if (result.rows.length > 0) {
              console.log(`Initial autoplay: Started first song (ID: ${result.rows[0].id})`);
              postQueueUpdate('player.play');
            }
          } catch (dbErr) {
            await query('ROLLBACK');
            throw dbErr;
          }
          
          initialAutoplayScheduled = false;
        } catch (err) {
          console.error('Initial autoplay error:', err);
          initialAutoplayScheduled = false;
        }
      }, delay * 1000);
    }
  } catch (err) {
    console.error('Initial autoplay check error:', err);
    initialAutoplayScheduled = false;
  }
}, INITIAL_AUTOPLAY_CHECK_INTERVAL_MS);

// Helper function to normalize queue ID to a number
function normalizeQueueId(queueId: number | string): number | null {
  if (typeof queueId === 'number') {
    return queueId;
  }
  
  // Use stricter validation for string inputs
  const parsed = parseInt(queueId, 10);
  
  // Ensure the parsed value is valid and the string representation matches
  // This prevents cases like '123abc' being parsed as 123
  if (isNaN(parsed) || String(parsed) !== String(queueId).trim()) {
    return null;
  }
  
  return parsed;
}

// Helper function to safely delete a finished song from queue
async function deleteFinishedSong(queueId: number | string): Promise<boolean> {
  try {
    // Normalize to number
    const id = normalizeQueueId(queueId);
    
    if (id === null) {
      console.warn(`Invalid queueId for deletion: ${queueId}`);
      return false;
    }
    
    // Check if song still exists before deleting
    const checkResult = await query<{ id: number }>(`
      SELECT id FROM queue WHERE id = $1
    `, [id]);
    
    if (checkResult.rows.length > 0) {
      await query('DELETE FROM queue WHERE id = $1', [id]);
      console.log(`Deleted finished song ${id}`);
      return true;
    } else {
      console.log(`Song ${id} was already removed`);
      return false;
    }
  } catch (err) {
    console.error(`Error deleting finished song ${queueId}:`, err);
    throw err;
  }
}

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
    
    // Server-side autoplay logic: detect when song is finished
    const SONG_END_TOLERANCE = 1; // Same as Host page
    const songFinished = currentTime >= duration - SONG_END_TOLERANCE;
    
    if (songFinished && queueId != null) {
      // Normalize queueId to a consistent type for Map lookups
      const normalizedQueueId = normalizeQueueId(queueId);
      
      // Skip if the ID is invalid
      if (normalizedQueueId === null) {
        console.warn(`Invalid queueId received: ${queueId}`);
        return res.json({ ok: true });
      }
      
      // Get or initialize state for this song
      const state = songState.get(normalizedQueueId) || { hasFinished: false, autoplayScheduled: false };
      
      // Only trigger autoplay once per song
      if (!state.hasFinished && !state.autoplayScheduled) {
        state.hasFinished = true;
        state.autoplayScheduled = true;
        songState.set(normalizedQueueId, state);
        
        // Check if autoplay is enabled
        const autoplayEnabled = await getSetting('autoplay.enabled');
        const isEnabled = autoplayEnabled === 'true';
        
        if (isEnabled) {
          const delayStr = await getSetting('autoplay.delay');
          const delay = delayStr ? parseInt(delayStr, 10) : 5;
          
          console.log(`Song ${normalizedQueueId} finished. Autoplay enabled, deleting finished song and waiting ${delay}s before next song...`);
          
          // IMMEDIATELY delete the finished song so Player page shows countdown
          try {
            const songStillExisted = await deleteFinishedSong(normalizedQueueId);
            
            if (!songStillExisted) {
              // Song was already removed, don't schedule autoplay
              songState.delete(normalizedQueueId);
              console.log(`Autoplay: Song ${normalizedQueueId} was already removed, skipping autoplay`);
              postQueueUpdate('queue.updated');
              return res.json({ ok: true });
            }
            
            // Notify clients that queue has updated (finished song removed)
            postQueueUpdate('queue.updated');
            
            // Wait for configured delay, then advance to next song
            setTimeout(async () => {
              try {
                await query('BEGIN');
                
                // Check if there's already a song playing (could happen if user manually advanced)
                const currentlyPlaying = await query<{ id: number }>(`
                  SELECT id FROM queue WHERE status = 'playing' LIMIT 1
                `);
                
                if (currentlyPlaying.rows.length > 0) {
                  // Another song is already playing, don't start a new one
                  await query('COMMIT');
                  songState.delete(normalizedQueueId);
                  console.log(`Autoplay: Another song is already playing (ID: ${currentlyPlaying.rows[0].id}), skipping autoplay`);
                  return;
                }
                
                // Play the next queued song
                const result = await query<{ id: number }>(`
                  UPDATE queue SET status = 'playing'
                  WHERE id = (
                    SELECT id FROM queue
                    WHERE status = 'queued'
                    ORDER BY position
                    LIMIT 1
                  )
                  RETURNING id
                `);
                
                await query('COMMIT');
                
                // Clean up state for the finished song
                songState.delete(normalizedQueueId);
                
                if (result.rows.length > 0) {
                  console.log(`Autoplay: Started next song (ID: ${result.rows[0].id})`);
                  postQueueUpdate('player.next');
                } else {
                  console.log('Autoplay: No more songs in queue');
                  postQueueUpdate('queue.updated');
                }
              } catch (err) {
                await query('ROLLBACK');
                console.error('Autoplay error:', err);
                songState.delete(normalizedQueueId);
              }
            }, delay * 1000);
          } catch (err) {
            console.error('Error deleting finished song for autoplay:', err);
          }
        } else {
          console.log(`Song ${normalizedQueueId} finished but autoplay is disabled`);
          // Still delete the finished song even if autoplay is disabled
          try {
            const deleted = await deleteFinishedSong(normalizedQueueId);
            songState.delete(normalizedQueueId);
            if (deleted) {
              postQueueUpdate('queue.updated');
            }
          } catch (err) {
            console.error('Error in autoplay-disabled song cleanup:', err);
            // If deletion fails, still clean up state and notify clients
            // The song may have been manually removed already
            songState.delete(normalizedQueueId);
            postQueueUpdate('queue.updated');
          }
        }
      }
    }
    
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
  sessionGuard,
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
  sessionGuard,
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
  sessionGuard,
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

// ===================== YT-DLP OPERATIONS =====================

// Get yt-dlp version
apiRouter.get(
  '/admin/ytdlp/version',
  sessionGuard,
  ah(async (req, res) => {
    const { getYtDlpVersion } = await import('../ytdlp');
    const version = await getYtDlpVersion();
    res.json({ version });
  })
);

// Update yt-dlp
apiRouter.post(
  '/admin/ytdlp/update',
  sessionGuard,
  ah(async (req, res) => {
    const { updateYtDlp } = await import('../ytdlp');
    const result = await updateYtDlp();
    res.json(result);
  })
);

// Download video using yt-dlp
apiRouter.post(
  '/admin/ytdlp/download',
  sessionGuard,
  ah(async (req, res) => {
    const { url, format, title, artist, brand, discId } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    // Check if downloads are allowed
    const allowDownloads = await getSetting('ytdlp.allow_downloads');
    if (allowDownloads === false) {
      return res.status(403).json({ error: 'Downloads are disabled' });
    }
    
    const { downloadVideo, addDownloadedFileToDatabase } = await import('../ytdlp');
    
    // Download the video
    const result = await downloadVideo(url, { format, title, artist, brand, discId });
    
    if (result.success && result.filePath) {
      // Add the downloaded file to the database
      const dbResult = await addDownloadedFileToDatabase(result.filePath);
      
      res.json({ 
        ok: true, 
        filePath: result.filePath,
        parsed: result.parsed,
        trackId: dbResult.trackId,
        message: result.message,
        dbMessage: dbResult.message
      });
    } else {
      res.status(500).json({ error: result.message });
    }
  })
);

// Scan download location
apiRouter.post(
  '/admin/ytdlp/scan',
  sessionGuard,
  ah(async (req, res) => {
    const { scanDownloadLocation } = await import('../ytdlp');
    const result = await scanDownloadLocation();
    res.json(result);
  })
);

// Get video info
apiRouter.post(
  '/admin/ytdlp/info',
  sessionGuard,
  ah(async (req, res) => {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    const { getVideoInfo } = await import('../ytdlp');
    try {
      const info = await getVideoInfo(url);
      res.json({ ok: true, info });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  })
);

// ===================== SETTINGS MANAGEMENT =====================

// Get public settings (no authentication required - for guest features like Requests page)
apiRouter.get(
  '/settings/public',
  ah(async (req, res) => {
    // Only return settings that are safe for public access
    const publicKeys: Array<keyof PublicSettings> = [
      'libraries.local_enabled',
      'libraries.external_enabled',
      'requests.acceptance'
    ];
    
    const result = await query('SELECT key, value FROM settings WHERE key = ANY($1)', [publicKeys]);
    const settings: Partial<PublicSettings> = {};
    for (const row of result.rows) {
      settings[row.key as keyof PublicSettings] = row.value;
    }
    
    // Set defaults for missing settings
    const completeSettings: PublicSettings = {
      'libraries.local_enabled': settings['libraries.local_enabled'] ?? true,
      'libraries.external_enabled': settings['libraries.external_enabled'] ?? true,
      'requests.acceptance': settings['requests.acceptance'] ?? 'local'
    };
    
    res.json(completeSettings);
  })
);

// Get all settings (admin only)
apiRouter.get(
  '/admin/settings',
  sessionGuard,
  ah(async (req, res) => {
    const result = await query('SELECT key, value FROM settings ORDER BY key');
    const settings: Record<string, any> = {};
    for (const row of result.rows) {
      settings[row.key] = row.value;
    }
    res.json(settings);
  })
);

// Update a setting (admin only)
apiRouter.put(
  '/admin/settings/:key',
  sessionGuard,
  ah(async (req, res) => {
    const { key } = req.params;
    const { value } = req.body;
    
    if (!key) {
      return res.status(400).json({ error: 'Setting key is required' });
    }
    
    await setSetting(key, value);
    res.json({ ok: true });
  })
);

// JSON error handler
apiRouter.use((err: any, _req, res, _next) => {
  console.error('API error:', err);
  res.status(500).json({ error: String(err?.message || err) });
});
