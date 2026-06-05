import { describe, it, expect } from "vitest";
import { opticalOffsetY } from "./optical";
import type { NormalizedLogo } from "../core/types";

function logo(over: Partial<NormalizedLogo>): NormalizedLogo {
  return {
    src: "",
    alt: "",
    originalWidth: 100,
    originalHeight: 100,
    contentBox: { x: 0, y: 0, width: 100, height: 100 },
    normalizedWidth: 100,
    normalizedHeight: 100,
    aspectRatio: 1,
    visualCenter: { x: 50, y: 50, offsetX: 0, offsetY: 0 },
    ...over,
  };
}

describe("opticalOffsetY", () => {
  it("nudges opposite the visual-center offset, scaled to placement size", () => {
    const l = logo({
      contentBox: { x: 0, y: 0, width: 100, height: 40 },
      normalizedHeight: 40,
      visualCenter: { x: 50, y: 20, offsetX: 0, offsetY: 5 },
    });
    expect(opticalOffsetY(l)).toBe(-5);
  });

  it("ignores sub-half-pixel offsets", () => {
    const l = logo({
      contentBox: { x: 0, y: 0, width: 100, height: 40 },
      normalizedHeight: 40,
      visualCenter: { x: 50, y: 20, offsetX: 0, offsetY: 0.3 },
    });
    expect(opticalOffsetY(l)).toBe(0);
  });

  it("returns 0 when there is no visual center", () => {
    const l = logo({ visualCenter: undefined });
    expect(opticalOffsetY(l)).toBe(0);
  });
});
