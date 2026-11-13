import PlayerBackgroundImage from "../../components/PlayerBackgroundImage";
import { getApiAssetUrl, type PlayerBackgroundSettings } from "../../playerBackground";

// The Player's custom background: one image or a slideshow, plus a retry notice when settings fail to load.
export default function PlayerBackground({
  settings,
  error,
  slideIndex,
  onRetry,
}: {
  settings: PlayerBackgroundSettings;
  error: boolean;
  slideIndex: number;
  onRetry: () => void;
}) {
  const errorNotice = error ? <div role="alert" className="player-background-error">
      Player background settings could not load.{' '}
      <button type="button" onClick={onRetry}>Retry settings</button>
    </div> : null;
  if (settings.mode === "image") {
    const imageUrl = getApiAssetUrl(settings.imageUrl);
    return <>{errorNotice}{imageUrl && <PlayerBackgroundImage src={imageUrl} />}</>;
  }
  if (settings.mode !== "slideshow") {
    return errorNotice;
  }

  const images = settings.slideshowImages;
  if (images.length === 0) {
    return errorNotice;
  }

  const transitionDurationMs = Math.round(
    settings.slideshowTransitionDurationSeconds * 1000,
  );
  const transition = `opacity ${transitionDurationMs}ms ease-in-out, transform ${transitionDurationMs}ms ease-in-out`;
  const getTransform = (active: boolean) => {
    if (settings.slideshowTransitionStyle === "slide") {
      return active ? "translateX(0)" : "translateX(4%)";
    }
    if (settings.slideshowTransitionStyle === "zoom") {
      return active ? "scale(1)" : "scale(1.06)";
    }
    return "scale(1)";
  };

  return (
    <>
    {errorNotice}
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        zIndex: 0,
        background: "#000",
      }}
    >
      {images.map((image, index) => {
        const imageUrl = getApiAssetUrl(image.imageUrl);
        if (!imageUrl) return null;
        const active = index === slideIndex % images.length;
        return (
          <div
            key={image.id}
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: "#000",
              opacity: active ? 1 : 0,
              transform: getTransform(active),
              transition,
            }}
          >
            <PlayerBackgroundImage src={imageUrl} active={active} />
          </div>
        );
      })}
    </div>
    </>
  );
}
