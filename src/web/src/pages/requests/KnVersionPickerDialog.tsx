import type { Dispatch, SetStateAction } from "react";
import type { KaraokeNerdsTrack, LyricsData, VersionPicker } from "./types";

// Pick which Karaoke Nerds (online) version of a song to request.
export default function KnVersionPickerDialog({
  knVersionPicker,
  setKnVersionPicker,
  addingKaraokeNerds,
  setLyricsPopupOpen,
  lyricsData,
  fetchLyrics,
  enqueueKaraokeNerds,
}: {
  knVersionPicker: VersionPicker<KaraokeNerdsTrack> | null;
  setKnVersionPicker: Dispatch<SetStateAction<VersionPicker<KaraokeNerdsTrack> | null>>;
  addingKaraokeNerds: string | null;
  setLyricsPopupOpen: Dispatch<SetStateAction<string | null>>;
  lyricsData: LyricsData;
  fetchLyrics: (trackKey: string, artist: string, title: string) => Promise<void>;
  enqueueKaraokeNerds: (track: KaraokeNerdsTrack) => Promise<void>;
}) {
  return (
    <>
      {/* KN Version Picker Modal */}
      {knVersionPicker && (
        <>
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "var(--color-overlay)",
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
              boxShadow: "0 16px 64px var(--color-shadow)",
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
              <div className="dialog-actions">
                <button
                  className="icon-action-button secondary"
                  type="button"
                  aria-label="View lyrics"
                  title="View lyrics"
                  onClick={() => {
                    const firstVersion = knVersionPicker.versions[0];
                    if (!firstVersion) return;
                    const trackKey = `kn-${firstVersion.url}`;
                    setKnVersionPicker(null);
                    setLyricsPopupOpen(trackKey);
                    if (!lyricsData[trackKey]) {
                      fetchLyrics(
                        trackKey,
                        knVersionPicker.artist || "Unknown Artist",
                        knVersionPicker.title || "Unknown Title",
                      );
                    }
                  }}
                >
                  ♪
                </button>
                <button
                  className="action-menu-close"
                  type="button"
                  onClick={() => setKnVersionPicker(null)}
                >
                  Close
                </button>
              </div>
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
    </>
  );
}
