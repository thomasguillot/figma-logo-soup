import { describe, it, expect } from "vitest";
import { computeLayout, type LayoutItem } from "./layout";

const item = (id: string, w: number, h: number, offsetY = 0): LayoutItem => ({
  id, contentW: w, contentH: h, offsetY,
});

describe("computeLayout", () => {
  it("centers a single row horizontally and vertically within row height", () => {
    const r = computeLayout([item("a", 100, 40), item("b", 60, 60)], 20, 1000);
    expect(r.positions).toEqual([
      { id: "a", x: 410, y: 10 },
      { id: "b", x: 530, y: 0 },
    ]);
    expect(r.width).toBe(1000);
    expect(r.height).toBe(60);
  });

  it("expands the container (no negative offset) when a row is wider than wrapWidth", () => {
    const r = computeLayout([item("wide", 300, 40)], 20, 100);
    expect(r.width).toBe(300); // container grew to the widest row, not the 100 wrapWidth
    expect(r.positions[0]).toEqual({ id: "wide", x: 0, y: 0 }); // centered, not negative
  });

  it("wraps to a new row when the next item exceeds wrapWidth", () => {
    const r = computeLayout([item("a", 100, 40), item("b", 60, 60)], 20, 150);
    expect(r.positions).toEqual([
      { id: "a", x: 25, y: 0 },
      { id: "b", x: 45, y: 60 },
    ]);
    expect(r.height).toBe(120);
  });

  it("folds the optical offsetY into the vertical position", () => {
    const r = computeLayout([item("a", 100, 40, -5)], 20, 1000);
    expect(r.positions[0]).toEqual({ id: "a", x: 450, y: -5 });
  });

  it("returns zero size for no items", () => {
    expect(computeLayout([], 20, 500)).toEqual({ positions: [], width: 500, height: 0 });
  });
});
