/**
 * Pure layout math for the read-only component drawing on a home slide.
 */

/** Uniform scale (px per cm) so the longest side fits in maxPx. */
export function fitScale(widthCm: number, heightCm: number, maxPx: number): number {
  if (widthCm <= 0 || heightCm <= 0 || maxPx <= 0) return 0;
  return maxPx / Math.max(widthCm, heightCm);
}
