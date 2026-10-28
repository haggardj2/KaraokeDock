import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useLayoutEffect,
  useMemo,
} from "react";
import { createPortal } from "react-dom";
import { api } from "../api";
import { useAuth } from "../auth-context";
import SingerAvatar, { type SingerProfile, type ProfileCrop } from "../components/SingerAvatar";
import ProfileImageEditor from "../components/ProfileImageEditor";
import ProfileDialog from "../components/ProfileDialog";
import ThemePicker from "../components/ThemePicker";
import { downloadJsonFile, readJsonFile, safeHistoryFilename } from "../utils/jsonFiles";
import {
  BROWSE_LETTERS,
  MAX_KEY_ADJUSTMENT,
  MIN_KEY_ADJUSTMENT,
  MOBILE_BREAKPOINT,
  SINGER_UUID_STORAGE_KEY,
  VENUE_THEME_CACHE_KEY,
  createSingerUuid,
  formatCount,
  formatTrackKind,
  getOrCreateSingerUuid,
  groupKey,
  normalizeArtistForGroup,
  normalizeMyQueueItems,
  reorderQueuedItems,
  searchRelevance,
  shouldHandleEnterKey,
} from "./requests/helpers";
import type {
  BrowseArtistRow,
  BrowseCategory,
  CombinedSearchGroup,
  CombinedSearchTrack,
  KaraokeNerdsTrack,
  LyricsData,
  MyQueueItem,
  SearchRow,
  SelfSingerProfileResponse,
  VersionPicker,
} from "./requests/types";
import CombinedVersionPickerDialog from "./requests/CombinedVersionPickerDialog";
import VersionPickerDialog from "./requests/VersionPickerDialog";
import KnVersionPickerDialog from "./requests/KnVersionPickerDialog";
import LyricsDialog from "./requests/LyricsDialog";
import { useMyQueue } from "./requests/useMyQueue";
import MyQueueSheet from "./requests/MyQueueSheet";
import {
  REQUEST_THEME_STORAGE_KEY,
  THEMES,
  applyTheme,
  clearTheme,
  loadRequestThemeChoice,
  loadThemeId,
  resolveRequestTheme,
  saveThemeId,
  type RequestThemeChoice,
} from "../theme";
import SocialProviderIcon from "../components/SocialProviderIcon";
import PublicLegalLinks from "../components/PublicLegalLinks";
import AppVersion from "../components/AppVersion";
import {
  exchangeSocialLogin, startSocialLogin, takeSocialLoginCallback, visibleSocialProviders,
  SOCIAL_PROVIDER_NAMES, type SocialProvider, type SocialPublicConfig,
} from "../social-login";
import "./Requests.css";

/**
 * Normalize an artist name for grouping:
 * - Lowercase
 * - Invert "Artist, The" / "Artist, A" / "Artist, An" → "the artist" etc.
 */

export default function Requests() {
  const auth = useAuth();
  const [q, setQ] = useState("");
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
  const [keyAdjustments, setKeyAdjustments] = useState<Map<string, number>>(
    new Map(),
  );
  const [localViewMode, setLocalViewMode] = useState<"search" | "browse">(
    "search",
  );
  const [localRows, setLocalRows] = useState<SearchRow[]>([]);
  const [karaokeNerdsRows, setKaraokeNerdsRows] = useState<KaraokeNerdsTrack[]>(
    [],
  );
  const [busy, setBusy] = useState(false);
  const [knBusy, setKnBusy] = useState(false);
  const [browseBusy, setBrowseBusy] = useState(false);
  const [browseCategory, setBrowseCategory] =
    useState<BrowseCategory>("artist");
  const [browseLetters, setBrowseLetters] = useState<string[]>([]);
  const [selectedBrowseLetter, setSelectedBrowseLetter] = useState("");
  const [browseArtists, setBrowseArtists] = useState<BrowseArtistRow[]>([]);
  const [selectedBrowseArtist, setSelectedBrowseArtist] = useState("");
  const [browseSummary, setBrowseSummary] = useState("");
  const [addingLocal, setAddingLocal] = useState<number | null>(null);
  const [addingKaraokeNerds, setAddingKaraokeNerds] = useState<string | null>(
    null,
  );
  const [recentlyAdded, setRecentlyAdded] = useState<Set<string>>(new Set());
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [kindFilter, setKindFilter] = useState<"all" | "mp4" | "cdgmp3">("all");
  const [searchFieldFilter, setSearchFieldFilter] = useState<
    "all" | "artist" | "title"
  >("all");
  const [showFilters, setShowFilters] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);
  const [actionMenuAnchor, setActionMenuAnchor] = useState<{
    top: number;
    left: number;
    right: number;
    bottom: number;
    width: number;
  } | null>(null);
  const [actionMenuPosition, setActionMenuPosition] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const [keyAdjustmentView, setKeyAdjustmentView] = useState<string | null>(
    null,
  );
  const [lyricsPopupOpen, setLyricsPopupOpen] = useState<string | null>(null);
  const [lyricsData, setLyricsData] = useState<LyricsData>({});
  // Fuzzy suggestions (shown when main search returns no results)
  const [fuzzySuggestions, setFuzzySuggestions] = useState<SearchRow[]>([]);
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
  // Collapsible result sections (collapsed by default)
  const [localExpanded, setLocalExpanded] = useState(false);
  const [knExpanded, setKnExpanded] = useState(false);
  // Source filter: 'all' | 'local' | 'online'
  const [sourceFilter, setSourceFilter] = useState<"all" | "local" | "online">(
    "all",
  );
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
  // Version picker for consolidated song results
  const [versionPicker, setVersionPicker] = useState<VersionPicker<SearchRow> | null>(null);
  const [knVersionPicker, setKnVersionPicker] = useState<VersionPicker<KaraokeNerdsTrack> | null>(null);
  const [combinedVersionPicker, setCombinedVersionPicker] = useState<VersionPicker<CombinedSearchTrack> | null>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const actionMenuRef = useRef<HTMLDivElement | null>(null);
  const lyricsPopupRef = useRef<HTMLDivElement | null>(null);
  const browseArtistScrollYRef = useRef(0);

  // Request acceptance settings
  const [requestAcceptance, setRequestAcceptance] = useState<
    "local" | "external" | "disabled"
  >("local");
  const [localLibraryEnabled, setLocalLibraryEnabled] = useState(true);
  const [externalLibraryEnabled, setExternalLibraryEnabled] = useState(true);
  const [localBrowseEnabled, setLocalBrowseEnabled] = useState(true);

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
    // Close popup when clicking outside
    function handleDown(e: MouseEvent) {
      if (actionMenuOpen) {
        const el = actionMenuRef.current;
        if (el && !el.contains(e.target as Node)) {
          setActionMenuOpen(null);
          setActionMenuPosition(null);
          setKeyAdjustmentView(null);
        }
      }
      if (lyricsPopupOpen) {
        const el = lyricsPopupRef.current;
        if (el && !el.contains(e.target as Node)) {
          setLyricsPopupOpen(null);
        }
      }
    }
    document.addEventListener("mousedown", handleDown);
    return () => document.removeEventListener("mousedown", handleDown);
  }, [actionMenuOpen, lyricsPopupOpen]);

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
        const acceptance = settings["requests.acceptance"] || "local";
        const localEnabled = settings["libraries.local_enabled"] !== false;
        const externalEnabled =
          settings["libraries.external_enabled"] !== false;
        const browseEnabled =
          settings["requests.local_browse_enabled"] !== false;

        setRequestAcceptance(acceptance);
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
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
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

  useEffect(() => {
    if (!localBrowseEnabled && localViewMode === "browse") {
      setLocalViewMode("search");
    }
  }, [localBrowseEnabled, localViewMode]);

  useLayoutEffect(() => {
    if (!actionMenuOpen) return;
    if (window.innerWidth <= MOBILE_BREAKPOINT) return;
    if (!actionMenuAnchor) return;

    // Wait a frame so the portal'd menu is in the DOM and measurable
    requestAnimationFrame(() => {
      const menuEl = actionMenuRef.current;
      if (!menuEl) return;

      const gap = 8;
      const menuRect = menuEl.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      // 1) Prefer below the button...
      let top = actionMenuAnchor.bottom + gap;

      // ...but if it overflows bottom, open above.
      if (top + menuRect.height + gap > vh) {
        top = actionMenuAnchor.top - menuRect.height - gap;
      }

      // Clamp vertically into viewport
      top = Math.max(gap, Math.min(top, vh - menuRect.height - gap));

      // 2) Open to the LEFT of the button:
      // align the menu's right edge with the button's right edge
      let left = actionMenuAnchor.right - menuRect.width;

      // Clamp horizontally into viewport
      left = Math.max(gap, Math.min(left, vw - menuRect.width - gap));

      setActionMenuPosition({
        top,
        left,
        width: actionMenuAnchor.width,
      });
    });
  }, [actionMenuOpen, actionMenuAnchor]);

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

  // Helper function to adjust key
  const adjustKey = useCallback((trackKey: string, delta: number) => {
    setKeyAdjustments((prev) => {
      const next = new Map(prev);
      const currentKey = next.get(trackKey) ?? 0;
      const newKey = currentKey + delta;
      if (newKey >= MIN_KEY_ADJUSTMENT && newKey <= MAX_KEY_ADJUSTMENT) {
        next.set(trackKey, newKey);
      }
      return next;
    });
  }, []);

  // Helper function to calculate and set action menu position
  const handleActionMenuToggle = useCallback(
    (e: React.MouseEvent, trackKey: string, currentlyOpen: string | null) => {
      e.stopPropagation();
      const wasOpen = currentlyOpen === trackKey;
      if (!wasOpen) {
        // Only calculate position for desktop
        if (window.innerWidth > MOBILE_BREAKPOINT) {
          const rect = e.currentTarget.getBoundingClientRect();

          setActionMenuAnchor({
            top: rect.top,
            left: rect.left,
            right: rect.right,
            bottom: rect.bottom,
            width: rect.width,
          });

          // Let useLayoutEffect measure the actual menu size and decide final placement
          setActionMenuPosition({
            top: rect.bottom + 8,
            left: rect.left,
            width: rect.width,
          });
        } else {
          setActionMenuAnchor(null);
          setActionMenuPosition(null);
        }
      }
      setActionMenuOpen((prev) => (prev === trackKey ? null : trackKey));
      if (wasOpen) setActionMenuAnchor(null);
    },
    [],
  );

  // Function to fetch lyrics
  const fetchLyrics = useCallback(
    async (trackKey: string, artist: string, title: string) => {
      // Set loading state
      setLyricsData((prev) => ({
        ...prev,
        [trackKey]: { loading: true, lyrics: null, error: null },
      }));

      try {
        // Create an AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        const response = await fetch(
          `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`,
          {
            signal: controller.signal,
          },
        );

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error("Lyrics not found");
        }

        const data = await response.json();

        setLyricsData((prev) => ({
          ...prev,
          [trackKey]: {
            loading: false,
            lyrics: data.lyrics || "No lyrics available",
            error: null,
          },
        }));
      } catch (err) {
        const errorMessage =
          err instanceof Error && err.name === "AbortError"
            ? "Request timeout - please try again"
            : "Lyrics not found";

        setLyricsData((prev) => ({
          ...prev,
          [trackKey]: { loading: false, lyrics: null, error: errorMessage },
        }));
      }
    },
    [],
  );

  // Local library search
  const doLocalSearch = useCallback(async () => {
    if (!q.trim()) {
      setLocalRows([]);
      setFuzzySuggestions([]);
      return;
    }
    setBusy(true);
    try {
      let url = `/api/search?q=${encodeURIComponent(q.trim())}`;
      if (kindFilter !== "all") {
        url += `&kind=${kindFilter}`;
      }
      if (searchFieldFilter !== "all") {
        url += `&field=${searchFieldFilter}`;
      }
      const r = await api(url);
      const rows = Array.isArray(r) ? r : [];
      setLocalRows(rows);
      if (rows.length > 0) setLocalExpanded(true);
      if (rows.length === 0 && q.trim().length >= 2) {
        try {
          let suggestionUrl = `/api/search/suggestions?q=${encodeURIComponent(q.trim())}`;
          if (kindFilter !== "all") {
            suggestionUrl += `&kind=${kindFilter}`;
          }
          if (searchFieldFilter !== "all") {
            suggestionUrl += `&field=${searchFieldFilter}`;
          }
          const suggestions = await api(suggestionUrl);
          setFuzzySuggestions(Array.isArray(suggestions) ? suggestions : []);
        } catch (err) {
          console.error("Fuzzy suggestion search error:", err);
          setFuzzySuggestions([]);
        }
      } else {
        setFuzzySuggestions([]);
      }
    } catch (err) {
      console.error("Search error:", err);
      setLocalRows([]);
      setFuzzySuggestions([]);
    } finally {
      setBusy(false);
    }
  }, [q, kindFilter, searchFieldFilter]);

  // Karaoke Nerds search
  const doKaraokeNerdsSearch = useCallback(async () => {
    if (!q.trim()) {
      setKaraokeNerdsRows([]);
      return;
    }
    setKnBusy(true);
    try {
      const r = await api(
        `/api/karaoke-nerds/search?q=${encodeURIComponent(q.trim())}`,
      );
      const knRows = Array.isArray(r) ? r : [];
      setKaraokeNerdsRows(knRows);
      if (knRows.length > 0) setKnExpanded(true);
    } catch (err) {
      console.error("Karaoke Nerds search error:", err);
      setKaraokeNerdsRows([]);
    } finally {
      setKnBusy(false);
    }
  }, [q]);

  const loadBrowseLetters = useCallback(
    async (category: BrowseCategory) => {
      setBrowseBusy(true);
      try {
        const kindQuery = kindFilter !== "all" ? `&kind=${kindFilter}` : "";
        const result = await api(
          `/api/search/browse/letters?mode=${category}${kindQuery}`,
        );
        const letters = Array.isArray(result?.letters)
          ? result.letters.filter(
              (value: unknown): value is string => typeof value === "string",
            )
          : [];
        setBrowseLetters(letters);
        setSelectedBrowseLetter((current) => {
          if (letters.includes(current)) return current;
          if (letters.includes("#")) return "#";
          return letters[0] ?? "";
        });
      } catch (err) {
        console.error("Browse letters error:", err);
        setBrowseLetters([]);
        setSelectedBrowseLetter("");
      } finally {
        setBrowseBusy(false);
      }
    },
    [kindFilter],
  );

  const loadBrowseArtists = useCallback(
    async (letter: string) => {
      setBrowseBusy(true);
      setBrowseArtists([]);
      setLocalRows([]);
      setBrowseSummary(
        q.trim() ? `Artists matching "${q.trim()}"` : `Artists starting with "${letter}"`,
      );
      try {
        const kindQuery = kindFilter !== "all" ? `&kind=${kindFilter}` : "";
        const searchQuery = q.trim()
          ? `&q=${encodeURIComponent(q.trim())}`
          : "";
        const result = await api(
          q.trim()
            ? `/api/search?q=${encodeURIComponent(q.trim())}&field=artist${kindQuery}`
            : `/api/search/browse/artists?letter=${encodeURIComponent(letter)}${searchQuery}${kindQuery}`,
        );
        if (q.trim()) {
          setLocalRows(Array.isArray(result) ? result : []);
          return;
        }
        const rawArtists: unknown[] = Array.isArray(result?.artists)
          ? result.artists
          : [];
        const artists = rawArtists
              .map((value: unknown): BrowseArtistRow | null => {
                if (typeof value === "string") {
                  const artist = value.trim();
                  return artist ? { artist } : null;
                }
                if (!value || typeof value !== "object") return null;
                const row = value as {
                  artist?: unknown;
                  songCount?: unknown;
                  versionCount?: unknown;
                };
                if (typeof row.artist !== "string" || !row.artist.trim()) {
                  return null;
                }
                const songCount = Number(row.songCount);
                const versionCount = Number(row.versionCount);
                return {
                  artist: row.artist.trim(),
                  songCount: Number.isFinite(songCount) ? songCount : undefined,
                  versionCount: Number.isFinite(versionCount)
                    ? versionCount
                    : undefined,
                };
              })
              .filter((value): value is BrowseArtistRow => value !== null);
        setBrowseArtists(artists);
      } catch (err) {
        console.error("Browse artists error:", err);
        setBrowseArtists([]);
      } finally {
        setBrowseBusy(false);
      }
    },
    [kindFilter, q],
  );

  const loadBrowseTitles = useCallback(
    async (letter: string) => {
      setBrowseBusy(true);
      setBrowseArtists([]);
      setLocalRows([]);
      setBrowseSummary(
        q.trim() ? `Titles matching "${q.trim()}"` : `Titles starting with "${letter}"`,
      );
      try {
        const kindQuery = kindFilter !== "all" ? `&kind=${kindFilter}` : "";
        const searchQuery = q.trim()
          ? `&q=${encodeURIComponent(q.trim())}`
          : "";
        const result = await api(
          `/api/search/browse/titles?letter=${encodeURIComponent(letter)}${searchQuery}${kindQuery}`,
        );
        setLocalRows(Array.isArray(result) ? result : []);
      } catch (err) {
        console.error("Browse titles error:", err);
        setLocalRows([]);
      } finally {
        setBrowseBusy(false);
      }
    },
    [kindFilter, q],
  );

  const loadBrowseArtistTracks = useCallback(
    async (artist: string) => {
      setBrowseBusy(true);
      setLocalRows([]);
      setBrowseSummary(`Songs by ${artist}`);
      try {
        const kindQuery = kindFilter !== "all" ? `&kind=${kindFilter}` : "";
        const result = await api(
          `/api/search/browse/artist-tracks?artist=${encodeURIComponent(artist)}${kindQuery}`,
        );
        setLocalRows(Array.isArray(result) ? result : []);
      } catch (err) {
        console.error("Browse artist tracks error:", err);
        setLocalRows([]);
      } finally {
        setBrowseBusy(false);
      }
    },
    [kindFilter],
  );

  // Debounced search — fires both local and KN simultaneously
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (localViewMode === "browse") {
      if (!q.trim()) {
        setKaraokeNerdsRows([]);
        return;
      }
      searchTimeoutRef.current = setTimeout(() => {
        if (externalLibraryEnabled) doKaraokeNerdsSearch();
      }, 350);
      return () => {
        if (searchTimeoutRef.current) {
          clearTimeout(searchTimeoutRef.current);
        }
      };
    }

    searchTimeoutRef.current = setTimeout(() => {
      if (localLibraryEnabled) doLocalSearch();
      if (externalLibraryEnabled) doKaraokeNerdsSearch();
    }, 350);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [
    q,
    localViewMode,
    localLibraryEnabled,
    externalLibraryEnabled,
    doLocalSearch,
    doKaraokeNerdsSearch,
  ]);

  // Re-run searches when switching back from browse to search
  useEffect(() => {
    if (localViewMode === "browse") return;
    if (q.trim()) {
      if (localLibraryEnabled) doLocalSearch();
      if (externalLibraryEnabled) doKaraokeNerdsSearch();
    }
  }, [localViewMode]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (localViewMode !== "browse") return;

    setBrowseArtists([]);
    setSelectedBrowseArtist("");
    setLocalRows([]);
    setBrowseSummary("");
    loadBrowseLetters(browseCategory);
  }, [localViewMode, browseCategory, kindFilter, loadBrowseLetters]);

  useEffect(() => {
    if (localViewMode !== "browse") return;

    if (!selectedBrowseLetter) {
      setBrowseArtists([]);
      setSelectedBrowseArtist("");
      setLocalRows([]);
      setBrowseSummary("");
      return;
    }

    setSelectedBrowseArtist("");
    const timeout = setTimeout(() => {
      if (browseCategory === "artist") {
        loadBrowseArtists(selectedBrowseLetter);
      } else {
        loadBrowseTitles(selectedBrowseLetter);
      }
    }, 250);

    return () => clearTimeout(timeout);
  }, [
    localViewMode,
    browseCategory,
    selectedBrowseLetter,
    loadBrowseArtists,
    loadBrowseTitles,
  ]);

  useEffect(() => {
    if (localViewMode !== "browse" || browseCategory !== "artist") return;

    if (!selectedBrowseArtist) {
      setLocalRows([]);
      return;
    }

    loadBrowseArtistTracks(selectedBrowseArtist);
  }, [
    localViewMode,
    browseCategory,
    selectedBrowseArtist,
    loadBrowseArtistTracks,
  ]);

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

  const isLocalBrowseMode = localViewMode === "browse";
  const showingBrowseArtistList =
    isLocalBrowseMode &&
    browseCategory === "artist" &&
    !!selectedBrowseLetter &&
    !selectedBrowseArtist;
  const showLocalResults = localLibraryEnabled && localRows.length > 0;
  const showKnResults = externalLibraryEnabled && karaokeNerdsRows.length > 0;
  const isLoading = busy || browseBusy;
  const isKnLoading = knBusy;
  const availableBrowseLetters = new Set(browseLetters);

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

  // Group local search results by normalised title + artist to deduplicate across disc IDs
  type GroupedResult = {
    key: string;
    title: string;
    artist: string;
    versions: SearchRow[];
    kind: string;
  };
  const visibleLocalRows = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!isLocalBrowseMode || !query) return localRows;

    return localRows.filter((row) => {
      const value =
        browseCategory === "artist" ? row.artist ?? "" : row.title ?? "";
      return value.toLowerCase().includes(query);
    });
  }, [browseCategory, isLocalBrowseMode, localRows, q]);

  const visibleBrowseArtists = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return browseArtists;
    return browseArtists.filter((row) =>
      row.artist.toLowerCase().includes(query),
    );
  }, [browseArtists, q]);

  const groupedLocalRows = useMemo((): GroupedResult[] => {
    const map = new Map<string, GroupedResult>();
    for (const row of visibleLocalRows) {
      const key = groupKey(row.title ?? "", row.artist ?? "");
      if (!map.has(key)) {
        map.set(key, {
          key,
          title: row.title ?? "",
          artist: row.artist ?? "",
          versions: [],
          kind: row.kind,
        });
      }
      map.get(key)!.versions.push(row);
    }
    return Array.from(map.values());
  }, [visibleLocalRows]);

  const groupedFuzzySuggestions = useMemo((): GroupedResult[] => {
    const map = new Map<string, GroupedResult>();
    for (const row of fuzzySuggestions) {
      const key = groupKey(row.title ?? "", row.artist ?? "");
      if (!map.has(key)) {
        map.set(key, {
          key,
          title: row.title ?? "",
          artist: row.artist ?? "",
          versions: [],
          kind: row.kind,
        });
      }
      map.get(key)!.versions.push(row);
    }
    return Array.from(map.values());
  }, [fuzzySuggestions]);

  // Group Karaoke Nerds results by normalised title + artist
  type GroupedKnResult = {
    key: string;
    title: string;
    artist: string;
    versions: KaraokeNerdsTrack[];
  };
  const visibleKaraokeNerdsRows = useMemo(() => {
    if (!isLocalBrowseMode || !q.trim()) return karaokeNerdsRows;
    const query = q.trim().toLowerCase();
    return karaokeNerdsRows.filter((track) => {
      const value = browseCategory === "artist" ? track.artist : track.title;
      return (value ?? "").toLowerCase().includes(query);
    });
  }, [browseCategory, isLocalBrowseMode, karaokeNerdsRows, q]);

  const groupedKnRows = useMemo((): GroupedKnResult[] => {
    const map = new Map<string, GroupedKnResult>();
    for (const track of visibleKaraokeNerdsRows) {
      const key = groupKey(track.title ?? "", track.artist ?? "");
      if (!map.has(key)) {
        map.set(key, {
          key,
          title: track.title ?? "",
          artist: track.artist ?? "",
          versions: [],
        });
      }
      map.get(key)!.versions.push(track);
    }
    return Array.from(map.values());
  }, [visibleKaraokeNerdsRows]);

  const combinedSearchGroups = useMemo((): CombinedSearchGroup[] => {
    const tracks: CombinedSearchTrack[] = [];
    if (
      localLibraryEnabled &&
      (isLocalBrowseMode || sourceFilter !== "online")
    ) {
      for (const row of localRows) {
        tracks.push({
          type: "local",
          key: `local-${row.id}`,
          title: row.title ?? "",
          artist: row.artist ?? "",
          discId: row.disc_id,
          kind: row.kind,
          track: row,
        });
      }
    }
    if (
      externalLibraryEnabled &&
      (isLocalBrowseMode || sourceFilter !== "local")
    ) {
      for (const track of visibleKaraokeNerdsRows) {
        tracks.push({
          type: "online",
          key: `kn-${track.url}`,
          title: track.title ?? "",
          artist: track.artist ?? "",
          brand: track.brand ?? null,
          track,
        });
      }
    }

    const deduped = new Map<string, CombinedSearchTrack>();
    for (const track of tracks) {
      const dedupeKey =
        track.type === "online"
          ? `online:${track.track.url.trim().toLowerCase().replace(/\/+$/, "")}`
          : `local:${track.track.id}`;
      if (!deduped.has(dedupeKey)) deduped.set(dedupeKey, track);
    }

    const groups = new Map<string, CombinedSearchGroup>();
    for (const track of deduped.values()) {
      const key = groupKey(track.title, track.artist);
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          title: track.title,
          artist: track.artist,
          versions: [],
        });
      }
      groups.get(key)!.versions.push(track);
    }

    return Array.from(groups.values())
      .map((group) => ({
        ...group,
        versions: group.versions.sort((a, b) => {
          const aVersion = a.type === "online" ? a.brand ?? "" : a.discId ?? "";
          const bVersion = b.type === "online" ? b.brand ?? "" : b.discId ?? "";
          return aVersion.localeCompare(bVersion, undefined, {
            sensitivity: "base",
            numeric: true,
          });
        }),
      }))
      .sort((a, b) => {
        const relevance =
          searchRelevance(q, a.title, a.artist) -
          searchRelevance(q, b.title, b.artist);
        if (relevance !== 0) return relevance;
        return 0;
      });
  }, [
    localRows,
    visibleKaraokeNerdsRows,
    localLibraryEnabled,
    externalLibraryEnabled,
    isLocalBrowseMode,
    q,
    sourceFilter,
  ]);

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

  async function enqueueLocal(id: number, songTitle: string) {
    const name = requestedBy.trim();
    if (!name) {
      setShowNamePrompt(true);
      setNameConfirmed(false);
      openNameDialog();
      return;
    }

    const trackKey = `local-${id}`;
    const keyAdjustment = keyAdjustments.get(trackKey) ?? 0;

    setAddingLocal(id);
    try {
      await api("/api/queue", {
        method: "POST",
        headers: requesterJsonHeaders,
        body: JSON.stringify({
          trackId: id,
          requestedBy: name,
          singerUuid: requestSingerUuid,
          keyAdjustment: keyAdjustment,
        }),
      });

      // Mark as recently added
      setRecentlyAdded((prev) => new Set(prev).add(trackKey));
      setTimeout(() => {
        setRecentlyAdded((prev) => {
          const next = new Set(prev);
          next.delete(trackKey);
          return next;
        });
      }, 3000);

      const keyText =
        keyAdjustment !== 0
          ? ` (Key: ${keyAdjustment > 0 ? "+" : ""}${keyAdjustment})`
          : "";
      showToast(
        `Added "${songTitle || "Unknown"}" to ${name}'s queue${keyText}`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (
        msg.includes("409") ||
        msg.toLowerCase().includes("already requested")
      ) {
        showToast("⚠️ You already have this song in the queue", "error");
      } else {
        showToast("Failed to add song.  Please try again.", "error");
        console.error(err);
      }
    } finally {
      setAddingLocal(null);
    }
  }

  async function enqueueKaraokeNerds(track: KaraokeNerdsTrack) {
    const name = requestedBy.trim();
    if (!name) {
      setShowNamePrompt(true);
      openNameDialog();
      return;
    }

    const trackKey = `kn-${track.url}`;
    const keyAdjustment = keyAdjustments.get(trackKey) ?? 0;

    setAddingKaraokeNerds(track.url);
    try {
      await api("/api/karaoke-nerds/add", {
        method: "POST",
        headers: requesterJsonHeaders,
        body: JSON.stringify({
          title: track.title,
          artist: track.artist,
          url: track.url,
          requestedBy: name,
          singerUuid: requestSingerUuid,
          keyAdjustment: keyAdjustment,
        }),
      });

      // Mark as recently added
      setRecentlyAdded((prev) => new Set(prev).add(trackKey));
      setTimeout(() => {
        setRecentlyAdded((prev) => {
          const next = new Set(prev);
          next.delete(trackKey);
          return next;
        });
      }, 3000);

      const keyText =
        keyAdjustment !== 0
          ? ` (Key: ${keyAdjustment > 0 ? "+" : ""}${keyAdjustment})`
          : "";
      showToast(
        `Added "${track.title || "Unknown"}" to ${name}'s queue${keyText}`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (
        msg.includes("409") ||
        msg.toLowerCase().includes("already requested")
      ) {
        showToast("⚠️ You already have this song in the queue", "error");
      } else {
        showToast("Failed to add song. Please try again.", "error");
        console.error(err);
      }
    } finally {
      setAddingKaraokeNerds(null);
    }
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
                        {groupedLocalRows.map((group, idx) => {
                          const row = group.versions[0];
                          const trackKey = `local-${row.id}`;
                          const isRecentlyAdded =
                            recentlyAdded.has(trackKey) ||
                            group.versions.some((v) =>
                              recentlyAdded.has(`local-${v.id}`),
                            );
                          const isAdding = group.versions.some(
                            (v) => addingLocal === v.id,
                          );
                          const currentKey = keyAdjustments.get(trackKey) ?? 0;
                          const hasMultipleVersions = group.versions.length > 1;

                          return (
                            <div key={group.key} className="result-card">
                              <div className="result-number">{idx + 1}</div>
                              <div className="result-info">
                                <div className="result-title">
                                  {group.title || "Unknown Title"}
                                </div>
                                <div className="result-artist">
                                  {group.artist || "Unknown Artist"}
                                </div>
                                <div className="result-meta">
                                  {hasMultipleVersions ? (
                                    <span className="meta-tag">
                                      📀 {formatCount(group.versions.length, "version")}
                                    </span>
                                  ) : (
                                    <>
                                      {row.disc_id && (
                                        <span className="meta-tag">
                                          📀 {row.disc_id}
                                        </span>
                                      )}
                                      {row.kind && (
                                        <span className="meta-tag">
                                          {formatTrackKind(row.kind)}
                                        </span>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                              <div className="button-container">
                                {/* Single Action Menu Button */}
                                <div
                                  style={{
                                    position: "relative",
                                    width: "100%",
                                  }}
                                >
                                  <button
                                    className={`action-menu-button ${isRecentlyAdded ? "success" : ""}`}
                                    aria-label={isRecentlyAdded ? "Added to your queue" : "Request this song"}
                                    onClick={(e) => {
                                      if (isRecentlyAdded || isAdding) return;
                                      if (hasMultipleVersions) {
                                        setVersionPicker({
                                          title: group.title,
                                          artist: group.artist,
                                          versions: group.versions,
                                        });
                                      } else {
                                        handleActionMenuToggle(
                                          e,
                                          trackKey,
                                          actionMenuOpen,
                                        );
                                      }
                                    }}
                                    disabled={isAdding || isRecentlyAdded}
                                  >
                                    {isAdding ? (
                                      <>
                                        <div className="button-spinner"></div>
                                        <span>Adding</span>
                                      </>
                                    ) : isRecentlyAdded ? (
                                      <span className="material-symbols-rounded" aria-hidden="true">check</span>
                                    ) : hasMultipleVersions ? (
                                      <span className="material-symbols-rounded" aria-hidden="true">add</span>
                                    ) : (
                                      <span className="material-symbols-rounded" aria-hidden="true">add</span>
                                    )}
                                  </button>

                                  {/* Action Menu */}
                                  {actionMenuOpen === trackKey &&
                                    createPortal(
                                      <>
                                        {/* Mobile overlay */}
                                        <div
                                          className="action-menu-overlay"
                                          onClick={() =>
                                            setActionMenuOpen(null)
                                          }
                                        />

                                        <div
                                          className="action-menu"
                                          ref={actionMenuRef}
                                          onClick={(e) => e.stopPropagation()}
                                          style={
                                            actionMenuPosition
                                              ? {
                                                  top: `${actionMenuPosition.top}px`,
                                                  left: `${actionMenuPosition.left}px`,
                                                  width: "max-content",
                                                  minWidth: `${actionMenuPosition.width}px`,
                                                }
                                              : undefined
                                          }
                                        >
                                          <div className="action-menu-header">
                                            <h3 className="action-menu-title">
                                              {group.title || "Unknown Title"}{" "}
                                              Options
                                            </h3>
                                            <button
                                              className="action-menu-close"
                                              type="button"
                                              onClick={() =>
                                                setActionMenuOpen(null)
                                              }
                                            >
                                              Close
                                            </button>
                                          </div>

                                          {keyAdjustmentView === trackKey ? (
                                            // Key Adjustment View
                                            <div className="key-adjustment-view">
                                              <div className="key-adjustment-header">
                                                <button
                                                  className="key-adjustment-back"
                                                  onClick={() =>
                                                    setKeyAdjustmentView(null)
                                                  }
                                                >
                                                  <span>←</span>
                                                  <span>Back</span>
                                                </button>
                                                <span className="key-adjustment-title">
                                                  Adjust Key
                                                </span>
                                              </div>

                                              <div className="key-adjustment-controls">
                                                <button
                                                  className="key-adjustment-button"
                                                  onClick={() =>
                                                    adjustKey(trackKey, -1)
                                                  }
                                                  disabled={
                                                    (keyAdjustments.get(
                                                      trackKey,
                                                    ) ?? 0) <=
                                                    MIN_KEY_ADJUSTMENT
                                                  }
                                                  aria-label="Lower key"
                                                >
                                                  −
                                                </button>
                                                <div className="key-adjustment-display">
                                                  <div className="key-adjustment-value">
                                                    🎹{" "}
                                                    {currentKey > 0
                                                      ? `+${currentKey}`
                                                      : currentKey}
                                                  </div>
                                                  <div className="key-adjustment-label">
                                                    Semitones
                                                  </div>
                                                </div>
                                                <button
                                                  className="key-adjustment-button"
                                                  onClick={() =>
                                                    adjustKey(trackKey, 1)
                                                  }
                                                  disabled={
                                                    (keyAdjustments.get(
                                                      trackKey,
                                                    ) ?? 0) >=
                                                    MAX_KEY_ADJUSTMENT
                                                  }
                                                  aria-label="Raise key"
                                                >
                                                  +
                                                </button>
                                              </div>
                                            </div>
                                          ) : (
                                            // Main Menu Items
                                            <div className="action-menu-body">
                                              <p className="action-menu-meta">
                                                {[
                                                  group.artist ||
                                                    "Unknown Artist",
                                                  row.disc_id,
                                                  formatTrackKind(row.kind),
                                                ]
                                                  .filter(Boolean)
                                                  .join(" · ")}
                                              </p>
                                              {!hasMultipleVersions && (
                                                <div className="key-controls">
                                                  <span>
                                                    Key:{" "}
                                                    {currentKey > 0
                                                      ? `+${currentKey}`
                                                      : currentKey}
                                                  </span>
                                                  <button
                                                    className="secondary compact"
                                                    type="button"
                                                    onClick={() =>
                                                      adjustKey(trackKey, -1)
                                                    }
                                                    disabled={
                                                      currentKey <=
                                                      MIN_KEY_ADJUSTMENT
                                                    }
                                                  >
                                                    −
                                                  </button>
                                                  <button
                                                    className="secondary compact"
                                                    type="button"
                                                    onClick={() =>
                                                      adjustKey(trackKey, 1)
                                                    }
                                                    disabled={
                                                      currentKey >=
                                                      MAX_KEY_ADJUSTMENT
                                                    }
                                                  >
                                                    +
                                                  </button>
                                                </div>
                                              )}
                                            <div className="action-menu-items">
                                              {/* Add to Queue - Primary action */}
                                              <button
                                                className="action-menu-item primary"
                                                onClick={() => {
                                                  setActionMenuOpen(null);
                                                  if (hasMultipleVersions) {
                                                    setVersionPicker({
                                                      title: group.title,
                                                      artist: group.artist,
                                                      versions: group.versions,
                                                    });
                                                  } else {
                                                    enqueueLocal(
                                                      row.id,
                                                      row.title || "Unknown",
                                                    );
                                                  }
                                                }}
                                              >
                                                <span className="action-menu-item-icon">
                                                  +
                                                </span>
                                                <div className="action-menu-item-content">
                                                  <span className="action-menu-item-label">
                                                    Add to Queue
                                                  </span>
                                                  <span className="action-menu-item-description">
                                                    {hasMultipleVersions
                                                      ? `Choose from ${formatCount(group.versions.length, "version")}`
                                                      : "Request this song"}
                                                  </span>
                                                </div>
                                              </button>

                                              {/* Adjust Key (single-version only) */}
                                              {!hasMultipleVersions && (
                                                <button
                                                  hidden
                                                  className="action-menu-item"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setKeyAdjustmentView(
                                                      trackKey,
                                                    );
                                                  }}
                                                >
                                                  <span className="action-menu-item-icon">
                                                    🎹
                                                  </span>
                                                  <div className="action-menu-item-content">
                                                    <span className="action-menu-item-label">
                                                      Adjust Key
                                                    </span>
                                                    <span className="action-menu-item-description">
                                                      Change pitch
                                                    </span>
                                                  </div>
                                                  <span className="action-menu-item-value">
                                                    {currentKey > 0
                                                      ? `+${currentKey}`
                                                      : currentKey}
                                                  </span>
                                                </button>
                                              )}

                                              {/* View Lyrics */}
                                              <button
                                                className="action-menu-item"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  const artist =
                                                    group.artist ||
                                                    "Unknown Artist";
                                                  const title =
                                                    group.title ||
                                                    "Unknown Title";
                                                  setActionMenuOpen(null);
                                                  setLyricsPopupOpen(trackKey);
                                                  if (!lyricsData[trackKey]) {
                                                    fetchLyrics(
                                                      trackKey,
                                                      artist,
                                                      title,
                                                    );
                                                  }
                                                }}
                                              >
                                                <span className="action-menu-item-icon">
                                                  ♪
                                                </span>
                                                <div className="action-menu-item-content">
                                                  <span className="action-menu-item-label">
                                                    View Lyrics
                                                  </span>
                                                  <span className="action-menu-item-description">
                                                    See song words
                                                  </span>
                                                </div>
                                              </button>
                                            </div>
                                            </div>
                                          )}
                                        </div>
                                      </>,
                                      document.body,
                                    )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
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
                            {combinedSearchGroups.map((group, idx) => {
                              const firstTrack = group.versions[0];
                              const hasMultipleVersions =
                                group.versions.length > 1;
                              const hasExternal = group.versions.some(
                                (track) => track.type === "online",
                              );
                              const isRecentlyAdded = group.versions.some(
                                (track) => recentlyAdded.has(track.key),
                              );
                              const isAdding = group.versions.some((track) =>
                                track.type === "local"
                                  ? addingLocal === track.track.id
                                  : addingKaraokeNerds === track.track.url,
                              );
                              const trackKey = firstTrack.key;
                              const currentKey =
                                keyAdjustments.get(trackKey) ?? 0;
                              const versionText =
                                firstTrack.type === "online"
                                  ? firstTrack.brand || "Karaoke Version"
                                  : firstTrack.discId || "";
                              const metaLine = [
                                group.artist || "Unknown Artist",
                                firstTrack.type === "online"
                                  ? "🌐 Online"
                                  : null,
                                versionText,
                              ]
                                .filter(Boolean)
                                .join(" · ");

                              return (
                                <div key={group.key} className="result-card">
                                  <div className="result-number">{idx + 1}</div>
                                  <div className="result-info">
                                    <div className="result-title">
                                      {group.title || "Unknown Title"}
                                    </div>
                                    <div className="result-artist">
                                      {group.artist || "Unknown Artist"}
                                    </div>
                                    <div className="result-meta">
                                      {hasMultipleVersions || hasExternal ? (
                                        <span
                                          className={`meta-tag ${hasExternal ? "brand" : ""}`}
                                        >
                                          {hasExternal ? "🌐 " : ""}
                                          {formatCount(group.versions.length, "version")}
                                        </span>
                                      ) : (
                                        <>
                                          {firstTrack.type === "local" &&
                                            firstTrack.discId && (
                                              <span className="meta-tag">
                                                {firstTrack.discId}
                                              </span>
                                            )}
                                          {firstTrack.type === "online" &&
                                            firstTrack.brand && (
                                              <span className="meta-tag brand">
                                                {firstTrack.brand}
                                              </span>
                                            )}
                                        </>
                                      )}
                                    </div>
                                  </div>
                                  <div className="button-container">
                                    <button
                                      className={`action-menu-button ${firstTrack.type === "online" ? "karaoke-nerds" : ""} ${isRecentlyAdded ? "success" : ""}`}
                                      type="button"
                                      title={
                                        hasMultipleVersions
                                          ? "Choose version"
                                          : "Request this song"
                                      }
                                      aria-label={
                                        isRecentlyAdded
                                          ? "Added to your queue"
                                          : hasMultipleVersions
                                            ? "Choose a version to request"
                                            : "Request this song"
                                      }
                                      onClick={(e) => {
                                        if (isRecentlyAdded || isAdding) return;
                                        if (hasMultipleVersions) {
                                          setCombinedVersionPicker({
                                            title: group.title,
                                            artist: group.artist,
                                            versions: group.versions,
                                          });
                                        } else {
                                          handleActionMenuToggle(
                                            e,
                                            trackKey,
                                            actionMenuOpen,
                                          );
                                        }
                                      }}
                                      disabled={isAdding || isRecentlyAdded}
                                    >
                                      {isAdding ? (
                                        <div className="button-spinner"></div>
                                      ) : isRecentlyAdded ? (
                                        <span className="material-symbols-rounded" aria-hidden="true">check</span>
                                      ) : hasMultipleVersions ? (
                                        <span className="material-symbols-rounded" aria-hidden="true">add</span>
                                      ) : (
                                        <span className="material-symbols-rounded" aria-hidden="true">add</span>
                                      )}
                                    </button>
                                    {actionMenuOpen === trackKey &&
                                      createPortal(
                                        <>
                                          <div
                                            className="action-menu-overlay"
                                            onClick={() =>
                                              setActionMenuOpen(null)
                                            }
                                          />
                                          <div
                                            className="action-menu"
                                            ref={actionMenuRef}
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <div className="action-menu-header">
                                              <h3 className="action-menu-title">
                                                {group.title || "Unknown Title"}{" "}
                                                Options
                                              </h3>
                                              <button
                                                className="action-menu-close"
                                                type="button"
                                                onClick={() =>
                                                  setActionMenuOpen(null)
                                                }
                                              >
                                                Close
                                              </button>
                                            </div>
                                            <div className="action-menu-body">
                                              <p className="action-menu-meta">
                                                {metaLine}
                                              </p>
                                              {firstTrack.type === "local" && (
                                                <div className="key-controls">
                                                  <span>
                                                    Key:{" "}
                                                    {currentKey > 0
                                                      ? `+${currentKey}`
                                                      : currentKey}
                                                  </span>
                                                  <button
                                                    className="secondary compact"
                                                    type="button"
                                                    onClick={() =>
                                                      adjustKey(trackKey, -1)
                                                    }
                                                    disabled={
                                                      currentKey <=
                                                      MIN_KEY_ADJUSTMENT
                                                    }
                                                  >
                                                    −
                                                  </button>
                                                  <button
                                                    className="secondary compact"
                                                    type="button"
                                                    onClick={() =>
                                                      adjustKey(trackKey, 1)
                                                    }
                                                    disabled={
                                                      currentKey >=
                                                      MAX_KEY_ADJUSTMENT
                                                    }
                                                  >
                                                    +
                                                  </button>
                                                </div>
                                              )}
                                              <div className="action-menu-items">
                                                <button
                                                  className="action-menu-item primary"
                                                  type="button"
                                                  onClick={() => {
                                                    setActionMenuOpen(null);
                                                    if (
                                                      firstTrack.type ===
                                                      "local"
                                                    ) {
                                                      void enqueueLocal(
                                                        firstTrack.track.id,
                                                        firstTrack.title ||
                                                          "Unknown",
                                                      );
                                                    } else {
                                                      void enqueueKaraokeNerds(
                                                        firstTrack.track,
                                                      );
                                                    }
                                                  }}
                                                >
                                                  <span className="action-menu-item-icon">
                                                    +
                                                  </span>
                                                  <div className="action-menu-item-content">
                                                    <span className="action-menu-item-label">
                                                      Add to Queue
                                                    </span>
                                                    <span className="action-menu-item-description">
                                                      Request this song
                                                    </span>
                                                  </div>
                                                </button>
                                                <button
                                                  className="action-menu-item secondary"
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActionMenuOpen(null);
                                                    setLyricsPopupOpen(trackKey);
                                                    if (!lyricsData[trackKey]) {
                                                      fetchLyrics(
                                                        trackKey,
                                                        group.artist ||
                                                          "Unknown Artist",
                                                        group.title ||
                                                          "Unknown Title",
                                                      );
                                                    }
                                                  }}
                                                >
                                                  <span className="action-menu-item-icon">
                                                    ♪
                                                  </span>
                                                  <div className="action-menu-item-content">
                                                    <span className="action-menu-item-label">
                                                      View Lyrics
                                                    </span>
                                                    <span className="action-menu-item-description">
                                                      See song words
                                                    </span>
                                                  </div>
                                                </button>
                                              </div>
                                            </div>
                                          </div>
                                        </>,
                                        document.body,
                                      )}
                                  </div>
                                </div>
                              );
                            })}
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
                                          setVersionPicker({
                                            title: group.title,
                                            artist: group.artist,
                                            versions: group.versions,
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
                    {/* Local library results */}
                    {false &&
                      (sourceFilter === "all" || sourceFilter === "local") &&
                      localLibraryEnabled &&
                      (isLoading ? (
                        <div className="loading-container">
                          <div className="loading-spinner"></div>
                          <div className="loading-text">
                            Searching local library...
                          </div>
                        </div>
                      ) : showLocalResults ? (
                        <>
                          <div
                            className="results-header"
                            onClick={() => setLocalExpanded((e) => !e)}
                            style={{ cursor: "pointer", userSelect: "none" }}
                          >
                            <span className="results-count">
                              <img
                                src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f4da.svg"
                                alt=""
                                style={{
                                  width: 14,
                                  height: 14,
                                  verticalAlign: "middle",
                                  marginRight: 5,
                                }}
                              />
                              Local — {groupedLocalRows.length}{" "}
                              {groupedLocalRows.length === 1 ? "song" : "songs"}
                              {groupedLocalRows.length < localRows.length && (
                                <span
                                  style={{
                                    marginLeft: 6,
                                    fontSize: 11,
                                    color: "var(--color-text-muted)",
                                    fontWeight: 400,
                                  }}
                                >
                                  ({formatCount(localRows.length, "version")})
                                </span>
                              )}
                            </span>
                            <div
                              style={{
                                display: "flex",
                                gap: 6,
                                alignItems: "center",
                              }}
                            >
                              {kindFilter !== "all" && (
                                <span className="active-filter-badge">
                                  {kindFilter === "mp4"
                                    ? "🎬 Video"
                                    : "📀 CDG"}
                                </span>
                              )}
                              <span
                                style={{
                                  fontSize: 13,
                                  color: "var(--color-text-muted)",
                                }}
                              >
                                {localExpanded ? "▲" : "▼"}
                              </span>
                            </div>
                          </div>
                          {localExpanded && (
                            <div className="results-container">
                              {groupedLocalRows.map((group, idx) => {
                                const row = group.versions[0];
                                const trackKey = `local-${row.id}`;
                                const isRecentlyAdded =
                                  recentlyAdded.has(trackKey) ||
                                  group.versions.some((v) =>
                                    recentlyAdded.has(`local-${v.id}`),
                                  );
                                const isAdding = group.versions.some(
                                  (v) => addingLocal === v.id,
                                );
                                const currentKey =
                                  keyAdjustments.get(trackKey) ?? 0;
                                const hasMultipleVersions =
                                  group.versions.length > 1;
                                return (
                                  <div key={group.key} className="result-card">
                                    <div className="result-number">
                                      {idx + 1}
                                    </div>
                                    <div className="result-info">
                                      <div className="result-title">
                                        {group.title || "Unknown Title"}
                                      </div>
                                      <div className="result-artist">
                                        {group.artist || "Unknown Artist"}
                                      </div>
                                      <div className="result-meta">
                                        {hasMultipleVersions ? (
                                          <span className="meta-tag">
                                            📀 {formatCount(group.versions.length, "version")}
                                          </span>
                                        ) : (
                                          <>
                                            {row.disc_id && (
                                              <span className="meta-tag">
                                                📀 {row.disc_id}
                                              </span>
                                            )}
                                            {row.kind && (
                                              <span className="meta-tag">
                                                {formatTrackKind(row.kind)}
                                              </span>
                                            )}
                                          </>
                                        )}
                                      </div>
                                    </div>
                                    <div className="button-container">
                                      <div
                                        style={{
                                          position: "relative",
                                          width: "100%",
                                        }}
                                      >
                                        <button
                                          className={`action-menu-button ${isRecentlyAdded ? "success" : ""}`}
                                    aria-label={isRecentlyAdded ? "Added to your queue" : "Request this song"}
                                          onClick={(e) => {
                                            if (isRecentlyAdded || isAdding)
                                              return;
                                            if (hasMultipleVersions) {
                                              setVersionPicker({
                                                title: group.title ?? "",
                                                artist: group.artist ?? "",
                                                versions: group.versions,
                                              });
                                            } else {
                                              handleActionMenuToggle(
                                                e,
                                                trackKey,
                                                actionMenuOpen,
                                              );
                                            }
                                          }}
                                          disabled={isAdding || isRecentlyAdded}
                                        >
                                          {isAdding ? (
                                            <>
                                              <div className="button-spinner"></div>
                                              <span>Adding</span>
                                            </>
                                          ) : isRecentlyAdded ? (
                                            <span className="material-symbols-rounded" aria-hidden="true">check</span>
                                          ) : hasMultipleVersions ? (
                                            <span className="material-symbols-rounded" aria-hidden="true">add</span>
                                          ) : (
                                            <span className="material-symbols-rounded" aria-hidden="true">add</span>
                                          )}
                                        </button>
                                        {actionMenuOpen === trackKey &&
                                          createPortal(
                                            <>
                                              <div
                                                className="action-menu-overlay"
                                                onClick={() =>
                                                  setActionMenuOpen(null)
                                                }
                                              />
                                              <div
                                                className="action-menu"
                                                ref={actionMenuRef}
                                                onClick={(e) =>
                                                  e.stopPropagation()
                                                }
                                                style={
                                                  actionMenuPosition
                                                    ? {
                                                        top: `${actionMenuPosition.top}px`,
                                                        left: `${actionMenuPosition.left}px`,
                                                        width: "max-content",
                                                        minWidth: `${actionMenuPosition.width}px`,
                                                      }
                                                    : undefined
                                                }
                                              >
                                                <div className="action-menu-header">
                                                  <h3 className="action-menu-title">
                                                    {group.title ||
                                                      "Unknown Title"}{" "}
                                                    Options
                                                  </h3>
                                                  <button
                                                    className="action-menu-close"
                                                    type="button"
                                                    onClick={() =>
                                                      setActionMenuOpen(null)
                                                    }
                                                  >
                                                    Close
                                                  </button>
                                                </div>
                                                <div className="action-menu-body">
                                                  <p className="action-menu-meta">
                                                    {[
                                                      group.artist ||
                                                        "Unknown Artist",
                                                      row.disc_id,
                                                      formatTrackKind(row.kind),
                                                    ]
                                                      .filter(Boolean)
                                                      .join(" · ")}
                                                  </p>
                                                  {!hasMultipleVersions && (
                                                    <div className="key-controls">
                                                      <span>
                                                        Key:{" "}
                                                        {currentKey > 0
                                                          ? `+${currentKey}`
                                                          : currentKey}
                                                      </span>
                                                      <button
                                                        className="secondary compact"
                                                        type="button"
                                                        onClick={() =>
                                                          adjustKey(trackKey, -1)
                                                        }
                                                        disabled={
                                                          currentKey <=
                                                          MIN_KEY_ADJUSTMENT
                                                        }
                                                      >
                                                        −
                                                      </button>
                                                      <button
                                                        className="secondary compact"
                                                        type="button"
                                                        onClick={() =>
                                                          adjustKey(trackKey, 1)
                                                        }
                                                        disabled={
                                                          currentKey >=
                                                          MAX_KEY_ADJUSTMENT
                                                        }
                                                      >
                                                        +
                                                      </button>
                                                    </div>
                                                  )}
                                                <div className="action-menu-items">
                                                  <button
                                                    className="action-menu-item primary"
                                                    onClick={() => {
                                                      setActionMenuOpen(null);
                                                      if (hasMultipleVersions) {
                                                        setVersionPicker({
                                                          title:
                                                            group.title ?? "",
                                                          artist:
                                                            group.artist ?? "",
                                                          versions:
                                                            group.versions,
                                                        });
                                                      } else {
                                                        void enqueueLocal(
                                                          row.id,
                                                          row.title || "",
                                                        );
                                                      }
                                                    }}
                                                  >
                                                    <span className="action-menu-item-icon">
                                                      +
                                                    </span>
                                                    <div className="action-menu-item-content">
                                                      <span className="action-menu-item-label">
                                                        Add to Queue
                                                      </span>
                                                      <span className="action-menu-item-description">
                                                        {hasMultipleVersions
                                                          ? `Choose from ${formatCount(group.versions.length, "version")}`
                                                          : "Request this song"}
                                                      </span>
                                                    </div>
                                                  </button>
                                                  <button
                                                    className="action-menu-item"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      setActionMenuOpen(null);
                                                      setLyricsPopupOpen(
                                                        trackKey,
                                                      );
                                                      if (
                                                        !lyricsData[trackKey]
                                                      ) {
                                                        fetchLyrics(
                                                          trackKey,
                                                          group.artist ||
                                                            "Unknown Artist",
                                                          group.title || "",
                                                        );
                                                      }
                                                    }}
                                                  >
                                                    <span className="action-menu-item-icon">
                                                      ♪
                                                    </span>
                                                    <div className="action-menu-item-content">
                                                      <span className="action-menu-item-label">
                                                        View Lyrics
                                                      </span>
                                                      <span className="action-menu-item-description">
                                                        See song words
                                                      </span>
                                                    </div>
                                                  </button>
                                                </div>
                                                </div>
                                              </div>
                                            </>,
                                            document.body,
                                          )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </>
                      ) : localLibraryEnabled && q.trim() && !isLoading ? (
                        <div className="empty-state">
                          <div className="empty-icon">🎵</div>
                          <div className="empty-title">
                            No local results for "{q}"
                          </div>
                          {fuzzySuggestions.length > 0 && (
                            <div style={{ marginTop: 12, textAlign: "left" }}>
                              <div
                                style={{
                                  color: "var(--color-text-secondary)",
                                  fontSize: 13,
                                  marginBottom: 8,
                                }}
                              >
                                {fuzzySuggestions[0]?.matched_term
                                  ? `Do you mean “${fuzzySuggestions[0].matched_term}”?`
                                  : "Do you mean…?"}
                              </div>
                              {Array.from(
                                fuzzySuggestions
                                  .reduce((map, track) => {
                                    const key = groupKey(
                                      track.title ?? "",
                                      track.artist ?? "",
                                    );
                                    if (!map.has(key))
                                      map.set(key, { track, versions: [] });
                                    map.get(key)!.versions.push(track);
                                    return map;
                                  }, new Map<string, { track: SearchRow; versions: SearchRow[] }>())
                                  .values(),
                              ).map(({ track, versions }) => (
                                <div
                                  key={track.id}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 10,
                                    padding: "8px 12px",
                                    background: "var(--color-bg-secondary)",
                                    borderRadius: 8,
                                    marginBottom: 6,
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
                                      {track.title}
                                    </div>
                                    <div
                                      style={{
                                        fontSize: 12,
                                        color: "var(--color-text-secondary)",
                                      }}
                                    >
                                      {track.artist}
                                    </div>
                                    {versions.length > 1 && (
                                      <div
                                        style={{
                                          fontSize: 11,
                                          color: "var(--color-text-muted)",
                                          marginTop: 2,
                                        }}
                                      >
                                        📀 {formatCount(versions.length, "version")}
                                      </div>
                                    )}
                                  </div>
                                  <button
                                    className="add-btn"
                                    disabled={versions.some(
                                      (v) => addingLocal === v.id,
                                    )}
                                    onClick={() => {
                                      if (versions.length > 1) {
                                        setVersionPicker({
                                          title: track.title ?? "",
                                          artist: track.artist ?? "",
                                          versions,
                                        });
                                      } else {
                                        void enqueueLocal(
                                          track.id,
                                          track.title || "",
                                        );
                                      }
                                    }}
                                    style={{ flexShrink: 0 }}
                                  >
                                    {versions.some((v) => addingLocal === v.id)
                                      ? "…"
                                      : "+ Add"}
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : null)}

                    {/* Karaoke Nerds results */}
                    {false &&
                      (sourceFilter === "all" || sourceFilter === "online") &&
                      externalLibraryEnabled &&
                      (isKnLoading ? (
                        <div className="loading-container">
                          <div className="loading-spinner"></div>
                          <div className="loading-text">
                            Searching Karaoke Nerds...
                          </div>
                        </div>
                      ) : showKnResults ? (
                        <>
                          <div
                            className="results-header"
                            onClick={() => setKnExpanded((e) => !e)}
                            style={{ cursor: "pointer", userSelect: "none" }}
                          >
                            <span className="results-count">
                              <img
                                src="https://karaokenerds.com/Content/Icons/favicon.ico"
                                alt=""
                                style={{
                                  width: 14,
                                  height: 14,
                                  verticalAlign: "middle",
                                  marginRight: 5,
                                }}
                              />
                              Online — {groupedKnRows.length}{" "}
                              {groupedKnRows.length === 1 ? "song" : "songs"}
                              {groupedKnRows.length <
                                karaokeNerdsRows.length && (
                                <span
                                  style={{
                                    marginLeft: 6,
                                    fontSize: 11,
                                    color: "var(--color-text-muted)",
                                    fontWeight: 400,
                                  }}
                                >
                                  ({formatCount(karaokeNerdsRows.length, "version")})
                                </span>
                              )}
                            </span>
                            <span
                              style={{
                                fontSize: 13,
                                color: "var(--color-text-muted)",
                              }}
                            >
                              {knExpanded ? "▲" : "▼"}
                            </span>
                          </div>
                          {knExpanded && (
                            <div className="results-container">
                              {groupedKnRows.map((group, idx) => {
                                const firstTrack = group.versions[0];
                                const trackKey = `kn-${firstTrack.url}`;
                                const isRecentlyAdded = group.versions.some(
                                  (v) => recentlyAdded.has(`kn-${v.url}`),
                                );
                                const isAdding = group.versions.some(
                                  (v) => addingKaraokeNerds === v.url,
                                );
                                const hasMultipleVersions =
                                  group.versions.length > 1;
                                return (
                                  <div key={group.key} className="result-card">
                                    <div className="result-number">
                                      {idx + 1}
                                    </div>
                                    <div className="result-info">
                                      <div className="result-title">
                                        {group.title}
                                      </div>
                                      <div className="result-artist">
                                        {group.artist || "Unknown Artist"}
                                      </div>
                                      <div className="result-meta">
                                        {hasMultipleVersions ? (
                                          <span className="meta-tag">
                                            🎵 {formatCount(group.versions.length, "version")}
                                          </span>
                                        ) : firstTrack.brand ? (
                                          <span className="meta-tag brand">
                                            🎵 {firstTrack.brand}
                                          </span>
                                        ) : null}
                                        <span className="meta-tag">
                                          🌐 Online
                                        </span>
                                      </div>
                                    </div>
                                    <div className="button-container">
                                      <div
                                        style={{
                                          position: "relative",
                                          width: "100%",
                                        }}
                                      >
                                        <button
                                          className={`action-menu-button karaoke-nerds ${isRecentlyAdded ? "success" : ""}`}
                                    aria-label={isRecentlyAdded ? "Added to your queue" : "Request this song"}
                                          onClick={(e) => {
                                            if (isRecentlyAdded || isAdding)
                                              return;
                                            if (hasMultipleVersions) {
                                              setKnVersionPicker({
                                                title: group.title,
                                                artist: group.artist,
                                                versions: group.versions,
                                              });
                                            } else {
                                              handleActionMenuToggle(
                                                e,
                                                trackKey,
                                                actionMenuOpen,
                                              );
                                            }
                                          }}
                                          disabled={isAdding || isRecentlyAdded}
                                        >
                                          {isAdding ? (
                                            <>
                                              <div className="button-spinner"></div>
                                              <span>Adding</span>
                                            </>
                                          ) : isRecentlyAdded ? (
                                            <span className="material-symbols-rounded" aria-hidden="true">check</span>
                                          ) : hasMultipleVersions ? (
                                            <span className="material-symbols-rounded" aria-hidden="true">add</span>
                                          ) : (
                                            <span className="material-symbols-rounded" aria-hidden="true">add</span>
                                          )}
                                        </button>
                                        {actionMenuOpen === trackKey &&
                                          createPortal(
                                            <>
                                              <div
                                                className="action-menu-overlay"
                                                onClick={() =>
                                                  setActionMenuOpen(null)
                                                }
                                              />
                                              <div
                                                className="action-menu"
                                                ref={actionMenuRef}
                                                onClick={(e) =>
                                                  e.stopPropagation()
                                                }
                                                style={
                                                  actionMenuPosition
                                                    ? {
                                                        top: `${actionMenuPosition.top}px`,
                                                        left: `${actionMenuPosition.left}px`,
                                                        width: "max-content",
                                                        minWidth: `${actionMenuPosition.width}px`,
                                                      }
                                                    : undefined
                                                }
                                              >
                                                <div className="action-menu-header">
                                                  <h3 className="action-menu-title">
                                                    {group.title} Options
                                                  </h3>
                                                  <button
                                                    className="action-menu-close"
                                                    type="button"
                                                    onClick={() =>
                                                      setActionMenuOpen(null)
                                                    }
                                                  >
                                                    Close
                                                  </button>
                                                </div>
                                                <div className="action-menu-body">
                                                  <p className="action-menu-meta">
                                                    {[
                                                      group.artist ||
                                                        "Unknown Artist",
                                                      "🌐 Online",
                                                      firstTrack.brand ||
                                                        "Karaoke Version",
                                                    ]
                                                      .filter(Boolean)
                                                      .join(" · ")}
                                                  </p>
                                                <div className="action-menu-items">
                                                  <button
                                                    className="action-menu-item primary"
                                                    onClick={() => {
                                                      setActionMenuOpen(null);
                                                      if (hasMultipleVersions) {
                                                        setKnVersionPicker({
                                                          title: group.title,
                                                          artist: group.artist,
                                                          versions:
                                                            group.versions,
                                                        });
                                                      } else {
                                                        void enqueueKaraokeNerds(
                                                          firstTrack,
                                                        );
                                                      }
                                                    }}
                                                  >
                                                    <span className="action-menu-item-icon">
                                                      +
                                                    </span>
                                                    <div className="action-menu-item-content">
                                                      <span className="action-menu-item-label">
                                                        Add to Queue
                                                      </span>
                                                      <span className="action-menu-item-description">
                                                        {hasMultipleVersions
                                                          ? `Choose from ${formatCount(group.versions.length, "version")}`
                                                          : "Request this song"}
                                                      </span>
                                                    </div>
                                                  </button>
                                                  <button
                                                    className="action-menu-item"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      setActionMenuOpen(null);
                                                      setLyricsPopupOpen(
                                                        trackKey,
                                                      );
                                                      if (
                                                        !lyricsData[trackKey]
                                                      ) {
                                                        fetchLyrics(
                                                          trackKey,
                                                          group.artist ||
                                                            "Unknown Artist",
                                                          group.title,
                                                        );
                                                      }
                                                    }}
                                                  >
                                                    <span className="action-menu-item-icon">
                                                      ♪
                                                    </span>
                                                    <div className="action-menu-item-content">
                                                      <span className="action-menu-item-label">
                                                        View Lyrics
                                                      </span>
                                                      <span className="action-menu-item-description">
                                                        See song words
                                                      </span>
                                                    </div>
                                                  </button>
                                                </div>
                                                </div>
                                              </div>
                                            </>,
                                            document.body,
                                          )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </>
                      ) : q.trim() && !isKnLoading ? (
                        <div
                          className="empty-state"
                          style={{ marginTop: showLocalResults ? 8 : 0 }}
                        >
                          <div className="empty-icon">🌐</div>
                          <div className="empty-title">
                            No Karaoke Nerds results for "{q}"
                          </div>
                        </div>
                      ) : null)}

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

      <VersionPickerDialog
        versionPicker={versionPicker}
        setVersionPicker={setVersionPicker}
        addingLocal={addingLocal}
        setLyricsPopupOpen={setLyricsPopupOpen}
        lyricsData={lyricsData}
        fetchLyrics={fetchLyrics}
        enqueueLocal={enqueueLocal}
      />

      <KnVersionPickerDialog
        knVersionPicker={knVersionPicker}
        setKnVersionPicker={setKnVersionPicker}
        addingKaraokeNerds={addingKaraokeNerds}
        setLyricsPopupOpen={setLyricsPopupOpen}
        lyricsData={lyricsData}
        fetchLyrics={fetchLyrics}
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
