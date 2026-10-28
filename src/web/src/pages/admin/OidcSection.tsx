import { api, API_BASE } from "../../api";
import MaterialIcon, { renderStatusMessage } from "../../components/MaterialIcon";
import type { AdminState } from "./useAdmin";

// SSO / OIDC sign-in settings.
export default function OidcSection({ admin }: { admin: AdminState }) {
  const {
    auth,
    name,
    banner,
    stationMode,
    activeSection,
    users,
    oidcSettings,
    setOidcSettings,
    oidcClientSecretChanged,
    setOidcClientSecretChanged,
    oidcSaving,
    oidcBanner,
    saveOidcSettings,
  } = admin;

  return (
    <>
            {/* OIDC Settings Card */}
            {!stationMode && activeSection === "oidc" && (
            <div className="card">
              <div className="card-header">
                <h2><MaterialIcon name="link" style={{ fontSize: 24, verticalAlign: 'text-bottom', marginRight: 8 }} />SSO / OIDC Settings</h2>
              </div>
              <div className="card-content">
                {oidcBanner && (
                  <div className={`banner ${oidcBanner.includes('✔') ? 'success' : ''}`} style={{ marginBottom: 16 }}>
                    {renderStatusMessage(oidcBanner)}
                  </div>
                )}
                <form onSubmit={saveOidcSettings}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 15, fontWeight: 600 }}>
                      <input type="checkbox" checked={oidcSettings.enabled} onChange={(e) => setOidcSettings({ ...oidcSettings, enabled: e.target.checked })} style={{ width: 18, height: 18 }} />
                      Enable OIDC / SSO Login
                    </label>
                  </div>
                  <div style={{ opacity: oidcSettings.enabled ? 1 : 0.5, pointerEvents: oidcSettings.enabled ? 'auto' : 'none' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 16 }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Issuer URL</label>
                        <input className="form-input" type="url" placeholder="https://accounts.example.com" value={oidcSettings.issuer} onChange={(e) => setOidcSettings({ ...oidcSettings, issuer: e.target.value })} />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Client ID</label>
                        <input className="form-input" type="text" value={oidcSettings.clientId} onChange={(e) => setOidcSettings({ ...oidcSettings, clientId: e.target.value })} />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Client Secret</label>
                        <input className="form-input" type="password"
                          placeholder={oidcClientSecretChanged ? '' : 'Leave blank to keep existing secret'}
                          value={oidcSettings.clientSecret}
                          onChange={(e) => {
                            setOidcSettings({ ...oidcSettings, clientSecret: e.target.value });
                            setOidcClientSecretChanged(true);
                          }}
                          autoComplete="new-password" />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Redirect URI</label>
                        <input className="form-input" type="url" placeholder={`${API_BASE}/api/auth/oidc/callback`} value={oidcSettings.redirectUri} onChange={(e) => setOidcSettings({ ...oidcSettings, redirectUri: e.target.value })} />
                        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
                          Suggested: {API_BASE}/api/auth/oidc/callback
                        </div>
                      </div>
                    </div>

                    <h3 style={{ fontSize: 15, margin: '16px 0 12px', color: 'var(--color-text-secondary)' }}>Login Button</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 16 }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Button Text</label>
                        <input className="form-input" type="text" value={oidcSettings.buttonText} onChange={(e) => setOidcSettings({ ...oidcSettings, buttonText: e.target.value })} placeholder="Login with SSO" />
                        <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--color-text-muted)" }}>The button uses the current theme's colors.</p>
                      </div>
                    </div>

                    <h3 style={{ fontSize: 15, margin: '16px 0 12px', color: 'var(--color-text-secondary)' }}>Login Methods</h3>
                    <div className="form-group" style={{ marginBottom: 20 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={oidcSettings.passwordLoginEnabled}
                          onChange={(e) => setOidcSettings({ ...oidcSettings, passwordLoginEnabled: e.target.checked })}
                          style={{ width: 16, height: 16 }}
                        />
                        <span className="form-label" style={{ margin: 0 }}>Enable username/password login on Admin and Host pages</span>
                      </label>
                    </div>

                    <h3 style={{ fontSize: 15, margin: '16px 0 12px', color: 'var(--color-text-secondary)' }}>User Provisioning</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 20 }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                          <input type="checkbox" checked={oidcSettings.autoCreateUsers} onChange={(e) => setOidcSettings({ ...oidcSettings, autoCreateUsers: e.target.checked })} style={{ width: 16, height: 16 }} />
                          <span className="form-label" style={{ margin: 0 }}>Auto-create new users</span>
                        </label>
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">SSO group roles</label>
                        <p><code>karaokedock_admin</code>: Admin (Host and Admin pages).</p>
                        <p><code>karaokedock_user</code>: User (all Host controls).</p>
                        <p>The provider must supply a groups claim. Admin wins when both
                          groups are present. Roles sync on every SSO login; accounts with
                          neither group cannot sign in.</p>
                      </div>
                    </div>

                    {/* Preview */}
                    {oidcSettings.buttonText && (
                      <div style={{ marginBottom: 16 }}>
                        <label className="form-label">Preview</label>
                        <div className="btn primary" style={{ display: 'inline-flex', pointerEvents: 'none' }}>
                          {oidcSettings.buttonText}
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    className="btn-icon primary"
                    type="submit"
                    disabled={oidcSaving}
                    title="Save OIDC settings"
                    aria-label="Save OIDC settings"
                  >
                    {oidcSaving ? <><span className="loading-spinner"></span></> : <MaterialIcon name="save" />}
                  </button>
                </form>
              </div>
            </div>
            )}
    </>
  );
}
