import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useMemo, useState } from "react";
import { api, API_BASE } from "../api";
import { useAuth } from "../auth-context";
import { parseBooleanSetting } from "../utils/settings";
import { clearStoredSessionToken, readStoredSessionToken, writeStoredSessionToken } from "../session-token";
const getUserDisplayName = (user) => user.display_name?.trim() || user.username;
export default function Admin() {
    const auth = useAuth();
    const [libs, setLibs] = useState([]);
    const [name, setName] = useState("");
    const [path, setPath] = useState("");
    const [busy, setBusy] = useState(false);
    const [stats, setStats] = useState(null);
    const [banner, setBanner] = useState("");
    const [showBrowser, setShowBrowser] = useState(false);
    const [currentBrowsePath, setCurrentBrowsePath] = useState("/media");
    const [folderContents, setFolderContents] = useState([]);
    const [browseError, setBrowseError] = useState("");
    const [browseTarget, setBrowseTarget] = useState('library');
    const [breakFolders, setBreakFolders] = useState([]);
    const [breakFolderName, setBreakFolderName] = useState("");
    const [breakFolderPath, setBreakFolderPath] = useState("");
    const [breakPlaylistsFolder, setBreakPlaylistsFolder] = useState("/media/playlists");
    // Login state
    const [loginUsername, setLoginUsername] = useState("");
    const [loginPassword, setLoginPassword] = useState("");
    const [loginError, setLoginError] = useState("");
    // OIDC public config (for login button)
    const [oidcConfig, setOidcConfig] = useState(null);
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
    // yt-dlp state
    const [ytdlpVersion, setYtdlpVersion] = useState(null);
    const [ytdlpUpdating, setYtdlpUpdating] = useState(false);
    const [downloadLocation, setDownloadLocation] = useState("/media/downloads");
    const [backgroundTasksEnabled, setBackgroundTasksEnabled] = useState(true);
    const [backgroundMediaScanEnabled, setBackgroundMediaScanEnabled] = useState(false);
    const [backgroundDownloadScanEnabled, setBackgroundDownloadScanEnabled] = useState(false);
    const [backgroundBreakMusicScanEnabled, setBackgroundBreakMusicScanEnabled] = useState(false);
    const [requestAcceptance, setRequestAcceptance] = useState("local");
    const [localLibraryEnabled, setLocalLibraryEnabled] = useState(true);
    const [externalLibraryEnabled, setExternalLibraryEnabled] = useState(true);
    const [localBrowseEnabled, setLocalBrowseEnabled] = useState(true);
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [allowDownloads, setAllowDownloads] = useState(true);
    const [showDownloadBrowser, setShowDownloadBrowser] = useState(false);
    // Collapsible card states
    const [mediaLibrariesExpanded, setMediaLibrariesExpanded] = useState(true);
    const [breakMusicExpanded, setBreakMusicExpanded] = useState(true);
    const [systemSettingsExpanded, setSystemSettingsExpanded] = useState(true);
    // User Manager state
    const [users, setUsers] = useState([]);
    const [usersExpanded, setUsersExpanded] = useState(true);
    const [showCreateUser, setShowCreateUser] = useState(false);
    const [newUserUsername, setNewUserUsername] = useState("");
    const [newUserPassword, setNewUserPassword] = useState("");
    const [newUserRole, setNewUserRole] = useState('user');
    const [userError, setUserError] = useState("");
    const [editingUser, setEditingUser] = useState(null);
    const [editUserRole, setEditUserRole] = useState('user');
    const [editUserActive, setEditUserActive] = useState(true);
    const [editUserPassword, setEditUserPassword] = useState("");
    const [editUserError, setEditUserError] = useState("");
    // OIDC Settings state
    const [oidcSettingsExpanded, setOidcSettingsExpanded] = useState(false);
    const [oidcSettings, setOidcSettings] = useState({
        enabled: false,
        issuer: '',
        clientId: '',
        clientSecret: '',
        redirectUri: '',
        buttonText: 'Login with SSO',
        buttonColor: '#6366f1',
        autoCreateUsers: true,
        defaultRole: 'user',
        passwordLoginEnabled: true,
    });
    const [oidcClientSecretChanged, setOidcClientSecretChanged] = useState(false);
    const [oidcSaving, setOidcSaving] = useState(false);
    const [oidcBanner, setOidcBanner] = useState("");
    // Logging level state
    const [logLevel, setLogLevel] = useState('info');
    const sessionHeaders = useMemo(() => ({
        "x-session-token": auth.sessionToken,
        "Content-Type": "application/json",
    }), [auth.sessionToken]);
    async function refreshLibs() {
        setLibs(await api("/api/libraries"));
    }
    async function refreshBreakFolders() {
        if (!auth.sessionToken || !auth.isLoggedIn)
            return;
        setBreakFolders(await api("/api/break-music/folders", { headers: sessionHeaders }));
    }
    async function refreshStats() {
        if (!auth.sessionToken || !auth.isLoggedIn)
            return;
        const s = await api("/api/admin/stats", { headers: sessionHeaders });
        setStats(s);
    }
    async function handleLogin(e) {
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
                writeStoredSessionToken(result.sessionToken);
                auth.setIsLoggedIn(true);
                auth.setRole(result.role || 'admin');
                auth.setIsDefaultPassword(result.isDefaultPassword || false);
                auth.setProfile({
                    username: result.username || "",
                    displayName: result.displayName || "",
                    picture: result.picture || "",
                });
                // Show warning banner if using default password
                if (result.isDefaultPassword) {
                    setBanner("⚠️ You are using the default password. Please change it for security.");
                }
            }
            else {
                setLoginError("Invalid username or password");
            }
        }
        catch (err) {
            setLoginError("Login failed. Please try again.");
        }
        finally {
            setBusy(false);
        }
    }
    // Password change function
    async function handleChangePassword(e) {
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
                body: JSON.stringify({ currentPassword, newPassword }),
            });
            setBanner("Password changed successfully");
            setChangingPassword(false);
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
            auth.setIsDefaultPassword(false);
            setTimeout(() => setBanner(""), 3000);
        }
        catch (err) {
            setPasswordError(err?.message || "Failed to change password");
        }
        finally {
            setBusy(false);
        }
    }
    // Username change function
    async function handleChangeUsername(e) {
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
        }
        catch (err) {
            setUsernameError(err?.message || "Failed to change username");
        }
        finally {
            setBusy(false);
        }
    }
    async function browseFolders(browsePath) {
        if (!auth.sessionToken || !auth.isLoggedIn)
            return;
        setBrowseError("");
        try {
            const contents = await api(`/api/browse?path=${encodeURIComponent(browsePath)}`, { headers: sessionHeaders });
            setFolderContents(contents || []);
            setCurrentBrowsePath(browsePath);
        }
        catch (err) {
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
        // Check if we have a stored session token and validate it.
        // The localStorage value is written before this effect by the OIDC session handler in main.tsx.
        const storedSessionToken = readStoredSessionToken();
        if (storedSessionToken) {
            auth.setSessionToken(storedSessionToken);
            api("/api/auth/validate", {
                headers: { "x-session-token": storedSessionToken },
            })
                .then((result) => {
                if (result.valid) {
                    auth.setIsLoggedIn(true);
                    auth.setRole(result.role || 'admin');
                    auth.setProfile({
                        username: result.username || "",
                        displayName: result.displayName || "",
                        picture: result.picture || "",
                    });
                    refreshStats();
                }
                else {
                    auth.setIsLoggedIn(false);
                    auth.clearProfile();
                    clearStoredSessionToken();
                }
            })
                .catch(() => {
                auth.setIsLoggedIn(false);
                auth.clearProfile();
                clearStoredSessionToken();
            });
        }
        // Show OIDC error from URL param if present
        const params = new URLSearchParams(window.location.search);
        const oidcError = params.get('oidc_error');
        if (oidcError) {
            setLoginError(`SSO login failed: ${decodeURIComponent(oidcError)}`);
            window.history.replaceState({}, '', window.location.pathname);
        }
        // Load OIDC button config for the login form
        api("/api/auth/oidc/config")
            .then((cfg) => setOidcConfig(cfg))
            .catch(() => { });
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
        if (!auth.sessionToken || !auth.isLoggedIn)
            return alert("Please login first");
        if (!name.trim())
            return alert("Library name is required");
        if (!path.trim())
            return alert("Library path is required");
        setBusy(true);
        try {
            await api("/api/libraries", {
                method: "POST",
                headers: sessionHeaders,
                body: JSON.stringify({ name: name.trim(), path: path.trim() }),
            });
            await refreshLibs();
            setName("");
            setPath("");
        }
        finally {
            setBusy(false);
        }
    }
    async function deleteLibrary(id) {
        if (!auth.sessionToken || !auth.isLoggedIn)
            return alert("Please login first");
        if (!confirm("Remove this library?  (Tracks remain until Clear DB)"))
            return;
        setBusy(true);
        try {
            await api(`/api/libraries/${id}`, {
                method: "DELETE",
                headers: sessionHeaders,
            });
            await refreshLibs();
        }
        finally {
            setBusy(false);
        }
    }
    async function addBreakFolder() {
        if (!auth.sessionToken || !auth.isLoggedIn)
            return alert("Please login first");
        if (!breakFolderName.trim())
            return alert("Break music folder name is required");
        if (!breakFolderPath.trim())
            return alert("Break music folder path is required");
        setBusy(true);
        try {
            await api("/api/break-music/folders", {
                method: "POST",
                headers: sessionHeaders,
                body: JSON.stringify({ name: breakFolderName.trim(), path: breakFolderPath.trim() }),
            });
            setBreakFolderName("");
            setBreakFolderPath("");
            await refreshBreakFolders();
        }
        finally {
            setBusy(false);
        }
    }
    async function deleteBreakFolder(id) {
        if (!auth.sessionToken || !auth.isLoggedIn)
            return alert("Please login first");
        if (!confirm("Remove this break music folder?"))
            return;
        setBusy(true);
        try {
            await api(`/api/break-music/folders/${id}`, {
                method: "DELETE",
                headers: sessionHeaders,
            });
            await refreshBreakFolders();
        }
        finally {
            setBusy(false);
        }
    }
    async function scanBreakMusic(folderId) {
        if (!auth.sessionToken || !auth.isLoggedIn)
            return alert("Please login first");
        setBusy(true);
        setBanner("Scanning break music folders…");
        try {
            const payload = {};
            if (folderId)
                payload.folderId = folderId;
            const result = await api("/api/break-music/scan", {
                method: "POST",
                headers: sessionHeaders,
                body: JSON.stringify(payload),
            });
            setBanner(`✔ Break music scan complete (${result.indexed ?? 0} indexed)`);
            setTimeout(() => setBanner(""), 4000);
        }
        catch (err) {
            setBanner(`⚠️ Break music scan failed: ${err.message}`);
            setTimeout(() => setBanner(""), 5000);
        }
        finally {
            setBusy(false);
        }
    }
    async function clearBreakMusicDb() {
        if (!auth.sessionToken || !auth.isLoggedIn)
            return alert("Please login first");
        if (!confirm("This will clear only break music tracks from the database (folders remain). Continue?"))
            return;
        setBusy(true);
        try {
            const result = await api("/api/break-music/clear-library", {
                method: "POST",
                headers: sessionHeaders,
            });
            setBanner(`✔ Break music DB cleared (${result.before ?? 0}→${result.after ?? 0} tracks)`);
            setTimeout(() => setBanner(""), 4000);
        }
        catch (err) {
            setBanner(`⚠️ Failed to clear break music DB: ${err.message}`);
            setTimeout(() => setBanner(""), 5000);
        }
        finally {
            setBusy(false);
        }
    }
    async function scanAll() {
        if (!auth.sessionToken || !auth.isLoggedIn)
            return alert("Please login first");
        setBusy(true);
        setBanner("Scanning libraries…");
        try {
            await api("/api/scan", {
                method: "POST",
                headers: sessionHeaders,
                body: JSON.stringify({}),
            });
            // Result will arrive via SSE as scan_done; we don't alert here. 
        }
        finally {
            setBusy(false);
        }
    }
    async function scanOne(id) {
        if (!auth.sessionToken || !auth.isLoggedIn)
            return alert("Please login first");
        setBusy(true);
        setBanner(`Scanning library #${id}…`);
        try {
            await api("/api/scan", {
                method: "POST",
                headers: sessionHeaders,
                body: JSON.stringify({ libraryId: id }),
            });
        }
        finally {
            setBusy(false);
        }
    }
    async function clearDb() {
        if (!auth.sessionToken || !auth.isLoggedIn)
            return alert("Please login first");
        if (!confirm("This will clear queue, tracks, and artists (libraries remain). Continue?"))
            return;
        setBusy(true);
        try {
            const r = await api("/api/admin/clear-db", {
                method: "POST",
                headers: sessionHeaders,
            });
            setBanner(`DB cleared (artists ${r.before.artists}→${r.after.artists}, tracks ${r.before.tracks}→${r.after.tracks}, queue ${r.before.queue}→${r.after.queue})`);
            await refreshStats();
            setTimeout(() => setBanner(""), 4000);
        }
        finally {
            setBusy(false);
        }
    }
    const openBrowser = () => {
        setBrowseTarget('library');
        setShowBrowser(true);
        setCurrentBrowsePath(path || "/media");
        browseFolders(path || "/media");
    };
    const selectFolder = (folderPath) => {
        if (browseTarget === 'library') {
            setPath(folderPath);
        }
        else if (browseTarget === 'download') {
            setDownloadLocation(folderPath);
        }
        else if (browseTarget === 'breakLibrary') {
            setBreakFolderPath(folderPath);
        }
        else if (browseTarget === 'breakPlaylists') {
            setBreakPlaylistsFolder(folderPath);
        }
        setShowBrowser(false);
    };
    const navigateUp = () => {
        const parentPath = currentBrowsePath.split("/").slice(0, -1).join("/") || "/";
        browseFolders(parentPath);
    };
    // yt-dlp functions
    async function fetchYtdlpVersion() {
        if (!auth.sessionToken || !auth.isLoggedIn)
            return;
        try {
            const result = await api("/api/admin/ytdlp/version", { headers: sessionHeaders });
            setYtdlpVersion(result.version);
        }
        catch (err) {
            console.error("Failed to fetch yt-dlp version:", err);
        }
    }
    async function updateYtdlp() {
        if (!auth.sessionToken || !auth.isLoggedIn)
            return alert("Please login first");
        setYtdlpUpdating(true);
        setBanner("Updating yt-dlp...");
        try {
            const result = await api("/api/admin/ytdlp/update", {
                method: "POST",
                headers: sessionHeaders,
            });
            if (result.success) {
                setBanner(`✔ ${result.message}${result.version ? ` (v${result.version})` : ""}`);
                setYtdlpVersion(result.version || null);
            }
            else {
                setBanner(`⚠️ ${result.message}`);
            }
            setTimeout(() => setBanner(""), 5000);
        }
        catch (err) {
            setBanner(`⚠️ Failed to update yt-dlp: ${err.message}`);
            setTimeout(() => setBanner(""), 5000);
        }
        finally {
            setYtdlpUpdating(false);
        }
    }
    // Settings functions
    async function loadSettings() {
        if (!auth.sessionToken || !auth.isLoggedIn)
            return;
        try {
            const settings = await api("/api/admin/settings", { headers: sessionHeaders });
            setDownloadLocation(settings["ytdlp.download_location"] || "/media/downloads");
            setBackgroundTasksEnabled(parseBooleanSetting(settings["admin.background_tasks_enabled"]));
            setBackgroundMediaScanEnabled(parseBooleanSetting(settings["admin.background_media_scan_enabled"] ?? false));
            setBackgroundDownloadScanEnabled(parseBooleanSetting(settings["admin.background_download_scan_enabled"] ?? false));
            setBackgroundBreakMusicScanEnabled(parseBooleanSetting(settings["admin.background_break_music_scan_enabled"] ?? false));
            setRequestAcceptance(settings["requests.acceptance"] || "local");
            setLocalLibraryEnabled(parseBooleanSetting(settings["libraries.local_enabled"]));
            setExternalLibraryEnabled(parseBooleanSetting(settings["libraries.external_enabled"]));
            setLocalBrowseEnabled(parseBooleanSetting(settings["requests.local_browse_enabled"]));
            setAllowDownloads(parseBooleanSetting(settings["ytdlp.allow_downloads"]));
            setBreakPlaylistsFolder(settings["break_music.playlists_folder"] || "/media/playlists");
            if (settings["admin.log_level"])
                setLogLevel(settings["admin.log_level"]);
        }
        catch (err) {
            console.error("Failed to load settings:", err);
        }
    }
    async function saveSetting(key, value) {
        if (!auth.sessionToken || !auth.isLoggedIn)
            return;
        try {
            await api(`/api/admin/settings/${key}`, {
                method: "PUT",
                headers: sessionHeaders,
                body: JSON.stringify({ value }),
            });
        }
        catch (err) {
            console.error(`Failed to save setting ${key}:`, err);
            throw err;
        }
    }
    async function handleDownloadLocationChange() {
        try {
            await saveSetting("ytdlp.download_location", downloadLocation);
            setBanner("✔ Download location updated");
            setTimeout(() => setBanner(""), 3000);
        }
        catch (err) {
            setBanner(`⚠️ Failed to update download location: ${err.message}`);
            setTimeout(() => setBanner(""), 5000);
        }
    }
    async function handleBreakPlaylistsFolderChange() {
        try {
            await saveSetting("break_music.playlists_folder", breakPlaylistsFolder);
            setBanner("✔ Break music playlists folder updated");
            setTimeout(() => setBanner(""), 3000);
        }
        catch (err) {
            setBanner(`⚠️ Failed to update break music playlists folder: ${err.message}`);
            setTimeout(() => setBanner(""), 5000);
        }
    }
    async function handleBackgroundTasksToggle(enabled) {
        setBackgroundTasksEnabled(enabled);
        try {
            await saveSetting("admin.background_tasks_enabled", enabled);
            setBanner(`✔ Background tasks ${enabled ? "enabled" : "disabled"}`);
            setTimeout(() => setBanner(""), 3000);
        }
        catch (err) {
            setBanner(`⚠️ Failed to update background tasks: ${err.message}`);
            setTimeout(() => setBanner(""), 5000);
            setBackgroundTasksEnabled(!enabled); // Revert on error
        }
    }
    async function handleSpecificBackgroundTaskToggle(key, enabled, setState, label) {
        setState(enabled);
        try {
            await saveSetting(key, enabled);
            setBanner(`✔ ${label} ${enabled ? "enabled" : "disabled"}`);
            setTimeout(() => setBanner(""), 3000);
        }
        catch (err) {
            setBanner(`⚠️ Failed to update ${label.toLowerCase()}: ${err.message}`);
            setTimeout(() => setBanner(""), 5000);
            setState(!enabled);
        }
    }
    async function handleRequestAcceptanceChange(value) {
        setRequestAcceptance(value);
        try {
            await saveSetting("requests.acceptance", value);
            setBanner(`✔ Request acceptance set to ${value}`);
            setTimeout(() => setBanner(""), 3000);
        }
        catch (err) {
            setBanner(`⚠️ Failed to update request acceptance: ${err.message}`);
            setTimeout(() => setBanner(""), 5000);
        }
    }
    async function handleLibraryToggle(type, enabled) {
        if (type === "local") {
            setLocalLibraryEnabled(enabled);
            try {
                await saveSetting("libraries.local_enabled", enabled);
                setBanner(`✔ Local library ${enabled ? "enabled" : "disabled"}`);
                setTimeout(() => setBanner(""), 3000);
            }
            catch (err) {
                setBanner(`⚠️ Failed to update local library: ${err.message}`);
                setTimeout(() => setBanner(""), 5000);
                setLocalLibraryEnabled(!enabled);
            }
        }
        else {
            setExternalLibraryEnabled(enabled);
            try {
                await saveSetting("libraries.external_enabled", enabled);
                setBanner(`✔ External library ${enabled ? "enabled" : "disabled"}`);
                setTimeout(() => setBanner(""), 3000);
            }
            catch (err) {
                setBanner(`⚠️ Failed to update external library: ${err.message}`);
                setTimeout(() => setBanner(""), 5000);
                setExternalLibraryEnabled(!enabled);
            }
        }
    }
    async function handleLocalBrowseToggle(enabled) {
        setLocalBrowseEnabled(enabled);
        try {
            await saveSetting("requests.local_browse_enabled", enabled);
            setBanner(`✔ Request-page browse ${enabled ? "enabled" : "disabled"}`);
            setTimeout(() => setBanner(""), 3000);
        }
        catch (err) {
            setBanner(`⚠️ Failed to update request-page browse: ${err.message}`);
            setTimeout(() => setBanner(""), 5000);
            setLocalBrowseEnabled(!enabled);
        }
    }
    async function handleAllowDownloadsToggle(enabled) {
        setAllowDownloads(enabled);
        try {
            await saveSetting("ytdlp.allow_downloads", enabled);
            setBanner(`✔ Downloads ${enabled ? "enabled" : "disabled"}`);
            setTimeout(() => setBanner(""), 3000);
        }
        catch (err) {
            setBanner(`⚠️ Failed to update downloads setting: ${err.message}`);
            setTimeout(() => setBanner(""), 5000);
            setAllowDownloads(!enabled);
        }
    }
    async function handleLogLevelChange(level) {
        setLogLevel(level);
        try {
            await saveSetting("admin.log_level", level);
            setBanner(`✔ Log level set to ${level}`);
            setTimeout(() => setBanner(""), 3000);
        }
        catch (err) {
            setBanner(`⚠️ Failed to update log level: ${err.message}`);
            setTimeout(() => setBanner(""), 5000);
        }
    }
    const openDownloadBrowser = () => {
        setBrowseTarget('download');
        setShowDownloadBrowser(true);
        setCurrentBrowsePath(downloadLocation || "/media/downloads");
        browseFolders(downloadLocation || "/media/downloads");
    };
    const selectDownloadFolder = (folderPath) => {
        setDownloadLocation(folderPath);
        setShowDownloadBrowser(false);
    };
    const openBreakLibraryBrowser = () => {
        setBrowseTarget('breakLibrary');
        setShowBrowser(true);
        setCurrentBrowsePath(breakFolderPath || "/media");
        browseFolders(breakFolderPath || "/media");
    };
    const openBreakPlaylistsBrowser = () => {
        setBrowseTarget('breakPlaylists');
        setShowBrowser(true);
        setCurrentBrowsePath(breakPlaylistsFolder || "/media/playlists");
        browseFolders(breakPlaylistsFolder || "/media/playlists");
    };
    async function scanDownloadLocation() {
        if (!auth.sessionToken || !auth.isLoggedIn)
            return alert("Please login first");
        setBusy(true);
        setBanner("Scanning download location...");
        try {
            const result = await api("/api/admin/ytdlp/scan", {
                method: "POST",
                headers: sessionHeaders,
            });
            if (result.success) {
                setBanner(`✔ ${result.message}`);
                await refreshStats();
            }
            else {
                setBanner(`⚠️ ${result.message}`);
            }
            setTimeout(() => setBanner(""), 5000);
        }
        catch (err) {
            setBanner(`⚠️ Failed to scan download location: ${err.message}`);
            setTimeout(() => setBanner(""), 5000);
        }
        finally {
            setBusy(false);
        }
    }
    // ========== User Manager Functions ==========
    async function refreshUsers() {
        if (!auth.sessionToken || !auth.isLoggedIn || !auth.isAdmin)
            return;
        try {
            const data = await api("/api/admin/users", { headers: sessionHeaders });
            setUsers(data);
        }
        catch (err) {
            console.error("Failed to load users:", err);
        }
    }
    async function handleCreateUser(e) {
        e.preventDefault();
        setUserError("");
        if (newUserUsername.trim().length < 3) {
            setUserError("Username must be at least 3 characters");
            return;
        }
        if (newUserPassword.length < 8) {
            setUserError("Password must be at least 8 characters");
            return;
        }
        try {
            await api("/api/admin/users", {
                method: "POST",
                headers: sessionHeaders,
                body: JSON.stringify({ username: newUserUsername.trim(), password: newUserPassword, role: newUserRole }),
            });
            setShowCreateUser(false);
            setNewUserUsername("");
            setNewUserPassword("");
            setNewUserRole("user");
            await refreshUsers();
        }
        catch (err) {
            setUserError(err?.message || "Failed to create user");
        }
    }
    async function handleUpdateUser(e) {
        e.preventDefault();
        if (!editingUser)
            return;
        setEditUserError("");
        if (editUserPassword && editUserPassword.length < 8) {
            setEditUserError("Password must be at least 8 characters");
            return;
        }
        try {
            const body = { role: editUserRole, is_active: editUserActive };
            if (editUserPassword)
                body.password = editUserPassword;
            await api(`/api/admin/users/${editingUser.id}`, {
                method: "PUT",
                headers: sessionHeaders,
                body: JSON.stringify(body),
            });
            setEditingUser(null);
            setEditUserPassword("");
            await refreshUsers();
        }
        catch (err) {
            setEditUserError(err?.message || "Failed to update user");
        }
    }
    async function handleDeleteUser(user) {
        const label = getUserDisplayName(user);
        if (!confirm(`Delete user "${label}"? This cannot be undone.`))
            return;
        try {
            await api(`/api/admin/users/${user.id}`, { method: "DELETE", headers: sessionHeaders });
            await refreshUsers();
        }
        catch (err) {
            setBanner(`⚠️ ${err?.message || "Failed to delete user"}`);
            setTimeout(() => setBanner(""), 5000);
        }
    }
    // ========== OIDC Settings Functions ==========
    async function loadOidcSettings() {
        if (!auth.sessionToken || !auth.isLoggedIn || !auth.isAdmin)
            return;
        try {
            const data = await api("/api/admin/settings/oidc", { headers: sessionHeaders });
            // clientSecret comes as '***' (masked), track it separately
            setOidcSettings({ ...data, clientSecret: '' });
            setOidcClientSecretChanged(false);
        }
        catch (err) {
            console.error("Failed to load OIDC settings:", err);
        }
    }
    async function saveOidcSettings(e) {
        e.preventDefault();
        setOidcSaving(true);
        setOidcBanner("");
        try {
            // Only send clientSecret if the admin explicitly changed it
            const payload = { ...oidcSettings };
            if (!oidcClientSecretChanged) {
                delete payload.clientSecret;
            }
            await api("/api/admin/settings/oidc", {
                method: "PUT",
                headers: sessionHeaders,
                body: JSON.stringify(payload),
            });
            setOidcBanner("✔ OIDC settings saved");
            setOidcClientSecretChanged(false);
            // Refresh public config so the login button updates
            const cfg = await api("/api/auth/oidc/config");
            setOidcConfig(cfg);
            setTimeout(() => setOidcBanner(""), 3000);
        }
        catch (err) {
            setOidcBanner(`⚠️ ${err?.message || "Failed to save OIDC settings"}`);
            setTimeout(() => setOidcBanner(""), 5000);
        }
        finally {
            setOidcSaving(false);
        }
    }
    // Load yt-dlp version and settings on login
    useEffect(() => {
        if (auth.isLoggedIn && auth.isAdmin) {
            fetchYtdlpVersion();
            loadSettings();
            refreshUsers();
            loadOidcSettings();
            refreshBreakFolders();
        }
    }, [auth.isLoggedIn, auth.isAdmin]);
    return (_jsxs("div", { className: "admin-page", children: [_jsx("style", { children: `
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

        /* Icon-only button — compact square with a descriptive title tooltip */
        .btn-icon {
          padding: 8px;
          min-width: 36px;
          min-height: 36px;
          font-size: 18px;
          line-height: 1;
          background: var(--color-bg-secondary);
          border: 2px solid var(--color-border);
          border-radius: 10px;
          color: var(--color-text-primary);
          cursor: pointer;
          transition: all 0.3s ease;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }

        .btn-icon:hover:not(:disabled) {
          background: var(--color-bg-hover);
          border-color: var(--color-accent);
          transform: translateY(-2px);
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.3);
        }

        .btn-icon:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-icon.danger {
          background: linear-gradient(135deg, rgba(239,68,68,0.15), rgba(220,38,38,0.15));
          border-color: rgba(239,68,68,0.4);
        }

        .btn-icon.danger:hover:not(:disabled) {
          background: linear-gradient(135deg, #ef4444, #dc2626);
          border-color: #ef4444;
          color: white;
        }

        .btn-icon.primary {
          background: linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.15));
          border-color: rgba(99,102,241,0.4);
        }

        .btn-icon.primary:hover:not(:disabled) {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          border-color: #6366f1;
          color: white;
        }

        .btn-icon.success {
          background: linear-gradient(135deg, rgba(16,185,129,0.15), rgba(5,150,105,0.15));
          border-color: rgba(16,185,129,0.4);
        }

        .btn-icon.success:hover:not(:disabled) {
          background: linear-gradient(135deg, #10b981, #059669);
          border-color: #10b981;
          color: white;
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

        /* Collapsible Card Header */
        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          user-select: none;
          margin-bottom: 20px;
        }

        .card-header h2 {
          margin: 0;
          font-size: 20px;
        }

        .card-toggle {
          background: var(--color-bg-secondary);
          border: 1px solid var(--color-border);
          border-radius: 8px;
          padding: 6px 12px;
          color: var(--color-text-secondary);
          font-size: 14px;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .card-toggle:hover {
          background: var(--color-bg-hover);
          border-color: var(--color-accent);
          color: var(--color-text-primary);
        }

        .card-content {
          overflow: hidden;
          transition: max-height 0.3s ease, opacity 0.3s ease;
        }

        .card-content.collapsed {
          max-height: 0;
          opacity: 0;
          pointer-events: none;
        }

        .card-content.expanded {
          max-height: none;
          opacity: 1;
        }

        .disabled-overlay {
          position: relative;
          opacity: 0.4;
          pointer-events: none;
        }

        .disabled-overlay::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: var(--color-bg-card);
          opacity: 0.7;
          pointer-events: none;
        }

        /* User info layout — allow date to wrap on small screens */
        .user-meta {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 4px 8px;
          font-size: 13px;
          color: var(--color-text-secondary);
          font-family: 'Monaco', 'Courier New', monospace;
        }

        .user-meta-date {
          /* Allow the date string to break onto its own line */
          white-space: nowrap;
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
            justify-content: flex-start;
          }

          /* On mobile keep btn-icon buttons small — do NOT stretch them */
          .btn-icon {
            flex: 0 0 auto;
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
      ` }), _jsxs("div", { className: "container", children: [banner && (_jsx("div", { className: `banner ${auth.isDefaultPassword ? 'warning' : banner.includes('✔') ? 'success' : ''}`, children: banner })), _jsxs("div", { className: "header", children: [_jsx("h1", { className: "header-title", children: "Admin Dashboard" }), _jsx("p", { className: "header-subtitle", children: "Manage your karaoke system settings and media libraries" })] }), !auth.isLoggedIn ? (_jsxs("div", { className: "card login-card", children: [_jsx("div", { className: "login-header", children: _jsx("h2", { className: "login-title", children: "\uD83D\uDD10 Admin Login" }) }), oidcConfig?.passwordLoginEnabled !== false && (_jsxs("form", { onSubmit: handleLogin, children: [_jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "Username" }), _jsx("input", { className: "form-input", type: "text", value: loginUsername, onChange: (e) => setLoginUsername(e.target.value), autoComplete: "username", required: true })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "Password" }), _jsx("input", { className: "form-input", type: "password", value: loginPassword, onChange: (e) => setLoginPassword(e.target.value), placeholder: "Enter admin password", autoComplete: "current-password", required: true })] }), loginError && (_jsx("div", { className: "error-msg", children: loginError })), _jsx("button", { className: "btn primary", type: "submit", disabled: busy, style: { width: "100%" }, children: busy ? _jsxs(_Fragment, { children: [_jsx("span", { className: "loading-spinner" }), " Logging in..."] }) : 'Login' })] })), oidcConfig?.passwordLoginEnabled === false && !oidcConfig?.enabled && (_jsx("div", { className: "error-msg", style: { marginBottom: 16 }, children: "Username/password login is disabled and SSO is not enabled." })), loginError && oidcConfig?.passwordLoginEnabled === false && (_jsx("div", { className: "error-msg", style: { marginBottom: 16 }, children: loginError })), oidcConfig?.enabled && (_jsxs(_Fragment, { children: [oidcConfig?.passwordLoginEnabled !== false && (_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }, children: [_jsx("div", { style: { flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' } }), _jsx("span", { style: { color: 'var(--color-text-secondary)', fontSize: 13 }, children: "or" }), _jsx("div", { style: { flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' } })] })), _jsx("a", { href: `${API_BASE}/api/auth/oidc/login?returnTo=%2Fadmin`, className: "btn", style: {
                                            width: '100%',
                                            display: 'flex',
                                            justifyContent: 'center',
                                            background: oidcConfig.buttonColor,
                                            border: 'none',
                                            color: 'white',
                                            textDecoration: 'none',
                                            boxSizing: 'border-box',
                                        }, children: oidcConfig.buttonText })] }))] })) : !auth.isAdmin ? (_jsxs("div", { className: "card", style: { maxWidth: 480, margin: '80px auto', textAlign: 'center' }, children: [_jsx("div", { style: { fontSize: 64, marginBottom: 16 }, children: "\uD83D\uDEAB" }), _jsx("h2", { style: { margin: '0 0 12px', fontSize: 22 }, children: "Access Denied" }), _jsx("p", { style: { color: 'var(--color-text-secondary)', marginBottom: 24 }, children: "Your account does not have administrator privileges." }), _jsxs("button", { className: "btn danger", onClick: auth.handleLogout, children: [_jsx("span", { children: "\uD83D\uDEAA" }), " Logout"] })] })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "card", children: [_jsx("h2", { style: { margin: "0 0 20px", fontSize: 20 }, children: "\uD83D\uDCCA System Statistics" }), _jsxs("div", { className: "stats-grid", children: [_jsxs("div", { className: "stat-pill", children: [_jsx("span", { className: "stat-icon", children: "\uD83C\uDFA4" }), _jsx("span", { className: "stat-value", children: stats?.artists ?? "—" }), _jsx("span", { className: "stat-label", children: "Artists" })] }), _jsxs("div", { className: "stat-pill", children: [_jsx("span", { className: "stat-icon", children: "\uD83C\uDFB5" }), _jsx("span", { className: "stat-value", children: stats?.tracks ?? "—" }), _jsx("span", { className: "stat-label", children: "Tracks" })] }), _jsxs("div", { className: "stat-pill", children: [_jsx("span", { className: "stat-icon", children: "\uD83D\uDCCB" }), _jsx("span", { className: "stat-value", children: stats?.queued ?? "—" }), _jsx("span", { className: "stat-label", children: "Queued" })] }), _jsxs("div", { className: "stat-pill", children: [_jsx("span", { className: "stat-icon", children: "\u23F0" }), _jsx("span", { className: "stat-value", style: { fontSize: 14 }, children: stats?.lastScan?.finishedAt
                                                            ? new Date(stats.lastScan.finishedAt).toLocaleDateString()
                                                            : "Never" }), _jsx("span", { className: "stat-label", children: "Last Scan" })] })] }), _jsxs("div", { style: { display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 20 }, children: [_jsx("button", { className: "btn-icon primary", onClick: scanAll, disabled: busy || !auth.sessionToken || !auth.isLoggedIn, title: "Scan all libraries", "aria-label": "Scan all libraries", children: "\uD83D\uDD0D" }), _jsx("button", { className: "btn-icon danger", onClick: clearDb, disabled: busy || !auth.sessionToken || !auth.isLoggedIn, title: "Clear database", "aria-label": "Clear database", children: "\uD83D\uDDD1\uFE0F" }), _jsx("button", { className: "btn-icon", onClick: refreshStats, disabled: !auth.sessionToken || !auth.isLoggedIn, title: "Refresh stats", "aria-label": "Refresh stats", children: "\uD83D\uDD04" })] })] }), _jsxs("div", { className: "card", children: [_jsxs("div", { className: "card-header", onClick: () => setMediaLibrariesExpanded(!mediaLibrariesExpanded), children: [_jsx("h2", { children: "\uD83D\uDCDA Media Libraries" }), _jsx("button", { className: "card-toggle", type: "button", children: mediaLibrariesExpanded ? '▼ Collapse' : '▶ Expand' })] }), _jsxs("div", { className: `card-content ${mediaLibrariesExpanded ? 'expanded' : 'collapsed'}`, children: [_jsxs("div", { style: {
                                                    background: "var(--color-bg-secondary)",
                                                    border: "1px solid var(--color-border)",
                                                    borderRadius: 12,
                                                    padding: 16,
                                                    marginBottom: 20
                                                }, children: [_jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "Library Name" }), _jsx("input", { className: "form-input", placeholder: "e.g., Main Collection", value: name, onChange: (e) => setName(e.target.value) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "Folder Path" }), _jsxs("div", { style: { display: "flex", gap: 8 }, children: [_jsx("input", { className: "form-input", placeholder: "e.g., /media/karaoke", value: path, onChange: (e) => setPath(e.target.value) }), _jsx("button", { className: "btn-icon", onClick: openBrowser, disabled: !auth.sessionToken || !auth.isLoggedIn, title: "Browse folders", "aria-label": "Browse folders", children: "\uD83D\uDCC1" })] })] }), _jsx("button", { className: "btn-icon success", onClick: addLibrary, disabled: busy ||
                                                            !auth.sessionToken ||
                                                            !auth.isLoggedIn ||
                                                            !name.trim() ||
                                                            !path.trim(), title: "Add library", "aria-label": "Add library", children: "\u2795" })] }), libs.length > 0 ? (_jsx("div", { className: "library-list", children: libs.map((l, index) => (_jsx("div", { className: "library-item", style: { animationDelay: `${index * 0.05}s` }, children: _jsxs("div", { className: "library-header", children: [_jsxs("div", { className: "library-info", children: [_jsx("div", { className: "library-name", children: l.name }), _jsxs("div", { className: "library-path", children: ["\uD83D\uDCC1 ", l.path] })] }), _jsxs("div", { className: "library-actions", children: [_jsx("button", { className: "btn-icon primary", onClick: () => scanOne(l.id), disabled: busy || !auth.sessionToken || !auth.isLoggedIn, title: "Scan this library", children: "\uD83D\uDD0D" }), _jsx("button", { className: "btn-icon danger", onClick: () => deleteLibrary(l.id), disabled: busy || !auth.sessionToken || !auth.isLoggedIn, title: "Remove library", children: "\uD83D\uDDD1\uFE0F" })] })] }) }, l.id))) })) : (_jsxs("div", { className: "empty-state", children: [_jsx("div", { className: "empty-icon", children: "\uD83D\uDCC1" }), _jsx("div", { className: "empty-text", children: "No libraries configured yet" }), _jsx("div", { className: "empty-subtext", children: "Add a media library above to get started" })] }))] })] }), _jsxs("div", { className: "card", children: [_jsxs("div", { className: "card-header", onClick: () => setBreakMusicExpanded(!breakMusicExpanded), children: [_jsx("h2", { children: "\uD83C\uDFBC Break Music" }), _jsx("button", { className: "card-toggle", type: "button", children: breakMusicExpanded ? '▼ Collapse' : '▶ Expand' })] }), _jsxs("div", { className: `card-content ${breakMusicExpanded ? 'expanded' : 'collapsed'}`, children: [_jsxs("div", { style: {
                                                    background: "var(--color-bg-secondary)",
                                                    border: "1px solid var(--color-border)",
                                                    borderRadius: 12,
                                                    padding: 16,
                                                    marginBottom: 20
                                                }, children: [_jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "Break Folder Name" }), _jsx("input", { className: "form-input", placeholder: "e.g., Lobby Music", value: breakFolderName, onChange: (e) => setBreakFolderName(e.target.value) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "Break Music Folder Path" }), _jsxs("div", { style: { display: "flex", gap: 8 }, children: [_jsx("input", { className: "form-input", placeholder: "e.g., /media/break-music", value: breakFolderPath, onChange: (e) => setBreakFolderPath(e.target.value) }), _jsx("button", { className: "btn-icon", onClick: openBreakLibraryBrowser, disabled: !auth.sessionToken || !auth.isLoggedIn, title: "Browse folders", "aria-label": "Browse break music folders", children: "\uD83D\uDCC1" })] })] }), _jsxs("div", { style: { display: 'flex', gap: 10, flexWrap: 'wrap' }, children: [_jsx("button", { className: "btn-icon success", onClick: addBreakFolder, disabled: busy || !breakFolderName.trim() || !breakFolderPath.trim(), title: "Add break music folder", children: "\u2795" }), _jsx("button", { className: "btn-icon primary", onClick: () => scanBreakMusic(), disabled: busy, title: "Scan all break music folders", children: "\uD83D\uDD0D" }), _jsx("button", { className: "btn-icon danger", onClick: clearBreakMusicDb, disabled: busy, title: "Clear break music tracks from database", children: "\uD83E\uDDF9" })] })] }), _jsxs("div", { style: {
                                                    background: "var(--color-bg-secondary)",
                                                    border: "1px solid var(--color-border)",
                                                    borderRadius: 12,
                                                    padding: 16,
                                                    marginBottom: 16
                                                }, children: [_jsx("h3", { style: { margin: "0 0 12px", fontSize: 16 }, children: "\uD83D\uDCBE Saved Playlists Folder" }), _jsxs("div", { style: { display: "flex", gap: 8 }, children: [_jsx("input", { className: "form-input", value: breakPlaylistsFolder, onChange: (e) => setBreakPlaylistsFolder(e.target.value), placeholder: "/media/playlists" }), _jsx("button", { className: "btn-icon", onClick: openBreakPlaylistsBrowser, disabled: !auth.sessionToken || !auth.isLoggedIn, title: "Browse playlist folders", children: "\uD83D\uDCC1" }), _jsx("button", { className: "btn-icon primary", onClick: handleBreakPlaylistsFolderChange, disabled: busy || !breakPlaylistsFolder.trim(), title: "Save playlists folder", children: "\uD83D\uDCBE" })] })] }), breakFolders.length > 0 ? (_jsx("div", { className: "library-list", children: breakFolders.map((f) => (_jsx("div", { className: "library-item", children: _jsxs("div", { className: "library-header", children: [_jsxs("div", { className: "library-info", children: [_jsx("div", { className: "library-name", children: f.name }), _jsxs("div", { className: "library-path", children: ["\uD83D\uDCC1 ", f.path] })] }), _jsxs("div", { className: "library-actions", children: [_jsx("button", { className: "btn-icon primary", onClick: () => scanBreakMusic(f.id), disabled: busy, title: "Scan this folder", children: "\uD83D\uDD0D" }), _jsx("button", { className: "btn-icon danger", onClick: () => deleteBreakFolder(f.id), disabled: busy, title: "Remove folder", children: "\uD83D\uDDD1\uFE0F" })] })] }) }, f.id))) })) : (_jsxs("div", { className: "empty-state", children: [_jsx("div", { className: "empty-icon", children: "\uD83C\uDFBC" }), _jsx("div", { className: "empty-text", children: "No break music folders configured" })] }))] })] }), _jsxs("div", { className: "card", children: [_jsxs("div", { className: "card-header", onClick: () => setSystemSettingsExpanded(!systemSettingsExpanded), children: [_jsx("h2", { children: "\u2699\uFE0F System Settings" }), _jsx("button", { className: "card-toggle", type: "button", children: systemSettingsExpanded ? '▼ Collapse' : '▶ Expand' })] }), _jsxs("div", { className: `card-content ${systemSettingsExpanded ? 'expanded' : 'collapsed'}`, children: [_jsxs("div", { style: {
                                                    background: "var(--color-bg-secondary)",
                                                    border: "1px solid var(--color-border)",
                                                    borderRadius: 12,
                                                    padding: 16,
                                                    marginBottom: 16
                                                }, children: [_jsx("h3", { style: { margin: "0 0 12px", fontSize: 16 }, children: "\uD83D\uDCDA Library Availability & Requests" }), _jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 12 }, children: [_jsxs("label", { style: { display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }, children: [_jsx("input", { type: "checkbox", checked: !localLibraryEnabled && !externalLibraryEnabled, onChange: (e) => {
                                                                            const disabled = e.target.checked;
                                                                            if (disabled) {
                                                                                handleLibraryToggle("local", false);
                                                                                handleLibraryToggle("external", false);
                                                                            }
                                                                            else {
                                                                                // When unchecking disabled, enable local library by default
                                                                                handleLibraryToggle("local", true);
                                                                            }
                                                                        }, disabled: !auth.sessionToken || !auth.isLoggedIn, style: { width: 18, height: 18 } }), _jsx("span", { style: { fontSize: 14 }, children: "Disabled (no guest requests)" })] }), _jsxs("label", { style: { display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }, children: [_jsx("input", { type: "checkbox", checked: localLibraryEnabled, onChange: (e) => handleLibraryToggle("local", e.target.checked), disabled: !auth.sessionToken || !auth.isLoggedIn, style: { width: 18, height: 18 } }), _jsx("span", { style: { fontSize: 14 }, children: "Enable Local Library" })] }), _jsxs("label", { style: { display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }, children: [_jsx("input", { type: "checkbox", checked: externalLibraryEnabled, onChange: (e) => handleLibraryToggle("external", e.target.checked), disabled: !auth.sessionToken || !auth.isLoggedIn, style: { width: 18, height: 18 } }), _jsx("span", { style: { fontSize: 14 }, children: "Enable External Library (Karaoke Nerds)" })] }), _jsxs("label", { style: { display: "flex", alignItems: "center", gap: 8, cursor: localLibraryEnabled ? "pointer" : "not-allowed", opacity: localLibraryEnabled ? 1 : 0.6 }, children: [_jsx("input", { type: "checkbox", checked: localBrowseEnabled, onChange: (e) => handleLocalBrowseToggle(e.target.checked), disabled: !auth.sessionToken || !auth.isLoggedIn || !localLibraryEnabled, style: { width: 18, height: 18 } }), _jsx("span", { style: { fontSize: 14 }, children: "Show Local Library Browse on Request Page" })] })] }), _jsx("p", { style: { margin: "8px 0 0", fontSize: 13, color: "var(--color-text-muted)" }, children: "Control which libraries are available for searching and requesting. When both are disabled, guests cannot request songs. Host can always add songs manually." })] }), _jsxs("div", { style: {
                                                    background: "var(--color-bg-secondary)",
                                                    border: "1px solid var(--color-border)",
                                                    borderRadius: 12,
                                                    padding: 16,
                                                    marginBottom: 16
                                                }, children: [_jsx("h3", { style: { margin: "0 0 12px", fontSize: 16 }, children: "\uD83D\uDCE5 yt-dlp Integration" }), _jsxs("div", { style: { marginBottom: 16 }, children: [_jsxs("label", { style: { display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }, children: [_jsx("input", { type: "checkbox", checked: allowDownloads, onChange: (e) => handleAllowDownloadsToggle(e.target.checked), disabled: !auth.sessionToken || !auth.isLoggedIn, style: { width: 18, height: 18 } }), _jsx("span", { style: { fontSize: 14, fontWeight: 500 }, children: "Allow Downloads" })] }), _jsx("p", { style: { margin: "4px 0 0 26px", fontSize: 13, color: "var(--color-text-muted)" }, children: "Enable downloading of external content using yt-dlp" })] }), _jsxs("div", { className: !allowDownloads ? 'disabled-overlay' : '', children: [_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }, children: [_jsxs("span", { style: { color: "var(--color-text-secondary)", fontSize: 14 }, children: ["Version: ", ytdlpVersion || "Checking..."] }), _jsx("button", { className: "btn-icon primary", onClick: updateYtdlp, disabled: ytdlpUpdating || !auth.sessionToken || !auth.isLoggedIn || !allowDownloads, title: ytdlpUpdating ? "Updating yt-dlp" : "Update yt-dlp", "aria-label": ytdlpUpdating ? "Updating yt-dlp" : "Update yt-dlp", "aria-busy": ytdlpUpdating, children: ytdlpUpdating ? (_jsx(_Fragment, { children: _jsx("span", { className: "loading-spinner" }) })) : (_jsx(_Fragment, { children: "\uD83D\uDD04" })) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "Download Location" }), _jsxs("div", { style: { display: "flex", gap: 8 }, children: [_jsx("input", { className: "form-input", placeholder: "/media/downloads", value: downloadLocation, onChange: (e) => setDownloadLocation(e.target.value), disabled: !auth.sessionToken || !auth.isLoggedIn || !allowDownloads }), _jsx("button", { className: "btn-icon", onClick: openDownloadBrowser, disabled: !auth.sessionToken || !auth.isLoggedIn || !allowDownloads, title: "Browse folders", "aria-label": "Browse download folders", children: "\uD83D\uDCC1" }), _jsx("button", { className: "btn-icon primary", onClick: scanDownloadLocation, disabled: !auth.sessionToken || !auth.isLoggedIn || !allowDownloads, title: "Scan download location for new files and remove missing ones", "aria-label": "Scan download location", children: "\uD83D\uDD0D" }), _jsx("button", { className: "btn-icon success", onClick: handleDownloadLocationChange, disabled: !auth.sessionToken || !auth.isLoggedIn || !allowDownloads, title: "Save download location", "aria-label": "Save download location", children: "\u2713" })] })] })] })] }), _jsxs("div", { style: {
                                                    background: "var(--color-bg-secondary)",
                                                    border: "1px solid var(--color-border)",
                                                    borderRadius: 12,
                                                    padding: 16,
                                                    marginBottom: 16
                                                }, children: [_jsx("h3", { style: { margin: "0 0 12px", fontSize: 16 }, children: "\uD83D\uDD04 Background Tasks" }), _jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 12 }, children: [_jsxs("label", { style: { display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }, children: [_jsx("input", { type: "checkbox", checked: backgroundTasksEnabled, onChange: (e) => handleBackgroundTasksToggle(e.target.checked), disabled: !auth.sessionToken || !auth.isLoggedIn, style: { width: 18, height: 18 } }), _jsx("span", { style: { fontSize: 14 }, children: "Enable duration processing task" })] }), _jsxs("label", { style: { display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }, children: [_jsx("input", { type: "checkbox", checked: backgroundMediaScanEnabled, onChange: (e) => handleSpecificBackgroundTaskToggle("admin.background_media_scan_enabled", e.target.checked, setBackgroundMediaScanEnabled, "Background media library scan"), disabled: !auth.sessionToken || !auth.isLoggedIn, style: { width: 18, height: 18 } }), _jsx("span", { style: { fontSize: 14 }, children: "Enable periodic media library scan" })] }), _jsxs("label", { style: { display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }, children: [_jsx("input", { type: "checkbox", checked: backgroundDownloadScanEnabled, onChange: (e) => handleSpecificBackgroundTaskToggle("admin.background_download_scan_enabled", e.target.checked, setBackgroundDownloadScanEnabled, "Background download folder scan"), disabled: !auth.sessionToken || !auth.isLoggedIn, style: { width: 18, height: 18 } }), _jsx("span", { style: { fontSize: 14 }, children: "Enable periodic download folder scan" })] }), _jsxs("label", { style: { display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }, children: [_jsx("input", { type: "checkbox", checked: backgroundBreakMusicScanEnabled, onChange: (e) => handleSpecificBackgroundTaskToggle("admin.background_break_music_scan_enabled", e.target.checked, setBackgroundBreakMusicScanEnabled, "Background break music scan"), disabled: !auth.sessionToken || !auth.isLoggedIn, style: { width: 18, height: 18 } }), _jsx("span", { style: { fontSize: 14 }, children: "Enable periodic break music scan" })] })] }), _jsx("p", { style: { margin: "8px 0 0", fontSize: 13, color: "var(--color-text-muted)" }, children: "Each task runs independently in the background. Duration processing fills in missing track lengths, while the scan tasks periodically look for new or removed files in the configured media, download, and break music folders." })] }), _jsxs("div", { style: {
                                                    background: "var(--color-bg-secondary)",
                                                    border: "1px solid var(--color-border)",
                                                    borderRadius: 12,
                                                    padding: 16
                                                }, children: [_jsx("h3", { style: { margin: "0 0 12px", fontSize: 16 }, children: "\uD83D\uDCCB Server Logging" }), _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }, children: [_jsx("label", { className: "form-label", style: { margin: 0, whiteSpace: "nowrap" }, children: "Log Level" }), _jsxs("select", { className: "form-input", value: logLevel, onChange: (e) => handleLogLevelChange(e.target.value), disabled: !auth.sessionToken || !auth.isLoggedIn, style: { cursor: "pointer", maxWidth: 200 }, children: [_jsx("option", { value: "error", children: "error" }), _jsx("option", { value: "warning", children: "warning" }), _jsx("option", { value: "info", children: "info" }), _jsx("option", { value: "verbose", children: "verbose" })] })] })] })] })] }), _jsxs("div", { className: "card", children: [_jsxs("div", { className: "card-header", onClick: () => setUsersExpanded(!usersExpanded), children: [_jsx("h2", { children: "\uD83D\uDC65 User Manager" }), _jsx("button", { className: "card-toggle", type: "button", children: usersExpanded ? '▼ Collapse' : '▶ Expand' })] }), _jsxs("div", { className: `card-content ${usersExpanded ? 'expanded' : 'collapsed'}`, children: [_jsx("div", { style: { marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }, children: _jsx("button", { className: "btn-icon primary", title: "Create new user", "aria-label": "Create new user", onClick: () => { setShowCreateUser(true); setUserError(""); }, children: "\u2795" }) }), showCreateUser && (_jsxs("div", { style: { background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 16, marginBottom: 20 }, children: [_jsx("h3", { style: { margin: '0 0 16px', fontSize: 16 }, children: "Create New User" }), _jsxs("form", { onSubmit: handleCreateUser, children: [_jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "Username" }), _jsx("input", { className: "form-input", type: "text", value: newUserUsername, onChange: (e) => setNewUserUsername(e.target.value), required: true, minLength: 3 })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "Password" }), _jsx("input", { className: "form-input", type: "password", value: newUserPassword, onChange: (e) => setNewUserPassword(e.target.value), required: true, minLength: 8, placeholder: "At least 8 characters" })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "Role" }), _jsxs("select", { className: "form-input", value: newUserRole, onChange: (e) => setNewUserRole(e.target.value), style: { cursor: 'pointer' }, children: [_jsx("option", { value: "user", children: "User" }), _jsx("option", { value: "admin", children: "Admin" })] })] }), userError && _jsx("div", { className: "error-msg", children: userError }), _jsxs("div", { style: { display: 'flex', gap: 8 }, children: [_jsx("button", { className: "btn primary", type: "submit", children: "Create" }), _jsx("button", { className: "btn ghost", type: "button", onClick: () => { setShowCreateUser(false); setUserError(""); }, children: "Cancel" })] })] })] })), users.length === 0 ? (_jsxs("div", { className: "empty-state", children: [_jsx("div", { className: "empty-icon", children: "\uD83D\uDC64" }), _jsx("div", { className: "empty-text", children: "No users yet" })] })) : (_jsx("div", { className: "library-list", children: users.map((user) => (_jsx("div", { className: "library-item", children: _jsxs("div", { className: "library-header", children: [_jsxs("div", { className: "library-info", children: [_jsxs("div", { className: "library-name", style: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }, children: [getUserDisplayName(user), _jsx("span", { style: {
                                                                                    fontSize: 11, padding: '2px 8px', borderRadius: 999,
                                                                                    background: user.role === 'admin' ? 'rgba(99,102,241,0.2)' : 'rgba(161,161,170,0.2)',
                                                                                    color: user.role === 'admin' ? '#a5b4fc' : '#a1a1aa',
                                                                                    fontWeight: 600,
                                                                                }, children: user.role }), !user.is_active && _jsx("span", { style: { fontSize: 11, padding: '2px 8px', borderRadius: 999, background: 'rgba(239,68,68,0.2)', color: '#fca5a5', fontWeight: 600 }, children: "inactive" }), user.oidc_subject && _jsx("span", { style: { fontSize: 11, padding: '2px 8px', borderRadius: 999, background: 'rgba(16,185,129,0.2)', color: '#6ee7b7', fontWeight: 600 }, children: "SSO" })] }), _jsxs("div", { className: "user-meta", children: [user.display_name && user.display_name !== user.username && (_jsxs("span", { children: [user.username, " \u2022"] })), _jsxs("span", { className: "user-meta-date", children: ["Created: ", new Date(user.created_at).toLocaleDateString()] })] })] }), _jsxs("div", { className: "library-actions", children: [_jsx("button", { className: "btn-icon", title: "Edit user", onClick: () => {
                                                                            setEditingUser(user);
                                                                            setEditUserRole(user.role);
                                                                            setEditUserActive(user.is_active);
                                                                            setEditUserPassword("");
                                                                            setEditUserError("");
                                                                        }, children: "\u270F\uFE0F" }), _jsx("button", { className: "btn-icon danger", title: "Delete user", onClick: () => handleDeleteUser(user), children: "\uD83D\uDDD1\uFE0F" })] })] }) }, user.id))) }))] })] }), _jsxs("div", { className: "card", children: [_jsxs("div", { className: "card-header", onClick: () => setOidcSettingsExpanded(!oidcSettingsExpanded), children: [_jsx("h2", { children: "\uD83D\uDD17 SSO / OIDC Settings" }), _jsx("button", { className: "card-toggle", type: "button", children: oidcSettingsExpanded ? '▼ Collapse' : '▶ Expand' })] }), _jsxs("div", { className: `card-content ${oidcSettingsExpanded ? 'expanded' : 'collapsed'}`, children: [oidcBanner && (_jsx("div", { className: `banner ${oidcBanner.includes('✔') ? 'success' : ''}`, style: { marginBottom: 16 }, children: oidcBanner })), _jsxs("form", { onSubmit: saveOidcSettings, children: [_jsx("div", { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }, children: _jsxs("label", { style: { display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 15, fontWeight: 600 }, children: [_jsx("input", { type: "checkbox", checked: oidcSettings.enabled, onChange: (e) => setOidcSettings({ ...oidcSettings, enabled: e.target.checked }), style: { width: 18, height: 18 } }), "Enable OIDC / SSO Login"] }) }), _jsxs("div", { style: { opacity: oidcSettings.enabled ? 1 : 0.5, pointerEvents: oidcSettings.enabled ? 'auto' : 'none' }, children: [_jsxs("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 16 }, children: [_jsxs("div", { className: "form-group", style: { margin: 0 }, children: [_jsx("label", { className: "form-label", children: "Issuer URL" }), _jsx("input", { className: "form-input", type: "url", placeholder: "https://accounts.example.com", value: oidcSettings.issuer, onChange: (e) => setOidcSettings({ ...oidcSettings, issuer: e.target.value }) })] }), _jsxs("div", { className: "form-group", style: { margin: 0 }, children: [_jsx("label", { className: "form-label", children: "Client ID" }), _jsx("input", { className: "form-input", type: "text", value: oidcSettings.clientId, onChange: (e) => setOidcSettings({ ...oidcSettings, clientId: e.target.value }) })] }), _jsxs("div", { className: "form-group", style: { margin: 0 }, children: [_jsx("label", { className: "form-label", children: "Client Secret" }), _jsx("input", { className: "form-input", type: "password", placeholder: oidcClientSecretChanged ? '' : 'Leave blank to keep existing secret', value: oidcSettings.clientSecret, onChange: (e) => {
                                                                                    setOidcSettings({ ...oidcSettings, clientSecret: e.target.value });
                                                                                    setOidcClientSecretChanged(true);
                                                                                }, autoComplete: "new-password" })] }), _jsxs("div", { className: "form-group", style: { margin: 0 }, children: [_jsx("label", { className: "form-label", children: "Redirect URI" }), _jsx("input", { className: "form-input", type: "url", placeholder: `${API_BASE}/api/auth/oidc/callback`, value: oidcSettings.redirectUri, onChange: (e) => setOidcSettings({ ...oidcSettings, redirectUri: e.target.value }) }), _jsxs("div", { style: { fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }, children: ["Suggested: ", API_BASE, "/api/auth/oidc/callback"] })] })] }), _jsx("h3", { style: { fontSize: 15, margin: '16px 0 12px', color: 'var(--color-text-secondary)' }, children: "Login Button" }), _jsxs("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 16 }, children: [_jsxs("div", { className: "form-group", style: { margin: 0 }, children: [_jsx("label", { className: "form-label", children: "Button Text" }), _jsx("input", { className: "form-input", type: "text", value: oidcSettings.buttonText, onChange: (e) => setOidcSettings({ ...oidcSettings, buttonText: e.target.value }), placeholder: "Login with SSO" })] }), _jsxs("div", { className: "form-group", style: { margin: 0 }, children: [_jsx("label", { className: "form-label", children: "Button Color" }), _jsxs("div", { style: { display: 'flex', gap: 8, alignItems: 'center' }, children: [_jsx("input", { type: "color", value: oidcSettings.buttonColor, onChange: (e) => setOidcSettings({ ...oidcSettings, buttonColor: e.target.value }), style: { width: 44, height: 40, borderRadius: 8, border: '2px solid var(--color-border)', cursor: 'pointer', padding: 2, background: 'var(--color-bg-secondary)' } }), _jsx("input", { className: "form-input", type: "text", value: oidcSettings.buttonColor, onChange: (e) => setOidcSettings({ ...oidcSettings, buttonColor: e.target.value }), placeholder: "#6366f1", style: { flex: 1 } })] })] })] }), _jsx("h3", { style: { fontSize: 15, margin: '16px 0 12px', color: 'var(--color-text-secondary)' }, children: "Login Methods" }), _jsx("div", { className: "form-group", style: { marginBottom: 20 }, children: _jsxs("label", { style: { display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }, children: [_jsx("input", { type: "checkbox", checked: oidcSettings.passwordLoginEnabled, onChange: (e) => setOidcSettings({ ...oidcSettings, passwordLoginEnabled: e.target.checked }), style: { width: 16, height: 16 } }), _jsx("span", { className: "form-label", style: { margin: 0 }, children: "Enable username/password login on Admin and Host pages" })] }) }), _jsx("h3", { style: { fontSize: 15, margin: '16px 0 12px', color: 'var(--color-text-secondary)' }, children: "User Provisioning" }), _jsxs("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 20 }, children: [_jsx("div", { className: "form-group", style: { margin: 0 }, children: _jsxs("label", { style: { display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }, children: [_jsx("input", { type: "checkbox", checked: oidcSettings.autoCreateUsers, onChange: (e) => setOidcSettings({ ...oidcSettings, autoCreateUsers: e.target.checked }), style: { width: 16, height: 16 } }), _jsx("span", { className: "form-label", style: { margin: 0 }, children: "Auto-create new users" })] }) }), _jsxs("div", { className: "form-group", style: { margin: 0 }, children: [_jsx("label", { className: "form-label", children: "Default role for new SSO users" }), _jsxs("select", { className: "form-input", value: oidcSettings.defaultRole, onChange: (e) => setOidcSettings({ ...oidcSettings, defaultRole: e.target.value }), style: { cursor: 'pointer' }, children: [_jsx("option", { value: "user", children: "User" }), _jsx("option", { value: "admin", children: "Admin" })] })] })] }), oidcSettings.buttonText && (_jsxs("div", { style: { marginBottom: 16 }, children: [_jsx("label", { className: "form-label", children: "Preview" }), _jsx("div", { style: { padding: '12px 20px', borderRadius: 12, background: oidcSettings.buttonColor, color: 'white', display: 'inline-block', fontWeight: 600, fontSize: 14 }, children: oidcSettings.buttonText })] }))] }), _jsx("button", { className: "btn-icon primary", type: "submit", disabled: oidcSaving, title: "Save OIDC settings", "aria-label": "Save OIDC settings", children: oidcSaving ? _jsx(_Fragment, { children: _jsx("span", { className: "loading-spinner" }) }) : '💾' })] })] })] }), showBrowser && (_jsxs(_Fragment, { children: [_jsx("div", { className: "modal-backdrop", onClick: () => setShowBrowser(false) }), _jsxs("div", { className: "modal", children: [_jsxs("div", { className: "modal-header", children: [_jsx("h3", { className: "modal-title", children: "\uD83D\uDCC1 Select Media Folder" }), _jsx("button", { className: "btn ghost", onClick: () => setShowBrowser(false), style: { padding: "4px 12px" }, children: "\u2715" })] }), _jsxs("div", { className: "browser-path", children: [_jsx("span", { children: "\uD83D\uDCCD" }), _jsxs("div", { className: "breadcrumb", children: [_jsx("span", { className: "breadcrumb-part", onClick: () => browseFolders("/"), children: "/" }), currentBrowsePath
                                                                .split("/")
                                                                .filter(Boolean)
                                                                .map((part, idx, arr) => {
                                                                const partPath = "/" + arr.slice(0, idx + 1).join("/");
                                                                return (_jsxs(React.Fragment, { children: [_jsx("span", { className: "breadcrumb-sep", children: "/" }), _jsx("span", { className: "breadcrumb-part", onClick: () => browseFolders(partPath), children: part })] }, idx));
                                                            })] })] }), browseError && (_jsxs("div", { className: "error-msg", children: ["\u26A0\uFE0F ", browseError] })), _jsxs("div", { className: "browser-container", children: [currentBrowsePath !== "/" && (_jsxs("div", { className: "folder-item", onClick: navigateUp, children: [_jsx("span", { className: "folder-icon", children: "\u2B06\uFE0F" }), _jsx("span", { className: "folder-name", children: ".." }), _jsx("span", { style: { opacity: 0.5, fontSize: 13 }, children: "(parent directory)" })] })), folderContents
                                                        .filter((item) => item.isDirectory)
                                                        .map((item) => (_jsxs("div", { className: "folder-item", onClick: () => browseFolders(item.path), children: [_jsx("span", { className: "folder-icon", children: "\uD83D\uDCC1" }), _jsx("span", { className: "folder-name", children: item.name })] }, item.path))), folderContents.filter((item) => item.isDirectory).length ===
                                                        0 &&
                                                        !browseError && (_jsxs("div", { className: "empty-state", style: { padding: 40 }, children: [_jsx("div", { className: "empty-icon", style: { fontSize: 48 }, children: "\uD83D\uDCC2" }), _jsx("div", { className: "empty-text", style: { fontSize: 14 }, children: "No subfolders in this directory" })] }))] }), _jsxs("div", { style: { display: 'flex', gap: 12 }, children: [_jsx("input", { className: "form-input", value: currentBrowsePath, readOnly: true, style: { flex: 1 } }), _jsxs("button", { className: "btn success", onClick: () => selectFolder(currentBrowsePath), children: [_jsx("span", { children: "\u2713" }), " Select This Folder"] }), _jsx("button", { className: "btn ghost", onClick: () => setShowBrowser(false), children: "Cancel" })] })] })] })), showDownloadBrowser && (_jsxs(_Fragment, { children: [_jsx("div", { className: "modal-backdrop", onClick: () => setShowDownloadBrowser(false) }), _jsxs("div", { className: "modal", children: [_jsxs("div", { className: "modal-header", children: [_jsx("h3", { className: "modal-title", children: "\uD83D\uDCC1 Select Download Folder" }), _jsx("button", { className: "btn ghost", onClick: () => setShowDownloadBrowser(false), style: { padding: "4px 12px" }, children: "\u2715" })] }), _jsxs("div", { className: "browser-path", children: [_jsx("span", { children: "\uD83D\uDCCD" }), _jsxs("div", { className: "breadcrumb", children: [_jsx("span", { className: "breadcrumb-part", onClick: () => browseFolders("/"), children: "/" }), currentBrowsePath
                                                                .split("/")
                                                                .filter(Boolean)
                                                                .map((part, idx, arr) => {
                                                                const partPath = "/" + arr.slice(0, idx + 1).join("/");
                                                                return (_jsxs(React.Fragment, { children: [_jsx("span", { className: "breadcrumb-sep", children: "/" }), _jsx("span", { className: "breadcrumb-part", onClick: () => browseFolders(partPath), children: part })] }, idx));
                                                            })] })] }), browseError && (_jsxs("div", { className: "error-msg", children: ["\u26A0\uFE0F ", browseError] })), _jsxs("div", { className: "browser-container", children: [currentBrowsePath !== "/" && (_jsxs("div", { className: "folder-item", onClick: navigateUp, children: [_jsx("span", { className: "folder-icon", children: "\u2B06\uFE0F" }), _jsx("span", { className: "folder-name", children: ".." }), _jsx("span", { style: { opacity: 0.5, fontSize: 13 }, children: "(parent directory)" })] })), folderContents
                                                        .filter((item) => item.isDirectory)
                                                        .map((item) => (_jsxs("div", { className: "folder-item", onClick: () => browseFolders(item.path), children: [_jsx("span", { className: "folder-icon", children: "\uD83D\uDCC1" }), _jsx("span", { className: "folder-name", children: item.name })] }, item.path))), folderContents.filter((item) => item.isDirectory).length ===
                                                        0 &&
                                                        !browseError && (_jsxs("div", { className: "empty-state", style: { padding: 40 }, children: [_jsx("div", { className: "empty-icon", style: { fontSize: 48 }, children: "\uD83D\uDCC2" }), _jsx("div", { className: "empty-text", style: { fontSize: 14 }, children: "No subfolders in this directory" })] }))] }), _jsxs("div", { style: { display: "flex", gap: 12 }, children: [_jsx("input", { className: "form-input", value: currentBrowsePath, readOnly: true, style: { flex: 1 } }), _jsxs("button", { className: "btn success", onClick: () => selectDownloadFolder(currentBrowsePath), children: [_jsx("span", { children: "\u2713" }), " Select This Folder"] }), _jsx("button", { className: "btn ghost", onClick: () => setShowDownloadBrowser(false), children: "Cancel" })] })] })] })), showAccountManagement && (_jsxs(_Fragment, { children: [_jsx("div", { className: "modal-backdrop", onClick: () => setShowAccountManagement(false) }), _jsxs("div", { className: "modal", children: [_jsxs("div", { className: "modal-header", children: [_jsx("h3", { className: "modal-title", children: "\uD83D\uDD10 Account Settings" }), _jsx("button", { className: "btn ghost", onClick: () => setShowAccountManagement(false), style: { padding: "4px 12px" }, children: "\u2715" })] }), auth.isDefaultPassword && (_jsx("div", { className: "banner warning", style: { marginBottom: 16 }, children: "\u26A0\uFE0F You are using the default password. Please change it for security." })), _jsx("p", { style: { color: "var(--color-text-secondary)", marginBottom: 20, fontSize: 14 }, children: "Change your username and password." }), !changingUsername && !changingPassword && (_jsxs("div", { style: { display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 20 }, children: [_jsxs("button", { className: "btn", style: { minWidth: 180, justifyContent: "center", flex: 1 }, onClick: () => setChangingUsername(true), children: [_jsx("span", { children: "\uD83D\uDC64" }), " Change Username"] }), _jsxs("button", { className: "btn", style: { minWidth: 180, justifyContent: "center", flex: 1 }, onClick: () => setChangingPassword(true), children: [_jsx("span", { children: "\uD83D\uDD12" }), " Change Password"] })] })), changingUsername && (_jsx("div", { style: { marginBottom: 20 }, children: _jsxs("form", { onSubmit: handleChangeUsername, style: {
                                                        display: "flex",
                                                        flexDirection: "column",
                                                        gap: 12,
                                                        background: "var(--color-bg-secondary)",
                                                        padding: 16,
                                                        borderRadius: 12,
                                                        border: "1px solid var(--color-border)",
                                                    }, children: [_jsxs("div", { className: "form-group", style: { marginBottom: 0 }, children: [_jsx("label", { className: "form-label", children: "New Username" }), _jsx("input", { className: "form-input", type: "text", value: newUsername, onChange: (e) => setNewUsername(e.target.value), placeholder: "Enter new username (min 3 characters)", autoComplete: "username", required: true, minLength: 3 })] }), _jsxs("div", { className: "form-group", style: { marginBottom: 0 }, children: [_jsx("label", { className: "form-label", children: "Current Password (to confirm)" }), _jsx("input", { className: "form-input", type: "password", value: usernamePassword, onChange: (e) => setUsernamePassword(e.target.value), placeholder: "Enter current password", autoComplete: "current-password", required: true })] }), usernameError && (_jsx("div", { className: "error-msg", style: { marginBottom: 0 }, children: usernameError })), _jsxs("div", { style: { display: "flex", gap: 8 }, children: [_jsxs("button", { className: "btn success", type: "submit", disabled: busy, children: [_jsx("span", { children: "\u2713" }), " Change Username"] }), _jsx("button", { type: "button", className: "btn ghost", onClick: () => {
                                                                        setChangingUsername(false);
                                                                        setNewUsername("");
                                                                        setUsernamePassword("");
                                                                        setUsernameError("");
                                                                    }, children: "Cancel" })] })] }) })), changingPassword && (_jsxs("form", { onSubmit: handleChangePassword, style: {
                                                    display: "flex",
                                                    flexDirection: "column",
                                                    gap: 12,
                                                    background: "var(--color-bg-secondary)",
                                                    padding: 16,
                                                    borderRadius: 12,
                                                    border: "1px solid var(--color-border)",
                                                }, children: [_jsxs("div", { className: "form-group", style: { marginBottom: 0 }, children: [_jsx("label", { className: "form-label", children: "Current Password" }), _jsx("input", { className: "form-input", type: "password", value: currentPassword, onChange: (e) => setCurrentPassword(e.target.value), placeholder: "Enter current password", autoComplete: "current-password", required: true })] }), _jsxs("div", { className: "form-group", style: { marginBottom: 0 }, children: [_jsx("label", { className: "form-label", children: "New Password" }), _jsx("input", { className: "form-input", type: "password", value: newPassword, onChange: (e) => setNewPassword(e.target.value), placeholder: "Enter new password (min 8 characters)", autoComplete: "new-password", required: true, minLength: 8 })] }), _jsxs("div", { className: "form-group", style: { marginBottom: 0 }, children: [_jsx("label", { className: "form-label", children: "Confirm New Password" }), _jsx("input", { className: "form-input", type: "password", value: confirmPassword, onChange: (e) => setConfirmPassword(e.target.value), placeholder: "Confirm new password", autoComplete: "new-password", required: true })] }), passwordError && (_jsx("div", { className: "error-msg", style: { marginBottom: 0 }, children: passwordError })), _jsxs("div", { style: { display: "flex", gap: 8 }, children: [_jsxs("button", { className: "btn success", type: "submit", disabled: busy, children: [_jsx("span", { children: "\u2713" }), " Change Password"] }), _jsx("button", { type: "button", className: "btn ghost", onClick: () => {
                                                                    setChangingPassword(false);
                                                                    setCurrentPassword("");
                                                                    setNewPassword("");
                                                                    setConfirmPassword("");
                                                                    setPasswordError("");
                                                                }, children: "Cancel" })] })] }))] })] })), editingUser && (_jsxs(_Fragment, { children: [_jsx("div", { className: "modal-backdrop", onClick: () => setEditingUser(null) }), _jsxs("div", { className: "modal", style: { maxWidth: 480 }, children: [_jsxs("div", { className: "modal-header", children: [_jsxs("h3", { className: "modal-title", children: ["\u270F\uFE0F Edit User: ", getUserDisplayName(editingUser)] }), _jsx("button", { className: "btn ghost", onClick: () => setEditingUser(null), style: { padding: '4px 12px' }, children: "\u2715" })] }), _jsxs("form", { onSubmit: handleUpdateUser, children: [_jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "Role" }), _jsxs("select", { className: "form-input", value: editUserRole, onChange: (e) => setEditUserRole(e.target.value), style: { cursor: 'pointer' }, children: [_jsx("option", { value: "user", children: "User" }), _jsx("option", { value: "admin", children: "Admin" })] })] }), _jsx("div", { className: "form-group", children: _jsxs("label", { style: { display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }, children: [_jsx("input", { type: "checkbox", checked: editUserActive, onChange: (e) => setEditUserActive(e.target.checked), style: { width: 16, height: 16 } }), _jsx("span", { className: "form-label", style: { margin: 0 }, children: "Active" })] }) }), _jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "New Password (leave blank to keep current)" }), _jsx("input", { className: "form-input", type: "password", value: editUserPassword, onChange: (e) => setEditUserPassword(e.target.value), placeholder: "New password (optional)", autoComplete: "new-password" })] }), editUserError && _jsx("div", { className: "error-msg", children: editUserError }), _jsxs("div", { style: { display: 'flex', gap: 8 }, children: [_jsx("button", { className: "btn primary", type: "submit", children: "Save Changes" }), _jsx("button", { className: "btn ghost", type: "button", onClick: () => setEditingUser(null), children: "Cancel" })] })] })] })] }))] }))] })] }));
}
