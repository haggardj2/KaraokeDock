import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState, useRef, useCallback, useLayoutEffect, useMemo, } from "react";
import { createPortal } from "react-dom";
import { api } from "../api";
const MIN_KEY_ADJUSTMENT = -6;
const MAX_KEY_ADJUSTMENT = 6;
const MOBILE_BREAKPOINT = 640;
const BROWSE_LETTERS = ["#", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")];
const SINGER_UUID_STORAGE_KEY = "karaoke-singer-uuid";
function normalizeMyQueueItems(items) {
    if (!Array.isArray(items))
        return [];
    return items
        .map((item) => {
        if (!item || typeof item !== "object")
            return null;
        const row = item;
        const id = Number(row.id);
        if (!Number.isFinite(id))
            return null;
        return {
            id,
            title: typeof row.title === "string" ? row.title : null,
            artist: typeof row.artist === "string" ? row.artist : null,
            status: typeof row.status === "string" ? row.status : "",
        };
    })
        .filter((item) => item !== null);
}
function reorderQueuedItems(items, draggedId, targetId) {
    if (draggedId === targetId)
        return null;
    const queued = items.filter((item) => item.status === "queued");
    const fromIdx = queued.findIndex((item) => item.id === draggedId);
    const toIdx = queued.findIndex((item) => item.id === targetId);
    if (fromIdx === -1 || toIdx === -1)
        return null;
    const reordered = [...queued];
    reordered.splice(toIdx, 0, reordered.splice(fromIdx, 1)[0]);
    const queuedIds = reordered.map((item) => item.id);
    const nextQueued = [...reordered];
    const nextItems = items.map((item) => item.status === "queued" ? nextQueued.shift() : item);
    return { items: nextItems, queuedIds };
}
function shouldHandleEnterKey(event) {
    const nativeEvent = event.nativeEvent;
    return event.key === "Enter" && !nativeEvent.isComposing;
}
/**
 * Normalize an artist name for grouping:
 * - Lowercase
 * - Invert "Artist, The" / "Artist, A" / "Artist, An" → "the artist" etc.
 */
function normalizeArtistForGroup(artist) {
    const trimmed = artist.trim();
    const inverted = trimmed.replace(/^(.+),\s*(a|an|the)$/i, (_, name, article) => `${article} ${name}`.toLowerCase());
    return inverted.toLowerCase();
}
function groupKey(title, artist) {
    return `${title.toLowerCase().trim()}|${normalizeArtistForGroup(artist)}`;
}
function downloadJsonFile(filename, data) {
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
function safeHistoryFilename(name) {
    return `${name.trim().replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "") || "singer-history"}.kd`;
}
function createSingerUuid() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }
    return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (char) => (Number(char) ^
        (Math.random() * 16) >> (Number(char) / 4)).toString(16));
}
function getOrCreateSingerUuid() {
    const existing = localStorage.getItem(SINGER_UUID_STORAGE_KEY);
    if (existing)
        return existing;
    const next = createSingerUuid();
    localStorage.setItem(SINGER_UUID_STORAGE_KEY, next);
    return next;
}
function readJsonFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            try {
                resolve(JSON.parse(String(reader.result ?? "")));
            }
            catch (error) {
                reject(error);
            }
        };
        reader.onerror = () => reject(reader.error ?? new Error("Could not read file"));
        reader.readAsText(file);
    });
}
export default function Requests() {
    const [q, setQ] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [singerUuid, setSingerUuid] = useState(() => getOrCreateSingerUuid());
    const requestedBy = [firstName.trim(), lastName.trim()]
        .filter(Boolean)
        .join(" ");
    const [keyAdjustments, setKeyAdjustments] = useState(new Map());
    const [localViewMode, setLocalViewMode] = useState("search");
    const [localRows, setLocalRows] = useState([]);
    const [karaokeNerdsRows, setKaraokeNerdsRows] = useState([]);
    const [busy, setBusy] = useState(false);
    const [knBusy, setKnBusy] = useState(false);
    const [browseBusy, setBrowseBusy] = useState(false);
    const [browseCategory, setBrowseCategory] = useState("artist");
    const [browseLetters, setBrowseLetters] = useState([]);
    const [selectedBrowseLetter, setSelectedBrowseLetter] = useState("");
    const [browseArtists, setBrowseArtists] = useState([]);
    const [selectedBrowseArtist, setSelectedBrowseArtist] = useState("");
    const [browseSummary, setBrowseSummary] = useState("");
    const [addingLocal, setAddingLocal] = useState(null);
    const [addingKaraokeNerds, setAddingKaraokeNerds] = useState(null);
    const [recentlyAdded, setRecentlyAdded] = useState(new Set());
    const [showNamePrompt, setShowNamePrompt] = useState(false);
    const [kindFilter, setKindFilter] = useState("all");
    const [searchFieldFilter, setSearchFieldFilter] = useState("all");
    const [showFilters, setShowFilters] = useState(false);
    const [actionMenuOpen, setActionMenuOpen] = useState(null);
    const [actionMenuAnchor, setActionMenuAnchor] = useState(null);
    const [actionMenuPosition, setActionMenuPosition] = useState(null);
    const [keyAdjustmentView, setKeyAdjustmentView] = useState(null);
    const [lyricsPopupOpen, setLyricsPopupOpen] = useState(null);
    const [lyricsData, setLyricsData] = useState({});
    // Fuzzy suggestions (shown when main search returns no results)
    const [fuzzySuggestions, setFuzzySuggestions] = useState([]);
    // Requester's own queue items
    const [myQueue, setMyQueue] = useState([]);
    const [myQueueLoading, setMyQueueLoading] = useState(false);
    const [myQueueOpen, setMyQueueOpen] = useState(false);
    const [removingQueueId, setRemovingQueueId] = useState(null);
    const [requeueingQueueId, setRequeueingQueueId] = useState(null);
    const [revealedRemoveQueueId, setRevealedRemoveQueueId] = useState(null);
    const [dragOverQueueId, setDragOverQueueId] = useState(null);
    const [draggingQueueId, setDraggingQueueId] = useState(null);
    const myQueueRef = useRef([]);
    const draggingQueueIdRef = useRef(null);
    const historyImportInputRef = useRef(null);
    const completedLongClickRef = useRef(null);
    const pendingQueueOrderRef = useRef(null);
    const queueDragChangedRef = useRef(false);
    // Collapsible result sections (collapsed by default)
    const [localExpanded, setLocalExpanded] = useState(false);
    const [knExpanded, setKnExpanded] = useState(false);
    // Source filter: 'all' | 'local' | 'online'
    const [sourceFilter, setSourceFilter] = useState("all");
    // Name confirmation flow
    const [nameConfirmed, setNameConfirmed] = useState(false);
    const [nameError, setNameError] = useState("");
    const [nameModalOpen, setNameModalOpen] = useState(false);
    const [nameEditOpen, setNameEditOpen] = useState(false);
    // Version picker for consolidated song results
    const [versionPicker, setVersionPicker] = useState(null);
    const [knVersionPicker, setKnVersionPicker] = useState(null);
    const searchTimeoutRef = useRef(null);
    const toastTimeoutRef = useRef(null);
    const actionMenuRef = useRef(null);
    const lyricsPopupRef = useRef(null);
    // Request acceptance settings
    const [requestAcceptance, setRequestAcceptance] = useState("local");
    const [localLibraryEnabled, setLocalLibraryEnabled] = useState(true);
    const [externalLibraryEnabled, setExternalLibraryEnabled] = useState(true);
    const [localBrowseEnabled, setLocalBrowseEnabled] = useState(true);
    useEffect(() => {
        // Close popup when clicking outside
        function handleDown(e) {
            if (actionMenuOpen) {
                const el = actionMenuRef.current;
                if (el && !el.contains(e.target)) {
                    setActionMenuOpen(null);
                    setActionMenuPosition(null);
                    setKeyAdjustmentView(null);
                }
            }
            if (lyricsPopupOpen) {
                const el = lyricsPopupRef.current;
                if (el && !el.contains(e.target)) {
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
        const prevNavDisplay = nav ? nav.style.display : "";
        if (nav)
            nav.style.display = "none";
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
                const externalEnabled = settings["libraries.external_enabled"] !== false;
                const browseEnabled = settings["requests.local_browse_enabled"] !== false;
                setRequestAcceptance(acceptance);
                setLocalLibraryEnabled(localEnabled);
                setExternalLibraryEnabled(externalEnabled);
                setLocalBrowseEnabled(browseEnabled);
            }
            catch (err) {
                console.error("Failed to load settings:", err);
                // Default to allowing everything if we can't load settings
            }
        }
        loadSettings();
        return () => {
            document.documentElement.style.cssText = "";
            document.body.style.cssText = "";
            if (nav)
                nav.style.display = prevNavDisplay;
            if (searchTimeoutRef.current)
                clearTimeout(searchTimeoutRef.current);
            if (toastTimeoutRef.current)
                clearTimeout(toastTimeoutRef.current);
        };
    }, []);
    useEffect(() => {
        if (!localBrowseEnabled && localViewMode === "browse") {
            setLocalViewMode("search");
        }
    }, [localBrowseEnabled, localViewMode]);
    useLayoutEffect(() => {
        if (!actionMenuOpen)
            return;
        if (window.innerWidth <= MOBILE_BREAKPOINT)
            return;
        if (!actionMenuAnchor)
            return;
        // Wait a frame so the portal'd menu is in the DOM and measurable
        requestAnimationFrame(() => {
            const menuEl = actionMenuRef.current;
            if (!menuEl)
                return;
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
    const adjustKey = useCallback((trackKey, delta) => {
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
    const handleActionMenuToggle = useCallback((e, trackKey, currentlyOpen) => {
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
            }
            else {
                setActionMenuAnchor(null);
                setActionMenuPosition(null);
            }
        }
        setActionMenuOpen((prev) => (prev === trackKey ? null : trackKey));
        if (wasOpen)
            setActionMenuAnchor(null);
    }, []);
    // Function to fetch lyrics
    const fetchLyrics = useCallback(async (trackKey, artist, title) => {
        // Set loading state
        setLyricsData((prev) => ({
            ...prev,
            [trackKey]: { loading: true, lyrics: null, error: null },
        }));
        try {
            // Create an AbortController for timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
            const response = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`, {
                signal: controller.signal,
            });
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
        }
        catch (err) {
            const errorMessage = err instanceof Error && err.name === "AbortError"
                ? "Request timeout - please try again"
                : "Lyrics not found";
            setLyricsData((prev) => ({
                ...prev,
                [trackKey]: { loading: false, lyrics: null, error: errorMessage },
            }));
        }
    }, []);
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
            if (rows.length > 0)
                setLocalExpanded(true);
            if (rows.length === 0 && q.trim().length >= 2) {
                try {
                    const suggestions = await api(`/api/search/suggestions?q=${encodeURIComponent(q.trim())}`);
                    setFuzzySuggestions(Array.isArray(suggestions) ? suggestions : []);
                }
                catch {
                    setFuzzySuggestions([]);
                }
            }
            else {
                setFuzzySuggestions([]);
            }
        }
        catch (err) {
            console.error("Search error:", err);
            setLocalRows([]);
            setFuzzySuggestions([]);
        }
        finally {
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
            const r = await api(`/api/karaoke-nerds/search?q=${encodeURIComponent(q.trim())}`);
            const knRows = Array.isArray(r) ? r : [];
            setKaraokeNerdsRows(knRows);
            if (knRows.length > 0)
                setKnExpanded(true);
        }
        catch (err) {
            console.error("Karaoke Nerds search error:", err);
            setKaraokeNerdsRows([]);
        }
        finally {
            setKnBusy(false);
        }
    }, [q]);
    const loadBrowseLetters = useCallback(async (category) => {
        setBrowseBusy(true);
        try {
            const kindQuery = kindFilter !== "all" ? `&kind=${kindFilter}` : "";
            const result = await api(`/api/search/browse/letters?mode=${category}${kindQuery}`);
            const letters = Array.isArray(result?.letters)
                ? result.letters.filter((value) => typeof value === "string")
                : [];
            setBrowseLetters(letters);
            setSelectedBrowseLetter((current) => letters.includes(current) ? current : "");
        }
        catch (err) {
            console.error("Browse letters error:", err);
            setBrowseLetters([]);
            setSelectedBrowseLetter("");
        }
        finally {
            setBrowseBusy(false);
        }
    }, [kindFilter]);
    const loadBrowseArtists = useCallback(async (letter) => {
        setBrowseBusy(true);
        setBrowseArtists([]);
        setLocalRows([]);
        setBrowseSummary(`Artists starting with "${letter}"`);
        try {
            const kindQuery = kindFilter !== "all" ? `&kind=${kindFilter}` : "";
            const result = await api(`/api/search/browse/artists?letter=${encodeURIComponent(letter)}${kindQuery}`);
            const artists = Array.isArray(result?.artists)
                ? result.artists.filter((value) => typeof value === "string" && value.trim().length > 0)
                : [];
            setBrowseArtists(artists);
        }
        catch (err) {
            console.error("Browse artists error:", err);
            setBrowseArtists([]);
        }
        finally {
            setBrowseBusy(false);
        }
    }, [kindFilter]);
    const loadBrowseTitles = useCallback(async (letter) => {
        setBrowseBusy(true);
        setBrowseArtists([]);
        setLocalRows([]);
        setBrowseSummary(`Titles starting with "${letter}"`);
        try {
            const kindQuery = kindFilter !== "all" ? `&kind=${kindFilter}` : "";
            const result = await api(`/api/search/browse/titles?letter=${encodeURIComponent(letter)}${kindQuery}`);
            setLocalRows(Array.isArray(result) ? result : []);
        }
        catch (err) {
            console.error("Browse titles error:", err);
            setLocalRows([]);
        }
        finally {
            setBrowseBusy(false);
        }
    }, [kindFilter]);
    const loadBrowseArtistTracks = useCallback(async (artist) => {
        setBrowseBusy(true);
        setLocalRows([]);
        setBrowseSummary(`Songs by ${artist}`);
        try {
            const kindQuery = kindFilter !== "all" ? `&kind=${kindFilter}` : "";
            const result = await api(`/api/search/browse/artist-tracks?artist=${encodeURIComponent(artist)}${kindQuery}`);
            setLocalRows(Array.isArray(result) ? result : []);
        }
        catch (err) {
            console.error("Browse artist tracks error:", err);
            setLocalRows([]);
        }
        finally {
            setBrowseBusy(false);
        }
    }, [kindFilter]);
    // Debounced search — fires both local and KN simultaneously
    useEffect(() => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }
        if (localViewMode === "browse") {
            return;
        }
        searchTimeoutRef.current = setTimeout(() => {
            if (localLibraryEnabled)
                doLocalSearch();
            if (externalLibraryEnabled)
                doKaraokeNerdsSearch();
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
        if (localViewMode === "browse")
            return;
        if (q.trim()) {
            if (localLibraryEnabled)
                doLocalSearch();
            if (externalLibraryEnabled)
                doKaraokeNerdsSearch();
        }
    }, [localViewMode]); // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => {
        if (localViewMode !== "browse")
            return;
        setBrowseArtists([]);
        setSelectedBrowseArtist("");
        setLocalRows([]);
        setBrowseSummary("");
        loadBrowseLetters(browseCategory);
    }, [localViewMode, browseCategory, kindFilter, loadBrowseLetters]);
    useEffect(() => {
        if (localViewMode !== "browse")
            return;
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
        }
        else {
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
        if (localViewMode !== "browse" || browseCategory !== "artist")
            return;
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
    const showToast = (message, type = "success") => {
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
    const showingBrowseArtistList = isLocalBrowseMode &&
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
        }
        catch (err) {
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
    const groupedLocalRows = useMemo(() => {
        const map = new Map();
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
            map.get(key).versions.push(row);
        }
        return Array.from(map.values());
    }, [localRows]);
    const groupedKnRows = useMemo(() => {
        const map = new Map();
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
            map.get(key).versions.push(track);
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
            const items = await api(`/api/queue/by-requester?${params.toString()}`);
            setMyQueue(normalizeMyQueueItems(items));
        }
        catch {
            setMyQueue([]);
        }
        finally {
            setMyQueueLoading(false);
        }
    }, [requestedBy, singerUuid]);
    useEffect(() => {
        void loadMyQueue();
    }, [loadMyQueue]);
    useEffect(() => {
        myQueueRef.current = myQueue;
    }, [myQueue]);
    const applyMyQueueReorder = useCallback((draggedId, targetId) => {
        const result = reorderQueuedItems(myQueueRef.current, draggedId, targetId);
        if (!result)
            return null;
        myQueueRef.current = result.items;
        pendingQueueOrderRef.current = result.queuedIds;
        queueDragChangedRef.current = true;
        setMyQueue(result.items);
        return result.queuedIds;
    }, []);
    const beginMyQueueDrag = useCallback((event, queueId) => {
        if (event.button !== 0)
            return;
        if (event.target.closest("button"))
            return;
        draggingQueueIdRef.current = queueId;
        pendingQueueOrderRef.current = myQueueRef.current
            .filter((queueItem) => queueItem.status === "queued")
            .map((queueItem) => queueItem.id);
        queueDragChangedRef.current = false;
        setDraggingQueueId(queueId);
        setDragOverQueueId(queueId);
        event.currentTarget.setPointerCapture(event.pointerId);
        event.preventDefault();
    }, []);
    const moveMyQueueDrag = useCallback((event) => {
        const draggedId = draggingQueueIdRef.current;
        if (!draggedId)
            return;
        const target = document
            .elementFromPoint(event.clientX, event.clientY)
            ?.closest("[data-my-queue-id]");
        const targetId = Number(target?.getAttribute("data-my-queue-id"));
        if (Number.isFinite(targetId) && targetId !== draggedId) {
            setDragOverQueueId(targetId);
            applyMyQueueReorder(draggedId, targetId);
        }
    }, [applyMyQueueReorder]);
    const endMyQueueDrag = useCallback((event) => {
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
        if (changed && orderedIds)
            void reorderMyQueue(orderedIds);
    }, [reorderMyQueue]);
    const cancelMyQueueDrag = useCallback((event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }
        draggingQueueIdRef.current = null;
        pendingQueueOrderRef.current = null;
        queueDragChangedRef.current = false;
        setDraggingQueueId(null);
        setDragOverQueueId(null);
    }, []);
    const beginCompletedQueueLongClick = useCallback((event, queueId) => {
        if (event.button !== 0)
            return;
        if (event.target.closest("button"))
            return;
        const target = event.currentTarget;
        completedLongClickRef.current = {
            id: queueId,
            startX: event.clientX,
            startY: event.clientY,
            timeout: setTimeout(() => {
                setRevealedRemoveQueueId((current) => current === queueId ? null : queueId);
            }, 550),
        };
        target.setPointerCapture(event.pointerId);
    }, []);
    const moveCompletedQueueLongClick = useCallback((event) => {
        const longClick = completedLongClickRef.current;
        if (!longClick)
            return;
        const moved = Math.abs(event.clientX - longClick.startX) > 10 ||
            Math.abs(event.clientY - longClick.startY) > 10;
        if (moved) {
            clearTimeout(longClick.timeout);
            completedLongClickRef.current = null;
        }
    }, []);
    const endCompletedQueueLongClick = useCallback((event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }
        if (completedLongClickRef.current) {
            clearTimeout(completedLongClickRef.current.timeout);
        }
        completedLongClickRef.current = null;
    }, []);
    const cancelCompletedQueueLongClick = useCallback((event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }
        if (completedLongClickRef.current) {
            clearTimeout(completedLongClickRef.current.timeout);
        }
        completedLongClickRef.current = null;
    }, []);
    async function removeFromMyQueue(queueId) {
        const name = requestedBy.trim();
        if (!name)
            return;
        setRemovingQueueId(queueId);
        try {
            await api(`/api/queue/${queueId}/self-remove?${new URLSearchParams({ name, singerUuid }).toString()}`, { method: "DELETE" });
            await loadMyQueue();
            setRevealedRemoveQueueId(null);
            showToast("Song removed from queue");
        }
        catch (err) {
            showToast("Could not remove song. Please try again.", "error");
            console.error(err);
        }
        finally {
            setRemovingQueueId(null);
        }
    }
    async function requeueFromMyQueue(queueId, songTitle) {
        const name = requestedBy.trim();
        if (!name)
            return;
        setRequeueingQueueId(queueId);
        try {
            await api(`/api/queue/${queueId}/self-requeue`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, singerUuid }),
            });
            await loadMyQueue();
            showToast(`Added "${songTitle || "Unknown"}" back to ${name}'s queue`);
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : "";
            if (msg.includes("409") || msg.toLowerCase().includes("already")) {
                showToast("You already have this song in the queue", "error");
            }
            else {
                showToast("Could not add song back. Please try again.", "error");
                console.error(err);
            }
        }
        finally {
            setRequeueingQueueId(null);
        }
    }
    async function exportMySingerHistory() {
        const name = requestedBy.trim();
        if (!name)
            return;
        try {
            const data = await api(`/api/history/self/export?${new URLSearchParams({ name, singerUuid }).toString()}`);
            downloadJsonFile(safeHistoryFilename(name), data);
            showToast("Singer history exported");
        }
        catch (err) {
            showToast("Could not export singer history.", "error");
            console.error(err);
        }
    }
    async function importMySingerHistory(file) {
        const name = requestedBy.trim();
        if (!name || !file)
            return;
        try {
            const data = await readJsonFile(file);
            const result = await api("/api/history/self/import", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, singerUuid, data }),
            });
            await loadMyQueue();
            showToast(`Imported ${Number(result.imported ?? 0)} history song${Number(result.imported ?? 0) === 1 ? "" : "s"}`);
        }
        catch (err) {
            showToast("Could not import singer history.", "error");
            console.error(err);
        }
        finally {
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
    async function reorderMyQueue(orderedIds) {
        const name = requestedBy.trim();
        if (!name)
            return;
        try {
            await api("/api/queue/self-reorder", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, singerUuid, queueIds: orderedIds }),
            });
            await loadMyQueue();
            showToast("Queue order updated");
        }
        catch (err) {
            showToast("Could not reorder queue. Please try again.", "error");
            console.error(err);
        }
    }
    async function enqueueLocal(id, songTitle) {
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
            const keyText = keyAdjustment !== 0
                ? ` (Key: ${keyAdjustment > 0 ? "+" : ""}${keyAdjustment})`
                : "";
            showToast(`Added "${songTitle || "Unknown"}" to ${name}'s queue${keyText}`);
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : "";
            if (msg.includes("409") ||
                msg.toLowerCase().includes("already requested")) {
                showToast("⚠️ You already have this song in the queue", "error");
            }
            else {
                showToast("Failed to add song.  Please try again.", "error");
                console.error(err);
            }
        }
        finally {
            setAddingLocal(null);
        }
    }
    async function enqueueKaraokeNerds(track) {
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
            const keyText = keyAdjustment !== 0
                ? ` (Key: ${keyAdjustment > 0 ? "+" : ""}${keyAdjustment})`
                : "";
            showToast(`Added "${track.title || "Unknown"}" to ${name}'s queue${keyText}`);
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : "";
            if (msg.includes("409") ||
                msg.toLowerCase().includes("already requested")) {
                showToast("⚠️ You already have this song in the queue", "error");
            }
            else {
                showToast("Failed to add song. Please try again.", "error");
                console.error(err);
            }
        }
        finally {
            setAddingKaraokeNerds(null);
        }
    }
    return (_jsxs("div", { className: "requests-page", children: [_jsx("style", { children: `
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
      ` }), _jsxs("div", { className: "container", children: [_jsxs("div", { className: "header", style: { position: "relative" }, children: [_jsx("h1", { className: "header-title", children: "\uD83C\uDFA4 Request a Song" }), _jsx("p", { className: "header-subtitle", children: "Find your favorite songs and rock the stage!" }), _jsxs("button", { onClick: () => {
                                    setNameEditOpen(!nameConfirmed);
                                    setNameModalOpen(true);
                                }, title: nameConfirmed ? `Singing as ${requestedBy}` : "Enter your name", style: {
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
                                }, children: [_jsx("span", { style: { fontSize: 15 }, children: "\uD83D\uDC64" }), nameConfirmed ? (_jsx("span", { style: {
                                            fontSize: 9,
                                            color: "var(--color-accent)",
                                            fontWeight: 600,
                                            maxWidth: 56,
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            whiteSpace: "nowrap",
                                        }, children: firstName })) : (_jsx("span", { style: { fontSize: 8, color: "#ef4444", fontWeight: 600 }, children: "Set name" }))] })] }), nameModalOpen &&
                        createPortal(_jsxs(_Fragment, { children: [_jsx("div", { style: {
                                        position: "fixed",
                                        inset: 0,
                                        zIndex: 1000,
                                        background: "rgba(0,0,0,0.6)",
                                    }, onClick: () => {
                                        if (nameConfirmed) {
                                            setNameModalOpen(false);
                                            setNameEditOpen(false);
                                            setNameError("");
                                        }
                                    } }), _jsxs("div", { style: {
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
                                    }, children: [_jsxs("div", { style: {
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "space-between",
                                                marginBottom: 20,
                                            }, children: [_jsxs("span", { style: { fontWeight: 700, fontSize: 17 }, children: ["\uD83D\uDC64 ", nameEditOpen || !nameConfirmed ? (nameConfirmed ? "Change Name" : "Enter Your Name") : "Profile"] }), nameConfirmed && (_jsx("button", { onClick: () => {
                                                        setNameModalOpen(false);
                                                        setNameEditOpen(false);
                                                        setNameError("");
                                                    }, style: {
                                                        background: "none",
                                                        border: "none",
                                                        color: "var(--color-text-secondary)",
                                                        cursor: "pointer",
                                                        fontSize: 18,
                                                        padding: "2px 6px",
                                                    }, children: "\u2715" }))] }), (nameEditOpen || !nameConfirmed) && (_jsxs(_Fragment, { children: [showNamePrompt && !requestedBy.trim() && (_jsxs("div", { style: {
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
                                                    }, children: [_jsx("span", { children: "\u26A0\uFE0F" }), _jsx("span", { children: "Enter your name to add songs to the queue" })] })), _jsxs("div", { style: { display: "flex", gap: 10, marginBottom: 6 }, children: [_jsxs("div", { style: { flex: 1 }, children: [_jsxs("label", { style: {
                                                                        display: "block",
                                                                        fontSize: 12,
                                                                        fontWeight: 500,
                                                                        color: "var(--color-text-secondary)",
                                                                        marginBottom: 6,
                                                                    }, children: ["First Name", " ", _jsx("span", { style: { color: "var(--color-danger)" }, children: "*" })] }), _jsx("input", { id: "singer-first-name-input", className: "input-field", type: "text", placeholder: "First name\u2026", value: firstName, onChange: (e) => {
                                                                        setFirstName(e.target.value);
                                                                        setNameError("");
                                                                    }, autoComplete: "given-name", autoCapitalize: "words", onKeyDown: (e) => {
                                                                        if (shouldHandleEnterKey(e))
                                                                            void confirmName();
                                                                    }, style: { paddingLeft: 14 } })] }), _jsxs("div", { style: { flex: 1 }, children: [_jsxs("label", { style: {
                                                                        display: "block",
                                                                        fontSize: 12,
                                                                        fontWeight: 500,
                                                                        color: "var(--color-text-secondary)",
                                                                        marginBottom: 6,
                                                                    }, children: ["Last Name", " ", _jsx("span", { style: { color: "var(--color-danger)" }, children: "*" })] }), _jsx("input", { id: "singer-last-name-input", className: "input-field", type: "text", placeholder: "Last name\u2026", value: lastName, onChange: (e) => {
                                                                        setLastName(e.target.value);
                                                                        setNameError("");
                                                                    }, autoComplete: "family-name", autoCapitalize: "words", onKeyDown: (e) => {
                                                                        if (shouldHandleEnterKey(e))
                                                                            void confirmName();
                                                                    }, style: { paddingLeft: 14 } })] })] }), nameError && (_jsxs("div", { style: {
                                                        color: "var(--color-danger)",
                                                        fontSize: 13,
                                                        marginBottom: 10,
                                                    }, children: ["\u26A0\uFE0F ", nameError] })), _jsx("button", { onClick: () => void confirmName(), style: {
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
                                                    }, children: nameConfirmed ? "Save Changes" : "Let's go! 🎤" })] })), nameConfirmed && (_jsxs("div", { style: {
                                                marginTop: 12,
                                                paddingTop: 12,
                                                borderTop: "1px solid var(--color-border)",
                                                display: "flex",
                                                flexWrap: "wrap",
                                                gap: 8,
                                            }, children: [_jsx("input", { ref: historyImportInputRef, type: "file", accept: ".kd,application/json", style: { display: "none" }, onChange: (event) => void importMySingerHistory(event.currentTarget.files?.[0]) }), _jsx("button", { onClick: () => {
                                                        setNameEditOpen(true);
                                                        requestAnimationFrame(() => document.getElementById("singer-first-name-input")?.focus());
                                                    }, style: {
                                                        flex: "1 1 45%",
                                                        padding: "10px",
                                                        background: "var(--color-bg-secondary)",
                                                        color: "var(--color-text-primary)",
                                                        border: "1px solid var(--color-border)",
                                                        borderRadius: 10,
                                                        fontWeight: 700,
                                                        cursor: "pointer",
                                                    }, children: "\u270F\uFE0F Change Name" }), _jsx("button", { onClick: () => void exportMySingerHistory(), style: {
                                                        flex: "1 1 45%",
                                                        padding: "10px",
                                                        background: "rgba(99,102,241,0.15)",
                                                        color: "var(--color-accent)",
                                                        border: "1px solid rgba(99,102,241,0.3)",
                                                        borderRadius: 10,
                                                        fontWeight: 700,
                                                        cursor: "pointer",
                                                    }, children: "Export History" }), _jsx("button", { onClick: () => historyImportInputRef.current?.click(), style: {
                                                        flex: "1 1 45%",
                                                        padding: "10px",
                                                        background: "var(--color-bg-secondary)",
                                                        color: "var(--color-text-primary)",
                                                        border: "1px solid var(--color-border)",
                                                        borderRadius: 10,
                                                        fontWeight: 700,
                                                        cursor: "pointer",
                                                    }, children: "Import History" }), _jsx("button", { onClick: () => void logOffSingerProfile(), style: {
                                                        flex: "1 1 45%",
                                                        padding: "10px",
                                                        background: "rgba(239,68,68,0.12)",
                                                        color: "var(--color-danger)",
                                                        border: "1px solid rgba(239,68,68,0.3)",
                                                        borderRadius: 10,
                                                        fontWeight: 700,
                                                        cursor: "pointer",
                                                    }, children: "Log Off" })] }))] })] }), document.body), nameConfirmed &&
                        createPortal(_jsxs(_Fragment, { children: [myQueueOpen && (_jsxs(_Fragment, { children: [_jsx("div", { style: { position: "fixed", inset: 0, zIndex: 999 }, onClick: () => setMyQueueOpen(false) }), _jsxs("div", { style: {
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
                                            }, children: [_jsxs("div", { style: {
                                                        padding: "12px 14px",
                                                        borderBottom: "1px solid var(--color-border)",
                                                        display: "flex",
                                                        justifyContent: "space-between",
                                                        alignItems: "center",
                                                        flexShrink: 0,
                                                    }, children: [_jsx("span", { style: { fontWeight: 700, fontSize: 14 }, children: "\uD83D\uDCCB My Queue" }), _jsxs("div", { style: { display: "flex", gap: 8 }, children: [_jsx("button", { style: {
                                                                        background: "none",
                                                                        border: "none",
                                                                        color: "var(--color-text-secondary)",
                                                                        cursor: "pointer",
                                                                        fontSize: 13,
                                                                    }, onClick: () => void loadMyQueue(), children: "\u21BB" }), _jsx("button", { style: {
                                                                        background: "none",
                                                                        border: "none",
                                                                        color: "var(--color-text-secondary)",
                                                                        cursor: "pointer",
                                                                        fontSize: 16,
                                                                        padding: "0 2px",
                                                                    }, onClick: () => setMyQueueOpen(false), children: "\u2715" })] })] }), _jsx("div", { style: {
                                                        overflowY: "auto",
                                                        padding: 12,
                                                        display: "flex",
                                                        flexDirection: "column",
                                                        gap: 6,
                                                    }, children: myQueueLoading ? (_jsx("div", { style: {
                                                            color: "var(--color-text-secondary)",
                                                            fontSize: 13,
                                                            padding: "8px 0",
                                                        }, children: "Loading\u2026" })) : myQueue.length === 0 ? (_jsx("div", { style: {
                                                            color: "var(--color-text-muted)",
                                                            fontSize: 13,
                                                            padding: "8px 0",
                                                        }, children: "Nothing in queue yet." })) : (_jsxs(_Fragment, { children: [myQueue.some((i) => i.status === "queued") &&
                                                                myQueue.filter((i) => i.status === "queued")
                                                                    .length > 1 && (_jsx("div", { style: {
                                                                    fontSize: 11,
                                                                    color: "var(--color-text-muted)",
                                                                    marginBottom: 2,
                                                                }, children: "\u2630 Drag to reorder" })), myQueue.some((i) => i.status === "done" || i.status === "finished") && (_jsx("div", { style: {
                                                                    fontSize: 11,
                                                                    color: "var(--color-text-muted)",
                                                                    marginBottom: 2,
                                                                }, children: "Long-click played songs to remove" })), myQueue.map((item) => {
                                                                const isCompleted = item.status === "done" ||
                                                                    item.status === "finished";
                                                                const isQueued = item.status === "queued";
                                                                const isRemoveRevealed = revealedRemoveQueueId === item.id;
                                                                return (_jsxs("div", { "data-my-queue-id": item.id, draggable: false, onDragStart: (e) => {
                                                                        e.preventDefault();
                                                                    }, onPointerDown: isQueued
                                                                        ? (e) => beginMyQueueDrag(e, item.id)
                                                                        : isCompleted
                                                                            ? (e) => beginCompletedQueueLongClick(e, item.id)
                                                                            : undefined, onPointerMove: isQueued
                                                                        ? moveMyQueueDrag
                                                                        : isCompleted
                                                                            ? moveCompletedQueueLongClick
                                                                            : undefined, onPointerUp: isQueued
                                                                        ? endMyQueueDrag
                                                                        : isCompleted
                                                                            ? endCompletedQueueLongClick
                                                                            : undefined, onPointerCancel: isQueued
                                                                        ? cancelMyQueueDrag
                                                                        : isCompleted
                                                                            ? cancelCompletedQueueLongClick
                                                                            : undefined, style: {
                                                                        display: "flex",
                                                                        alignItems: "center",
                                                                        gap: 8,
                                                                        padding: "8px 10px",
                                                                        background: dragOverQueueId === item.id
                                                                            ? "rgba(99,102,241,0.15)"
                                                                            : "var(--color-bg-secondary)",
                                                                        borderRadius: 8,
                                                                        opacity: draggingQueueId === item.id
                                                                            ? 0.75
                                                                            : isCompleted || item.status === "skipped"
                                                                                ? 0.6
                                                                                : 1,
                                                                        cursor: isQueued ? "grab" : "default",
                                                                        border: dragOverQueueId === item.id
                                                                            ? "1px dashed rgba(99,102,241,0.5)"
                                                                            : "1px solid transparent",
                                                                        touchAction: isQueued
                                                                            ? "none"
                                                                            : isCompleted
                                                                                ? "pan-y"
                                                                                : undefined,
                                                                        userSelect: "none",
                                                                        transition: "background 0.16s ease",
                                                                    }, children: [item.status === "queued" && (_jsx("span", { style: {
                                                                                fontSize: 14,
                                                                                color: "var(--color-text-muted)",
                                                                                flexShrink: 0,
                                                                                cursor: "grab",
                                                                                padding: "4px 2px",
                                                                            }, children: "\u2630" })), _jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [_jsx("div", { style: {
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
                                                                                    }, children: item.title || "Unknown" }), _jsx("div", { style: {
                                                                                        fontSize: 11,
                                                                                        color: "var(--color-text-secondary)",
                                                                                        textDecoration: isCompleted
                                                                                            ? "line-through"
                                                                                            : "none",
                                                                                    }, children: item.artist || "Unknown" })] }), _jsxs("div", { style: {
                                                                                display: "flex",
                                                                                alignItems: "center",
                                                                                gap: 6,
                                                                                flexShrink: 0,
                                                                            }, children: [_jsx("span", { style: {
                                                                                        fontSize: 10,
                                                                                        fontWeight: 700,
                                                                                        padding: "2px 6px",
                                                                                        borderRadius: 6,
                                                                                        background: item.status === "playing"
                                                                                            ? "rgba(16,185,129,0.2)"
                                                                                            : isQueued
                                                                                                ? "rgba(99,102,241,0.15)"
                                                                                                : "rgba(113,113,122,0.15)",
                                                                                        color: item.status === "playing"
                                                                                            ? "#10b981"
                                                                                            : isQueued
                                                                                                ? "var(--color-accent)"
                                                                                                : "var(--color-text-muted)",
                                                                                    }, children: item.status === "playing"
                                                                                        ? "▶ NOW"
                                                                                        : isQueued
                                                                                            ? "⏳"
                                                                                            : "✅ Done" }), isQueued && (_jsx("button", { style: {
                                                                                        background: "rgba(239,68,68,0.15)",
                                                                                        color: "#ef4444",
                                                                                        border: "1px solid rgba(239,68,68,0.3)",
                                                                                        borderRadius: 6,
                                                                                        cursor: "pointer",
                                                                                        padding: "3px 8px",
                                                                                        fontSize: 11,
                                                                                    }, disabled: removingQueueId === item.id, onClick: () => void removeFromMyQueue(item.id), children: removingQueueId === item.id ? "…" : "✕" })), isCompleted && (_jsx("button", { style: {
                                                                                        background: "rgba(99,102,241,0.15)",
                                                                                        color: "var(--color-accent)",
                                                                                        border: "1px solid rgba(99,102,241,0.3)",
                                                                                        borderRadius: 6,
                                                                                        cursor: "pointer",
                                                                                        padding: "3px 8px",
                                                                                        fontSize: 11,
                                                                                        fontWeight: 700,
                                                                                        whiteSpace: "nowrap",
                                                                                    }, disabled: requeueingQueueId === item.id, onClick: () => void requeueFromMyQueue(item.id, item.title), children: requeueingQueueId === item.id
                                                                                        ? "…"
                                                                                        : "+ Add back" })), isCompleted && isRemoveRevealed && (_jsxs(_Fragment, { children: [_jsx("button", { style: {
                                                                                                background: "rgba(113,113,122,0.16)",
                                                                                                color: "var(--color-text-secondary)",
                                                                                                border: "1px solid rgba(113,113,122,0.28)",
                                                                                                borderRadius: 6,
                                                                                                cursor: "pointer",
                                                                                                padding: "3px 8px",
                                                                                                fontSize: 11,
                                                                                                fontWeight: 700,
                                                                                                whiteSpace: "nowrap",
                                                                                            }, onClick: () => setRevealedRemoveQueueId(null), children: "Cancel" }), _jsx("button", { style: {
                                                                                                background: "rgba(239,68,68,0.18)",
                                                                                                color: "#ef4444",
                                                                                                border: "1px solid rgba(239,68,68,0.35)",
                                                                                                borderRadius: 6,
                                                                                                cursor: "pointer",
                                                                                                padding: "3px 8px",
                                                                                                fontSize: 11,
                                                                                                fontWeight: 700,
                                                                                                whiteSpace: "nowrap",
                                                                                            }, disabled: removingQueueId === item.id, onClick: () => void removeFromMyQueue(item.id), children: removingQueueId === item.id
                                                                                                ? "…"
                                                                                                : "Remove" })] }))] })] }, item.id));
                                                            })] })) })] })] })), (() => {
                                    const nextSong = myQueue.find((i) => i.status === "playing") ??
                                        myQueue.find((i) => i.status === "queued");
                                    const activeCount = myQueue.filter((i) => i.status === "queued" || i.status === "playing").length;
                                    return (_jsxs("div", { onClick: () => {
                                            setMyQueueOpen((o) => !o);
                                            if (!myQueueOpen)
                                                void loadMyQueue();
                                        }, style: {
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
                                        }, children: [_jsxs("div", { style: {
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
                                                }, children: ["\uD83D\uDCCB", activeCount > 0 && (_jsx("span", { style: {
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
                                                        }, children: activeCount }))] }), _jsx("div", { style: { flex: 1, minWidth: 0 }, children: nextSong ? (_jsxs(_Fragment, { children: [_jsx("div", { style: {
                                                                fontSize: 11,
                                                                color: "var(--color-text-secondary)",
                                                                marginBottom: 1,
                                                            }, children: nextSong.status === "playing"
                                                                ? "▶ Now Playing"
                                                                : "⏳ Up Next" }), _jsx("div", { style: {
                                                                fontWeight: 600,
                                                                fontSize: 14,
                                                                whiteSpace: "nowrap",
                                                                overflow: "hidden",
                                                                textOverflow: "ellipsis",
                                                                color: "#fff",
                                                            }, children: nextSong.title || "Unknown" })] })) : (_jsx("div", { style: {
                                                        fontSize: 13,
                                                        color: "var(--color-text-muted)",
                                                    }, children: "No songs in queue yet \u2014 tap to view" })) }), _jsx("span", { style: { fontSize: 12, color: "var(--color-text-muted)" }, children: "My Queue \u203A" })] }));
                                })()] }), document.body), nameConfirmed && (_jsx("div", { className: "card", children: !localLibraryEnabled && !externalLibraryEnabled ? (_jsxs("div", { style: {
                                padding: "40px",
                                textAlign: "center",
                                color: "var(--color-text-secondary)",
                            }, children: [_jsx("div", { style: { fontSize: "48px", marginBottom: "16px" }, children: "\uD83C\uDFA4" }), _jsx("div", { style: { fontSize: "18px", fontWeight: 500 }, children: "We are not accepting requests at this time." })] })) : (_jsxs(_Fragment, { children: [_jsx("div", { style: {
                                        display: "flex",
                                        gap: 8,
                                        marginBottom: 16,
                                        flexWrap: "wrap",
                                    }, children: localLibraryEnabled && localBrowseEnabled && (_jsxs(_Fragment, { children: [_jsx("button", { className: `filter-chip ${localViewMode === "search" ? "active" : ""}`, onClick: () => setLocalViewMode("search"), style: { justifyContent: "center" }, children: _jsx("span", { children: "\uD83D\uDD0E Search" }) }), _jsx("button", { className: `filter-chip ${localViewMode === "browse" ? "active" : ""}`, onClick: () => setLocalViewMode("browse"), style: { justifyContent: "center" }, children: _jsx("span", { children: "\uD83D\uDDC2\uFE0F Browse" }) })] })) }), !isLocalBrowseMode && (_jsxs("div", { className: "search-wrapper", children: [_jsx("input", { className: "search-input", type: "search", placeholder: localLibraryEnabled && externalLibraryEnabled
                                                ? "Search local library & Online…"
                                                : localLibraryEnabled
                                                    ? "Search local songs…"
                                                    : "Search Online…", value: q, onChange: (e) => setQ(e.target.value), onKeyDown: (event) => {
                                                if (!shouldHandleEnterKey(event))
                                                    return;
                                                if (searchTimeoutRef.current) {
                                                    clearTimeout(searchTimeoutRef.current);
                                                }
                                                event.currentTarget.blur();
                                                if (localLibraryEnabled)
                                                    void doLocalSearch();
                                                if (externalLibraryEnabled)
                                                    void doKaraokeNerdsSearch();
                                            }, autoComplete: "off", autoCorrect: "off", spellCheck: "false" }), _jsx("span", { className: "search-icon", children: "\uD83D\uDD0D" })] })), localLibraryEnabled && (_jsxs("div", { className: "search-filters", children: [_jsxs("button", { className: "filter-toggle", onClick: () => setShowFilters(!showFilters), "aria-label": "Toggle filters", children: [_jsx("span", { className: "filter-icon", children: "\u2699\uFE0F" }), _jsx("span", { children: "Filters" }), _jsx("span", { className: "filter-chevron", children: showFilters ? "▼" : "▶" })] }), showFilters && (_jsx("div", { className: "filter-options", children: _jsxs("div", { className: "filter-group", children: [localLibraryEnabled && externalLibraryEnabled && (_jsxs(_Fragment, { children: [_jsx("label", { className: "filter-label", children: "Source" }), _jsxs("div", { className: "filter-chips", style: { marginBottom: 14 }, children: [_jsx("button", { className: `filter-chip ${sourceFilter === "all" ? "active" : ""}`, onClick: () => setSourceFilter("all"), children: _jsx("span", { children: "All" }) }), _jsx("button", { className: `filter-chip ${sourceFilter === "local" ? "active" : ""}`, onClick: () => setSourceFilter("local"), children: _jsx("span", { children: "\uD83D\uDCDA Local" }) }), _jsx("button", { className: `filter-chip ${sourceFilter === "online" ? "active" : ""}`, onClick: () => setSourceFilter("online"), children: _jsx("span", { children: "\uD83C\uDF10 Online" }) })] })] })), _jsx("label", { className: "filter-label", children: "Search In" }), _jsxs("div", { className: "filter-chips", style: { marginBottom: 14 }, children: [_jsx("button", { className: `filter-chip ${searchFieldFilter === "all" ? "active" : ""}`, onClick: () => setSearchFieldFilter("all"), children: _jsx("span", { children: "All" }) }), _jsx("button", { className: `filter-chip ${searchFieldFilter === "artist" ? "active" : ""}`, onClick: () => setSearchFieldFilter("artist"), children: _jsx("span", { children: "Artist" }) }), _jsx("button", { className: `filter-chip ${searchFieldFilter === "title" ? "active" : ""}`, onClick: () => setSearchFieldFilter("title"), children: _jsx("span", { children: "Song Title" }) })] }), _jsx("label", { className: "filter-label", children: "Format" }), _jsxs("div", { className: "filter-chips", children: [_jsx("button", { className: `filter-chip ${kindFilter === "all" ? "active" : ""}`, onClick: () => setKindFilter("all"), children: _jsx("span", { children: "All Formats" }) }), _jsx("button", { className: `filter-chip ${kindFilter === "mp4" ? "active" : ""}`, onClick: () => setKindFilter("mp4"), children: _jsx("span", { children: "\uD83C\uDFAC MP4 Video" }) }), _jsx("button", { className: `filter-chip ${kindFilter === "cdgmp3" ? "active" : ""}`, onClick: () => setKindFilter("cdgmp3"), children: _jsx("span", { children: "\uD83D\uDCC0 CDG+MP3" }) })] })] }) }))] })), isLocalBrowseMode && (_jsxs("div", { style: {
                                        marginBottom: 20,
                                        padding: 16,
                                        background: "var(--color-bg-secondary)",
                                        borderRadius: 14,
                                        border: "1px solid var(--color-border)",
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: 16,
                                    }, children: [_jsxs("div", { children: [_jsx("div", { style: {
                                                        fontSize: 12,
                                                        color: "var(--color-text-secondary)",
                                                        marginBottom: 8,
                                                        textTransform: "uppercase",
                                                        letterSpacing: "0.08em",
                                                    }, children: "Browse by" }), _jsxs("div", { style: { display: "flex", gap: 10 }, children: [_jsx("button", { className: `filter-chip ${browseCategory === "artist" ? "active" : ""}`, onClick: () => setBrowseCategory("artist"), style: { flex: 1, justifyContent: "center" }, children: _jsx("span", { children: "Artist" }) }), _jsx("button", { className: `filter-chip ${browseCategory === "title" ? "active" : ""}`, onClick: () => setBrowseCategory("title"), style: { flex: 1, justifyContent: "center" }, children: _jsx("span", { children: "Song Title" }) })] })] }), _jsxs("div", { children: [_jsx("div", { style: {
                                                        fontSize: 12,
                                                        color: "var(--color-text-secondary)",
                                                        marginBottom: 8,
                                                        textTransform: "uppercase",
                                                        letterSpacing: "0.08em",
                                                    }, children: "Letter" }), _jsxs("select", { className: "form-input", value: selectedBrowseLetter, onChange: (e) => setSelectedBrowseLetter(e.target.value), style: {
                                                        width: "100%",
                                                        cursor: "pointer",
                                                        background: "var(--color-bg-card)",
                                                        color: "var(--color-text-primary)",
                                                        border: "1px solid var(--color-border)",
                                                        borderRadius: 12,
                                                        padding: "12px 14px",
                                                        boxSizing: "border-box",
                                                    }, children: [_jsx("option", { value: "", children: "Select a letter" }), BROWSE_LETTERS.map((letter) => (_jsx("option", { value: letter, disabled: !availableBrowseLetters.has(letter), children: letter }, letter)))] })] }), browseCategory === "artist" && selectedBrowseLetter && (_jsxs("div", { children: [_jsx("div", { style: {
                                                        fontSize: 12,
                                                        color: "var(--color-text-secondary)",
                                                        marginBottom: 8,
                                                        textTransform: "uppercase",
                                                        letterSpacing: "0.08em",
                                                    }, children: "Artist" }), _jsx("div", { style: {
                                                        display: "flex",
                                                        flexWrap: "wrap",
                                                        gap: 8,
                                                        maxHeight: 220,
                                                        overflowY: "auto",
                                                    }, children: browseArtists.map((artist) => (_jsx("button", { className: `filter-chip ${selectedBrowseArtist === artist ? "active" : ""}`, onClick: () => setSelectedBrowseArtist(artist), children: _jsx("span", { children: artist }) }, artist))) })] }))] })), isLocalBrowseMode ? (showingBrowseArtistList ? (_jsxs("div", { className: "empty-state", children: [_jsx("div", { className: "empty-icon", children: "\uD83C\uDF99\uFE0F" }), _jsx("div", { className: "empty-title", children: "Choose an artist" }), _jsxs("div", { className: "empty-message", children: ["Pick an artist from the list above to see songs under \"", selectedBrowseLetter, "\"."] })] })) : isLoading ? (_jsxs("div", { className: "loading-container", children: [_jsx("div", { className: "loading-spinner" }), _jsx("div", { className: "loading-text", children: "Loading library browse..." })] })) : showLocalResults ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "results-header", children: [_jsxs("span", { className: "results-count", children: [groupedLocalRows.length, " ", groupedLocalRows.length === 1 ? "song" : "songs", " ", "found", groupedLocalRows.length < localRows.length && (_jsxs("span", { style: {
                                                                marginLeft: 6,
                                                                fontSize: 11,
                                                                color: "var(--color-text-muted)",
                                                                fontWeight: 400,
                                                            }, children: ["(", localRows.length, " versions)"] }))] }), browseSummary && (_jsx("span", { className: "active-filter-badge", children: browseSummary })), kindFilter !== "all" && (_jsx("span", { className: "active-filter-badge", children: kindFilter === "mp4" ? "🎬 MP4" : "📀 CDG+MP3" }))] }), _jsx("div", { className: "results-container", children: groupedLocalRows.map((group, idx) => {
                                                const row = group.versions[0];
                                                const trackKey = `local-${row.id}`;
                                                const isRecentlyAdded = recentlyAdded.has(trackKey) ||
                                                    group.versions.some((v) => recentlyAdded.has(`local-${v.id}`));
                                                const isAdding = group.versions.some((v) => addingLocal === v.id);
                                                const currentKey = keyAdjustments.get(trackKey) ?? 0;
                                                const hasMultipleVersions = group.versions.length > 1;
                                                return (_jsxs("div", { className: "result-card", children: [_jsx("div", { className: "result-number", children: idx + 1 }), _jsxs("div", { className: "result-info", children: [_jsx("div", { className: "result-title", children: group.title || "Unknown Title" }), _jsx("div", { className: "result-artist", children: group.artist || "Unknown Artist" }), _jsx("div", { className: "result-meta", children: hasMultipleVersions ? (_jsxs("span", { className: "meta-tag", children: ["\uD83D\uDCC0 ", group.versions.length, " versions"] })) : (_jsxs(_Fragment, { children: [row.disc_id && (_jsxs("span", { className: "meta-tag", children: ["\uD83D\uDCC0 ", row.disc_id] })), row.kind && (_jsx("span", { className: "meta-tag", children: row.kind.toUpperCase() }))] })) })] }), _jsx("div", { className: "button-container", children: _jsxs("div", { style: {
                                                                    position: "relative",
                                                                    width: "100%",
                                                                }, children: [_jsx("button", { className: `action-menu-button ${isRecentlyAdded ? "success" : ""}`, onClick: (e) => {
                                                                            if (!isRecentlyAdded && !isAdding) {
                                                                                handleActionMenuToggle(e, trackKey, actionMenuOpen);
                                                                            }
                                                                        }, disabled: isAdding || isRecentlyAdded, children: isAdding ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "button-spinner" }), _jsx("span", { children: "Adding" })] })) : isRecentlyAdded ? (_jsxs(_Fragment, { children: [_jsx("span", { children: "\u2713" }), _jsx("span", { children: "Added" })] })) : (_jsxs(_Fragment, { children: [_jsx("span", { children: "\u22EF" }), _jsx("span", { children: "Options" })] })) }), actionMenuOpen === trackKey &&
                                                                        createPortal(_jsxs(_Fragment, { children: [_jsx("div", { className: "action-menu-overlay", onClick: () => setActionMenuOpen(null) }), _jsxs("div", { className: "action-menu", ref: actionMenuRef, onClick: (e) => e.stopPropagation(), style: actionMenuPosition
                                                                                        ? {
                                                                                            top: `${actionMenuPosition.top}px`,
                                                                                            left: `${actionMenuPosition.left}px`,
                                                                                            width: "max-content",
                                                                                            minWidth: `${actionMenuPosition.width}px`,
                                                                                        }
                                                                                        : undefined, children: [_jsxs("div", { className: "action-menu-header", children: [_jsx("h3", { className: "action-menu-title", children: group.title || "Unknown Title" }), _jsx("p", { className: "action-menu-subtitle", children: group.artist || "Unknown Artist" })] }), keyAdjustmentView === trackKey ? (_jsxs("div", { className: "key-adjustment-view", children: [_jsxs("div", { className: "key-adjustment-header", children: [_jsxs("button", { className: "key-adjustment-back", onClick: () => setKeyAdjustmentView(null), children: [_jsx("span", { children: "\u2190" }), _jsx("span", { children: "Back" })] }), _jsx("span", { className: "key-adjustment-title", children: "Adjust Key" })] }), _jsxs("div", { className: "key-adjustment-controls", children: [_jsx("button", { className: "key-adjustment-button", onClick: () => adjustKey(trackKey, -1), disabled: (keyAdjustments.get(trackKey) ?? 0) <=
                                                                                                                MIN_KEY_ADJUSTMENT, "aria-label": "Lower key", children: "\u2212" }), _jsxs("div", { className: "key-adjustment-display", children: [_jsxs("div", { className: "key-adjustment-value", children: ["\uD83C\uDFB9", " ", currentKey > 0
                                                                                                                            ? `+${currentKey}`
                                                                                                                            : currentKey] }), _jsx("div", { className: "key-adjustment-label", children: "Semitones" })] }), _jsx("button", { className: "key-adjustment-button", onClick: () => adjustKey(trackKey, 1), disabled: (keyAdjustments.get(trackKey) ?? 0) >=
                                                                                                                MAX_KEY_ADJUSTMENT, "aria-label": "Raise key", children: "+" })] })] })) : (_jsxs("div", { className: "action-menu-items", children: [_jsxs("button", { className: "action-menu-item primary", onClick: () => {
                                                                                                        setActionMenuOpen(null);
                                                                                                        if (hasMultipleVersions) {
                                                                                                            setVersionPicker({
                                                                                                                title: group.title,
                                                                                                                artist: group.artist,
                                                                                                                versions: group.versions,
                                                                                                            });
                                                                                                        }
                                                                                                        else {
                                                                                                            enqueueLocal(row.id, row.title || "Unknown");
                                                                                                        }
                                                                                                    }, children: [_jsx("span", { className: "action-menu-item-icon", children: "+" }), _jsxs("div", { className: "action-menu-item-content", children: [_jsx("span", { className: "action-menu-item-label", children: "Add to Queue" }), _jsx("span", { className: "action-menu-item-description", children: hasMultipleVersions
                                                                                                                        ? `Choose from ${group.versions.length} versions`
                                                                                                                        : "Request this song" })] })] }), !hasMultipleVersions && (_jsxs("button", { className: "action-menu-item", onClick: (e) => {
                                                                                                        e.stopPropagation();
                                                                                                        setKeyAdjustmentView(trackKey);
                                                                                                    }, children: [_jsx("span", { className: "action-menu-item-icon", children: "\uD83C\uDFB9" }), _jsxs("div", { className: "action-menu-item-content", children: [_jsx("span", { className: "action-menu-item-label", children: "Adjust Key" }), _jsx("span", { className: "action-menu-item-description", children: "Change pitch" })] }), _jsx("span", { className: "action-menu-item-value", children: currentKey > 0
                                                                                                                ? `+${currentKey}`
                                                                                                                : currentKey })] })), _jsxs("button", { className: "action-menu-item", onClick: (e) => {
                                                                                                        e.stopPropagation();
                                                                                                        const artist = group.artist ||
                                                                                                            "Unknown Artist";
                                                                                                        const title = group.title ||
                                                                                                            "Unknown Title";
                                                                                                        setActionMenuOpen(null);
                                                                                                        setLyricsPopupOpen(trackKey);
                                                                                                        if (!lyricsData[trackKey]) {
                                                                                                            fetchLyrics(trackKey, artist, title);
                                                                                                        }
                                                                                                    }, children: [_jsx("span", { className: "action-menu-item-icon", children: "\uD83D\uDCC4" }), _jsxs("div", { className: "action-menu-item-content", children: [_jsx("span", { className: "action-menu-item-label", children: "View Lyrics" }), _jsx("span", { className: "action-menu-item-description", children: "See song words" })] })] })] }))] })] }), document.body)] }) })] }, group.key));
                                            }) })] })) : (_jsxs("div", { className: "empty-state", children: [_jsx("div", { className: "empty-icon", children: "\uD83D\uDDC2\uFE0F" }), _jsx("div", { className: "empty-title", children: "Browse the library" }), _jsxs("div", { className: "empty-message", children: ["Choose", " ", browseCategory === "artist" ? "Artist" : "Song Title", " ", "and then pick a letter", browseCategory === "artist"
                                                    ? ", followed by an artist,"
                                                    : "", " ", "to browse the local library alphabetically."] })] }))) : (_jsxs(_Fragment, { children: [(sourceFilter === "all" || sourceFilter === "local") &&
                                            localLibraryEnabled &&
                                            (isLoading ? (_jsxs("div", { className: "loading-container", children: [_jsx("div", { className: "loading-spinner" }), _jsx("div", { className: "loading-text", children: "Searching local library..." })] })) : showLocalResults ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "results-header", onClick: () => setLocalExpanded((e) => !e), style: { cursor: "pointer", userSelect: "none" }, children: [_jsxs("span", { className: "results-count", children: [_jsx("img", { src: "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f4da.svg", alt: "", style: {
                                                                            width: 14,
                                                                            height: 14,
                                                                            verticalAlign: "middle",
                                                                            marginRight: 5,
                                                                        } }), "Local \u2014 ", groupedLocalRows.length, " ", groupedLocalRows.length === 1 ? "song" : "songs", groupedLocalRows.length < localRows.length && (_jsxs("span", { style: {
                                                                            marginLeft: 6,
                                                                            fontSize: 11,
                                                                            color: "var(--color-text-muted)",
                                                                            fontWeight: 400,
                                                                        }, children: ["(", localRows.length, " versions)"] }))] }), _jsxs("div", { style: {
                                                                    display: "flex",
                                                                    gap: 6,
                                                                    alignItems: "center",
                                                                }, children: [kindFilter !== "all" && (_jsx("span", { className: "active-filter-badge", children: kindFilter === "mp4"
                                                                            ? "🎬 MP4"
                                                                            : "📀 CDG+MP3" })), _jsx("span", { style: {
                                                                            fontSize: 13,
                                                                            color: "var(--color-text-muted)",
                                                                        }, children: localExpanded ? "▲" : "▼" })] })] }), localExpanded && (_jsx("div", { className: "results-container", children: groupedLocalRows.map((group, idx) => {
                                                            const row = group.versions[0];
                                                            const trackKey = `local-${row.id}`;
                                                            const isRecentlyAdded = recentlyAdded.has(trackKey) ||
                                                                group.versions.some((v) => recentlyAdded.has(`local-${v.id}`));
                                                            const isAdding = group.versions.some((v) => addingLocal === v.id);
                                                            const currentKey = keyAdjustments.get(trackKey) ?? 0;
                                                            const hasMultipleVersions = group.versions.length > 1;
                                                            return (_jsxs("div", { className: "result-card", children: [_jsx("div", { className: "result-number", children: idx + 1 }), _jsxs("div", { className: "result-info", children: [_jsx("div", { className: "result-title", children: group.title || "Unknown Title" }), _jsx("div", { className: "result-artist", children: group.artist || "Unknown Artist" }), _jsx("div", { className: "result-meta", children: hasMultipleVersions ? (_jsxs("span", { className: "meta-tag", children: ["\uD83D\uDCC0 ", group.versions.length, " versions"] })) : (_jsxs(_Fragment, { children: [row.disc_id && (_jsxs("span", { className: "meta-tag", children: ["\uD83D\uDCC0 ", row.disc_id] })), row.kind && (_jsx("span", { className: "meta-tag", children: row.kind.toUpperCase() }))] })) })] }), _jsx("div", { className: "button-container", children: _jsxs("div", { style: {
                                                                                position: "relative",
                                                                                width: "100%",
                                                                            }, children: [_jsx("button", { className: `action-menu-button ${isRecentlyAdded ? "success" : ""}`, onClick: (e) => {
                                                                                        if (!isRecentlyAdded && !isAdding)
                                                                                            handleActionMenuToggle(e, trackKey, actionMenuOpen);
                                                                                    }, disabled: isAdding || isRecentlyAdded, children: isAdding ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "button-spinner" }), _jsx("span", { children: "Adding" })] })) : isRecentlyAdded ? (_jsxs(_Fragment, { children: [_jsx("span", { children: "\u2713" }), _jsx("span", { children: "Added" })] })) : (_jsxs(_Fragment, { children: [_jsx("span", { children: "\u22EF" }), _jsx("span", { children: "Options" })] })) }), actionMenuOpen === trackKey &&
                                                                                    createPortal(_jsxs(_Fragment, { children: [_jsx("div", { className: "action-menu-overlay", onClick: () => setActionMenuOpen(null) }), _jsxs("div", { className: "action-menu", ref: actionMenuRef, onClick: (e) => e.stopPropagation(), style: actionMenuPosition
                                                                                                    ? {
                                                                                                        top: `${actionMenuPosition.top}px`,
                                                                                                        left: `${actionMenuPosition.left}px`,
                                                                                                        width: "max-content",
                                                                                                        minWidth: `${actionMenuPosition.width}px`,
                                                                                                    }
                                                                                                    : undefined, children: [_jsxs("div", { className: "action-menu-header", children: [_jsx("h3", { className: "action-menu-title", children: group.title ||
                                                                                                                    "Unknown Title" }), _jsx("p", { className: "action-menu-subtitle", children: group.artist ||
                                                                                                                    "Unknown Artist" })] }), _jsxs("div", { className: "action-menu-items", children: [_jsxs("button", { className: "action-menu-item primary", onClick: () => {
                                                                                                                    setActionMenuOpen(null);
                                                                                                                    if (hasMultipleVersions) {
                                                                                                                        setVersionPicker({
                                                                                                                            title: group.title ?? "",
                                                                                                                            artist: group.artist ?? "",
                                                                                                                            versions: group.versions,
                                                                                                                        });
                                                                                                                    }
                                                                                                                    else {
                                                                                                                        void enqueueLocal(row.id, row.title || "");
                                                                                                                    }
                                                                                                                }, children: [_jsx("span", { className: "action-menu-item-icon", children: "+" }), _jsxs("div", { className: "action-menu-item-content", children: [_jsx("span", { className: "action-menu-item-label", children: "Add to Queue" }), _jsx("span", { className: "action-menu-item-description", children: hasMultipleVersions
                                                                                                                                    ? `Choose from ${group.versions.length} versions`
                                                                                                                                    : "Request this song" })] })] }), currentKey !== 0 && (_jsx("div", { className: "key-adjustment-header", children: _jsxs("span", { style: {
                                                                                                                        fontSize: 11,
                                                                                                                        color: "var(--color-text-secondary)",
                                                                                                                    }, children: ["Key:", " ", currentKey > 0
                                                                                                                            ? "+"
                                                                                                                            : "", currentKey] }) })), _jsxs("button", { className: "action-menu-item", onClick: (e) => {
                                                                                                                    e.stopPropagation();
                                                                                                                    setActionMenuOpen(null);
                                                                                                                    setLyricsPopupOpen(trackKey);
                                                                                                                    if (!lyricsData[trackKey]) {
                                                                                                                        fetchLyrics(trackKey, group.artist ||
                                                                                                                            "Unknown Artist", group.title || "");
                                                                                                                    }
                                                                                                                }, children: [_jsx("span", { className: "action-menu-item-icon", children: "\uD83D\uDCC4" }), _jsxs("div", { className: "action-menu-item-content", children: [_jsx("span", { className: "action-menu-item-label", children: "View Lyrics" }), _jsx("span", { className: "action-menu-item-description", children: "See song words" })] })] })] })] })] }), document.body)] }) })] }, group.key));
                                                        }) }))] })) : localLibraryEnabled && q.trim() && !isLoading ? (_jsxs("div", { className: "empty-state", children: [_jsx("div", { className: "empty-icon", children: "\uD83C\uDFB5" }), _jsxs("div", { className: "empty-title", children: ["No local results for \"", q, "\""] }), fuzzySuggestions.length > 0 && (_jsxs("div", { style: { marginTop: 12, textAlign: "left" }, children: [_jsx("div", { style: {
                                                                    color: "var(--color-text-secondary)",
                                                                    fontSize: 13,
                                                                    marginBottom: 8,
                                                                }, children: "Did you mean\u2026?" }), Array.from(fuzzySuggestions
                                                                .reduce((map, track) => {
                                                                const key = groupKey(track.title ?? "", track.artist ?? "");
                                                                if (!map.has(key))
                                                                    map.set(key, { track, versions: [] });
                                                                map.get(key).versions.push(track);
                                                                return map;
                                                            }, new Map())
                                                                .values()).map(({ track, versions }) => (_jsxs("div", { style: {
                                                                    display: "flex",
                                                                    alignItems: "center",
                                                                    gap: 10,
                                                                    padding: "8px 12px",
                                                                    background: "var(--color-bg-secondary)",
                                                                    borderRadius: 8,
                                                                    marginBottom: 6,
                                                                }, children: [_jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [_jsx("div", { style: {
                                                                                    fontWeight: 600,
                                                                                    fontSize: 14,
                                                                                    whiteSpace: "nowrap",
                                                                                    overflow: "hidden",
                                                                                    textOverflow: "ellipsis",
                                                                                }, children: track.title }), _jsx("div", { style: {
                                                                                    fontSize: 12,
                                                                                    color: "var(--color-text-secondary)",
                                                                                }, children: track.artist }), versions.length > 1 && (_jsxs("div", { style: {
                                                                                    fontSize: 11,
                                                                                    color: "var(--color-text-muted)",
                                                                                    marginTop: 2,
                                                                                }, children: ["\uD83D\uDCC0 ", versions.length, " versions"] }))] }), _jsx("button", { className: "add-btn", disabled: versions.some((v) => addingLocal === v.id), onClick: () => {
                                                                            if (versions.length > 1) {
                                                                                setVersionPicker({
                                                                                    title: track.title ?? "",
                                                                                    artist: track.artist ?? "",
                                                                                    versions,
                                                                                });
                                                                            }
                                                                            else {
                                                                                void enqueueLocal(track.id, track.title || "");
                                                                            }
                                                                        }, style: { flexShrink: 0 }, children: versions.some((v) => addingLocal === v.id)
                                                                            ? "…"
                                                                            : "+ Add" })] }, track.id)))] }))] })) : null), (sourceFilter === "all" || sourceFilter === "online") &&
                                            externalLibraryEnabled &&
                                            (isKnLoading ? (_jsxs("div", { className: "loading-container", children: [_jsx("div", { className: "loading-spinner" }), _jsx("div", { className: "loading-text", children: "Searching Karaoke Nerds..." })] })) : showKnResults ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "results-header", onClick: () => setKnExpanded((e) => !e), style: { cursor: "pointer", userSelect: "none" }, children: [_jsxs("span", { className: "results-count", children: [_jsx("img", { src: "https://karaokenerds.com/Content/Icons/favicon.ico", alt: "", style: {
                                                                            width: 14,
                                                                            height: 14,
                                                                            verticalAlign: "middle",
                                                                            marginRight: 5,
                                                                        } }), "Online \u2014 ", groupedKnRows.length, " ", groupedKnRows.length === 1 ? "song" : "songs", groupedKnRows.length <
                                                                        karaokeNerdsRows.length && (_jsxs("span", { style: {
                                                                            marginLeft: 6,
                                                                            fontSize: 11,
                                                                            color: "var(--color-text-muted)",
                                                                            fontWeight: 400,
                                                                        }, children: ["(", karaokeNerdsRows.length, " versions)"] }))] }), _jsx("span", { style: {
                                                                    fontSize: 13,
                                                                    color: "var(--color-text-muted)",
                                                                }, children: knExpanded ? "▲" : "▼" })] }), knExpanded && (_jsx("div", { className: "results-container", children: groupedKnRows.map((group, idx) => {
                                                            const firstTrack = group.versions[0];
                                                            const trackKey = `kn-${firstTrack.url}`;
                                                            const isRecentlyAdded = group.versions.some((v) => recentlyAdded.has(`kn-${v.url}`));
                                                            const isAdding = group.versions.some((v) => addingKaraokeNerds === v.url);
                                                            const hasMultipleVersions = group.versions.length > 1;
                                                            return (_jsxs("div", { className: "result-card", children: [_jsx("div", { className: "result-number", children: idx + 1 }), _jsxs("div", { className: "result-info", children: [_jsx("div", { className: "result-title", children: group.title }), _jsx("div", { className: "result-artist", children: group.artist || "Unknown Artist" }), _jsxs("div", { className: "result-meta", children: [hasMultipleVersions ? (_jsxs("span", { className: "meta-tag", children: ["\uD83C\uDFB5 ", group.versions.length, " versions"] })) : firstTrack.brand ? (_jsxs("span", { className: "meta-tag brand", children: ["\uD83C\uDFB5 ", firstTrack.brand] })) : null, _jsx("span", { className: "meta-tag", children: "\uD83C\uDF10 Online" })] })] }), _jsx("div", { className: "button-container", children: _jsxs("div", { style: {
                                                                                position: "relative",
                                                                                width: "100%",
                                                                            }, children: [_jsx("button", { className: `action-menu-button karaoke-nerds ${isRecentlyAdded ? "success" : ""}`, onClick: (e) => {
                                                                                        if (!isRecentlyAdded && !isAdding)
                                                                                            handleActionMenuToggle(e, trackKey, actionMenuOpen);
                                                                                    }, disabled: isAdding || isRecentlyAdded, children: isAdding ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "button-spinner" }), _jsx("span", { children: "Adding" })] })) : isRecentlyAdded ? (_jsxs(_Fragment, { children: [_jsx("span", { children: "\u2713" }), _jsx("span", { children: "Added" })] })) : (_jsxs(_Fragment, { children: [_jsx("span", { children: "\u22EF" }), _jsx("span", { children: "Options" })] })) }), actionMenuOpen === trackKey &&
                                                                                    createPortal(_jsxs(_Fragment, { children: [_jsx("div", { className: "action-menu-overlay", onClick: () => setActionMenuOpen(null) }), _jsxs("div", { className: "action-menu", ref: actionMenuRef, onClick: (e) => e.stopPropagation(), style: actionMenuPosition
                                                                                                    ? {
                                                                                                        top: `${actionMenuPosition.top}px`,
                                                                                                        left: `${actionMenuPosition.left}px`,
                                                                                                        width: "max-content",
                                                                                                        minWidth: `${actionMenuPosition.width}px`,
                                                                                                    }
                                                                                                    : undefined, children: [_jsxs("div", { className: "action-menu-header", children: [_jsx("h3", { className: "action-menu-title", children: group.title }), _jsx("p", { className: "action-menu-subtitle", children: group.artist ||
                                                                                                                    "Unknown Artist" })] }), _jsxs("div", { className: "action-menu-items", children: [_jsxs("button", { className: "action-menu-item primary", onClick: () => {
                                                                                                                    setActionMenuOpen(null);
                                                                                                                    if (hasMultipleVersions) {
                                                                                                                        setKnVersionPicker({
                                                                                                                            title: group.title,
                                                                                                                            artist: group.artist,
                                                                                                                            versions: group.versions,
                                                                                                                        });
                                                                                                                    }
                                                                                                                    else {
                                                                                                                        void enqueueKaraokeNerds(firstTrack);
                                                                                                                    }
                                                                                                                }, children: [_jsx("span", { className: "action-menu-item-icon", children: "+" }), _jsxs("div", { className: "action-menu-item-content", children: [_jsx("span", { className: "action-menu-item-label", children: "Add to Queue" }), _jsx("span", { className: "action-menu-item-description", children: hasMultipleVersions
                                                                                                                                    ? `Choose from ${group.versions.length} versions`
                                                                                                                                    : "Request this song" })] })] }), _jsxs("button", { className: "action-menu-item", onClick: (e) => {
                                                                                                                    e.stopPropagation();
                                                                                                                    setActionMenuOpen(null);
                                                                                                                    setLyricsPopupOpen(trackKey);
                                                                                                                    if (!lyricsData[trackKey]) {
                                                                                                                        fetchLyrics(trackKey, group.artist ||
                                                                                                                            "Unknown Artist", group.title);
                                                                                                                    }
                                                                                                                }, children: [_jsx("span", { className: "action-menu-item-icon", children: "\uD83D\uDCC4" }), _jsxs("div", { className: "action-menu-item-content", children: [_jsx("span", { className: "action-menu-item-label", children: "View Lyrics" }), _jsx("span", { className: "action-menu-item-description", children: "See song words" })] })] })] })] })] }), document.body)] }) })] }, group.key));
                                                        }) }))] })) : q.trim() && !isKnLoading ? (_jsxs("div", { className: "empty-state", style: { marginTop: showLocalResults ? 8 : 0 }, children: [_jsx("div", { className: "empty-icon", children: "\uD83C\uDF10" }), _jsxs("div", { className: "empty-title", children: ["No Karaoke Nerds results for \"", q, "\""] })] })) : null), !q.trim() &&
                                            !showLocalResults &&
                                            !showKnResults &&
                                            !isLoading &&
                                            !isKnLoading && (_jsxs("div", { className: "empty-state", children: [_jsx("div", { className: "empty-icon", children: "\uD83C\uDFA4" }), _jsx("div", { className: "empty-title", children: "Ready to search?" }), _jsx("div", { className: "empty-message", children: localLibraryEnabled && externalLibraryEnabled
                                                        ? "Search local library and Karaoke Nerds at once"
                                                        : localLibraryEnabled
                                                            ? "Search the local karaoke library"
                                                            : "Browse thousands of karaoke tracks online" })] }))] }))] })) }))] }), versionPicker && (_jsxs(_Fragment, { children: [_jsx("div", { style: {
                            position: "fixed",
                            inset: 0,
                            background: "rgba(0,0,0,0.7)",
                            zIndex: 200,
                        }, onClick: () => setVersionPicker(null) }), _jsxs("div", { style: {
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
                        }, children: [_jsxs("div", { style: {
                                    padding: "16px 20px",
                                    borderBottom: "1px solid var(--color-border)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                }, children: [_jsxs("div", { children: [_jsx("div", { style: { fontWeight: 700, fontSize: 16 }, children: versionPicker.title }), _jsxs("div", { style: {
                                                    fontSize: 13,
                                                    color: "var(--color-text-secondary)",
                                                    marginTop: 2,
                                                }, children: [versionPicker.artist, " \u2014 Pick a version"] })] }), _jsx("button", { onClick: () => setVersionPicker(null), style: {
                                            background: "none",
                                            border: "none",
                                            color: "var(--color-text-secondary)",
                                            fontSize: 20,
                                            cursor: "pointer",
                                            padding: 4,
                                        }, children: "\u2715" })] }), _jsx("div", { style: {
                                    overflowY: "auto",
                                    padding: 12,
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 8,
                                }, children: versionPicker.versions.map((v) => (_jsxs("button", { style: {
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
                                    }, disabled: addingLocal === v.id, onClick: () => {
                                        setVersionPicker(null);
                                        void enqueueLocal(v.id, v.title || "Unknown");
                                    }, children: [_jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [_jsx("div", { style: { fontWeight: 600, fontSize: 14 }, children: v.disc_id || "Unknown disc" }), _jsx("div", { style: {
                                                        fontSize: 12,
                                                        color: "var(--color-text-secondary)",
                                                        marginTop: 2,
                                                    }, children: v.kind?.toUpperCase() })] }), addingLocal === v.id ? (_jsx("span", { style: {
                                                color: "var(--color-text-secondary)",
                                                fontSize: 12,
                                            }, children: "Adding\u2026" })) : (_jsx("span", { style: {
                                                fontSize: 13,
                                                fontWeight: 700,
                                                color: "var(--color-accent)",
                                            }, children: "+ Add" }))] }, v.id))) })] })] })), knVersionPicker && (_jsxs(_Fragment, { children: [_jsx("div", { style: {
                            position: "fixed",
                            inset: 0,
                            background: "rgba(0,0,0,0.7)",
                            zIndex: 200,
                        }, onClick: () => setKnVersionPicker(null) }), _jsxs("div", { style: {
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
                        }, children: [_jsxs("div", { style: {
                                    padding: "16px 20px",
                                    borderBottom: "1px solid var(--color-border)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                }, children: [_jsxs("div", { children: [_jsx("div", { style: { fontWeight: 700, fontSize: 16 }, children: knVersionPicker.title }), _jsxs("div", { style: {
                                                    fontSize: 13,
                                                    color: "var(--color-text-secondary)",
                                                    marginTop: 2,
                                                }, children: [knVersionPicker.artist, " \u2014 Pick a version"] })] }), _jsx("button", { onClick: () => setKnVersionPicker(null), style: {
                                            background: "none",
                                            border: "none",
                                            color: "var(--color-text-secondary)",
                                            fontSize: 20,
                                            cursor: "pointer",
                                            padding: 4,
                                        }, children: "\u2715" })] }), _jsx("div", { style: {
                                    overflowY: "auto",
                                    padding: 12,
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 8,
                                }, children: knVersionPicker.versions.map((v) => (_jsxs("button", { style: {
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
                                    }, disabled: addingKaraokeNerds === v.url, onClick: () => {
                                        setKnVersionPicker(null);
                                        void enqueueKaraokeNerds(v);
                                    }, children: [_jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [_jsx("div", { style: { fontWeight: 600, fontSize: 14 }, children: v.brand || "Unknown brand" }), _jsx("div", { style: {
                                                        fontSize: 12,
                                                        color: "var(--color-text-secondary)",
                                                        marginTop: 2,
                                                    }, children: "\uD83C\uDF10 Online" })] }), addingKaraokeNerds === v.url ? (_jsx("span", { style: {
                                                color: "var(--color-text-secondary)",
                                                fontSize: 12,
                                            }, children: "Adding\u2026" })) : (_jsx("span", { style: {
                                                fontSize: 13,
                                                fontWeight: 700,
                                                color: "var(--color-accent)",
                                            }, children: "+ Add" }))] }, v.url))) })] })] })), lyricsPopupOpen &&
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
                    }
                    else if (lyricsPopupOpen.startsWith("kn-")) {
                        const trackUrl = lyricsPopupOpen.replace("kn-", "");
                        const track = karaokeNerdsRows.find((t) => t.url === trackUrl);
                        if (track) {
                            artist = track.artist || "Unknown Artist";
                            title = track.title;
                        }
                    }
                    const data = lyricsData[lyricsPopupOpen];
                    return (_jsx("div", { className: "lyrics-popup-overlay", onClick: () => setLyricsPopupOpen(null), children: _jsxs("div", { className: "lyrics-popup", ref: lyricsPopupRef, onClick: (e) => e.stopPropagation(), children: [_jsxs("div", { className: "lyrics-header", children: [_jsxs("div", { className: "lyrics-title-info", children: [_jsx("h2", { className: "lyrics-popup-title", children: title }), _jsx("p", { className: "lyrics-popup-artist", children: artist })] }), _jsx("button", { className: "lyrics-close-button", onClick: () => setLyricsPopupOpen(null), "aria-label": "Close", children: "\u00D7" })] }), data?.loading ? (_jsxs("div", { className: "lyrics-loading", children: [_jsx("div", { className: "loading-spinner" }), _jsx("div", { className: "loading-text", children: "Loading lyrics..." })] })) : data?.error ? (_jsxs("div", { className: "lyrics-error", children: [_jsx("div", { className: "lyrics-error-icon", children: "\uD83D\uDE14" }), _jsx("div", { children: data.error })] })) : data?.lyrics ? (_jsx("div", { className: "lyrics-content", children: data.lyrics })) : null] }) }));
                })()] }));
}
