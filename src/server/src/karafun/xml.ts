import * as cheerio from 'cheerio';
import type { Cheerio, CheerioAPI } from 'cheerio';
import type {
  KarafunSession,
  KarafunSongDetail,
  KarafunSongSummary,
  KarafunTrackInfo,
} from './types.js';

export class KarafunApiError extends Error {
  readonly action?: string;
  readonly content?: string;
  readonly display?: string;
  readonly devices: Array<{ id: number; name: string }>;

  constructor(input: {
    action?: string;
    content?: string;
    display?: string;
    message?: string;
    devices?: Array<{ id: number; name: string }>;
  }) {
    super(input.message || input.content || 'KaraFun API error');
    this.name = 'KarafunApiError';
    this.action = input.action;
    this.content = input.content;
    this.display = input.display;
    this.devices = input.devices ?? [];
  }
}

export function parseKarafunXml(xml: string): CheerioAPI {
  return cheerio.load(xml, { xmlMode: true });
}

export function assertKarafunOk($: CheerioAPI): void {
  const status = ($('response').first().attr('status') ?? '').toLowerCase();
  if (status !== 'error') return;

  const error = $('error').first();
  const message = $('message').first();
  const devices = $('message devices device')
    .map((_index, element) => ({
      id: Number($(element).attr('id') ?? 0),
      name: $(element).text().trim(),
    }))
    .get();

  throw new KarafunApiError({
    action: error.attr('action'),
    content: error.text().trim(),
    display: message.attr('display'),
    message: message.text().trim() || error.text().trim(),
    devices,
  });
}

export function parseKarafunSession(xml: string): KarafunSession {
  const $ = parseKarafunXml(xml);
  assertKarafunOk($);

  const session = $('session').first();
  const key = session.find('key').first().text().trim();
  if (!key) {
    throw new KarafunApiError({ message: 'KaraFun session response did not contain a key' });
  }

  return {
    key,
    userId: Number(session.find('user_id').first().text() || 0),
    userLogin: session.find('user_login').first().text().trim(),
    plan: session.find('plan').first().text().trim() || undefined,
    planCaption: session.find('plan').first().attr('caption') || undefined,
    isPro: session.find('is_pro').first().text().trim() === '1',
    subscriptionEndDate: session.find('subscription_end_date').first().text().trim() || undefined,
    imagesUrlSchema: session.find('images-url-schema').first().text().trim() || undefined,
  };
}

export function parseKarafunSearch(xml: string): {
  total: number;
  songs: KarafunSongSummary[];
} {
  const $ = parseKarafunXml(xml);
  assertKarafunOk($);

  const list = $('list').first();
  const songs = $('list song')
    .map((_index, element) => ({
      id: Number($(element).attr('id') ?? 0),
      content: $(element).attr('content') || undefined,
      meta: $(element).attr('meta') || undefined,
    }))
    .get()
    .filter((song) => Number.isSafeInteger(song.id) && song.id > 0);

  return {
    total: Number(list.attr('total_found') ?? list.attr('total') ?? songs.length),
    songs,
  };
}

function parseTrackList($: CheerioAPI, root: Cheerio<any>): KarafunTrackInfo[] {
  return root
    .find('track')
    .map((_index, element) => ({
      type: $(element).attr('type') || undefined,
      file: $(element).attr('file') || undefined,
      caption: $(element).attr('caption') || undefined,
      index: $(element).attr('index') !== undefined ? Number($(element).attr('index')) : undefined,
    }))
    .get() as KarafunTrackInfo[];
}

function parseSongElement($: CheerioAPI, element: any): KarafunSongDetail {
  const song = $(element);
  const artist = song.find('artist').first();
  return {
    id: Number(song.attr('id') ?? 0),
    title: song.find('title').first().text().trim(),
    artist: artist.text().trim() || 'Unknown Artist',
    artistId: artist.attr('id') ? Number(artist.attr('id')) : undefined,
    year: Number(song.find('year').first().text() || 0) || undefined,
    durationSec: Number(song.attr('len') ?? 0),
    bpm: Number(song.find('bpm').first().text() || 0) || undefined,
    keys: song.find('keys').first().text().trim() || undefined,
    imageId: song.find('image').first().attr('id') || undefined,
    content: song.attr('content') || undefined,
    meta: song.attr('meta') || undefined,
    explicit: song.attr('explicit_lyrics') === '1',
    preview: song.attr('preview') === '1',
    previewLenSec: Number(song.attr('preview-len') ?? 0) || undefined,
    previewStartSec: Number(song.find('previewstartsec').first().text() || 0) || undefined,
    free: song.attr('free') === '1',
    tracks: parseTrackList($, song),
    stream: song.find('stream').first().text().trim() || undefined,
    filesize: Number(song.find('filesize').first().text() || 0) || undefined,
    md5: song.find('md5').first().text().trim() || undefined,
    notifyPlay: Number(song.find('notifyplay').first().text() || 0) || undefined,
  };
}

export function parseKarafunSong(xml: string): KarafunSongDetail {
  const $ = parseKarafunXml(xml);
  assertKarafunOk($);
  const element = $('song').first().get(0);
  if (!element) {
    throw new KarafunApiError({ message: 'KaraFun response did not contain a song' });
  }
  return parseSongElement($, element);
}

export function parseKarafunSongInfo(xml: string): KarafunSongDetail[] {
  const $ = parseKarafunXml(xml);
  assertKarafunOk($);
  return $('song')
    .map((_index, element) => parseSongElement($, element))
    .get();
}
