/**
 * Pure layout math for the read-only component drawing on a home slide.
 */

/** Uniform scale (px per cm) so the longest side fits in maxPx. */
export function fitScale(widthCm: number, heightCm: number, maxPx: number): number {
  if (widthCm <= 0 || heightCm <= 0 || maxPx <= 0) return 0;
  return maxPx / Math.max(widthCm, heightCm);
}

/**
 * Top-left pixel position of an icon centered on (xCm, yCm), clamped so
 * the whole icon stays inside the area.
 */
export function clampIconPosition(
  xCm: number,
  yCm: number,
  areaWidthCm: number,
  areaHeightCm: number,
  scale: number,
  iconPx: number,
): { left: number; top: number } {
  const areaWidthPx = areaWidthCm * scale;
  const areaHeightPx = areaHeightCm * scale;
  const maxLeft = Math.max(0, areaWidthPx - iconPx);
  const maxTop = Math.max(0, areaHeightPx - iconPx);
  const left = Math.min(maxLeft, Math.max(0, xCm * scale - iconPx / 2));
  const top = Math.min(maxTop, Math.max(0, yCm * scale - iconPx / 2));
  return { left, top };
}
