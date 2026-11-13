import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../api";
import { normalizeMyQueueItems, reorderQueuedItems } from "./helpers";
import type { MyQueueItem } from "./types";

// The singer's own queue on the Request page: loading it, drag-to-reorder,
// press-and-hold to remove sung songs, and "Sing again".
export function useMyQueue({
  requestedBy,
  requesterSessionChanged,
  requestSingerUuid,
  requesterHeaders,
  requesterJsonHeaders,
  buildRequesterParams,
  showToast,
}: {
  requestedBy: string;
  requesterSessionChanged: boolean;
  requestSingerUuid: string | undefined;
  requesterHeaders: Record<string, string>;
  requesterJsonHeaders: Record<string, string>;
  buildRequesterParams: () => URLSearchParams;
  showToast: (message: string, type?: "success" | "error") => void;
}) {
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
  const queueLoadRef = useRef(0);
  const completedLongClickRef = useRef<{
    id: number;
    startX: number;
    startY: number;
    timeout: ReturnType<typeof setTimeout>;
  } | null>(null);
  const pendingQueueOrderRef = useRef<number[] | null>(null);
  const queueDragChangedRef = useRef(false);

  const loadMyQueue = useCallback(async () => {
    if (requesterSessionChanged) return;
    const request = ++queueLoadRef.current;
    const name = requestedBy.trim();
    if (!name) {
      setMyQueue([]);
      return;
    }
    setMyQueueLoading(true);
    try {
      const items = await api(
        `/api/queue/by-requester?${buildRequesterParams().toString()}`,
        { headers: requesterHeaders },
      );
      if (request === queueLoadRef.current) setMyQueue(normalizeMyQueueItems(items));
    } catch (error) {
      if (request === queueLoadRef.current) {
        console.error("Could not load singer queue:", error);
        setMyQueue([]);
      }
    } finally {
      if (request === queueLoadRef.current) setMyQueueLoading(false);
    }
  }, [buildRequesterParams, requestedBy, requesterHeaders, requesterSessionChanged]);

  useEffect(() => {
    void loadMyQueue();
    return () => { queueLoadRef.current++; };
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
        `/api/queue/${queueId}/self-remove?${buildRequesterParams().toString()}`,
        { method: "DELETE", headers: requesterHeaders },
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
        headers: requesterJsonHeaders,
        body: JSON.stringify({ name, singerUuid: requestSingerUuid }),
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

  async function reorderMyQueue(orderedIds: number[]) {
    const name = requestedBy.trim();
    if (!name) return;
    try {
      await api("/api/queue/self-reorder", {
        method: "PATCH",
        headers: requesterJsonHeaders,
        body: JSON.stringify({ name, singerUuid: requestSingerUuid, queueIds: orderedIds }),
      });
      await loadMyQueue();
      showToast("Queue order updated");
    } catch (err) {
      showToast("Could not reorder queue. Please try again.", "error");
      console.error(err);
    }
  }

  return {
    myQueue,
    setMyQueue,
    myQueueLoading,
    setMyQueueLoading,
    myQueueOpen,
    setMyQueueOpen,
    removingQueueId,
    setRemovingQueueId,
    requeueingQueueId,
    setRequeueingQueueId,
    revealedRemoveQueueId,
    setRevealedRemoveQueueId,
    dragOverQueueId,
    setDragOverQueueId,
    draggingQueueId,
    setDraggingQueueId,
    myQueueRef,
    draggingQueueIdRef,
    queueLoadRef,
    completedLongClickRef,
    pendingQueueOrderRef,
    queueDragChangedRef,
    loadMyQueue,
    applyMyQueueReorder,
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
    reorderMyQueue,
  };
}

export type MyQueue = ReturnType<typeof useMyQueue>;
