import type { OverlaySettings } from "../../components/QueueOverlay";
import SingerAvatar from "../../components/SingerAvatar";
import { formatSingerName, type QItem } from "./helpers";

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
  return (
    <>
      {upNext.length > 0 ? (
        <div
          className="player-waiting"
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
                background: "linear-gradient(135deg, #10b981, #34d399)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
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
              background: "linear-gradient(135deg, #6366f1, #a855f7)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
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
                color: "#ffffff",
                marginBottom: "8px",
              }}
            >
              {formatSingerName(upNext[0].requested_by) || "Anonymous"}
            </div>
            {!hideSingerQueueEnabled && (
              <div
                style={{
                  fontSize: "clamp(14px, 2vw, 20px)",
                  color: "rgba(161, 161, 170, 1)",
                }}
              >
                {upNext[0].title || "Unknown"} •{" "}
                {upNext[0].artist || "Unknown"}
              </div>
            )}
          </div>
        </div>
      ) : isCustomPlayerBackground ? null : (
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
              background: "linear-gradient(135deg, #6366f1, #a855f7)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              letterSpacing: "-0.02em",
            }}
          >
            🎤 Waiting for singers...
          </h1>
          <p
            style={{
              fontSize: "clamp(16px, 2. 5vw, 20px)",
              color: "rgba(161, 161, 170, 1)",
              margin: 0,
            }}
          >
            Add your song from the request page!
          </p>
          {overlaySettings.showRequestsUrl && (
            <p
              className="player-requests-url"
              style={{
                fontSize: "clamp(16px, 2.1vw, 24px)",
                color: "rgba(226, 232, 240, 0.95)",
                margin: "16px 0 0 0",
                fontFamily:
                  '"Inter", "Segoe UI", ui-sans-serif, system-ui, sans-serif',
                fontWeight: 700,
                letterSpacing: "0.04em",
                textTransform: "lowercase",
                wordBreak: "break-word",
                padding: "12px 20px",
                borderRadius: 999,
                background: "rgba(15, 23, 42, 0.72)",
                border: "1px solid rgba(148, 163, 184, 0.28)",
                boxShadow: "0 10px 30px rgba(15, 23, 42, 0.25)",
              }}
            >
              {splashRequestsUrl}
            </p>
          )}
        </div>
      )}
    </>
  );
}
