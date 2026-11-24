import { createHash } from 'node:crypto';
import { once } from 'node:events';
import * as cheerio from 'cheerio';
import type { Request, Response } from 'express';
import { KARAFUN_USER_AGENT } from './client.js';
import { audioRole, classifyKitFile } from './kit.js';
import { parseKaraokeXml, type KaraokeTimeline } from './lyrics.js';
import { karafunService } from './service.js';
import type { KarafunKitFileKind } from './types.js';

const KIT_MAGIC_SEARCH = Buffer.from('<?xml', 'utf8');
const MAX_DIRECTORY_PREFIX_BYTES = 8192;
const MAX_FILE_BYTES = 64 * 1024 * 1024;
const WAIT_TIMEOUT_MS = 30_000;
/** Abort the CDN download when no bytes arrive for this long. */
const STALL_TIMEOUT_MS = 30_000;

interface FileState {
  totalSize: number;
  buffer: Buffer;
  /** Contiguous bytes written from offset 0. */
  written: number;
  complete: boolean;
}

interface Waiter {
  needed: number;
  resolve: () => void;
  reject: (error: Error) => void;
  timer: NodeJS.Timeout;
}

interface FileInfo {
  type: number;
  name: string;
  label: string;
  kind: KarafunKitFileKind;
  mime: string;
  size: number;
  role?: string;
}

export interface ProgressiveTrackInfo {
  type: number;
  name: string;
  role: string;
  mime: string;
  size: number;
}

export interface ProgressiveManifest {
  songId: number;
  md5: string;
  durationSec: number;
  /** Size of the raw .kit stream in bytes (0 when unknown). */
  streamSize: number;
  /** KaraFun's "notify play" offset in seconds, when the catalog provides one. */
  notifyPlayTime: number;
  tracks: ProgressiveTrackInfo[];
  images: Array<{ type: number; name: string; mime: string; size: number }>;
  presets: Array<{ type: number; name: string; size: number }>;
  imageType: number | null;
  lyrics: KaraokeTimeline;
}

/**
 * Downloads a KaraFun .kit once and exposes each logical file as a growing
 * buffer. Audio responses can start writing as soon as the first Ogg pages
 * arrive; the browser's native <audio> element handles the rest.
 *
 * Nothing is written to disk. Jobs are bounded and expire in the service.
 */
export class ProgressiveKitJob {
  readonly songId: number;

  private files = new Map<number, FileState>();
  private infos = new Map<number, FileInfo>();
  private waiters = new Map<number, Waiter[]>();
  private buffer: Buffer = Buffer.alloc(0);
  private cursor = 0;
  private firstChunk = -1;
  private current: {
    type: number;
    size: number;
    offset: number;
    remaining: number;
    consumed: number;
  } | null = null;
  private xmlType = -1;
  private directoryReady: Promise<void>;
  private resolveDirectory!: () => void;
  private rejectDirectory!: (error: Error) => void;
  private startPromise: Promise<void> | null = null;
  private manifestPromise: Promise<ProgressiveManifest> | null = null;
  private error: Error | null = null;
  private disposed = false;
  private controller = new AbortController();
  private hash = createHash('md5');
  private md5 = '';
  private durationSec = 0;
  private streamSize = 0;
  private notifyPlayTime = 0;

  constructor(songId: number) {
    this.songId = songId;
    this.directoryReady = new Promise<void>((resolve, reject) => {
      this.resolveDirectory = resolve;
      this.rejectDirectory = reject;
    });
    // Avoid unhandled rejection if no caller awaits the directory.
    this.directoryReady.catch(() => undefined);
  }

  start(): void {
    if (!this.startPromise) {
      this.startPromise = this.run().catch(() => undefined);
    }
  }

  dispose(): void {
    this.disposed = true;
    this.controller.abort();
    this.fail(new Error('KaraFun kit job disposed'));
  }

  /** Resolves when the kit download/parse is complete; rejects on error. */
  async waitForEnd(): Promise<void> {
    if (this.startPromise) await this.startPromise;
    if (this.error) throw this.error;
  }

  getError(): Error | null {
    return this.error;
  }

  getWritten(type: number): number {
    return this.files.get(type)?.written ?? 0;
  }

  getInfo(type: number): FileInfo {
    const info = this.infos.get(type);
    const file = this.files.get(type);
    if (info) return info;
    return {
      type,
      name: `file-${type}.bin`,
      label: `file-${type}.bin`,
      kind: 'binary',
      mime: 'application/octet-stream',
      size: file?.totalSize ?? 0,
    };
  }

  async waitDirectory(): Promise<void> {
    await this.directoryReady;
    if (this.error) throw this.error;
  }

  async waitFor(type: number, needed: number, timeoutMs = WAIT_TIMEOUT_MS): Promise<void> {
    await this.waitDirectory();
    if (this.error) throw this.error;
    const file = this.files.get(type);
    if (!file) throw new Error(`KaraFun kit has no file type ${type}`);
    if (file.complete || file.written >= needed) return;

    return new Promise<void>((resolve, reject) => {
      let waiter!: Waiter;
      const timer = setTimeout(() => {
        this.removeWaiter(type, waiter);
        reject(new Error(`Timed out waiting for KaraFun kit type ${type} at ${needed} bytes`));
      }, timeoutMs);
      waiter = {
        needed,
        resolve: () => {
          clearTimeout(timer);
          resolve();
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
        timer,
      };
      const list = this.waiters.get(type) ?? [];
      list.push(waiter);
      this.waiters.set(type, list);
    });
  }

  read(type: number, start: number, end: number): Buffer {
    const file = this.files.get(type);
    if (!file) throw new Error(`KaraFun kit has no file type ${type}`);
    if (start < 0 || end > file.written || start > end) {
      throw new Error(`Invalid KaraFun read range ${start}-${end} for type ${type}`);
    }
    return Buffer.from(file.buffer.subarray(start, end));
  }

  async getManifest(): Promise<ProgressiveManifest> {
    if (!this.manifestPromise) {
      this.manifestPromise = this.buildManifest();
    }
    return this.manifestPromise;
  }

  private async buildManifest(): Promise<ProgressiveManifest> {
    await this.waitDirectory();
    const xmlFile = this.files.get(this.xmlType);
    if (!xmlFile) throw new Error('KaraFun kit has no XML chunk');
    await this.waitFor(this.xmlType, xmlFile.totalSize);
    if (this.error) throw this.error;

    const xml = xmlFile.buffer.toString('utf8');
    const $ = cheerio.load(xml, { xmlMode: true });
    const labels = new Map<number, string>();
    $('file').each((_index, element) => {
      const index = Number($(element).attr('index'));
      const label = $(element).attr('label') ?? $(element).text();
      if (Number.isSafeInteger(index) && index > 0) labels.set(index, label);
    });

    const tracks: ProgressiveTrackInfo[] = [];
    const images: Array<{ type: number; name: string; mime: string; size: number }> = [];
    const presets: Array<{ type: number; name: string; size: number }> = [];

    for (const [type, file] of this.files) {
      if (type === this.xmlType) continue;
      const label = labels.get(type) ?? `file-${type}.bin`;
      const classified = classifyKitFile(label);
      const info: FileInfo = {
        type,
        name: label,
        label,
        kind: classified.kind,
        mime: classified.mime,
        size: file.totalSize,
      };
      if (classified.kind === 'audio') {
        info.role = audioRole({ name: label, label });
        tracks.push({
          type,
          name: label,
          role: info.role,
          mime: 'audio/ogg',
          size: file.totalSize,
        });
      } else if (classified.kind === 'image') {
        images.push({ type, name: label, mime: classified.mime, size: file.totalSize });
      } else if (classified.kind === 'preset') {
        presets.push({ type, name: label, size: file.totalSize });
      }
      this.infos.set(type, info);
    }

    const roleOrder: Record<string, number> = {
      instrumental: 0,
      backing: 1,
      lead: 2,
    };
    tracks.sort((a, b) => (roleOrder[a.role] ?? 9) - (roleOrder[b.role] ?? 9));
    // KaraFun kits carry landscape (h*) and portrait (v*) backgrounds plus overlay
    // PNGs for its effects; prefer a landscape photo, then the largest image.
    const imageRank = (name: string) => {
      const lower = name.toLowerCase();
      if (/^__|black/.test(lower)) return 3;
      if (lower.endsWith('.png')) return 2;
      if (/^v\d/.test(lower)) return 1;
      return 0;
    };
    images.sort((a, b) => imageRank(a.name) - imageRank(b.name) || b.size - a.size);

    const timeline = parseKaraokeXml(xml);
    return {
      songId: this.songId,
      md5: this.md5,
      durationSec: timeline.durationSec || this.durationSec,
      streamSize: this.streamSize,
      notifyPlayTime: this.notifyPlayTime,
      tracks,
      images,
      presets,
      imageType: images[0]?.type ?? null,
      lyrics: timeline,
    };
  }

  private async run(): Promise<void> {
    try {
      const descriptor = await karafunService.descriptor(this.songId);
      this.md5 = descriptor.md5;
      this.durationSec = descriptor.durationSec;
      this.streamSize = descriptor.filesize;
      this.notifyPlayTime = descriptor.notifyPlay ?? 0;

      const response = await fetch(descriptor.stream, {
        headers: { 'User-Agent': KARAFUN_USER_AGENT },
        signal: this.controller.signal,
      });
      if (!response.ok) {
        throw new Error(`KaraFun kit download failed: HTTP ${response.status}`);
      }
      const reader = response.body?.getReader();
      if (!reader) throw new Error('KaraFun kit response has no body');

      for (;;) {
        if (this.disposed) return;
        let stallTimer: NodeJS.Timeout | undefined;
        const stalled = new Promise<never>((_resolve, reject) => {
          stallTimer = setTimeout(() => {
            reject(new Error('KaraFun kit download stalled'));
          }, STALL_TIMEOUT_MS);
        });
        let result: Awaited<ReturnType<typeof reader.read>>;
        try {
          result = await Promise.race([reader.read(), stalled]);
        } catch (error) {
          this.controller.abort();
          throw error;
        } finally {
          clearTimeout(stallTimer);
        }
        const { done, value } = result;
        if (done) break;
        const chunk = Buffer.from(value);
        this.hash.update(chunk);
        this.append(chunk);
        this.process();
      }

      if (this.disposed) return;
      this.process();
      if (this.current !== null || this.cursor < this.buffer.length) {
        throw new Error('KaraFun kit stream ended in the middle of a chunk');
      }

      const actual = this.hash.digest('hex');
      const expected = this.md5.toLowerCase();
      const valid = actual === expected || (expected.length < 32 && actual.endsWith(expected));
      if (!valid) {
        throw new Error(
          `KaraFun kit checksum mismatch for song ${this.songId}: got ${actual}, expected ${this.md5}`,
        );
      }

      for (const [type, file] of this.files) {
        if (file.written !== file.totalSize) {
          throw new Error(
            `KaraFun kit type ${type} incomplete: ${file.written}/${file.totalSize}`,
          );
        }
        file.complete = true;
        this.notify(type);
      }
    } catch (error) {
      if (this.disposed) return;
      this.fail(error instanceof Error ? error : new Error(String(error)));
    }
  }

  private append(chunk: Buffer): void {
    this.buffer = this.buffer.length > 0 ? Buffer.concat([this.buffer, chunk]) : chunk;
    if (this.firstChunk >= 0) return;

    const xmlStart = this.buffer.indexOf(KIT_MAGIC_SEARCH);
    if (xmlStart < 0) {
      if (this.buffer.length > MAX_DIRECTORY_PREFIX_BYTES) {
        throw new Error('KaraFun kit directory is too large');
      }
      return;
    }

    const firstChunk = xmlStart - 9;
    if (firstChunk < 4) throw new Error('Invalid KaraFun kit directory offset');
    const directoryBytes = firstChunk - 4;
    if (directoryBytes % 5 !== 0) throw new Error('Invalid KaraFun kit directory length');

    for (let offset = 4; offset < firstChunk; offset += 5) {
      const type = this.buffer[offset];
      const totalSize = this.buffer.readUInt32BE(offset + 1);
      if (totalSize <= 0 || totalSize > MAX_FILE_BYTES) {
        throw new Error(`Invalid KaraFun kit file size for type ${type}`);
      }
      this.files.set(type, {
        totalSize,
        buffer: Buffer.alloc(totalSize),
        written: 0,
        complete: false,
      });
    }

    this.xmlType = this.buffer[firstChunk];
    this.firstChunk = firstChunk;
    this.cursor = firstChunk;
    this.resolveDirectory();
  }

  private process(): void {
    if (this.firstChunk < 0) return;

    for (;;) {
      if (!this.current) {
        if (this.buffer.length - this.cursor < 9) break;
        const type = this.buffer[this.cursor];
        const size = this.buffer.readUInt32BE(this.cursor + 1);
        const offset = this.buffer.readUInt32BE(this.cursor + 5);
        this.cursor += 9;
        if (size <= 0) throw new Error(`Invalid KaraFun chunk size for type ${type}`);
        const file = this.files.get(type);
        if (!file) throw new Error(`KaraFun chunk references unknown type ${type}`);
        if (offset !== file.written) {
          throw new Error(
            `Non-contiguous KaraFun chunk for type ${type}: offset ${offset}, expected ${file.written}`,
          );
        }
        if (offset + size > file.totalSize) {
          throw new Error(`KaraFun chunk for type ${type} overruns its file`);
        }
        this.current = { type, size, offset, remaining: size, consumed: 0 };
      }

      const current = this.current;
      const file = this.files.get(current.type);
      if (!file) throw new Error(`KaraFun chunk references unknown type ${current.type}`);

      const available = this.buffer.length - this.cursor;
      if (available <= 0) break;
      const take = Math.min(available, current.remaining);
      this.buffer.copy(
        file.buffer,
        current.offset + current.consumed,
        this.cursor,
        this.cursor + take,
      );
      this.cursor += take;
      current.consumed += take;
      current.remaining -= take;
      file.written += take;
      this.notify(current.type);

      if (current.remaining === 0) this.current = null;
    }

    if (this.cursor > 0) {
      this.buffer = this.buffer.subarray(this.cursor);
      this.cursor = 0;
    }
  }

  private notify(type: number): void {
    const file = this.files.get(type);
    if (!file) return;
    if (file.written >= file.totalSize) file.complete = true;

    const list = this.waiters.get(type);
    if (!list || list.length === 0) return;

    const remaining: Waiter[] = [];
    for (const waiter of list) {
      if (this.error) {
        waiter.reject(this.error);
        continue;
      }
      if (file.complete || file.written >= waiter.needed) {
        waiter.resolve();
        continue;
      }
      remaining.push(waiter);
    }
    if (remaining.length > 0) this.waiters.set(type, remaining);
    else this.waiters.delete(type);
  }

  private removeWaiter(type: number, waiter: Waiter): void {
    const list = this.waiters.get(type);
    if (!list) return;
    const index = list.indexOf(waiter);
    if (index >= 0) list.splice(index, 1);
    if (list.length === 0) this.waiters.delete(type);
  }

  private fail(error: Error): void {
    if (this.error) return;
    this.error = error;
    this.rejectDirectory(error);
    for (const [type, list] of this.waiters) {
      for (const waiter of list) waiter.reject(error);
      this.waiters.delete(type);
    }
  }
}

interface JobEntry {
  job: ProgressiveKitJob;
  expiresAt: number;
  lastAccess: number;
}

const JOB_TTL_MS = 30 * 60 * 1000;
const MAX_JOBS = 3;

export class ProgressiveKitService {
  private jobs = new Map<number, JobEntry>();

  getJob(songId: number): ProgressiveKitJob {
    this.evictExpired();
    const now = Date.now();
    let entry = this.jobs.get(songId);
    // A failed download is dropped so the next request retries it.
    if (entry?.job.getError()) {
      entry.job.dispose();
      this.jobs.delete(songId);
      entry = undefined;
    }
    if (!entry) {
      const job = new ProgressiveKitJob(songId);
      entry = { job, expiresAt: now + JOB_TTL_MS, lastAccess: now };
      this.jobs.set(songId, entry);
      job.start();
      this.trim();
    } else {
      entry.lastAccess = now;
      entry.expiresAt = now + JOB_TTL_MS;
    }
    return entry.job;
  }

  async getManifest(songId: number): Promise<ProgressiveManifest> {
    return this.getJob(songId).getManifest();
  }

  private evictExpired(): void {
    const now = Date.now();
    for (const [songId, entry] of this.jobs) {
      if (entry.expiresAt <= now) {
        entry.job.dispose();
        this.jobs.delete(songId);
      }
    }
  }

  private trim(): void {
    while (this.jobs.size > MAX_JOBS) {
      const oldest = [...this.jobs.entries()].sort(
        (a, b) => a[1].lastAccess - b[1].lastAccess,
      )[0];
      if (!oldest) break;
      oldest[1].job.dispose();
      this.jobs.delete(oldest[0]);
    }
  }
}

export const progressiveKitService = new ProgressiveKitService();

/**
 * Stream a logical file from a ProgressiveKitJob as the kit downloads.
 * Supports Range requests so <audio> can seek; bytes are written as they
 * become available rather than waiting for the whole file.
 */
export async function streamProgressiveFile(
  req: Request,
  res: Response,
  job: ProgressiveKitJob,
  type: number,
  mimeOverride?: string,
): Promise<void> {
  await job.waitDirectory();
  const info = job.getInfo(type);
  const total = info.size;
  if (total <= 0) {
    res.status(404).send('KaraFun file not found');
    return;
  }

  let start = 0;
  let end = total - 1;
  let status = 200;
  const range = req.headers.range;
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
    if (!match) {
      res.status(416).setHeader('Content-Range', `bytes */${total}`).end();
      return;
    }
    if (match[1] === '' && match[2] !== '') {
      const suffix = Number(match[2]);
      start = Number.isFinite(suffix) ? Math.max(0, total - suffix) : 0;
      end = total - 1;
    } else {
      start = match[1] === '' ? 0 : Number(match[1]);
      end = match[2] === '' ? total - 1 : Number(match[2]);
    }
    if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= total) {
      res.status(416).setHeader('Content-Range', `bytes */${total}`).end();
      return;
    }
    end = Math.min(end, total - 1);
    status = 206;
  }

  res.status(status);
  res.setHeader('Content-Type', mimeOverride || info.mime || 'application/octet-stream');
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Content-Length', String(end - start + 1));
  res.setHeader('Cache-Control', 'private, max-age=300');
  if (status === 206) {
    res.setHeader('Content-Range', `bytes ${start}-${end}/${total}`);
  }
  res.flushHeaders();

  let aborted = false;
  res.on('close', () => {
    aborted = true;
  });

  let position = start;
  try {
    while (position <= end) {
      if (aborted) return;
      const error = job.getError();
      if (error) throw error;
      const written = job.getWritten(type);
      if (written <= position) {
        await job.waitFor(type, position + 1);
        continue;
      }
      const availableEnd = Math.min(end, written - 1);
      const chunk = job.read(type, position, availableEnd + 1);
      position = availableEnd + 1;
      if (!res.write(chunk)) {
        await Promise.race([
          once(res, 'drain').catch(() => undefined),
          once(res, 'close').catch(() => undefined),
        ]);
      }
    }
    res.end();
  } catch (error) {
    if (res.headersSent) {
      res.destroy(error instanceof Error ? error : new Error(String(error)));
    } else {
      res.status(502).send('KaraFun stream failed');
    }
  }
}

