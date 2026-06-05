import { describe, it, expect, beforeEach } from "vitest";
import { renderPreview } from "./preview";
import type { PlacementResult } from "./pipeline";

const result: PlacementResult = {
  width: 400,
  height: 120,
  items: [
    { id: "a", imgSrc: "blob:a", scale: 1, fullW: 100, fullH: 40, drawX: 150, drawY: 40, cx: 0, cy: 0 },
    { id: "b", imgSrc: "blob:b", scale: 1, fullW: 60, fullH: 60, drawX: 300, drawY: 30, cx: 0, cy: 0 },
  ],
};

describe("renderPreview", () => {
  let host: HTMLElement;
  beforeEach(() => {
    document.body.innerHTML = '<div id="host"></div>';
    host = document.getElementById("host")!;
  });

  it("places one absolutely-positioned img per item at scaled draw coords", () => {
    renderPreview(host, result, { availableWidth: 400, theme: "light" });
    const imgs = host.querySelectorAll("img");
    expect(imgs).toHaveLength(2);
    expect(imgs[0].style.position).toBe("absolute");
    expect(imgs[0].style.left).toBe("150px");
    expect(imgs[0].style.top).toBe("40px");
    expect(imgs[0].style.width).toBe("100px");
    expect(imgs[0].src).toContain("blob:a");
  });

  it("scales everything down to fit the available width", () => {
    renderPreview(host, result, { availableWidth: 200, theme: "light" });
    const img = host.querySelector("img")!;
    expect(img.style.left).toBe("75px");
    expect(img.style.width).toBe("50px");
  });

  it("marks the surface with the chosen theme", () => {
    renderPreview(host, result, { availableWidth: 400, theme: "dark" });
    const surface = host.querySelector<HTMLElement>("[data-theme]")!;
    expect(surface.dataset.theme).toBe("dark");
  });

  it("clears previous content on re-render", () => {
    renderPreview(host, result, { availableWidth: 400, theme: "light" });
    renderPreview(host, { width: 0, height: 0, items: [] }, { availableWidth: 400, theme: "light" });
    expect(host.querySelectorAll("img")).toHaveLength(0);
  });

  it("scales up to fill the available width, capped", () => {
    renderPreview(host, result, { availableWidth: 1600, theme: "light" }); // 1600/400 = 4, capped at 3
    const img = host.querySelector("img")!;
    expect(img.style.width).toBe("300px"); // 100 * 3
  });
});
