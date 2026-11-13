import type { Dispatch, RefObject, SetStateAction } from "react";
import type { KaraokeNerdsTrack, LyricsData, SearchRow } from "./types";

// Lyrics for the song chosen in a result's options menu.
export default function LyricsDialog({
  localRows,
  karaokeNerdsRows,
  lyricsPopupOpen,
  setLyricsPopupOpen,
  lyricsData,
  lyricsPopupRef,
}: {
  localRows: SearchRow[];
  karaokeNerdsRows: KaraokeNerdsTrack[];
  lyricsPopupOpen: string | null;
  setLyricsPopupOpen: Dispatch<SetStateAction<string | null>>;
  lyricsData: LyricsData;
  lyricsPopupRef: RefObject<HTMLDivElement | null>;
}) {
  return (
    <>
      {/* Lyrics Popup Modal */}
      {lyricsPopupOpen &&
        (() => {
          // Find the track data for the popup
          let title = "Unknown Title";

          if (lyricsPopupOpen.startsWith("local-")) {
            const trackId = parseInt(lyricsPopupOpen.replace("local-", ""));
            const track = localRows.find((r) => r.id === trackId);
            if (track) {
              title = track.title || "Unknown Title";
            }
          } else if (lyricsPopupOpen.startsWith("kn-")) {
            const trackUrl = lyricsPopupOpen.replace("kn-", "");
            const track = karaokeNerdsRows.find((t) => t.url === trackUrl);
            if (track) {
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
                  <h2 className="lyrics-popup-title">{title} Lyrics</h2>
                  <button
                    className="action-menu-close"
                    type="button"
                    onClick={() => setLyricsPopupOpen(null)}
                  >
                    Close
                  </button>
                </div>

                {data?.loading ? (
                  <pre className="lyrics-content">Loading...</pre>
                ) : data?.error ? (
                  <pre className="lyrics-content">{data.error}</pre>
                ) : data?.lyrics ? (
                  <pre className="lyrics-content">{data.lyrics}</pre>
                ) : null}
              </div>
            </div>
          );
        })()}
    </>
  );
}
