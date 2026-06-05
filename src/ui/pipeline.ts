import { loadImage, measureWithContentDetection } from "../core/measure";
import { createNormalizedLogo } from "../core/normalize";
import type { MeasurementResult } from "../core/types";
import type { AppliedLogo, LoadedLogo } from "../shared/messages";
import type { ProcessParams } from "./defaults";
import { computeLayout, type LayoutItem } from "./layout";
import { opticalOffsetY } from "./optical";

export type CachedLogo = {
  id: string;
  name: string;
  imgSrc: string;
  measurement: MeasurementResult;
  nodeWidth: number;
  nodeHeight: number;
  x: number;
  y: number;
};

export type Placement = {
  id: string;
  imgSrc: string;
  scale: number;
  fullW: number;
  fullH: number;
  drawX: number;
  drawY: number;
  cx: number;
  cy: number;
};

export type PlacementResult = { items: Placement[]; width: number; height: number };

/** Load PNG bytes into an HTMLImageElement via an object URL (kept alive for the preview <img>). */
function bytesToImage(bytes: Uint8Array): Promise<{ img: HTMLImageElement; url: string }> {
  const blob = new Blob([bytes as BlobPart], { type: "image/png" });
  const url = URL.createObjectURL(blob);
  return loadImage(url).then((img) => ({ img, url }));
}

/**
 * IO step: load + measure each logo once; keep the object-URL src for the preview
 * and the node geometry for in-place transforms. The raster is never placed on canvas.
 * Verified via the E2E loop.
 */
export async function prepare(logos: LoadedLogo[]): Promise<CachedLogo[]> {
  const out: CachedLogo[] = [];
  for (const logo of logos) {
    let url: string | undefined;
    try {
      const loaded = await bytesToImage(logo.pngBytes);
      url = loaded.url;
      const measurement = measureWithContentDetection(loaded.img, undefined, true);
      out.push({
        id: logo.id,
        name: logo.name,
        imgSrc: url,
        measurement,
        nodeWidth: logo.nodeWidth,
        nodeHeight: logo.nodeHeight,
        x: logo.x,
        y: logo.y,
      });
      url = undefined; // ownership transferred to `out`; the preview/cleanup revokes it later
    } catch {
      // Skip logos that fail to load/measure; revoke the object URL if one was created.
      if (url) URL.revokeObjectURL(url);
    }
  }
  return out;
}

/**
 * Order logos by canvas reading order — top-to-bottom rows, left-to-right within a row —
 * so the soup preserves the arrangement the user already has on the canvas instead of
 * Figma's selection/z-order.
 *
 * Rows are detected by VERTICAL OVERLAP rather than top-edge position: logos on one
 * visual row often have different heights (and may be center-aligned), so their top
 * edges differ. Banding by top-y would split such a row and scramble the order; grouping
 * by overlap keeps differently-sized logos that share a line together.
 */
export function orderByPosition(logos: CachedLogo[]): CachedLogo[] {
  if (logos.length < 2) return logos.slice();

  // Sort top-to-bottom, then left-to-right (stable on exact ties via original index).
  const byTop = logos
    .map((l, i) => ({ l, i }))
    .sort((a, b) => a.l.y - b.l.y || a.l.x - b.l.x || a.i - b.i);

  // Greedily group into rows: a logo joins the current row if its top edge falls within
  // the row's accumulated vertical span (i.e. it overlaps the row), else it starts a new row.
  const rows: { l: CachedLogo; i: number }[][] = [];
  let bottom = -Infinity;
  for (const entry of byTop) {
    const top = entry.l.y;
    if (rows.length && top < bottom) {
      rows[rows.length - 1]!.push(entry);
    } else {
      rows.push([entry]);
      bottom = top + entry.l.nodeHeight;
      continue;
    }
    bottom = Math.max(bottom, top + entry.l.nodeHeight);
  }

  return rows.flatMap((row) =>
    row.sort((a, b) => a.l.x - b.l.x || a.i - b.i).map((e) => e.l),
  );
}

/**
 * Pure: normalize → layout → in-place geometry. Produces placements usable for both
 * the preview (local drawX/drawY) and the canvas apply (cx/cy + rescale factor).
 */
export function buildPlacements(
  cached: CachedLogo[],
  params: ProcessParams,
  layout: { gap: number; wrapWidth: number },
): PlacementResult {
  const densityFactor = params.densityAware ? params.densityFactor : 0;

  const normalized = cached.map((c) => {
    const n = createNormalizedLogo(
      { src: c.imgSrc, alt: c.name },
      c.measurement,
      params.baseSize,
      params.scaleFactor,
      densityFactor,
    );
    return { cached: c, normW: n.normalizedWidth, normH: n.normalizedHeight, offsetY: opticalOffsetY(n) };
  });

  const layoutItems: LayoutItem[] = normalized.map((n) => ({
    id: n.cached.id,
    contentW: n.normW,
    contentH: n.normH,
    offsetY: n.offsetY,
  }));
  const laid = computeLayout(layoutItems, layout.gap, layout.wrapWidth);
  const posById = new Map(laid.positions.map((p) => [p.id, p]));

  const ax = cached.reduce((m, c) => Math.min(m, c.x), Infinity);
  const ay = cached.reduce((m, c) => Math.min(m, c.y), Infinity);
  const anchorX = Number.isFinite(ax) ? ax : 0;
  const anchorY = Number.isFinite(ay) ? ay : 0;

  const items: Placement[] = normalized.map((n) => {
    const c = n.cached;
    const m = c.measurement;
    const exW = m.width;
    const exH = m.height;
    const cb = m.contentBox ?? { x: 0, y: 0, width: exW, height: exH };
    const ccW = c.nodeWidth * (cb.width / exW);
    const scale = ccW > 0 ? n.normW / ccW : 1;
    const fullW = c.nodeWidth * scale;
    const fullH = c.nodeHeight * scale;
    const pos = posById.get(c.id)!;
    const drawX = pos.x - (cb.x / exW) * fullW;
    const drawY = pos.y - (cb.y / exH) * fullH;
    return {
      id: c.id,
      imgSrc: c.imgSrc,
      scale,
      fullW,
      fullH,
      drawX,
      drawY,
      cx: anchorX + drawX,
      cy: anchorY + drawY,
    };
  });

  return { items, width: laid.width, height: laid.height };
}

/** Total width of all logos' normalized content in a single row (sum of widths + gaps). */
export function naturalRowWidth(
  cached: CachedLogo[],
  params: ProcessParams,
  gap: number,
): number {
  if (cached.length === 0) return 0;
  const densityFactor = params.densityAware ? params.densityFactor : 0;
  let sum = 0;
  for (const c of cached) {
    const n = createNormalizedLogo(
      { src: c.imgSrc, alt: c.name },
      c.measurement,
      params.baseSize,
      params.scaleFactor,
      densityFactor,
    );
    sum += n.normalizedWidth;
  }
  return sum + gap * (cached.length - 1);
}

/** Pure: placements → in-place transforms. x/y are Group-local layout offsets (the
 *  main thread places each child at group.x + x, group.y + y). */
export function toApply(result: PlacementResult): AppliedLogo[] {
  return result.items.map((it) => ({ id: it.id, scale: it.scale, x: it.drawX, y: it.drawY }));
}
