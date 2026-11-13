import type { CSSProperties } from 'react'

export default function MaterialIcon({
  name,
  className = '',
  style,
}: {
  name: string
  className?: string
  style?: CSSProperties
}) {
  return (
    <span className={`material-symbols-rounded${className ? ` ${className}` : ''}`} aria-hidden="true" style={style}>
      {name}
    </span>
  )
}

// Banners use a leading ⚠️ / ✔ to mark warnings and successes; show those as icons instead.
export function renderStatusMessage(message: string) {
  if (message.startsWith('⚠️')) {
    return (
      <>
        <MaterialIcon name="warning" style={{ fontSize: 18, verticalAlign: 'text-bottom', marginRight: 6 }} />
        {message.replace(/^⚠️\s*/, '')}
      </>
    )
  }
  if (message.startsWith('✔')) {
    return (
      <>
        <MaterialIcon name="check_circle" style={{ fontSize: 18, verticalAlign: 'text-bottom', marginRight: 6 }} />
        {message.replace(/^✔\s*/, '')}
      </>
    )
  }
  return message
}
