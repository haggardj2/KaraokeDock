import React, { useEffect, useMemo, useRef, useState } from "react";
import { api, API_BASE } from "../api";
import { useAuth } from "../auth-context";
import { parseBooleanSetting } from "../utils/settings";
import SocialLoginSettings from "../components/SocialLoginSettings";
import AccountLinkDialog from "../components/AccountLinkDialog";
import SingerAvatar from "../components/SingerAvatar";
import { THEMES, applyTheme, clearTheme, isThemeId, type ThemeId } from "../theme";
import { useStaffTheme } from "../useStaffTheme";
import { AppBarContent } from "../appBarSlot";
import "./Admin.css";
import MaterialIcon, { renderStatusMessage } from "../components/MaterialIcon";

type LibraryParseMode =
  | 'discid-artist-title'
  | 'discid-title-artist'
  | 'artist-title-discid'
  | 'title-artist-discid'
  | 'artist-title'
  | 'title-artist'
  | 'discid_title_artist';

type Library = { id: number; name: string; path: string; parseMode: LibraryParseMode };
type BreakFolder = { id: number; name: string; path: string };
type Stats = {
  artists: number;
  tracks: number;
  queued: number;
  lastScan?: any;
};
type FolderItem = { name: string; path: string; isDirectory: boolean };
type ManagedUser = {
  id: number;
  username: string;
  display_name: string | null;
  picture: string | null;
  role: 'admin' | 'user';
  is_active: boolean;
  oidc_subject: string | null;
  oidc_issuer: string | null;
  social_provider?: 'google' | 'facebook' | null;
  singer_id: string | null;
  singer_display_name: string | null;
  linkedLogins: { id: number; username: string; provider: string; isActive: boolean }[];
  created_at: string;
};
type OidcConfig = {
  enabled: boolean;
  issuer: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  buttonText: string;
  buttonColor: string;
  autoCreateUsers: boolean;
  passwordLoginEnabled: boolean;
};
type OidcPublicConfig = {
  enabled: boolean;
  buttonText: string;
  buttonColor: string;
  passwordLoginEnabled: boolean;
};

const LIBRARY_PARSE_MODE_OPTIONS: Array<{
  value: LibraryParseMode;
  label: string;
  example: string;
}> = [
  {
    value: 'discid-artist-title',
    label: 'discID - Artist - Title',
    example: 'SC1234-01 - Queen - Bohemian Rhapsody',
  },
  {
    value: 'discid-title-artist',
    label: 'discID - Title - Artist',
    example: 'SC1234-01 - Bohemian Rhapsody - Queen',
  },
  {
    value: 'artist-title-discid',
    label: 'Artist - Title - discID',
    example: 'Queen - Bohemian Rhapsody - SC1234-01',
  },
  {
    value: 'title-artist-discid',
    label: 'Title - Artist - discID',
    example: 'Bohemian Rhapsody - Queen - SC1234-01',
  },
  {
    value: 'artist-title',
    label: 'Artist - Title',
    example: 'Queen - Bohemian Rhapsody',
  },
  {
    value: 'title-artist',
    label: 'Title - Artist',
    example: 'Bohemian Rhapsody - Queen',
  },
  {
    value: 'discid_title_artist',
    label: 'discID_title_artist',
    example: 'SC1234-01_Bohemian_Rhapsody_Queen',
  },
];

type AdminSection = "overview" | "libraries" | "break" | "system" | "gateway" | "users" | "social" | "oidc";

const ADMIN_SECTION_STORAGE_KEY = "karaokedock.admin.section";

const ADMIN_SECTIONS: Array<{ id: AdminSection; label: string; icon: string; description: string }> = [
  { id: "overview", label: "Overview", icon: "bar_chart", description: "Library and queue statistics" },
  { id: "libraries", label: "Media Libraries", icon: "library_music", description: "Karaoke folders and how they are scanned" },
  { id: "break", label: "Break Music", icon: "music_note", description: "Break music folders and saved playlists" },
  { id: "system", label: "System", icon: "settings", description: "Requests, downloads, background tasks and logging" },
  { id: "gateway", label: "Remote Gateway", icon: "cloud_sync", description: "Public request gateway sync" },
  { id: "users", label: "Users", icon: "group", description: "Host and admin accounts" },
  { id: "social", label: "Social Login", icon: "account_circle", description: "Google and Facebook sign-in for singers" },
  { id: "oidc", label: "SSO / OIDC", icon: "link", description: "Single sign-on for hosts and admins" },
];

function isAdminSection(value: unknown): value is AdminSection {
  return ADMIN_SECTIONS.some((section) => section.id === value);
}

function loadAdminSection(): AdminSection {
  if (typeof window === "undefined") return "overview";
  const fromHash = window.location.hash.replace(/^#/, "");
  if (isAdminSection(fromHash)) return fromHash;
  try {
    const stored = window.localStorage.getItem(ADMIN_SECTION_STORAGE_KEY);
    return isAdminSection(stored) ? stored : "overview";
  } catch {
    return "overview";
  }
}

const getUserDisplayName = (user: Pick<ManagedUser, 'username' | 'display_name' | 'singer_display_name'>) =>
  user.singer_display_name?.trim() || user.display_name?.trim() || user.username;

export default function Admin() {
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
            {activeSection === "overview" && (
              <>
            {/* Stats Card */}
            <div className="card">
              <h2 style={{ margin: "0 0 20px", fontSize: 20 }}><MaterialIcon name="bar_chart" style={{ fontSize: 24, verticalAlign: 'text-bottom', marginRight: 8 }} />System Statistics</h2>
              <div className="stats-grid">
                <div className="stat-pill">
                  <MaterialIcon name="mic_external_on" className="stat-icon" />
                  <span className="stat-value">{stats?.artists ??  "—"}</span>
                  <span className="stat-label">Artists</span>
                </div>
                <div className="stat-pill">
                  <MaterialIcon name="music_note" className="stat-icon" />
                  <span className="stat-value">{stats?.tracks ?? "—"}</span>
                  <span className="stat-label">Tracks</span>
                </div>
                <div className="stat-pill">
                  <MaterialIcon name="queue_music" className="stat-icon" />
                  <span className="stat-value">{stats?.queued ?? "—"}</span>
                  <span className="stat-label">Queued</span>
                </div>
                <div className="stat-pill">
                  <MaterialIcon name="schedule" className="stat-icon" />
                  <span className="stat-value" style={{ fontSize: 14 }}>
                    {stats?.lastScan?. finishedAt
                      ? new Date(stats.lastScan. finishedAt).toLocaleDateString()
                      : "Never"}
                  </span>
                  <span className="stat-label">Last Scan</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 20 }}>
                <button
                  className="btn-icon primary"
                  onClick={scanAll}
                  disabled={busy || !auth.sessionToken || !auth.isLoggedIn}
                  title="Scan all libraries"
                  aria-label="Scan all libraries"
                >
                  <MaterialIcon name="search" />
                </button>
                <button
                  className="btn-icon danger"
                  onClick={clearDb}
                  disabled={busy || !auth.sessionToken || !auth.isLoggedIn}
                  title="Clear database"
                  aria-label="Clear database"
                >
                  <MaterialIcon name="delete" />
                </button>
                <button
                  className="btn-icon"
                  onClick={refreshStats}
                  disabled={! auth.sessionToken || !auth.isLoggedIn}
                  title="Refresh stats"
                  aria-label="Refresh stats"
                >
                  <MaterialIcon name="refresh" />
                </button>
              </div>
            </div>
            <div className="admin-section-tiles">
              {visibleSections.filter((section) => section.id !== "overview").map((section) => (
                <button key={section.id} type="button" className="admin-section-tile" onClick={() => setActiveSection(section.id)}>
                  <MaterialIcon name={section.icon} className="admin-section-tile-icon" />
                  <span className="admin-section-tile-text">
                    <strong>{section.label}</strong>
                    <span>{section.description}</span>
                  </span>
                  <MaterialIcon name="chevron_right" className="admin-section-tile-chevron" />
                </button>
              ))}
            </div>
              </>
            )}

            {activeSection === "libraries" && (
              <>
            {/* Media Libraries Card */}
            <div className="card">
              <div className="card-header">
                <h2><MaterialIcon name="library_music" style={{ fontSize: 24, verticalAlign: 'text-bottom', marginRight: 8 }} />Media Libraries</h2>
              </div>
              
              <div className="card-content">
                <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    className="btn-icon primary"
                    title="Add media library"
                    aria-label="Add media library"
                    onClick={() => {
                      resetLibraryForm();
                      setShowAddLibraryModal(true);
                    }}
                    disabled={!auth.sessionToken || !auth.isLoggedIn}
                  >
                    <MaterialIcon name="add" />
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
                          <div className="library-path"><MaterialIcon name="folder" style={{ fontSize: 16, verticalAlign: 'text-bottom', marginRight: 4 }} />{l.path}</div>
                          <div className="library-path">
                            <MaterialIcon name="sell" style={{ fontSize: 16, verticalAlign: 'text-bottom', marginRight: 4 }} />{LIBRARY_PARSE_MODE_OPTIONS.find((option) => option.value === l.parseMode)?.label ?? l.parseMode}
                          </div>
                        </div>
                        <div className="library-actions">
                          <button
                            className="btn-icon primary"
                            onClick={() => scanOne(l.id)}
                            disabled={busy || !auth.sessionToken || !auth.isLoggedIn}
                            title="Scan this library"
                          >
                            <MaterialIcon name="search" />
                          </button>
                          <button
                            className="btn-icon danger"
                            onClick={() => deleteLibrary(l.id)}
                            disabled={busy || !auth.sessionToken || !auth.isLoggedIn}
                            title="Remove library"
                          >
                            <MaterialIcon name="delete" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <MaterialIcon name="folder" className="empty-icon" />
                  <div className="empty-text">No libraries configured yet</div>
                  <div className="empty-subtext">Use the add button to create your first media library</div>
                </div>
              )}
              </div>
            </div>
              </>
            )}

            {activeSection === "break" && (
              <>
            {/* Break Music Card */}
            <div className="card">
              <div className="card-header">
                <h2><MaterialIcon name="music_note" style={{ fontSize: 24, verticalAlign: 'text-bottom', marginRight: 8 }} />Break Music</h2>
              </div>

              <div className="card-content">
                <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button
                      className="btn-icon primary"
                      onClick={() => scanBreakMusic()}
                      disabled={busy}
                      title="Scan all break music folders"
                    >
                      <MaterialIcon name="search" />
                    </button>
                    <button
                      className="btn-icon danger"
                      onClick={clearBreakMusicDb}
                      disabled={busy}
                      title="Clear break music tracks from database"
                    >
                      <MaterialIcon name="cleaning_services" />
                    </button>
                  </div>
                  <button
                    className="btn-icon primary"
                    onClick={() => {
                      resetBreakFolderForm();
                      setShowAddBreakFolderModal(true);
                    }}
                    disabled={!auth.sessionToken || !auth.isLoggedIn}
                    title="Add break music folder"
                    aria-label="Add break music folder"
                  >
                    <MaterialIcon name="add" />
                  </button>
                </div>

                <div style={{
                  background: "var(--color-bg-secondary)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 16
                }}>
                  <h3 style={{ margin: "0 0 12px", fontSize: 16 }}><MaterialIcon name="save" style={{ fontSize: 18, verticalAlign: 'text-bottom', marginRight: 6 }} />Saved Playlists Folder</h3>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      className="form-input"
                      value={breakPlaylistsFolder}
                      onChange={(e) => setBreakPlaylistsFolder(e.target.value)}
                      placeholder="/media/playlists"
                    />
                    <button
                      className="btn-icon"
                      onClick={openBreakPlaylistsBrowser}
                      disabled={!auth.sessionToken || !auth.isLoggedIn}
                      title="Browse playlist folders"
                    >
                      <MaterialIcon name="folder" />
                    </button>
                    <button
                      className="btn-icon primary"
                      onClick={handleBreakPlaylistsFolderChange}
                      disabled={busy || !breakPlaylistsFolder.trim()}
                      title="Save playlists folder"
                    >
                      <MaterialIcon name="save" />
                    </button>
                  </div>
                </div>

                {breakFolders.length > 0 ? (
                  <div className="library-list">
                    {breakFolders.map((f) => (
                      <div key={f.id} className="library-item">
                        <div className="library-header">
                          <div className="library-info">
                            <div className="library-name">{f.name}</div>
                            <div className="library-path"><MaterialIcon name="folder" style={{ fontSize: 16, verticalAlign: 'text-bottom', marginRight: 4 }} />{f.path}</div>
                          </div>
                          <div className="library-actions">
                            <button
                              className="btn-icon primary"
                              onClick={() => scanBreakMusic(f.id)}
                              disabled={busy}
                              title="Scan this folder"
                            >
                              <MaterialIcon name="search" />
                            </button>
                            <button
                              className="btn-icon danger"
                              onClick={() => deleteBreakFolder(f.id)}
                              disabled={busy}
                              title="Remove folder"
                            >
                              <MaterialIcon name="delete" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <MaterialIcon name="music_note" className="empty-icon" />
                    <div className="empty-text">No break music folders configured</div>
                  </div>
                )}
              </div>
            </div>
              </>
            )}

            {activeSection === "system" && (
              <>
            {/* System Settings Card */}
            <div className="card">
              <div className="card-header">
                <h2><MaterialIcon name="settings" style={{ fontSize: 24, verticalAlign: 'text-bottom', marginRight: 8 }} />System Settings</h2>
              </div>
              
              <div className="card-content">
                {/* Combined Library & Request Settings */}
                <div style={{
                  background: "var(--color-bg-secondary)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 16
                }}>
                  <h3 style={{ margin: "0 0 12px", fontSize: 16 }}><MaterialIcon name="library_music" style={{ fontSize: 18, verticalAlign: 'text-bottom', marginRight: 6 }} />Library Availability & Requests</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={requestAcceptance === "disabled" || (!localLibraryEnabled && !externalLibraryEnabled)}
                        onChange={(e) => {
                          const disabled = e.target.checked;
                          void (async () => {
                            await handleRequestAcceptanceChange(disabled ? "disabled" : "local");
                            if (!disabled) {
                              // When unchecking disabled, enable local library by default
                              await handleLibraryToggle("local", true);
                              return;
                            }
                            await Promise.all([
                              handleLibraryToggle("local", false),
                              handleLibraryToggle("external", false),
                            ]);
                          })();
                        }}
                        disabled={!auth.sessionToken || !auth.isLoggedIn}
                        style={{ width: 18, height: 18 }}
                      />
                      <span style={{ fontSize: 14 }}>Disabled (no guest requests)</span>
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={localLibraryEnabled}
                        onChange={(e) => handleLibraryToggle("local", e.target.checked)}
                        disabled={!auth.sessionToken || !auth.isLoggedIn}
                        style={{ width: 18, height: 18 }}
                      />
                      <span style={{ fontSize: 14 }}>Enable Local Library</span>
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={externalLibraryEnabled}
                        onChange={(e) => handleLibraryToggle("external", e.target.checked)}
                        disabled={!auth.sessionToken || !auth.isLoggedIn}
                        style={{ width: 18, height: 18 }}
                      />
                      <span style={{ fontSize: 14 }}>Enable External Library (Karaoke Nerds)</span>
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: localLibraryEnabled ? "pointer" : "not-allowed", opacity: localLibraryEnabled ? 1 : 0.6 }}>
                      <input
                        type="checkbox"
                        checked={localBrowseEnabled}
                        onChange={(e) => handleLocalBrowseToggle(e.target.checked)}
                        disabled={!auth.sessionToken || !auth.isLoggedIn || !localLibraryEnabled}
                        style={{ width: 18, height: 18 }}
                      />
                      <span style={{ fontSize: 14 }}>Show Local Library Browse on Request Page</span>
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 14 }}>Request Page Theme</span>
                      <select
                        className="form-input"
                        style={{ width: "auto", minWidth: 160, padding: "8px 12px" }}
                        value={requestTheme}
                        onChange={(e) => void handleRequestThemeChange(e.target.value as ThemeId)}
                        disabled={!auth.sessionToken || !auth.isLoggedIn}
                      >
                        {THEMES.map((theme) => (
                          <option key={theme.id} value={theme.id}>{theme.label}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--color-text-muted)" }}>
                    Control which libraries are available for searching and requesting. When both are disabled, guests cannot request songs. Host can always add songs manually.
                  </p>
                </div>

                {/* yt-dlp Section */}
                <div style={{
                  background: "var(--color-bg-secondary)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 16
                }}>
                  <h3 style={{ margin: "0 0 12px", fontSize: 16 }}><MaterialIcon name="download" style={{ fontSize: 18, verticalAlign: 'text-bottom', marginRight: 6 }} />yt-dlp Integration</h3>
                  
                  {/* Allow Downloads Toggle */}
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={allowDownloads}
                        onChange={(e) => handleAllowDownloadsToggle(e.target.checked)}
                        disabled={!auth.sessionToken || !auth.isLoggedIn}
                        style={{ width: 18, height: 18 }}
                      />
                      <span style={{ fontSize: 14, fontWeight: 500 }}>Allow Downloads</span>
                    </label>
                    <p style={{ margin: "4px 0 0 26px", fontSize: 13, color: "var(--color-text-muted)" }}>
                      Enable downloading of external content using yt-dlp
                    </p>
                  </div>

                  {/* yt-dlp content - disabled if downloads not allowed */}
                  <div className={!allowDownloads ? 'disabled-overlay' : ''}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                      <span style={{ color: "var(--color-text-secondary)", fontSize: 14 }}>
                        Version: {ytdlpVersion || "Checking..."}
                      </span>
                      <button
                        className="btn-icon primary"
                        onClick={updateYtdlp}
                        disabled={ytdlpUpdating || !auth.sessionToken || !auth.isLoggedIn || !allowDownloads}
                        title={ytdlpUpdating ? "Updating yt-dlp" : "Update yt-dlp"}
                        aria-label={ytdlpUpdating ? "Updating yt-dlp" : "Update yt-dlp"}
                        aria-busy={ytdlpUpdating}
                      >
                        {ytdlpUpdating ? (
                          <>
                            <span className="loading-spinner" />
                          </>
                        ) : (
                          <MaterialIcon name="sync" />
                    )}
                  </button>
                </div>
                
                <div className="form-group">
                  <label className="form-label">Download Location</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      className="form-input"
                      placeholder="/media/downloads"
                      value={downloadLocation}
                      onChange={(e) => setDownloadLocation(e.target.value)}
                      disabled={!auth.sessionToken || !auth.isLoggedIn || !allowDownloads}
                    />
                    <button
                      className="btn-icon"
                      onClick={openDownloadBrowser}
                      disabled={!auth.sessionToken || !auth.isLoggedIn || !allowDownloads}
                      title="Browse folders"
                      aria-label="Browse download folders"
                    >
                      <MaterialIcon name="folder" />
                    </button>
                    <button
                      className="btn-icon primary"
                      onClick={scanDownloadLocation}
                      disabled={!auth.sessionToken || !auth.isLoggedIn || !allowDownloads}
                      title="Scan download location for new files and remove missing ones"
                      aria-label="Scan download location"
                    >
                      <MaterialIcon name="search" />
                    </button>
                    <button
                      className="btn-icon success"
                      onClick={handleDownloadLocationChange}
                      disabled={!auth.sessionToken || !auth.isLoggedIn || !allowDownloads}
                      title="Save download location"
                      aria-label="Save download location"
                    >
                      <MaterialIcon name="check" />
                    </button>
                  </div>
                </div>
                  </div>
              </div>

              {/* Image Uploads */}
              <div style={{
                background: "var(--color-bg-secondary)",
                border: "1px solid var(--color-border)",
                borderRadius: 12,
                padding: 16,
                marginBottom: 16
              }}>
                <h3 style={{ margin: "0 0 12px", fontSize: 16 }}><MaterialIcon name="image" style={{ fontSize: 18, verticalAlign: 'text-bottom', marginRight: 6 }} />Image Uploads</h3>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Image Upload Directory</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      className="form-input"
                      placeholder="/media/images"
                      value={imageUploadsDir}
                      onChange={(e) => setImageUploadsDir(e.target.value)}
                      disabled={!auth.sessionToken || !auth.isLoggedIn}
                    />
                    <button
                      className="btn-icon"
                      onClick={openImageUploadsBrowser}
                      disabled={!auth.sessionToken || !auth.isLoggedIn}
                      title="Browse image upload folders"
                      aria-label="Browse image upload folders"
                    >
                      <MaterialIcon name="folder" />
                    </button>
                    <button
                      className="btn-icon success"
                      onClick={handleImageUploadsDirChange}
                      disabled={!auth.sessionToken || !auth.isLoggedIn || !imageUploadsDir.trim()}
                      title="Save image upload directory"
                      aria-label="Save image upload directory"
                    >
                      <MaterialIcon name="check" />
                    </button>
                  </div>
                  <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--color-text-muted)" }}>
                    Player background images uploaded from the Host page are stored here and served through the app as image references.
                  </p>
                </div>
              </div>

              {/* Background Tasks */}
              <div style={{
                background: "var(--color-bg-secondary)",
                border: "1px solid var(--color-border)",
                borderRadius: 12,
                padding: 16,
                marginBottom: 16
              }}>
                <h3 style={{ margin: "0 0 12px", fontSize: 16 }}><MaterialIcon name="sync" style={{ fontSize: 18, verticalAlign: 'text-bottom', marginRight: 6 }} />Background Tasks</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={backgroundTasksEnabled}
                      onChange={(e) => handleBackgroundTasksToggle(e.target.checked)}
                      disabled={!auth.sessionToken || !auth.isLoggedIn}
                      style={{ width: 18, height: 18 }}
                    />
                    <span style={{ fontSize: 14 }}>Enable duration processing task</span>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={backgroundMediaScanEnabled}
                      onChange={(e) => handleSpecificBackgroundTaskToggle(
                        "admin.background_media_scan_enabled",
                        e.target.checked,
                        setBackgroundMediaScanEnabled,
                        "Background media library scan"
                      )}
                      disabled={!auth.sessionToken || !auth.isLoggedIn}
                      style={{ width: 18, height: 18 }}
                    />
                    <span style={{ fontSize: 14 }}>Enable periodic media library scan</span>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={backgroundDownloadScanEnabled}
                      onChange={(e) => handleSpecificBackgroundTaskToggle(
                        "admin.background_download_scan_enabled",
                        e.target.checked,
                        setBackgroundDownloadScanEnabled,
                        "Background download folder scan"
                      )}
                      disabled={!auth.sessionToken || !auth.isLoggedIn}
                      style={{ width: 18, height: 18 }}
                    />
                    <span style={{ fontSize: 14 }}>Enable periodic download folder scan</span>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={backgroundBreakMusicScanEnabled}
                      onChange={(e) => handleSpecificBackgroundTaskToggle(
                        "admin.background_break_music_scan_enabled",
                        e.target.checked,
                        setBackgroundBreakMusicScanEnabled,
                        "Background break music scan"
                      )}
                      disabled={!auth.sessionToken || !auth.isLoggedIn}
                      style={{ width: 18, height: 18 }}
                    />
                    <span style={{ fontSize: 14 }}>Enable periodic break music scan</span>
                  </label>
                </div>
                <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--color-text-muted)" }}>
                  Each task runs independently in the background. Duration processing fills in missing track lengths, while the scan tasks periodically look for new or removed files in the configured media, download, and break music folders.
                </p>
              </div>

              {/* Logging Level */}
              <div style={{
                background: "var(--color-bg-secondary)",
                border: "1px solid var(--color-border)",
                borderRadius: 12,
                padding: 16
              }}>
                <h3 style={{ margin: "0 0 12px", fontSize: 16 }}><MaterialIcon name="list_alt" style={{ fontSize: 18, verticalAlign: 'text-bottom', marginRight: 6 }} />Server Logging</h3>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <label className="form-label" style={{ margin: 0, whiteSpace: "nowrap" }}>Log Level</label>
                  <select
                    className="form-input"
                    value={logLevel}
                    onChange={(e) => handleLogLevelChange(e.target.value as 'error' | 'warning' | 'info' | 'verbose')}
                    disabled={!auth.sessionToken || !auth.isLoggedIn}
                    style={{ cursor: "pointer", maxWidth: 200 }}
                  >
                    <option value="error">error</option>
                    <option value="warning">warning</option>
                    <option value="info">info</option>
                    <option value="verbose">verbose</option>
                  </select>
                </div>
              </div>
              </div>
            </div>
              </>
            )}

            {activeSection === "gateway" && (
              <>
            {/* Remote Requests Gateway Card */}
            {stationMode && (
              <div className="card">
                <div className="card-header">
                  <h2><MaterialIcon name="cloud_sync" style={{ fontSize: 24, verticalAlign: 'text-bottom', marginRight: 8 }} />Remote Requests Gateway</h2>
                </div>
                <div className="card-content">
                  <p style={{ margin: "0 0 16px", color: "var(--color-text-muted)", fontSize: 14 }}>
                    Configure the public Remote Requests Gateway that will mirror the Station catalog and forward singer requests back to this local Station.
                  </p>
                  <div className="form-group">
                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={remoteGatewayEnabled}
                        onChange={(e) => setRemoteGatewayEnabled(e.target.checked)}
                        disabled={!auth.sessionToken || !auth.isLoggedIn}
                        style={{ width: 18, height: 18 }}
                      />
                      <span className="form-label" style={{ margin: 0 }}>Enable Remote Requests Gateway</span>
                    </label>
                    <p style={{ margin: "6px 0 0 26px", color: "var(--color-text-muted)", fontSize: 13 }}>
                      When enabled, Station request links and the QR code point to the Gateway URL instead of the local Requests page.
                    </p>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Gateway URL</label>
                    <input
                      className="form-input"
                      type="url"
                      placeholder="https://requests.example.com"
                      value={remoteGatewayUrl}
                      onChange={(e) => setRemoteGatewayUrl(e.target.value)}
                      disabled={!auth.sessionToken || !auth.isLoggedIn}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Auto-sync Poll Interval (seconds)</label>
                    <input
                      className="form-input"
                      type="number"
                      min={2}
                      step={1}
                      value={remoteGatewayPollInterval}
                      onChange={(e) => setRemoteGatewayPollInterval(Number(e.target.value))}
                      disabled={!auth.sessionToken || !auth.isLoggedIn}
                    />
                    <p style={{ margin: "6px 0 0", color: "var(--color-text-muted)", fontSize: 13 }}>
                      Station polls the Gateway for new requests and refreshes My Queue automatically at this interval.
                    </p>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Station API Token</label>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input
                        className="form-input"
                        type="text"
                        placeholder="Generate a token for Station/Gateway API auth"
                        value={remoteGatewayToken}
                        onChange={(e) => setRemoteGatewayToken(e.target.value)}
                        disabled={!auth.sessionToken || !auth.isLoggedIn}
                        autoComplete="off"
                        spellCheck={false}
                      />
                      <button
                        className="btn"
                        type="button"
                        onClick={generateRemoteGatewayToken}
                        disabled={!auth.sessionToken || !auth.isLoggedIn}
                      >
                        Generate
                      </button>
                      <button
                        className="btn"
                        type="button"
                        onClick={copyRemoteGatewayToken}
                        disabled={!auth.sessionToken || !auth.isLoggedIn || !remoteGatewayToken}
                      >
                        Copy
                      </button>
                    </div>
                    <p style={{ margin: "6px 0 0", color: "var(--color-text-muted)", fontSize: 13 }}>
                      Use this shared token on the Gateway to authenticate catalog sync and request bridge API calls.
                    </p>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    <button
                      className="btn primary"
                      type="button"
                      onClick={saveRemoteGatewaySettings}
                      disabled={!auth.sessionToken || !auth.isLoggedIn || remoteGatewayBusy}
                    >
                      Save Gateway Settings
                    </button>
                    <button
                      className="btn"
                      type="button"
                      onClick={testRemoteGatewayConnection}
                      disabled={!auth.sessionToken || !auth.isLoggedIn || remoteGatewayBusy}
                    >
                      {remoteGatewayBusy ? "Working..." : "Test Connection"}
                    </button>
                    <button
                      className="btn success"
                      type="button"
                      onClick={syncRemoteGatewayNow}
                      disabled={!auth.sessionToken || !auth.isLoggedIn || remoteGatewayBusy}
                    >
                      Sync Now
                    </button>
                  </div>
                  {remoteGatewayStatus && (
                    <div style={{
                      marginTop: 16,
                      padding: 12,
                      border: "1px solid var(--color-border)",
                      borderRadius: 12,
                      background: "var(--color-bg-secondary)",
                      color: remoteGatewayStatus.ok === false ? "var(--color-danger)" : "var(--color-text-secondary)",
                      fontSize: 13,
                    }}>
                      {remoteGatewayStatus.ok === false ? (
                        <div><strong>Gateway error:</strong> {remoteGatewayStatus.error}</div>
                      ) : (
                        <div style={{ display: "grid", gap: 4 }}>
                          <div><strong>Gateway connected:</strong> {remoteGatewayStatus.gatewayUrl}</div>
                          <div><strong>Gateway catalog:</strong> {remoteGatewayStatus.status?.tracks ?? 0} tracks</div>
                          <div><strong>Pending requests:</strong> {remoteGatewayStatus.status?.pendingRequests ?? 0}</div>
                          {remoteGatewayStatus.catalog && (
                            <div><strong>Last sync:</strong> {remoteGatewayStatus.catalog.accepted ?? 0} tracks accepted, {remoteGatewayStatus.pulledRequests?.queued ?? 0} requests queued, {remoteGatewayStatus.queueActions?.applied ?? 0} queue actions applied, {remoteGatewayStatus.queue?.accepted ?? 0} queue items pushed</div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
              </>
            )}

            {activeSection === "users" && (
              <>
            {/* User Manager Card */}
            <div className="card">
              <div className="card-header">
                <h2><MaterialIcon name="group" style={{ fontSize: 24, verticalAlign: 'text-bottom', marginRight: 8 }} />User Manager</h2>
              </div>
              <div className="card-content">
                {usersLoadError && (
                  <div className="error-msg" role="alert">
                    {usersLoadError} <button className="btn ghost" onClick={() => void refreshUsers()}>Retry</button>
                  </div>
                )}
                <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    className="btn-icon primary"
                    title="Create new user"
                    aria-label="Create new user"
                    onClick={() => { setShowCreateUser(true); setUserError(""); }}
                  >
                    <MaterialIcon name="add" />
                  </button>
                </div>

                {/* Create User Form */}
                {showCreateUser && (
                  <div style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 16, marginBottom: 20 }}>
                    <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Create New User</h3>
                    <form onSubmit={handleCreateUser}>
                      <div className="form-group">
                        <label className="form-label">Username</label>
                        <input className="form-input" type="text" value={newUserUsername} onChange={(e) => setNewUserUsername(e.target.value)} required minLength={3} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Password</label>
                        <input className="form-input" type="password" value={newUserPassword} onChange={(e) => setNewUserPassword(e.target.value)} required minLength={8} placeholder="At least 8 characters" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Role</label>
                        <select className="form-input" value={newUserRole} onChange={(e) => setNewUserRole(e.target.value as 'admin' | 'user')} style={{ cursor: 'pointer' }}>
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                      {userError && <div className="error-msg">{userError}</div>}
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn primary" type="submit">Create</button>
                        <button className="btn ghost" type="button" onClick={() => { setShowCreateUser(false); setUserError(""); }}>Cancel</button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Users List */}
                {users.length === 0 ? (
                  <div className="empty-state">
                    <MaterialIcon name="person" className="empty-icon" />
                    <div className="empty-text">No users yet</div>
                  </div>
                ) : (
                  <div className="library-list">
                    {users.map((user) => (
                      <div key={user.id} className="library-item">
                        <div className="library-header">
                          <div style={{ flexShrink: 0, marginRight: 12 }}>
                            <SingerAvatar name={getUserDisplayName(user)}
                              profile={{ imageUrl: user.picture, focusX: 50, focusY: 50 }} size={40} />
                          </div>
                          <div className="library-info">
                            <div className="library-name" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              {getUserDisplayName(user)}
                              <span style={{
                                fontSize: 11, padding: '2px 8px', borderRadius: 999,
                                background: user.role === 'admin' ? 'var(--color-accent-soft)' : 'color-mix(in srgb, var(--color-text-secondary) 20%, transparent)',
                                color: user.role === 'admin' ? 'var(--color-accent-text)' : 'var(--color-text-secondary)',
                                fontWeight: 600,
                              }}>{user.role}</span>
                              {!user.is_active && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, background: 'var(--color-danger-soft)', color: 'var(--color-danger)', fontWeight: 600 }}>inactive</span>}
                              {user.oidc_subject && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, background: 'var(--color-success-soft)', color: 'var(--color-success)', fontWeight: 600 }}>SSO</span>}
                              {user.social_provider && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, background: 'var(--color-success-soft)', color: 'var(--color-success)', fontWeight: 600 }}>{user.social_provider === 'google' ? 'Google' : 'Facebook'}</span>}
                            </div>
                            <div className="user-meta">
                              {getUserDisplayName(user) !== user.username && (
                                <span>{user.username} •</span>
                              )}
                              <span className="user-meta-date">Created: {new Date(user.created_at).toLocaleDateString()}</span>
                            </div>
                            {!!user.linkedLogins?.length && <div className="user-meta">
                              Linked sign-ins: {user.linkedLogins.map(login => `${login.provider === 'google' ? 'Google' : 'Facebook'} (${login.username})${login.isActive ? '' : ' - disabled'}`).join(', ')}
                            </div>}
                          </div>
                          <div className="library-actions">
                            <button
                              className="btn-icon"
                              title="Merge a social login into this account"
                              aria-label={`Merge singer and logins into ${getUserDisplayName(user)}`}
                              disabled={!user.is_active || !!usersLoadError}
                              onClick={() => setMergeUser(user)}
                            ><MaterialIcon name="merge" /></button>
                            <button
                              className="btn-icon"
                              title="Edit user"
                              onClick={() => {
                                setEditingUser(user);
                                setEditUserRole(user.role);
                                setEditUserActive(user.is_active);
                                setEditUserPassword("");
                                setEditUserError("");
                              }}
                            ><MaterialIcon name="edit" /></button>
                            <button
                              className="btn-icon danger"
                              title="Delete user"
                              onClick={() => handleDeleteUser(user)}
                            ><MaterialIcon name="delete" /></button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
              </>
            )}

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

              </div>
            </div>

            {showAddLibraryModal && (
              <>
                <div className="modal-backdrop" onClick={closeAddLibraryModal} />
                <div className="modal" style={{ maxWidth: 560 }}>
                  <div className="modal-header">
                    <h3 className="modal-title"><MaterialIcon name="library_music" style={{ fontSize: 22, verticalAlign: 'text-bottom', marginRight: 8 }} />Add Media Library</h3>
                    <button className="btn ghost" onClick={closeAddLibraryModal} style={{ padding: '4px 12px' }}><MaterialIcon name="close" /></button>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Library Name</label>
                    <input
                      className="form-input"
                      placeholder="e.g., Main Collection"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Folder Path</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        className="form-input"
                        placeholder="e.g., /media/karaoke"
                        value={path}
                        onChange={(e) => setPath(e.target.value)}
                      />
                      <button
                        className="btn-icon"
                        onClick={openBrowser}
                        disabled={!auth.sessionToken || !auth.isLoggedIn}
                        title="Browse folders"
                        aria-label="Browse library folders"
                      >
                        <MaterialIcon name="folder" />
                      </button>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Filename Parsing</label>
                    <select
                      className="form-input"
                      value={libraryParseMode}
                      onChange={(e) => setLibraryParseMode(e.target.value as LibraryParseMode)}
                      disabled={!auth.sessionToken || !auth.isLoggedIn}
                      style={{ cursor: 'pointer' }}
                    >
                      {LIBRARY_PARSE_MODE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <div className="library-path" style={{ marginTop: 8 }}>
                      Example: {LIBRARY_PARSE_MODE_OPTIONS.find((option) => option.value === libraryParseMode)?.example}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      className="btn primary"
                      onClick={addLibrary}
                      disabled={
                        busy ||
                        !auth.sessionToken ||
                        !auth.isLoggedIn ||
                        !name.trim() ||
                        !path.trim()
                      }
                    >
                      <MaterialIcon name="add" /> Add Library
                    </button>
                    <button className="btn ghost" onClick={closeAddLibraryModal}>
                      Cancel
                    </button>
                  </div>
                </div>
              </>
            )}

            {showAddBreakFolderModal && (
              <>
                <div className="modal-backdrop" onClick={closeAddBreakFolderModal} />
                <div className="modal" style={{ maxWidth: 560 }}>
                  <div className="modal-header">
                    <h3 className="modal-title"><MaterialIcon name="music_note" style={{ fontSize: 22, verticalAlign: 'text-bottom', marginRight: 8 }} />Add Break Music Folder</h3>
                    <button className="btn ghost" onClick={closeAddBreakFolderModal} style={{ padding: '4px 12px' }}><MaterialIcon name="close" /></button>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Folder Name</label>
                    <input
                      className="form-input"
                      placeholder="e.g., Lobby Music"
                      value={breakFolderName}
                      onChange={(e) => setBreakFolderName(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Break Music Folder Path</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        className="form-input"
                        placeholder="e.g., /media/break-music"
                        value={breakFolderPath}
                        onChange={(e) => setBreakFolderPath(e.target.value)}
                      />
                      <button
                        className="btn-icon"
                        onClick={openBreakLibraryBrowser}
                        disabled={!auth.sessionToken || !auth.isLoggedIn}
                        title="Browse folders"
                        aria-label="Browse break music folders"
                      >
                        <MaterialIcon name="folder" />
                      </button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      className="btn primary"
                      onClick={addBreakFolder}
                      disabled={busy || !breakFolderName.trim() || !breakFolderPath.trim()}
                    >
                      <MaterialIcon name="add" /> Add Folder
                    </button>
                    <button className="btn ghost" onClick={closeAddBreakFolderModal}>
                      Cancel
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Folder Browser Modal */}
            {showBrowser && (
              <>
                <div
                  className="modal-backdrop"
                  onClick={() => setShowBrowser(false)}
                />
                <div className="modal">
                  <div className="modal-header">
                    <h3 className="modal-title"><MaterialIcon name="folder" style={{ fontSize: 22, verticalAlign: 'text-bottom', marginRight: 8 }} />Select Media Folder</h3>
                    <button
                      className="btn ghost"
                      onClick={() => setShowBrowser(false)}
                      style={{ padding: "4px 12px" }}
                    >
                      <MaterialIcon name="close" />
                    </button>
                  </div>

                  <div className="browser-path">
                    <MaterialIcon name="location_on" />
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
                            </React.Fragment>
                          );
                        })}
                    </div>
                  </div>

                  {browseError && (
                    <div className="error-msg"><MaterialIcon name="warning" style={{ fontSize: 18, verticalAlign: 'text-bottom', marginRight: 6 }} />{browseError}</div>
                  )}

                  <div className="browser-container">
                    {currentBrowsePath !== "/" && (
                      <div className="folder-item" onClick={navigateUp}>
                        <MaterialIcon name="arrow_upward" className="folder-icon" />
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
                          <MaterialIcon name="folder" className="folder-icon" />
                          <span className="folder-name">{item.name}</span>
                        </div>
                      ))}

                    {folderContents.filter((item) => item.isDirectory).length ===
                      0 &&
                      !browseError && (
                        <div className="empty-state" style={{ padding: 40 }}>
                          <MaterialIcon name="folder_open" className="empty-icon" style={{ fontSize: 48 }} />
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
                      <MaterialIcon name="check" /> Select This Folder
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

            {/* Download Location Folder Browser Modal */}
            {showDownloadBrowser && (
              <>
                <div
                  className="modal-backdrop"
                  onClick={() => setShowDownloadBrowser(false)}
                />
                <div className="modal">
                  <div className="modal-header">
                    <h3 className="modal-title"><MaterialIcon name="folder" style={{ fontSize: 22, verticalAlign: 'text-bottom', marginRight: 8 }} />Select Download Folder</h3>
                    <button
                      className="btn ghost"
                      onClick={() => setShowDownloadBrowser(false)}
                      style={{ padding: "4px 12px" }}
                    >
                      <MaterialIcon name="close" />
                    </button>
                  </div>

                  <div className="browser-path">
                    <MaterialIcon name="location_on" />
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
                            </React.Fragment>
                          );
                        })}
                    </div>
                  </div>

                  {browseError && (
                    <div className="error-msg"><MaterialIcon name="warning" style={{ fontSize: 18, verticalAlign: 'text-bottom', marginRight: 6 }} />{browseError}</div>
                  )}

                  <div className="browser-container">
                    {currentBrowsePath !== "/" && (
                      <div className="folder-item" onClick={navigateUp}>
                        <MaterialIcon name="arrow_upward" className="folder-icon" />
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
                          <MaterialIcon name="folder" className="folder-icon" />
                          <span className="folder-name">{item.name}</span>
                        </div>
                      ))}

                    {folderContents.filter((item) => item.isDirectory).length ===
                      0 &&
                      !browseError && (
                        <div className="empty-state" style={{ padding: 40 }}>
                          <MaterialIcon name="folder_open" className="empty-icon" style={{ fontSize: 48 }} />
                          <div className="empty-text" style={{ fontSize: 14 }}>No subfolders in this directory</div>
                        </div>
                      )}
                  </div>

                  <div style={{ display: "flex", gap: 12 }}>
                    <input
                      className="form-input"
                      value={currentBrowsePath}
                      readOnly
                      style={{ flex: 1 }}
                    />
                    <button
                      className="btn success"
                      onClick={() => selectDownloadFolder(currentBrowsePath)}
                    >
                      <MaterialIcon name="check" /> Select This Folder
                    </button>
                    <button
                      className="btn ghost"
                      onClick={() => setShowDownloadBrowser(false)}
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
                    <h3 className="modal-title"><MaterialIcon name="lock" style={{ fontSize: 22, verticalAlign: 'text-bottom', marginRight: 8 }} />Account Settings</h3>
                    <button
                      className="btn ghost"
                      onClick={() => setShowAccountManagement(false)}
                      style={{ padding: "4px 12px" }}
                    >
                      <MaterialIcon name="close" />
                    </button>
                  </div>

                  {auth.isDefaultPassword && (
                    <div className="banner warning" style={{ marginBottom: 16 }}>
                      <MaterialIcon name="warning" style={{ fontSize: 18, verticalAlign: 'text-bottom', marginRight: 6 }} />
                      You are using the default password. Please change it for security.
                    </div>
                  )}

                  <p style={{ color: "var(--color-text-secondary)", marginBottom: 20, fontSize: 14 }}>
                    Change your username and password.
                  </p>

                  {!changingUsername && !changingPassword && (
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 20 }}>
                      <button
                        className="btn"
                        style={{ minWidth: 180, justifyContent: "center", flex: 1 }}
                        onClick={() => setChangingUsername(true)}
                      >
                        <MaterialIcon name="person" /> Change Username
                      </button>
                      <button
                        className="btn"
                        style={{ minWidth: 180, justifyContent: "center", flex: 1 }}
                        onClick={() => setChangingPassword(true)}
                      >
                        <MaterialIcon name="lock" /> Change Password
                      </button>
                    </div>
                  )}

                  {/* Username Change Section */}
                  {changingUsername && (
                    <div style={{ marginBottom: 20 }}>
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
                            <MaterialIcon name="check" /> Change Username
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
                    </div>
                  )}

                  {/* Password Change Section */}
                  {changingPassword && (
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
                          <MaterialIcon name="check" /> Change Password
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
            {/* Edit User Modal */}
            {editingUser && (
              <>
                <div className="modal-backdrop" onClick={() => setEditingUser(null)} />
                <div className="modal" style={{ maxWidth: 480 }}>
                  <div className="modal-header">
                    <h3 className="modal-title"><MaterialIcon name="edit" style={{ fontSize: 22, verticalAlign: 'text-bottom', marginRight: 8 }} />Edit User: {getUserDisplayName(editingUser)}</h3>
                    <button className="btn ghost" onClick={() => setEditingUser(null)} style={{ padding: '4px 12px' }}><MaterialIcon name="close" /></button>
                  </div>
                  <form onSubmit={handleUpdateUser}>
                    <div className="form-group">
                      <label className="form-label">Role</label>
                      <select className="form-input" value={editUserRole} onChange={(e) => setEditUserRole(e.target.value as 'admin' | 'user')} style={{ cursor: 'pointer' }}>
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                        <input type="checkbox" checked={editUserActive} onChange={(e) => setEditUserActive(e.target.checked)} style={{ width: 16, height: 16 }} />
                        <span className="form-label" style={{ margin: 0 }}>Active</span>
                      </label>
                    </div>
                    <div className="form-group">
                      <label className="form-label">New Password (leave blank to keep current)</label>
                      <input className="form-input" type="password" value={editUserPassword} onChange={(e) => setEditUserPassword(e.target.value)} placeholder="New password (optional)" autoComplete="new-password" />
                    </div>
                    {editUserError && <div className="error-msg">{editUserError}</div>}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn primary" type="submit">Save Changes</button>
                      <button className="btn ghost" type="button" onClick={() => setEditingUser(null)}>Cancel</button>
                    </div>
                  </form>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
