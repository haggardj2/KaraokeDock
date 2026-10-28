import type { Dispatch, SetStateAction } from "react";
import { formatTrackKind } from "./helpers";
import type { LyricsData, SearchRow, VersionPicker } from "./types";

// Pick which local version (disc / format) of a song to request.
export default function VersionPickerDialog({
  versionPicker,
  setVersionPicker,
  addingLocal,
  setLyricsPopupOpen,
  lyricsData,
  fetchLyrics,
  enqueueLocal,
}: {
  versionPicker: VersionPicker<SearchRow> | null;
  setVersionPicker: Dispatch<SetStateAction<VersionPicker<SearchRow> | null>>;
  addingLocal: number | null;
  setLyricsPopupOpen: Dispatch<SetStateAction<string | null>>;
  lyricsData: LyricsData;
  fetchLyrics: (trackKey: string, artist: string, title: string) => Promise<void>;
  enqueueLocal: (id: number, songTitle: string) => Promise<void>;
}) {
  return (
    <>
      {/* Version Picker Modal */}
      {versionPicker && (
        <>
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "var(--color-overlay)",
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
              <div className="dialog-actions">
                <button
                  className="icon-action-button secondary"
                  type="button"
                  aria-label="View lyrics"
                  title="View lyrics"
                  onClick={() => {
                    const firstVersion = versionPicker.versions[0];
                    if (!firstVersion) return;
                    const trackKey = `local-${firstVersion.id}`;
                    setVersionPicker(null);
                    setLyricsPopupOpen(trackKey);
                    if (!lyricsData[trackKey]) {
                      fetchLyrics(
                        trackKey,
                        versionPicker.artist || "Unknown Artist",
                        versionPicker.title || "Unknown Title",
                      );
                    }
                  }}
                >
                  ♪
                </button>
                <button
                  className="action-menu-close"
                  type="button"
                  onClick={() => setVersionPicker(null)}
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
                      {formatTrackKind(v.kind)}
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
    </>
  );
}
