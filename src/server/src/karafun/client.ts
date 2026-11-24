import {
  signKarafunRequest,
  strictEncodeUriParams,
} from './crypto.js';
import {
  KarafunApiError,
  parseKarafunSearch,
  parseKarafunSession,
  parseKarafunSong,
  parseKarafunSongInfo,
} from './xml.js';
import type {
  KarafunMediaDescriptor,
  KarafunSession,
  KarafunSongDetail,
  KarafunSongSummary,
} from './types.js';

export const KARAFUN_API_BASE = 'https://api.karafun.com';
export const KARAFUN_CLIENT_ID = 9; // WIN_PREMIUM
export const KARAFUN_API_KEY = 'ma9@@3_G';
export const KARAFUN_CLIENT_VERSION = '3.14.0.157';
export const KARAFUN_USER_AGENT = `KaraFunDesktop/${KARAFUN_CLIENT_VERSION}`;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface KarafunClientOptions {
  username: string;
  passwordHash: string;
  clientVersion?: string;
  deviceName?: string;
  locale?: string;
  timezone?: string;
}

export class KarafunClient {
  private readonly username: string;
  private readonly passwordHash: string;
  private readonly clientVersion: string;
  private readonly deviceName: string;
  private readonly locale: string;
  private readonly timezone: string;
  private session: KarafunSession | null = null;

  constructor(options: KarafunClientOptions) {
    this.username = options.username;
    this.passwordHash = options.passwordHash;
    this.clientVersion = options.clientVersion ?? KARAFUN_CLIENT_VERSION;
    this.deviceName = options.deviceName ?? 'KaraokeDock';
    this.locale = options.locale ?? 'en';
    this.timezone = options.timezone ?? 'UTC';
  }

  get sessionKey(): string | null {
    return this.session?.key ?? null;
  }

  get currentSession(): KarafunSession | null {
    return this.session;
  }

  async open(): Promise<KarafunSession> {
    const params: Record<string, unknown> = {
      client: KARAFUN_CLIENT_ID,
      client_version: this.clientVersion,
      key: KARAFUN_API_KEY,
      protocol: 1,
      login: this.username,
      pwd: this.passwordHash,
      device_name: this.deviceName,
      locale: this.locale,
      timezone: this.timezone,
    };
    const xml = await this.request('GET', '/session/open', { params, sessionKey: null });
    const session = parseKarafunSession(xml);
    this.session = session;
    return session;
  }

  async info(): Promise<KarafunSession> {
    const xml = await this.request('GET', '/session/info', {
      params: { client: KARAFUN_CLIENT_ID },
    });
    const session = parseKarafunSession(xml);
    this.session = session;
    return session;
  }

  async searchSongIds(
    query: string,
    options: { offset?: number; limit?: number; filters?: string } = {},
  ): Promise<{ total: number; songs: KarafunSongSummary[] }> {
    const xml = await this.request('GET', '/search/song', {
      params: {
        query,
        filters: options.filters ?? '',
        offset: options.offset ?? 0,
        limit: options.limit ?? 25,
        show_restricted: 0,
        show_explicit: 1,
      },
    });
    return parseKarafunSearch(xml);
  }

  async songInfo(ids: number[]): Promise<KarafunSongDetail[]> {
    const unique = [...new Set(ids.filter((id) => Number.isSafeInteger(id) && id > 0))];
    const result: KarafunSongDetail[] = [];
    for (let offset = 0; offset < unique.length; offset += 1000) {
      const chunk = unique.slice(offset, offset + 1000);
      const xml = await this.request('POST', '/song/info', {
        payload: { song: chunk.join(',') },
      });
      result.push(...parseKarafunSongInfo(xml));
    }
    return result;
  }

  async songRequest(songId: number): Promise<KarafunMediaDescriptor> {
    const xml = await this.request('GET', '/song/request', {
      params: { song: songId, offline: 0 },
    });
    const song = parseKarafunSong(xml);
    if (!song.stream || !song.md5) {
      throw new KarafunApiError({ message: `KaraFun did not return media for song ${songId}` });
    }
    return {
      stream: song.stream,
      filesize: song.filesize ?? 0,
      md5: song.md5,
      durationSec: song.durationSec,
      preview: song.preview === true,
      previewStartSec: song.previewStartSec ?? 0,
      notifyPlay: song.notifyPlay,
      song,
    };
  }

  private async request(
    method: 'GET' | 'POST',
    path: string,
    options: {
      params?: Record<string, unknown>;
      payload?: Record<string, unknown>;
      sessionKey?: string | null;
    } = {},
  ): Promise<string> {
    const sessionKey = options.sessionKey === undefined
      ? this.session?.key ?? null
      : options.sessionKey;
    const query = {
      ...(options.params ?? {}),
      ...(sessionKey ? { sk: sessionKey } : {}),
    };
    const url = `${KARAFUN_API_BASE}${path}?${strictEncodeUriParams(query)}`;
    const body = options.payload ? strictEncodeUriParams(options.payload) : '';
    const timestamp = Math.floor(Date.now() / 1000);
    const headers: Record<string, string> = {
      'User-Agent': KARAFUN_USER_AGENT,
      'X-Request-Timestamp': String(timestamp),
      'X-Request-Signature': signKarafunRequest({
        url,
        payload: body,
        timestamp,
        sessionKey,
      }),
    };
    if (method === 'POST' && body) {
      headers['Content-Type'] = 'application/x-www-form-urlencoded;charset=UTF-8';
    }

    let lastError: unknown;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await fetch(url, {
          method,
          headers,
          body: body || undefined,
        });
        const text = await response.text();
        if (!response.ok) {
          throw new KarafunApiError({
            message: `KaraFun ${method} ${path} returned HTTP ${response.status}`,
          });
        }
        return text;
      } catch (error) {
        lastError = error;
        if (method !== 'GET' || attempt === 2) break;
        await sleep(200 * (attempt + 1));
      }
    }
    throw lastError instanceof Error
      ? lastError
      : new KarafunApiError({ message: String(lastError) });
  }
}
