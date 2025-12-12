import React, { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api";
import { useAuth } from "../auth-context";

type Library = { id: number; name: string; path: string };
type Stats = {
  artists: number;
  tracks: number;
  queued: number;
  lastScan?: any;
};
type FolderItem = { name: string; path: string; isDirectory: boolean };

export default function Admin() {
  const auth = useAuth()
  const [libs, setLibs] = useState<Library[]>([]);
  const [name, setName] = useState("");
  const [path, setPath] = useState("");
  const [busy, setBusy] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [banner, setBanner] = useState<string>("");
  const [showBrowser, setShowBrowser] = useState(false);
  const [currentBrowsePath, setCurrentBrowsePath] = useState("/media");
  const [folderContents, setFolderContents] = useState<FolderItem[]>([]);
  const [browseError, setBrowseError] = useState<string>("");

  // Login state
  const [loginUsername, setLoginUsername] = useState("admin");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  // Account management modal
  const [showAccountManagement, setShowAccountManagement] = useState(false);

  // Password change
  const [changingPassword, setChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // Username change
  const [changingUsername, setChangingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [usernamePassword, setUsernamePassword] = useState("");
  const [usernameError, setUsernameError] = useState("");

  const sessionHeaders = useMemo(
    () => ({
      "x-session-token": auth.sessionToken,
      "Content-Type": "application/json",
    }),
    [auth.sessionToken],
  );

  async function refreshLibs() {
    setLibs(await api("/api/libraries"));
  }
  async function refreshStats() {
    if (!auth.sessionToken || !auth.isLoggedIn) return;
    const s = await api("/api/admin/stats", { headers: sessionHeaders });
    setStats(s);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError("");
    setBusy(true);

    try {
      const result = await api("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: loginUsername,
          password: loginPassword,
        }),
      });

      if (result.ok && result.sessionToken) {
        auth.setSessionToken(result.sessionToken);
        localStorage.setItem("sessionToken", result.sessionToken);
        auth.setIsLoggedIn(true);
        auth.setIsDefaultPassword(result.isDefaultPassword || false);

        // Show warning banner if using default password
        if (result. isDefaultPassword) {
          setBanner(
            "⚠️ You are using the default password. Please change it for security.",
          );
        }
      } else {
        setLoginError("Invalid username or password");
      }
    } catch (err) {
      setLoginError("Login failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  // Password change function
  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError("");

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters long");
      return;
    }

    setBusy(true);
    try {
      await api("/api/auth/change-password", {
        method: "POST",
        headers: sessionHeaders,
        body: JSON. stringify({ currentPassword, newPassword }),
      });

      setBanner("Password changed successfully");
      setChangingPassword(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      auth.setIsDefaultPassword(false);
      setTimeout(() => setBanner(""), 3000);
    } catch (err: any) {
      setPasswordError(err?. message || "Failed to change password");
    } finally {
      setBusy(false);
    }
  }

  // Username change function
  async function handleChangeUsername(e: React.FormEvent) {
    e.preventDefault();
    setUsernameError("");

    if (newUsername.length < 3) {
      setUsernameError("Username must be at least 3 characters long");
      return;
    }

    setBusy(true);
    try {
      await api("/api/auth/change-username", {
        method: "POST",
        headers: sessionHeaders,
        body: JSON.stringify({
          currentPassword: usernamePassword,
          newUsername,
        }),
      });

      setBanner("Username changed successfully");
      setChangingUsername(false);
      setNewUsername("");
      setUsernamePassword("");
      setTimeout(() => setBanner(""), 3000);
    } catch (err: any) {
      setUsernameError(err?.message || "Failed to change username");
    } finally {
      setBusy(false);
    }
  }

  async function browseFolders(browsePath: string) {
    if (! auth.sessionToken || !auth.isLoggedIn) return;

    setBrowseError("");
    try {
      const contents = await api(
        `/api/browse?path=${encodeURIComponent(browsePath)}`,
        { headers: sessionHeaders },
      );
      setFolderContents(contents || []);
      setCurrentBrowsePath(browsePath);
    } catch (err) {
      setBrowseError("Unable to access this directory");
      setFolderContents([]);
    }
  }

  useEffect(() => {
    // Apply modern dark theme
    document.documentElement.style.cssText = `
      --color-bg-primary: #0a0a0f;
      --color-bg-secondary: #16161d;
      --color-bg-card: #1d1d27;
      --color-bg-hover: #252533;
      --color-accent: #6366f1;
      --color-accent-hover: #7c7ff3;
      --color-success: #10b981;
      --color-warning: #f59e0b;
      --color-danger: #ef4444;
      --color-text-primary: #ffffff;
      --color-text-secondary: #a1a1aa;
      --color-text-muted: #71717a;
      --color-border: rgba(255, 255, 255, 0.08);
      --color-border-focus: rgba(99, 102, 241, 0.5);
    `;
    
    document.body.style.cssText = `
      background: linear-gradient(135deg, #0a0a0f 0%, #16161d 100%);
      color: #ffffff;
      margin: 0;
      padding: 0;
      min-height: 100vh;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    `;

    refreshLibs();

    // Check if we have a stored session token and validate it
    const storedSessionToken = localStorage.getItem("sessionToken");
    if (storedSessionToken) {
      auth.setSessionToken(storedSessionToken);
      api("/api/auth/validate", {
        headers: { "x-session-token": storedSessionToken },
      })
        .then((result) => {
          if (result.valid) {
            auth.setIsLoggedIn(true);
            refreshStats();
          } else {
            auth.setIsLoggedIn(false);
            localStorage.removeItem("sessionToken");
          }
        })
        .catch(() => {
          auth.setIsLoggedIn(false);
          localStorage.removeItem("sessionToken");
        });
    }

    // Listen for account management event from navigation
    const handleShowAccountManagement = () => {
      setShowAccountManagement(true);
    };
    window.addEventListener('showAccountManagement', handleShowAccountManagement);

    return () => {
      document.documentElement.style.cssText = '';
      document.body.style.cssText = '';
      window.removeEventListener('showAccountManagement', handleShowAccountManagement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function addLibrary() {
    if (!auth.sessionToken || !auth.isLoggedIn) return alert("Please login first");
    if (! name. trim()) return alert("Library name is required");
    if (!path. trim()) return alert("Library path is required");

    setBusy(true);
    try {
      await api("/api/libraries", {
        method: "POST",
        headers: sessionHeaders,
        body: JSON.stringify({ name: name.trim(), path: path. trim() }),
      });
      await refreshLibs();
      setName("");
      setPath("");
    } finally {
      setBusy(false);
    }
  }

  async function deleteLibrary(id: number) {
    if (!auth.sessionToken || ! auth.isLoggedIn) return alert("Please login first");
    if (!confirm("Remove this library?  (Tracks remain until Clear DB)")) return;
    setBusy(true);
    try {
      await api(`/api/libraries/${id}`, {
        method: "DELETE",
        headers: sessionHeaders,
      });
      await refreshLibs();
    } finally {
      setBusy(false);
    }
  }

  async function scanAll() {
    if (!auth.sessionToken || !auth.isLoggedIn) return alert("Please login first");
    setBusy(true);
    setBanner("Scanning libraries…");
    try {
      await api("/api/scan", {
        method: "POST",
        headers: sessionHeaders,
        body: JSON.stringify({}),
      });
      // Result will arrive via SSE as scan_done; we don't alert here. 
    } finally {
      setBusy(false);
    }
  }

  async function scanOne(id: number) {
    if (! auth.sessionToken || !auth.isLoggedIn) return alert("Please login first");
    setBusy(true);
    setBanner(`Scanning library #${id}…`);
    try {
      await api("/api/scan", {
        method: "POST",
        headers: sessionHeaders,
        body: JSON.stringify({ libraryId: id }),
      });
    } finally {
      setBusy(false);
    }
  }

  async function clearDb() {
    if (!auth.sessionToken || !auth.isLoggedIn) return alert("Please login first");
    if (
      !confirm(
        "This will clear queue, tracks, and artists (libraries remain). Continue?",
      )
    )
      return;
    setBusy(true);
    try {
      const r = await api("/api/admin/clear-db", {
        method: "POST",
        headers: sessionHeaders,
      });
      setBanner(
        `DB cleared (artists ${r.before.artists}→${r.after.artists}, tracks ${r.before.tracks}→${r.after.tracks}, queue ${r.before.queue}→${r.after.queue})`,
      );
      await refreshStats();
      setTimeout(() => setBanner(""), 4000);
    } finally {
      setBusy(false);
    }
  }

  const openBrowser = () => {
    setShowBrowser(true);
    setCurrentBrowsePath(path || "/media");
    browseFolders(path || "/media");
  };

  const selectFolder = (folderPath: string) => {
    setPath(folderPath);
    setShowBrowser(false);
  };

  const navigateUp = () => {
    const parentPath =
      currentBrowsePath. split("/").slice(0, -1).join("/") || "/";
    browseFolders(parentPath);
  };

  return (
    <div className="admin-page">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        /* Animations */
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes slideIn {
          from { transform: translateX(-10px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Base */
        .admin-page {
          min-height: 100vh;
          padding: 16px;
          padding-bottom: env(safe-area-inset-bottom, 16px);
          animation: fadeInUp 0.5s ease;
        }

        . container {
          max-width: 1200px;
          margin: 0 auto;
        }

        /* Header */
        .header {
          text-align: center;
          margin-bottom: 32px;
          animation: fadeInUp 0.6s ease;
        }

        .header-title {
          font-size: clamp(28px, 5vw, 40px);
          font-weight: 700;
          margin: 0 0 8px 0;
          background: linear-gradient(135deg, #6366f1 0%, #10b981 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          letter-spacing: -0.02em;
        }

        .header-subtitle {
          color: var(--color-text-secondary);
          font-size: clamp(14px, 2. 5vw, 16px);
          margin: 0;
        }

        /* Cards */
        .card {
          background: var(--color-bg-card);
          border: 1px solid var(--color-border);
          border-radius: 20px;
          padding: 24px;
          margin-bottom: 20px;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
          backdrop-filter: blur(10px);
          animation: fadeInUp 0.6s ease backwards;
          overflow: hidden;
        }

        .card:nth-child(2) { animation-delay: 0.1s; }
        .card:nth-child(3) { animation-delay: 0.2s; }
        .card:nth-child(4) { animation-delay: 0.3s; }

        /* Banner */
        .banner {
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(245, 158, 11, 0.15));
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 16px;
          padding: 14px 20px;
          margin-bottom: 20px;
          font-weight: 500;
          animation: slideIn 0.3s ease;
        }

        . banner. warning {
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(239, 68, 68, 0.15));
          border-color: rgba(245, 158, 11, 0.3);
        }

        .banner.success {
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(99, 102, 241, 0.15));
          border-color: rgba(16, 185, 129, 0.3);
        }

        /* Login Card */
        .login-card {
          max-width: 400px;
          margin: 100px auto;
        }

        .login-header {
          text-align: center;
          margin-bottom: 32px;
        }

        .login-title {
          font-size: 28px;
          font-weight: 700;
          margin-bottom: 8px;
        }

        /* Forms */
        .form-group {
          margin-bottom: 20px;
        }

        . form-label {
          display: block;
          font-size: 14px;
          font-weight: 500;
          color: var(--color-text-secondary);
          margin-bottom: 8px;
        }

        .form-input {
          width: 100%;
          padding: 12px 16px;
          background: var(--color-bg-secondary);
          border: 2px solid var(--color-border);
          border-radius: 12px;
          color: var(--color-text-primary);
          font-size: 15px;
          transition: all 0.3s ease;
          outline: none;
          box-sizing: border-box;
        }

        .form-input:focus {
          border-color: var(--color-accent);
          box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
        }

        /* Buttons */
        .btn {
          padding: 12px 20px;
          background: var(--color-bg-secondary);
          border: 2px solid var(--color-border);
          border-radius: 12px;
          color: var(--color-text-primary);
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0. 3s ease;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .btn:hover:not(:disabled) {
          background: var(--color-bg-hover);
          border-color: var(--color-accent);
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
        }

        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn.primary {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          border: none;
          color: white;
        }

        .btn.success {
          background: linear-gradient(135deg, #10b981, #059669);
          border: none;
          color: white;
        }

        .btn.danger {
          background: linear-gradient(135deg, #ef4444, #dc2626);
          border: none;
          color: white;
        }

        .btn.ghost {
          background: transparent;
          border-color: transparent;
        }

        .btn.ghost:hover:not(:disabled) {
          background: var(--color-bg-hover);
          border-color: var(--color-border);
        }

        /* Stats Pills */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 12px;
          margin-bottom: 20px;
        }

        . stat-pill {
          padding: 16px;
          background: var(--color-bg-secondary);
          border: 1px solid var(--color-border);
          border-radius: 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          transition: all 0.3s ease;
        }

        .stat-pill:hover {
          background: var(--color-bg-hover);
          border-color: var(--color-accent);
          transform: translateY(-2px);
        }

        .stat-icon {
          font-size: 24px;
          margin-bottom: 4px;
        }

        .stat-value {
          font-size: 24px;
          font-weight: 700;
          color: var(--color-accent);
        }

        .stat-label {
          font-size: 12px;
          color: var(--color-text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        /* Library List */
        .library-list {
          display: grid;
          gap: 12px;
        }

        . library-item {
          background: var(--color-bg-secondary);
          border: 1px solid var(--color-border);
          border-radius: 16px;
          padding: 16px;
          transition: all 0.3s ease;
          animation: fadeInUp 0.4s ease backwards;
        }

        .library-item:hover {
          background: var(--color-bg-hover);
          border-color: var(--color-accent);
          transform: translateX(4px);
        }

        .library-header {
          display: flex;
          justify-content: space-between;
          align-items: start;
          gap: 12px;
        }

        .library-info {
          flex: 1;
          min-width: 0;
        }

        .library-name {
          font-weight: 600;
          font-size: 16px;
          margin-bottom: 4px;
        }

        .library-path {
          font-size: 13px;
          color: var(--color-text-secondary);
          font-family: 'Monaco', 'Courier New', monospace;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .library-actions {
          display: flex;
          gap: 8px;
        }

        /* Modal */
        .modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(4px);
          z-index: 999;
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .modal {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: var(--color-bg-card);
          border: 1px solid var(--color-border);
          border-radius: 20px;
          padding: 24px;
          z-index: 1000;
          max-width: 800px;
          width: 90%;
          max-height: 85vh;
          overflow: hidden;
          box-shadow: 0 10px 50px rgba(0, 0, 0, 0.5);
          display: flex;
          flex-direction: column;
          animation: scaleIn 0.3s ease;
        }

        @keyframes scaleIn {
          from {
            transform: translate(-50%, -50%) scale(0.9);
            opacity: 0;
          }
          to {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
          }
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        . modal-title {
          font-size: 20px;
          font-weight: 600;
          margin: 0;
        }

        /* Browser */
        .browser-path {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          background: var(--color-bg-secondary);
          border: 1px solid var(--color-border);
          border-radius: 12px;
          margin-bottom: 16px;
          font-family: 'Monaco', 'Courier New', monospace;
          font-size: 14px;
        }

        .breadcrumb {
          display: flex;
          gap: 6px;
          align-items: center;
        }

        . breadcrumb-sep {
          opacity: 0.3;
        }

        .breadcrumb-part {
          cursor: pointer;
          color: var(--color-accent);
          transition: all 0.2s ease;
        }

        . breadcrumb-part:hover {
          color: var(--color-accent-hover);
          text-decoration: underline;
        }

        .browser-container {
          background: var(--color-bg-secondary);
          border: 1px solid var(--color-border);
          border-radius: 12px;
          padding: 8px;
          height: 400px;
          overflow-y: auto;
          margin-bottom: 16px;
        }

        .folder-item {
          padding: 12px 16px;
          cursor: pointer;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 12px;
          transition: all 0.2s ease;
          border: 1px solid transparent;
        }

        .folder-item:hover {
          background: var(--color-bg-hover);
          border-color: var(--color-accent);
        }

        .folder-icon {
          font-size: 20px;
        }

        . folder-name {
          flex: 1;
          font-weight: 500;
        }

        /* Error Messages */
        .error-msg {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 10px;
          padding: 12px 16px;
          color: #fca5a5;
          font-size: 14px;
          margin-bottom: 16px;
        }

        /* Loading */
        .loading-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid var(--color-border);
          border-top-color: var(--color-accent);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          display: inline-block;
        }

        /* Empty State */
        .empty-state {
          text-align: center;
          padding: 48px 24px;
          color: var(--color-text-secondary);
        }

        . empty-icon {
          font-size: 64px;
          margin-bottom: 16px;
          opacity: 0.5;
        }

        . empty-text {
          font-size: 16px;
        }

        . empty-subtext {
          font-size: 14px;
          margin-top: 8px;
          opacity: 0.7;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .admin-page {
            padding: 12px;
          }

          . card {
            padding: 16px;
            border-radius: 16px;
          }

          . stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .library-header {
            flex-direction: column;
          }

          .library-actions {
            width: 100%;
            margin-top: 12px;
          }

          .btn {
            flex: 1;
          }

          .modal {
            width: 95%;
            padding: 20px;
          }
        }

        @media (max-width: 480px) {
          . stats-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="container">
        {banner && (
          <div className={`banner ${auth.isDefaultPassword ? 'warning' : banner.includes('✔') ? 'success' : ''}`}>
            {banner}
          </div>
        )}

        <div className="header">
          <h1 className="header-title">Admin Dashboard</h1>
          <p className="header-subtitle">Manage your karaoke system settings and media libraries</p>
        </div>

        {! auth.isLoggedIn ?  (
          <div className="card login-card">
            <div className="login-header">
              <h2 className="login-title">🔐 Admin Login</h2>
            </div>
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
          </div>
        ) : (
          <>
            {/* Stats Card */}
            <div className="card">
              <h2 style={{ margin: "0 0 20px", fontSize: 20 }}>📊 System Statistics</h2>
              <div className="stats-grid">
                <div className="stat-pill">
                  <span className="stat-icon">🎤</span>
                  <span className="stat-value">{stats?.artists ??  "—"}</span>
                  <span className="stat-label">Artists</span>
                </div>
                <div className="stat-pill">
                  <span className="stat-icon">🎵</span>
                  <span className="stat-value">{stats?.tracks ?? "—"}</span>
                  <span className="stat-label">Tracks</span>
                </div>
                <div className="stat-pill">
                  <span className="stat-icon">📋</span>
                  <span className="stat-value">{stats?.queued ?? "—"}</span>
                  <span className="stat-label">Queued</span>
                </div>
                <div className="stat-pill">
                  <span className="stat-icon">⏰</span>
                  <span className="stat-value" style={{ fontSize: 14 }}>
                    {stats?.lastScan?. finishedAt
                      ? new Date(stats.lastScan. finishedAt).toLocaleDateString()
                      : "Never"}
                  </span>
                  <span className="stat-label">Last Scan</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 20 }}>
                <button
                  className="btn primary"
                  onClick={scanAll}
                  disabled={busy || !auth.sessionToken || !auth.isLoggedIn}
                >
                  <span>🔍</span> Scan All Libraries
                </button>
                <button
                  className="btn danger"
                  onClick={clearDb}
                  disabled={busy || !auth.sessionToken || !auth.isLoggedIn}
                >
                  <span>🗑️</span> Clear Database
                </button>
                <button
                  className="btn ghost"
                  onClick={refreshStats}
                  disabled={! auth.sessionToken || !auth.isLoggedIn}
                >
                  <span>🔄</span> Refresh Stats
                </button>
              </div>
            </div>

            {/* Media Libraries Card */}
            <div className="card">
              <h2 style={{ margin: "0 0 20px", fontSize: 20 }}>📚 Media Libraries</h2>
              
              {/* Add Library Form */}
              <div style={{
                background: "var(--color-bg-secondary)",
                border: "1px solid var(--color-border)",
                borderRadius: 12,
                padding: 16,
                marginBottom: 20
              }}>
                <div className="form-group">
                  <label className="form-label">Library Name</label>
                  <input
                    className="form-input"
                    placeholder="e.g., Main Collection"
                    value={name}
                    onChange={(e) => setName(e.target. value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Folder Path</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      className="form-input"
                      placeholder="e.g., /media/karaoke"
                      value={path}
                      onChange={(e) => setPath(e.target.value)}
                    />
                    <button
                      className="btn"
                      onClick={openBrowser}
                      disabled={! auth.sessionToken || !auth.isLoggedIn}
                      title="Browse folders"
                      style={{ whiteSpace: "nowrap" }}
                    >
                      <span>📁</span> Browse
                    </button>
                  </div>
                </div>

                <button
                  className="btn success"
                  onClick={addLibrary}
                  disabled={
                    busy ||
                    !auth.sessionToken ||
                    !auth.isLoggedIn ||
                    !name.trim() ||
                    !path.trim()
                  }
                  style={{ width: "100%" }}
                >
                  <span>➕</span> Add Library
                </button>
              </div>

              {/* Libraries List */}
              {libs.length > 0 ? (
                <div className="library-list">
                  {libs.map((l, index) => (
                    <div key={l.id} className="library-item" style={{ animationDelay: `${index * 0.05}s` }}>
                      <div className="library-header">
                        <div className="library-info">
                          <div className="library-name">{l.name}</div>
                          <div className="library-path">📁 {l.path}</div>
                        </div>
                        <div className="library-actions">
                          <button
                            className="btn"
                            onClick={() => scanOne(l.id)}
                            disabled={busy || !auth.sessionToken || !auth.isLoggedIn}
                          >
                            <span>🔍</span> Scan
                          </button>
                          <button
                            className="btn danger"
                            onClick={() => deleteLibrary(l.id)}
                            disabled={busy || !auth.sessionToken || !auth.isLoggedIn}
                          >
                            <span>✕</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-icon">📁</div>
                  <div className="empty-text">No libraries configured yet</div>
                  <div className="empty-subtext">Add a media library above to get started</div>
                </div>
              )}
            </div>

            {/* Folder Browser Modal */}
            {showBrowser && (
              <>
                <div
                  className="modal-backdrop"
                  onClick={() => setShowBrowser(false)}
                />
                <div className="modal">
                  <div className="modal-header">
                    <h3 className="modal-title">📁 Select Media Folder</h3>
                    <button
                      className="btn ghost"
                      onClick={() => setShowBrowser(false)}
                      style={{ padding: "4px 12px" }}
                    >
                      ✕
                    </button>
                  </div>

                  <div className="browser-path">
                    <span>📍</span>
                    <div className="breadcrumb">
                      <span
                        className="breadcrumb-part"
                        onClick={() => browseFolders("/")}
                      >
                        /
                      </span>
                      {currentBrowsePath
                        .split("/")
                        .filter(Boolean)
                        .map((part, idx, arr) => {
                          const partPath = "/" + arr.slice(0, idx + 1).join("/");
                          return (
                            <React.Fragment key={idx}>
                              <span className="breadcrumb-sep">/</span>
                              <span
                                className="breadcrumb-part"
                                onClick={() => browseFolders(partPath)}
                              >
                                {part}
                              </span>
                            </React. Fragment>
                          );
                        })}
                    </div>
                  </div>

                  {browseError && (
                    <div className="error-msg">⚠️ {browseError}</div>
                  )}

                  <div className="browser-container">
                    {currentBrowsePath !== "/" && (
                      <div className="folder-item" onClick={navigateUp}>
                        <span className="folder-icon">⬆️</span>
                        <span className="folder-name">..</span>
                        <span style={{ opacity: 0.5, fontSize: 13 }}>(parent directory)</span>
                      </div>
                    )}

                    {folderContents
                      .filter((item) => item.isDirectory)
                      .map((item) => (
                        <div
                          key={item.path}
                          className="folder-item"
                          onClick={() => browseFolders(item.path)}
                        >
                          <span className="folder-icon">📁</span>
                          <span className="folder-name">{item.name}</span>
                        </div>
                      ))}

                    {folderContents. filter((item) => item.isDirectory). length ===
                      0 &&
                      !browseError && (
                        <div className="empty-state" style={{ padding: 40 }}>
                          <div className="empty-icon" style={{ fontSize: 48 }}>📂</div>
                          <div className="empty-text" style={{ fontSize: 14 }}>No subfolders in this directory</div>
                        </div>
                      )}
                  </div>

                  <div style={{ display: 'flex', gap: 12 }}>
                    <input
                      className="form-input"
                      value={currentBrowsePath}
                      readOnly
                      style={{ flex: 1 }}
                    />
                    <button
                      className="btn success"
                      onClick={() => selectFolder(currentBrowsePath)}
                    >
                      <span>✓</span> Select This Folder
                    </button>
                    <button
                      className="btn ghost"
                      onClick={() => setShowBrowser(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Account Management Modal */}
            {showAccountManagement && (
              <>
                <div className="modal-backdrop" onClick={() => setShowAccountManagement(false)} />
                <div className="modal">
                  <div className="modal-header">
                    <h3 className="modal-title">🔐 Account Settings</h3>
                    <button
                      className="btn ghost"
                      onClick={() => setShowAccountManagement(false)}
                      style={{ padding: "4px 12px" }}
                    >
                      ✕
                    </button>
                  </div>

                  {auth.isDefaultPassword && (
                    <div className="banner warning" style={{ marginBottom: 16 }}>
                      ⚠️ You are using the default password. Please change it for security.
                    </div>
                  )}

                  <p style={{ color: 'var(--color-text-secondary)', marginBottom: 20, fontSize: 14 }}>
                    Change your admin username and password. These credentials are used for both the Admin and Host pages.
                  </p>

                  {/* Username Change Section */}
                  <div style={{ marginBottom: 20 }}>
                    {!changingUsername ? (
                      <button
                        className="btn"
                        onClick={() => setChangingUsername(true)}
                      >
                        <span>👤</span> Change Username
                      </button>
                    ) : (
                      <form
                        onSubmit={handleChangeUsername}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 12,
                          background: "var(--color-bg-secondary)",
                          padding: 16,
                          borderRadius: 12,
                          border: "1px solid var(--color-border)",
                        }}
                      >
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label">New Username</label>
                          <input
                            className="form-input"
                            type="text"
                            value={newUsername}
                            onChange={(e) => setNewUsername(e.target.value)}
                            placeholder="Enter new username (min 3 characters)"
                            autoComplete="username"
                            required
                            minLength={3}
                          />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label">
                            Current Password (to confirm)
                          </label>
                          <input
                            className="form-input"
                            type="password"
                            value={usernamePassword}
                            onChange={(e) => setUsernamePassword(e.target.value)}
                            placeholder="Enter current password"
                            autoComplete="current-password"
                            required
                          />
                        </div>
                        {usernameError && (
                          <div className="error-msg" style={{ marginBottom: 0 }}>{usernameError}</div>
                        )}
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            className="btn success"
                            type="submit"
                            disabled={busy}
                          >
                            <span>✓</span> Change Username
                          </button>
                          <button
                            type="button"
                            className="btn ghost"
                            onClick={() => {
                              setChangingUsername(false);
                              setNewUsername("");
                              setUsernamePassword("");
                              setUsernameError("");
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    )}
                  </div>

                  {/* Password Change Section */}
                  {!changingPassword ? (
                    <button
                      className="btn"
                      onClick={() => setChangingPassword(true)}
                    >
                      <span>🔒</span> Change Password
                    </button>
                  ) : (
                    <form
                      onSubmit={handleChangePassword}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 12,
                        background: "var(--color-bg-secondary)",
                        padding: 16,
                        borderRadius: 12,
                        border: "1px solid var(--color-border)",
                      }}
                    >
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Current Password</label>
                        <input
                          className="form-input"
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="Enter current password"
                          autoComplete="current-password"
                          required
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">New Password</label>
                        <input
                          className="form-input"
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Enter new password (min 8 characters)"
                          autoComplete="new-password"
                          required
                          minLength={8}
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Confirm New Password</label>
                        <input
                          className="form-input"
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirm new password"
                          autoComplete="new-password"
                          required
                        />
                      </div>
                      {passwordError && (
                        <div className="error-msg" style={{ marginBottom: 0 }}>{passwordError}</div>
                      )}
                      <div style={{ display: "flex", gap: 8 }}>
                        <button className="btn success" type="submit" disabled={busy}>
                          <span>✓</span> Change Password
                        </button>
                        <button
                          type="button"
                          className="btn ghost"
                          onClick={() => {
                            setChangingPassword(false);
                            setCurrentPassword("");
                            setNewPassword("");
                            setConfirmPassword("");
                            setPasswordError("");
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}