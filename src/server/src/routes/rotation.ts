// server/src/routes/rotation.ts
// Express routes for the karaoke rotation system.
// All scheduling logic is in rotationService.ts; this file only handles
// HTTP request/response marshalling and authentication guards.

import express from 'express';
import {
  createRotation,
  updateRotationConfig,
  pauseRotation,
  resumeRotation,
  listRotations,
  getRotation,
  addSingerToRotation,
  removeSingerFromRotation,
  moveSinger,
  reorderSingers,
  insertSingerNext,
  setRotationSingerStatus,
  createSinger,
  setSingerStatus,
  addSongRequest,
  removeSongRequest,
  getNextTurn,
  startTurn,
  completeTurn,
  skipTurn,
  addManualOverride,
  clearManualOverrides,
  getRotationState,
} from '../rotation/rotationService.js';
import { validateSessionInfo } from '../db.js';
import { applyManualSingerQueueOrder, resortQueueByRotation, broadcastQueueUpdate } from './api.js';

export const rotationRouter = express.Router();

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

const ah =
  (fn: express.RequestHandler): express.RequestHandler =>
  (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

// Session guard (any authenticated user)
const sessionGuard: express.RequestHandler = async (req, res, next) => {
  const token = req.headers['x-session-token'] as string;
  if (!token) {
    res.status(403).json({ error: 'Forbidden: No session token provided' });
    return;
  }
  const info = await validateSessionInfo(token);
  if (!info.valid) {
    res.status(403).json({ error: 'Forbidden: Invalid or expired session' });
    return;
  }
  (req as any).user = { userId: info.userId, role: info.role };
  next();
};

// Admin guard
const adminGuard: express.RequestHandler = async (req, res, next) => {
  const token = req.headers['x-session-token'] as string;
  if (!token) {
    res.status(403).json({ error: 'Forbidden: No session token provided' });
    return;
  }
  const info = await validateSessionInfo(token);
  if (!info.valid) {
    res.status(403).json({ error: 'Forbidden: Invalid or expired session' });
    return;
  }
  if (info.role !== 'admin') {
    res.status(403).json({ error: 'Forbidden: Admin access required' });
    return;
  }
  (req as any).user = { userId: info.userId, role: info.role };
  next();
};

/** Parse an ID parameter to BigInt, returning 400 on failure. */
function parseBigInt(value: string, res: express.Response): bigint | null {
  try {
    return BigInt(value);
  } catch {
    res.status(400).json({ error: `Invalid ID: ${value}` });
    return null;
  }
}

/** Serialize BigInt values in response objects to strings for JSON safety. */
function jsonSafe(value: unknown): unknown {
  return JSON.parse(
    JSON.stringify(value, (_key, val) => (typeof val === 'bigint' ? val.toString() : val)),
  );
}

// ---------------------------------------------------------------------------
// Status value validators
// ---------------------------------------------------------------------------

const SINGER_STATUSES = ['active', 'inactive', 'absent', 'skipped', 'banned'] as const;
const ROTATION_SINGER_STATUSES = ['active', 'inactive', 'absent', 'skipped'] as const;

type SingerStatusValue = typeof SINGER_STATUSES[number];
type RotationSingerStatusValue = typeof ROTATION_SINGER_STATUSES[number];

function parseSingerStatus(value: string, res: express.Response): SingerStatusValue | null {
  if ((SINGER_STATUSES as readonly string[]).includes(value)) return value as SingerStatusValue;
  res.status(400).json({ error: `Invalid singer status: ${value}. Must be one of: ${SINGER_STATUSES.join(', ')}` });
  return null;
}

function parseRotationSingerStatus(value: string, res: express.Response): RotationSingerStatusValue | null {
  if ((ROTATION_SINGER_STATUSES as readonly string[]).includes(value)) return value as RotationSingerStatusValue;
  res.status(400).json({ error: `Invalid rotation singer status: ${value}. Must be one of: ${ROTATION_SINGER_STATUSES.join(', ')}` });
  return null;
}


/** GET /api/rotations — list all rotations */
rotationRouter.get('/rotations', sessionGuard, ah(async (_req, res) => {
  const rotations = await listRotations();
  res.json(jsonSafe(rotations));
}));

/** POST /api/rotations — create a rotation (admin only) */
rotationRouter.post('/rotations', adminGuard, ah(async (req, res) => {
  const { name, config } = req.body as { name?: string; config?: Partial<import('../rotation/types.js').RotationConfig> };
  if (!name) {
    res.status(400).json({ error: 'name is required' });
    return;
  }
  const rotation = await createRotation({ name, config });
  res.status(201).json(jsonSafe(rotation));
}));

/** GET /api/rotations/:id — get a single rotation */
rotationRouter.get('/rotations/:id', sessionGuard, ah(async (req, res) => {
  const id = parseBigInt(req.params.id, res);
  if (id === null) return;
  const rotation = await getRotation(id);
  if (!rotation) { res.status(404).json({ error: 'Rotation not found' }); return; }
  res.json(jsonSafe(rotation));
}));

/** PATCH /api/rotations/:id/config — update rotation config (admin only) */
rotationRouter.patch('/rotations/:id/config', adminGuard, ah(async (req, res) => {
  const id = parseBigInt(req.params.id, res);
  if (id === null) return;
  const rotation = await updateRotationConfig(id, req.body);
  if (!rotation) { res.status(404).json({ error: 'Rotation not found' }); return; }
  // Re-sort the queue to reflect the new rotation policy before responding so
  // clients immediately see the updated order.
  try {
    await resortQueueByRotation();
    broadcastQueueUpdate('queue.updated');
  } catch (err) {
    console.error('resortQueueByRotation after config update failed:', err);
  }
  res.json(jsonSafe(rotation));
}));

/** POST /api/rotations/:id/pause — pause a rotation (admin only) */
rotationRouter.post('/rotations/:id/pause', adminGuard, ah(async (req, res) => {
  const id = parseBigInt(req.params.id, res);
  if (id === null) return;
  await pauseRotation(id);
  res.json({ ok: true });
}));

/** POST /api/rotations/:id/resume — resume a rotation (admin only) */
rotationRouter.post('/rotations/:id/resume', adminGuard, ah(async (req, res) => {
  const id = parseBigInt(req.params.id, res);
  if (id === null) return;
  await resumeRotation(id);
  res.json({ ok: true });
}));

/** GET /api/rotations/:id/state — full rotation state for UI */
rotationRouter.get('/rotations/:id/state', sessionGuard, ah(async (req, res) => {
  const id = parseBigInt(req.params.id, res);
  if (id === null) return;
  const state = await getRotationState(id);
  if (!state) { res.status(404).json({ error: 'Rotation not found' }); return; }
  res.json(jsonSafe(state));
}));

// ---------------------------------------------------------------------------
// Singers
// ---------------------------------------------------------------------------

/** POST /api/singers — create a new singer */
rotationRouter.post('/singers', sessionGuard, ah(async (req, res) => {
  const { displayName } = req.body as { displayName?: string };
  if (!displayName) {
    res.status(400).json({ error: 'displayName is required' });
    return;
  }
  const singer = await createSinger(displayName);
  res.status(201).json(jsonSafe(singer));
}));

/** PATCH /api/singers/:id/status — update singer status (admin only) */
rotationRouter.patch('/singers/:id/status', adminGuard, ah(async (req, res) => {
  const id = parseBigInt(req.params.id, res);
  if (id === null) return;
  const { status } = req.body as { status?: string };
  if (!status) {
    res.status(400).json({ error: 'status is required' });
    return;
  }
  const parsed = parseSingerStatus(status, res);
  if (parsed === null) return;
  await setSingerStatus(id, parsed);
  res.json({ ok: true });
}));

// ---------------------------------------------------------------------------
// Rotation ↔ Singer management
// ---------------------------------------------------------------------------

/** POST /api/rotations/:id/singers — add a singer to the rotation */
rotationRouter.post('/rotations/:id/singers', sessionGuard, ah(async (req, res) => {
  const rotationId = parseBigInt(req.params.id, res);
  if (rotationId === null) return;
  const { singerId } = req.body as { singerId?: string };
  if (!singerId) {
    res.status(400).json({ error: 'singerId is required' });
    return;
  }
  const sid = parseBigInt(singerId, res);
  if (sid === null) return;
  const rs = await addSingerToRotation(rotationId, sid);
  res.status(201).json(jsonSafe(rs));
}));

/** DELETE /api/rotations/:id/singers/:singerId — remove a singer from the rotation */
rotationRouter.delete('/rotations/:id/singers/:singerId', adminGuard, ah(async (req, res) => {
  const rotationId = parseBigInt(req.params.id, res);
  if (rotationId === null) return;
  const singerId = parseBigInt(req.params.singerId, res);
  if (singerId === null) return;
  await removeSingerFromRotation(rotationId, singerId);
  res.json({ ok: true });
}));

/** PATCH /api/rotations/:id/singers/:singerId/status — set rotation singer status */
rotationRouter.patch('/rotations/:id/singers/:singerId/status', adminGuard, ah(async (req, res) => {
  const rotationId = parseBigInt(req.params.id, res);
  if (rotationId === null) return;
  const singerId = parseBigInt(req.params.singerId, res);
  if (singerId === null) return;
  const { status } = req.body as { status?: string };
  if (!status) {
    res.status(400).json({ error: 'status is required' });
    return;
  }
  const parsed = parseRotationSingerStatus(status, res);
  if (parsed === null) return;
  await setRotationSingerStatus(rotationId, singerId, parsed);
  res.json({ ok: true });
}));

/** PATCH /api/rotations/:id/singers/:singerId/position — move a singer */
rotationRouter.patch('/rotations/:id/singers/:singerId/position', adminGuard, ah(async (req, res) => {
  const rotationId = parseBigInt(req.params.id, res);
  if (rotationId === null) return;
  const singerId = parseBigInt(req.params.singerId, res);
  if (singerId === null) return;
  const { position } = req.body as { position?: number };
  if (position === undefined || typeof position !== 'number') {
    res.status(400).json({ error: 'position is required (number)' });
    return;
  }
  await moveSinger(rotationId, singerId, position);
  await resortQueueByRotation();
  broadcastQueueUpdate('queue.updated');
  res.json({ ok: true });
}));

/** PATCH /api/rotations/:id/singers/reorder — atomically reorder active singers */
rotationRouter.patch('/rotations/:id/singers/reorder', adminGuard, ah(async (req, res) => {
  const rotationId = parseBigInt(req.params.id, res);
  if (rotationId === null) return;

  const orderedSingerIds = Array.isArray(req.body?.orderedSingerIds)
    ? req.body.orderedSingerIds
    : [];
  const parsedSingerIds: bigint[] = [];
  for (const rawId of orderedSingerIds) {
    try {
      const id = BigInt(String(rawId));
      if (id > 0n) parsedSingerIds.push(id);
    } catch {
      res.status(400).json({ error: 'orderedSingerIds must contain numeric singer IDs' });
      return;
    }
  }
  if (parsedSingerIds.length === 0) {
    res.status(400).json({ error: 'orderedSingerIds is required' });
    return;
  }

  await reorderSingers(rotationId, parsedSingerIds);
  await applyManualSingerQueueOrder(parsedSingerIds.map((id) => id.toString()));
  broadcastQueueUpdate('queue.updated');
  res.json({ ok: true });
}));

/** POST /api/rotations/:id/singers/:singerId/insert-next — move singer immediately after current */
rotationRouter.post('/rotations/:id/singers/:singerId/insert-next', adminGuard, ah(async (req, res) => {
  const rotationId = parseBigInt(req.params.id, res);
  if (rotationId === null) return;
  const singerId = parseBigInt(req.params.singerId, res);
  if (singerId === null) return;
  await insertSingerNext(rotationId, singerId);
  res.json({ ok: true });
}));

// ---------------------------------------------------------------------------
// Song Requests
// ---------------------------------------------------------------------------

/** POST /api/song-requests — submit a new song request */
rotationRouter.post('/song-requests', sessionGuard, ah(async (req, res) => {
  const {
    singerId,
    title,
    artist,
    trackId,
    priority,
    participantSingerIds,
  } = req.body as {
    singerId?: string;
    title?: string;
    artist?: string;
    trackId?: number;
    priority?: number;
    participantSingerIds?: string[];
  };

  if (!singerId || !title) {
    res.status(400).json({ error: 'singerId and title are required' });
    return;
  }
  const sid = parseBigInt(singerId, res);
  if (sid === null) return;

  const participantIds = (participantSingerIds ?? []).map((id) => BigInt(id));

  const sr = await addSongRequest({
    singerId: sid,
    title,
    artist,
    trackId,
    priority,
    participantSingerIds: participantIds,
  });
  res.status(201).json(jsonSafe(sr));
}));

/** DELETE /api/song-requests/:id — remove/cancel a song request */
rotationRouter.delete('/song-requests/:id', sessionGuard, ah(async (req, res) => {
  const id = parseBigInt(req.params.id, res);
  if (id === null) return;
  await removeSongRequest(id);
  res.json({ ok: true });
}));

// ---------------------------------------------------------------------------
// Turns
// ---------------------------------------------------------------------------

/** GET /api/rotations/:id/next-turn — get or create the next turn */
rotationRouter.get('/rotations/:id/next-turn', sessionGuard, ah(async (req, res) => {
  const rotationId = parseBigInt(req.params.id, res);
  if (rotationId === null) return;
  const turn = await getNextTurn(rotationId);
  res.json(jsonSafe(turn));
}));

/** POST /api/turns/:id/start — mark a turn as active / singing */
rotationRouter.post('/turns/:id/start', adminGuard, ah(async (req, res) => {
  const id = parseBigInt(req.params.id, res);
  if (id === null) return;
  const turn = await startTurn(id);
  if (!turn) { res.status(404).json({ error: 'Turn not found or already started' }); return; }
  res.json(jsonSafe(turn));
}));

/** POST /api/turns/:id/complete — complete a turn */
rotationRouter.post('/turns/:id/complete', adminGuard, ah(async (req, res) => {
  const id = parseBigInt(req.params.id, res);
  if (id === null) return;
  const turn = await completeTurn(id);
  if (!turn) { res.status(404).json({ error: 'Turn not found or already completed' }); return; }
  res.json(jsonSafe(turn));
}));

/** POST /api/turns/:id/skip — skip a turn */
rotationRouter.post('/turns/:id/skip', adminGuard, ah(async (req, res) => {
  const id = parseBigInt(req.params.id, res);
  if (id === null) return;
  const turn = await skipTurn(id);
  if (!turn) { res.status(404).json({ error: 'Turn not found or already completed' }); return; }
  res.json(jsonSafe(turn));
}));

// ---------------------------------------------------------------------------
// Manual Overrides
// ---------------------------------------------------------------------------

/** POST /api/rotations/:id/overrides — add a manual override */
rotationRouter.post('/rotations/:id/overrides', adminGuard, ah(async (req, res) => {
  const rotationId = parseBigInt(req.params.id, res);
  if (rotationId === null) return;
  const { singerId, songRequestId, expiresAfterTurn } = req.body as {
    singerId?: string;
    songRequestId?: string;
    expiresAfterTurn?: boolean;
  };
  if (!singerId) {
    res.status(400).json({ error: 'singerId is required' });
    return;
  }
  const sid = parseBigInt(singerId, res);
  if (sid === null) return;
  const srId = songRequestId ? parseBigInt(songRequestId, res) : undefined;
  if (songRequestId && srId === null) return;

  const override = await addManualOverride({
    rotationId,
    singerId: sid,
    songRequestId: srId ?? undefined,
    expiresAfterTurn,
  });
  res.status(201).json(jsonSafe(override));
}));

/** DELETE /api/rotations/:id/overrides — clear all pending overrides */
rotationRouter.delete('/rotations/:id/overrides', adminGuard, ah(async (req, res) => {
  const rotationId = parseBigInt(req.params.id, res);
  if (rotationId === null) return;
  await clearManualOverrides(rotationId);
  res.json({ ok: true });
}));
