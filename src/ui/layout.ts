export type LayoutItem = { id: string; contentW: number; contentH: number; offsetY: number };
export type LayoutPos = { id: string; x: number; y: number };
export type LayoutResult = { positions: LayoutPos[]; width: number; height: number };

/**
 * Flex-wrap row packing. Greedily fills rows up to wrapWidth, centers each row
 * horizontally within wrapWidth, stacks rows with `gap` between them, and
 * vertically centers each item within its row height plus its optical offsetY.
 * Returns content-box top-left positions in local space.
 */
export function computeLayout(items: LayoutItem[], gap: number, wrapWidth: number): LayoutResult {
  const rows: LayoutItem[][] = [];
  let row: LayoutItem[] = [];
  let rowWidth = 0;
  for (const it of items) {
    const add = (row.length ? gap : 0) + it.contentW;
    if (row.length && rowWidth + add > wrapWidth) {
      rows.push(row);
      row = [];
      rowWidth = 0;
    }
    row.push(it);
    rowWidth += (row.length > 1 ? gap : 0) + it.contentW;
  }
  if (row.length) rows.push(row);

  const rowWidthOf = (r: LayoutItem[]) =>
    r.reduce((s, it) => s + it.contentW, 0) + gap * (r.length - 1);

  // Container is at least wrapWidth, but expands to the widest row so a logo (or row)
  // wider than wrapWidth gets a 0 offset rather than a negative one (which would clip
  // the preview and mis-anchor Apply).
  const layoutWidth = rows.reduce((m, r) => Math.max(m, rowWidthOf(r)), wrapWidth);

  const positions: LayoutPos[] = [];
  let rowY = 0;
  for (const r of rows) {
    const width = rowWidthOf(r);
    const rowHeight = r.reduce((m, it) => Math.max(m, it.contentH), 0);
    let x = (layoutWidth - width) / 2;
    for (const it of r) {
      positions.push({
        id: it.id,
        x,
        y: rowY + (rowHeight - it.contentH) / 2 + it.offsetY,
      });
      x += it.contentW + gap;
    }
    rowY += rowHeight + gap;
  }

  const height = rows.length ? rowY - gap : 0;
  return { positions, width: layoutWidth, height };
}
