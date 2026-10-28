import type { Dispatch, MouseEvent, RefObject, SetStateAction } from "react";
import { createPortal } from "react-dom";
import { MAX_KEY_ADJUSTMENT, MIN_KEY_ADJUSTMENT, formatCount, formatTrackKind } from "./helpers";
import type { CombinedSearchGroup, CombinedSearchTrack, KaraokeNerdsTrack, LyricsData, VersionPicker } from "./types";

// Everything a result card needs from the Request page, built once and shared by every card.
export type SongResultActions = {
  recentlyAdded: Set<string>;
  addingLocal: number | null;
  addingKaraokeNerds: string | null;
  keyAdjustments: Map<string, number>;
  adjustKey: (trackKey: string, delta: number) => void;
  actionMenuOpen: string | null;
  setActionMenuOpen: Dispatch<SetStateAction<string | null>>;
  handleActionMenuToggle: (event: MouseEvent<HTMLButtonElement>, trackKey: string) => void;
  actionMenuRef: RefObject<HTMLDivElement | null>;
  setCombinedVersionPicker: Dispatch<SetStateAction<VersionPicker<CombinedSearchTrack> | null>>;
  enqueueLocal: (id: number, songTitle: string) => Promise<void>;
  enqueueKaraokeNerds: (track: KaraokeNerdsTrack) => Promise<void>;
  setLyricsPopupOpen: Dispatch<SetStateAction<string | null>>;
  lyricsData: LyricsData;
  fetchLyrics: (trackKey: string, artist: string, title: string) => Promise<void>;
};

// One song in the Search or Browse results: its versions, the request button and the options sheet.
export default function SongResultCard({ group, idx, actions }: {
  group: CombinedSearchGroup;
  idx: number;
  actions: SongResultActions;
}) {
  const {
    actionMenuOpen,
    actionMenuRef,
    addingKaraokeNerds,
    addingLocal,
    adjustKey,
    enqueueKaraokeNerds,
    enqueueLocal,
    fetchLyrics,
    handleActionMenuToggle,
    keyAdjustments,
    lyricsData,
    recentlyAdded,
    setActionMenuOpen,
    setCombinedVersionPicker,
    setLyricsPopupOpen,
  } = actions;
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
    firstTrack.type === "local" ? formatTrackKind(firstTrack.kind) : null,
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
              {firstTrack.type === "local" &&
                firstTrack.kind && (
                  <span className="meta-tag">
                    {formatTrackKind(firstTrack.kind)}
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
              handleActionMenuToggle(e, trackKey);
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
}
