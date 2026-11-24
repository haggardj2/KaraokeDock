import { upsertArtist, upsertExternalTrack } from '../db.js';
import { logger } from '../logger.js';
import { KarafunClient } from './client.js';
import { getKarafunConfig } from './config.js';
import { KarafunApiError } from './xml.js';
import type {
  KarafunConfig,
  KarafunMediaDescriptor,
  KarafunSearchResult,
  KarafunSession,
  KarafunSongDetail,
} from './types.js';

const SEARCH_CACHE_TTL_MS = 60_000;
const DETAIL_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const CONFIG_CACHE_TTL_MS = 5_000;
const DESCRIPTOR_CACHE_TTL_MS = 5 * 60 * 1000;

export class KarafunDisabledError extends Error {
  constructor() {
    super('KaraFun is not enabled');
    this.name = 'KarafunDisabledError';
  }
}

export class KarafunNotConfiguredError extends Error {
  constructor() {
    super('KaraFun credentials are not configured');
    this.name = 'KarafunNotConfiguredError';
  }
}

export class KarafunPreviewError extends Error {
  constructor(message = 'KaraFun returned a preview stream; this account cannot play the full song') {
    super(message);
    this.name = 'KarafunPreviewError';
  }
}

interface CacheEntry<T> {
  expiresAt: number;
  value: T;
}

export class KarafunService {
  private client: KarafunClient | null = null;
  private clientKey = '';
  private configCache: CacheEntry<KarafunConfig> | null = null;
  private searchCache = new Map<string, CacheEntry<KarafunSearchResult[]>>();
  private detailCache = new Map<number, CacheEntry<KarafunSongDetail>>();
  private descriptorCache = new Map<number, CacheEntry<KarafunMediaDescriptor>>();

  async getConfig(): Promise<KarafunConfig> {
    const now = Date.now();
    if (this.configCache && this.configCache.expiresAt > now) {
      return this.configCache.value;
    }
    const value = await getKarafunConfig();
    this.configCache = { value, expiresAt: now + CONFIG_CACHE_TTL_MS };
    return value;
  }

  async isEnabled(): Promise<boolean> {
    return (await this.getConfig()).enabled;
  }

  async status(): Promise<{
    ok: true;
    userLogin: string;
    userId: number;
    plan?: string;
    planCaption?: string;
    isPro: boolean;
    subscriptionEndDate?: string;
  }> {
    const session = await this.withRetry((client) => client.info());
    return toStatus(session);
  }

  async search(query: string, limit = 20): Promise<KarafunSearchResult[]> {
    const config = await this.getConfig();
    if (!config.enabled) throw new KarafunDisabledError();
    if (!config.username || !config.passwordHash) throw new KarafunNotConfiguredError();

    const normalized = query.trim().slice(0, 120);
    if (!normalized) return [];

    const cacheKey = `${normalized.toLowerCase()}:${limit}`;
    const cached = this.searchCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.value;

    const found = await this.withRetry((client) =>
      client.searchSongIds(normalized, { limit: Math.min(50, Math.max(1, limit)) }),
    );
    if (found.songs.length === 0) {
      this.searchCache.set(cacheKey, { value: [], expiresAt: Date.now() + SEARCH_CACHE_TTL_MS });
      return [];
    }

    let details: KarafunSongDetail[] = [];
    try {
      details = await this.withRetry((client) =>
        client.songInfo(found.songs.map((song) => song.id)),
      );
    } catch (error) {
      logger.warn(`KaraFun search hydration failed: ${String(error)}`);
    }
    const detailById = new Map(details.map((detail) => [detail.id, detail]));

    const result = found.songs.map((song): KarafunSearchResult => {
      const detail = detailById.get(song.id);
      return {
        source: 'karafun',
        songId: song.id,
        title: detail?.title || `KaraFun song ${song.id}`,
        artist: detail?.artist || 'Unknown Artist',
        year: detail?.year,
        durationMs: detail?.durationSec ? Math.round(detail.durationSec * 1000) : undefined,
        imageId: detail?.imageId,
        imageUrl: detail?.imageId
          ? `https://cdnaws.recis.io/i/api/${encodeURIComponent(detail.imageId)}/sq500.jpg`
          : undefined,
        content: song.content ?? detail?.content,
        meta: song.meta ?? detail?.meta,
        brand: 'KaraFun',
      };
    });

    this.searchCache.set(cacheKey, {
      value: result,
      expiresAt: Date.now() + SEARCH_CACHE_TTL_MS,
    });
    return result;
  }

  async detail(songId: number): Promise<KarafunSongDetail> {
    if (!Number.isSafeInteger(songId) || songId <= 0) {
      throw new Error('Invalid KaraFun song id');
    }
    const cached = this.detailCache.get(songId);
    if (cached && cached.expiresAt > Date.now()) return cached.value;

    const details = await this.withRetry((client) => client.songInfo([songId]));
    const detail = details.find((item) => item.id === songId) ?? details[0];
    if (!detail) throw new Error(`KaraFun song ${songId} was not found`);

    this.detailCache.set(songId, {
      value: detail,
      expiresAt: Date.now() + DETAIL_CACHE_TTL_MS,
    });
    return detail;
  }

  /** Media descriptor only (no media bytes). Cached briefly. */
  async descriptor(songId: number): Promise<KarafunMediaDescriptor> {
    if (!Number.isSafeInteger(songId) || songId <= 0) {
      throw new Error('Invalid KaraFun song id');
    }
    const cached = this.descriptorCache.get(songId);
    if (cached && cached.expiresAt > Date.now()) return cached.value;

    const value = await this.withRetry((client) => client.songRequest(songId));
    this.descriptorCache.set(songId, {
      value,
      expiresAt: Date.now() + DESCRIPTOR_CACHE_TTL_MS,
    });
    this.detailCache.set(songId, {
      value: value.song,
      expiresAt: Date.now() + DETAIL_CACHE_TTL_MS,
    });
    return value;
  }

  async prepareTrack(songId: number): Promise<{
    detail: KarafunSongDetail;
    track: { id: number };
  }> {
    const detail = await this.detail(songId);
    // Check entitlement without downloading media. The kit is only fetched
    // when the Player actually streams the song.
    const descriptor = await this.descriptor(songId);
    if (descriptor.preview) throw new KarafunPreviewError();

    const artistId = detail.artist ? await upsertArtist(detail.artist) : null;
    const track = await upsertExternalTrack({
      artist_id: artistId,
      disc_id: null,
      title: detail.title || `KaraFun ${songId}`,
      external_url: `karafun:${songId}`,
      source: 'karafun',
      duration_ms: Math.round((detail.durationSec || descriptor.durationSec) * 1000),
    });
    return { detail, track };
  }

  invalidate(): void {
    this.configCache = null;
    this.client = null;
    this.clientKey = '';
    this.searchCache.clear();
    this.detailCache.clear();
    this.descriptorCache.clear();
  }

  private async getClient(forceNew = false): Promise<KarafunClient> {
    const config = await this.getConfig();
    if (!config.username || !config.passwordHash) {
      throw new KarafunNotConfiguredError();
    }
    const key = `${config.username}:${config.passwordHash}`;
    if (!forceNew && this.client && this.clientKey === key) {
      return this.client;
    }

    const client = new KarafunClient({
      username: config.username,
      passwordHash: config.passwordHash,
      deviceName: process.env.KARAFUN_DEVICE_NAME || 'KaraokeDock',
      locale: process.env.KARAFUN_LOCALE || 'en',
      timezone: process.env.KARAFUN_TIMEZONE || 'UTC',
    });
    await client.open();
    this.client = client;
    this.clientKey = key;
    return client;
  }

  private async withRetry<T>(operation: (client: KarafunClient) => Promise<T>): Promise<T> {
    try {
      return await operation(await this.getClient());
    } catch (error) {
      if (
        error instanceof KarafunApiError &&
        (error.action === 'restart' || error.content === 'INVALID_SESSION')
      ) {
        logger.info('KaraFun session expired; reopening');
        this.client = null;
        return operation(await this.getClient(true));
      }
      throw error;
    }
  }
}

function toStatus(session: KarafunSession) {
  return {
    ok: true as const,
    userLogin: session.userLogin,
    userId: session.userId,
    plan: session.plan,
    planCaption: session.planCaption,
    isPro: session.isPro,
    subscriptionEndDate: session.subscriptionEndDate,
  };
}

export const karafunService = new KarafunService();
