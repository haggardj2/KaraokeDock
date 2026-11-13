import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Link } from 'react-router-dom'
import './AppBar.css'

type LogoMenuProps = {
  currentPath: string
  showAdmin: boolean
}

function openPlayer() {
  // Reuse one named window so the Player isn't opened twice on the venue screen.
  window.open('/player', 'karaoke-player')
}

function openRequests() {
  window.open('/request', '_blank', 'noopener')
}

export default function LogoMenu({ currentPath, showAdmin }: LogoMenuProps) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    root.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus()
    const close = (event: Event) => {
      if (event.target instanceof Node && root.current?.contains(event.target)) return
      setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])

  function onMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const items = Array.from(root.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])
    const index = items.indexOf(document.activeElement as HTMLElement)
    if (event.key === 'Escape') {
      setOpen(false)
      button.current?.focus()
    } else if (event.key === 'ArrowDown') {
      event.preventDefault()
      items[(index + 1) % items.length]?.focus()
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      items[(index - 1 + items.length) % items.length]?.focus()
    } else if (event.key === 'Tab') {
      setOpen(false)
    }
  }

  const pageItem = (path: string, label: string, icon: string) => {
    const current = currentPath === path
    return (
      <Link
        role="menuitem"
        to={path}
        className={`logo-menu-item${current ? ' is-current' : ''}`}
        aria-current={current ? 'page' : undefined}
        onClick={() => setOpen(false)}
      >
        <span className="material-symbols-rounded" aria-hidden="true">{icon}</span>
        <span className="logo-menu-label">{label}</span>
        {current && <span className="material-symbols-rounded logo-menu-check" aria-hidden="true">check</span>}
      </Link>
    )
  }

  const windowItem = (label: string, icon: string, onOpen: () => void) => (
    <button
      type="button"
      role="menuitem"
      className="logo-menu-item"
      onClick={() => {
        setOpen(false)
        onOpen()
      }}
    >
      <span className="material-symbols-rounded" aria-hidden="true">{icon}</span>
      <span className="logo-menu-label">{label}</span>
      <span className="material-symbols-rounded logo-menu-external" aria-hidden="true">open_in_new</span>
      <span className="visually-hidden"> (opens in a new window)</span>
    </button>
  )

  return (
    <div className="logo-menu" ref={root} onKeyDown={open ? onMenuKeyDown : undefined}>
      <button
        ref={button}
        type="button"
        className="logo-menu-button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="logo-menu-list"
        aria-label="KaraokeDock pages"
        title="KaraokeDock pages"
        onClick={() => setOpen((value) => !value)}
      >
        <img src="/android-chrome-192x192.png" alt="" width={36} height={36} />
        <span className="material-symbols-rounded logo-menu-caret" aria-hidden="true">expand_more</span>
      </button>
      {open && (
        <div id="logo-menu-list" className="logo-menu-list" role="menu" aria-label="KaraokeDock pages">
          {pageItem('/host', 'Host', 'mic_external_on')}
          {showAdmin && pageItem('/admin', 'Admin', 'admin_panel_settings')}
          <div className="logo-menu-divider" role="separator" />
          {windowItem('Player', 'tv', openPlayer)}
          {windowItem('Request page', 'queue_music', openRequests)}
        </div>
      )}
    </div>
  )
}
