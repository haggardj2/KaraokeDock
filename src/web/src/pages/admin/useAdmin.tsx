import React, { useEffect, useMemo, useRef, useState } from "react";
import { api, API_BASE } from "../../api";
import { useAuth } from "../../auth-context";
import { parseBooleanSetting } from "../../utils/settings";
import SocialLoginSettings from "../../components/SocialLoginSettings";
import AccountLinkDialog from "../../components/AccountLinkDialog";
import SingerAvatar from "../../components/SingerAvatar";
import { THEMES, applyTheme, clearTheme, isThemeId, type ThemeId } from "../../theme";
import { useStaffTheme } from "../../useStaffTheme";
import { AppBarContent } from "../../appBarSlot";
import MaterialIcon, { renderStatusMessage } from "../../components/MaterialIcon";
import {
  ADMIN_SECTIONS,
  ADMIN_SECTION_STORAGE_KEY,
  AdminSection,
  BreakFolder,
  FolderItem,
  LIBRARY_PARSE_MODE_OPTIONS,
  Library,
  LibraryParseMode,
  ManagedUser,
  OidcConfig,
  OidcPublicConfig,
  Stats,
  getUserDisplayName,
  isAdminSection,
  loadAdminSection,
} from "./shared";

// All Admin page state, loading and actions. Admin.tsx and its section components read from this.
export function useAdmin() {
  const auth = useAuth()
  const [libs, setLibs] = useState<Library[]>([]);
  const [name, setName] = useState("");
  const [path, setPath] = useState("");
  const [libraryParseMode, setLibraryParseMode] = useState<LibraryParseMode>('discid-artist-title');
  const [showAddLibraryModal, setShowAddLibraryModal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [banner, setBanner] = useState<string>("");
  const [showBrowser, setShowBrowser] = useState(false);
  const [currentBrowsePath, setCurrentBrowsePath] = useState("/media");
  const [folderContents, setFolderContents] = useState<FolderItem[]>([]);
  const [browseError, setBrowseError] = useState<string>("");
  const [browseTarget, setBrowseTarget] = useState<'library' | 'download' | 'breakLibrary' | 'breakPlaylists' | 'images'>('library');
  const [breakFolders, setBreakFolders] = useState<BreakFolder[]>([]);
  const [breakFolderName, setBreakFolderName] = useState("");
  const [breakFolderPath, setBreakFolderPath] = useState("");
  const [showAddBreakFolderModal, setShowAddBreakFolderModal] = useState(false);
  const [breakPlaylistsFolder, setBreakPlaylistsFolder] = useState("/media/playlists");
  const [imageUploadsDir, setImageUploadsDir] = useState("/media/images");

  // Login state
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  // OIDC public config (for login button)
  const [oidcConfig, setOidcConfig] = useState<OidcPublicConfig | null>(null);

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
  const [ytdlpVersion, setYtdlpVersion] = useState<string | null>(null);
  const [ytdlpUpdating, setYtdlpUpdating] = useState(false);
  const [downloadLocation, setDownloadLocation] = useState("/media/downloads");
  const [backgroundTasksEnabled, setBackgroundTasksEnabled] = useState(true);
  const [backgroundMediaScanEnabled, setBackgroundMediaScanEnabled] = useState(false);
  const [backgroundDownloadScanEnabled, setBackgroundDownloadScanEnabled] = useState(false);
  const [backgroundBreakMusicScanEnabled, setBackgroundBreakMusicScanEnabled] = useState(false);
  const [requestAcceptance, setRequestAcceptance] = useState<"local" | "external" | "disabled">("local");
  const [localLibraryEnabled, setLocalLibraryEnabled] = useState(true);
  const [externalLibraryEnabled, setExternalLibraryEnabled] = useState(true);
  const [localBrowseEnabled, setLocalBrowseEnabled] = useState(true);
  const [themeId] = useStaffTheme();
  const [requestTheme, setRequestTheme] = useState<ThemeId>("midnight");
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [allowDownloads, setAllowDownloads] = useState(true);
  const [showDownloadBrowser, setShowDownloadBrowser] = useState(false);
  const [stationMode, setStationMode] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [remoteGatewayEnabled, setRemoteGatewayEnabled] = useState(false);
  const [remoteGatewayUrl, setRemoteGatewayUrl] = useState("");
  const [remoteGatewayToken, setRemoteGatewayToken] = useState("");
  const [remoteGatewayPollInterval, setRemoteGatewayPollInterval] = useState(5);
  const [remoteGatewayBusy, setRemoteGatewayBusy] = useState(false);
  const [remoteGatewayStatus, setRemoteGatewayStatus] = useState<any>(null);
  
  // Collapsible card states
  const [activeSection, setActiveSection] = useState<AdminSection>(() => loadAdminSection());
  const adminNavRef = useRef<HTMLElement | null>(null);

  // User Manager state
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [mergeUser, setMergeUser] = useState<ManagedUser | null>(null);
  const [usersLoadError, setUsersLoadError] = useState("");
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUserUsername, setNewUserUsername] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState<'admin' | 'user'>('user');
  const [userError, setUserError] = useState("");
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [editUserRole, setEditUserRole] = useState<'admin' | 'user'>('user');
  const [editUserActive, setEditUserActive] = useState(true);
  const [editUserPassword, setEditUserPassword] = useState("");
  const [editUserError, setEditUserError] = useState("");

  // OIDC Settings state
  const [oidcSettings, setOidcSettings] = useState<OidcConfig>({
    enabled: false,
    issuer: '',
    clientId: '',
    clientSecret: '',
    redirectUri: '',
    buttonText: 'Login with SSO',
    buttonColor: '#6366f1',
    autoCreateUsers: true,
    passwordLoginEnabled: true,
  });
  const [oidcClientSecretChanged, setOidcClientSecretChanged] = useState(false);
  const [oidcSaving, setOidcSaving] = useState(false);
  const [oidcBanner, setOidcBanner] = useState("");

  // Logging level state
  const [logLevel, setLogLevel] = useState<'error' | 'warning' | 'info' | 'verbose'>('info');

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
  async function refreshBreakFolders() {
    if (!auth.sessionToken || !auth.isLoggedIn) return;
    setBreakFolders(await api("/api/break-music/folders", { headers: sessionHeaders }));
  }
  async function refreshStats() {
    if (!auth.sessionToken || !auth.isLoggedIn) return;
    const s = await api("/api/admin/stats", { headers: sessionHeaders });
    setStats(s);
  }

  function resetLibraryForm() {
    setName("");
    setPath("");
    setLibraryParseMode('discid-artist-title');
  }

  function closeAddLibraryModal() {
    resetLibraryForm();
    setShowAddLibraryModal(false);
  }

  function resetBreakFolderForm() {
    setBreakFolderName("");
    setBreakFolderPath("");
  }

  function closeAddBreakFolderModal() {
    resetBreakFolderForm();
    setShowAddBreakFolderModal(false);
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
    refreshLibs();

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
      .catch(() => {});

    // Listen for account management event from navigation
    const handleShowAccountManagement = () => {
      setShowAccountManagement(true);
    };
    window.addEventListener('showAccountManagement', handleShowAccountManagement);

    return () => {
      clearTheme();
      window.removeEventListener('showAccountManagement', handleShowAccountManagement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(ADMIN_SECTION_STORAGE_KEY, activeSection);
    } catch {
      // Storage blocked: the section still works for this visit.
    }
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#${activeSection}`);
    // On phones the section list scrolls sideways; keep the active one visible.
    const nav = adminNavRef.current;
    const active = nav?.querySelector<HTMLElement>(".admin-nav-item.active");
    if (nav && active && nav.scrollWidth > nav.clientWidth) {
      nav.scrollTo({ left: active.offsetLeft - (nav.clientWidth - active.offsetWidth) / 2, behavior: "smooth" });
    }
  }, [activeSection, auth.isLoggedIn, auth.isAdmin]);

  const visibleSections = ADMIN_SECTIONS.filter((section) =>
    section.id === "gateway" ? stationMode : section.id === "social" || section.id === "oidc" ? !stationMode : true);

  useEffect(() => {
    if (settingsLoaded && !visibleSections.some((section) => section.id === activeSection)) setActiveSection("overview");
  }, [settingsLoaded, stationMode, activeSection]);

  async function addLibrary() {
    if (!auth.sessionToken || !auth.isLoggedIn) return alert("Please login first");
    if (! name. trim()) return alert("Library name is required");
    if (!path. trim()) return alert("Library path is required");

    setBusy(true);
    try {
      await api("/api/libraries", {
        method: "POST",
        headers: sessionHeaders,
        body: JSON.stringify({
          name: name.trim(),
          path: path.trim(),
          parseMode: libraryParseMode,
        }),
      });
      await refreshLibs();
      closeAddLibraryModal();
    } finally {
      setBusy(false);
    }
  }

  async function deleteLibrary(id: number) {
    if (!auth.sessionToken || ! auth.isLoggedIn) return alert("Please login first");
    if (!confirm("Remove this library? Tracks remain in the database until Clear DB, but will no longer be attached to this library.")) return;
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

  async function addBreakFolder() {
    if (!auth.sessionToken || !auth.isLoggedIn) return alert("Please login first");
    if (!breakFolderName.trim()) return alert("Break music folder name is required");
    if (!breakFolderPath.trim()) return alert("Break music folder path is required");
    setBusy(true);
    try {
      await api("/api/break-music/folders", {
        method: "POST",
        headers: sessionHeaders,
        body: JSON.stringify({ name: breakFolderName.trim(), path: breakFolderPath.trim() }),
      });
      await refreshBreakFolders();
      closeAddBreakFolderModal();
    } finally {
      setBusy(false);
    }
  }

  async function deleteBreakFolder(id: number) {
    if (!auth.sessionToken || !auth.isLoggedIn) return alert("Please login first");
    if (!confirm("Remove this break music folder?")) return;
    setBusy(true);
    try {
      await api(`/api/break-music/folders/${id}`, {
        method: "DELETE",
        headers: sessionHeaders,
      });
      await refreshBreakFolders();
    } finally {
      setBusy(false);
    }
  }

  async function scanBreakMusic(folderId?: number) {
    if (!auth.sessionToken || !auth.isLoggedIn) return alert("Please login first");
    setBusy(true);
    setBanner("Scanning break music folders…");
    try {
      const payload: any = {};
      if (folderId) payload.folderId = folderId;
      const result = await api("/api/break-music/scan", {
        method: "POST",
        headers: sessionHeaders,
        body: JSON.stringify(payload),
      });
      setBanner(`✔ Break music scan complete (${result.indexed ?? 0} indexed)`);
      setTimeout(() => setBanner(""), 4000);
    } catch (err: any) {
      setBanner(`⚠️ Break music scan failed: ${err.message}`);
      setTimeout(() => setBanner(""), 5000);
    } finally {
      setBusy(false);
    }
  }

  async function clearBreakMusicDb() {
    if (!auth.sessionToken || !auth.isLoggedIn) return alert("Please login first");
    if (
      !confirm(
        "This will clear only break music tracks from the database (folders remain). Continue?",
      )
    )
      return;
    setBusy(true);
    try {
      const result = await api("/api/break-music/clear-library", {
        method: "POST",
        headers: sessionHeaders,
      });
      setBanner(`✔ Break music DB cleared (${result.before ?? 0}→${result.after ?? 0} tracks)`);
      setTimeout(() => setBanner(""), 4000);
    } catch (err: any) {
      setBanner(`⚠️ Failed to clear break music DB: ${err.message}`);
      setTimeout(() => setBanner(""), 5000);
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
    setBrowseTarget('library');
    setShowBrowser(true);
    setCurrentBrowsePath(path || "/media");
    browseFolders(path || "/media");
  };

  const selectFolder = (folderPath: string) => {
    if (browseTarget === 'library') {
      setPath(folderPath);
    } else if (browseTarget === 'download') {
      setDownloadLocation(folderPath);
    } else if (browseTarget === 'breakLibrary') {
      setBreakFolderPath(folderPath);
    } else if (browseTarget === 'breakPlaylists') {
      setBreakPlaylistsFolder(folderPath);
    } else if (browseTarget === 'images') {
      setImageUploadsDir(folderPath);
    }
    setShowBrowser(false);
  };

  const navigateUp = () => {
    const parentPath =
      currentBrowsePath. split("/").slice(0, -1).join("/") || "/";
    browseFolders(parentPath);
  };

  // yt-dlp functions
  async function fetchYtdlpVersion() {
    if (!auth.sessionToken || !auth.isLoggedIn) return;
    try {
      const result = await api("/api/admin/ytdlp/version", { headers: sessionHeaders });
      setYtdlpVersion(result.version);
    } catch (err) {
      console.error("Failed to fetch yt-dlp version:", err);
    }
  }

  async function updateYtdlp() {
    if (!auth.sessionToken || !auth.isLoggedIn) return alert("Please login first");
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
      } else {
        setBanner(`⚠️ ${result.message}`);
      }
      setTimeout(() => setBanner(""), 5000);
    } catch (err: any) {
      setBanner(`⚠️ Failed to update yt-dlp: ${err.message}`);
      setTimeout(() => setBanner(""), 5000);
    } finally {
      setYtdlpUpdating(false);
    }
  }

  // Settings functions
  async function loadSettings() {
    if (!auth.sessionToken || !auth.isLoggedIn) return;
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
      setRequestTheme(isThemeId(settings["requests.theme"]) ? settings["requests.theme"] : "midnight");
      setAllowDownloads(parseBooleanSetting(settings["ytdlp.allow_downloads"]));
      setBreakPlaylistsFolder(settings["break_music.playlists_folder"] || "/media/playlists");
      setImageUploadsDir(settings["images.upload_dir"] || "/media/images");
      setStationMode(settings["station.mode"] === true);
      setSettingsLoaded(true);
      setRemoteGatewayEnabled(settings["remote_gateway.enabled"] === true);
      setRemoteGatewayUrl(settings["remote_gateway.url"] || "");
      setRemoteGatewayToken(settings["remote_gateway.api_token"] || "");
      setRemoteGatewayPollInterval(Number(settings["remote_gateway.poll_interval_seconds"] ?? 5));
      if (settings["admin.log_level"]) setLogLevel(settings["admin.log_level"]);
    } catch (err) {
      console.error("Failed to load settings:", err);
    }
  }

  async function saveSetting(key: string, value: any) {
    if (!auth.sessionToken || !auth.isLoggedIn) return;
    try {
      await api(`/api/admin/settings/${key}`, {
        method: "PUT",
        headers: sessionHeaders,
        body: JSON.stringify({ value }),
      });
    } catch (err) {
      console.error(`Failed to save setting ${key}:`, err);
      throw err;
    }
  }

  async function handleDownloadLocationChange() {
    try {
      await saveSetting("ytdlp.download_location", downloadLocation);
      setBanner("✔ Download location updated");
      setTimeout(() => setBanner(""), 3000);
    } catch (err: any) {
      setBanner(`⚠️ Failed to update download location: ${err.message}`);
      setTimeout(() => setBanner(""), 5000);
    }
  }

  async function handleBreakPlaylistsFolderChange() {
    try {
      await saveSetting("break_music.playlists_folder", breakPlaylistsFolder);
      setBanner("✔ Break music playlists folder updated");
      setTimeout(() => setBanner(""), 3000);
    } catch (err: any) {
      setBanner(`⚠️ Failed to update break music playlists folder: ${err.message}`);
      setTimeout(() => setBanner(""), 5000);
    }
  }

  async function handleImageUploadsDirChange() {
    try {
      await saveSetting("images.upload_dir", imageUploadsDir);
      setBanner("✔ Image upload directory updated");
      setTimeout(() => setBanner(""), 3000);
    } catch (err: any) {
      setBanner(`⚠️ Failed to update image upload directory: ${err.message}`);
      setTimeout(() => setBanner(""), 5000);
    }
  }

  function generateRemoteGatewayToken() {
    const bytes = new Uint8Array(32);
    window.crypto.getRandomValues(bytes);
    const token = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    setRemoteGatewayToken(token);
  }

  async function persistRemoteGatewaySettings() {
    await Promise.all([
      saveSetting("remote_gateway.enabled", remoteGatewayEnabled),
      saveSetting("remote_gateway.url", remoteGatewayUrl.trim()),
      saveSetting("remote_gateway.api_token", remoteGatewayToken.trim()),
      saveSetting("remote_gateway.poll_interval_seconds", Math.max(2, Number(remoteGatewayPollInterval) || 5)),
    ]);
  }

  async function saveRemoteGatewaySettings() {
    try {
      await persistRemoteGatewaySettings();
      setBanner("✔ Remote Requests Gateway settings saved");
      setTimeout(() => setBanner(""), 3000);
    } catch (err: any) {
      setBanner(`⚠️ Failed to save Remote Requests Gateway settings: ${err.message}`);
      setTimeout(() => setBanner(""), 5000);
    }
  }

  async function copyRemoteGatewayToken() {
    if (!remoteGatewayToken) return;
    try {
      await navigator.clipboard.writeText(remoteGatewayToken);
      setBanner("✔ Remote Requests Gateway token copied");
      setTimeout(() => setBanner(""), 3000);
    } catch (err: any) {
      setBanner(`⚠️ Failed to copy Remote Requests Gateway token: ${err.message}`);
      setTimeout(() => setBanner(""), 5000);
    }
  }

  async function testRemoteGatewayConnection() {
    setRemoteGatewayBusy(true);
    try {
      await persistRemoteGatewaySettings();
      const result = await api("/api/admin/remote-gateway/test", {
        method: "POST",
        headers: sessionHeaders,
      });
      setRemoteGatewayStatus(result);
      setBanner(`✔ Gateway connected (${result.status?.tracks ?? 0} tracks, ${result.status?.pendingRequests ?? 0} pending requests)`);
      setTimeout(() => setBanner(""), 3000);
    } catch (err: any) {
      setRemoteGatewayStatus({ ok: false, error: err.message });
      setBanner(`⚠️ Gateway connection failed: ${err.message}`);
      setTimeout(() => setBanner(""), 5000);
    } finally {
      setRemoteGatewayBusy(false);
    }
  }

  async function syncRemoteGatewayNow() {
    setRemoteGatewayBusy(true);
    try {
      await persistRemoteGatewaySettings();
      const result = await api("/api/admin/remote-gateway/sync", {
        method: "POST",
        headers: sessionHeaders,
      });
      setRemoteGatewayStatus(result);
      setBanner(`✔ Gateway synced ${result.catalog?.accepted ?? 0} tracks, queued ${result.pulledRequests?.queued ?? 0} requests, applied ${result.queueActions?.applied ?? 0} queue actions`);
      setTimeout(() => setBanner(""), 3000);
    } catch (err: any) {
      setRemoteGatewayStatus({ ok: false, error: err.message });
      setBanner(`⚠️ Gateway sync failed: ${err.message}`);
      setTimeout(() => setBanner(""), 5000);
    } finally {
      setRemoteGatewayBusy(false);
    }
  }

  async function handleBackgroundTasksToggle(enabled: boolean) {
    setBackgroundTasksEnabled(enabled);
    try {
      await saveSetting("admin.background_tasks_enabled", enabled);
      setBanner(`✔ Background tasks ${enabled ? "enabled" : "disabled"}`);
      setTimeout(() => setBanner(""), 3000);
    } catch (err: any) {
      setBanner(`⚠️ Failed to update background tasks: ${err.message}`);
      setTimeout(() => setBanner(""), 5000);
      setBackgroundTasksEnabled(!enabled); // Revert on error
    }
  }

  async function handleSpecificBackgroundTaskToggle(
    key: string,
    enabled: boolean,
    setState: React.Dispatch<React.SetStateAction<boolean>>,
    label: string
  ) {
    setState(enabled);
    try {
      await saveSetting(key, enabled);
      setBanner(`✔ ${label} ${enabled ? "enabled" : "disabled"}`);
      setTimeout(() => setBanner(""), 3000);
    } catch (err: any) {
      setBanner(`⚠️ Failed to update ${label.toLowerCase()}: ${err.message}`);
      setTimeout(() => setBanner(""), 5000);
      setState(!enabled);
    }
  }

  async function handleRequestAcceptanceChange(value: "local" | "external" | "disabled") {
    setRequestAcceptance(value);
    try {
      await saveSetting("requests.acceptance", value);
      setBanner(`✔ Request acceptance set to ${value}`);
      setTimeout(() => setBanner(""), 3000);
    } catch (err: any) {
      setBanner(`⚠️ Failed to update request acceptance: ${err.message}`);
      setTimeout(() => setBanner(""), 5000);
    }
  }

  async function handleLibraryToggle(type: "local" | "external", enabled: boolean) {
    if (type === "local") {
      setLocalLibraryEnabled(enabled);
      try {
        await saveSetting("libraries.local_enabled", enabled);
        setBanner(`✔ Local library ${enabled ? "enabled" : "disabled"}`);
        setTimeout(() => setBanner(""), 3000);
      } catch (err: any) {
        setBanner(`⚠️ Failed to update local library: ${err.message}`);
        setTimeout(() => setBanner(""), 5000);
        setLocalLibraryEnabled(!enabled);
      }
    } else {
      setExternalLibraryEnabled(enabled);
      try {
        await saveSetting("libraries.external_enabled", enabled);
        setBanner(`✔ External library ${enabled ? "enabled" : "disabled"}`);
        setTimeout(() => setBanner(""), 3000);
      } catch (err: any) {
        setBanner(`⚠️ Failed to update external library: ${err.message}`);
        setTimeout(() => setBanner(""), 5000);
        setExternalLibraryEnabled(!enabled);
      }
    }
  }

  useEffect(() => {
    applyTheme(themeId);
  }, [themeId]);

  async function handleRequestThemeChange(theme: ThemeId) {
    const previous = requestTheme;
    setRequestTheme(theme);
    try {
      await api("/api/host/settings/request-theme", {
        method: "PUT",
        headers: { "x-session-token": auth.sessionToken, "Content-Type": "application/json" },
        body: JSON.stringify({ theme }),
      });
      setBanner(`✔ Request page theme set to ${THEMES.find((t) => t.id === theme)?.label ?? theme}`);
      setTimeout(() => setBanner(""), 3000);
    } catch (err: any) {
      setBanner(`⚠️ Failed to update request page theme: ${err.message}`);
      setTimeout(() => setBanner(""), 5000);
      setRequestTheme(previous);
    }
  }

  async function handleLocalBrowseToggle(enabled: boolean) {
    setLocalBrowseEnabled(enabled);
    try {
      await saveSetting("requests.local_browse_enabled", enabled);
      setBanner(`✔ Request-page browse ${enabled ? "enabled" : "disabled"}`);
      setTimeout(() => setBanner(""), 3000);
    } catch (err: any) {
      setBanner(`⚠️ Failed to update request-page browse: ${err.message}`);
      setTimeout(() => setBanner(""), 5000);
      setLocalBrowseEnabled(!enabled);
    }
  }

  async function handleAllowDownloadsToggle(enabled: boolean) {
    setAllowDownloads(enabled);
    try {
      await saveSetting("ytdlp.allow_downloads", enabled);
      setBanner(`✔ Downloads ${enabled ? "enabled" : "disabled"}`);
      setTimeout(() => setBanner(""), 3000);
    } catch (err: any) {
      setBanner(`⚠️ Failed to update downloads setting: ${err.message}`);
      setTimeout(() => setBanner(""), 5000);
      setAllowDownloads(!enabled);
    }
  }

  async function handleLogLevelChange(level: 'error' | 'warning' | 'info' | 'verbose') {
    setLogLevel(level);
    try {
      await saveSetting("admin.log_level", level);
      setBanner(`✔ Log level set to ${level}`);
      setTimeout(() => setBanner(""), 3000);
    } catch (err: any) {
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

  const selectDownloadFolder = (folderPath: string) => {
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

  const openImageUploadsBrowser = () => {
    setBrowseTarget('images');
    setShowBrowser(true);
    setCurrentBrowsePath(imageUploadsDir || "/media/images");
    browseFolders(imageUploadsDir || "/media/images");
  };

  async function scanDownloadLocation() {
    if (!auth.sessionToken || !auth.isLoggedIn) return alert("Please login first");
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
      } else {
        setBanner(`⚠️ ${result.message}`);
      }
      setTimeout(() => setBanner(""), 5000);
    } catch (err: any) {
      setBanner(`⚠️ Failed to scan download location: ${err.message}`);
      setTimeout(() => setBanner(""), 5000);
    } finally {
      setBusy(false);
    }
  }

  // ========== User Manager Functions ==========

  async function refreshUsers() {
    if (!auth.sessionToken || !auth.isLoggedIn || !auth.isAdmin) return;
    setUsersLoadError("");
    try {
      const data = await api("/api/admin/users", { headers: sessionHeaders });
      setUsers(data);
    } catch (err) {
      console.error("Failed to load users:", err);
      setUsersLoadError(err instanceof Error ? err.message : "Could not refresh users. Reload the list before merging.");
    }
  }

  async function handleUserMerged(sourceName: string) {
    setMergeUser(null);
    auth.retrySessionValidation();
    setBanner(`Linked "${sourceName}" to "${mergeUser ? getUserDisplayName(mergeUser) : 'the selected account'}". Sign in again with the social provider to use this account and its permissions.`);
    await refreshUsers();
  }

  async function handleCreateUser(e: React.FormEvent) {
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
    } catch (err: any) {
      setUserError(err?.message || "Failed to create user");
    }
  }

  async function handleUpdateUser(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUser) return;
    setEditUserError("");
    if (editUserPassword && editUserPassword.length < 8) {
      setEditUserError("Password must be at least 8 characters");
      return;
    }
    try {
      const body: any = { role: editUserRole, is_active: editUserActive };
      if (editUserPassword) body.password = editUserPassword;
      await api(`/api/admin/users/${editingUser.id}`, {
        method: "PUT",
        headers: sessionHeaders,
        body: JSON.stringify(body),
      });
      setEditingUser(null);
      setEditUserPassword("");
      await refreshUsers();
    } catch (err: any) {
      setEditUserError(err?.message || "Failed to update user");
    }
  }

  async function handleDeleteUser(user: ManagedUser) {
    const label = getUserDisplayName(user);
    if (!confirm(`Delete user "${label}"? This cannot be undone.`)) return;
    try {
      await api(`/api/admin/users/${user.id}`, { method: "DELETE", headers: sessionHeaders });
      await refreshUsers();
    } catch (err: any) {
      setBanner(`⚠️ ${err?.message || "Failed to delete user"}`);
      setTimeout(() => setBanner(""), 5000);
    }
  }

  // ========== OIDC Settings Functions ==========

  async function loadOidcSettings() {
    if (!auth.sessionToken || !auth.isLoggedIn || !auth.isAdmin) return;
    try {
      const data = await api("/api/admin/settings/oidc", { headers: sessionHeaders });
      // clientSecret comes as '***' (masked), track it separately
      setOidcSettings({ ...data, clientSecret: '' });
      setOidcClientSecretChanged(false);
    } catch (err) {
      console.error("Failed to load OIDC settings:", err);
    }
  }

  async function saveOidcSettings(e: React.FormEvent) {
    e.preventDefault();
    setOidcSaving(true);
    setOidcBanner("");
    try {
      // Only send clientSecret if the admin explicitly changed it
      const payload = { ...oidcSettings };
      if (!oidcClientSecretChanged) {
        delete (payload as any).clientSecret;
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
    } catch (err: any) {
      setOidcBanner(`⚠️ ${err?.message || "Failed to save OIDC settings"}`);
      setTimeout(() => setOidcBanner(""), 5000);
    } finally {
      setOidcSaving(false);
    }
  }

  // Load yt-dlp version and settings on login
  useEffect(() => {
    if (auth.isLoggedIn && auth.isAdmin) {
      refreshStats();
      fetchYtdlpVersion();
      loadSettings();
      refreshUsers();
      loadOidcSettings();
      refreshBreakFolders();
    } else {
      setStats(null);
    }
  }, [auth.isLoggedIn, auth.isAdmin, auth.sessionToken]);

  return {
    auth,
    libs,
    setLibs,
    name,
    setName,
    path,
    setPath,
    libraryParseMode,
    setLibraryParseMode,
    showAddLibraryModal,
    setShowAddLibraryModal,
    busy,
    setBusy,
    stats,
    setStats,
    banner,
    setBanner,
    showBrowser,
    setShowBrowser,
    currentBrowsePath,
    setCurrentBrowsePath,
    folderContents,
    setFolderContents,
    browseError,
    setBrowseError,
    browseTarget,
    setBrowseTarget,
    breakFolders,
    setBreakFolders,
    breakFolderName,
    setBreakFolderName,
    breakFolderPath,
    setBreakFolderPath,
    showAddBreakFolderModal,
    setShowAddBreakFolderModal,
    breakPlaylistsFolder,
    setBreakPlaylistsFolder,
    imageUploadsDir,
    setImageUploadsDir,
    loginUsername,
    setLoginUsername,
    loginPassword,
    setLoginPassword,
    loginError,
    setLoginError,
    oidcConfig,
    setOidcConfig,
    showAccountManagement,
    setShowAccountManagement,
    changingPassword,
    setChangingPassword,
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    passwordError,
    setPasswordError,
    changingUsername,
    setChangingUsername,
    newUsername,
    setNewUsername,
    usernamePassword,
    setUsernamePassword,
    usernameError,
    setUsernameError,
    ytdlpVersion,
    setYtdlpVersion,
    ytdlpUpdating,
    setYtdlpUpdating,
    downloadLocation,
    setDownloadLocation,
    backgroundTasksEnabled,
    setBackgroundTasksEnabled,
    backgroundMediaScanEnabled,
    setBackgroundMediaScanEnabled,
    backgroundDownloadScanEnabled,
    setBackgroundDownloadScanEnabled,
    backgroundBreakMusicScanEnabled,
    setBackgroundBreakMusicScanEnabled,
    requestAcceptance,
    setRequestAcceptance,
    localLibraryEnabled,
    setLocalLibraryEnabled,
    externalLibraryEnabled,
    setExternalLibraryEnabled,
    localBrowseEnabled,
    setLocalBrowseEnabled,
    requestTheme,
    setRequestTheme,
    showSettingsModal,
    setShowSettingsModal,
    allowDownloads,
    setAllowDownloads,
    showDownloadBrowser,
    setShowDownloadBrowser,
    stationMode,
    setStationMode,
    settingsLoaded,
    setSettingsLoaded,
    remoteGatewayEnabled,
    setRemoteGatewayEnabled,
    remoteGatewayUrl,
    setRemoteGatewayUrl,
    remoteGatewayToken,
    setRemoteGatewayToken,
    remoteGatewayPollInterval,
    setRemoteGatewayPollInterval,
    remoteGatewayBusy,
    setRemoteGatewayBusy,
    remoteGatewayStatus,
    setRemoteGatewayStatus,
    activeSection,
    setActiveSection,
    adminNavRef,
    users,
    setUsers,
    mergeUser,
    setMergeUser,
    usersLoadError,
    setUsersLoadError,
    showCreateUser,
    setShowCreateUser,
    newUserUsername,
    setNewUserUsername,
    newUserPassword,
    setNewUserPassword,
    newUserRole,
    setNewUserRole,
    userError,
    setUserError,
    editingUser,
    setEditingUser,
    editUserRole,
    setEditUserRole,
    editUserActive,
    setEditUserActive,
    editUserPassword,
    setEditUserPassword,
    editUserError,
    setEditUserError,
    oidcSettings,
    setOidcSettings,
    oidcClientSecretChanged,
    setOidcClientSecretChanged,
    oidcSaving,
    setOidcSaving,
    oidcBanner,
    setOidcBanner,
    logLevel,
    setLogLevel,
    sessionHeaders,
    refreshLibs,
    refreshBreakFolders,
    refreshStats,
    resetLibraryForm,
    closeAddLibraryModal,
    resetBreakFolderForm,
    closeAddBreakFolderModal,
    handleLogin,
    handleChangePassword,
    handleChangeUsername,
    browseFolders,
    visibleSections,
    addLibrary,
    deleteLibrary,
    addBreakFolder,
    deleteBreakFolder,
    scanBreakMusic,
    clearBreakMusicDb,
    scanAll,
    scanOne,
    clearDb,
    openBrowser,
    selectFolder,
    navigateUp,
    fetchYtdlpVersion,
    updateYtdlp,
    loadSettings,
    saveSetting,
    handleDownloadLocationChange,
    handleBreakPlaylistsFolderChange,
    handleImageUploadsDirChange,
    generateRemoteGatewayToken,
    persistRemoteGatewaySettings,
    saveRemoteGatewaySettings,
    copyRemoteGatewayToken,
    testRemoteGatewayConnection,
    syncRemoteGatewayNow,
    handleBackgroundTasksToggle,
    handleSpecificBackgroundTaskToggle,
    handleRequestAcceptanceChange,
    handleLibraryToggle,
    handleRequestThemeChange,
    handleLocalBrowseToggle,
    handleAllowDownloadsToggle,
    handleLogLevelChange,
    openDownloadBrowser,
    selectDownloadFolder,
    openBreakLibraryBrowser,
    openBreakPlaylistsBrowser,
    openImageUploadsBrowser,
    scanDownloadLocation,
    refreshUsers,
    handleUserMerged,
    handleCreateUser,
    handleUpdateUser,
    handleDeleteUser,
    loadOidcSettings,
    saveOidcSettings,
  };
}

export type AdminState = ReturnType<typeof useAdmin>;
