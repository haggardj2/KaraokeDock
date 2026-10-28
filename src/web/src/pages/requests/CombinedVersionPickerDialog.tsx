import type { Dispatch, SetStateAction } from "react";
import { formatTrackKind } from "./helpers";
import type { CombinedSearchTrack, KaraokeNerdsTrack, LyricsData, VersionPicker } from "./types";

// Pick which version to request when a song has both local and online matches.
export default function CombinedVersionPickerDialog({
  combinedVersionPicker,
  setCombinedVersionPicker,
  setLyricsPopupOpen,
  lyricsData,
  fetchLyrics,
  enqueueLocal,
  enqueueKaraokeNerds,
}: {
  combinedVersionPicker: VersionPicker<CombinedSearchTrack> | null;
  setCombinedVersionPicker: Dispatch<SetStateAction<VersionPicker<CombinedSearchTrack> | null>>;
  setLyricsPopupOpen: Dispatch<SetStateAction<string | null>>;
  lyricsData: LyricsData;
  fetchLyrics: (trackKey: string, artist: string, title: string) => Promise<void>;
  enqueueLocal: (id: number, songTitle: string) => Promise<void>;
  enqueueKaraokeNerds: (track: KaraokeNerdsTrack) => Promise<void>;
}) {
  return (
    <>
      {/* Combined Version Picker Modal */}
      {combinedVersionPicker && (
        <>
          <div
            className="action-menu-overlay"
            onClick={() => setCombinedVersionPicker(null)}
          />
          <div className="action-menu version-dialog">
            <div className="action-menu-header">
              <h3 className="action-menu-title">
                {combinedVersionPicker.title || "Choose a version"}
              </h3>
              <div className="dialog-actions">
                <button
                  className="icon-action-button secondary"
                  type="button"
                  aria-label="View lyrics"
                  title="View lyrics"
                  onClick={() => {
                    const firstVersion = combinedVersionPicker.versions[0];
                    if (!firstVersion) return;
                    setCombinedVersionPicker(null);
                    setLyricsPopupOpen(firstVersion.key);
                    if (!lyricsData[firstVersion.key]) {
                      fetchLyrics(
                        firstVersion.key,
                        combinedVersionPicker.artist || "Unknown Artist",
                        combinedVersionPicker.title || "Unknown Title",
                      );
                    }
                  }}
                >
                  ♪
                </button>
                <button
                  className="action-menu-close"
                  type="button"
                  onClick={() => setCombinedVersionPicker(null)}
                >
                  Close
                </button>
              </div>
            </div>
            <div className="version-list">
              {combinedVersionPicker.versions.map((version) => {
                const isLocal = version.type === "local";
                const label = isLocal
                  ? version.discId || "Version"
                  : version.brand || "Karaoke Version";
                const meta = [
                  !isLocal ? "🌐 Online" : null,
                  isLocal ? formatTrackKind(version.kind) : null,
                ]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <article key={version.key} className="version-row">
                    <div>
                      <strong>{label}</strong>
                      {meta && <span>{meta}</span>}
                    </div>
                    <button
                      className="icon-action-button"
                      type="button"
                      aria-label="Add version"
                      title="Add version"
                      onClick={() => {
                        setCombinedVersionPicker(null);
                        if (version.type === "local") {
                          void enqueueLocal(
                            version.track.id,
                            version.title || "Unknown",
                          );
                        } else {
                          void enqueueKaraokeNerds(version.track);
                        }
                      }}
                    >
                      +
                    </button>
                  </article>
                );
              })}
            </div>
          </div>
        </>
      )}
    </>
  );
}
