import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
  Navigate,
  Outlet,
} from "react-router-dom";
import { useAuth, AuthProvider } from "./auth-context";
import { api } from "./api";
import { profileAssetUrl } from "./components/SingerAvatar";
import Player from "./pages/Player";
import Requests from "./pages/Requests";
import Host from "./pages/Host";
import Admin from "./pages/Admin";
import AppInstall from "./components/AppInstall";
import AppVersion, { APP_VERSION } from "./components/AppVersion";
import { updateAppManifest } from "./appManifest";
import ThemePicker from "./components/ThemePicker";
import LogoMenu from "./components/LogoMenu";
import { setAppBarSlot } from "./appBarSlot";
import { THEMES, type ThemeId } from "./theme";
import { useStaffTheme } from "./useStaffTheme";

const ACCOUNT_AVATAR_BACKGROUND = "#111827";

function Nav() {
  const location = useLocation();
  const auth = useAuth();
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const [staffTheme, setStaffTheme] = useStaffTheme();

  // Update page title based on route
  useEffect(() => {
    const titles: Record<string, string> = {
      "/": "Request - KaraokeDock",
      "/request": "Request - KaraokeDock",
      "/player": "Player - KaraokeDock",
      "/host": "Host - KaraokeDock",
      "/admin": "Admin - KaraokeDock",
    };
    document.title = titles[location.pathname] || "KaraokeDock";
  }, [location.pathname]);

  // Handle OIDC login redirects on the admin page.
  useEffect(() => {
    if (location.pathname !== "/admin") return;
    const params = new URLSearchParams(location.search);
    const oidcCode = params.get("oidc_code");

    if (oidcCode) {
      api("/api/auth/oidc/exchange", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: oidcCode }),
      })
        .then((result) => {
          auth.setSessionToken(result.sessionToken);
          auth.setIsLoggedIn(true);
          auth.setRole(result.role || "user");
          auth.setProfile({
            username: result.username || "",
            displayName: result.displayName || "",
            picture: result.picture || "",
          });
          window.history.replaceState({}, "", window.location.pathname);
        })
        .catch((err) => {
          const message = encodeURIComponent(
            String(err?.message || "SSO login failed"),
          );
          window.location.replace(
            `${window.location.pathname}?oidc_error=${message}`,
          );
        });
    }
  }, [location.pathname, location.search]);

  // Show auth button only on Host and Admin pages
  const showAuthButton =
    location.pathname === "/host" || location.pathname === "/admin";
  const showAccountSettingsOption =
    location.pathname === "/admin" || location.pathname === "/host";
  const avatarLabel =
    auth.profile.displayName || auth.profile.username || "Account";
  const avatarInitial = avatarLabel.trim().charAt(0).toUpperCase() || "👤";
  const avatarUrl = profileAssetUrl(auth.profile.picture);

  useEffect(() => {
    setAvatarLoadFailed(false);
  }, [auth.profile.picture]);

  return (
    <nav className="app-bar" aria-label="KaraokeDock">
      <LogoMenu currentPath={location.pathname} showAdmin={!auth.isLoggedIn || auth.isAdmin} />
      <div className="app-bar-page" ref={setAppBarSlot} />

      {/* Auth/Account button for Host and Admin pages */}
      {showAuthButton && auth.isLoggedIn && (
        <div className="app-bar-account">
          <button
            onClick={() => setShowAccountMenu(!showAccountMenu)}
            style={{
              width: 40,
              height: 40,
              minWidth: 40,
              minHeight: 40,
              padding: 0,
              boxSizing: "border-box",
              flexShrink: 0,
              overflow: "hidden",
              borderRadius: "50%",
              background:
                avatarUrl && !avatarLoadFailed
                  ? ACCOUNT_AVATAR_BACKGROUND
                  : "linear-gradient(135deg, var(--color-accent, #6366f1), var(--color-accent-2, #8b5cf6))",
              border: "none",
              color: "white",
              fontSize: 18,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.3s ease",
              boxShadow: "none",
            }}
            title={avatarLabel}
          >
            {avatarUrl && !avatarLoadFailed ? (
              <img
                src={avatarUrl}
                alt={avatarLabel}
                referrerPolicy="no-referrer"
                onError={() => setAvatarLoadFailed(true)}
                style={{
                  width: "100%",
                  height: "100%",
                  display: "block",
                  flexShrink: 0,
                  objectFit: "cover",
                  borderRadius: "50%",
                }}
              />
            ) : (
              avatarInitial
            )}
          </button>

          {/* Dropdown menu for account actions */}
          {showAccountMenu && (
            <>
              <div
                style={{
                  position: "fixed",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: 98,
                }}
                onClick={() => setShowAccountMenu(false)}
              />
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  right: 0,
                  marginTop: 8,
                  background: "var(--color-bg-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 12,
                  padding: 8,
                  minWidth: 248,
                  boxShadow: "0 4px 20px var(--color-shadow)",
                  zIndex: 99,
                }}
              >
                <div
                  style={{
                    padding: "10px 12px",
                    color: "var(--color-text-primary)",
                    fontSize: 13,
                    lineHeight: 1.4,
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{avatarLabel}</div>
                  {auth.profile.displayName &&
                    auth.profile.username &&
                    auth.profile.displayName !== auth.profile.username && (
                      <div style={{ color: "var(--color-text-secondary, #a1a1aa)" }}>
                        {auth.profile.username}
                      </div>
                    )}
                </div>
                <div
                  style={{
                    height: 1,
                    background: "var(--color-border)",
                    margin: "6px 0",
                  }}
                />
                <ThemePicker
                  value={staffTheme}
                  options={THEMES.map((theme) => ({ value: theme.id, label: theme.label, theme: theme.id }))}
                  onChange={(value) => setStaffTheme(value as ThemeId)}
                />
                <div
                  style={{
                    height: 1,
                    background: "var(--color-border)",
                    margin: "6px 0",
                  }}
                />
                {showAccountSettingsOption && (
                  <>
                    <button
                      onClick={() => {
                        setShowAccountMenu(false);
                        // Trigger account management - will be handled by Admin page
                        const event = new CustomEvent("showAccountManagement");
                        window.dispatchEvent(event);
                      }}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        background: "transparent",
                        border: "none",
                        color: "var(--color-text-primary)",
                        textAlign: "left",
                        cursor: "pointer",
                        borderRadius: 8,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        fontSize: 14,
                        fontWeight: 500,
                        transition: "background 0.2s ease",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background =
                          "var(--color-bg-hover)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      <span>🔐</span> Account Settings
                    </button>
                    <div
                      style={{
                        height: 1,
                        background: "var(--color-border)",
                        margin: "6px 0",
                      }}
                    />
                  </>
                )}
                <button
                  onClick={() => {
                    setShowAccountMenu(false);
                    auth.handleLogout();
                  }}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    background: "transparent",
                    border: "none",
                    color: "var(--color-danger)",
                    textAlign: "left",
                    cursor: "pointer",
                    borderRadius: 8,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 14,
                    fontWeight: 500,
                    transition: "background 0.2s ease",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background =
                      "var(--color-danger-soft)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <span>🚪</span> Logout
                </button>
                <div style={{ padding: "10px 12px", marginTop: 6, borderTop: "1px solid var(--color-border, rgba(255, 255, 255, 0.1))" }}>
                  <AppVersion />
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </nav>
  );
}

function SessionStatus() {
  const auth = useAuth();
  if (!auth.sessionError) return null;
  return (
    <div role="alert" style={{ padding: 16, textAlign: "center", color: "var(--color-danger, #ef4444)" }}>
      {auth.sessionError}{" "}
      <button type="button" onClick={auth.retrySessionValidation}>Retry sign-in</button>
    </div>
  );
}

function AppLayout() {
  return (
    <AuthProvider>
      <Nav />
      <SessionStatus />
      <AppInstall />
      <Outlet />
    </AuthProvider>
  );
}

function RequestRedirect() {
  const location = useLocation();
  return <Navigate replace to={{ pathname: "/request", search: location.search, hash: location.hash }} />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" caseSensitive element={<Requests />} />
          <Route path="/player" caseSensitive element={<Player />} />
          <Route path="/request" caseSensitive element={<Requests />} />
          <Route path="/host" caseSensitive element={<Host />} />
          <Route path="/admin" caseSensitive element={<Admin />} />
        </Route>
        <Route path="/requests" caseSensitive element={<RequestRedirect />} />
        <Route path="*" element={<main style={{ padding: 24, fontFamily: "system-ui" }}><h1>404 - Page not found</h1></main>} />
      </Routes>
    </BrowserRouter>
  );
}

const root = createRoot(document.getElementById("root")!);
console.info(`KaraokeDock v${APP_VERSION}`);
updateAppManifest(window.location.pathname);
root.render(<App />);
