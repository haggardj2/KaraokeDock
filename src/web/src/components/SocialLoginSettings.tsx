import { useEffect, useState, type FormEvent } from 'react'
import { api, API_BASE } from '../api'
import { SOCIAL_PROVIDERS, SOCIAL_PROVIDER_NAMES, type SocialProvider, type SocialSettings } from '../social-login'
import SocialProviderIcon from './SocialProviderIcon'

export default function SocialLoginSettings({ sessionToken, expanded, onToggle }: {
  sessionToken: string
  expanded: boolean
  onToggle: () => void
}) {
  const [settings, setSettings] = useState<SocialSettings | null>(null)
  const [secretChanged, setSecretChanged] = useState({ google: false, facebook: false })
  const [hasSecret, setHasSecret] = useState({ google: false, facebook: false })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [loadAttempt, setLoadAttempt] = useState(0)

  function adoptSettings(config: SocialSettings) {
    setHasSecret({ google: Boolean(config.google.clientSecret), facebook: Boolean(config.facebook.clientSecret) })
    setSecretChanged({ google: false, facebook: false })
    setSettings({
      ...config,
      google: { ...config.google, clientSecret: '' },
      facebook: { ...config.facebook, clientSecret: '' },
    })
  }

  useEffect(() => {
    let cancelled = false
    setError('')
    api('/api/admin/settings/social', { headers: { 'x-session-token': sessionToken } })
      .then((config: SocialSettings) => { if (!cancelled) adoptSettings(config) })
      .catch((error: unknown) => {
        if (!cancelled) setError(error instanceof Error ? error.message : 'Could not load social login settings.')
      })
    return () => { cancelled = true }
  }, [sessionToken, loadAttempt])

  function updateProvider(provider: SocialProvider, values: Partial<SocialSettings[SocialProvider]>) {
    setSettings((current) => current ? { ...current, [provider]: { ...current[provider], ...values } } : current)
    setSaved(false)
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    if (!settings || saving) return
    setSaving(true)
    setSaved(false)
    setError('')
    try {
      await api('/api/admin/settings/social', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-session-token': sessionToken },
        body: JSON.stringify({
          ...settings,
          google: { ...settings.google, clientSecret: secretChanged.google ? settings.google.clientSecret : undefined },
          facebook: { ...settings.facebook, clientSecret: secretChanged.facebook ? settings.facebook.clientSecret : undefined },
        }),
      })
      const config: SocialSettings = await api('/api/admin/settings/social', { headers: { 'x-session-token': sessionToken } })
      adoptSettings(config)
      setSaved(true)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not save social login settings.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card">
      <div className="card-header" onClick={onToggle}>
        <h2><span className="material-symbols-rounded" aria-hidden="true" style={{ verticalAlign: 'text-bottom', marginRight: 8 }}>account_circle</span>Singer Social Login</h2>
        <button className="card-toggle" type="button" aria-expanded={expanded} aria-controls="social-login-settings">
          {expanded ? 'Collapse' : 'Expand'}
        </button>
      </div>
      <div id="social-login-settings" className={`card-content ${expanded ? 'expanded' : 'collapsed'}`}>
        {error && <div className="error-msg" role="alert">{error}</div>}
        {saved && <div className="banner success" role="status">Social login settings saved.</div>}
        {!settings ? error ? (
          <button className="btn" type="button" onClick={() => setLoadAttempt((value) => value + 1)}>Retry</button>
        ) : <p role="status">Loading social login settings...</p> : (
          <form onSubmit={(event) => void save(event)}>
            <fieldset disabled={saving} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" checked={settings.enabled} onChange={(event) => {
                    setSettings({ ...settings, enabled: event.target.checked }); setSaved(false)
                  }} />
                  Enable social login for singers
                </label>
                <p className="form-help">Adds provider icons below Continue in "Who is singing?". Disabled leaves the guest name prompt unchanged. Social accounts do not grant host or admin access.</p>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="social-operator-name">Public operator / venue name</label>
                <input id="social-operator-name" className="form-input" maxLength={160} value={settings.operatorName}
                  onChange={(event) => {
                    setSettings({ ...settings, operatorName: event.target.value }); setSaved(false)
                  }} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="social-contact-email">Public privacy / support email</label>
                <input id="social-contact-email" className="form-input" type="email" maxLength={254} value={settings.contactEmail}
                  onChange={(event) => {
                    setSettings({ ...settings, contactEmail: event.target.value }); setSaved(false)
                  }} />
                <p className="form-help">These contact details are published in your policies, even when social login is disabled. Use a monitored public address. Complete these fields and review the policies for your operation before provider submission.</p>
                <p className="form-help">
                  Public URLs: <a href={`${API_BASE}/privacy`} target="_blank" rel="noreferrer">Privacy Policy</a>
                  {' | '}<a href={`${API_BASE}/terms`} target="_blank" rel="noreferrer">Terms of Service</a>
                  {' | '}<a href={`${API_BASE}/privacy#data-deletion`} target="_blank" rel="noreferrer">Data-deletion instructions</a>.
                  {' '}No login or JavaScript is required to read them.
                </p>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="social-frontend-url">Public request-page origin</label>
                <input id="social-frontend-url" className="form-input" type="url"
                  placeholder={window.location.origin} required={settings.enabled}
                  value={settings.frontendUrl} onChange={(event) => {
                    setSettings({ ...settings, frontendUrl: event.target.value }); setSaved(false)
                  }} />
                <p className="form-help">For example https://karaoke.example.com (no path). Singers must start here and return to the same origin and tab.</p>
              </div>
              {SOCIAL_PROVIDERS.map((provider) => {
                const config = settings[provider]
                const required = settings.enabled && config.enabled
                const label = SOCIAL_PROVIDER_NAMES[provider]
                return (
                  <fieldset key={provider} style={{ border: '1px solid var(--color-border)', borderRadius: 12, padding: 16, margin: '0 0 16px', minWidth: 0 }}>
                    <legend style={{ display: 'flex', alignItems: 'center', gap: 8 }}><SocialProviderIcon provider={provider} size={24} />{label}</legend>
                    <div className="form-group">
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input type="checkbox" checked={config.enabled} onChange={(event) => updateProvider(provider, { enabled: event.target.checked })} />
                        Show {label} sign-in
                      </label>
                      <p className="form-help">Hiding a service also prevents new sign-ins through it. Stored singer accounts and history are kept.</p>
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor={`social-${provider}-id`}>{provider === 'facebook' ? 'App ID' : 'Client ID'}</label>
                      <input id={`social-${provider}-id`} className="form-input" value={config.clientId} required={required}
                        onChange={(event) => updateProvider(provider, { clientId: event.target.value })} />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor={`social-${provider}-secret`}>{provider === 'facebook' ? 'App secret' : 'Client secret'}</label>
                      <input id={`social-${provider}-secret`} className="form-input" type="password" autoComplete="new-password"
                        placeholder={hasSecret[provider] ? 'Secret saved; leave unchanged to keep it' : 'Not configured'}
                        value={config.clientSecret} required={required && !hasSecret[provider]}
                        onChange={(event) => {
                          updateProvider(provider, { clientSecret: event.target.value })
                          setSecretChanged((current) => ({ ...current, [provider]: true }))
                        }} />
                      <p className="form-help">Stored only on the server. To replace a secret, enter the new value.</p>
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor={`social-${provider}-redirect`}>OAuth callback URL</label>
                      <input id={`social-${provider}-redirect`} className="form-input" type="url" value={config.redirectUri}
                        placeholder={`${API_BASE}/api/auth/social/${provider}/callback`} required={required}
                        onChange={(event) => updateProvider(provider, { redirectUri: event.target.value })} />
                      <p className="form-help">Register this exact URL with {label}. Path: <code>/api/auth/social/{provider}/callback</code></p>
                    </div>
                  </fieldset>
                )
              })}
              <p className="form-help">Only a name, profile picture, and provider account identifier are retained. No email, contacts, or social posting access is requested. Setup guide: <code>docs/SOCIAL_LOGIN.md</code>.</p>
              <button className="btn primary" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save social login settings'}</button>
            </fieldset>
          </form>
        )}
      </div>
    </div>
  )
}
