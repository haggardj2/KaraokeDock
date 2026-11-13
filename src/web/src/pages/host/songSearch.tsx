import { api } from '../../api'
import ScrollingText from '../../components/ScrollingText'

// Shared by the Replace Song and Add to Queue dialogs.

export const LOCAL_SEARCH_DELAY_MS = 300
export const KARAOKE_NERDS_SEARCH_DELAY_MS = 500

export function renderSearchResultText(track: { title?: string | null; artist?: string | null }, tag?: { text: string; brand?: boolean }) {
  const title = track.title || 'Unknown'
  const artist = track.artist || 'Unknown'
  return (
    <div className="search-result-text">
      <ScrollingText className="search-result-title" label={title}>{title}</ScrollingText>
      <div className="search-result-meta">
        <ScrollingText label={artist}>{artist}</ScrollingText>
        {tag && <span className={`search-result-tag${tag.brand ? ' brand' : ''}`}>{tag.text}</span>}
      </div>
    </div>
  )
}

export async function fetchVideoTitle(url: string): Promise<string> {
  try {
    const response = await api(`/api/video-metadata?url=${encodeURIComponent(url)}`)
    return response.title || url.split('/').pop()?.split('?')[0] || 'Video'
  } catch (err) {
    console.error('Failed to fetch video title:', err)
    return url.split('/').pop()?.split('?')[0] || 'Video'
  }
}
