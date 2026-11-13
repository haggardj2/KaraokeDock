import express from 'express';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSession, getSetting, query } from './db.js';
import { createStationLocalLoginRouter, isStationLocalRequest } from './stationLocalLogin.js';

vi.mock('./db.js', () => ({ createSession: vi.fn(), getSetting: vi.fn(), query: vi.fn() }));
vi.mock('./logger.js', () => ({ logger: { info: vi.fn() } }));
vi.mock('./singerProfile.js', () => ({
  getUserSingerPresentation: vi.fn(async () => ({ displayName: 'Host', picture: null })),
}));

const admin = { id: 1, username: 'admin', role: 'admin', is_active: true };
let server: http.Server;
let port: number;

beforeAll(async () => {
  const app = express();
  const adminGuard: express.RequestHandler = (req, res, next) => {
    if (req.get('x-session-token') === 'admin-token') next();
    else res.status(403).json({ error: 'Admin role required' });
  };
  app.use('/api', createStationLocalLoginRouter(adminGuard));
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  port = (server.address() as AddressInfo).port;
});
afterAll(async () => {
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
});
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('STATION_MODE', 'true');
  vi.mocked(getSetting).mockResolvedValue(null);
  vi.mocked(query).mockResolvedValue({ rows: [admin] } as any);
  vi.mocked(createSession).mockResolvedValue('local-token');
});

// http.request rather than fetch so the Host and Origin headers can be set freely.
function post(path: string, headers: Record<string, string> = {}, body = '') {
  return new Promise<{ status: number; body: any }>((resolve, reject) => {
    const req = http.request({
      host: '127.0.0.1', port, path, method: 'POST',
      headers: { 'x-station-local': '1', host: `127.0.0.1:${port}`, ...(body ? { 'content-type': 'application/json' } : {}), ...headers },
    }, res => {
      let text = '';
      res.on('data', chunk => { text += chunk; });
      res.on('end', () => resolve({ status: res.statusCode ?? 0, body: JSON.parse(text) }));
    });
    req.on('error', reject);
    req.end(body);
  });
}

const signIn = (headers: Record<string, string> = {}) => post('/api/auth/station-local', headers);

describe('Station local sign-in', () => {
  it('signs a local Station request in as the admin', async () => {
    const result = await signIn({ origin: `http://127.0.0.1:${port}` });
    expect(result).toEqual({
      status: 200,
      body: { ok: true, sessionToken: 'local-token', role: 'admin', username: 'admin', displayName: 'Host', picture: null },
    });
    expect(createSession).toHaveBeenCalledWith(30, 1, 'admin');
    // The configured admin username is preferred.
    expect(vi.mocked(query).mock.calls[0][1]).toEqual(['admin']);
  });

  it('accepts localhost host names and origins', async () => {
    expect((await signIn({ host: `localhost:${port}`, origin: `http://127.0.0.1:${port}` })).status).toBe(200);
    expect((await signIn({ host: `[::1]:${port}`, origin: 'http://localhost:5173' })).status).toBe(200);
  });

  it.each([
    ['outside Station mode', {}, 'false'],
    ['without the Station header', { 'x-station-local': '' }, 'true'],
    ['through a proxy', { 'x-forwarded-for': '203.0.113.9' }, 'true'],
    ['through a proxy (Forwarded)', { forwarded: 'for=203.0.113.9' }, 'true'],
    ['for a non-loopback host name (DNS rebinding)', { host: `evil.example:${port}` }, 'true'],
    ['for a LAN host name', { host: `192.168.1.20:${port}` }, 'true'],
    ['from another origin', { origin: 'https://evil.example' }, 'true'],
  ])('is refused %s', async (_name, headers, stationMode) => {
    vi.stubEnv('STATION_MODE', stationMode);
    const result = await signIn(headers);
    expect(result.status).toBe(404);
    expect(createSession).not.toHaveBeenCalled();
  });

  it('is refused when there is no active admin', async () => {
    vi.mocked(query).mockResolvedValue({ rows: [] } as any);
    expect(await signIn()).toEqual({ status: 404, body: { ok: false, message: 'No active admin account' } });
    expect(createSession).not.toHaveBeenCalled();
  });
});

describe('isStationLocalRequest', () => {
  const request = (remoteAddress: string) => ({
    socket: { remoteAddress },
    get: (name: string) => ({ 'x-station-local': '1', host: '127.0.0.1:5174' } as Record<string, string>)[name],
  }) as unknown as express.Request;

  it('needs a loopback connection', () => {
    vi.stubEnv('STATION_MODE', 'true');
    expect(isStationLocalRequest(request('127.0.0.1'))).toBe(true);
    expect(isStationLocalRequest(request('::1'))).toBe(true);
    expect(isStationLocalRequest(request('::ffff:127.0.0.1'))).toBe(true);
    expect(isStationLocalRequest(request('192.168.1.20'))).toBe(false);
    expect(isStationLocalRequest(request('::ffff:192.168.1.20'))).toBe(false);
    expect(isStationLocalRequest(request('fe80::1'))).toBe(false);
  });
});

describe('Station folder picker', () => {
  let control: http.Server;
  let controlCalls: { authorization?: string; body: any }[];
  let controlReply: { status: number; body: unknown };

  beforeAll(async () => {
    control = http.createServer((req, res) => {
      let text = '';
      req.on('data', chunk => { text += chunk; });
      req.on('end', () => {
        controlCalls.push({ authorization: req.headers.authorization, body: JSON.parse(text) });
        res.writeHead(controlReply.status, { 'content-type': 'application/json' });
        res.end(JSON.stringify(controlReply.body));
      });
    });
    control.listen(0, '127.0.0.1');
    await new Promise(resolve => control.once('listening', resolve));
  });
  afterAll(async () => {
    control.closeAllConnections();
    await new Promise(resolve => control.close(resolve));
  });
  beforeEach(() => {
    controlCalls = [];
    controlReply = { status: 200, body: { path: 'D:\\Karaoke' } };
    vi.stubEnv('STATION_CONTROL_URL', `http://127.0.0.1:${(control.address() as AddressInfo).port}`);
    vi.stubEnv('STATION_CONTROL_TOKEN', 'secret');
  });

  const pick = (headers: Record<string, string> = {}) => post('/api/station/pick-folder',
    { 'x-session-token': 'admin-token', ...headers }, JSON.stringify({ title: 'Choose library folder', defaultPath: 'C:\\' }));

  it('opens the picker on the Station and returns the chosen folder', async () => {
    expect(await pick()).toEqual({ status: 200, body: { path: 'D:\\Karaoke' } });
    expect(controlCalls).toEqual([{ authorization: 'Bearer secret', body: { title: 'Choose library folder', defaultPath: 'C:\\' } }]);
  });

  it('returns null when the picker is cancelled and 409 while one is open', async () => {
    controlReply = { status: 200, body: { path: null } };
    expect((await pick()).body).toEqual({ path: null });
    controlReply = { status: 409, body: { error: 'busy' } };
    expect((await pick()).status).toBe(409);
  });

  it.each([
    ['for a non-admin', { 'x-session-token': 'user-token' }, 403],
    ['from another device', { 'x-station-local': '' }, 404],
    ['for a LAN host name', { host: '192.168.1.20:5174' }, 404],
  ])('is refused %s', async (_name, headers, status) => {
    expect((await pick(headers)).status).toBe(status);
    expect(controlCalls).toEqual([]);
  });

  it('is refused without Station control', async () => {
    vi.stubEnv('STATION_CONTROL_URL', '');
    expect((await pick()).status).toBe(404);
  });
});
