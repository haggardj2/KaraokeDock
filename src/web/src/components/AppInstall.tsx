import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import ProfileDialog from './ProfileDialog'
import { getInstallApp, updateAppManifest } from '../appManifest'

interface InstallPrompt extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function AppInstall() {
  const location = useLocation()
  const app = getInstallApp(location.pathname)
  useEffect(() => updateAppManifest(location.pathname), [location.pathname])
  return <InstallApp key={app} app={app} visible={
    ['/host', '/host/', '/player', '/player/'].includes(location.pathname)
  } />
}

export function InstallApp({ app, visible }: { app: 'Host' | 'Player'; visible: boolean }) {
  const dismissedKey = `karaoke-${app.toLowerCase()}-install-dismissed`
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null)
  const [installed, setInstalled] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [dismissed, setDismissed] = useState(() => {
    try {
      return window.localStorage.getItem(dismissedKey) === 'true'
    } catch (err) {
      console.warn(`Could not read ${app} install preference:`, err)
      return false
    }
  })

  function dismiss() {
    setDismissed(true)
    setShowHelp(false)
    try {
      window.localStorage.setItem(dismissedKey, 'true')
    } catch (err) {
      console.warn(`Could not save ${app} install preference; dismissed for this page only:`, err)
    }
  }

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone), (display-mode: fullscreen)')
    const update = () => setInstalled(standalone.matches ||
      (app === 'Player' && navigator.userAgent?.includes('KaraokeDockTV/')) ||
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
      console.error(`${app} app registration failed:`, err)
      setError(`Could not prepare the ${app} app for installation. Reload this page and try again.`)
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
      console.error(`${app} app installation failed:`, err)
      setPrompt(null)
      setError('Installation could not be opened. Try the browser install menu or reload the page.')
      setShowHelp(true)
    } finally {
      setBusy(false)
    }
  }

  if (!visible || installed || dismissed) return null
  return (
    <aside aria-label={`${app} app installation`} style={{
      padding: '8px 16px', background: '#11111b', color: '#fff', textAlign: 'right',
      ...(app === 'Player' ? {
        position: 'fixed', top: 'max(8px, env(safe-area-inset-top))',
        right: 'max(8px, env(safe-area-inset-right))', zIndex: 20,
        maxWidth: 'calc(100% - 16px)', boxSizing: 'border-box', borderRadius: 8,
      } as const : {}),
    }}>
      <button type="button" onClick={() => void install()} disabled={busy}
        style={{ minHeight: 44, padding: '8px 14px', borderRadius: 8, border: '1px solid #6366f1', background: '#24243c', color: '#fff', cursor: 'pointer' }}>
        {busy ? 'Opening installer...' : `Install ${app} app`}
      </button>
      <button type="button" onClick={dismiss} disabled={busy}
        aria-label={`Dismiss ${app} app installation prompt`} title="Dismiss installation prompt"
        style={{ minWidth: 44, minHeight: 44, marginLeft: 8, padding: 8, border: 0, borderRadius: 8, background: 'transparent', color: '#fff', cursor: 'pointer' }}>
        Dismiss
      </button>
      {error && <p role="alert">{error}</p>}
      {showHelp && <ProfileDialog title={`Install KaraokeDock ${app}`} onClose={() => setShowHelp(false)}>
        {!window.isSecureContext && <p role="alert"><strong>HTTPS is required.</strong> Open your server's trusted HTTPS address first. A plain HTTP LAN address cannot install this app.</p>}
        <p>The installed app opens the {app} page in its own window. A connection to your KaraokeDock server is still required.</p>
        {app === 'Player' && <p>Player installs separately from Host and follows the live show. Installing it does not enable offline playback or bypass the browser's requirement to tap before playing audio.</p>}
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
