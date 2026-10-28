import type { CSSProperties } from "react";
import { API_BASE } from "../../api";
import type { OverlaySettings } from "../../components/QueueOverlay";
import { renderTickerText, type RotationScrollerSinger } from "./helpers";

// The bar along the bottom of the Player: request QR code, scrolling ticker and fullscreen button.
export default function PlayerOverlay({
  overlaySettings,
  tickerText,
  breakMusicTrackText,
  rotationScrollerSingers,
  showControls,
  isFullscreen,
  onToggleFullscreen,
}: {
  overlaySettings: OverlaySettings;
  tickerText: string;
  breakMusicTrackText: string;
  rotationScrollerSingers: RotationScrollerSinger[];
  showControls: boolean;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}) {
  if (!overlaySettings.visible) {
    return null;
  }

  // Calculate scale factor based on height (default 90px = 1.0 scale)
  const scaleFactor = overlaySettings.height / 90;
  const tickerHeight = Math.round(40 * scaleFactor);
  const tickerFontSize = Math.round(16 * scaleFactor);
  const padding = Math.round(15 * scaleFactor);
  const gap = Math.round(15 * scaleFactor);
  const borderRadius = Math.round(8 * scaleFactor);

  // QR size is controlled separately
  const qrSizeValue = overlaySettings.qrSize;
  const qrPadding = Math.max(4, Math.round(qrSizeValue / 12));
  const qrBorderRadius = Math.max(8, Math.round(qrSizeValue / 8));
  const qrBlockSize = qrSizeValue + qrPadding * 2;
  const qrOffset = 15;
  const leftInset = overlaySettings.showQrCode
    ? Math.max(padding, qrOffset + qrBlockSize + gap)
    : padding;

  return (
    <div
      className="controls-overlay"
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        background: "transparent",
        zIndex: 10,
        opacity: 1,
      }}
    >
      {/* QR Code */}
      {overlaySettings.showQrCode && (
        <div
          className="player-qr"
          style={{
            "--player-qr-size": `${qrSizeValue}px`,
            position: "absolute",
            left: `${qrOffset}px`,
            bottom: `${qrOffset}px`,
            width: `${qrSizeValue}px`,
            height: `${qrSizeValue}px`,
            background: "white",
            borderRadius: `${qrBorderRadius}px`,
            padding: `${qrPadding}px`,
            boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
          } as CSSProperties}
        >
          <img
            src={`${API_BASE}/api/qr`}
            alt="QR"
            style={{
              width: "100%",
              height: "100%",
              imageRendering: "crisp-edges",
            }}
            onError={(e) => {
              const target = e.currentTarget as HTMLImageElement;
              target.style.display = "none";
            }}
          />
        </div>
      )}

      <div
        className="player-overlay-row"
        style={{
          height: `${overlaySettings.height}px`,
          display: "flex",
          alignItems: "flex-end",
          padding: `${padding}px`,
          paddingLeft: `${leftInset}px`,
          gap: `${gap}px`,
        }}
      >
        {/* Ticker container - takes full remaining width */}
        {overlaySettings.showRoller && (
          <div
            className="player-ticker"
            style={{
              flex: 1,
              height: `${tickerHeight}px`,
              overflow: "hidden",
              position: "relative",
              backgroundColor: "transparent",
              borderRadius: `${borderRadius}px`,
              display: "flex",
              alignItems: "center",
              paddingLeft: `${padding}px`,
              paddingRight: `${padding}px`,
            }}
          >
            <div
              className="ticker-text"
              style={{
                fontSize: `${tickerFontSize}px`,
                fontWeight: 600,
                color: "#fff",
                textShadow: "2px 2px 4px rgba(0,0,0,0.9)",
                letterSpacing: "0.5px",
              }}
            >
              {renderTickerText(tickerText, breakMusicTrackText, rotationScrollerSingers, overlaySettings.showProfilePictures)}
            </div>
          </div>
        )}

        {/* Fullscreen button - only rendered when controls are shown to avoid gap */}
        {showControls && (document.fullscreenEnabled || isFullscreen) && (
          <button
            className="player-fullscreen"
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            onClick={onToggleFullscreen}
            style={{
              flexShrink: 0,
              padding: `${Math.round(10 * scaleFactor)}px ${Math.round(20 * scaleFactor)}px`,
              background: "rgba(255,255,255,0.15)",
              border: "1px solid rgba(255,255,255,0.3)",
              borderRadius: `${borderRadius}px`,
              color: "white",
              cursor: "pointer",
              fontSize: `${Math.round(14 * scaleFactor)}px`,
              fontWeight: 500,
              transition: "all 0.3s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.25)";
              e.currentTarget.style.transform = "scale(1.05)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.15)";
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            <span aria-hidden="true">{isFullscreen ? "⊗" : "⛶"}</span>
            <span className="player-fullscreen-label">
              {isFullscreen ? " Exit Fullscreen" : " Fullscreen"}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
