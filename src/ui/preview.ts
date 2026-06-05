import type { PlacementResult } from "./pipeline";

export type PreviewOptions = { availableWidth: number; theme: "light" | "dark" };

const CHECKER = {
  light: { a: "#ffffff", b: "#e9e9ee" },
  dark: { a: "#2b2b30", b: "#1f1f24" },
};

/** Render placements as absolutely-positioned images on a checkerboard surface. */
export function renderPreview(host: HTMLElement, result: PlacementResult, opts: PreviewOptions): void {
  host.innerHTML = "";

  const MAX_SCALE = 3;
  const scale = result.width > 0 ? Math.min(MAX_SCALE, opts.availableWidth / result.width) : 1;
  const c = CHECKER[opts.theme];

  // The checkerboard surface fills the entire preview area (full height + width).
  const surface = document.createElement("div");
  surface.dataset.theme = opts.theme;
  surface.style.flex = "1 1 auto";
  surface.style.minWidth = "0";
  surface.style.alignSelf = "stretch";
  surface.style.display = "flex";
  surface.style.borderRadius = "6px";
  surface.style.backgroundColor = c.a;
  surface.style.backgroundImage =
    `linear-gradient(45deg, ${c.b} 25%, transparent 25%),` +
    `linear-gradient(-45deg, ${c.b} 25%, transparent 25%),` +
    `linear-gradient(45deg, transparent 75%, ${c.b} 75%),` +
    `linear-gradient(-45deg, transparent 75%, ${c.b} 75%)`;
  surface.style.backgroundSize = "16px 16px";
  surface.style.backgroundPosition = "0 0, 0 8px, 8px -8px, -8px 0";

  // Soup-sized box, centered on both axes within the full-bleed surface.
  const content = document.createElement("div");
  content.style.position = "relative";
  content.style.flex = "0 0 auto";
  content.style.margin = "auto";
  content.style.width = `${result.width * scale}px`;
  content.style.height = `${result.height * scale}px`;

  for (const it of result.items) {
    const img = document.createElement("img");
    img.src = it.imgSrc;
    img.style.position = "absolute";
    img.style.left = `${it.drawX * scale}px`;
    img.style.top = `${it.drawY * scale}px`;
    img.style.width = `${it.fullW * scale}px`;
    img.style.height = `${it.fullH * scale}px`;
    content.appendChild(img);
  }

  surface.appendChild(content);
  host.appendChild(surface);
}
