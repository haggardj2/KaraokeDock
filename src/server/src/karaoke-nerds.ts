// server/src/karaoke-nerds.ts
import axios from 'axios';
import * as cheerio from 'cheerio';

export interface KaraokeNerdsTrack {
  title: string;
  artist: string;
  url: string;
  brand?: string;
  source: 'karaoke-nerds';
}

/**
 * Extract YouTube video ID from various URL formats
 */
function extractYouTubeVideoId(url: string): string | null {
  if (!url) return null;

  const normalizedUrl = url.trim();
  const directIdMatch = normalizedUrl.match(/^([a-zA-Z0-9_-]{11})$/);
  if (directIdMatch?.[1]) {
    return directIdMatch[1];
  }

  const normalizeVideoId = (candidate: string | null | undefined) =>
    candidate && /^[a-zA-Z0-9_-]{11}$/.test(candidate) ? candidate : null;

  try {
    const parsedUrl = new URL(normalizedUrl);
    const hostname = parsedUrl.hostname.toLowerCase().replace(/^www\./, '');
    const segments = parsedUrl.pathname.split('/').filter(Boolean);

    if (hostname === 'youtu.be') {
      return normalizeVideoId(segments[0]);
    }

    if (
      hostname.endsWith('youtube.com') ||
      hostname.endsWith('youtube-nocookie.com')
    ) {
      const queryVideoId = normalizeVideoId(parsedUrl.searchParams.get('v'));
      if (queryVideoId) return queryVideoId;

      if (segments[0] === 'embed' || segments[0] === 'shorts' || segments[0] === 'live') {
        return normalizeVideoId(segments[1]);
      }
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * Get YouTube video duration in seconds by scraping the page
 * This doesn't require an API key but is less reliable
 */
export async function getYouTubeDuration(url: string): Promise<number | null> {
  try {
    const videoId = extractYouTubeVideoId(url);
    if (!videoId) return null;
    
    // Fetch the YouTube page with a current User-Agent
    const response = await axios.get(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      timeout: 10000
    });
    
    const html = response.data;
    
    // Try to extract duration from JSON-LD structured data
    const jsonLdMatch = html.match(/<script type="application\/ld\+json">(.+?)<\/script>/s);
    if (jsonLdMatch) {
      try {
        const jsonLd = JSON.parse(jsonLdMatch[1]);
        if (jsonLd.duration) {
          // Parse ISO 8601 duration format (e.g., "PT4M33S")
          const durationMatch = jsonLd.duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
          if (durationMatch) {
            const hours = parseInt(durationMatch[1] || '0');
            const minutes = parseInt(durationMatch[2] || '0');
            const seconds = parseInt(durationMatch[3] || '0');
            return hours * 3600 + minutes * 60 + seconds;
          }
        }
      } catch {}
    }
    
    // Fallback: try to extract from meta tags
    const $ = cheerio.load(html);
    const durationMeta = $('meta[itemprop="duration"]').attr('content');
    if (durationMeta) {
      const durationMatch = durationMeta.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
      if (durationMatch) {
        const hours = parseInt(durationMatch[1] || '0');
        const minutes = parseInt(durationMatch[2] || '0');
        const seconds = parseInt(durationMatch[3] || '0');
        return hours * 3600 + minutes * 60 + seconds;
      }
    }
    
    console.warn('Could not extract YouTube duration for video:', videoId);
    return null;
  } catch (error: any) {
    console.error('Error getting YouTube duration:', error.message);
    return null;
  }
}

/**
 * Get YouTube video title by scraping the page
 * Returns the video title or null if it cannot be extracted
 */
export async function getYouTubeTitle(url: string): Promise<string | null> {
  try {
    const videoId = extractYouTubeVideoId(url);
    if (!videoId) return null;
    
    // Fetch the YouTube page with a current User-Agent
    const response = await axios.get(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      timeout: 10000
    });
    
    const html = response.data;
    
    // Try to extract title from JSON-LD structured data
    const jsonLdMatch = html.match(/<script type="application\/ld\+json">(.+?)<\/script>/s);
    if (jsonLdMatch) {
      try {
        const jsonLd = JSON.parse(jsonLdMatch[1]);
        if (jsonLd.name) {
          return jsonLd.name;
        }
      } catch {}
    }
    
    // Fallback: try to extract from meta tags
    const $ = cheerio.load(html);
    const ogTitle = $('meta[property="og:title"]').attr('content');
    if (ogTitle) {
      return ogTitle;
    }
    
    // Fallback: try to extract from title tag
    const titleTag = $('title').text();
    if (titleTag) {
      // Remove " - YouTube" suffix if present
      return titleTag.replace(/ - YouTube$/, '').trim();
    }
    
    console.warn('Could not extract YouTube title for video:', videoId);
    return null;
  } catch (error: any) {
    console.error('Error getting YouTube title:', error.message);
    return null;
  }
}

/**
 * Search Karaoke Nerds for songs by scraping the web search page.
 *
 * The results page uses paired <tr> rows:
 *   - rows with class "group"  → song title (td[0] > a) and artist (td[1] > a)
 *   - rows with class "details" → ul > li items, each containing a brand name
 *     (first <a>) and a YouTube link (div > a[href*="youtube.com"])
 *
 * Adapted from https://github.com/KaddaOK/koktkpprivate/blob/master/KOKTKaraokeParty/Web/KaraokenerdsSearchScrape.cs
 */
export async function searchKaraokeNerds(query: string): Promise<KaraokeNerdsTrack[]> {
  if (!query || !query.trim()) {
    return [];
  }

  try {
    const params = new URLSearchParams();
    params.append('query', query.trim());
    params.append('webFilter', 'OnlyWeb');

    const searchUrl = `https://karaokenerds.com/Search?${params.toString()}`;

    console.log('Searching Karaoke Nerds (HTML scrape):', searchUrl);

    const response = await axios.get<string>(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      timeout: 15000
    });

    const $ = cheerio.load(response.data);
    const results: KaraokeNerdsTrack[] = [];

    let currentTitle = '';
    let currentArtist = '';

    // Results are rendered as alternating "group" and "details" rows inside a table body.
    $('table tbody tr').each((_i, row) => {
      const $row = $(row);

      if ($row.hasClass('group')) {
        // Extract song title and artist for the following details row(s).
        currentTitle = $row.find('td').eq(0).find('a').first().text().trim()
          || $row.find('td').eq(0).text().trim();
        currentArtist = $row.find('td').eq(1).find('a').first().text().trim()
          || $row.find('td').eq(1).text().trim();
      } else if ($row.hasClass('details') && currentTitle) {
        // Each <li> in this row represents one track version from a specific brand.
        $row.find('td ul li').each((_j, li) => {
          const $li = $(li);

          const brand = $li.find('a').first().text().trim();

          // YouTube link is inside a <div> within the list item.
          const youtubeLinkNode = $li.find('a[href*="youtube.com"]').first();
          if (!youtubeLinkNode.length) return;

          const youtubeUrl = youtubeLinkNode.attr('href')?.replace(/&amp;/g, '&').trim() || '';
          if (!youtubeUrl) return;

          results.push({
            title: currentTitle,
            artist: currentArtist || 'Unknown Artist',
            url: youtubeUrl,
            brand: brand || undefined,
            source: 'karaoke-nerds'
          });
        });
      }
    });

    console.log(`Found ${results.length} results from Karaoke Nerds HTML search`);
    return results.slice(0, 100);
  } catch (error: any) {
    console.error('Error searching Karaoke Nerds:', error.message);

    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      console.warn('⚠️  Cannot reach karaokenerds.com. Please check your internet connection.');
    }

    return [];
  }
}
