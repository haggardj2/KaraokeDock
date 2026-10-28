import { createPortal } from "react-dom";
import type { MyQueue } from "./useMyQueue";

// "My Queue": the bar pinned to the bottom of the Request page and the sheet it opens.
export default function MyQueueSheet({ myQueue: queue, nameConfirmed }: {
  myQueue: MyQueue;
  nameConfirmed: boolean;
}) {
  const {
    myQueue,
    myQueueLoading,
    myQueueOpen,
    setMyQueueOpen,
    removingQueueId,
    requeueingQueueId,
    revealedRemoveQueueId,
    setRevealedRemoveQueueId,
    dragOverQueueId,
    draggingQueueId,
    loadMyQueue,
    beginMyQueueDrag,
    moveMyQueueDrag,
    endMyQueueDrag,
    cancelMyQueueDrag,
    beginCompletedQueueLongClick,
    moveCompletedQueueLongClick,
    endCompletedQueueLongClick,
    cancelCompletedQueueLongClick,
    removeFromMyQueue,
    requeueFromMyQueue,
  } = queue;

  return (
    <>
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
                    className="my-queue-sheet request-page-gateway-theme-portal"
                    role="dialog"
                    aria-label="My queue"
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
                      boxShadow: "0 -12px 42px var(--color-shadow)",
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
                      <span className="my-queue-heading">
                        <span className="material-symbols-rounded" aria-hidden="true">queue_music</span>
                        My Queue
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
                          aria-label="Refresh my queue"
                          title="Refresh"
                          className="my-queue-icon-button"
                        >
                          <span className="material-symbols-rounded" aria-hidden="true">refresh</span>
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
                          aria-label="Close my queue"
                          title="Close"
                          className="my-queue-icon-button"
                        >
                          <span className="material-symbols-rounded" aria-hidden="true">close</span>
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
                              <div className="my-queue-hint">
                                Drag a song to reorder
                              </div>
                            )}
                          {myQueue.some(
                            (i) =>
                              i.status === "done" || i.status === "finished",
                          ) && (
                            <div className="my-queue-hint">
                              Press and hold a sung song to remove it
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
                                gap: 10,
                                padding: "12px",
                                minHeight: 56,
                                background:
                                  dragOverQueueId === item.id
                                    ? "var(--color-accent-soft)"
                                    : "var(--color-bg-secondary)",
                                borderRadius: 8,
                                opacity:
                                  draggingQueueId === item.id ? 0.75 : 1,
                                cursor: isQueued ? "grab" : "default",
                                border:
                                  dragOverQueueId === item.id
                                    ? "1px dashed color-mix(in srgb, var(--color-accent) 50%, transparent)"
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
                                    display: "inline-flex",
                                    color: "var(--color-text-muted)",
                                    flexShrink: 0,
                                    cursor: "grab",
                                    padding: "4px 0",
                                  }}
                                >
                                  <span className="material-symbols-rounded" aria-hidden="true">drag_indicator</span>
                                </span>
                              )}
                              <div className="my-queue-text">
                                <div className={`my-queue-title${isCompleted ? " is-done" : ""}`}>
                                  {item.title || "Unknown"}
                                </div>
                                <div className="my-queue-artist">
                                  {item.artist || "Unknown"}
                                </div>
                                <span
                                  className={`my-queue-status ${
                                    item.status === "playing"
                                      ? "is-singing"
                                      : isQueued
                                        ? "is-queued"
                                        : "is-done"
                                  }`}
                                >
                                  {item.status === "playing"
                                    ? "Singing now"
                                    : isQueued
                                      ? "Queued"
                                      : item.status === "skipped"
                                        ? "Skipped"
                                        : "Sung"}
                                </span>
                              </div>
                              <div className="my-queue-actions">
                                {isQueued && (
                                  <button
                                    type="button"
                                    className="my-queue-action danger"
                                    disabled={removingQueueId === item.id}
                                    onClick={() =>
                                      void removeFromMyQueue(item.id)
                                    }
                                    aria-label={`Remove ${item.title || "song"} from my queue`}
                                  >
                                    <span className="material-symbols-rounded" aria-hidden="true">delete</span>
                                    <span>{removingQueueId === item.id ? "Removing…" : "Remove"}</span>
                                  </button>
                                )}
                                {isCompleted && !isRemoveRevealed && (
                                  <button
                                    type="button"
                                    className="my-queue-action primary"
                                    disabled={requeueingQueueId === item.id}
                                    onClick={() =>
                                      void requeueFromMyQueue(
                                        item.id,
                                        item.title,
                                      )
                                    }
                                    aria-label={`Sing ${item.title || "this song"} again`}
                                  >
                                    <span className="material-symbols-rounded" aria-hidden="true">replay</span>
                                    <span>{requeueingQueueId === item.id ? "Adding…" : "Sing again"}</span>
                                  </button>
                                )}
                                {isCompleted && isRemoveRevealed && (
                                  <>
                                    <button
                                      type="button"
                                      className="my-queue-action"
                                      onClick={() =>
                                        setRevealedRemoveQueueId(null)
                                      }
                                    >
                                      <span>Cancel</span>
                                    </button>
                                    <button
                                      type="button"
                                      className="my-queue-action danger"
                                      disabled={removingQueueId === item.id}
                                      onClick={() =>
                                        void removeFromMyQueue(item.id)
                                      }
                                      aria-label={`Remove ${item.title || "song"} from my history`}
                                    >
                                      <span className="material-symbols-rounded" aria-hidden="true">delete</span>
                                      <span>{removingQueueId === item.id ? "Removing…" : "Remove"}</span>
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
                  <button
                    type="button"
                    className="queue-footer request-page-gateway-theme-portal"
                    aria-expanded={myQueueOpen}
                    aria-label={`My queue, ${activeCount} active ${activeCount === 1 ? "song" : "songs"}`}
                    onClick={() => {
                      setMyQueueOpen((o) => !o);
                      if (!myQueueOpen) void loadMyQueue();
                    }}
                  >
                    <span className="queue-footer-icon" aria-hidden="true">
                      <span className="material-symbols-rounded">queue_music</span>
                      {activeCount > 0 && <span className="queue-footer-badge">{activeCount}</span>}
                    </span>
                    <span className="queue-footer-text">
                      {nextSong ? (
                        <>
                          <span className="queue-footer-label">
                            {nextSong.status === "playing" ? "Now singing" : "Up next"}
                          </span>
                          <span className="queue-footer-title">{nextSong.title || "Unknown"}</span>
                        </>
                      ) : (
                        <span className="queue-footer-empty">Your queue is empty</span>
                      )}
                    </span>
                    <span className="queue-footer-action">
                      My Queue
                      <span className="material-symbols-rounded" aria-hidden="true">expand_less</span>
                    </span>
                  </button>
                );
              })()}
            </>,
            document.body,
          )}
    </>
  );
}
