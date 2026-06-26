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

const MIN_KEY_ADJUSTMENT = -6;
const MAX_KEY_ADJUSTMENT = 6;
const MOBILE_BREAKPOINT = 640;
const BROWSE_LETTERS = ["#", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")];
const SINGER_UUID_STORAGE_KEY = "karaoke-singer-uuid";

type SearchRow = {
  id: number;
  title: string | null;
  artist: string | null;
  disc_id: string | null;
  kind: "mp4" | "cdgmp3" | "zip" | "mp3";
};

type KaraokeNerdsTrack = {
  title: string;
  artist: string;
  url: string;
  brand?: string;
  source: "karaoke-nerds";
};

type MyQueueItem = {
  id: number;
  title: string | null;
  artist: string | null;
  status: string;
};

type BrowseCategory = "artist" | "title";

function normalizeMyQueueItems(items: unknown): MyQueueItem[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as {
        id?: unknown;
        title?: unknown;
        artist?: unknown;
        status?: unknown;
      };
      const id = Number(row.id);
      if (!Number.isFinite(id)) return null;
      return {
        id,
        title: typeof row.title === "string" ? row.title : null,
        artist: typeof row.artist === "string" ? row.artist : null,
        status: typeof row.status === "string" ? row.status : "",
      };
    })
    .filter((item): item is MyQueueItem => item !== null);
}

function reorderQueuedItems(
  items: MyQueueItem[],
  draggedId: number,
  targetId: number,
): { items: MyQueueItem[]; queuedIds: number[] } | null {
  if (draggedId === targetId) return null;
  const queued = items.filter((item) => item.status === "queued");
  const fromIdx = queued.findIndex((item) => item.id === draggedId);
  const toIdx = queued.findIndex((item) => item.id === targetId);
  if (fromIdx === -1 || toIdx === -1) return null;

  const reordered = [...queued];
  reordered.splice(toIdx, 0, reordered.splice(fromIdx, 1)[0]);
  const queuedIds = reordered.map((item) => item.id);
  const nextQueued = [...reordered];
  const nextItems = items.map((item) =>
    item.status === "queued" ? nextQueued.shift()! : item,
  );
  return { items: nextItems, queuedIds };
}

function shouldHandleEnterKey(
  event: React.KeyboardEvent<HTMLInputElement>,
): boolean {
  const nativeEvent = event.nativeEvent as KeyboardEvent & {
    isComposing?: boolean;
  };
  return event.key === "Enter" && !nativeEvent.isComposing;
}

/**
 * Normalize an artist name for grouping:
 * - Lowercase
 * - Invert "Artist, The" / "Artist, A" / "Artist, An" → "the artist" etc.
 */
function normalizeArtistForGroup(artist: string): string {
  const trimmed = artist.trim();
  const inverted = trimmed.replace(
    /^(.+),\s*(a|an|the)$/i,
    (_, name, article) => `${article} ${name}`.toLowerCase(),
  );
  return inverted.toLowerCase();
}

function groupKey(title: string, artist: string): string {
  return `${title.toLowerCase().trim()}|${normalizeArtistForGroup(artist)}`;
}

function downloadJsonFile(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function safeHistoryFilename(name: string): string {
  return `${name.trim().replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "") || "singer-history"}.kd`;
}

function splitNameForFields(name: string): { firstName: string; lastName: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" "),
  };
}

function createSingerUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (char) =>
    (
      Number(char) ^
      (Math.random() * 16) >> (Number(char) / 4)
    ).toString(16),
  );
}

function getOrCreateSingerUuid(): string {
  const existing = localStorage.getItem(SINGER_UUID_STORAGE_KEY);
  if (existing) return existing;
  const next = createSingerUuid();
  localStorage.setItem(SINGER_UUID_STORAGE_KEY, next);
  return next;
}

function readJsonFile(file: File): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(JSON.parse(String(reader.result ?? "")));
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(reader.error ?? new Error("Could not read file"));
    reader.readAsText(file);
  });
}

export default function Requests() {
  const auth = useAuth();
  const [q, setQ] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [singerUuid, setSingerUuid] = useState(() => getOrCreateSingerUuid());
  const requestedBy = [firstName.trim(), lastName.trim()]
    .filter(Boolean)
    .join(" ");
  const signedInRequestName = (
    auth.profile.displayName ||
    auth.profile.username ||
    ""
  ).trim();
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
  const [browseArtists, setBrowseArtists] = useState<string[]>([]);
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
  const [lyricsData, setLyricsData] = useState<{
    [key: string]: {
      loading: boolean;
      lyrics: string | null;
      error: string | null;
    };
  }>({});
  // Fuzzy suggestions (shown when main search returns no results)
  const [fuzzySuggestions, setFuzzySuggestions] = useState<SearchRow[]>([]);
  // Requester's own queue items
  const [myQueue, setMyQueue] = useState<MyQueueItem[]>([]);
  const [myQueueLoading, setMyQueueLoading] = useState(false);
  const [myQueueOpen, setMyQueueOpen] = useState(false);
  const [removingQueueId, setRemovingQueueId] = useState<number | null>(null);
  const [requeueingQueueId, setRequeueingQueueId] = useState<number | null>(
    null,
  );
  const [revealedRemoveQueueId, setRevealedRemoveQueueId] = useState<
    number | null
  >(null);
  const [dragOverQueueId, setDragOverQueueId] = useState<number | null>(null);
  const [draggingQueueId, setDraggingQueueId] = useState<number | null>(null);
  const myQueueRef = useRef<MyQueueItem[]>([]);
  const draggingQueueIdRef = useRef<number | null>(null);
  const historyImportInputRef = useRef<HTMLInputElement | null>(null);
  const completedLongClickRef = useRef<{
    id: number;
    startX: number;
    startY: number;
    timeout: ReturnType<typeof setTimeout>;
  } | null>(null);
  const pendingQueueOrderRef = useRef<number[] | null>(null);
  const queueDragChangedRef = useRef(false);
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
  const [nameEditOpen, setNameEditOpen] = useState(false);
  // Version picker for consolidated song results
  const [versionPicker, setVersionPicker] = useState<{
    title: string;
    artist: string;
    versions: SearchRow[];
  } | null>(null);
  const [knVersionPicker, setKnVersionPicker] = useState<{
    title: string;
    artist: string;
    versions: KaraokeNerdsTrack[];
  } | null>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const actionMenuRef = useRef<HTMLDivElement | null>(null);
  const lyricsPopupRef = useRef<HTMLDivElement | null>(null);

  // Request acceptance settings
  const [requestAcceptance, setRequestAcceptance] = useState<
    "local" | "external" | "disabled"
  >("local");
  const [localLibraryEnabled, setLocalLibraryEnabled] = useState(true);
  const [externalLibraryEnabled, setExternalLibraryEnabled] = useState(true);
  const [localBrowseEnabled, setLocalBrowseEnabled] = useState(true);

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
    // Modern dark theme
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

    // Hide navigation
    const nav = document.querySelector("nav");
    const prevNavDisplay = nav ? (nav as HTMLElement).style.display : "";
    if (nav) (nav as HTMLElement).style.display = "none";

    // Load saved name — only auto-confirm if both first and last name are present
    setSingerUuid(getOrCreateSingerUuid());
    const savedName = localStorage.getItem("karaoke-name");
    if (savedName) {
      const parts = savedName.trim().split(/\s+/);
      setFirstName(parts[0] ?? "");
      setLastName(parts.slice(1).join(" "));
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
      } catch (err) {
        console.error("Failed to load settings:", err);
        // Default to allowing everything if we can't load settings
      }
    }

    loadSettings();

    return () => {
      document.documentElement.style.cssText = "";
      document.body.style.cssText = "";
      if (nav) (nav as HTMLElement).style.display = prevNavDisplay;
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

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

    const { firstName: signedInFirstName, lastName: signedInLastName } =
      splitNameForFields(signedInRequestName);
    setFirstName(signedInFirstName);
    setLastName(signedInLastName);
    setNameError("");
    setNameConfirmed(true);
    setNameModalOpen(false);
    setNameEditOpen(false);
    setShowNamePrompt(false);
    localStorage.setItem("karaoke-name", signedInRequestName);
  }, [signedInRequestName]);

  // Auto-open name modal on first load if name not yet confirmed.
  // Read localStorage directly — the nameConfirmed state hasn't been set yet
  // by the init effect when this runs, so we can't rely on it here.
  useEffect(() => {
    const saved = localStorage.getItem("karaoke-name");
    const parts = (saved ?? "").trim().split(/\s+/);
    const alreadyConfirmed = parts.length >= 2 && !!parts[0] && !!parts[1];
    if (!alreadyConfirmed) {
      setNameEditOpen(true);
      setNameModalOpen(true);
    }
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
          const suggestions = await api(
            `/api/search/suggestions?q=${encodeURIComponent(q.trim())}`,
          );
          setFuzzySuggestions(Array.isArray(suggestions) ? suggestions : []);
        } catch {
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
        setSelectedBrowseLetter((current) =>
          letters.includes(current) ? current : "",
        );
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
      setBrowseSummary(`Artists starting with "${letter}"`);
      try {
        const kindQuery = kindFilter !== "all" ? `&kind=${kindFilter}` : "";
        const result = await api(
          `/api/search/browse/artists?letter=${encodeURIComponent(letter)}${kindQuery}`,
        );
        const artists = Array.isArray(result?.artists)
          ? result.artists.filter(
              (value: unknown): value is string =>
                typeof value === "string" && value.trim().length > 0,
            )
          : [];
        setBrowseArtists(artists);
      } catch (err) {
        console.error("Browse artists error:", err);
        setBrowseArtists([]);
      } finally {
        setBrowseBusy(false);
      }
    },
    [kindFilter],
  );

  const loadBrowseTitles = useCallback(
    async (letter: string) => {
      setBrowseBusy(true);
      setBrowseArtists([]);
      setLocalRows([]);
      setBrowseSummary(`Titles starting with "${letter}"`);
      try {
        const kindQuery = kindFilter !== "all" ? `&kind=${kindFilter}` : "";
        const result = await api(
          `/api/search/browse/titles?letter=${encodeURIComponent(letter)}${kindQuery}`,
        );
        setLocalRows(Array.isArray(result) ? result : []);
      } catch (err) {
        console.error("Browse titles error:", err);
        setLocalRows([]);
      } finally {
        setBrowseBusy(false);
      }
    },
    [kindFilter],
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
      return;
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
    if (browseCategory === "artist") {
      loadBrowseArtists(selectedBrowseLetter);
    } else {
      loadBrowseTitles(selectedBrowseLetter);
    }
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

  async function confirmName() {
    const fn = firstName.trim();
    const ln = lastName.trim();
    if (!fn) {
      setNameError("First name is required");
      return;
    }
    if (!ln) {
      setNameError("Last name (or initial) is required");
      return;
    }
    const name = [fn, ln].join(" ");
    try {
      const result = await api("/api/singers/self/name", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, singerUuid }),
      });
      if (typeof result?.singer?.uuid === "string") {
        localStorage.setItem(SINGER_UUID_STORAGE_KEY, result.singer.uuid);
        setSingerUuid(result.singer.uuid);
      }
    } catch (err) {
      setNameError("Could not save name. Please try again.");
      console.error(err);
      return;
    }
    setNameError("");
    setNameConfirmed(true);
    setNameModalOpen(false);
    setNameEditOpen(false);
    setShowNamePrompt(false);
  }

  // Group local search results by normalised title + artist to deduplicate across disc IDs
  type GroupedResult = {
    key: string;
    title: string;
    artist: string;
    versions: SearchRow[];
    kind: string;
  };
  const groupedLocalRows = useMemo((): GroupedResult[] => {
    const map = new Map<string, GroupedResult>();
    for (const row of localRows) {
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
  }, [localRows]);

  // Group Karaoke Nerds results by normalised title + artist
  type GroupedKnResult = {
    key: string;
    title: string;
    artist: string;
    versions: KaraokeNerdsTrack[];
  };
  const groupedKnRows = useMemo((): GroupedKnResult[] => {
    const map = new Map<string, GroupedKnResult>();
    for (const track of karaokeNerdsRows) {
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
  }, [karaokeNerdsRows]);

  const loadMyQueue = useCallback(async () => {
    const name = requestedBy.trim();
    if (!name) {
      setMyQueue([]);
      return;
    }
    setMyQueueLoading(true);
    try {
      const params = new URLSearchParams({ name, singerUuid });
      const items = await api(
        `/api/queue/by-requester?${params.toString()}`,
      );
      setMyQueue(normalizeMyQueueItems(items));
    } catch {
      setMyQueue([]);
    } finally {
      setMyQueueLoading(false);
    }
  }, [requestedBy, singerUuid]);

  useEffect(() => {
    void loadMyQueue();
  }, [loadMyQueue]);

  useEffect(() => {
    myQueueRef.current = myQueue;
  }, [myQueue]);

  const applyMyQueueReorder = useCallback(
    (draggedId: number, targetId: number) => {
      const result = reorderQueuedItems(
        myQueueRef.current,
        draggedId,
        targetId,
      );
      if (!result) return null;
      myQueueRef.current = result.items;
      pendingQueueOrderRef.current = result.queuedIds;
      queueDragChangedRef.current = true;
      setMyQueue(result.items);
      return result.queuedIds;
    },
    [],
  );

  const beginMyQueueDrag = useCallback(
    (event: React.PointerEvent<HTMLElement>, queueId: number) => {
      if (event.button !== 0) return;
      if ((event.target as HTMLElement).closest("button")) return;
      draggingQueueIdRef.current = queueId;
      pendingQueueOrderRef.current = myQueueRef.current
        .filter((queueItem) => queueItem.status === "queued")
        .map((queueItem) => queueItem.id);
      queueDragChangedRef.current = false;
      setDraggingQueueId(queueId);
      setDragOverQueueId(queueId);
      event.currentTarget.setPointerCapture(event.pointerId);
      event.preventDefault();
    },
    [],
  );

  const moveMyQueueDrag = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      const draggedId = draggingQueueIdRef.current;
      if (!draggedId) return;
      const target = document
        .elementFromPoint(event.clientX, event.clientY)
        ?.closest("[data-my-queue-id]");
      const targetId = Number(target?.getAttribute("data-my-queue-id"));
      if (Number.isFinite(targetId) && targetId !== draggedId) {
        setDragOverQueueId(targetId);
        applyMyQueueReorder(draggedId, targetId);
      }
    },
    [applyMyQueueReorder],
  );

  const endMyQueueDrag = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      const orderedIds = pendingQueueOrderRef.current;
      const changed = queueDragChangedRef.current;
      draggingQueueIdRef.current = null;
      pendingQueueOrderRef.current = null;
      queueDragChangedRef.current = false;
      setDraggingQueueId(null);
      setDragOverQueueId(null);
      if (changed && orderedIds) void reorderMyQueue(orderedIds);
    },
    [reorderMyQueue],
  );

  const cancelMyQueueDrag = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      draggingQueueIdRef.current = null;
      pendingQueueOrderRef.current = null;
      queueDragChangedRef.current = false;
      setDraggingQueueId(null);
      setDragOverQueueId(null);
    },
    [],
  );

  const beginCompletedQueueLongClick = useCallback(
    (event: React.PointerEvent<HTMLElement>, queueId: number) => {
      if (event.button !== 0) return;
      if ((event.target as HTMLElement).closest("button")) return;
      const target = event.currentTarget;
      completedLongClickRef.current = {
        id: queueId,
        startX: event.clientX,
        startY: event.clientY,
        timeout: setTimeout(() => {
          setRevealedRemoveQueueId((current) =>
            current === queueId ? null : queueId,
          );
        }, 550),
      };
      target.setPointerCapture(event.pointerId);
    },
    [],
  );

  const moveCompletedQueueLongClick = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      const longClick = completedLongClickRef.current;
      if (!longClick) return;
      const moved =
        Math.abs(event.clientX - longClick.startX) > 10 ||
        Math.abs(event.clientY - longClick.startY) > 10;
      if (moved) {
        clearTimeout(longClick.timeout);
        completedLongClickRef.current = null;
      }
    },
    [],
  );

  const endCompletedQueueLongClick = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      if (completedLongClickRef.current) {
        clearTimeout(completedLongClickRef.current.timeout);
      }
      completedLongClickRef.current = null;
    },
    [],
  );

  const cancelCompletedQueueLongClick = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      if (completedLongClickRef.current) {
        clearTimeout(completedLongClickRef.current.timeout);
      }
      completedLongClickRef.current = null;
    },
    [],
  );

  async function removeFromMyQueue(queueId: number) {
    const name = requestedBy.trim();
    if (!name) return;
    setRemovingQueueId(queueId);
    try {
      await api(
        `/api/queue/${queueId}/self-remove?${new URLSearchParams({ name, singerUuid }).toString()}`,
        { method: "DELETE" },
      );
      await loadMyQueue();
      setRevealedRemoveQueueId(null);
      showToast("Song removed from queue");
    } catch (err) {
      showToast("Could not remove song. Please try again.", "error");
      console.error(err);
    } finally {
      setRemovingQueueId(null);
    }
  }

  async function requeueFromMyQueue(queueId: number, songTitle: string | null) {
    const name = requestedBy.trim();
    if (!name) return;
    setRequeueingQueueId(queueId);
    try {
      await api(`/api/queue/${queueId}/self-requeue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, singerUuid }),
      });
      await loadMyQueue();
      showToast(`Added "${songTitle || "Unknown"}" back to ${name}'s queue`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("409") || msg.toLowerCase().includes("already")) {
        showToast("You already have this song in the queue", "error");
      } else {
        showToast("Could not add song back. Please try again.", "error");
        console.error(err);
      }
    } finally {
      setRequeueingQueueId(null);
    }
  }

  async function exportMySingerHistory() {
    const name = requestedBy.trim();
    if (!name) return;
    try {
      const data = await api(
        `/api/history/self/export?${new URLSearchParams({ name, singerUuid }).toString()}`,
      );
      downloadJsonFile(safeHistoryFilename(name), data);
      showToast("Singer history exported");
    } catch (err) {
      showToast("Could not export singer history.", "error");
      console.error(err);
    }
  }

  async function importMySingerHistory(file: File | null | undefined) {
    const name = requestedBy.trim();
    if (!name || !file) return;
    try {
      const data = await readJsonFile(file);
      const result = await api("/api/history/self/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, singerUuid, data }),
      });
      await loadMyQueue();
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
    if (requestedBy.trim() && window.confirm("Do you want to export your singer history before logging off?")) {
      await exportMySingerHistory();
    }
    localStorage.removeItem("karaoke-name");
    localStorage.removeItem(SINGER_UUID_STORAGE_KEY);
    const nextUuid = createSingerUuid();
    localStorage.setItem(SINGER_UUID_STORAGE_KEY, nextUuid);
    setSingerUuid(nextUuid);
    setFirstName("");
    setLastName("");
    setNameConfirmed(false);
    setNameEditOpen(true);
    setNameModalOpen(true);
    setMyQueue([]);
    setRevealedRemoveQueueId(null);
    setNameError("");
  }

  async function reorderMyQueue(orderedIds: number[]) {
    const name = requestedBy.trim();
    if (!name) return;
    try {
      await api("/api/queue/self-reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, singerUuid, queueIds: orderedIds }),
      });
      await loadMyQueue();
      showToast("Queue order updated");
    } catch (err) {
      showToast("Could not reorder queue. Please try again.", "error");
      console.error(err);
    }
  }

  async function enqueueLocal(id: number, songTitle: string) {
    const name = requestedBy.trim();
    if (!name) {
      setShowNamePrompt(true);
      setNameConfirmed(false);
      setNameEditOpen(true);
      setNameModalOpen(true);
      document.getElementById("singer-first-name-input")?.focus();
      return;
    }

    const trackKey = `local-${id}`;
    const keyAdjustment = keyAdjustments.get(trackKey) ?? 0;

    setAddingLocal(id);
    try {
      await api("/api/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trackId: id,
          requestedBy: name,
          singerUuid,
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
      setNameEditOpen(true);
      setNameModalOpen(true);
      return;
    }

    const trackKey = `kn-${track.url}`;
    const keyAdjustment = keyAdjustments.get(trackKey) ?? 0;

    setAddingKaraokeNerds(track.url);
    try {
      await api("/api/karaoke-nerds/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: track.title,
          artist: track.artist,
          url: track.url,
          requestedBy: name,
          singerUuid,
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
    <div className="requests-page">
      <style>{`
        /* Import Inter font */
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        /* Animations */
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideUpDrawer {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }

        @keyframes slideIn {
          from {
            transform: translateX(-10px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes ripple {
          to {
            transform: scale(1. 5);
            opacity: 0;
          }
        }

        @keyframes toastSlide {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        /* Base styles */
        .requests-page {
          min-height: 100vh;
          padding: 16px;
          padding-bottom: calc(72px + env(safe-area-inset-bottom, 16px));
          animation: fadeInUp 0.5s ease;
        }

        .container {
          max-width: 768px;
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
          background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          letter-spacing: -0.02em;
        }

        .header-subtitle {
          color: var(--color-text-secondary);
          font-size: clamp(14px, 2.5vw, 16px);
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

        .card:nth-child(2) {
          animation-delay: 0.1s;
        }

        .card:nth-child(3) {
          animation-delay: 0.2s;
        }

        /* Singer Input Card */
        .singer-card {
          position: relative;
          overflow: hidden;
        }

        .singer-card::before {
          content: '';
          position: absolute;
          top: -2px;
          left: -2px;
          right: -2px;
          bottom: -2px;
          background: linear-gradient(45deg, #6366f1, #a855f7, #ec4899, #6366f1);
          background-size: 300% 300%;
          border-radius: 20px;
          opacity: 0;
          transition: opacity 0.3s ease;
          animation: gradient 4s ease infinite;
          z-index: -1;
        }

        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        .singer-card. has-name::before {
          opacity: 0.3;
        }

        .input-group {
          margin-bottom: 16px;
        }

        . input-label {
          display: block;
          font-size: 14px;
          font-weight: 500;
          color: var(--color-text-secondary);
          margin-bottom: 8px;
          transition: color 0.3s ease;
        }

        .input-wrapper {
          position: relative;
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
        }

        .input-field {
          width: 100%;
          padding: 14px 16px;
          padding-left: 44px;
          background: var(--color-bg-secondary);
          border: 2px solid var(--color-border);
          border-radius: 12px;
          color: var(--color-text-primary);
          font-size: 16px;
          font-weight: 500;
          transition: all 0.3s ease;
          outline: none;
          box-sizing: border-box;
        }

        .input-field:focus {
          border-color: var(--color-accent);
          box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
          transform: translateY(-2px);
        }

        .input-field::placeholder {
          color: var(--color-text-muted);
        }

        .input-icon {
          position: absolute;
          left: 16px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 20px;
          transition: transform 0.3s ease;
        }

        .input-field:focus + .input-icon {
          transform: translateY(-50%) scale(1.1);
        }

        /* Singer Badge */
        .singer-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(168, 85, 247, 0.2));
          border: 1px solid rgba(99, 102, 241, 0.4);
          border-radius: 100px;
          padding: 10px 16px;
          font-size: 14px;
          font-weight: 600;
          animation: slideIn 0.3s ease;
        }

        .singer-badge-icon {
          font-size: 18px;
          animation: pulse 2s ease infinite;
        }

        /* Name Prompt */
        .name-prompt {
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(245, 158, 11, 0.1));
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 12px;
          padding: 12px 16px;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          animation: slideIn 0.3s ease;
        }

        .name-prompt-icon {
          font-size: 20px;
          animation: pulse 1.5s ease infinite;
        }

        .name-prompt-text {
          flex: 1;
          font-size: 14px;
          font-weight: 500;
        }

        /* Search Mode Toggle - FIXED SELECTORS WITHOUT SPACES */
        .search-mode-toggle {
          display: flex;
          flex-direction: row;
          gap: 8px;
          background: transparent;
          padding: 0;
          margin-bottom: 20px;
        }

        .mode-button {
          flex: 1;
          padding: 12px 16px;
          border: none;
          border-radius: 12px;
          background: var(--color-bg-secondary);
          color: var(--color-text-secondary);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          border: 1px solid var(--color-border);
        }

        /* Active state - NO SPACES IN SELECTOR */
        .mode-button.active {
          background: linear-gradient(135deg, #6366f1, #818cf8);
          color: white;
          border-color: transparent;
          box-shadow: 0 2px 8px rgba(99, 102, 241, 0. 3);
        }

        /* Active state for Karaoke Nerds - NO SPACES IN SELECTOR */
        .mode-button.active. karaoke-nerds {
          background: linear-gradient(135deg, #7c3aed, #a855f7);
          box-shadow: 0 2px 8px rgba(124, 58, 237, 0.3);
        }

        . mode-button:not(.active):hover {
          background: var(--color-bg-hover);
          color: var(--color-text-primary);
          border-color: var(--color-accent);
        }

        .mode-icon {
          font-size: 16px;
        }

        /* Search Input */
        .search-wrapper {
          position: relative;
          margin-bottom: 20px;
        }

        .search-input {
          width: 100%;
          padding: 16px 20px;
          padding-left: 48px;
          padding-right: 48px;
          background: var(--color-bg-secondary);
          border: 2px solid var(--color-border);
          border-radius: 16px;
          color: var(--color-text-primary);
          font-size: 16px;
          font-weight: 500;
          transition: all 0.3s ease;
          outline: none;
        }

        .search-input:focus {
          border-color: var(--color-accent);
          box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
          transform: translateY(-2px);
        }

        .search-icon {
          position: absolute;
          left: 18px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 20px;
          color: var(--color-text-muted);
          transition: color 0.3s ease;
        }

        .search-input:focus ~ .search-icon {
          color: var(--color-accent);
        }

        . search-clear {
          position: absolute;
          right: 16px;
          top: 50%;
          transform: translateY(-50%);
          padding: 4px;
          background: transparent;
          border: none;
          color: var(--color-text-muted);
          font-size: 20px;
          cursor: pointer;
          opacity: 0;
          visibility: hidden;
          transition: all 0.3s ease;
          line-height: 1;
        }

        .search-clear. visible {
          opacity: 1;
          visibility: visible;
        }

        .search-clear:hover {
          color: var(--color-text-primary);
        }

        /* Search Filters */
        .search-filters {
          margin-top: 16px;
          animation: fadeInUp 0.3s ease;
        }

        .filter-toggle {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          background: var(--color-bg-secondary);
          border: 1px solid var(--color-border);
          border-radius: 10px;
          color: var(--color-text-secondary);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          width: fit-content;
        }

        .filter-toggle:hover {
          background: var(--color-bg-hover);
          border-color: var(--color-accent);
          color: var(--color-text-primary);
        }

        .filter-icon {
          font-size: 16px;
        }

        .filter-chevron {
          font-size: 10px;
          margin-left: 4px;
          transition: transform 0.3s ease;
        }

        .filter-options {
          margin-top: 12px;
          padding: 16px;
          background: var(--color-bg-secondary);
          border: 1px solid var(--color-border);
          border-radius: 12px;
          animation: slideIn 0.3s ease;
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .filter-label {
          font-size: 13px;
          font-weight: 600;
          color: var(--color-text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .filter-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .filter-chip {
          padding: 8px 14px;
          background: var(--color-bg-primary);
          border: 1px solid var(--color-border);
          border-radius: 20px;
          color: var(--color-text-secondary);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .filter-chip:hover {
          background: var(--color-bg-hover);
          border-color: var(--color-accent);
          color: var(--color-text-primary);
          transform: translateY(-1px);
        }

        .filter-chip.active {
          background: linear-gradient(135deg, #6366f1, #818cf8);
          border-color: transparent;
          color: white;
          box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
        }

        .filter-chip.active:hover {
          background: linear-gradient(135deg, #7c7ff3, #8b91f9);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
        }

        /* Loading State */
        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 48px 24px;
          gap: 16px;
        }

        . loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid var(--color-border);
          border-top-color: var(--color-accent);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        . loading-text {
          color: var(--color-text-secondary);
          font-size: 14px;
          font-weight: 500;
        }

        /* Results Header */
        .results-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 0;
          margin-bottom: 12px;
          border-bottom: 1px solid var(--color-border);
          animation: fadeInUp 0.3s ease;
        }

        .results-count {
          font-size: 13px;
          font-weight: 600;
          color: var(--color-text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .active-filter-badge {
          padding: 4px 10px;
          background: linear-gradient(135deg, #6366f1, #818cf8);
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          color: white;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        /* Results - UPDATED WITH RIGHT-SIDE SMALL BUTTON */
        .results-container {
          animation: fadeInUp 0.4s ease;
        }

        .result-card {
          background: var(--color-bg-secondary);
          border: 1px solid var(--color-border);
          border-radius: 16px;
          padding: 12px;
          margin-bottom: 12px;
          transition: all 0.3s ease;
          position: relative;
          overflow: visible;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        . result-card:hover {
          background: var(--color-bg-hover);
          border-color: var(--color-accent);
          transform: translateX(4px);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
        }

        .result-number {
          min-width: 36px;
          height: 36px;
          background: var(--color-accent);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 16px;
          color: white;
        }

        .result-info {
          flex: 1;
          min-width: 0;
        }

        .result-title {
          font-weight: 600;
          font-size: 16px;
          margin-bottom: 2px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: var(--color-text-primary);
        }

        .result-artist {
          font-size: 14px;
          color: var(--color-text-secondary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          margin-bottom: 6px;
        }

        . result-meta {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        .meta-tag {
          display: inline-block;
          padding: 2px 6px;
          background: var(--color-bg-primary);
          border-radius: 4px;
          font-size: 11px;
          font-weight: 500;
          color: var(--color-text-muted);
        }

        .meta-tag. brand {
          background: rgba(124, 58, 237, 0.2);
          color: #a855f7;
        }

        /* Add Button - Smaller and on the right */
        .add-button {
          padding: 8px 16px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          border: none;
          border-radius: 10px;
          color: white;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
          white-space: nowrap;
          min-width: 80px;
        }

        .add-button::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 0;
          height: 0;
          background: rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          transform: translate(-50%, -50%);
          transition: width 0.6s, height 0.6s;
        }

        .add-button:active::before {
          width: 200px;
          height: 200px;
        }

        . add-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(99, 102, 241, 0.4);
        }

        .add-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        . add-button.karaoke-nerds {
          background: linear-gradient(135deg, #7c3aed, #a855f7);
        }

        . add-button.karaoke-nerds:hover:not(:disabled) {
          box-shadow: 0 6px 20px rgba(124, 58, 237, 0. 4);
        }

        . add-button.success {
          background: var(--color-success);
          pointer-events: none;
        }

        .add-button-content {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
        }

        . button-spinner {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }

        /* Button Container - Flex container for key button and add button */
        .button-container {
          display: flex;
          align-items: center;
          gap: 8px;
          position: relative;
        }

        /* Action Menu Button - Single button to open menu */
        .action-menu-button {
          padding: 8px 16px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          border: none;
          border-radius: 10px;
          color: white;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
          white-space: nowrap;
          min-width: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }

        .action-menu-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(99, 102, 241, 0.4);
        }

        .action-menu-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .action-menu-button.karaoke-nerds {
          background: linear-gradient(135deg, #7c3aed, #a855f7);
        }

        .action-menu-button.karaoke-nerds:hover:not(:disabled) {
          box-shadow: 0 6px 20px rgba(124, 58, 237, 0.4);
        }

        .action-menu-button.success {
          background: var(--color-success);
          pointer-events: none;
        }

        /* Action Menu Overlay for mobile */
        .action-menu-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          z-index: 999;
          animation: fadeIn 0.3s ease;
          display: none;
        }

        @media (max-width: 640px) {
          .action-menu-overlay {
            display: block;
          }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        /* Action Menu Container - Desktop popup */
        .action-menu {
          position: fixed;
          background: var(--color-bg-card);
          border: 1px solid var(--color-border);
          border-radius: 12px;
          padding: 8px;
          min-width: 200px;
          z-index: 1001;
          box-shadow: 0 8px 32px rgba(0,0,0,0.5);
          animation: slideInDown 0.2s ease;
        }

        @keyframes slideInDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Mobile: Bottom sheet */
        @media (max-width: 640px) {
          .action-menu {
            position: fixed;
            left: 0;
            right: 0;
            bottom: 0;
            top: auto;
            border-radius: 20px 20px 0 0;
            padding: 20px;
            padding-bottom: calc(20px + env(safe-area-inset-bottom, 0px));
            animation: slideInUp 0.3s ease;
            max-width: 100%;
            max-height: 80vh;
            overflow-y: auto;
            z-index: 1001;
          }

          @keyframes slideInUp {
            from {
              transform: translateY(100%);
            }
            to {
              transform: translateY(0);
            }
          }
        }

        .action-menu-header {
          padding: 8px 12px;
          border-bottom: 1px solid var(--color-border);
          margin-bottom: 8px;
        }

        .action-menu-title {
          font-size: 14px;
          font-weight: 600;
          color: var(--color-text-primary);
          margin: 0;
        }

        .action-menu-subtitle {
          font-size: 12px;
          color: var(--color-text-secondary);
          margin: 4px 0 0 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .action-menu-items {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .action-menu-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: transparent;
          border: none;
          border-radius: 8px;
          color: var(--color-text-primary);
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: left;
          width: 100%;
        }

        .action-menu-item:hover {
          background: var(--color-bg-hover);
        }

        .action-menu-item-icon {
          font-size: 20px;
          width: 24px;
          text-align: center;
        }

        .action-menu-item-content {
          flex: 1;
          min-width: 0;
        }

        .action-menu-item-label {
          display: block;
          font-weight: 600;
        }

        .action-menu-item-description {
          display: block;
          font-size: 12px;
          color: var(--color-text-secondary);
          margin-top: 2px;
        }

        .action-menu-item-value {
          font-size: 12px;
          color: var(--color-text-secondary);
          white-space: nowrap;
        }

        .action-menu-item.primary {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white;
        }

        .action-menu-item.primary:hover {
          background: linear-gradient(135deg, #7c7ff3, #9d6ff7);
        }

        .action-menu-item.primary .action-menu-item-description {
          color: rgba(255, 255, 255, 0.8);
        }

        /* Key Adjustment View within Action Menu */
        .key-adjustment-view {
          padding: 16px 12px;
          border-top: 1px solid var(--color-border);
          margin-top: 4px;
        }

        .key-adjustment-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }

        .key-adjustment-back {
          background: transparent;
          border: none;
          color: var(--color-text-secondary);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          border-radius: 6px;
          transition: all 0.2s ease;
        }

        .key-adjustment-back:hover {
          background: var(--color-bg-hover);
          color: var(--color-text-primary);
        }

        .key-adjustment-title {
          font-size: 14px;
          font-weight: 600;
          color: var(--color-text-primary);
        }

        .key-adjustment-controls {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          padding: 20px 0;
        }

        .key-adjustment-button {
          width: 52px;
          height: 52px;
          border-radius: 12px;
          border: 2px solid var(--color-border);
          background: var(--color-bg-secondary);
          color: var(--color-text-primary);
          font-size: 24px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .key-adjustment-button:hover:not(:disabled) {
          background: var(--color-bg-hover);
          border-color: var(--color-accent);
          transform: scale(1.05);
        }

        .key-adjustment-button:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        .key-adjustment-display {
          min-width: 100px;
          text-align: center;
        }

        .key-adjustment-value {
          font-weight: 700;
          font-size: 24px;
          color: var(--color-text-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .key-adjustment-label {
          font-size: 12px;
          color: var(--color-text-secondary);
          margin-top: 4px;
        }

        /* Mobile optimizations for action menu */
        @media (max-width: 640px) {
          .action-menu-item {
            padding: 16px;
          }

          .action-menu-header {
            padding: 12px 0;
            margin-bottom: 12px;
          }

          .action-menu-title {
            font-size: 16px;
          }

          .key-adjustment-controls {
            padding: 24px 0;
          }

          .key-adjustment-button {
            width: 60px;
            height: 60px;
            font-size: 28px;
          }

          .key-adjustment-value {
            font-size: 28px;
          }
        }

        /* Lyrics Button */
        .lyrics-button {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
          background: var(--color-bg-primary);
          border: 1px solid var(--color-border);
          border-radius: 8px;
          color: var(--color-text-primary);
          font-weight: 600;
          cursor: pointer;
          font-size: 14px;
        }

        .lyrics-button:hover {
          background: var(--color-bg-hover);
          border-color: var(--color-accent);
        }

        /* Lyrics Popup/Modal */
        .lyrics-popup-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1200;
          padding: 20px;
          animation: fadeInUp 0.3s ease;
        }

        .lyrics-popup {
          background: var(--color-bg-card);
          border: 1px solid var(--color-border);
          border-radius: 16px;
          padding: 24px;
          max-width: 600px;
          width: 100%;
          max-height: 80vh;
          overflow-y: auto;
          box-shadow: 0 8px 32px rgba(0,0,0,0.5);
          animation: slideIn 0.3s ease;
          z-index: 1201;
        }

        .lyrics-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
          padding-bottom: 16px;
          border-bottom: 1px solid var(--color-border);
        }

        .lyrics-title-info {
          flex: 1;
          min-width: 0;
        }

        .lyrics-popup-title {
          font-size: 18px;
          font-weight: 700;
          color: var(--color-text-primary);
          margin: 0 0 4px 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .lyrics-popup-artist {
          font-size: 14px;
          color: var(--color-text-secondary);
          margin: 0;
        }

        .lyrics-close-button {
          background: var(--color-bg-secondary);
          border: 1px solid var(--color-border);
          border-radius: 8px;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: var(--color-text-primary);
          font-size: 20px;
          line-height: 1;
          transition: all 0.3s ease;
          flex-shrink: 0;
          margin-left: 12px;
        }

        .lyrics-close-button:hover {
          background: var(--color-bg-hover);
          border-color: var(--color-accent);
        }

        .lyrics-content {
          color: var(--color-text-primary);
          font-size: 14px;
          line-height: 1.8;
          white-space: pre-wrap;
          word-wrap: break-word;
        }

        .lyrics-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          gap: 16px;
        }

        .lyrics-error {
          text-align: center;
          padding: 40px 20px;
          color: var(--color-text-secondary);
        }

        .lyrics-error-icon {
          font-size: 48px;
          margin-bottom: 12px;
        }

        /* Empty State */
        .empty-state {
          text-align: center;
          padding: 48px 24px;
          animation: fadeInUp 0.5s ease;
        }

        .empty-icon {
          font-size: 64px;
          margin-bottom: 16px;
          opacity: 0.5;
          animation: pulse 2s ease infinite;
        }

        .empty-title {
          font-size: 18px;
          font-weight: 600;
          color: var(--color-text-primary);
          margin-bottom: 8px;
        }

        .empty-message {
          font-size: 14px;
          color: var(--color-text-secondary);
        }

        /* Toast Notifications */
        .toast-notification {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%) translateY(100%);
          background: var(--color-success);
          color: white;
          padding: 14px 20px;
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
          display: flex;
          align-items: center;
          gap: 12px;
          font-weight: 600;
          font-size: 14px;
          z-index: 1300;
          opacity: 0;
          transition: all 0.3s ease;
          max-width: calc(100vw - 48px);
        }

        .toast-notification.show {
          transform: translateX(-50%) translateY(0);
          opacity: 1;
        }

        .toast-notification.error {
          background: var(--color-danger);
        }

        .toast-icon {
          width: 24px;
          height: 24px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
        }

        /* Mobile optimizations */
        @media (max-width: 640px) {
          .requests-page {
            padding: 12px;
          }

          .card {
            padding: 16px;
            border-radius: 16px;
          }

          . search-mode-toggle {
            position: sticky;
            top: 0;
            z-index: 10;
            backdrop-filter: blur(10px);
            margin-bottom: 16px;
          }

          .result-card {
            padding: 10px;
          }

          .result-number {
            min-width: 32px;
            height: 32px;
            font-size: 14px;
          }

          .result-title {
            font-size: 15px;
          }

          . result-artist {
            font-size: 13px;
          }

          .add-button {
            padding: 7px 14px;
            font-size: 13px;
            min-width: 70px;
          }

          .action-menu-button {
            padding: 7px 14px;
            font-size: 13px;
            min-width: 70px;
          }

          .empty-icon {
            font-size: 48px;
          }
        }

        @media (max-width: 380px) {
          .header-title {
            font-size: 24px;
          }

          .card {
            padding: 14px;
          }

          .mode-button {
            font-size: 13px;
            padding: 10px 8px;
          }
        }

        /* Accessibility */
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0. 01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }

        /* High contrast mode */
        @media (prefers-contrast: high) {
          . card {
            border-width: 2px;
          }

          .input-field,
          .search-input {
            border-width: 2px;
          }

          .add-button {
            border: 2px solid white;
          }
        }
      `}</style>

      <div className="container">
        {/* Header */}
        <div className="header" style={{ position: "relative" }}>
          <h1 className="header-title">🎤 Request a Song</h1>
          <p className="header-subtitle">
            Find your favorite songs and rock the stage!
          </p>
          {/* Person icon — top-right, opens name modal */}
          <button
            onClick={() => {
              setNameEditOpen(!nameConfirmed);
              setNameModalOpen(true);
            }}
            title={
              nameConfirmed ? `Singing as ${requestedBy}` : "Enter your name"
            }
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              background: nameConfirmed
                ? "rgba(99,102,241,0.15)"
                : "rgba(239,68,68,0.12)",
              border: `1px solid ${nameConfirmed ? "rgba(99,102,241,0.35)" : "rgba(239,68,68,0.3)"}`,
              borderRadius: 8,
              padding: "5px 7px",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 1,
              lineHeight: 1,
            }}
          >
            <span style={{ fontSize: 15 }}>👤</span>
            {nameConfirmed ? (
              <span
                style={{
                  fontSize: 9,
                  color: "var(--color-accent)",
                  fontWeight: 600,
                  maxWidth: 56,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {firstName}
              </span>
            ) : (
              <span style={{ fontSize: 8, color: "#ef4444", fontWeight: 600 }}>
                Set name
              </span>
            )}
          </button>
        </div>

        {/* Name modal — portal, auto-opens if no name confirmed */}
        {nameModalOpen &&
          createPortal(
            <>
              <div
                style={{
                  position: "fixed",
                  inset: 0,
                  zIndex: 1000,
                  background: "rgba(0,0,0,0.6)",
                }}
                onClick={() => {
                  if (nameConfirmed) {
                    setNameModalOpen(false);
                    setNameEditOpen(false);
                    setNameError("");
                  }
                }}
              />
              <div
                style={{
                  position: "fixed",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  zIndex: 1001,
                  background: "var(--color-bg-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 16,
                  boxShadow: "0 8px 40px rgba(0,0,0,0.8)",
                  width: "min(380px, 94vw)",
                  padding: "24px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 20,
                  }}
                >
                  <span style={{ fontWeight: 700, fontSize: 17 }}>
                    👤 {nameEditOpen || !nameConfirmed ? (nameConfirmed ? "Change Name" : "Enter Your Name") : "Profile"}
                  </span>
                  {nameConfirmed && (
                    <button
                      onClick={() => {
                        setNameModalOpen(false);
                        setNameEditOpen(false);
                        setNameError("");
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--color-text-secondary)",
                        cursor: "pointer",
                        fontSize: 18,
                        padding: "2px 6px",
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>
                {(nameEditOpen || !nameConfirmed) && (
                  <>
                    {showNamePrompt && !requestedBy.trim() && (
                      <div
                        style={{
                          background: "rgba(239,68,68,0.1)",
                          border: "1px solid rgba(239,68,68,0.3)",
                          borderRadius: 10,
                          padding: "10px 14px",
                          marginBottom: 16,
                          fontSize: 13,
                          color: "#ef4444",
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <span>⚠️</span>
                        <span>Enter your name to add songs to the queue</span>
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 10, marginBottom: 6 }}>
                      <div style={{ flex: 1 }}>
                        <label
                          style={{
                            display: "block",
                            fontSize: 12,
                            fontWeight: 500,
                            color: "var(--color-text-secondary)",
                            marginBottom: 6,
                          }}
                        >
                          First Name{" "}
                          <span style={{ color: "var(--color-danger)" }}>*</span>
                        </label>
                        <input
                          id="singer-first-name-input"
                          className="input-field"
                          type="text"
                          placeholder="First name…"
                          value={firstName}
                          onChange={(e) => {
                            setFirstName(e.target.value);
                            setNameError("");
                          }}
                          autoComplete="given-name"
                          autoCapitalize="words"
                          onKeyDown={(e) => {
                            if (shouldHandleEnterKey(e)) void confirmName();
                          }}
                          style={{ paddingLeft: 14 }}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label
                          style={{
                            display: "block",
                            fontSize: 12,
                            fontWeight: 500,
                            color: "var(--color-text-secondary)",
                            marginBottom: 6,
                          }}
                        >
                          Last Name{" "}
                          <span style={{ color: "var(--color-danger)" }}>*</span>
                        </label>
                        <input
                          id="singer-last-name-input"
                          className="input-field"
                          type="text"
                          placeholder="Last name…"
                          value={lastName}
                          onChange={(e) => {
                            setLastName(e.target.value);
                            setNameError("");
                          }}
                          autoComplete="family-name"
                          autoCapitalize="words"
                          onKeyDown={(e) => {
                            if (shouldHandleEnterKey(e)) void confirmName();
                          }}
                          style={{ paddingLeft: 14 }}
                        />
                      </div>
                    </div>
                    {nameError && (
                      <div
                        style={{
                          color: "var(--color-danger)",
                          fontSize: 13,
                          marginBottom: 10,
                        }}
                      >
                        ⚠️ {nameError}
                      </div>
                    )}
                    <button
                      onClick={() => void confirmName()}
                      style={{
                        marginTop: 14,
                        width: "100%",
                        padding: "12px",
                        background: "var(--color-accent)",
                        color: "#fff",
                        border: "none",
                        borderRadius: 10,
                        fontWeight: 700,
                        fontSize: 15,
                        cursor: "pointer",
                      }}
                    >
                      {nameConfirmed ? "Save Changes" : "Let's go! 🎤"}
                    </button>
                  </>
                )}
                {nameConfirmed && (
                  <div
                    style={{
                      marginTop: 12,
                      paddingTop: 12,
                      borderTop: "1px solid var(--color-border)",
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 8,
                    }}
                  >
                    <input
                      ref={historyImportInputRef}
                      type="file"
                      accept=".kd,application/json"
                      style={{ display: "none" }}
                      onChange={(event) =>
                        void importMySingerHistory(event.currentTarget.files?.[0])
                      }
                    />
                    <button
                      onClick={() => {
                        setNameEditOpen(true);
                        requestAnimationFrame(() =>
                          document.getElementById("singer-first-name-input")?.focus(),
                        );
                      }}
                      style={{
                        flex: "1 1 45%",
                        padding: "10px",
                        background: "var(--color-bg-secondary)",
                        color: "var(--color-text-primary)",
                        border: "1px solid var(--color-border)",
                        borderRadius: 10,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      ✏️ Change Name
                    </button>
                    <button
                      onClick={() => void exportMySingerHistory()}
                      style={{
                        flex: "1 1 45%",
                        padding: "10px",
                        background: "rgba(99,102,241,0.15)",
                        color: "var(--color-accent)",
                        border: "1px solid rgba(99,102,241,0.3)",
                        borderRadius: 10,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      Export History
                    </button>
                    <button
                      onClick={() => historyImportInputRef.current?.click()}
                      style={{
                        flex: "1 1 45%",
                        padding: "10px",
                        background: "var(--color-bg-secondary)",
                        color: "var(--color-text-primary)",
                        border: "1px solid var(--color-border)",
                        borderRadius: 10,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      Import History
                    </button>
                    <button
                      onClick={() => void logOffSingerProfile()}
                      style={{
                        flex: "1 1 45%",
                        padding: "10px",
                        background: "rgba(239,68,68,0.12)",
                        color: "var(--color-danger)",
                        border: "1px solid rgba(239,68,68,0.3)",
                        borderRadius: 10,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      Log Off
                    </button>
                  </div>
                )}
              </div>
            </>,
            document.body,
          )}

        {/* Bottom footer bar — My Queue / next song */}
        {nameConfirmed &&
          createPortal(
            <>
              {myQueueOpen && (
                <>
                  <div
                    style={{ position: "fixed", inset: 0, zIndex: 999 }}
                    onClick={() => setMyQueueOpen(false)}
                  />
                  <div
                    style={{
                      position: "fixed",
                      left: 0,
                      right: 0,
                      bottom: 0,
                      zIndex: 1000,
                      background: "var(--color-bg-card)",
                      border: "1px solid var(--color-border)",
                      borderBottom: "none",
                      borderRadius: "18px 18px 0 0",
                      boxShadow: "0 -12px 42px rgba(0,0,0,0.7)",
                      width: "min(720px, 100vw)",
                      height: "min(78vh, 620px)",
                      margin: "0 auto",
                      paddingBottom: "env(safe-area-inset-bottom, 0px)",
                      display: "flex",
                      flexDirection: "column",
                      animation: "slideUpDrawer 0.22s ease-out",
                    }}
                  >
                    <div
                      style={{
                        padding: "12px 14px",
                        borderBottom: "1px solid var(--color-border)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexShrink: 0,
                      }}
                    >
                      <span style={{ fontWeight: 700, fontSize: 14 }}>
                        📋 My Queue
                      </span>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          style={{
                            background: "none",
                            border: "none",
                            color: "var(--color-text-secondary)",
                            cursor: "pointer",
                            fontSize: 13,
                          }}
                          onClick={() => void loadMyQueue()}
                        >
                          ↻
                        </button>
                        <button
                          style={{
                            background: "none",
                            border: "none",
                            color: "var(--color-text-secondary)",
                            cursor: "pointer",
                            fontSize: 16,
                            padding: "0 2px",
                          }}
                          onClick={() => setMyQueueOpen(false)}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                    <div
                      style={{
                        overflowY: "auto",
                        padding: 12,
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      {myQueueLoading ? (
                        <div
                          style={{
                            color: "var(--color-text-secondary)",
                            fontSize: 13,
                            padding: "8px 0",
                          }}
                        >
                          Loading…
                        </div>
                      ) : myQueue.length === 0 ? (
                        <div
                          style={{
                            color: "var(--color-text-muted)",
                            fontSize: 13,
                            padding: "8px 0",
                          }}
                        >
                          Nothing in queue yet.
                        </div>
                      ) : (
                        <>
                          {myQueue.some((i) => i.status === "queued") &&
                            myQueue.filter((i) => i.status === "queued")
                              .length > 1 && (
                              <div
                                style={{
                                  fontSize: 11,
                                  color: "var(--color-text-muted)",
                                  marginBottom: 2,
                                }}
                              >
                                ☰ Drag to reorder
                              </div>
                            )}
                          {myQueue.some(
                            (i) =>
                              i.status === "done" || i.status === "finished",
                          ) && (
                            <div
                              style={{
                                fontSize: 11,
                                color: "var(--color-text-muted)",
                                marginBottom: 2,
                              }}
                            >
                              Long-click played songs to remove
                            </div>
                          )}
                          {myQueue.map((item) => {
                            const isCompleted =
                              item.status === "done" ||
                              item.status === "finished";
                            const isQueued = item.status === "queued";
                            const isRemoveRevealed =
                              revealedRemoveQueueId === item.id;
                            return (
                              <div
                                key={item.id}
                                data-my-queue-id={item.id}
                                draggable={false}
                                onDragStart={(e) => {
                                  e.preventDefault();
                                }}
                              onPointerDown={
                                isQueued
                                  ? (e) => beginMyQueueDrag(e, item.id)
                                  : isCompleted
                                    ? (e) =>
                                        beginCompletedQueueLongClick(e, item.id)
                                    : undefined
                              }
                              onPointerMove={
                                isQueued
                                  ? moveMyQueueDrag
                                  : isCompleted
                                    ? moveCompletedQueueLongClick
                                    : undefined
                              }
                              onPointerUp={
                                isQueued
                                  ? endMyQueueDrag
                                  : isCompleted
                                    ? endCompletedQueueLongClick
                                    : undefined
                              }
                              onPointerCancel={
                                isQueued
                                  ? cancelMyQueueDrag
                                  : isCompleted
                                    ? cancelCompletedQueueLongClick
                                    : undefined
                              }
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                padding: "8px 10px",
                                background:
                                  dragOverQueueId === item.id
                                    ? "rgba(99,102,241,0.15)"
                                    : "var(--color-bg-secondary)",
                                borderRadius: 8,
                                opacity:
                                  draggingQueueId === item.id
                                    ? 0.75
                                    : isCompleted || item.status === "skipped"
                                      ? 0.6
                                      : 1,
                                cursor: isQueued ? "grab" : "default",
                                border:
                                  dragOverQueueId === item.id
                                    ? "1px dashed rgba(99,102,241,0.5)"
                                    : "1px solid transparent",
                                touchAction: isQueued
                                  ? "none"
                                  : isCompleted
                                    ? "pan-y"
                                    : undefined,
                                userSelect: "none",
                                transition: "background 0.16s ease",
                              }}
                            >
                              {item.status === "queued" && (
                                <span
                                  style={{
                                    fontSize: 14,
                                    color: "var(--color-text-muted)",
                                    flexShrink: 0,
                                    cursor: "grab",
                                    padding: "4px 2px",
                                  }}
                                >
                                  ☰
                                </span>
                              )}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div
                                  style={{
                                    fontWeight: 600,
                                    fontSize: 13,
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    textDecoration: isCompleted
                                      ? "line-through"
                                      : "none",
                                    color: isCompleted
                                      ? "var(--color-text-muted)"
                                      : "var(--color-text-primary)",
                                  }}
                                >
                                  {item.title || "Unknown"}
                                </div>
                                <div
                                  style={{
                                    fontSize: 11,
                                    color: "var(--color-text-secondary)",
                                    textDecoration: isCompleted
                                      ? "line-through"
                                      : "none",
                                  }}
                                >
                                  {item.artist || "Unknown"}
                                </div>
                              </div>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 6,
                                  flexShrink: 0,
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 700,
                                    padding: "2px 6px",
                                    borderRadius: 6,
                                    background:
                                      item.status === "playing"
                                        ? "rgba(16,185,129,0.2)"
                                            : isQueued
                                          ? "rgba(99,102,241,0.15)"
                                          : "rgba(113,113,122,0.15)",
                                    color:
                                      item.status === "playing"
                                        ? "#10b981"
                                            : isQueued
                                          ? "var(--color-accent)"
                                          : "var(--color-text-muted)",
                                  }}
                                >
                                  {item.status === "playing"
                                    ? "▶ NOW"
                                    : isQueued
                                      ? "⏳"
                                      : "✅ Done"}
                                </span>
                                {isQueued && (
                                  <button
                                    style={{
                                      background: "rgba(239,68,68,0.15)",
                                      color: "#ef4444",
                                      border: "1px solid rgba(239,68,68,0.3)",
                                      borderRadius: 6,
                                      cursor: "pointer",
                                      padding: "3px 8px",
                                      fontSize: 11,
                                    }}
                                    disabled={removingQueueId === item.id}
                                    onClick={() =>
                                      void removeFromMyQueue(item.id)
                                    }
                                  >
                                    {removingQueueId === item.id ? "…" : "✕"}
                                  </button>
                                )}
                                {isCompleted && (
                                  <button
                                    style={{
                                      background: "rgba(99,102,241,0.15)",
                                      color: "var(--color-accent)",
                                      border: "1px solid rgba(99,102,241,0.3)",
                                      borderRadius: 6,
                                      cursor: "pointer",
                                      padding: "3px 8px",
                                      fontSize: 11,
                                      fontWeight: 700,
                                      whiteSpace: "nowrap",
                                    }}
                                    disabled={requeueingQueueId === item.id}
                                    onClick={() =>
                                      void requeueFromMyQueue(
                                        item.id,
                                        item.title,
                                      )
                                    }
                                  >
                                    {requeueingQueueId === item.id
                                      ? "…"
                                      : "+ Add back"}
                                  </button>
                                )}
                                {isCompleted && isRemoveRevealed && (
                                  <>
                                    <button
                                      style={{
                                        background: "rgba(113,113,122,0.16)",
                                        color: "var(--color-text-secondary)",
                                        border: "1px solid rgba(113,113,122,0.28)",
                                        borderRadius: 6,
                                        cursor: "pointer",
                                        padding: "3px 8px",
                                        fontSize: 11,
                                        fontWeight: 700,
                                        whiteSpace: "nowrap",
                                      }}
                                      onClick={() =>
                                        setRevealedRemoveQueueId(null)
                                      }
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      style={{
                                        background: "rgba(239,68,68,0.18)",
                                        color: "#ef4444",
                                        border: "1px solid rgba(239,68,68,0.35)",
                                        borderRadius: 6,
                                        cursor: "pointer",
                                        padding: "3px 8px",
                                        fontSize: 11,
                                        fontWeight: 700,
                                        whiteSpace: "nowrap",
                                      }}
                                      disabled={removingQueueId === item.id}
                                      onClick={() =>
                                        void removeFromMyQueue(item.id)
                                      }
                                    >
                                      {removingQueueId === item.id
                                        ? "…"
                                        : "Remove"}
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                            );
                          })}
                        </>
                      )}
                    </div>
                  </div>
                </>
              )}
              {/* Static footer bar */}
              {(() => {
                const nextSong =
                  myQueue.find((i) => i.status === "playing") ??
                  myQueue.find((i) => i.status === "queued");
                const activeCount = myQueue.filter(
                  (i) => i.status === "queued" || i.status === "playing",
                ).length;
                return (
                  <div
                    onClick={() => {
                      setMyQueueOpen((o) => !o);
                      if (!myQueueOpen) void loadMyQueue();
                    }}
                    style={{
                      position: "fixed",
                      bottom: 0,
                      left: 0,
                      right: 0,
                      zIndex: 100,
                      background: "var(--color-bg-card)",
                      borderTop: "1px solid var(--color-border)",
                      boxShadow: "0 -4px 20px rgba(0,0,0,0.4)",
                      padding: `10px 16px calc(10px + env(safe-area-inset-bottom, 0px))`,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      userSelect: "none",
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        flexShrink: 0,
                        background: "rgba(99,102,241,0.15)",
                        border: "1px solid rgba(99,102,241,0.3)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 18,
                        position: "relative",
                      }}
                    >
                      📋
                      {activeCount > 0 && (
                        <span
                          style={{
                            position: "absolute",
                            top: -6,
                            right: -6,
                            background: "var(--color-accent)",
                            color: "#fff",
                            borderRadius: "50%",
                            width: 16,
                            height: 16,
                            fontSize: 9,
                            fontWeight: 700,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {activeCount}
                        </span>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {nextSong ? (
                        <>
                          <div
                            style={{
                              fontSize: 11,
                              color: "var(--color-text-secondary)",
                              marginBottom: 1,
                            }}
                          >
                            {nextSong.status === "playing"
                              ? "▶ Now Playing"
                              : "⏳ Up Next"}
                          </div>
                          <div
                            style={{
                              fontWeight: 600,
                              fontSize: 14,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              color: "#fff",
                            }}
                          >
                            {nextSong.title || "Unknown"}
                          </div>
                        </>
                      ) : (
                        <div
                          style={{
                            fontSize: 13,
                            color: "var(--color-text-muted)",
                          }}
                        >
                          No songs in queue yet — tap to view
                        </div>
                      )}
                    </div>
                    <span
                      style={{ fontSize: 12, color: "var(--color-text-muted)" }}
                    >
                      My Queue ›
                    </span>
                  </div>
                );
              })()}
            </>,
            document.body,
          )}

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
                {/* Search / Browse row */}
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    marginBottom: 16,
                    flexWrap: "wrap",
                  }}
                >
                  {localLibraryEnabled && localBrowseEnabled && (
                    <>
                      <button
                        className={`filter-chip ${localViewMode === "search" ? "active" : ""}`}
                        onClick={() => setLocalViewMode("search")}
                        style={{ justifyContent: "center" }}
                      >
                        <span>🔎 Search</span>
                      </button>
                      <button
                        className={`filter-chip ${localViewMode === "browse" ? "active" : ""}`}
                        onClick={() => setLocalViewMode("browse")}
                        style={{ justifyContent: "center" }}
                      >
                        <span>🗂️ Browse</span>
                      </button>
                    </>
                  )}
                </div>

                {!isLocalBrowseMode && (
                  <div className="search-wrapper">
                    <input
                      className="search-input"
                      type="search"
                      placeholder={
                        localLibraryEnabled && externalLibraryEnabled
                          ? "Search local library & Online…"
                          : localLibraryEnabled
                            ? "Search local songs…"
                            : "Search Online…"
                      }
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      onKeyDown={(event) => {
                        if (!shouldHandleEnterKey(event)) return;
                        if (searchTimeoutRef.current) {
                          clearTimeout(searchTimeoutRef.current);
                        }
                        event.currentTarget.blur();
                        if (localLibraryEnabled) void doLocalSearch();
                        if (externalLibraryEnabled) void doKaraokeNerdsSearch();
                      }}
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck="false"
                    />
                    <span className="search-icon">🔍</span>
                  </div>
                )}

                {/* Search Filters */}
                {localLibraryEnabled && (
                  <div className="search-filters">
                    <button
                      className="filter-toggle"
                      onClick={() => setShowFilters(!showFilters)}
                      aria-label="Toggle filters"
                    >
                      <span className="filter-icon">⚙️</span>
                      <span>Filters</span>
                      <span className="filter-chevron">
                        {showFilters ? "▼" : "▶"}
                      </span>
                    </button>

                    {showFilters && (
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
                              <span>🎬 MP4 Video</span>
                            </button>
                            <button
                              className={`filter-chip ${kindFilter === "cdgmp3" ? "active" : ""}`}
                              onClick={() => setKindFilter("cdgmp3")}
                            >
                              <span>📀 CDG+MP3</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {isLocalBrowseMode && (
                  <div
                    style={{
                      marginBottom: 20,
                      padding: 16,
                      background: "var(--color-bg-secondary)",
                      borderRadius: 14,
                      border: "1px solid var(--color-border)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 16,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "var(--color-text-secondary)",
                          marginBottom: 8,
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                        }}
                      >
                        Browse by
                      </div>
                      <div style={{ display: "flex", gap: 10 }}>
                        <button
                          className={`filter-chip ${browseCategory === "artist" ? "active" : ""}`}
                          onClick={() => setBrowseCategory("artist")}
                          style={{ flex: 1, justifyContent: "center" }}
                        >
                          <span>Artist</span>
                        </button>
                        <button
                          className={`filter-chip ${browseCategory === "title" ? "active" : ""}`}
                          onClick={() => setBrowseCategory("title")}
                          style={{ flex: 1, justifyContent: "center" }}
                        >
                          <span>Song Title</span>
                        </button>
                      </div>
                    </div>

                    <div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "var(--color-text-secondary)",
                          marginBottom: 8,
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                        }}
                      >
                        Letter
                      </div>
                      <select
                        className="form-input"
                        value={selectedBrowseLetter}
                        onChange={(e) =>
                          setSelectedBrowseLetter(e.target.value)
                        }
                        style={{
                          width: "100%",
                          cursor: "pointer",
                          background: "var(--color-bg-card)",
                          color: "var(--color-text-primary)",
                          border: "1px solid var(--color-border)",
                          borderRadius: 12,
                          padding: "12px 14px",
                          boxSizing: "border-box",
                        }}
                      >
                        <option value="">Select a letter</option>
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
                    </div>

                    {browseCategory === "artist" && selectedBrowseLetter && (
                      <div>
                        <div
                          style={{
                            fontSize: 12,
                            color: "var(--color-text-secondary)",
                            marginBottom: 8,
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
                          }}
                        >
                          Artist
                        </div>
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 8,
                            maxHeight: 220,
                            overflowY: "auto",
                          }}
                        >
                          {browseArtists.map((artist) => (
                            <button
                              key={artist}
                              className={`filter-chip ${selectedBrowseArtist === artist ? "active" : ""}`}
                              onClick={() => setSelectedBrowseArtist(artist)}
                            >
                              <span>{artist}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Results */}
                {isLocalBrowseMode ? (
                  showingBrowseArtistList ? (
                    <div className="empty-state">
                      <div className="empty-icon">🎙️</div>
                      <div className="empty-title">Choose an artist</div>
                      <div className="empty-message">
                        Pick an artist from the list above to see songs under "
                        {selectedBrowseLetter}".
                      </div>
                    </div>
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
                          {groupedLocalRows.length < localRows.length && (
                            <span
                              style={{
                                marginLeft: 6,
                                fontSize: 11,
                                color: "var(--color-text-muted)",
                                fontWeight: 400,
                              }}
                            >
                              ({localRows.length} versions)
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
                            {kindFilter === "mp4" ? "🎬 MP4" : "📀 CDG+MP3"}
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
                                      📀 {group.versions.length} versions
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
                                          {row.kind.toUpperCase()}
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
                                    onClick={(e) => {
                                      if (!isRecentlyAdded && !isAdding) {
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
                                      <>
                                        <span>✓</span>
                                        <span>Added</span>
                                      </>
                                    ) : (
                                      <>
                                        <span>⋯</span>
                                        <span>Options</span>
                                      </>
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
                                              {group.title || "Unknown Title"}
                                            </h3>
                                            <p className="action-menu-subtitle">
                                              {group.artist || "Unknown Artist"}
                                            </p>
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
                                                      ? `Choose from ${group.versions.length} versions`
                                                      : "Request this song"}
                                                  </span>
                                                </div>
                                              </button>

                                              {/* Adjust Key (single-version only) */}
                                              {!hasMultipleVersions && (
                                                <button
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
                                                  📄
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
                    {/* Local library results */}
                    {(sourceFilter === "all" || sourceFilter === "local") &&
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
                                  ({localRows.length} versions)
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
                                    ? "🎬 MP4"
                                    : "📀 CDG+MP3"}
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
                                            📀 {group.versions.length} versions
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
                                                {row.kind.toUpperCase()}
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
                                          onClick={(e) => {
                                            if (!isRecentlyAdded && !isAdding)
                                              handleActionMenuToggle(
                                                e,
                                                trackKey,
                                                actionMenuOpen,
                                              );
                                          }}
                                          disabled={isAdding || isRecentlyAdded}
                                        >
                                          {isAdding ? (
                                            <>
                                              <div className="button-spinner"></div>
                                              <span>Adding</span>
                                            </>
                                          ) : isRecentlyAdded ? (
                                            <>
                                              <span>✓</span>
                                              <span>Added</span>
                                            </>
                                          ) : (
                                            <>
                                              <span>⋯</span>
                                              <span>Options</span>
                                            </>
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
                                                      "Unknown Title"}
                                                  </h3>
                                                  <p className="action-menu-subtitle">
                                                    {group.artist ||
                                                      "Unknown Artist"}
                                                  </p>
                                                </div>
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
                                                          ? `Choose from ${group.versions.length} versions`
                                                          : "Request this song"}
                                                      </span>
                                                    </div>
                                                  </button>
                                                  {currentKey !== 0 && (
                                                    <div className="key-adjustment-header">
                                                      <span
                                                        style={{
                                                          fontSize: 11,
                                                          color:
                                                            "var(--color-text-secondary)",
                                                        }}
                                                      >
                                                        Key:{" "}
                                                        {currentKey > 0
                                                          ? "+"
                                                          : ""}
                                                        {currentKey}
                                                      </span>
                                                    </div>
                                                  )}
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
                                                      📄
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
                                Did you mean…?
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
                                        📀 {versions.length} versions
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
                    {(sourceFilter === "all" || sourceFilter === "online") &&
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
                                  ({karaokeNerdsRows.length} versions)
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
                                            🎵 {group.versions.length} versions
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
                                          onClick={(e) => {
                                            if (!isRecentlyAdded && !isAdding)
                                              handleActionMenuToggle(
                                                e,
                                                trackKey,
                                                actionMenuOpen,
                                              );
                                          }}
                                          disabled={isAdding || isRecentlyAdded}
                                        >
                                          {isAdding ? (
                                            <>
                                              <div className="button-spinner"></div>
                                              <span>Adding</span>
                                            </>
                                          ) : isRecentlyAdded ? (
                                            <>
                                              <span>✓</span>
                                              <span>Added</span>
                                            </>
                                          ) : (
                                            <>
                                              <span>⋯</span>
                                              <span>Options</span>
                                            </>
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
                                                    {group.title}
                                                  </h3>
                                                  <p className="action-menu-subtitle">
                                                    {group.artist ||
                                                      "Unknown Artist"}
                                                  </p>
                                                </div>
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
                                                          ? `Choose from ${group.versions.length} versions`
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
                                                      📄
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

      {/* Version Picker Modal */}
      {versionPicker && (
        <>
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.7)",
              zIndex: 200,
            }}
            onClick={() => setVersionPicker(null)}
          />
          <div
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%,-50%)",
              zIndex: 201,
              background: "var(--color-bg-card)",
              borderRadius: 16,
              border: "1px solid var(--color-border)",
              boxShadow: "0 16px 64px rgba(0,0,0,0.6)",
              width: "min(420px, 92vw)",
              maxHeight: "80vh",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid var(--color-border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>
                  {versionPicker.title}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--color-text-secondary)",
                    marginTop: 2,
                  }}
                >
                  {versionPicker.artist} — Pick a version
                </div>
              </div>
              <button
                onClick={() => setVersionPicker(null)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--color-text-secondary)",
                  fontSize: 20,
                  cursor: "pointer",
                  padding: 4,
                }}
              >
                ✕
              </button>
            </div>
            <div
              style={{
                overflowY: "auto",
                padding: 12,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              {versionPicker.versions.map((v) => (
                <button
                  key={v.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 14px",
                    background: "var(--color-bg-secondary)",
                    borderRadius: 10,
                    border: "1px solid var(--color-border)",
                    cursor: "pointer",
                    textAlign: "left",
                    color: "var(--color-text-primary)",
                    width: "100%",
                  }}
                  disabled={addingLocal === v.id}
                  onClick={() => {
                    setVersionPicker(null);
                    void enqueueLocal(v.id, v.title || "Unknown");
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>
                      {v.disc_id || "Unknown disc"}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--color-text-secondary)",
                        marginTop: 2,
                      }}
                    >
                      {v.kind?.toUpperCase()}
                    </div>
                  </div>
                  {addingLocal === v.id ? (
                    <span
                      style={{
                        color: "var(--color-text-secondary)",
                        fontSize: 12,
                      }}
                    >
                      Adding…
                    </span>
                  ) : (
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: "var(--color-accent)",
                      }}
                    >
                      + Add
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* KN Version Picker Modal */}
      {knVersionPicker && (
        <>
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.7)",
              zIndex: 200,
            }}
            onClick={() => setKnVersionPicker(null)}
          />
          <div
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%,-50%)",
              zIndex: 201,
              background: "var(--color-bg-card)",
              borderRadius: 16,
              border: "1px solid var(--color-border)",
              boxShadow: "0 16px 64px rgba(0,0,0,0.6)",
              width: "min(420px, 92vw)",
              maxHeight: "80vh",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid var(--color-border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>
                  {knVersionPicker.title}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--color-text-secondary)",
                    marginTop: 2,
                  }}
                >
                  {knVersionPicker.artist} — Pick a version
                </div>
              </div>
              <button
                onClick={() => setKnVersionPicker(null)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--color-text-secondary)",
                  fontSize: 20,
                  cursor: "pointer",
                  padding: 4,
                }}
              >
                ✕
              </button>
            </div>
            <div
              style={{
                overflowY: "auto",
                padding: 12,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              {knVersionPicker.versions.map((v) => (
                <button
                  key={v.url}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 14px",
                    background: "var(--color-bg-secondary)",
                    borderRadius: 10,
                    border: "1px solid var(--color-border)",
                    cursor: "pointer",
                    textAlign: "left",
                    color: "var(--color-text-primary)",
                    width: "100%",
                  }}
                  disabled={addingKaraokeNerds === v.url}
                  onClick={() => {
                    setKnVersionPicker(null);
                    void enqueueKaraokeNerds(v);
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>
                      {v.brand || "Unknown brand"}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--color-text-secondary)",
                        marginTop: 2,
                      }}
                    >
                      🌐 Online
                    </div>
                  </div>
                  {addingKaraokeNerds === v.url ? (
                    <span
                      style={{
                        color: "var(--color-text-secondary)",
                        fontSize: 12,
                      }}
                    >
                      Adding…
                    </span>
                  ) : (
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: "var(--color-accent)",
                      }}
                    >
                      + Add
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Lyrics Popup Modal */}
      {lyricsPopupOpen &&
        (() => {
          // Find the track data for the popup
          let artist = "Unknown Artist";
          let title = "Unknown Title";

          if (lyricsPopupOpen.startsWith("local-")) {
            const trackId = parseInt(lyricsPopupOpen.replace("local-", ""));
            const track = localRows.find((r) => r.id === trackId);
            if (track) {
              artist = track.artist || "Unknown Artist";
              title = track.title || "Unknown Title";
            }
          } else if (lyricsPopupOpen.startsWith("kn-")) {
            const trackUrl = lyricsPopupOpen.replace("kn-", "");
            const track = karaokeNerdsRows.find((t) => t.url === trackUrl);
            if (track) {
              artist = track.artist || "Unknown Artist";
              title = track.title;
            }
          }

          const data = lyricsData[lyricsPopupOpen];

          return (
            <div
              className="lyrics-popup-overlay"
              onClick={() => setLyricsPopupOpen(null)}
            >
              <div
                className="lyrics-popup"
                ref={lyricsPopupRef}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="lyrics-header">
                  <div className="lyrics-title-info">
                    <h2 className="lyrics-popup-title">{title}</h2>
                    <p className="lyrics-popup-artist">{artist}</p>
                  </div>
                  <button
                    className="lyrics-close-button"
                    onClick={() => setLyricsPopupOpen(null)}
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>

                {data?.loading ? (
                  <div className="lyrics-loading">
                    <div className="loading-spinner"></div>
                    <div className="loading-text">Loading lyrics...</div>
                  </div>
                ) : data?.error ? (
                  <div className="lyrics-error">
                    <div className="lyrics-error-icon">😔</div>
                    <div>{data.error}</div>
                  </div>
                ) : data?.lyrics ? (
                  <div className="lyrics-content">{data.lyrics}</div>
                ) : null}
              </div>
            </div>
          );
        })()}
    </div>
  );
}
