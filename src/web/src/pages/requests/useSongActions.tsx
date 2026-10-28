import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { api } from "../../api";
import { MAX_KEY_ADJUSTMENT, MIN_KEY_ADJUSTMENT } from "./helpers";
import type { SongResultActions } from "./SongResultCard";
import type { CombinedSearchTrack, KaraokeNerdsTrack, LyricsData, VersionPicker } from "./types";

// What a singer can do with a search result: pick a key, open the options sheet or
// version picker, read lyrics, and add the song to their queue.
export function useSongActions({
  requestedBy,
  requestSingerUuid,
  requesterJsonHeaders,
  requireName,
  showToast,
}: {
  requestedBy: string;
  requestSingerUuid: string | undefined;
  requesterJsonHeaders: Record<string, string>;
  requireName: () => void;
  showToast: (message: string, type?: "success" | "error") => void;
}) {
  const [keyAdjustments, setKeyAdjustments] = useState<Map<string, number>>(
    new Map(),
  );
  const [addingLocal, setAddingLocal] = useState<number | null>(null);
  const [addingKaraokeNerds, setAddingKaraokeNerds] = useState<string | null>(
    null,
  );
  const [recentlyAdded, setRecentlyAdded] = useState<Set<string>>(new Set());
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);
  const [lyricsPopupOpen, setLyricsPopupOpen] = useState<string | null>(null);
  const [lyricsData, setLyricsData] = useState<LyricsData>({});
  // Version picker for consolidated song results
  const [combinedVersionPicker, setCombinedVersionPicker] = useState<VersionPicker<CombinedSearchTrack> | null>(null);
  const actionMenuRef = useRef<HTMLDivElement | null>(null);
  const lyricsPopupRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    // Close popup when clicking outside
    function handleDown(e: MouseEvent) {
      if (actionMenuOpen) {
        const el = actionMenuRef.current;
        if (el && !el.contains(e.target as Node)) {
          setActionMenuOpen(null);
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

  // Open or close a result's options sheet; CSS centres it (a bottom sheet on phones).
  const handleActionMenuToggle = useCallback(
    (e: ReactMouseEvent, trackKey: string) => {
      e.stopPropagation();
      setActionMenuOpen((prev) => (prev === trackKey ? null : trackKey));
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

  // Shared request flow for both libraries: require a name, send the request,
  // flash "Added" on the card and confirm with a toast.
  async function submitRequest(
    trackKey: string,
    songTitle: string | null | undefined,
    endpoint: string,
    track: Record<string, unknown>,
    setAdding: (adding: boolean) => void,
  ) {
    const name = requestedBy.trim();
    if (!name) {
      requireName();
      return;
    }

    const keyAdjustment = keyAdjustments.get(trackKey) ?? 0;

    setAdding(true);
    try {
      await api(endpoint, {
        method: "POST",
        headers: requesterJsonHeaders,
        body: JSON.stringify({
          ...track,
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
        showToast("Failed to add song. Please try again.", "error");
        console.error(err);
      }
    } finally {
      setAdding(false);
    }
  }

  function enqueueLocal(id: number, songTitle: string) {
    return submitRequest(`local-${id}`, songTitle, "/api/queue", { trackId: id }, (adding) =>
      setAddingLocal(adding ? id : null),
    );
  }

  function enqueueKaraokeNerds(track: KaraokeNerdsTrack) {
    return submitRequest(
      `kn-${track.url}`,
      track.title,
      "/api/karaoke-nerds/add",
      { title: track.title, artist: track.artist, url: track.url },
      (adding) => setAddingKaraokeNerds(adding ? track.url : null),
    );
  }

  const songResultActions: SongResultActions = {
    recentlyAdded,
    addingLocal,
    addingKaraokeNerds,
    keyAdjustments,
    adjustKey,
    actionMenuOpen,
    setActionMenuOpen,
    handleActionMenuToggle,
    actionMenuRef,
    setCombinedVersionPicker,
    enqueueLocal,
    enqueueKaraokeNerds,
    setLyricsPopupOpen,
    lyricsData,
    fetchLyrics,
  };
  return {
    keyAdjustments,
    setKeyAdjustments,
    addingLocal,
    setAddingLocal,
    addingKaraokeNerds,
    setAddingKaraokeNerds,
    recentlyAdded,
    setRecentlyAdded,
    actionMenuOpen,
    setActionMenuOpen,
    lyricsPopupOpen,
    setLyricsPopupOpen,
    lyricsData,
    setLyricsData,
    combinedVersionPicker,
    setCombinedVersionPicker,
    actionMenuRef,
    lyricsPopupRef,
    adjustKey,
    handleActionMenuToggle,
    fetchLyrics,
    enqueueLocal,
    enqueueKaraokeNerds,
    songResultActions,
  };
}
