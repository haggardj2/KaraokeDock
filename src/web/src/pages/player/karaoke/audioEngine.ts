import { API_BASE } from "../../../api";
import { getKaraokeAudioContext, requestKaraokeAudio } from "./audioContext";
import type { KaraokeManifest, KaraokeTrack } from "./types";
import type {
  PitchTempoRequest,
  PitchTempoResponse,
} from "./pitchTempo.worker";

const ROLE_GAIN: Record<string, number> = {
  instrumental: 1,
  backing: 0.7,
  lead: 0,
};

const MAX_CACHE_ENTRIES = 2;

type ProcessingEntry = {
  resolve: (left: Float32Array, right: Float32Array) => void;
  reject: (error: Error) => void;
};

/**
 * Decodes the three KaraFun Ogg tracks once, mixes them with the official
 * backing/lead defaults, and plays the mix through Web Audio.
 *
 * Pitch and tempo are applied by a worker (resample + WSOLA). The lyric clock
 * stays in original song time so key/tempo changes never desync lyrics or the
 * Host's completion logic.
 */
export class KaraokeAudio {
  readonly context: AudioContext;
  private master: GainNode;
  private analyser: AnalyserNode;
  private frequencyData: Uint8Array<ArrayBuffer>;
  private mixed: AudioBuffer | null = null;
  private processed: AudioBuffer | null = null;
  private source: AudioBufferSourceNode | null = null;
  private worker: Worker | null = null;
  private processing = new Map<number, ProcessingEntry>();
  private nextRequestId = 1;
  private processToken = 0;
  private cache = new Map<string, AudioBuffer>();
  private startedAt = 0;
  private offset = 0;
  private playing = false;
  private stopping = false;
  private pitch = 0;
  private tempo = 0;
  private disposed = false;
  private onEnded: (() => void) | null = null;

  constructor() {
    this.context = getKaraokeAudioContext();
    this.master = this.context.createGain();
    this.master.gain.value = 1;
    this.analyser = this.context.createAnalyser();
    this.analyser.fftSize = 1024;
    this.analyser.smoothingTimeConstant = 0.8;
    this.frequencyData = new Uint8Array(
      new ArrayBuffer(this.analyser.frequencyBinCount),
    );
    this.master.connect(this.analyser);
    this.analyser.connect(this.context.destination);
  }

  get ready(): boolean {
    return this.mixed != null;
  }

  get duration(): number {
    return this.mixed?.duration ?? 0;
  }

  get isPlaying(): boolean {
    return this.playing;
  }

  get isProcessing(): boolean {
    return this.processing.size > 0;
  }

  get tempoRatio(): number {
    return Math.min(2, Math.max(0.5, 1 + this.tempo / 100));
  }

  async load(
    songId: number,
    manifest: KaraokeManifest,
    onProgress?: (message: string) => void,
  ): Promise<void> {
    const tracks = [...manifest.tracks].sort(
      (a, b) =>
        (ROLE_GAIN[a.role] == null ? 9 : 0) -
        (ROLE_GAIN[b.role] == null ? 9 : 0),
    );
    if (tracks.length === 0) throw new Error("KaraFun kit has no audio tracks");

    onProgress?.("Downloading KaraFun audio…");
    const encoded = await Promise.all(
      tracks.map(async (track) => {
        const response = await fetch(
          `${API_BASE}/api/karafun/audio/${songId}/${track.type}`,
        );
        if (!response.ok) {
          throw new Error(
            `KaraFun audio failed (${track.role || track.name}): HTTP ${response.status}`,
          );
        }
        return response.arrayBuffer();
      }),
    );

    onProgress?.("Decoding KaraFun audio…");
    const decoded: AudioBuffer[] = [];
    for (const bytes of encoded) {
      decoded.push(await this.context.decodeAudioData(bytes));
    }
    this.mixed = this.mix(decoded, tracks);
    this.offset = 0;
    if (this.pitch !== 0 || this.tempo !== 0) {
      await this.reprocess(this.pitch, this.tempo);
    }
    onProgress?.("");
  }

  /**
   * Loads the server's ready-made mix (already at the queued key): one download and
   * one decode instead of three tracks mixed in the browser.
   */
  async loadPrepared(songId: number, key: number, signal?: AbortSignal): Promise<void> {
    const response = await fetch(
      `${API_BASE}/api/karafun/prepared/${songId}/audio?key=${key}`,
      { signal },
    );
    if (!response.ok) {
      throw new Error(`KaraFun prepared audio failed: HTTP ${response.status}`);
    }
    const decoded = await this.context.decodeAudioData(await response.arrayBuffer());
    if (decoded.numberOfChannels >= 2) {
      this.mixed = decoded;
    } else {
      const stereo = this.context.createBuffer(2, decoded.length, decoded.sampleRate);
      stereo.getChannelData(0).set(decoded.getChannelData(0));
      stereo.getChannelData(1).set(decoded.getChannelData(0));
      this.mixed = stereo;
    }
    this.processed = null;
    this.offset = 0;
  }

  private mix(buffers: AudioBuffer[], tracks: KaraokeTrack[]): AudioBuffer {
    const sampleRate = buffers[0]?.sampleRate ?? this.context.sampleRate;
    const length = Math.max(...buffers.map((buffer) => buffer.length));
    const mixed = this.context.createBuffer(2, length, sampleRate);
    const outLeft = mixed.getChannelData(0);
    const outRight = mixed.getChannelData(1);

    buffers.forEach((buffer, index) => {
      const gain = ROLE_GAIN[tracks[index]?.role] ?? 0;
      if (gain === 0) return;
      const left = buffer.getChannelData(0);
      const right =
        buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : left;
      for (let sample = 0; sample < buffer.length; sample += 1) {
        outLeft[sample] += left[sample] * gain;
        outRight[sample] += right[sample] * gain;
      }
    });

    // Unknown labels should still produce a usable mix.
    if (!tracks.some((track) => ROLE_GAIN[track.role] > 0)) {
      const buffer = buffers[0];
      const left = buffer.getChannelData(0);
      const right =
        buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : left;
      outLeft.set(left);
      outRight.set(right);
    }

    for (let sample = 0; sample < length; sample += 1) {
      outLeft[sample] = Math.max(-1, Math.min(1, outLeft[sample]));
      outRight[sample] = Math.max(-1, Math.min(1, outRight[sample]));
    }
    return mixed;
  }

  async play(fromTimeline?: number): Promise<void> {
    if (!this.mixed) return;
    // A blocked context keeps its clock at 0, so the song (and its lyrics and timing)
    // simply starts from the beginning once the browser allows audio.
    requestKaraokeAudio();
    const timeline = fromTimeline ?? this.currentTime;
    const maxOffset = Math.max(0, this.processedBuffer.duration - 0.01);
    const processedOffset = Math.max(
      0,
      Math.min(this.timelineToProcessed(timeline), maxOffset),
    );
    this.stopSource();
    const source = this.context.createBufferSource();
    source.buffer = this.processedBuffer;
    source.connect(this.master);
    this.stopping = false;
    source.onended = () => {
      if (this.stopping) return;
      this.playing = false;
      this.offset = this.processedBuffer.duration;
      this.onEnded?.();
    };
    source.start(0, processedOffset);
    this.source = source;
    this.startedAt = this.context.currentTime - processedOffset;
    this.playing = true;
  }

  pause(): void {
    if (!this.playing) return;
    this.offset = this.processedTime;
    this.playing = false;
    this.stopSource();
  }

  async resume(): Promise<void> {
    if (this.playing) return;
    await this.play(this.currentTime);
  }

  async seek(timeline: number): Promise<void> {
    const target = Math.max(0, Math.min(timeline, this.duration));
    if (this.playing) {
      await this.play(target);
    } else {
      this.offset = Math.max(0, this.timelineToProcessed(target));
    }
  }

  async setPitch(semitones: number): Promise<void> {
    const next = Math.max(-12, Math.min(12, Math.round(semitones)));
    if (next === this.pitch) return;
    await this.changeProcessing(next, this.tempo);
  }

  async setTempo(percent: number): Promise<void> {
    const next = Math.max(-50, Math.min(50, Math.round(percent)));
    if (next === this.tempo) return;
    await this.changeProcessing(this.pitch, next);
  }

  private async changeProcessing(
    pitch: number,
    tempo: number,
  ): Promise<void> {
    const wasPlaying = this.playing;
    if (wasPlaying) this.pause();
    // Freeze the song clock while the new buffer is prepared so resuming
    // never replays or skips audio.
    const timeline = this.currentTime;
    this.pitch = pitch;
    this.tempo = tempo;
    const token = ++this.processToken;
    await this.reprocess(pitch, tempo);
    if (token !== this.processToken || this.disposed) return;
    this.offset = this.timelineToProcessed(timeline);
    if (wasPlaying) await this.play(timeline);
  }

  private async reprocess(pitch: number, tempo: number): Promise<void> {
    if (!this.mixed) return;
    if (pitch === 0 && tempo === 0) {
      this.processed = null;
      return;
    }
    const key = `${pitch}:${tempo}`;
    const cached = this.cache.get(key);
    if (cached) {
      this.processed = cached;
      return;
    }
    const worker = this.getWorker();
    const left = this.mixed.getChannelData(0).slice();
    const right = this.mixed.getChannelData(1).slice();
    const id = this.nextRequestId++;
    const result = await new Promise<[Float32Array, Float32Array]>(
      (resolve, reject) => {
        this.processing.set(id, {
          resolve: (outLeft, outRight) => resolve([outLeft, outRight]),
          reject,
        });
        const request: PitchTempoRequest = {
          id,
          left,
          right,
          pitchSemitones: pitch,
          tempoPercent: tempo,
        };
        worker.postMessage(request, [left.buffer, right.buffer]);
      },
    );
    if (this.disposed) return;
    const [outLeft, outRight] = result;
    const buffer = this.context.createBuffer(
      2,
      outLeft.length,
      this.context.sampleRate,
    );
    buffer.getChannelData(0).set(outLeft);
    buffer.getChannelData(1).set(outRight);
    this.processed = buffer;
    this.cache.set(key, buffer);
    if (this.cache.size > MAX_CACHE_ENTRIES) {
      const oldest = this.cache.keys().next().value;
      if (oldest != null) this.cache.delete(oldest);
    }
  }

  private getWorker(): Worker {
    if (this.worker) return this.worker;
    const worker = new Worker(
      new URL("./pitchTempo.worker.ts", import.meta.url),
      { type: "module" },
    );
    worker.onmessage = (event: MessageEvent<PitchTempoResponse & { error?: string }>) => {
      const { id, left, right, error } = event.data;
      const entry = this.processing.get(id);
      this.processing.delete(id);
      if (!entry) return;
      if (error) entry.reject(new Error(error));
      else entry.resolve(left, right);
    };
    worker.onerror = () => {
      for (const entry of this.processing.values()) {
        entry.reject(new Error("KaraFun pitch/tempo worker failed"));
      }
      this.processing.clear();
    };
    this.worker = worker;
    return worker;
  }

  get processedBuffer(): AudioBuffer {
    return this.processed ?? this.mixed ?? this.context.createBuffer(2, 1, this.context.sampleRate);
  }

  get processedTime(): number {
    if (!this.playing) return this.offset;
    return Math.max(0, this.context.currentTime - this.startedAt);
  }

  /** Song-time clock used by lyrics and the Host. */
  get currentTime(): number {
    return Math.min(
      this.duration,
      this.processedTime * this.tempoRatio,
    );
  }

  private timelineToProcessed(timeline: number): number {
    return Math.max(0, timeline / this.tempoRatio);
  }

  getSpectrum(): Uint8Array<ArrayBuffer> {
    this.analyser.getByteFrequencyData(this.frequencyData);
    return this.frequencyData;
  }

  setOnEnded(callback: (() => void) | null): void {
    this.onEnded = callback;
  }

  private stopSource(): void {
    if (!this.source) return;
    this.stopping = true;
    this.source.onended = null;
    try {
      this.source.stop();
    } catch {
      // Already stopped.
    }
    this.source.disconnect();
    this.source = null;
  }

  dispose(): void {
    this.disposed = true;
    this.playing = false;
    this.stopSource();
    this.worker?.terminate();
    this.worker = null;
    this.processing.clear();
    // The context is shared by every song on the page; only this song's graph goes.
    this.master.disconnect();
    this.analyser.disconnect();
  }
}
