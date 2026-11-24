import express, { type RequestHandler, type Router } from 'express';
import { resolveQueueRequester } from '../authenticatedSinger.js';
import { query } from '../db.js';
import { logger } from '../logger.js';
import { isSongQueuedByOtherSinger } from '../queueDuplicates.js';
import { ensureSingerInActiveRotation } from '../queueIdentity.js';
import { getKarafunConfig, saveKarafunConfig } from './config.js';
import { hashKarafunPassword } from './crypto.js';
import {
  progressiveKitService,
  streamProgressiveFile,
} from './progressive.js';
import { audioFromFrame, clampKey, karafunPreparedService } from './prepared.js';
import {
  KarafunDisabledError,
  KarafunNotConfiguredError,
  KarafunPreviewError,
  karafunService,
} from './service.js';

export interface KarafunRouteDeps {
  adminGuard: RequestHandler;
  searchLimiter: RequestHandler;
  mediaLimiter: RequestHandler;
  queueLimiter: RequestHandler;
  postQueueUpdate: (type?: string, data?: any) => void;
  resortQueueByRotation: () => Promise<void>;
}

const asyncHandler =
  (handler: (req: express.Request, res: express.Response) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(handler(req, res)).catch(next);
  };

const MAX_QUERY_LENGTH = 120;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function parseSongId(value: unknown): number | null {
  const songId = typeof value === 'number' ? value : Number(value);
  return Number.isSafeInteger(songId) && songId > 0 ? songId : null;
}

function parseFileType(value: unknown): number | null {
  const type = typeof value === 'number' ? value : Number(value);
  return Number.isSafeInteger(type) && type > 0 ? type : null;
}

async function isKnownKarafunTrack(songId: number): Promise<boolean> {
  const known = await query<{ id: number }>(
    `SELECT id FROM tracks WHERE source = 'karafun' AND external_url = $1 LIMIT 1`,
    [`karafun:${songId}`],
  );
  return known.rows.length > 0;
}

/** A single "bytes=start-end" range, clamped to the body; null when absent. */
export function parseByteRange(
  header: string | undefined,
  size: number,
): { start: number; end: number } | null | 'invalid' {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match || (match[1] === '' && match[2] === '')) return null;
  let start: number;
  let end: number;
  if (match[1] === '') {
    // "bytes=-N": the last N bytes.
    start = Math.max(0, size - Number(match[2]));
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] === '' ? size - 1 : Math.min(Number(match[2]), size - 1);
  }
  if (start >= size || start > end) return 'invalid';
  return { start, end };
}

function sendPublicError(
  res: express.Response,
  error: unknown,
  fallback: string,
): express.Response {
  if (error instanceof KarafunDisabledError) {
    return res.status(403).json({ error: error.message });
  }
  if (error instanceof KarafunNotConfiguredError) {
    return res.status(503).json({ error: 'KaraFun is not configured' });
  }
  if (error instanceof KarafunPreviewError) {
    return res.status(403).json({ error: error.message });
  }
  logger.warn(`KaraFun request failed: ${errorMessage(error)}`);
  return res.status(502).json({ error: fallback });
}

export function createKarafunRoutes(deps: KarafunRouteDeps): Router {
  const router = express.Router();

  // -----------------------------------------------------------------------
  // Public search: gated by libraries.karafun_enabled.
  // -----------------------------------------------------------------------
  router.get(
    '/karafun/search',
    deps.searchLimiter,
    asyncHandler(async (req, res) => {
      if (!(await karafunService.isEnabled())) {
        return res.status(403).json({ error: 'KaraFun is disabled' });
      }
      const q = String(req.query.q ?? '').trim();
      if (q.length > MAX_QUERY_LENGTH) {
        return res.status(400).json({ error: `Search text must be ${MAX_QUERY_LENGTH} characters or fewer` });
      }
      if (!q) return res.json([]);
      const limit = Math.min(50, Math.max(1, Number(req.query.limit ?? 20) || 20));
      try {
        return res.json(await karafunService.search(q, limit));
      } catch (error) {
        return sendPublicError(res, error, 'KaraFun search failed');
      }
    }),
  );

  // -----------------------------------------------------------------------
  // Add a KaraFun song to the queue. Only the descriptor is checked here;
  // media is streamed later when the Player mounts KarafunStage.
  // -----------------------------------------------------------------------
  router.post(
    '/karafun/add',
    deps.queueLimiter,
    asyncHandler(async (req, res) => {
      if (!(await karafunService.isEnabled())) {
        return res.status(403).json({ error: 'KaraFun is disabled' });
      }

      const songId = parseSongId(req.body?.songId);
      if (songId === null) return res.status(400).json({ error: 'songId is required' });

      const keyAdjustment = Number(req.body?.keyAdjustment ?? 0);
      if (!Number.isInteger(keyAdjustment) || keyAdjustment < -6 || keyAdjustment > 6) {
        return res.status(400).json({ error: 'keyAdjustment must be between -6 and 6' });
      }

      const singer = await resolveQueueRequester(req.headers['x-session-token'], req.body);

      let prepared: Awaited<ReturnType<typeof karafunService.prepareTrack>>;
      try {
        prepared = await karafunService.prepareTrack(songId);
      } catch (error) {
        if (error instanceof KarafunPreviewError) {
          return res.status(403).json({ error: error.message });
        }
        return sendPublicError(res, error, 'KaraFun media could not be prepared');
      }

      const trackId = Number(prepared.track.id);
      const singerId = singer?.id ?? null;

      if (singerId) {
        const duplicate = await query<{ id: number }>(
          `SELECT id FROM queue
            WHERE singer_id = $1 AND track_id = $2 AND status IN ('queued', 'playing')
            LIMIT 1`,
          [singerId, trackId],
        );
        if (duplicate.rows.length > 0) {
          return res.status(409).json({ error: 'You have already requested this song' });
        }
        await ensureSingerInActiveRotation(singerId);
      }

      const queuedByOther = await isSongQueuedByOtherSinger(trackId, {
        singerId,
        requestedBy: singer?.display_name ?? null,
      });

      const positionResult = await query<{ p: number }>(
        'SELECT COALESCE(MAX(position),0)+1 AS p FROM queue',
      );
      const position = Number(positionResult.rows[0]?.p ?? 1);

      const result = await query(
        `INSERT INTO queue(track_id, requested_by, singer_id, status, position, key_adjustment)
         VALUES ($1,$2,$3,'queued',$4,$5)
         RETURNING id, track_id, requested_by, singer_id, status, position, key_adjustment, created_at`,
        [trackId, singer?.display_name ?? null, singerId, position, keyAdjustment],
      );

      await deps.resortQueueByRotation();
      deps.postQueueUpdate('queue.updated');
      // Download and mix now, so the song is ready to play by the time it comes up.
      karafunPreparedService.prepareInBackground(songId, keyAdjustment);

      logger.info(
        `KaraFun song queued: ${prepared.detail.artist} - ${prepared.detail.title} (song ${songId}, track ${trackId})`,
      );
      return res.json({ ...result.rows[0], queuedByOther });
    }),
  );

  // -----------------------------------------------------------------------
  // Progressive Level-2 playback:
  //   manifest: waits only for the XML chunk, then returns tracks + lyrics
  //   audio:    streams each Ogg logical file as chunks arrive (Range aware)
  //   image:    waits for the selected background image and serves it
  // -----------------------------------------------------------------------
  // -----------------------------------------------------------------------
  // Prepared playback: one ready-mixed AAC stream at the queued key, made on
  // the server when the song was requested (or on first use here).
  // -----------------------------------------------------------------------
  router.get(
    '/karafun/prepared/:songId',
    deps.mediaLimiter,
    asyncHandler(async (req, res) => {
      const songId = parseSongId(req.params.songId);
      if (songId === null) return res.status(400).send('Invalid song id');
      if (!(await karafunService.isEnabled())) {
        return res.status(403).send('KaraFun is disabled');
      }
      if (!(await isKnownKarafunTrack(songId))) {
        return res.status(404).send('KaraFun song not queued');
      }
      try {
        const song = await karafunPreparedService.prepare(songId, clampKey(req.query.key));
        res.setHeader('Cache-Control', 'no-store');
        return res.json({
          ...song.manifest,
          key: song.key,
          audioMime: song.audioMime,
          audioSize: song.audio.length,
          frameSec: song.frameSec,
          frameCount: song.frameOffsets.length,
        });
      } catch (error) {
        return sendPublicError(res, error, 'KaraFun song could not be prepared');
      }
    }),
  );

  router.get(
    '/karafun/prepared/:songId/audio',
    deps.mediaLimiter,
    asyncHandler(async (req, res) => {
      const songId = parseSongId(req.params.songId);
      if (songId === null) return res.status(400).send('Invalid song id');
      if (!(await karafunService.isEnabled())) {
        return res.status(403).send('KaraFun is disabled');
      }
      if (!(await isKnownKarafunTrack(songId))) {
        return res.status(404).send('KaraFun song not queued');
      }
      try {
        const song = await karafunPreparedService.prepare(songId, clampKey(req.query.key));
        // The Player streams this through an <audio> element, starting on an exact frame
        // (resume after a reload, or a key change mid-song). Range keeps reconnects working.
        const audio = audioFromFrame(song, Number(req.query.frame) || 0);
        res.setHeader('Content-Type', song.audioMime);
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Cache-Control', 'no-store');
        const range = parseByteRange(req.headers.range, audio.length);
        if (range === 'invalid') {
          res.setHeader('Content-Range', `bytes */${audio.length}`);
          return res.status(416).end();
        }
        if (range) {
          res.status(206);
          res.setHeader('Content-Range', `bytes ${range.start}-${range.end}/${audio.length}`);
          res.setHeader('Content-Length', String(range.end - range.start + 1));
          return res.end(audio.subarray(range.start, range.end + 1));
        }
        res.setHeader('Content-Length', String(audio.length));
        return res.end(audio);
      } catch (error) {
        return sendPublicError(res, error, 'KaraFun audio is not available');
      }
    }),
  );

  router.get(
    '/karafun/manifest/:songId',
    deps.mediaLimiter,
    asyncHandler(async (req, res) => {
      const songId = parseSongId(req.params.songId);
      if (songId === null) return res.status(400).send('Invalid song id');
      if (!(await karafunService.isEnabled())) {
        return res.status(403).send('KaraFun is disabled');
      }
      if (!(await isKnownKarafunTrack(songId))) {
        return res.status(404).send('KaraFun song not queued');
      }
      try {
        return res.json(await progressiveKitService.getManifest(songId));
      } catch (error) {
        return sendPublicError(res, error, 'KaraFun manifest is not available');
      }
    }),
  );

  router.get(
    '/karafun/audio/:songId/:type',
    deps.mediaLimiter,
    asyncHandler(async (req, res) => {
      const songId = parseSongId(req.params.songId);
      const type = parseFileType(req.params.type);
      if (songId === null || type === null) return res.status(400).send('Invalid KaraFun file');
      if (!(await karafunService.isEnabled())) {
        return res.status(403).send('KaraFun is disabled');
      }
      if (!(await isKnownKarafunTrack(songId))) {
        return res.status(404).send('KaraFun song not queued');
      }

      try {
        const job = progressiveKitService.getJob(songId);
        await streamProgressiveFile(req, res, job, type, 'audio/ogg');
      } catch (error) {
        if (!res.headersSent) {
          return sendPublicError(res, error, 'KaraFun audio is not available');
        }
        res.destroy(error instanceof Error ? error : new Error(String(error)));
      }
    }),
  );

  router.get(
    '/karafun/image/:songId/:type',
    deps.mediaLimiter,
    asyncHandler(async (req, res) => {
      const songId = parseSongId(req.params.songId);
      const type = parseFileType(req.params.type);
      if (songId === null || type === null) return res.status(400).send('Invalid KaraFun file');
      if (!(await karafunService.isEnabled())) {
        return res.status(403).send('KaraFun is disabled');
      }
      if (!(await isKnownKarafunTrack(songId))) {
        return res.status(404).send('KaraFun song not queued');
      }

      const prepared = karafunPreparedService.findReady(songId)?.image;
      if (prepared?.type === type) {
        res.setHeader('Content-Type', prepared.mime || 'image/jpeg');
        res.setHeader('Content-Length', String(prepared.data.length));
        res.setHeader('Cache-Control', 'private, max-age=300');
        return res.send(prepared.data);
      }

      try {
        const job = progressiveKitService.getJob(songId);
        const info = job.getInfo(type);
        if (info.kind !== 'image') return res.status(404).send('KaraFun image not found');
        await job.waitFor(type, info.size);
        const data = job.read(type, 0, info.size);
        res.setHeader('Content-Type', info.mime || 'image/jpeg');
        res.setHeader('Content-Length', String(data.length));
        res.setHeader('Cache-Control', 'private, max-age=300');
        return res.send(data);
      } catch (error) {
        return sendPublicError(res, error, 'KaraFun image is not available');
      }
    }),
  );

  // -----------------------------------------------------------------------
  // Admin configuration. The password hash is write-only.
  // -----------------------------------------------------------------------
  router.get(
    '/admin/karafun',
    deps.adminGuard,
    asyncHandler(async (_req, res) => {
      const config = await getKarafunConfig();
      let status: unknown = null;
      if (config.enabled && config.username && config.passwordHash) {
        try {
          status = await karafunService.status();
        } catch (error) {
          status = { ok: false, error: errorMessage(error) };
        }
      }
      return res.json({
        enabled: config.enabled,
        username: config.username,
        hasPassword: Boolean(config.passwordHash),
        status,
      });
    }),
  );

  router.put(
    '/admin/karafun',
    deps.adminGuard,
    asyncHandler(async (req, res) => {
      // Partial update: System Settings sends only `enabled`, the KaraFun section only
      // the credentials; a missing field keeps its stored value.
      const current = await getKarafunConfig();
      const enabled = typeof req.body?.enabled === 'boolean' ? req.body.enabled : current.enabled;
      const username = typeof req.body?.username === 'string'
        ? req.body.username.trim().slice(0, 200)
        : current.username;
      const password = typeof req.body?.password === 'string'
        ? req.body.password.slice(0, 200)
        : '';

      const passwordHash = password ? hashKarafunPassword(password) : current.passwordHash;

      if (enabled && (!username || !passwordHash)) {
        return res.status(400).json({
          error: 'A KaraFun username and password are required before enabling the integration',
        });
      }

      await saveKarafunConfig({
        enabled,
        username,
        ...(password ? { passwordHash } : {}),
      });

      karafunService.invalidate();

      let status: unknown = null;
      if (enabled && username && passwordHash) {
        try {
          status = await karafunService.status();
        } catch (error) {
          status = { ok: false, error: errorMessage(error) };
        }
      }

      return res.json({
        enabled,
        username,
        hasPassword: Boolean(passwordHash),
        status,
      });
    }),
  );

  router.post(
    '/admin/karafun/test',
    deps.adminGuard,
    asyncHandler(async (_req, res) => {
      try {
        return res.json(await karafunService.status());
      } catch (error) {
        return res.json({ ok: false, error: errorMessage(error) });
      }
    }),
  );

  return router;
}
