import type { OverlaySettings } from "../../components/QueueOverlay";
import SingerAvatar from "../../components/SingerAvatar";
import { formatSingerName, PLAYER_TEXT_SHADOW, type QItem } from "./helpers";

// What the Player shows between songs: the next singer (with the autoplay countdown), or a
// "Waiting for singers" splash with the request URL. A custom background replaces the splash.
export default function WaitingScreen({
  upNext,
  overlaySettings,
  hideSingerQueueEnabled,
  isCustomPlayerBackground,
  showCountdown,
  countdown,
  splashRequestsUrl,
}: {
  upNext: QItem[];
  overlaySettings: OverlaySettings;
  hideSingerQueueEnabled: boolean;
  isCustomPlayerBackground: boolean;
  showCountdown: boolean;
  countdown: number | null;
  splashRequestsUrl: string;
}) {
  // The request URL shows in every waiting state, so singers can find it with or without a queue or background.
  const requestsUrl = overlaySettings.showRequestsUrl ? (
    <p
      className="player-requests-url"
      style={{
        fontSize: "clamp(16px, 2.1vw, 24px)",
        color: "var(--color-text-primary)",
        margin: "16px 0 0 0",
        fontFamily:
          '"Inter", "Segoe UI", ui-sans-serif, system-ui, sans-serif',
        fontWeight: 700,
        letterSpacing: "0.04em",
        textTransform: "lowercase",
        wordBreak: "break-word",
        padding: "12px 20px",
        borderRadius: 999,
        background: "var(--color-bg-elevated)",
        border: "1px solid var(--color-border-strong)",
        boxShadow: "0 10px 30px rgba(0, 0, 0, 0.35)",
      }}
    >
      {splashRequestsUrl}
    </p>
  ) : null;

  return (
    <>
      {upNext.length > 0 ? (
        <div
          className={`player-waiting${isCustomPlayerBackground ? " player-waiting-panel" : ""}`}
          style={{
            position: "relative",
            zIndex: 1,
            textAlign: "center",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "24px",
            animation: "fadeInUp 0.6s ease",
          }}
        >
          {/* Countdown timer when autoplay is enabled and not manually stopped */}
          {showCountdown && (
            <div
              className="player-countdown"
              style={{
                fontSize: "clamp(24px, 4vw, 40px)",
                color: "var(--color-success)",
                textShadow: PLAYER_TEXT_SHADOW,
                fontWeight: 700,
                animation: "pulse 2s ease infinite",
              }}
            >
              ⏱️ Starting in {countdown}s...
            </div>
          )}

          {/* Up next heading */}
          <h2
            style={{
              fontSize: "clamp(32px, 5vw, 56px)",
              margin: 0,
              fontWeight: 700,
              background: "linear-gradient(135deg, var(--color-accent), var(--color-accent-2))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              filter: "drop-shadow(0 2px 8px rgba(0, 0, 0, 0.85))",
              letterSpacing: "-0.02em",
            }}
          >
            🎤 Up Next
          </h2>

          {/* Show only the first singer */}
          <div style={{ textAlign: "center" }}>
            {overlaySettings.showProfilePictures && upNext[0].profile?.imageUrl && (
              <div className="player-up-next-avatar">
                <SingerAvatar name={upNext[0].requested_by || "Anonymous"} profile={upNext[0].profile} size="100%" />
              </div>
            )}
            <div
              className="player-waiting-name"
              style={{
                fontSize: "clamp(24px, 4vw, 48px)",
                fontWeight: 700,
                color: "var(--color-text-primary)",
                textShadow: PLAYER_TEXT_SHADOW,
                marginBottom: "8px",
              }}
            >
              {formatSingerName(upNext[0].requested_by) || "Anonymous"}
            </div>
            {!hideSingerQueueEnabled && (
              <div
                style={{
                  fontSize: "clamp(14px, 2vw, 20px)",
                  color: "var(--color-text-secondary)",
                  textShadow: PLAYER_TEXT_SHADOW,
                }}
              >
                {upNext[0].title || "Unknown"} •{" "}
                {upNext[0].artist || "Unknown"}
              </div>
            )}
          </div>
          {requestsUrl}
        </div>
      ) : isCustomPlayerBackground ? (
        requestsUrl && (
          <div className="player-waiting" style={{ position: "relative", zIndex: 1, textAlign: "center" }}>
            {requestsUrl}
          </div>
        )
      ) : (
        <div
          className="player-waiting"
          style={{
            position: "relative",
            zIndex: 1,
            textAlign: "center",
            animation: "fadeInUp 0.6s ease",
          }}
        >
          <h1
            style={{
              fontSize: "clamp(32px, 6vw, 64px)",
              fontWeight: 700,
              margin: "0 0 16px 0",
              background: "linear-gradient(135deg, var(--color-accent), var(--color-accent-2))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              filter: "drop-shadow(0 2px 8px rgba(0, 0, 0, 0.85))",
              letterSpacing: "-0.02em",
            }}
          >
            🎤 Waiting for singers...
          </h1>
          <p
            style={{
              fontSize: "clamp(16px, 2.5vw, 20px)",
              color: "var(--color-text-secondary)",
              textShadow: PLAYER_TEXT_SHADOW,
              margin: 0,
            }}
          >
            Add your song from the request page!
          </p>
          {requestsUrl}
        </div>
      )}
    </>
  );
}
