// One AudioContext for the whole Player page. It is never closed between songs, so once
// the browser lets it run (autoplay allowed, or any earlier tap/key press on the page)
// every later KaraFun song starts on its own.

let shared: AudioContext | null = null;
let unlockInstalled = false;

const UNLOCK_EVENTS = ["pointerdown", "keydown", "touchstart", "click"] as const;

export function getKaraokeAudioContext(): AudioContext {
  if (shared && shared.state !== "closed") return shared;
  const AudioContextClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioContextClass) {
    throw new Error("This browser does not support Web Audio");
  }
  shared = new AudioContextClass({ latencyHint: "playback" });
  return shared;
}

export function isKaraokeAudioRunning(): boolean {
  return shared?.state === "running";
}

/**
 * Asks the context to run without waiting on the answer: while the browser blocks
 * audio, `resume()` stays pending until the page gets a user gesture.
 */
export function requestKaraokeAudio(): void {
  const context = shared;
  if (!context || context.state === "running" || context.state === "closed") return;
  void context.resume().catch(() => undefined);
}

/**
 * Resumes the shared context on any interaction with the page, before or during a
 * KaraFun song, so a blocked context starts the moment someone touches the Player.
 */
export function installKaraokeAudioUnlock(): () => void {
  if (unlockInstalled) return () => undefined;
  unlockInstalled = true;
  const unlock = () => {
    try {
      getKaraokeAudioContext();
    } catch {
      return;
    }
    requestKaraokeAudio();
  };
  for (const name of UNLOCK_EVENTS) {
    window.addEventListener(name, unlock, { capture: true, passive: true });
  }
  return () => {
    unlockInstalled = false;
    for (const name of UNLOCK_EVENTS) {
      window.removeEventListener(name, unlock, { capture: true });
    }
  };
}
