// Small pill showing a karaoke disc ID (e.g. SC8812-04) after a song title.
export function renderDiscIdTag(discId: string | null | undefined) {
  if (!discId) return null
  return (
    <span style={{
      marginLeft: 8,
      fontSize: 11,
      padding: '1px 6px',
      background: 'var(--color-bg-primary)',
      border: '1px solid var(--color-border)',
      borderRadius: 4,
      color: 'var(--color-text-secondary)',
      whiteSpace: 'nowrap',
    }}>
      {discId}
    </span>
  )
}
