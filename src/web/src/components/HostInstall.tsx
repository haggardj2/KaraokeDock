import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import ProfileDialog from './ProfileDialog'

interface InstallPrompt extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISSED_KEY = 'karaoke-host-install-dismissed'

export default function HostInstall() {
  const location = useLocation()
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null)
  const [installed, setInstalled] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [dismissed, setDismissed] = useState(() => {
    try {
      return window.localStorage.getItem(DISMISSED_KEY) === 'true'
    } catch (err) {
      console.warn('Could not read Host install preference:', err)
      return false
    }
  })

  function dismiss() {
    setDismissed(true)
    setShowHelp(false)
    try {
      window.localStorage.setItem(DISMISSED_KEY, 'true')
    } catch (err) {
      console.warn('Could not save Host install preference; dismissed for this page only:', err)
    }
  }

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)')
    const update = () => setInstalled(standalone.matches ||
      ('standalone' in navigator && navigator.standalone === true))
    const beforeInstall = (event: Event) => {
      if (!('prompt' in event) || !('userChoice' in event)) return
      event.preventDefault()
      setPrompt(event as InstallPrompt)
    }
    const didInstall = () => { setInstalled(true); setPrompt(null); setShowHelp(false) }
    update()
    standalone.addEventListener('change', update)
    window.addEventListener('beforeinstallprompt', beforeInstall)
    window.addEventListener('appinstalled', didInstall)
    return () => {
      standalone.removeEventListener('change', update)
      window.removeEventListener('beforeinstallprompt', beforeInstall)
      window.removeEventListener('appinstalled', didInstall)
    }
  }, [])

  useEffect(() => {
    if (!import.meta.env.PROD || !window.isSecureContext || !('serviceWorker' in navigator)) return
    void navigator.serviceWorker.register('/host-sw.js', { scope: '/', updateViaCache: 'none' }).catch((err: unknown) => {
      console.error('Host app registration failed:', err)
      setError('Could not prepare the Host app for installation. Reload this page and try again.')
    })
  }, [])

  async function install() {
    if (busy) return
    if (!prompt) { setShowHelp(true); return }
    setBusy(true)
    setError('')
    try {
      await prompt.prompt()
      await prompt.userChoice
      setPrompt(null)
    } catch (err) {
      console.error('Host app installation failed:', err)
      setPrompt(null)
      setError('Installation could not be opened. Try the browser install menu or reload the page.')
      setShowHelp(true)
    } finally {
      setBusy(false)
    }
  }

  if (location.pathname !== '/host' || installed || dismissed) return null
  return (
    <aside style={{ padding: '8px 16px', background: '#11111b', color: '#fff', textAlign: 'right' }}>
      <button type="button" onClick={() => void install()} disabled={busy}
        style={{ minHeight: 44, padding: '8px 14px', borderRadius: 8, border: '1px solid #6366f1', background: '#24243c', color: '#fff', cursor: 'pointer' }}>
        {busy ? 'Opening installer...' : 'Install Host app'}
      </button>
      <button type="button" onClick={dismiss} disabled={busy}
        aria-label="Dismiss Host app installation prompt" title="Dismiss installation prompt"
        style={{ minWidth: 44, minHeight: 44, marginLeft: 8, padding: 8, border: 0, borderRadius: 8, background: 'transparent', color: '#fff', cursor: 'pointer' }}>
        Dismiss
      </button>
      {error && <p role="alert">{error}</p>}
      {showHelp && <ProfileDialog title="Install KaraokeDock Host" onClose={() => setShowHelp(false)}>
        {!window.isSecureContext && <p role="alert"><strong>HTTPS is required.</strong> Open your server's trusted HTTPS address first. A plain HTTP LAN address cannot install this app.</p>}
        <p>The installed app opens the Host page in its own window. A connection to your KaraokeDock server is still required.</p>
        <ul>
          <li><strong>Android:</strong> Open this page in Chrome, then choose Install app or Add to Home screen from its menu.</li>
          <li><strong>iPhone / iPad:</strong> Open this page in Safari, tap Share, then Add to Home Screen. Enable Open as Web App if offered.</li>
          <li><strong>Windows / Linux:</strong> Open this page in Chrome or Edge. Use the install icon in the address bar or the browser menu's app installation option.</li>
        </ul>
        <p>If installation is unavailable, check whether the app is already installed or use one of the browsers above. You may need to sign in again in the installed app.</p>
      </ProfileDialog>}
    </aside>
  )
}
