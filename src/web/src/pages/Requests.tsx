import {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { api } from "../api";
import { useAuth } from "../auth-context";
import SingerAvatar, { type SingerProfile, type ProfileCrop } from "../components/SingerAvatar";
import ProfileImageEditor from "../components/ProfileImageEditor";
import ProfileDialog from "../components/ProfileDialog";
import ThemePicker from "../components/ThemePicker";
import { downloadJsonFile, readJsonFile, safeHistoryFilename } from "../utils/jsonFiles";
import {
  BROWSE_LETTERS,
  SINGER_UUID_STORAGE_KEY,
  VENUE_THEME_CACHE_KEY,
  createSingerUuid,
  formatCount,
  getOrCreateSingerUuid,
  shouldHandleEnterKey,
  toLocalSearchTrack,
} from "./requests/helpers";
import type { SelfSingerProfileResponse } from "./requests/types";
import CombinedVersionPickerDialog from "./requests/CombinedVersionPickerDialog";
import LyricsDialog from "./requests/LyricsDialog";
import SongResultCard from "./requests/SongResultCard";
import { useMyQueue } from "./requests/useMyQueue";
import MyQueueSheet from "./requests/MyQueueSheet";
import { useSongSearch } from "./requests/useSongSearch";
import { useSongActions } from "./requests/useSongActions";
import {
  applyTheme,
  clearTheme,
  loadRequestThemeChoice,
  loadThemeId,
  REQUEST_THEME_STORAGE_KEY,
  type RequestThemeChoice,
  resolveRequestTheme,
  saveThemeId,
  THEMES,
} from "../theme";
import SocialProviderIcon from "../components/SocialProviderIcon";
import PublicLegalLinks from "../components/PublicLegalLinks";
import AppVersion from "../components/AppVersion";
import {
  exchangeSocialLogin,
  startSocialLogin,
  takeSocialLoginCallback,
  visibleSocialProviders,
  SOCIAL_PROVIDER_NAMES,
  type SocialProvider,
  type SocialPublicConfig,
} from "../social-login";
import "./Requests.css";

/**
 * Normalize an artist name for grouping:
 * - Lowercase
 * - Invert "Artist, The" / "Artist, A" / "Artist, An" → "the artist" etc.
 */

export default function Requests() {
  const auth = useAuth();
  const [requestedBy, setRequestedBy] = useState(() => (localStorage.getItem("karaoke-name") ?? "").trim());
  const [singerUuid, setSingerUuid] = useState(() => getOrCreateSingerUuid());
  const signedInRequestName = auth.isLoggedIn ? (
    auth.profile.displayName ||
    auth.profile.username ||
    ""
  ).trim() : "";
  const isSignedInRequester = Boolean(auth.sessionToken);
  const requestSingerUuid = isSignedInRequester ? undefined : singerUuid;
  const requesterHeaders = useMemo<Record<string, string>>(
    () => {
      const headers: Record<string, string> = {};
      if (isSignedInRequester) {
        headers["x-session-token"] = auth.sessionToken;
      }
      return headers;
    },
    [auth.sessionToken, isSignedInRequester],
  );
  const requesterJsonHeaders = useMemo<Record<string, string>>(
    () => ({ ...requesterHeaders, "Content-Type": "application/json" }),
    [requesterHeaders],
  );
  const buildRequesterParams = useCallback(() => {
    const params = new URLSearchParams({ name: requestedBy.trim() });
    if (requestSingerUuid) {
      params.set("singerUuid", requestSingerUuid);
    }
    return params;
  }, [requestedBy, requestSingerUuid]);
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  // Requester's own queue items
  const historyImportInputRef = useRef<HTMLInputElement | null>(null);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const profileButtonRef = useRef<HTMLButtonElement | null>(null);
  const profileLoadRef = useRef(0);
  const requesterSessionRef = useRef(auth.sessionToken);
  const requesterSessionChanged = requesterSessionRef.current !== auth.sessionToken;
  const myQueueState = useMyQueue({
    requestedBy,
    requesterSessionChanged,
    requestSingerUuid,
    requesterHeaders,
    requesterJsonHeaders,
    buildRequesterParams,
    // showToast is declared further down; call it lazily from the hook's async handlers.
    showToast: (message, type) => showToast(message, type),
  });
  const {
    myQueue,
    setMyQueue,
    setMyQueueLoading,
    setMyQueueOpen,
    setRevealedRemoveQueueId,
    queueLoadRef,
    loadMyQueue,
  } = myQueueState;
  // Name confirmation flow
  const [nameConfirmed, setNameConfirmed] = useState(false);
  const [nameError, setNameError] = useState("");
  const [nameModalOpen, setNameModalOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState(requestedBy);
  const [savingName, setSavingName] = useState(false);
  const [socialConfig, setSocialConfig] = useState<SocialPublicConfig | null>(null);
  const [socialBusy, setSocialBusy] = useState(() => new URLSearchParams(window.location.search).has("social_code"));
  const [socialError, setSocialError] = useState("");
  const socialCallbackHandled = useRef(false);
  const socialProviders = isSignedInRequester ? [] : visibleSocialProviders(socialConfig);
  const [singerProfile, setSingerProfile] = useState<SingerProfile | null>(null);
  const [canUploadProfileImage, setCanUploadProfileImage] = useState(true);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [themeChoice, setThemeChoice] = useState<RequestThemeChoice>(() => loadRequestThemeChoice());
  // Last venue theme seen on this device, so the page doesn't flash Midnight while settings load.
  const [venueTheme, setVenueTheme] = useState<string>(() => loadThemeId(globalThis.localStorage, VENUE_THEME_CACHE_KEY));
  const [profilePanel, setProfilePanel] = useState<"image" | "history" | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileLoadError, setProfileLoadError] = useState("");
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Library availability from the venue's public settings
  const [localLibraryEnabled, setLocalLibraryEnabled] = useState(true);
  const [externalLibraryEnabled, setExternalLibraryEnabled] = useState(true);
  const [localBrowseEnabled, setLocalBrowseEnabled] = useState(true);
  const {
    q,
    setQ,
    localViewMode,
    setLocalViewMode,
    localRows,
    setLocalRows,
    karaokeNerdsRows,
    setKaraokeNerdsRows,
    selectedBrowseLetter,
    setSelectedBrowseLetter,
    selectedBrowseArtist,
    setSelectedBrowseArtist,
    browseSummary,
    setBrowseSummary,
    kindFilter,
    setKindFilter,
    searchFieldFilter,
    setSearchFieldFilter,
    showFilters,
    setShowFilters,
    fuzzySuggestions,
    setFuzzySuggestions,
    sourceFilter,
    setSourceFilter,
    searchTimeoutRef,
    browseArtistScrollYRef,
    doLocalSearch,
    doKaraokeNerdsSearch,
    isLocalBrowseMode,
    showingBrowseArtistList,
    showLocalResults,
    showKnResults,
    isLoading,
    isKnLoading,
    availableBrowseLetters,
    visibleLocalRows,
    visibleBrowseArtists,
    groupedLocalRows,
    groupedFuzzySuggestions,
    combinedSearchGroups,
    browseCombinedGroups,
    browseCategory,
    setBrowseCategory,
  } = useSongSearch({ localLibraryEnabled, externalLibraryEnabled, localBrowseEnabled });
  const {
    addingLocal,
    lyricsPopupOpen,
    setLyricsPopupOpen,
    lyricsData,
    combinedVersionPicker,
    setCombinedVersionPicker,
    lyricsPopupRef,
    fetchLyrics,
    enqueueLocal,
    enqueueKaraokeNerds,
    songResultActions,
  } = useSongActions({
    requestedBy,
    requestSingerUuid,
    requesterJsonHeaders,
    requireName: () => {
      setShowNamePrompt(true);
      setNameConfirmed(false);
      openNameDialog();
    },
    // showToast is declared further down; call it lazily from the hook's async handlers.
    showToast: (message, type) => showToast(message, type),
  });

  useEffect(() => {
    let cancelled = false;
    const onPageShow = (event: PageTransitionEvent) => { if (event.persisted) setSocialBusy(false); };
    window.addEventListener("pageshow", onPageShow);
    api("/api/auth/social/config")
      .then((config: SocialPublicConfig) => { if (!cancelled) setSocialConfig(config); })
      .catch((error: unknown) => console.error("Could not load social sign-in options:", error));
    return () => { cancelled = true; window.removeEventListener("pageshow", onPageShow); };
  }, []);

  useEffect(() => {
    if (socialCallbackHandled.current) return;
    socialCallbackHandled.current = true;
    const callback = takeSocialLoginCallback();
    if (!callback) return;
    if (callback.error) {
      setSocialError(callback.error);
      setSocialBusy(false);
      setNameModalOpen(true);
      return;
    }
    setSocialBusy(true);
    exchangeSocialLogin(callback.code, api)
      .then((session) => {
        auth.setSessionToken(session.sessionToken);
        auth.setIsLoggedIn(true);
        auth.setRole(session.role);
        auth.setProfile({ username: session.username, displayName: session.displayName, picture: session.picture });
        setSocialError("");
        setNameModalOpen(false);
      })
      .catch((error: unknown) => {
        setSocialError(error instanceof Error ? error.message : "Could not sign in. Please try again.");
        setNameModalOpen(true);
      })
      .finally(() => setSocialBusy(false));
  }, []);

  async function signInWithSocial(provider: SocialProvider) {
    if (socialBusy || savingName) return;
    setSocialBusy(true);
    setSocialError("");
    try {
      window.location.assign(await startSocialLogin(provider, api));
    } catch (error) {
      setSocialError(error instanceof Error ? error.message : "Could not start sign-in. Please try again.");
      setSocialBusy(false);
    }
  }

  useEffect(() => {
    // Hide navigation
    const nav = document.querySelector("nav");
    const prevNavDisplay = nav ? (nav as HTMLElement).style.display : "";
    if (nav) (nav as HTMLElement).style.display = "none";

    // Load saved name — only auto-confirm if both first and last name are present
    setSingerUuid(getOrCreateSingerUuid());
    const savedName = localStorage.getItem("karaoke-name");
    if (savedName) {
      const parts = savedName.trim().split(/\s+/);
      setRequestedBy(savedName.trim().replace(/\s+/g, " "));
      if (parts.length >= 2 && parts[0] && parts[1]) {
        setNameConfirmed(true);
      }
    }

    // Load settings for request acceptance
    async function loadSettings() {
      try {
        const settings = await api("/api/settings/public");
        const localEnabled = settings["libraries.local_enabled"] !== false;
        const externalEnabled =
          settings["libraries.external_enabled"] !== false;
        const browseEnabled =
          settings["requests.local_browse_enabled"] !== false;

        setLocalLibraryEnabled(localEnabled);
        setExternalLibraryEnabled(externalEnabled);
        setLocalBrowseEnabled(browseEnabled);
        if (settings["requests.theme"]) {
          setVenueTheme(settings["requests.theme"]);
          saveThemeId(settings["requests.theme"], globalThis.localStorage, VENUE_THEME_CACHE_KEY);
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
        // Default to allowing everything if we can't load settings
      }
    }

    loadSettings();

    return () => {
      clearTheme();
      if (nav) (nav as HTMLElement).style.display = prevNavDisplay;
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    applyTheme(resolveRequestTheme(themeChoice, venueTheme));
  }, [themeChoice, venueTheme]);

  function changeThemeChoice(choice: RequestThemeChoice) {
    setThemeChoice(choice);
    saveThemeId(choice, globalThis.localStorage, REQUEST_THEME_STORAGE_KEY);
  }

  // Save name to localStorage
  useEffect(() => {
    if (requestedBy.trim()) {
      localStorage.setItem("karaoke-name", requestedBy.trim());
    }
  }, [requestedBy]);

  useEffect(() => {
    if (!signedInRequestName) return;

    setRequestedBy(signedInRequestName);
    setNameError("");
    setNameConfirmed(true);
    setNameModalOpen(false);
    setShowNamePrompt(false);
    localStorage.setItem("karaoke-name", signedInRequestName);
  }, [signedInRequestName]);

  useEffect(() => {
    if (requesterSessionRef.current === auth.sessionToken) return;
    requesterSessionRef.current = auth.sessionToken;
    profileLoadRef.current++;
    queueLoadRef.current++;
    setSingerProfile(null);
    setMyQueue([]);
    setMyQueueOpen(false);
    setMyQueueLoading(false);
    setProfileMenuOpen(false);
    setProfilePanel(null);
    setProfileLoading(false);
    setProfileLoadError("");
    setNameError("");
    if (auth.sessionToken) {
      setNameModalOpen(false);
    } else {
      localStorage.removeItem("karaoke-name");
      setRequestedBy("");
      setNameDraft("");
      setNameConfirmed(false);
      setNameModalOpen(true);
    }
  }, [auth.sessionToken]);

  const loadSingerProfile = useCallback(async () => {
    if (requesterSessionChanged || !nameConfirmed || !requestedBy.trim()) return;
    const request = ++profileLoadRef.current;
    setProfileLoading(true);
    setProfileLoadError("");
    try {
      const result = (await api(`/api/singers/self/profile?${buildRequesterParams().toString()}`, {
        headers: requesterHeaders,
      })) as SelfSingerProfileResponse;
      if (request === profileLoadRef.current) {
        setSingerProfile(result.profile);
        setCanUploadProfileImage(result.canUpload);
        setRequestedBy(result.displayName);
        if (isSignedInRequester && result.displayName !== signedInRequestName) {
          auth.setProfile({ displayName: result.displayName });
        }
        if (!isSignedInRequester && typeof result.singerUuid === "string") {
          localStorage.setItem(SINGER_UUID_STORAGE_KEY, result.singerUuid);
          setSingerUuid(result.singerUuid);
        }
      }
    } catch (error) {
      console.error("Failed to load singer profile:", error);
      if (request === profileLoadRef.current) setProfileLoadError(error instanceof Error ? error.message : "Could not load profile picture.");
    } finally {
      if (request === profileLoadRef.current) setProfileLoading(false);
    }
  }, [buildRequesterParams, nameConfirmed, requestedBy, requesterHeaders, isSignedInRequester, requesterSessionChanged, signedInRequestName]);

  useEffect(() => {
    if (nameModalOpen) return;
    void loadSingerProfile();
    return () => { profileLoadRef.current++; };
  }, [loadSingerProfile, nameModalOpen]);

  useEffect(() => {
    if (!profileMenuOpen) return;
    function dismiss(event: PointerEvent) {
      if (event.target instanceof Node && !profileMenuRef.current?.contains(event.target)) setProfileMenuOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setProfileMenuOpen(false);
        profileButtonRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape);
    };
  }, [profileMenuOpen]);

  // Auto-open name modal on first load if name not yet confirmed.
  // Read localStorage directly — the nameConfirmed state hasn't been set yet
  // by the init effect when this runs, so we can't rely on it here.
  useEffect(() => {
    const saved = localStorage.getItem("karaoke-name");
    const parts = (saved ?? "").trim().split(/\s+/);
    const alreadyConfirmed = parts.length >= 2 && !!parts[0] && !!parts[1];
    if (!alreadyConfirmed && !auth.sessionToken) openNameDialog();
  }, []);

  const showToast = (
    message: string,
    type: "success" | "error" = "success",
  ) => {
    const toast = document.createElement("div");
    toast.className = `toast-notification ${type}`;
    const icon = document.createElement("div");
    icon.className = "toast-icon";
    icon.textContent = type === "success" ? "✓" : "⚠";
    const text = document.createElement("div");
    text.className = "toast-message";
    text.textContent = message;
    toast.append(icon, text);
    document.body.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => {
      toast.classList.add("show");
    });

    toastTimeoutRef.current = setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => {
        if (document.body.contains(toast)) {
          document.body.removeChild(toast);
        }
      }, 300);
    }, 3000);
  };


  function openNameDialog() {
    setNameDraft(requestedBy);
    setNameError("");
    setNameModalOpen(true);
  }

  async function confirmName() {
    if (savingName || socialBusy) return;
    const name = nameDraft.trim().replace(/\s+/g, " ");
    if (name.split(" ").length < 2) {
      setNameError("Enter your first name and at least a last initial.");
      return;
    }
    setSavingName(true);
    try {
      const result = await api("/api/singers/self/name", {
        method: "POST",
        headers: requesterJsonHeaders,
        body: JSON.stringify({ name, singerUuid: requestSingerUuid }),
      });
      if (!isSignedInRequester && typeof result?.singer?.uuid === "string") {
        localStorage.setItem(SINGER_UUID_STORAGE_KEY, result.singer.uuid);
        setSingerUuid(result.singer.uuid);
      }
      const savedName = result.singer.displayName;
      setRequestedBy(savedName);
      if (isSignedInRequester) auth.setProfile({ displayName: savedName });
      setNameError("");
      setSocialError("");
      setNameConfirmed(true);
      setNameModalOpen(false);
      setShowNamePrompt(false);
    } catch (err) {
      setNameError(err instanceof Error ? err.message : "Could not save name. Please try again.");
      console.error(err);
    } finally {
      setSavingName(false);
    }
  }

  async function exportMySingerHistory() {
    const name = requestedBy.trim();
    if (!name) return;
    try {
      const data = await api(
        `/api/history/self/export?${buildRequesterParams().toString()}`,
        { headers: requesterHeaders },
      );
      downloadJsonFile(safeHistoryFilename(name), data);
      showToast("Singer history exported");
      return true;
    } catch (err) {
      showToast(err instanceof Error ? `Could not export singer history: ${err.message}` : "Could not export singer history.", "error");
      console.error(err);
      return false;
    }
  }

  async function importMySingerHistory(file: File | null | undefined) {
    const name = requestedBy.trim();
    if (!name || !file) return;
    try {
      const data = await readJsonFile(file);
      const result = await api("/api/history/self/import", {
        method: "POST",
        headers: requesterJsonHeaders,
        body: JSON.stringify({ name, singerUuid: requestSingerUuid, data }),
      });
      await loadMyQueue();
      await loadSingerProfile();
      showToast(
        `Imported ${Number(result.imported ?? 0)} history song${Number(result.imported ?? 0) === 1 ? "" : "s"}`,
      );
    } catch (err) {
      showToast("Could not import singer history.", "error");
      console.error(err);
    } finally {
      if (historyImportInputRef.current) {
        historyImportInputRef.current.value = "";
      }
    }
  }

  async function logOffSingerProfile() {
    if (isSignedInRequester) {
      await auth.handleLogout();
      return;
    }
    profileLoadRef.current++;
    setProfileMenuOpen(false);
    setProfilePanel(null);
    localStorage.removeItem("karaoke-name");
    localStorage.removeItem(SINGER_UUID_STORAGE_KEY);
    const nextUuid = createSingerUuid();
    localStorage.setItem(SINGER_UUID_STORAGE_KEY, nextUuid);
    setSingerUuid(nextUuid);
    setRequestedBy("");
    setNameConfirmed(false);
    setNameDraft("");
    setNameModalOpen(true);
    setMyQueue([]);
    setRevealedRemoveQueueId(null);
    setNameError("");
    setSingerProfile(null);
  }

  async function saveProfileImage(crop: ProfileCrop, image?: Blob) {
    const request = profileLoadRef.current;
    if (image) {
      const uploaded: SelfSingerProfileResponse = await api(
        `/api/singers/self/profile/image?${buildRequesterParams().toString()}`,
        {
          method: "POST",
          headers: { ...requesterHeaders, "Content-Type": image.type },
          body: image,
        },
      );
      if (request === profileLoadRef.current) setSingerProfile(uploaded.profile);
    }
    const result: SelfSingerProfileResponse = await api("/api/singers/self/profile/focus", {
      method: "PATCH",
      headers: requesterJsonHeaders,
      body: JSON.stringify({ name: requestedBy.trim(), singerUuid: requestSingerUuid, crop, focusX: 50, focusY: 50 }),
    });
    if (request === profileLoadRef.current) setSingerProfile(result.profile);
  }

  async function removeProfileImage() {
    const request = profileLoadRef.current;
    const result: SelfSingerProfileResponse = await api(
      `/api/singers/self/profile/image?${buildRequesterParams().toString()}`,
      { method: "DELETE", headers: requesterHeaders },
    );
    if (request === profileLoadRef.current) setSingerProfile(result.profile);
  }

  return (
    <div className="requests-page request-page-gateway-theme">

      <div className="container">
        <header className="request-appbar">
          <div className="request-appbar-title">
            <span className="request-appbar-icon material-symbols-rounded" aria-hidden="true">mic_external_on</span>
            <div className="request-appbar-text">
              <h1>Song Requests</h1>
              {nameConfirmed && requestedBy && (
                <p>Singing as <strong>{requestedBy}</strong></p>
              )}
            </div>
          </div>
        <div className="top-actions" ref={profileMenuRef}>
          <button
            ref={profileButtonRef}
            className="profile-button"
            onClick={() => {
              if (!nameConfirmed) {
                openNameDialog();
              } else setProfileMenuOpen(!profileMenuOpen);
            }}
            title={
              nameConfirmed ? `Singing as ${requestedBy}` : "Enter your name"
            }
            type="button"
            aria-label={nameConfirmed ? `${requestedBy} profile options` : "Set up your profile"}
            aria-expanded={profileMenuOpen}
            aria-controls="request-profile-menu"
          >
            <SingerAvatar name={requestedBy} profile={singerProfile ?? {
              imageUrl: isSignedInRequester ? auth.profile.picture : null, focusX: 50, focusY: 50,
            }} size={42} />
          </button>
          {profileMenuOpen && (
            <nav id="request-profile-menu" className="request-profile-menu" aria-label="Profile options">
              <button type="button" onClick={() => {
                setProfileMenuOpen(false); setProfilePanel("history");
              }}>Manage History</button>
              <button type="button" onClick={() => {
                setProfileMenuOpen(false); setProfilePanel("image");
                void loadSingerProfile();
              }}>Manage Profile Picture</button>
              <button type="button" onClick={() => {
                setProfileMenuOpen(false); openNameDialog();
              }}>Edit Name</button>
              <ThemePicker
                value={themeChoice}
                options={[
                  { value: "venue", label: "Venue", theme: resolveRequestTheme("venue", venueTheme) },
                  ...THEMES.map((theme) => ({ value: theme.id, label: theme.label, theme: theme.id })),
                ]}
                onChange={(value) => changeThemeChoice(value as RequestThemeChoice)}
              />
              <button type="button" onClick={() => void logOffSingerProfile()}>Logout</button>
              <div className="request-profile-version"><AppVersion /></div>
            </nav>
          )}
        </div>
        </header>

        {profilePanel === "history" && (
          <ProfileDialog title="Manage History" onClose={() => setProfilePanel(null)}>
            <div className="profile-history-actions">
              <button type="button" onClick={() => void exportMySingerHistory()}>Export History</button>
              <button type="button" onClick={() => historyImportInputRef.current?.click()}>Import History</button>
              <input ref={historyImportInputRef} type="file" accept=".kd,application/json" hidden
                onChange={(event) => void importMySingerHistory(event.currentTarget.files?.[0])} />
            </div>
          </ProfileDialog>
        )}
        {profilePanel === "image" && (
          <ProfileDialog title="Manage Profile Picture" onClose={() => setProfilePanel(null)}>
            {profileLoading ? <p>Loading profile picture...</p> : profileLoadError ? (
              <div role="alert"><p>{profileLoadError}</p><button type="button" onClick={() => void loadSingerProfile()}>Retry</button></div>
            ) : <ProfileImageEditor
              name={requestedBy} profile={singerProfile} canUpload={canUploadProfileImage}
              onSave={saveProfileImage} onRemove={removeProfileImage} onCancel={() => setProfilePanel(null)}
            />}
          </ProfileDialog>
        )}
        {(nameModalOpen || socialBusy) && (
          <ProfileDialog title="Who is singing?" className="request-name-dialog"
            onClose={nameConfirmed && !savingName && !socialBusy ? () => setNameModalOpen(false) : undefined}>
            <form className="request-name-form" onSubmit={(event) => { event.preventDefault(); void confirmName(); }}>
              <p id="singer-name-help">Enter your first name and at least a last initial so requests and queue edits stay linked to you.</p>
              {showNamePrompt && !requestedBy.trim() && <p className="profile-error">Enter your name to add songs to the queue.</p>}
              <input
                id="singer-name-input" aria-label="Singer name" aria-describedby="singer-name-help singer-name-error"
                aria-invalid={Boolean(nameError)} type="text" autoComplete="name" autoCapitalize="words"
                placeholder="First L or First Last" value={nameDraft} disabled={savingName || socialBusy} autoFocus
                onChange={(event) => { setNameDraft(event.currentTarget.value); setNameError(""); }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !shouldHandleEnterKey(event)) event.preventDefault();
                }}
              />
              <p id="singer-name-error" className="profile-error" role="alert">{nameError}</p>
              <button type="submit" className="request-name-save" disabled={savingName || socialBusy}>
                {savingName ? "Saving..." : "Continue"}
              </button>
              {socialProviders.length > 0 && (
                <div className="request-social-login">
                  <p>Or connect with a social account</p>
                  <div className="request-social-icons" role="group" aria-label="Social sign-in services">
                    {socialProviders.map((provider) => (
                      <button key={provider} type="button" className="request-social-button"
                        title={`Sign in with ${SOCIAL_PROVIDER_NAMES[provider]}`}
                        aria-label={`Sign in with ${SOCIAL_PROVIDER_NAMES[provider]}`}
                        disabled={savingName || socialBusy} onClick={() => void signInWithSocial(provider)}>
                        <SocialProviderIcon provider={provider} />
                      </button>
                    ))}
                  </div>
                  <p className="profile-help">Use your name and profile picture, and restore your queue and history when you sign in again. Your name and picture may appear in public queues and venue displays.</p>
                </div>
              )}
              {!nameConfirmed && !isSignedInRequester && <PublicLegalLinks />}
              {socialBusy && <p role="status">Signing in...</p>}
              {socialError && <p className="profile-error" role="alert">{socialError}</p>}
            </form>
          </ProfileDialog>
        )}

        <MyQueueSheet myQueue={myQueueState} nameConfirmed={nameConfirmed} />

        {/* Search Card — only shown after name is confirmed */}
        {nameConfirmed && (
          <div className="card">
            {!localLibraryEnabled && !externalLibraryEnabled ? (
              <div
                style={{
                  padding: "40px",
                  textAlign: "center",
                  color: "var(--color-text-secondary)",
                }}
              >
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>🎤</div>
                <div style={{ fontSize: "18px", fontWeight: 500 }}>
                  We are not accepting requests at this time.
                </div>
              </div>
            ) : (
              <>
                <div className="request-search-bar">
                <nav className="page-tabs" aria-label="Request page views">
                  <button
                    className={`page-tab ${localViewMode === "search" ? "active" : ""}`}
                    onClick={() => setLocalViewMode("search")}
                    type="button"
                  >
                    <span className="material-symbols-rounded" aria-hidden="true">search</span>
                    <span>Search</span>
                  </button>
                  {localLibraryEnabled && localBrowseEnabled && (
                    <>
                      <button
                        className={`page-tab ${localViewMode === "browse" && browseCategory === "artist" ? "active" : ""}`}
                        onClick={() => {
                          setBrowseCategory("artist");
                          setLocalViewMode("browse");
                        }}
                        type="button"
                      >
                        <span className="material-symbols-rounded" aria-hidden="true">mic_external_on</span>
                        <span>Artists</span>
                      </button>
                      <button
                        className={`page-tab ${localViewMode === "browse" && browseCategory === "title" ? "active" : ""}`}
                        onClick={() => {
                          setBrowseCategory("title");
                          setLocalViewMode("browse");
                        }}
                        type="button"
                      >
                        <span className="material-symbols-rounded" aria-hidden="true">music_note</span>
                        <span>Songs</span>
                      </button>
                    </>
                  )}
                </nav>

                <div className="search-toolbar">
                  <div className="search-wrapper">
                    <span className="search-icon material-symbols-rounded" aria-hidden="true">search</span>
                    <input
                      className="search-input"
                      type="text"
                      placeholder={
                        isLocalBrowseMode
                          ? browseCategory === "artist"
                            ? "Filter artists…"
                            : "Filter song titles…"
                          : localLibraryEnabled && externalLibraryEnabled
                            ? "Search local library & Online…"
                            : localLibraryEnabled
                              ? "Search local songs…"
                              : "Search Online…"
                      }
                      value={q}
                      onChange={(e) => {
                        setQ(e.target.value);
                        setFuzzySuggestions([]);
                      }}
                      onKeyDown={(event) => {
                        if (!shouldHandleEnterKey(event)) return;
                        if (searchTimeoutRef.current) {
                          clearTimeout(searchTimeoutRef.current);
                        }
                        event.currentTarget.blur();
                        if (!isLocalBrowseMode) {
                          if (localLibraryEnabled) void doLocalSearch();
                          if (externalLibraryEnabled) void doKaraokeNerdsSearch();
                        }
                      }}
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck="false"
                      inputMode="search"
                      enterKeyHint="search"
                      aria-label="Search songs"
                    />
                    {q.trim() && (
                      <button
                        className="search-clear"
                        type="button"
                        aria-label="Clear search"
                        title="Clear search"
                        onClick={() => {
                          setQ("");
                          if (!isLocalBrowseMode) {
                            setLocalRows([]);
                            setKaraokeNerdsRows([]);
                            setFuzzySuggestions([]);
                          }
                        }}
                      >
                        ×
                      </button>
                    )}
                  </div>

                  {localLibraryEnabled && (
                    <button
                      className={`filter-toggle ${showFilters ? "active" : ""}`}
                      type="button"
                      onClick={() => setShowFilters(!showFilters)}
                      aria-label="Toggle filters"
                      aria-expanded={showFilters}
                      title="Filters"
                    >
                      <span className="filter-icon material-symbols-rounded" aria-hidden="true">tune</span>
                    </button>
                  )}
                </div>

                </div>

                {/* Search Filters */}
                {localLibraryEnabled && showFilters && (
                  <div className="search-filters">
                    <div className="filter-options">
                      <div className="filter-group">
                          {localLibraryEnabled && externalLibraryEnabled && (
                            <>
                              <label className="filter-label">Source</label>
                              <div
                                className="filter-chips"
                                style={{ marginBottom: 14 }}
                              >
                                <button
                                  className={`filter-chip ${sourceFilter === "all" ? "active" : ""}`}
                                  onClick={() => setSourceFilter("all")}
                                >
                                  <span>All</span>
                                </button>
                                <button
                                  className={`filter-chip ${sourceFilter === "local" ? "active" : ""}`}
                                  onClick={() => setSourceFilter("local")}
                                >
                                  <span>📚 Local</span>
                                </button>
                                <button
                                  className={`filter-chip ${sourceFilter === "online" ? "active" : ""}`}
                                  onClick={() => setSourceFilter("online")}
                                >
                                  <span>🌐 Online</span>
                                </button>
                              </div>
                            </>
                          )}

                          {!isLocalBrowseMode && (
                            <>
                              <label className="filter-label">Search In</label>
                              <div
                                className="filter-chips"
                                style={{ marginBottom: 14 }}
                              >
                                <button
                                  className={`filter-chip ${searchFieldFilter === "all" ? "active" : ""}`}
                                  onClick={() => setSearchFieldFilter("all")}
                                >
                                  <span>All</span>
                                </button>
                                <button
                                  className={`filter-chip ${searchFieldFilter === "artist" ? "active" : ""}`}
                                  onClick={() => setSearchFieldFilter("artist")}
                                >
                                  <span>Artist</span>
                                </button>
                                <button
                                  className={`filter-chip ${searchFieldFilter === "title" ? "active" : ""}`}
                                  onClick={() => setSearchFieldFilter("title")}
                                >
                                  <span>Song Title</span>
                                </button>
                              </div>
                            </>
                          )}

                          <label className="filter-label">Format</label>
                          <div className="filter-chips">
                            <button
                              className={`filter-chip ${kindFilter === "all" ? "active" : ""}`}
                              onClick={() => setKindFilter("all")}
                            >
                              <span>All Formats</span>
                            </button>
                            <button
                              className={`filter-chip ${kindFilter === "mp4" ? "active" : ""}`}
                              onClick={() => setKindFilter("mp4")}
                            >
                              <span>🎬 Video</span>
                            </button>
                            <button
                              className={`filter-chip ${kindFilter === "cdgmp3" ? "active" : ""}`}
                              onClick={() => setKindFilter("cdgmp3")}
                            >
                              <span>📀 CDG</span>
                            </button>
                          </div>
                      </div>
                    </div>
                  </div>
                )}

                {isLocalBrowseMode && (
                  <div className="browse-panel">
                    <h2 className="section-title">
                      {browseCategory === "artist"
                        ? selectedBrowseArtist
                          ? selectedBrowseArtist
                          : "Browse by Artist"
                        : "Browse by Song"}
                    </h2>
                    {!q.trim() && (
                      <select
                        className="initial-selector browse-letter-select"
                        aria-label="Browse letters"
                        value={selectedBrowseLetter}
                        onChange={(event) => {
                          setSelectedBrowseLetter(event.currentTarget.value);
                          setSelectedBrowseArtist("");
                        }}
                      >
                        {BROWSE_LETTERS.map((letter) => (
                          <option
                            key={letter}
                            value={letter}
                            disabled={!availableBrowseLetters.has(letter)}
                          >
                            {letter}
                          </option>
                        ))}
                      </select>
                    )}
                    {selectedBrowseArtist && (
                      <div className="browse-subheader">
                        <button
                          className="secondary compact"
                          type="button"
                          onClick={() => {
                            setSelectedBrowseArtist("");
                            setLocalRows([]);
                            setBrowseSummary(
                              `Artists starting with "${selectedBrowseLetter}"`,
                            );
                            requestAnimationFrame(() => {
                              window.scrollTo({
                                top: browseArtistScrollYRef.current,
                                behavior: "auto",
                              });
                            });
                          }}
                        >
                          ← Artists
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Results */}
                {isLocalBrowseMode && !q.trim() ? (
                  showingBrowseArtistList ? (
                    isLoading ? (
                      <div className="loading-container">
                        <div className="loading-spinner"></div>
                        <div className="loading-text">Loading artists...</div>
                      </div>
                    ) : visibleBrowseArtists.length > 0 ? (
                      <div className="results-container">
                        {visibleBrowseArtists.map((artist) => {
                          const songCount = artist.songCount ?? 0;
                          return (
                            <button
                              key={artist.artist}
                              className="result-card artist-card"
                              type="button"
                              onClick={() => {
                                browseArtistScrollYRef.current =
                                  window.scrollY ||
                                  document.documentElement.scrollTop ||
                                  0;
                                setSelectedBrowseArtist(artist.artist);
                              }}
                            >
                              <div className="result-info">
                                <div className="result-title">
                                  {artist.artist || "Unknown Artist"}
                                </div>
                                {artist.songCount !== undefined && (
                                  <div className="result-artist">
                                    {songCount}{" "}
                                    {songCount === 1 ? "song" : "songs"}
                                  </div>
                                )}
                              </div>
                              <span
                                className="icon-action-button"
                                aria-hidden="true"
                              >
                                ›
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="empty-state">
                        <div className="empty-icon">🎙️</div>
                        <div className="empty-title">No artists found</div>
                        <div className="empty-message">
                          No artists match "{q.trim() || selectedBrowseLetter}".
                        </div>
                      </div>
                    )
                  ) : isLoading ? (
                    <div className="loading-container">
                      <div className="loading-spinner"></div>
                      <div className="loading-text">
                        Loading library browse...
                      </div>
                    </div>
                  ) : showLocalResults ? (
                    <>
                      <div className="results-header">
                        <span className="results-count">
                          {groupedLocalRows.length}{" "}
                          {groupedLocalRows.length === 1 ? "song" : "songs"}{" "}
                          found
                          {groupedLocalRows.length < visibleLocalRows.length && (
                            <span
                              style={{
                                marginLeft: 6,
                                fontSize: 11,
                                color: "var(--color-text-muted)",
                                fontWeight: 400,
                              }}
                            >
                              ({formatCount(visibleLocalRows.length, "version")})
                            </span>
                          )}
                        </span>
                        {browseSummary && (
                          <span className="active-filter-badge">
                            {browseSummary}
                          </span>
                        )}
                        {kindFilter !== "all" && (
                          <span className="active-filter-badge">
                            {kindFilter === "mp4" ? "🎬 Video" : "📀 CDG"}
                          </span>
                        )}
                      </div>
                      <div className="results-container">
                        {browseCombinedGroups.map((group, idx) => (
                          <SongResultCard key={group.key} group={group} idx={idx} actions={songResultActions} />
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="empty-state">
                      <div className="empty-icon">🗂️</div>
                      <div className="empty-title">Browse the library</div>
                      <div className="empty-message">
                        Choose{" "}
                        {browseCategory === "artist" ? "Artist" : "Song Title"}{" "}
                        and then pick a letter
                        {browseCategory === "artist"
                          ? ", followed by an artist,"
                          : ""}{" "}
                        to browse the local library alphabetically.
                      </div>
                    </div>
                  )
                ) : (
                  /* Search mode — show local + KN results together */
                  <>
                    {q.trim() &&
                      (isLoading || isKnLoading ? (
                        <div className="loading-container">
                          <div className="loading-spinner"></div>
                          <div className="loading-text">Searching...</div>
                        </div>
                      ) : combinedSearchGroups.length > 0 ? (
                        <>
                          <div className="results-header">
                            <span className="results-count">
                              {combinedSearchGroups.reduce(
                                (total, group) => total + group.versions.length,
                                0,
                              )}{" "}
                              result
                              {combinedSearchGroups.reduce(
                                (total, group) => total + group.versions.length,
                                0,
                              ) === 1
                                ? ""
                                : "s"}{" "}
                              in {combinedSearchGroups.length} song group
                              {combinedSearchGroups.length === 1 ? "" : "s"}
                            </span>
                            {kindFilter !== "all" && (
                              <span className="active-filter-badge">
                                {kindFilter === "mp4"
                                  ? "🎬 Video"
                                  : "📀 CDG"}
                              </span>
                            )}
                          </div>
                          <div className="results-container">
                            {combinedSearchGroups.map((group, idx) => (
                              <SongResultCard key={group.key} group={group} idx={idx} actions={songResultActions} />
                            ))}
                          </div>
                        </>
                      ) : (
                        <div className="empty-state">
                          <div className="empty-icon">🎵</div>
                          <div className="empty-title">
                            No results for "{q}"
                          </div>
                          {sourceFilter !== "online" &&
                            groupedFuzzySuggestions.length > 0 && (
                              <div
                                style={{
                                  width: "min(100%, 560px)",
                                  marginTop: 16,
                                  textAlign: "left",
                                }}
                              >
                                <div
                                  style={{
                                    color: "var(--color-text-secondary)",
                                    fontSize: 14,
                                    marginBottom: 10,
                                  }}
                                >
                                  {fuzzySuggestions[0]?.matched_term
                                    ? `Do you mean “${fuzzySuggestions[0].matched_term}”?`
                                    : "Do you mean…?"}
                                </div>
                                {groupedFuzzySuggestions.map((group) => (
                                  <div
                                    key={group.key}
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 10,
                                      padding: "10px 12px",
                                      background: "var(--color-bg-secondary)",
                                      border: "1px solid var(--color-border)",
                                      borderRadius: 8,
                                      marginBottom: 7,
                                    }}
                                  >
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div
                                        style={{
                                          fontWeight: 600,
                                          fontSize: 14,
                                          whiteSpace: "nowrap",
                                          overflow: "hidden",
                                          textOverflow: "ellipsis",
                                        }}
                                      >
                                        {group.title}
                                      </div>
                                      <div
                                        style={{
                                          fontSize: 12,
                                          color: "var(--color-text-secondary)",
                                        }}
                                      >
                                        {group.artist}
                                      </div>
                                      {group.versions.length > 1 && (
                                        <div
                                          style={{
                                            fontSize: 11,
                                            color: "var(--color-text-muted)",
                                            marginTop: 2,
                                          }}
                                        >
                                          📀 {formatCount(group.versions.length, "version")}
                                        </div>
                                      )}
                                    </div>
                                    <button
                                      className="add-btn"
                                      type="button"
                                      disabled={group.versions.some(
                                        (version) =>
                                          addingLocal === version.id,
                                      )}
                                      onClick={() => {
                                        if (group.versions.length > 1) {
                                          setCombinedVersionPicker({
                                            title: group.title,
                                            artist: group.artist,
                                            versions: group.versions.map(toLocalSearchTrack),
                                          });
                                        } else {
                                          const track = group.versions[0];
                                          void enqueueLocal(
                                            track.id,
                                            track.title || "",
                                          );
                                        }
                                      }}
                                      style={{ flexShrink: 0 }}
                                    >
                                      {group.versions.some(
                                        (version) =>
                                          addingLocal === version.id,
                                      )
                                        ? "…"
                                        : "+ Add"}
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                        </div>
                      ))}
                    {/* Initial empty state — nothing searched yet */}
                    {!q.trim() &&
                      !showLocalResults &&
                      !showKnResults &&
                      !isLoading &&
                      !isKnLoading && (
                        <div className="empty-state">
                          <div className="empty-icon">🎤</div>
                          <div className="empty-title">Ready to search?</div>
                          <div className="empty-message">
                            {localLibraryEnabled && externalLibraryEnabled
                              ? "Search local library and Karaoke Nerds at once"
                              : localLibraryEnabled
                                ? "Search the local karaoke library"
                                : "Browse thousands of karaoke tracks online"}
                          </div>
                        </div>
                      )}
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <CombinedVersionPickerDialog
        combinedVersionPicker={combinedVersionPicker}
        setCombinedVersionPicker={setCombinedVersionPicker}
        setLyricsPopupOpen={setLyricsPopupOpen}
        lyricsData={lyricsData}
        fetchLyrics={fetchLyrics}
        enqueueLocal={enqueueLocal}
        enqueueKaraokeNerds={enqueueKaraokeNerds}
      />


      <LyricsDialog
        localRows={localRows}
        karaokeNerdsRows={karaokeNerdsRows}
        lyricsPopupOpen={lyricsPopupOpen}
        setLyricsPopupOpen={setLyricsPopupOpen}
        lyricsData={lyricsData}
        lyricsPopupRef={lyricsPopupRef}
      />
    </div>
  );
}
