import { describe, it, expect } from "vitest";
import { calculateNormalizedDimensions } from "./normalize";

describe("calculateNormalizedDimensions (vendored parity)", () => {
  it("balances a wide 8:1 logo", () => {
    const r = calculateNormalizedDimensions({ width: 800, height: 100 }, 80, 0.5, 0);
    expect(r).toEqual({ width: 226, height: 28 });
  });

  it("leaves a square logo at base size", () => {
    const r = calculateNormalizedDimensions({ width: 100, height: 100 }, 80, 0.5, 0);
    expect(r).toEqual({ width: 80, height: 80 });
  });

  it("grows a tall 1:4 logo in height", () => {
    const r = calculateNormalizedDimensions({ width: 100, height: 400 }, 80, 0.5, 0);
    expect(r).toEqual({ width: 40, height: 160 });
  });

  it("uses the content box, not the raw image, when present", () => {
    const r = calculateNormalizedDimensions(
      { width: 200, height: 200, contentBox: { x: 20, y: 80, width: 160, height: 40 } },
      80,
      0.5,
      0,
    );
    expect(r).toEqual({ width: 160, height: 40 });
  });

  it("applies irradiation compensation on an opaque dark background", () => {
    // darkness = 1 - 0 = 1, density = 0.5, scale = 1 - 1*0.5*0.08 = 0.96
    const r = calculateNormalizedDimensions(
      { width: 100, height: 100, backgroundLuminance: 0, pixelDensity: 0.5 },
      80,
      0.5,
      0,
    );
    expect(r).toEqual({ width: 77, height: 77 });
  });

  it("scales a dense logo down via density compensation", () => {
    // densityRatio = 0.7/0.35 = 2, densityScale = (1/2)^(1*0.5) ≈ 0.707
    const r = calculateNormalizedDimensions(
      { width: 100, height: 100, pixelDensity: 0.7 },
      80,
      0.5,
      1,
    );
    expect(r).toEqual({ width: 57, height: 57 });
  });
});
