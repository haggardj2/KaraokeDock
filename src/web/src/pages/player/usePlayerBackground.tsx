import { useCallback, useEffect, useState } from "react";
import { api } from "../../api";
import {
  DEFAULT_PLAYER_BACKGROUND_SETTINGS,
  normalizePlayerBackgroundSettings,
  type PlayerBackgroundSettings,
} from "../../playerBackground";

// Player background settings: loading (and reloading when the screen comes back online or
// into view), live updates from the WebSocket, and the slideshow timer.
export function usePlayerBackground() {
  const [playerBackgroundSettings, setPlayerBackgroundSettings] =
    useState<PlayerBackgroundSettings>(DEFAULT_PLAYER_BACKGROUND_SETTINGS);
  const [backgroundSettingsError, setBackgroundSettingsError] = useState(false);
  const [playerBackgroundSlideIndex, setPlayerBackgroundSlideIndex] =
    useState(0);
  const isCustomPlayerBackground =
    (playerBackgroundSettings.mode === "image" &&
      !!playerBackgroundSettings.imageUrl) ||
    (playerBackgroundSettings.mode === "slideshow" &&
      playerBackgroundSettings.slideshowImages.length > 0);

  useEffect(() => {
    setPlayerBackgroundSlideIndex(0);
  }, [
    playerBackgroundSettings.mode,
    playerBackgroundSettings.slideshowImages,
  ]);

  useEffect(() => {
    if (
      playerBackgroundSettings.mode !== "slideshow" ||
      playerBackgroundSettings.slideshowImages.length <= 1
    ) {
      return;
    }

    const timer = window.setInterval(() => {
      setPlayerBackgroundSlideIndex((current) =>
        (current + 1) % playerBackgroundSettings.slideshowImages.length,
      );
    }, playerBackgroundSettings.slideshowIntervalSeconds * 1000);

    return () => window.clearInterval(timer);
  }, [
    playerBackgroundSettings.mode,
    playerBackgroundSettings.slideshowImages.length,
    playerBackgroundSettings.slideshowIntervalSeconds,
  ]);

  const refreshPlayerBackground = useCallback(() =>
    api("/api/player/background/settings", { cache: "no-store" })
      .then((settings: PlayerBackgroundSettings) => {
        setPlayerBackgroundSettings(normalizePlayerBackgroundSettings(settings));
        setBackgroundSettingsError(false);
      })
      .catch((error: unknown) => {
        console.error("Player background settings failed to load:", error);
        setBackgroundSettingsError(true);
      }), []);

  useEffect(() => {
    void refreshPlayerBackground();
    const onVisible = () => {
      if (document.visibilityState === "visible") void refreshPlayerBackground();
    };
    window.addEventListener("online", refreshPlayerBackground);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("online", refreshPlayerBackground);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refreshPlayerBackground]);

  // Apply settings pushed over the WebSocket.
  const applyBackgroundSettings = useCallback((value: unknown) => {
    setBackgroundSettingsError(false);
    setPlayerBackgroundSettings(normalizePlayerBackgroundSettings(value));
  }, []);

  return {
    playerBackgroundSettings,
    backgroundSettingsError,
    playerBackgroundSlideIndex,
    isCustomPlayerBackground,
    refreshPlayerBackground,
    applyBackgroundSettings,
  };
}
