// Rocky Talkie's on-radio screen is a plain HTML element stacked on top of
// the SVG (not an SVG <foreignObject> nested inside it) with the skew
// applied as a CSS transform — see the comment above #rockyScreenHost in
// index.html for why. Because it lives outside the SVG's own coordinate
// system, it doesn't automatically scale as the responsive SVG resizes;
// this keeps a --rocky-scale CSS custom property on it in sync via
// ResizeObserver so the overlay tracks the SVG's actual rendered size.
export function initRockySkewOverlay({ svgEl, overlayHostEl, viewBoxWidth }) {
  if (!svgEl || !overlayHostEl) return;

  function updateScale() {
    const scale = svgEl.getBoundingClientRect().width / viewBoxWidth;
    if (scale > 0) overlayHostEl.style.setProperty("--rocky-scale", String(scale));
  }

  updateScale();
  const observer = new ResizeObserver(updateScale);
  observer.observe(svgEl);
}
