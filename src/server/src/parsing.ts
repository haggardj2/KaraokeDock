// server/src/parsing.ts

export type ParsedMeta = {
  artist: string | null;
  title: string | null;
  discId: string | null;
};

export type BreakParsedMeta = {
  artist: string | null;
  title: string | null;
};

export const LIBRARY_PARSE_MODES = [
  'discid-artist-title',
  'discid-title-artist',
  'artist-title-discid',
  'title-artist-discid',
  'artist-title',
  'title-artist',
  'discid_title_artist',
] as const;

export type LibraryParseMode = (typeof LIBRARY_PARSE_MODES)[number];

export const DEFAULT_LIBRARY_PARSE_MODE: LibraryParseMode = 'discid-artist-title';

const DISC_ID_PATTERN = /^[A-Z]{1,6}\d{1,6}(-\d{1,4})?$/i;
const KNOWN_LABELS = [
  'BellySings',
  'Karaoke',
  'SunFly',
  'Sunfly',
  'Sound Choice',
  'Zoom',
  'Chartbuster',
  'Pioneer',
  'DK',
  'Nutech',
  'All Star',
];

function cleanValue(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeDiscId(value: string | null): string | null {
  if (!value) return null;
  return DISC_ID_PATTERN.test(value) ? value.toUpperCase() : value;
}

function isKnownDiscLabel(value: string): boolean {
  const normalized = value.toLowerCase();
  return KNOWN_LABELS.some(
    (label) =>
      normalized === label.toLowerCase() || normalized.startsWith(label.toLowerCase())
  );
}

function splitGreedy(base: string, separator: string): string[] {
  return base.split(separator).map((part) => part.trim()).filter(Boolean);
}

function parseLegacyDefault(parts: string[]): ParsedMeta {
  let discId: string | null = null;
  let artist: string | null = null;
  let title: string | null = null;

  if (parts.length >= 3) {
    discId = normalizeDiscId(cleanValue(parts[0]));
    artist = cleanValue(parts[1]);
    title = cleanValue(parts.slice(2).join(' - '));
  } else if (parts.length === 2) {
    if (DISC_ID_PATTERN.test(parts[0])) {
      discId = normalizeDiscId(cleanValue(parts[0]));
      title = cleanValue(parts[1]);
    } else if (isKnownDiscLabel(parts[0])) {
      discId = cleanValue(parts[0]);
      title = cleanValue(parts[1]);
    } else {
      artist = cleanValue(parts[0]);
      title = cleanValue(parts[1]);
    }
  } else if (parts.length === 1) {
    title = cleanValue(parts[0]);
  }

  return { artist, title, discId };
}

function parseThreePartMode(parts: string[], mode: LibraryParseMode): ParsedMeta {
  if (mode === DEFAULT_LIBRARY_PARSE_MODE) {
    return parseLegacyDefault(parts);
  }

  if (parts.length === 0) {
    return { artist: null, title: null, discId: null };
  }

  if (parts.length === 1) {
    switch (mode) {
      case 'discid-title-artist':
        return { artist: null, title: null, discId: normalizeDiscId(cleanValue(parts[0])) };
      case 'artist-title-discid':
        return { artist: cleanValue(parts[0]), title: null, discId: null };
      case 'title-artist-discid':
        return { artist: null, title: cleanValue(parts[0]), discId: null };
      default:
        return parseLegacyDefault(parts);
    }
  }

  if (parts.length === 2) {
    switch (mode) {
      case 'discid-title-artist':
        return {
          artist: null,
          title: cleanValue(parts[1]),
          discId: normalizeDiscId(cleanValue(parts[0])),
        };
      case 'artist-title-discid':
        return {
          artist: cleanValue(parts[0]),
          title: cleanValue(parts[1]),
          discId: null,
        };
      case 'title-artist-discid':
        return {
          artist: cleanValue(parts[1]),
          title: cleanValue(parts[0]),
          discId: null,
        };
      default:
        return parseLegacyDefault(parts);
    }
  }

  let discId: string | null = null;
  let artist: string | null = null;
  let title: string | null = null;

  switch (mode) {
    case 'discid-title-artist':
      discId = normalizeDiscId(cleanValue(parts[0]));
      if (parts.length >= 2) {
        title = cleanValue(parts.slice(1, Math.max(parts.length - 1, 2)).join(' - '));
      }
      artist = cleanValue(parts.length >= 2 ? parts[parts.length - 1] : null);
      break;
    case 'artist-title-discid':
      artist = cleanValue(parts[0]);
      if (parts.length >= 2) {
        title = cleanValue(parts.slice(1, Math.max(parts.length - 1, 2)).join(' - '));
      }
      discId = normalizeDiscId(cleanValue(parts.length >= 2 ? parts[parts.length - 1] : null));
      break;
    case 'title-artist-discid':
      title = cleanValue(parts.slice(0, Math.max(parts.length - 2, 1)).join(' - '));
      artist = cleanValue(parts.length >= 2 ? parts[parts.length - 2] : null);
      discId = normalizeDiscId(cleanValue(parts.length >= 1 ? parts[parts.length - 1] : null));
      break;
    default:
      return parseLegacyDefault(parts);
  }

  return { artist, title, discId };
}

function parseTwoPartMode(parts: string[], mode: LibraryParseMode): ParsedMeta {
  switch (mode) {
    case 'artist-title':
      return {
        artist: cleanValue(parts[0]),
        title: cleanValue(parts.slice(1).join(' - ')),
        discId: null,
      };
    case 'title-artist':
      return {
        artist: cleanValue(parts.length >= 2 ? parts[parts.length - 1] : null),
        title: cleanValue(parts.slice(0, Math.max(parts.length - 1, 1)).join(' - ')),
        discId: null,
      };
    default:
      return parseThreePartMode(parts, mode);
  }
}

function parseUnderscoreMode(base: string): ParsedMeta {
  const parts = splitGreedy(base, '_');
  if (parts.length === 0) {
    return { artist: null, title: null, discId: null };
  }

  if (parts.length === 1) {
    return { artist: null, title: null, discId: normalizeDiscId(cleanValue(parts[0])) };
  }

  if (parts.length === 2) {
    return {
      artist: null,
      title: cleanValue(parts[1]),
      discId: normalizeDiscId(cleanValue(parts[0])),
    };
  }

  return {
    artist: cleanValue(parts[parts.length - 1]),
    title: cleanValue(parts.slice(1, -1).join('_')),
    discId: normalizeDiscId(cleanValue(parts[0])),
  };
}

export function isLibraryParseMode(value: unknown): value is LibraryParseMode {
  return typeof value === 'string' && LIBRARY_PARSE_MODES.includes(value as LibraryParseMode);
}

/**
 * Parse karaoke metadata from a filename according to the selected library format.
 */
export function parseFromFilename(
  basename: string,
  mode: LibraryParseMode = DEFAULT_LIBRARY_PARSE_MODE
): ParsedMeta {
  const base = basename.replace(/\.[^.]+$/i, '').trim();

  const parsed =
    mode === 'discid_title_artist'
      ? parseUnderscoreMode(base)
      : parseTwoPartMode(splitGreedy(base, ' - '), mode);

  console.log(
    `Parsed (${mode}): "${basename}" -> discId: "${parsed.discId}", artist: "${parsed.artist}", title: "${parsed.title}"`
  );

  return parsed;
}

/**
 * Parse break-music metadata from filename without using karaoke disc IDs.
 * Prioritizes "Artist - Title" style names and falls back to full filename as title.
 */
export function parseBreakMusicFromFilename(basename: string): BreakParsedMeta {
  const base = basename.replace(/\.[^.]+$/i, '').trim();
  const parts = base.split(' - ').map((p) => p.trim()).filter(Boolean);

  let artist: string | null = null;
  let title: string | null = null;

  if (parts.length >= 3 && DISC_ID_PATTERN.test(parts[0])) {
    artist = cleanValue(parts[1]);
    title = cleanValue(parts.slice(2).join(' - '));
  } else if (parts.length >= 2) {
    artist = cleanValue(parts[0]);
    title = cleanValue(parts.slice(1).join(' - '));
  } else if (parts.length === 1) {
    title = cleanValue(parts[0]);
  }

  return { artist, title };
}
