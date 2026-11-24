import * as cheerio from 'cheerio';

export interface KaraokeSyllable {
  start: number;
  end: number;
  text: string;
}

export interface KaraokeWord {
  syllables: KaraokeSyllable[];
}

/** Placement in KaraFun's 640×480 lyric screen. */
export interface KaraokeLinePosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface KaraokeLine {
  start: number;
  end: number;
  words: KaraokeWord[];
  /** Index into `pages`; KaraFun shows the lines of a page together. */
  page?: number;
  position?: KaraokeLinePosition;
  /** Countdown shown before the first syllable, e.g. after an instrumental break. */
  countdown?: { start: number; x: number };
}

export interface KaraokePage {
  fadeInStart: number;
  fadeInDuration: number;
  fadeOutStart: number;
  fadeOutDuration: number;
  activeColor?: string;
  inactiveColor?: string;
  activeBorderColor?: string;
  inactiveBorderColor?: string;
}

export interface KaraokeTimeline {
  durationSec: number;
  lines: KaraokeLine[];
  pages: KaraokePage[];
}

function optionalNumber(value: string | undefined): number | null {
  const parsed = Number(value);
  return value != null && value !== '' && Number.isFinite(parsed) ? parsed : null;
}

function optionalTime(value: string): number | null {
  const parsed = parseKaraokeTime(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function optionalColor(value: string | undefined): string | undefined {
  return value && /^#[0-9a-f]{6}$/i.test(value) ? value : undefined;
}

/** Parse KaraFun's "HH:MM:SS,mmm" timestamps. */
export function parseKaraokeTime(value: string): number {
  const match = /^(?:(\d+):)?(\d+):(\d+)[,.](\d+)$/.exec(String(value ?? '').trim());
  if (!match) return Number.NaN;
  const [, hours, minutes, seconds, millis] = match;
  // Whole milliseconds first, so 00:00:01,610 is exactly 1.61.
  const totalMs =
    (Number(hours ?? 0) * 3600 + Number(minutes) * 60 + Number(seconds)) * 1000 +
    Number(millis.padEnd(3, '0').slice(0, 3));
  return totalMs / 1000;
}

export function parseKaraokeXml(xml: string): KaraokeTimeline {
  const $ = cheerio.load(xml, { xmlMode: true });
  const durationSec = Number($('karaoke').first().attr('duration') ?? 0) || 0;
  const lines: KaraokeLine[] = [];
  const pages: KaraokePage[] = [];

  $('karaoke').first().children('page').each((_pageIndex, pageElement) => {
    const page = $(pageElement);
    const pageIndex = pages.length;
    const pageLines: KaraokeLine[] = [];
    const fadeInStart = optionalTime(page.children('fadeinstart').first().text());
    const fadeOutStart = optionalTime(page.children('fadeoutstart').first().text());
    page
      .find('line')
      .each((_lineIndex, lineElement) => {
        const line = $(lineElement);
        const words: KaraokeWord[] = [];

        line.find('word').each((_wordIndex, wordElement) => {
          const word = $(wordElement);
          const syllables: KaraokeSyllable[] = [];

          word.find('syllabe, syllable').each((_syllableIndex, syllableElement) => {
            const syllable = $(syllableElement);
            const start = parseKaraokeTime(syllable.find('start').first().text());
            const end = parseKaraokeTime(syllable.find('end').first().text());
            const text = syllable.find('text').first().text();
            if (text !== '' && Number.isFinite(start)) {
              syllables.push({
                start,
                end: Number.isFinite(end) ? end : start,
                text,
              });
            }
          });

          if (syllables.length > 0) words.push({ syllables });
        });

        if (words.length === 0) return;
        const first = words[0].syllables[0];
        const lastWord = words[words.length - 1];
        const last = lastWord.syllables[lastWord.syllables.length - 1];
        const parsed: KaraokeLine = { start: first.start, end: last.end, words, page: pageIndex };

        const position = line.children('position').first();
        const x = optionalNumber(position.attr('x'));
        const y = optionalNumber(position.attr('y'));
        const width = optionalNumber(position.attr('width'));
        const height = optionalNumber(position.attr('height'));
        if (x != null && y != null && width != null && height != null && width > 0 && height > 0) {
          parsed.position = { x, y, width, height };
        }

        const bar = line.children('progressivebar').first();
        const barStart = bar.length ? optionalTime(bar.children('start').first().text()) : null;
        const barX = optionalNumber(bar.attr('x'));
        if (barStart != null && barStart < first.start) {
          parsed.countdown = { start: barStart, x: barX ?? (parsed.position?.x ?? 0) };
        }
        pageLines.push(parsed);
      });

    if (pageLines.length === 0) return;
    const firstStart = Math.min(...pageLines.map((line) => line.start));
    const lastEnd = Math.max(...pageLines.map((line) => line.end));
    pages.push({
      fadeInStart: fadeInStart ?? Math.max(0, firstStart - 1),
      fadeInDuration: optionalTime(page.children('fadeinduration').first().text()) ?? 0.5,
      fadeOutStart: fadeOutStart ?? lastEnd + 0.5,
      fadeOutDuration: optionalTime(page.children('fadeoutduration').first().text()) ?? 0.5,
      activeColor: optionalColor(page.attr('activecolor')),
      inactiveColor: optionalColor(page.attr('inactivecolor')),
      activeBorderColor: optionalColor(page.attr('activebordercolor')),
      inactiveBorderColor: optionalColor(page.attr('inactivebordercolor')),
    });
    lines.push(...pageLines);
  });

  lines.sort((a, b) => a.start - b.start);
  return { durationSec, lines, pages };
}