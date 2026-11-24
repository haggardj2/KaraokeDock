import { spawn } from 'node:child_process';
import type { Writable } from 'node:stream';
import { logger } from '../logger.js';
import { progressiveKitService, type ProgressiveManifest } from './progressive.js';

// Server-side preparation of a KaraFun song, started as soon as it is requested:
// the kit is downloaded, the instrumental and backing tracks are mixed and the key
// applied with ffmpeg, and the result (one AAC stream plus the manifest and background
// image) is held in memory until it is played. Nothing is written to disk.

const ROLE_GAIN: Record<string, number> = {
  instrumental: 1,
  backing: 0.7,
  lead: 0,
};

const PREPARED_TTL_MS = 4 * 60 * 60 * 1000;
const MAX_PREPARED_BYTES = 256 * 1024 * 1024;
const MAX_PREPARED_SONGS = 40;
const MAX_CONCURRENT = 2;
const FFMPEG_TIMEOUT_MS = 180_000;

export interface PreparedSong {
  songId: number;
  key: number;
  manifest: ProgressiveManifest;
  audio: Buffer;
  audioMime: string;
  /** Byte offset of every AAC frame, so playback can start exactly on one. */
  frameOffsets: Uint32Array;
  /** Length of one AAC frame in seconds. */
  frameSec: number;
  image: { type: number; mime: string; data: Buffer } | null;
}

const ADTS_SAMPLE_RATES = [96000, 88200, 64000, 48000, 44100, 32000, 24000, 22050, 16000, 12000, 11025, 8000, 7350];

/**
 * Walks the ADTS headers of an AAC stream. Each frame holds 1024 samples, so frame N
 * starts at exactly N × frameSec and the Player can start (or switch key) on any frame.
 */
export function indexAdtsFrames(audio: Buffer): { frameOffsets: Uint32Array; frameSec: number } {
  const offsets: number[] = [];
  let sampleRate = 0;
  let position = 0;
  while (position + 7 <= audio.length) {
    if (audio[position] !== 0xff || (audio[position + 1] & 0xf6) !== 0xf0) {
      throw new Error(`AAC stream is not ADTS at byte ${position}`);
    }
    if (!sampleRate) sampleRate = ADTS_SAMPLE_RATES[(audio[position + 2] >> 2) & 0x0f] ?? 0;
    const frameLength =
      ((audio[position + 3] & 0x03) << 11) | (audio[position + 4] << 3) | (audio[position + 5] >> 5);
    if (frameLength < 7) throw new Error(`AAC frame at byte ${position} is too short`);
    offsets.push(position);
    position += frameLength;
  }
  if (!sampleRate || offsets.length === 0) throw new Error('AAC stream has no frames');
  return { frameOffsets: Uint32Array.from(offsets), frameSec: 1024 / sampleRate };
}

/** The stream from a frame onward; past the end it is empty. */
export function audioFromFrame(song: PreparedSong, frame: number): Buffer {
  const index = Math.max(0, Math.floor(frame));
  if (index >= song.frameOffsets.length) return song.audio.subarray(song.audio.length);
  return song.audio.subarray(song.frameOffsets[index]);
}

interface Entry {
  promise: Promise<PreparedSong>;
  song: PreparedSong | null;
  lastAccess: number;
  expiresAt: number;
}

export type MixInput = { data: Buffer; gain: number };
export type MixRunner = (inputs: MixInput[], pitchSemitones: number) => Promise<Buffer>;

export function clampKey(value: unknown): number {
  const key = Math.round(Number(value) || 0);
  return Math.max(-6, Math.min(6, key));
}

export function buildMixFilter(inputs: MixInput[], pitchSemitones: number): string {
  const parts = inputs.map(
    (input, index) => `[${index}:a]aresample=44100,aformat=channel_layouts=stereo,volume=${input.gain}[a${index}]`,
  );
  const labels = inputs.map((_input, index) => `[a${index}]`).join('');
  let chain = inputs.length > 1
    ? `${labels}amix=inputs=${inputs.length}:duration=longest:normalize=0`
    : `${labels}anull`;
  if (pitchSemitones !== 0) {
    // rubberband keeps the tempo, so the lyric timeline stays exact.
    chain += `,rubberband=pitch=${Math.pow(2, pitchSemitones / 12).toFixed(6)}`;
  }
  chain += ',alimiter=limit=0.97:level=false[out]';
  return [...parts, chain].join(';');
}

/** Mixes the given Ogg tracks with ffmpeg, reading each from its own pipe. */
export const ffmpegMix: MixRunner = (inputs, pitchSemitones) =>
  new Promise<Buffer>((resolve, reject) => {
    const args = ['-hide_banner', '-loglevel', 'error', '-nostdin'];
    inputs.forEach((_input, index) => args.push('-i', `pipe:${index + 3}`));
    args.push(
      '-filter_complex', buildMixFilter(inputs, pitchSemitones),
      '-map', '[out]',
      '-c:a', 'aac', '-b:a', '192k',
      '-f', 'adts', 'pipe:1',
    );
    const stdio: Array<'pipe' | 'ignore'> = ['ignore', 'pipe', 'pipe', ...inputs.map(() => 'pipe' as const)];
    const child = spawn('ffmpeg', args, { stdio });
    const output: Buffer[] = [];
    let stderr = '';
    const timer = setTimeout(() => child.kill('SIGKILL'), FFMPEG_TIMEOUT_MS);
    child.stdout?.on('data', (chunk: Buffer) => output.push(chunk));
    child.stderr?.on('data', (chunk: Buffer) => {
      if (stderr.length < 2000) stderr += chunk.toString();
    });
    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0 && output.length > 0) resolve(Buffer.concat(output));
      else reject(new Error(`ffmpeg mix failed (${code ?? 'killed'}): ${stderr.trim().slice(0, 300)}`));
    });
    inputs.forEach((input, index) => {
      const pipe = child.stdio[index + 3] as Writable | null;
      if (!pipe) return;
      // ffmpeg may stop reading early on bad input; that is reported by its exit code.
      pipe.on('error', () => undefined);
      pipe.end(input.data);
    });
  });

export class KarafunPreparedService {
  private entries = new Map<string, Entry>();
  private running = 0;
  private waiting: Array<() => void> = [];

  constructor(private readonly mix: MixRunner = ffmpegMix) {}

  private keyOf(songId: number, key: number): string {
    return `${songId}:${key}`;
  }

  /** Starts (or joins) preparation of a song at a key. */
  prepare(songId: number, keyAdjustment = 0): Promise<PreparedSong> {
    const key = clampKey(keyAdjustment);
    this.evictExpired();
    const id = this.keyOf(songId, key);
    const now = Date.now();
    const existing = this.entries.get(id);
    if (existing) {
      existing.lastAccess = now;
      existing.expiresAt = now + PREPARED_TTL_MS;
      return existing.promise;
    }
    const entry: Entry = {
      promise: Promise.resolve(null as unknown as PreparedSong),
      song: null,
      lastAccess: now,
      expiresAt: now + PREPARED_TTL_MS,
    };
    entry.promise = this.withSlot(() => this.build(songId, key)).then(
      (song) => {
        entry.song = song;
        this.trim();
        return song;
      },
      (error: unknown) => {
        // A failed preparation is forgotten so the next request retries it.
        if (this.entries.get(id) === entry) this.entries.delete(id);
        throw error;
      },
    );
    entry.promise.catch(() => undefined);
    this.entries.set(id, entry);
    return entry.promise;
  }

  /** Background preparation for a request; failures are only logged. */
  prepareInBackground(songId: number, keyAdjustment = 0): void {
    this.prepare(songId, keyAdjustment).catch((error: unknown) => {
      logger.warn(
        `KaraFun preparation failed for song ${songId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    });
  }

  /** A prepared song at any key, for the background image. */
  findReady(songId: number): PreparedSong | null {
    for (const entry of this.entries.values()) {
      if (entry.song?.songId === songId) return entry.song;
    }
    return null;
  }

  private async withSlot<T>(task: () => Promise<T>): Promise<T> {
    while (this.running >= MAX_CONCURRENT) {
      await new Promise<void>((resolve) => this.waiting.push(resolve));
    }
    this.running += 1;
    try {
      return await task();
    } finally {
      this.running -= 1;
      this.waiting.shift()?.();
    }
  }

  private async build(songId: number, key: number): Promise<PreparedSong> {
    try {
      return await this.buildOnce(songId, key);
    } catch (error) {
      // The shared kit job can be evicted while it downloads; try once more.
      if (error instanceof Error && /disposed/.test(error.message)) {
        return this.buildOnce(songId, key);
      }
      throw error;
    }
  }

  private async buildOnce(songId: number, key: number): Promise<PreparedSong> {
    const job = progressiveKitService.getJob(songId);
    const manifest = await job.getManifest();
    await job.waitForEnd();

    let mixTracks = manifest.tracks.filter((track) => (ROLE_GAIN[track.role] ?? 0) > 0);
    if (mixTracks.length === 0) mixTracks = manifest.tracks.slice(0, 1);
    if (mixTracks.length === 0) throw new Error('KaraFun kit has no audio tracks');
    const inputs = mixTracks.map((track) => ({
      data: job.read(track.type, 0, track.size),
      gain: ROLE_GAIN[track.role] || 1,
    }));

    let image: PreparedSong['image'] = null;
    const imageInfo = manifest.images.find((candidate) => candidate.type === manifest.imageType);
    if (imageInfo) {
      image = { type: imageInfo.type, mime: imageInfo.mime, data: job.read(imageInfo.type, 0, imageInfo.size) };
    }

    const started = Date.now();
    const audio = await this.mix(inputs, key);
    logger.info(
      `KaraFun song ${songId} prepared (key ${key}) in ${Date.now() - started} ms, ${Math.round(audio.length / 1024)} KiB`,
    );
    return { songId, key, manifest, audio, audioMime: 'audio/aac', ...indexAdtsFrames(audio), image };
  }

  private sizeOf(song: PreparedSong | null): number {
    if (!song) return 0;
    return song.audio.length + song.frameOffsets.byteLength + (song.image?.data.length ?? 0);
  }

  private evictExpired(): void {
    const now = Date.now();
    for (const [id, entry] of this.entries) {
      if (entry.song && entry.expiresAt <= now) this.entries.delete(id);
    }
  }

  private trim(): void {
    const ready = () => [...this.entries.entries()].filter(([, entry]) => entry.song);
    let total = ready().reduce((sum, [, entry]) => sum + this.sizeOf(entry.song), 0);
    while (ready().length > MAX_PREPARED_SONGS || total > MAX_PREPARED_BYTES) {
      const oldest = ready().sort((a, b) => a[1].lastAccess - b[1].lastAccess)[0];
      if (!oldest) break;
      total -= this.sizeOf(oldest[1].song);
      this.entries.delete(oldest[0]);
    }
  }
}

export const karafunPreparedService = new KarafunPreparedService();
