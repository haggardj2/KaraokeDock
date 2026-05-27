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

/**
 * Handles various filename patterns:
 * 1) "CC2101-01 - Artist - Title.ext" -> discId "CC2101-01"
 * 2) "SF123-45 - Artist - Title.ext" -> discId "SF123-45"
 * 3) "BellySings - Artist - Title.ext" -> discId "BellySings" (labels become disc IDs)
 * 4) "Artist - Title.ext" -> no disc ID
 */
export function parseFromFilename(basename: string): ParsedMeta {
  const base = basename.replace(/\.[^.]+$/i, '').trim(); // remove extension
  const parts = base.split(' - ').map(p => p.trim()).filter(Boolean);

  let discId: string | null = null;
  let artist: string | null = null;
  let title: string | null = null;

  if (parts.length >= 3) {
    // For 3+ parts, first part is always treated as disc ID (whether it's a code or label)
    discId = parts[0];
    artist = parts[1] || null;
    title = parts.slice(2).join(' - ') || null;
    
    // Normalize disc IDs that look like traditional codes to uppercase
    const discPattern = /^[A-Z]{1,6}\d{1,6}(-\d{1,4})?$/i;
    if (discPattern.test(discId)) {
      discId = discId.toUpperCase();
    }
    // Otherwise keep the label/disc ID as-is (preserving case for readability)
    
  } else if (parts.length === 2) {
    // For 2 parts, check if first part looks like a disc code
    const discPattern = /^[A-Z]{1,6}\d{1,6}(-\d{1,4})?$/i;
    
    // Also check if it's a known label (treat these as disc IDs too)
    const knownLabels = [
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
      'All Star'
    ];
    
    const looksLikeLabel = knownLabels.some(label => 
      parts[0].toLowerCase() === label.toLowerCase() ||
      parts[0].toLowerCase().startsWith(label.toLowerCase())
    );
    
    if (discPattern.test(parts[0])) {
      // Traditional disc code pattern
      discId = parts[0].toUpperCase();
      title = parts[1] || null;
    } else if (looksLikeLabel) {
      // Known label as disc ID
      discId = parts[0];
      title = parts[1] || null;
    } else {
      // Assume Artist - Title format
      artist = parts[0] || null;
      title = parts[1] || null;
    }
  } else if (parts.length === 1) {
    // Just use as title
    title = parts[0] || null;
  }

  // Normalize empty strings to null
  if (artist && !artist.trim()) artist = null;
  if (title && !title.trim()) title = null;
  if (discId && !discId.trim()) discId = null;

  // Log for debugging
  console.log(`Parsed: "${basename}" -> discId: "${discId}", artist: "${artist}", title: "${title}"`);

  return { artist, title, discId };
}

/**
 * Parse break-music metadata from filename without using karaoke disc IDs.
 * Prioritizes "Artist - Title" style names and falls back to full filename as title.
 */
export function parseBreakMusicFromFilename(basename: string): BreakParsedMeta {
  const base = basename.replace(/\.[^.]+$/i, '').trim();
  const parts = base.split(' - ').map(p => p.trim()).filter(Boolean);
  const discPattern = /^[A-Z]{1,6}\d{1,6}(-\d{1,4})?$/i;

  let artist: string | null = null;
  let title: string | null = null;

  if (parts.length >= 3 && discPattern.test(parts[0])) {
    artist = parts[1] || null;
    title = parts.slice(2).join(' - ') || null;
  } else if (parts.length >= 2) {
    artist = parts[0] || null;
    title = parts.slice(1).join(' - ') || null;
  } else if (parts.length === 1) {
    title = parts[0] || null;
  }

  if (artist && !artist.trim()) artist = null;
  if (title && !title.trim()) title = null;

  return { artist, title };
}
