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

interface KaraokeNerdsJsonResponse {
  data: string[][];
  recordsTotal: number;
  recordsFiltered: number;
}

/**
 * Extract YouTube video ID from various URL formats
 */
function extractYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\?\/]+)/,
    /^([a-zA-Z0-9_-]{11})$/  // Direct video ID
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
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
 * Search Karaoke Nerds for songs using their JSON API
 * 
 * This uses the official JSON API endpoint which is much more reliable
 * than HTML scraping. Based on the approach from:
 * https://github.com/vicwomg/pikaraoke
 * 
 * API Endpoint: /Community/BrowseJson/
 * Returns: JSON with data array where each item has:
 *   [1] = artist_html
 *   [2] = title_html  
 *   [3] = ? (unused)
 *   [4] = brand_html
 *   [5] = youtube_url (format: "url|blocked_flag")
 */
export async function searchKaraokeNerds(query: string): Promise<KaraokeNerdsTrack[]> {
  if (!query || !query.trim()) {
    return [];
  }

  try {
    // Use the JSON API endpoint with search parameter
    const apiUrl = `https://karaokenerds.com/Community/BrowseJson/?length=100&start=0&search[value]=${encodeURIComponent(query.trim())}`;
    console.log('Searching Karaoke Nerds API:', apiUrl);

    const response = await axios.get<KaraokeNerdsJsonResponse>(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      timeout: 10000
    });

    const results: KaraokeNerdsTrack[] = [];

    // Parse each item from the JSON response
    for (const item of response.data.data) {
      if (item.length < 6) continue;

      // Extract HTML fields (indices 1-5 contain HTML)
      const artistHtml = item[1];
      const titleHtml = item[2];
      const brandHtml = item[4];
      const youtubeData = item[5];

      // Parse HTML to extract text
      const artist = cheerio.load(artistHtml).text().trim();
      const title = cheerio.load(titleHtml).text().trim();
      const brand = cheerio.load(brandHtml).text().trim();

      // Parse YouTube URL and blocked status
      // Format: "url|blocked_flag"
      const [youtubeUrl, blockedFlag] = youtubeData.split('|');
      
      // Skip if blocked or no URL
      if (blockedFlag === 'true' || !youtubeUrl) {
        continue;
      }

      // Clean up URL (remove any &amp; artifacts)
      const cleanUrl = youtubeUrl.split('&amp;')[0].trim();

      // Only add if we have title and URL
      if (title && cleanUrl) {
        results.push({
          title,
          artist: artist || 'Unknown Artist',
          url: cleanUrl,
          brand: brand || undefined,
          source: 'karaoke-nerds'
        });
      }
    }

    console.log(`Found ${results.length} results from Karaoke Nerds JSON API`);
    
    return results.slice(0, 100); // Return up to 100 results
  } catch (error: any) {
    console.error('Error searching Karaoke Nerds:', error.message);
    
    // Check if it's a network error
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      console.warn('⚠️  Cannot reach karaokenerds.com. Please check your internet connection.');
    }
    
    // Return empty array on error rather than throwing
    return [];
  }
}
