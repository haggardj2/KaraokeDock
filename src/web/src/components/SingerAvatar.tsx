import { useState, type CSSProperties } from 'react'
import { API_BASE } from '../api'

export type ProfileCrop = { x: number; y: number; width: number; height: number }

export type SingerProfile = {
  imageSource: 'oidc' | 'upload' | null
  imageUrl: string | null
  focusX: number
  focusY: number
  updatedAt: string | null
  crop?: ProfileCrop | null
}

export function profileAssetUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined
  if (/^(https?:|blob:|data:image\/(?:png|jpeg|webp|gif);)/i.test(url)) return url
  return url.startsWith('/api/') ? `${API_BASE}${url}` : undefined
}

export function singerInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  return words.length ? `${Array.from(words[0])[0]}${words.length > 1 ? Array.from(words[words.length - 1])[0] : ''}`.toLocaleUpperCase() : '?'
}

export default function SingerAvatar({ name, profile, size = 40 }: {
  name: string
  profile?: Pick<SingerProfile, 'imageUrl' | 'focusX' | 'focusY' | 'crop'> | null
  size?: number | string
}) {
  const url = profileAssetUrl(profile?.imageUrl)
  const [failedUrl, setFailedUrl] = useState<string>()
  const crop = profile?.crop
  const imageStyle: CSSProperties = crop && crop.width > 0 && crop.height > 0
    ? {
        position: 'absolute', width: `${10000 / crop.width}%`, height: `${10000 / crop.height}%`,
        left: `${-100 * crop.x / crop.width}%`, top: `${-100 * crop.y / crop.height}%`,
        maxWidth: 'none', maxHeight: 'none',
      }
    : { width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${profile?.focusX ?? 50}% ${profile?.focusY ?? 50}%` }

  return (
    <span aria-hidden="true" style={{
      position: 'relative', display: 'inline-grid', placeItems: 'center',
      width: size, height: size, flex: '0 0 auto', borderRadius: '50%', overflow: 'hidden',
      verticalAlign: 'middle', background: '#39364f', color: '#fff', fontWeight: 700,
      fontSize: typeof size === 'number' ? Math.round(size * 0.38) : '0.8em', textShadow: 'none',
    }}>
      {url && failedUrl !== url
        ? <img src={url} alt="" draggable={false} style={imageStyle} onError={() => setFailedUrl(url)} />
        : singerInitials(name)}
    </span>
  )
}
