import type { LoadedLogo } from "../shared/messages";

export type Boxish = { x: number; width: number };

/** Width spanning the selection's horizontal extent; used as the wrap-width default. */
export function computeDefaultWrapWidth(boxes: Boxish[]): number {
  if (boxes.length === 0) return 640;
  let min = Infinity;
  let max = -Infinity;
  for (const b of boxes) {
    if (b.x < min) min = b.x;
    if (b.x + b.width > max) max = b.x + b.width;
  }
  return Math.round(max - min);
}

/**
 * Export each selected node to PNG (scale 1) for MEASUREMENT ONLY, and capture its
 * current canvas geometry. The raster is never placed back; apply rescales the node.
 */
export async function readSelection(
  selection: readonly SceneNode[],
): Promise<{ logos: LoadedLogo[]; defaultWrapWidth: number }> {
  const logos: LoadedLogo[] = [];
  for (const node of selection) {
    const pngBytes = await node.exportAsync({
      format: "PNG",
      constraint: { type: "SCALE", value: 1 },
    });
    logos.push({
      id: node.id,
      name: node.name,
      pngBytes,
      nodeWidth: node.width,
      nodeHeight: node.height,
      x: node.x,
      y: node.y,
    });
  }
  const defaultWrapWidth = computeDefaultWrapWidth(
    selection.map((n) => ({ x: n.x, width: n.width })),
  );
  return { logos, defaultWrapWidth };
}
