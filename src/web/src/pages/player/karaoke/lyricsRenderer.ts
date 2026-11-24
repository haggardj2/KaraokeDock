import type { KaraokeLine, KaraokePage, KaraokeTimeline } from "./types";

// KaraFun places every line on a 640×480 lyric screen, groups lines into pages that
// fade in and out at authored times, and draws a countdown bar before a line that
// follows an instrumental break. This renderer follows that layout, scaled to fit.

const SCREEN_WIDTH = 640;
const SCREEN_HEIGHT = 480;
const DEFAULT_LINE_HEIGHT = 52;
const MAX_LINE_WIDTH = 620;
/** Space kept around the song's lines when fitting them to the screen (screen units). */
const BAND_PADDING = 24;
/** Never zoom in beyond this band height, so a song with one line is not huge. */
const MIN_BAND_HEIGHT = 300;
const FONT_STACK =
  '"Inter", "Segoe UI", "Helvetica Neue", system-ui, -apple-system, sans-serif';
const DEFAULT_ACTIVE = "#2f9ff2";
const DEFAULT_INACTIVE = "#ffffff";
const DEFAULT_BORDER = "#000000";

type Segment = { start: number; end: number; x0: number; x1: number };

type LineLayout = {
  text: string;
  fontSize: number;
  /** Left edge and baseline-centre of the text, in canvas pixels. */
  left: number;
  centerY: number;
  width: number;
  segments: Segment[];
};

type PreparedLine = {
  line: KaraokeLine;
  page: KaraokePage;
  /** Placement in screen units (640×480). */
  x: number;
  y: number;
  width: number;
  height: number;
};

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function smooth(value: number): number {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
}

function lineText(line: KaraokeLine): { text: string; parts: Array<{ text: string; start: number; end: number; space: boolean }> } {
  const parts: Array<{ text: string; start: number; end: number; space: boolean }> = [];
  line.words.forEach((word, wordIndex) => {
    word.syllables.forEach((syllable, syllableIndex) => {
      parts.push({
        text: syllable.text,
        start: syllable.start,
        end: Math.max(syllable.end, syllable.start),
        space: wordIndex > 0 && syllableIndex === 0,
      });
    });
  });
  return { text: parts.map((part) => (part.space ? " " : "") + part.text).join(""), parts };
}

/** Pages and positions for lyrics that came without them (older timelines). */
function fallbackLayout(lines: KaraokeLine[]): PreparedLine[] {
  const prepared: PreparedLine[] = [];
  for (let index = 0; index < lines.length; index += 2) {
    const group = lines.slice(index, index + 2);
    const first = group[0];
    const last = group[group.length - 1];
    const page: KaraokePage = {
      fadeInStart: Math.max(0, first.start - 1.2),
      fadeInDuration: 0.5,
      fadeOutStart: last.end + 0.3,
      fadeOutDuration: 0.5,
    };
    // Alternate pages between the upper and lower rows so crossfades never overlap.
    const top = (index / 2) % 2 === 0 ? 120 : 250;
    group.forEach((line, row) => {
      prepared.push({ line, page, x: 20, y: top + row * 62, width: 600, height: DEFAULT_LINE_HEIGHT });
    });
  }
  return prepared;
}

export class LyricsRenderer {
  private lines: PreparedLine[] = [];
  private width = 0;
  private height = 0;
  /** Pixels at the bottom covered by the Player overlay (ticker, QR code). */
  private bottomInset = 0;
  /** Vertical range of the lyric screen the song actually uses. */
  private bandTop = 0;
  private bandHeight = SCREEN_HEIGHT;
  private layoutCache = new Map<PreparedLine, LineLayout>();
  private measureContext: CanvasRenderingContext2D | null = null;
  /** Start of the first page fade-in: when lyrics begin to appear. */
  firstLyricsAt = 0;

  setTimeline(timeline: KaraokeTimeline): void {
    const pages = timeline.pages ?? [];
    const lines = timeline.lines ?? [];
    const positioned = pages.length > 0 && lines.every((line) => line.page != null && pages[line.page]);
    if (positioned) {
      const rowsByPage = new Map<number, number>();
      this.lines = lines.map((line) => {
        const page = pages[line.page as number];
        const row = rowsByPage.get(line.page as number) ?? 0;
        rowsByPage.set(line.page as number, row + 1);
        const position = line.position ?? { x: 20, y: 150 + row * 60, width: 600, height: DEFAULT_LINE_HEIGHT };
        return { line, page, ...position };
      });
    } else {
      this.lines = fallbackLayout(lines);
    }
    if (this.lines.length > 0) {
      const top = Math.min(...this.lines.map((entry) => entry.y)) - BAND_PADDING;
      const bottom = Math.max(...this.lines.map((entry) => entry.y + entry.height)) + BAND_PADDING;
      const height = Math.min(SCREEN_HEIGHT, Math.max(MIN_BAND_HEIGHT, bottom - top));
      const center = (top + bottom) / 2;
      this.bandTop = Math.max(0, Math.min(SCREEN_HEIGHT - height, center - height / 2));
      this.bandHeight = height;
    } else {
      this.bandTop = 0;
      this.bandHeight = SCREEN_HEIGHT;
    }
    this.firstLyricsAt = this.lines.length
      ? Math.min(...this.lines.map((entry) => Math.min(entry.page.fadeInStart, entry.line.countdown?.start ?? Infinity)))
      : 0;
    this.layoutCache.clear();
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.layoutCache.clear();
  }

  /** Keeps lyrics above the Player overlay; returns true when the layout changed. */
  setBottomInset(pixels: number): boolean {
    const next = Math.max(0, Math.min(this.height * 0.4, Math.round(pixels)));
    if (next === this.bottomInset) return false;
    this.bottomInset = next;
    this.layoutCache.clear();
    return true;
  }

  private get availableHeight(): number {
    return Math.max(1, this.height - this.bottomInset);
  }

  /** Fits the used band of the 640×480 lyric screen into the area above the overlay. */
  private get scale(): number {
    return Math.min(this.width / SCREEN_WIDTH, this.availableHeight / this.bandHeight);
  }

  private layout(entry: PreparedLine): LineLayout | null {
    const cached = this.layoutCache.get(entry);
    if (cached) return cached;
    this.measureContext ??= document.createElement("canvas").getContext("2d");
    const context = this.measureContext;
    if (!context || this.width <= 0) return null;

    const scale = this.scale;
    const originX = (this.width - SCREEN_WIDTH * scale) / 2;
    const originY = (this.availableHeight - this.bandHeight * scale) / 2 - this.bandTop * scale;
    const { text, parts } = lineText(entry.line);

    let fontSize = Math.max(10, entry.height * 0.78 * scale);
    context.font = `800 ${fontSize}px ${FONT_STACK}`;
    let width = context.measureText(text).width;
    const maxWidth = MAX_LINE_WIDTH * scale;
    if (width > maxWidth) {
      fontSize *= maxWidth / width;
      context.font = `800 ${fontSize}px ${FONT_STACK}`;
      width = context.measureText(text).width;
    }

    // Keep the authored centre, but never run off the lyric screen.
    const authoredCenter = originX + (entry.x + entry.width / 2) * scale;
    const minLeft = originX + ((SCREEN_WIDTH - MAX_LINE_WIDTH) / 2) * scale;
    const maxLeft = originX + ((SCREEN_WIDTH + MAX_LINE_WIDTH) / 2) * scale - width;
    const left = Math.min(maxLeft, Math.max(minLeft, authoredCenter - width / 2));

    // Prefix widths keep the wipe aligned with kerning across syllables.
    const segments: Segment[] = [];
    let prefix = "";
    for (const part of parts) {
      if (part.space) prefix += " ";
      const x0 = context.measureText(prefix).width;
      prefix += part.text;
      segments.push({ start: part.start, end: part.end, x0, x1: context.measureText(prefix).width });
    }

    const layout: LineLayout = {
      text,
      fontSize,
      left,
      centerY: originY + (entry.y + entry.height / 2) * scale,
      width,
      segments,
    };
    this.layoutCache.set(entry, layout);
    return layout;
  }

  /** How far (in pixels from the line's left edge) the sung colour has reached. */
  private sungWidth(layout: LineLayout, time: number): number {
    let reached = 0;
    for (const segment of layout.segments) {
      if (time < segment.start) break;
      if (time >= segment.end) {
        reached = segment.x1;
        continue;
      }
      const duration = Math.max(0.001, segment.end - segment.start);
      reached = segment.x0 + (segment.x1 - segment.x0) * ((time - segment.start) / duration);
      break;
    }
    return reached;
  }

  private pageAlpha(page: KaraokePage, time: number): number {
    const fadeIn = page.fadeInDuration > 0
      ? clamp01((time - page.fadeInStart) / page.fadeInDuration)
      : time >= page.fadeInStart ? 1 : 0;
    const fadeOut = page.fadeOutDuration > 0
      ? 1 - clamp01((time - page.fadeOutStart) / page.fadeOutDuration)
      : time < page.fadeOutStart ? 1 : 0;
    return smooth(Math.min(fadeIn, fadeOut));
  }

  render(ctx: CanvasRenderingContext2D, time: number): void {
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.lineJoin = "round";

    for (const entry of this.lines) {
      const countdownVisible = entry.line.countdown != null &&
        time >= entry.line.countdown.start && time < entry.line.start;
      const alpha = Math.max(this.pageAlpha(entry.page, time), countdownVisible ? 1 : 0);
      if (alpha <= 0.001) continue;
      const layout = this.layout(entry);
      if (!layout) continue;

      const active = entry.page.activeColor ?? DEFAULT_ACTIVE;
      const inactive = entry.page.inactiveColor ?? DEFAULT_INACTIVE;
      const border = entry.page.inactiveBorderColor ?? DEFAULT_BORDER;
      const rise = (1 - alpha) * layout.fontSize * 0.18;
      const y = layout.centerY + rise;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = `800 ${layout.fontSize}px ${FONT_STACK}`;

      // Outline with a soft shadow keeps the words readable over any background.
      ctx.shadowColor = "rgba(0, 0, 0, 0.55)";
      ctx.shadowBlur = layout.fontSize * 0.28;
      ctx.lineWidth = Math.max(2, layout.fontSize * 0.13);
      ctx.strokeStyle = border;
      ctx.strokeText(layout.text, layout.left, y);
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;

      // The sung colour sweeps on with a feathered edge, not a hard-clipped block.
      const sung = this.sungWidth(layout, time);
      if (sung <= 0) {
        ctx.fillStyle = inactive;
      } else if (sung >= layout.width) {
        ctx.fillStyle = active;
      } else {
        const feather = Math.max(4, layout.fontSize * 0.22);
        const gradient = ctx.createLinearGradient(layout.left, 0, layout.left + layout.width, 0);
        const edge = sung / layout.width;
        const half = feather / 2 / layout.width;
        gradient.addColorStop(0, active);
        gradient.addColorStop(clamp01(edge - half), active);
        gradient.addColorStop(clamp01(edge + half), inactive);
        gradient.addColorStop(1, inactive);
        ctx.fillStyle = gradient;
      }
      ctx.fillText(layout.text, layout.left, y);

      if (countdownVisible && entry.line.countdown) {
        this.drawCountdown(ctx, entry, layout, time, active, inactive, border);
      }
      ctx.restore();
    }
  }

  /** KaraFun's progressive bar: empties toward the first word as singing nears. */
  private drawCountdown(
    ctx: CanvasRenderingContext2D,
    entry: PreparedLine,
    layout: LineLayout,
    time: number,
    active: string,
    inactive: string,
    border: string,
  ): void {
    const countdown = entry.line.countdown;
    if (!countdown) return;
    const total = Math.max(0.001, entry.line.start - countdown.start);
    const remaining = clamp01((entry.line.start - time) / total);
    const scale = this.scale;
    const gap = layout.fontSize * 0.35;
    const length = Math.max(20, 26 * scale);
    const thickness = Math.max(5, layout.fontSize * 0.2);
    const end = layout.left - gap;
    const start = end - length;
    const y = layout.centerY - thickness / 2;
    const radius = thickness / 2;

    const pill = (x: number, width: number) => {
      ctx.beginPath();
      ctx.roundRect(x, y, Math.max(thickness, width), thickness, radius);
    };
    pill(start, length);
    ctx.lineWidth = Math.max(1.5, thickness * 0.3);
    ctx.strokeStyle = border;
    ctx.stroke();
    ctx.fillStyle = inactive;
    ctx.globalAlpha *= 0.35;
    ctx.fill();
    ctx.globalAlpha /= 0.35;
    if (remaining > 0) {
      pill(end - length * remaining, length * remaining);
      ctx.fillStyle = active;
      ctx.fill();
    }
  }
}
