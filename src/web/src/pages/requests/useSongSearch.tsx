import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../api";
import { groupKey, searchRelevance, toLocalSearchTrack } from "./helpers";
import type {
  BrowseArtistRow,
  BrowseCategory,
  CombinedSearchGroup,
  CombinedSearchTrack,
  KaraokeNerdsTrack,
  SearchRow,
} from "./types";

// Song search and A–Z browse on the Request page: the query and filters, the debounced
// local + Karaoke Nerds searches, the browse loaders, and the grouped result lists.
export function useSongSearch({
  localLibraryEnabled,
  externalLibraryEnabled,
  localBrowseEnabled,
}: {
  localLibraryEnabled: boolean;
  externalLibraryEnabled: boolean;
  localBrowseEnabled: boolean;
}) {
  const [q, setQ] = useState("");
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
  const [kindFilter, setKindFilter] = useState<"all" | "mp4" | "cdgmp3">("all");
  const [searchFieldFilter, setSearchFieldFilter] = useState<
    "all" | "artist" | "title"
  >("all");
  const [showFilters, setShowFilters] = useState(false);
  // Fuzzy suggestions (shown when main search returns no results)
  const [fuzzySuggestions, setFuzzySuggestions] = useState<SearchRow[]>([]);
  // Collapsible result sections (collapsed by default)
  // Source filter: 'all' | 'local' | 'online'
  const [sourceFilter, setSourceFilter] = useState<"all" | "local" | "online">(
    "all",
  );
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const browseArtistScrollYRef = useRef(0);
  useEffect(() => {
    if (!localBrowseEnabled && localViewMode === "browse") {
      setLocalViewMode("search");
    }
  }, [localBrowseEnabled, localViewMode]);

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
  const visibleKaraokeNerdsRows = useMemo(() => {
    if (!isLocalBrowseMode || !q.trim()) return karaokeNerdsRows;
    const query = q.trim().toLowerCase();
    return karaokeNerdsRows.filter((track) => {
      const value = browseCategory === "artist" ? track.artist : track.title;
      return (value ?? "").toLowerCase().includes(query);
    });
  }, [browseCategory, isLocalBrowseMode, karaokeNerdsRows, q]);

  const combinedSearchGroups = useMemo((): CombinedSearchGroup[] => {
    const tracks: CombinedSearchTrack[] = [];
    if (
      localLibraryEnabled &&
      (isLocalBrowseMode || sourceFilter !== "online")
    ) {
      for (const row of localRows) {
        tracks.push(toLocalSearchTrack(row));
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

  // Browse lists local songs only; give them the same shape as search results so both use SongResultCard.
  const browseCombinedGroups = useMemo(
    (): CombinedSearchGroup[] =>
      groupedLocalRows.map((group) => ({
        key: group.key,
        title: group.title,
        artist: group.artist,
        versions: group.versions.map(toLocalSearchTrack),
      })),
    [groupedLocalRows],
  );

  useEffect(() => () => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
  }, []);

  return {
    q,
    setQ,
    localViewMode,
    setLocalViewMode,
    localRows,
    setLocalRows,
    karaokeNerdsRows,
    setKaraokeNerdsRows,
    busy,
    setBusy,
    knBusy,
    setKnBusy,
    browseBusy,
    setBrowseBusy,
    browseLetters,
    setBrowseLetters,
    selectedBrowseLetter,
    setSelectedBrowseLetter,
    browseArtists,
    setBrowseArtists,
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
    loadBrowseLetters,
    loadBrowseArtists,
    loadBrowseTitles,
    loadBrowseArtistTracks,
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
    visibleKaraokeNerdsRows,
    combinedSearchGroups,
    browseCombinedGroups,
    browseCategory,
    setBrowseCategory,
  };
}
