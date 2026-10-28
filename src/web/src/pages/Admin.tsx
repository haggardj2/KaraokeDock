import { api, API_BASE } from "../api";
import SocialLoginSettings from "../components/SocialLoginSettings";
import AccountLinkDialog from "../components/AccountLinkDialog";
import { AppBarContent } from "../appBarSlot";
import "./Admin.css";
import { useAdmin } from "./admin/useAdmin";
import OverviewSection from "./admin/OverviewSection";
import LibrariesSection from "./admin/LibrariesSection";
import BreakMusicSection from "./admin/BreakMusicSection";
import SystemSection from "./admin/SystemSection";
import GatewaySection from "./admin/GatewaySection";
import UsersSection from "./admin/UsersSection";
import OidcSection from "./admin/OidcSection";
import AddLibraryDialog from "./admin/AddLibraryDialog";
import AddBreakFolderDialog from "./admin/AddBreakFolderDialog";
import FolderBrowserDialog from "./admin/FolderBrowserDialog";
import DownloadFolderBrowserDialog from "./admin/DownloadFolderBrowserDialog";
import AccountDialog from "./admin/AccountDialog";
import EditUserDialog from "./admin/EditUserDialog";
import { getUserDisplayName } from "./admin/shared";
import MaterialIcon, { renderStatusMessage } from "../components/MaterialIcon";


export default function Admin() {
  const admin = useAdmin();
  const {
    auth,
    name,
    busy,
    banner,
    loginUsername,
    setLoginUsername,
    loginPassword,
    setLoginPassword,
    loginError,
    oidcConfig,
    stationMode,
    activeSection,
    setActiveSection,
    adminNavRef,
    users,
    mergeUser,
    setMergeUser,
    handleLogin,
    visibleSections,
    handleUserMerged,
  } = admin;

  return (
    <div className="admin-page">

      <AppBarContent>
        <div className="app-bar-title">
          <h1>Admin</h1>
          {auth.isLoggedIn && auth.isAdmin && (
            <div className="app-bar-subtitle">
              <span>{visibleSections.find((section) => section.id === activeSection)?.label ?? "Overview"}</span>
            </div>
          )}
        </div>
      </AppBarContent>

      <div className="container">
        {banner && (
          <div className={`banner ${auth.isDefaultPassword ? 'warning' : banner.includes('✔') ? 'success' : ''}`}>
            {renderStatusMessage(banner)}
          </div>
        )}

        {! auth.isLoggedIn ?  (
          <div className="card login-card">
            <div className="login-header">
              <h2 className="login-title"><MaterialIcon name="lock" style={{ fontSize: 24, verticalAlign: 'text-bottom', marginRight: 8 }} />Admin Login</h2>
            </div>
            {oidcConfig?.passwordLoginEnabled !== false && (
              <form onSubmit={handleLogin}>
                <div className="form-group">
                  <label className="form-label">Username</label>
                  <input
                    className="form-input"
                    type="text"
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    autoComplete="username"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Password</label>
                  <input
                    className="form-input"
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter admin password"
                    autoComplete="current-password"
                    required
                  />
                </div>
                {loginError && (
                  <div className="error-msg">{loginError}</div>
                )}
                <button
                  className="btn primary"
                  type="submit"
                  disabled={busy}
                  style={{ width: "100%" }}
                >
                  {busy ? <><span className="loading-spinner"></span> Logging in...</> : 'Login'}
                </button>
              </form>
            )}
            {oidcConfig?.passwordLoginEnabled === false && !oidcConfig?.enabled && (
              <div className="error-msg" style={{ marginBottom: 16 }}>
                Username/password login is disabled and SSO is not enabled.
              </div>
            )}
            {loginError && oidcConfig?.passwordLoginEnabled === false && (
              <div className="error-msg" style={{ marginBottom: 16 }}>
                {loginError}
              </div>
            )}
            {/* OIDC Login Button */}
            {oidcConfig?.enabled && (
              <>
                {oidcConfig?.passwordLoginEnabled !== false && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
                    <div style={{ flex: 1, height: 1, background: 'var(--color-border-strong)' }} />
                    <span style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>or</span>
                    <div style={{ flex: 1, height: 1, background: 'var(--color-border-strong)' }} />
                  </div>
                )}
                <a
                  href={`${API_BASE}/api/auth/oidc/login?returnTo=%2Fadmin`}
                  className="btn primary"
                  style={{
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'center',
                    textDecoration: 'none',
                    boxSizing: 'border-box',
                  }}
                >
                  {oidcConfig.buttonText}
                </a>
              </>
            )}
          </div>
        ) : !auth.isAdmin ? (
          /* Access Denied for non-admin users */
          <div className="card" style={{ maxWidth: 480, margin: '80px auto', textAlign: 'center' }}>
            <MaterialIcon name="block" style={{ fontSize: 64, marginBottom: 16 }} />
            <h2 style={{ margin: '0 0 12px', fontSize: 22 }}>Access Denied</h2>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: 24 }}>
              Your account does not have administrator privileges.
            </p>
            <button className="btn danger" onClick={auth.handleLogout}>
              <MaterialIcon name="logout" /> Logout
            </button>
          </div>
        ) : (
          <>
            <div className="admin-layout">
              <nav className="admin-nav" aria-label="Admin sections" ref={adminNavRef}>
                {visibleSections.map((section) => (
                  <button
                    key={section.id}
                    type="button"
                    className={`admin-nav-item${activeSection === section.id ? " active" : ""}`}
                    aria-current={activeSection === section.id ? "page" : undefined}
                    onClick={() => setActiveSection(section.id)}
                  >
                    <MaterialIcon name={section.icon} />
                    <span>{section.label}</span>
                  </button>
                ))}
              </nav>

              <div className="admin-content">
            <OverviewSection admin={admin} />

            <LibrariesSection admin={admin} />

            <BreakMusicSection admin={admin} />

            <SystemSection admin={admin} />

            <GatewaySection admin={admin} />

            <UsersSection admin={admin} />

            {!stationMode && activeSection === "social" && (
              <SocialLoginSettings key={auth.sessionToken} sessionToken={auth.sessionToken} />
            )}
            {auth.isAdmin && mergeUser && (
              <AccountLinkDialog key={`${mergeUser.id}:${auth.sessionToken}`}
                userId={mergeUser.id} targetName={getUserDisplayName(mergeUser)} role={mergeUser.role}
                sessionToken={auth.sessionToken}
                onClose={() => setMergeUser(null)}
                onLinked={(sourceName) => void handleUserMerged(sourceName)} />
            )}
            <OidcSection admin={admin} />

              </div>
            </div>

            <AddLibraryDialog admin={admin} />

            <AddBreakFolderDialog admin={admin} />

            <FolderBrowserDialog admin={admin} />

            <DownloadFolderBrowserDialog admin={admin} />

            <AccountDialog admin={admin} />
            <EditUserDialog admin={admin} />
          </>
        )}
      </div>
    </div>
  );
}
