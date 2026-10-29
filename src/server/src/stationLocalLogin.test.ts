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
  app.use('/api', createStationLocalLoginRouter());
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
function signIn(headers: Record<string, string> = {}) {
  return new Promise<{ status: number; body: any }>((resolve, reject) => {
    const req = http.request({
      host: '127.0.0.1', port, path: '/api/auth/station-local', method: 'POST',
      headers: { 'x-station-local': '1', host: `127.0.0.1:${port}`, ...headers },
    }, res => {
      let text = '';
      res.on('data', chunk => { text += chunk; });
      res.on('end', () => resolve({ status: res.statusCode ?? 0, body: JSON.parse(text) }));
    });
    req.on('error', reject);
    req.end();
  });
}

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
