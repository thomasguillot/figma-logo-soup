import { describe, it, expect } from "vitest";
import { computeDefaultWrapWidth } from "./selection";

describe("computeDefaultWrapWidth", () => {
  it("spans from the leftmost to the rightmost edge of the selection", () => {
    const w = computeDefaultWrapWidth([
      { x: 0, width: 100 },
      { x: 200, width: 50 },
      { x: 120, width: 40 },
    ]);
    expect(w).toBe(250);
  });

  it("falls back to a sane width for an empty selection", () => {
    expect(computeDefaultWrapWidth([])).toBe(640);
  });
});
