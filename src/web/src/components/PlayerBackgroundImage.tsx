import { useState } from 'react'

export default function PlayerBackgroundImage({ src, active = true }: { src: string; active?: boolean }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  return <>
    <img
      className="player-background-image"
      key={`${src}:${attempt}`}
      src={src}
      alt=""
      draggable={false}
      onLoad={() => setFailedSrc(null)}
      onError={() => {
        console.error('Player background image failed to load:', src)
        setFailedSrc(src)
      }}
      style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%',
        objectFit: 'cover', filter: 'brightness(0.58)',
      }}
    />
    {active && failedSrc === src && <div role="alert" className="player-background-error">
      Background image could not load. Check the image file in Host Player Settings and the server connection.{' '}
      <button type="button" onClick={() => { setFailedSrc(null); setAttempt(value => value + 1) }}>Retry image</button>
    </div>}
  </>
}
