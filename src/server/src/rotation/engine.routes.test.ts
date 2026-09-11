import express from 'express';
import type { Server } from 'node:http';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { normalizeRotationConfig } from './types.js';

const mocks = vi.hoisted(() => ({
  service: Object.fromEntries([
    'createRotation', 'updateRotationConfig', 'pauseRotation', 'resumeRotation', 'listRotations', 'getRotation',
    'addSingerToRotation', 'removeSingerFromRotation', 'moveSinger', 'reorderSingers', 'insertSingerNext',
    'setRotationSingerStatus', 'createSinger', 'setSingerStatus', 'addSongRequest', 'removeSongRequest',
    'getNextTurn', 'startTurn', 'completeTurn', 'skipTurn', 'addManualOverride', 'clearManualOverrides', 'getRotationState',
  ].map((name) => [name, vi.fn()])),
  resort: vi.fn(),
  broadcast: vi.fn(),
  reorderQueue: vi.fn(),
}));

vi.mock('./rotationService.js', () => mocks.service);
vi.mock('../db.js', () => ({
  validateSessionInfo: vi.fn(async () => ({ valid: true, role: 'admin', userId: 1 })),
}));
vi.mock('../routes/api.js', () => ({
  resortQueueByRotation: mocks.resort,
  broadcastQueueUpdate: mocks.broadcast,
  applyManualSingerQueueOrder: mocks.reorderQueue,
}));

import { rotationRouter } from '../routes/rotation.js';

describe('rotation route queue synchronization', () => {
  let server: Server;
  let baseUrl: string;
  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    app.use('/api', rotationRouter);
    app.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      res.status(500).json({ error: error.message });
    });
    await new Promise<void>((resolve, reject) => {
      server = app.listen(0, '127.0.0.1', (error?: Error) => error ? reject(error) : resolve());
    });
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Missing test server address');
    baseUrl = `http://127.0.0.1:${address.port}/api`;
  });
  afterAll(async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  });
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.service.updateRotationConfig.mockImplementation(async (id, config) => ({ id, config: normalizeRotationConfig(config) }));
    mocks.service.createRotation.mockResolvedValue({ id: 1n });
    mocks.service.addSingerToRotation.mockResolvedValue({ id: 1n });
    mocks.service.addManualOverride.mockResolvedValue({ id: 1n });
  });

  const request = (path: string, method: string, body?: unknown) => fetch(`${baseUrl}${path}`, {
    method, headers: { 'content-type': 'application/json', 'x-session-token': 'admin' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  it.each([
    ['POST', '/rotations', { name: 'New show' }, 'createRotation'],
    ['PATCH', '/rotations/1/config', { type: 'signup_order' }, 'updateRotationConfig'],
    ['PATCH', '/singers/2/status', { status: 'absent' }, 'setSingerStatus'],
    ['POST', '/rotations/1/singers', { singerId: '2' }, 'addSingerToRotation'],
    ['DELETE', '/rotations/1/singers/2', undefined, 'removeSingerFromRotation'],
    ['PATCH', '/rotations/1/singers/2/status', { status: 'inactive' }, 'setRotationSingerStatus'],
    ['PATCH', '/rotations/1/singers/2/position', { position: 0 }, 'moveSinger'],
    ['POST', '/rotations/1/singers/2/insert-next', undefined, 'insertSingerNext'],
    ['POST', '/rotations/1/pause', undefined, 'pauseRotation'],
    ['POST', '/rotations/1/resume', undefined, 'resumeRotation'],
    ['POST', '/rotations/1/overrides', { singerId: '2' }, 'addManualOverride'],
    ['DELETE', '/rotations/1/overrides', undefined, 'clearManualOverrides'],
  ])('%s %s resorts and broadcasts only after successful mutation', async (method, path, body, service) => {
    const response = await request(path as string, method as string, body);
    expect(response.ok).toBe(true);
    expect(mocks.service[service as string]).toHaveBeenCalledOnce();
    expect(mocks.resort).toHaveBeenCalledOnce();
    expect(mocks.broadcast).toHaveBeenCalledWith('queue.updated');
    expect(mocks.service[service as string].mock.invocationCallOrder[0]).toBeLessThan(mocks.resort.mock.invocationCallOrder[0]);
    expect(mocks.resort.mock.invocationCallOrder[0]).toBeLessThan(mocks.broadcast.mock.invocationCallOrder[0]);
  });

  it('propagates resort failures instead of reporting an updated queue', async () => {
    mocks.resort.mockRejectedValueOnce(new Error('Resort failed'));
    const response = await request('/rotations/1/config', 'PATCH', { type: 'manual' });
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'Resort failed' });
    expect(mocks.broadcast).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid configurations without resorting', async () => {
    const response = await request('/rotations/1/config', 'PATCH', { basePolicy: 'hybrid' });
    expect(response.status).toBe(400);
    expect(mocks.resort).not.toHaveBeenCalled();
  });

  it('applies explicit singer ordering before resorting and broadcasting', async () => {
    const response = await request('/rotations/1/singers/reorder', 'PATCH', { orderedSingerIds: ['3', '1', '2'] });
    expect(response.status).toBe(200);
    expect(mocks.service.reorderSingers).toHaveBeenCalledWith(1n, [3n, 1n, 2n]);
    expect(mocks.reorderQueue).toHaveBeenCalledWith(['3', '1', '2']);
    expect(mocks.reorderQueue.mock.invocationCallOrder[0]).toBeLessThan(mocks.resort.mock.invocationCallOrder[0]);
    expect(mocks.broadcast).toHaveBeenCalledOnce();
  });

  it('rejects invalid participant IDs before inserting a song request', async () => {
    const response = await request('/song-requests', 'POST', { singerId: '1', title: 'Duet', participantSingerIds: ['invalid'] });
    expect(response.status).toBe(400);
    expect(mocks.service.addSongRequest).not.toHaveBeenCalled();
  });
});
