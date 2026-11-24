import { API_BASE } from "../../../api";
import { getKaraokeAudioContext, requestKaraokeAudio } from "./audioContext";

// Seconds ahead of the song clock that a new key's stream is requested, so it can take
// over at that moment without repeating or skipping audio.
const KEY_SWITCH_LEAD_SEC = 1;
const KEY_SWITCH_ATTEMPTS = 3;
// A stream that drops mid-song is reopened where it stopped, a few times at most.
const MAX_RECONNECTS = 3;

type OpenStream = {
  element: HTMLAudioElement;
  source: MediaElementAudioSourceNode;
  /** Song time at the element's time 0. */
  offset: number;
};

function waitUntilPlayable(element: HTMLAudioElement, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      element.removeEventListener("canplay", onReady);
      element.removeEventListener("error", onError);
      signal?.removeEventListener("abort", onAbort);
    };
    const onReady = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error(`KaraFun audio stream failed (${element.error?.code ?? "unknown"})`));
    };
    const onAbort = () => {
      cleanup();
      reject(new DOMException("Aborted", "AbortError"));
    };
    if (signal?.aborted) return onAbort();
    element.addEventListener("canplay", onReady);
    element.addEventListener("error", onError);
    signal?.addEventListener("abort", onAbort);
  });
}

function releaseElement(stream: OpenStream): void {
  stream.element.pause();
  stream.element.removeAttribute("src");
  stream.element.load();
  stream.source.disconnect();
}

/**
 * Plays the server's prepared mix as a stream through an <audio> element, so only a few
 * seconds of a song are held in memory at once (a long song decoded whole would take
 * hundreds of megabytes). The server starts the stream on an exact AAC frame, which
 * keeps the lyric clock exact when playback starts mid-song or the key changes.
 */
export class KaraokeStreamAudio {
  readonly context: AudioContext;
  private master: GainNode;
  private analyser: AnalyserNode;
  private frequencyData: Uint8Array<ArrayBuffer>;
  private stream: OpenStream | null = null;
  private key: number;
  private wantPlaying = false;
  private blocked = false;
  private disposed = false;
  private finished = false;
  private reconnects = 0;
  private keyToken = 0;
  private onEnded: (() => void) | null = null;
  private readonly onContextState = () => this.startWhenAllowed();
  private readonly onGesture = () => this.startWhenAllowed();

  constructor(
    private readonly songId: number,
    key: number,
    private readonly frameSec: number,
    private readonly durationSec: number,
  ) {
    this.key = key;
    this.context = getKaraokeAudioContext();
    this.master = this.context.createGain();
    this.analyser = this.context.createAnalyser();
    this.analyser.fftSize = 1024;
    this.analyser.smoothingTimeConstant = 0.8;
    this.frequencyData = new Uint8Array(new ArrayBuffer(this.analyser.frequencyBinCount));
    this.master.connect(this.analyser);
    this.analyser.connect(this.context.destination);
    this.context.addEventListener("statechange", this.onContextState);
  }

  get duration(): number {
    return this.durationSec;
  }

  /** Song-time clock used by lyrics and the Host. */
  get currentTime(): number {
    const stream = this.stream;
    if (!stream) return 0;
    if (this.finished) return this.durationSec;
    return Math.min(this.durationSec, stream.offset + stream.element.currentTime);
  }

  get isPlaying(): boolean {
    return this.wantPlaying && !!this.stream && !this.stream.element.paused;
  }

  /** True while the browser refuses to start the audio element. */
  get playBlocked(): boolean {
    return this.wantPlaying && this.blocked;
  }

  setOnEnded(callback: (() => void) | null): void {
    this.onEnded = callback;
  }

  getSpectrum(): Uint8Array<ArrayBuffer> {
    this.analyser.getByteFrequencyData(this.frequencyData);
    return this.frequencyData;
  }

  /** Opens the stream at a song position, ready to play. */
  async load(startAt: number, signal?: AbortSignal): Promise<void> {
    this.attach(await this.open(this.key, startAt, signal));
  }

  async play(fromTimeline?: number): Promise<void> {
    if (fromTimeline != null && Math.abs(fromTimeline - this.currentTime) > this.frameSec * 2) {
      await this.reopen(fromTimeline);
    }
    this.wantPlaying = true;
    this.startWhenAllowed();
  }

  pause(): void {
    this.wantPlaying = false;
    this.stream?.element.pause();
  }

  async resume(): Promise<void> {
    await this.play();
  }

  async seek(timeline: number): Promise<void> {
    const target = Math.max(0, Math.min(timeline, this.durationSec));
    if (Math.abs(target - this.currentTime) <= this.frameSec * 2) return;
    await this.reopen(target);
    if (this.wantPlaying) this.startWhenAllowed();
  }

  /**
   * Switches to the song at another key without a gap: the new stream is opened a moment
   * ahead and takes over when the song reaches that point.
   */
  async setKey(key: number): Promise<void> {
    if (key === this.key || this.disposed) return;
    const token = ++this.keyToken;
    for (let attempt = 1; attempt <= KEY_SWITCH_ATTEMPTS; attempt += 1) {
      const lead = this.isPlaying ? KEY_SWITCH_LEAD_SEC * attempt : 0;
      const next = await this.open(key, this.currentTime + lead);
      if (token !== this.keyToken || this.disposed) {
        releaseElement(next);
        return;
      }
      const wait = next.offset - this.currentTime;
      if (this.isPlaying && wait < -this.frameSec * 2 && attempt < KEY_SWITCH_ATTEMPTS) {
        // Opening took longer than the lead; try again further ahead.
        releaseElement(next);
        continue;
      }
      if (this.isPlaying && wait > 0) {
        await new Promise((resolve) => window.setTimeout(resolve, wait * 1000));
        if (token !== this.keyToken || this.disposed) {
          releaseElement(next);
          return;
        }
      }
      this.key = key;
      this.attach(next);
      if (this.wantPlaying) this.startWhenAllowed();
      return;
    }
  }

  private url(key: number, frame: number): string {
    return `${API_BASE}/api/karafun/prepared/${this.songId}/audio?key=${key}&frame=${frame}`;
  }

  private async open(key: number, time: number, signal?: AbortSignal): Promise<OpenStream> {
    const frame = Math.max(0, Math.floor(Math.max(0, time) / this.frameSec + 1e-6));
    const element = new Audio();
    element.preload = "auto";
    if (new URL(API_BASE, window.location.href).origin !== window.location.origin) {
      // Web Audio only hears cross-origin media fetched with CORS.
      element.crossOrigin = "anonymous";
    }
    element.src = this.url(key, frame);
    const source = this.context.createMediaElementSource(element);
    source.connect(this.master);
    const stream = { element, source, offset: frame * this.frameSec };
    try {
      await waitUntilPlayable(element, signal);
    } catch (error) {
      releaseElement(stream);
      throw error;
    }
    return stream;
  }

  private async reopen(time: number): Promise<void> {
    const next = await this.open(this.key, time);
    if (this.disposed) {
      releaseElement(next);
      return;
    }
    this.attach(next);
  }

  private attach(next: OpenStream): void {
    const previous = this.stream;
    this.stream = next;
    this.finished = false;
    if (previous) releaseElement(previous);
    next.element.addEventListener("ended", () => {
      if (this.stream !== next || this.disposed) return;
      this.finished = true;
      this.wantPlaying = false;
      this.onEnded?.();
    });
    next.element.addEventListener("error", () => {
      if (this.stream !== next || this.disposed || this.finished) return;
      if (this.reconnects >= MAX_RECONNECTS) return;
      this.reconnects += 1;
      const resumeAt = this.currentTime;
      void this.reopen(resumeAt)
        .then(() => this.startWhenAllowed())
        .catch((error) => console.warn("KaraFun stream could not reconnect:", error));
    });
  }

  /**
   * Starts the element once audio may play. While the shared context is held back, the
   * element waits too, so the song clock never runs ahead of what is heard.
   */
  private startWhenAllowed(): void {
    const element = this.stream?.element;
    if (!element || this.disposed) return;
    if (!this.wantPlaying) return;
    if (this.context.state !== "running") {
      element.pause();
      requestKaraokeAudio();
      return;
    }
    if (!element.paused) return;
    element.play().then(
      () => {
        this.blocked = false;
        window.removeEventListener("pointerdown", this.onGesture, true);
        window.removeEventListener("keydown", this.onGesture, true);
      },
      (error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        // Autoplay refused: try again on the next touch or key press.
        this.blocked = true;
        window.addEventListener("pointerdown", this.onGesture, true);
        window.addEventListener("keydown", this.onGesture, true);
      },
    );
  }

  dispose(): void {
    this.disposed = true;
    this.wantPlaying = false;
    this.keyToken += 1;
    this.context.removeEventListener("statechange", this.onContextState);
    window.removeEventListener("pointerdown", this.onGesture, true);
    window.removeEventListener("keydown", this.onGesture, true);
    if (this.stream) releaseElement(this.stream);
    this.stream = null;
    // The context is shared by every song on the page; only this song's graph goes.
    this.master.disconnect();
    this.analyser.disconnect();
  }
}
