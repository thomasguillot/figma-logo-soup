import type { NormalizedLogo } from "../core/types";

/**
 * Vertical optical nudge (px, in placement units) implementing alignBy
 * "visual-center-y" — mirrors logo-soup's getVisualCenterTransform but for
 * the Y axis only, since the soup is laid out in horizontal rows.
 */
export function opticalOffsetY(logo: NormalizedLogo): number {
  if (!logo.visualCenter) return 0;
  const contentHeight = logo.contentBox?.height || logo.originalHeight;
  if (!contentHeight) return 0;
  const scaleY = logo.normalizedHeight / contentHeight;
  const offsetY = -logo.visualCenter.offsetY * scaleY;
  if (Math.abs(offsetY) <= 0.5) return 0;
  return Math.round(offsetY * 10) / 10;
}
