export function observePlayerViewport(element: HTMLElement, viewportWindow: Window = window) {
  const viewport = viewportWindow.visualViewport;
  const update = () => {
    // Mobile browser chrome can reduce the visible area without changing 100vh.
    // Do not reflow the player while the user is pinch-zooming.
    const height = viewport && viewport.scale === 1
      ? viewport.height
      : viewportWindow.innerHeight;
    element.style.setProperty("--player-viewport-height", `${height}px`);
  };
  update();
  viewportWindow.addEventListener("resize", update);
  viewport?.addEventListener("resize", update);
  return () => {
    viewportWindow.removeEventListener("resize", update);
    viewport?.removeEventListener("resize", update);
    element.style.removeProperty("--player-viewport-height");
  };
}
