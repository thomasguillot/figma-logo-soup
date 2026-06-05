import { describe, it, expect } from "vitest";
import { buildPlacements, toApply, naturalRowWidth, orderByPosition, type CachedLogo } from "./pipeline";

function cached(over: Partial<CachedLogo> = {}): CachedLogo {
  return {
    id: "a",
    name: "A",
    imgSrc: "blob:x",
    measurement: {
      width: 100,
      height: 100,
      contentBox: { x: 0, y: 0, width: 100, height: 100 },
      visualCenter: { x: 50, y: 50, offsetX: 0, offsetY: 0 },
      pixelDensity: 0.35,
    },
    nodeWidth: 100,
    nodeHeight: 100,
    x: 0,
    y: 0,
    ...over,
  };
}

const params = { baseSize: 80, scaleFactor: 0.5, densityAware: false, densityFactor: 0.5 };

describe("orderByPosition", () => {
  it("orders a single row left-to-right regardless of input/z-order", () => {
    const logos = [
      cached({ id: "c", x: 300, y: 0 }),
      cached({ id: "a", x: 0, y: 0 }),
      cached({ id: "b", x: 150, y: 2 }),
    ];
    expect(orderByPosition(logos).map((l) => l.id)).toEqual(["a", "b", "c"]);
  });

  it("keeps a single row of mixed-height, center-aligned logos in left-to-right order", () => {
    // A tall logo sitting to the right among shorter ones must NOT jump to the front.
    const row = (id: string, x: number, h: number) =>
      cached({ id, x, y: 100 - h / 2, nodeHeight: h }); // center-aligned on y=100
    const logos = [row("a", 0, 30), row("b", 200, 28), row("c", 400, 24), row("d", 600, 80), row("e", 800, 26)];
    expect(orderByPosition(logos).map((l) => l.id)).toEqual(["a", "b", "c", "d", "e"]);
  });

  it("orders by rows top-to-bottom, then left-to-right within a row", () => {
    // nodeHeight 100 → band 50; y=0 and y=10 are the same row, y=300 is a lower row.
    const logos = [
      cached({ id: "bottom", x: 0, y: 300 }),
      cached({ id: "topRight", x: 200, y: 10 }),
      cached({ id: "topLeft", x: 0, y: 0 }),
    ];
    expect(orderByPosition(logos).map((l) => l.id)).toEqual(["topLeft", "topRight", "bottom"]);
  });

  it("does not mutate the input array", () => {
    const logos = [cached({ id: "b", x: 100 }), cached({ id: "a", x: 0 })];
    orderByPosition(logos);
    expect(logos.map((l) => l.id)).toEqual(["b", "a"]);
  });
});

describe("buildPlacements", () => {
  it("scales a padding-free square logo to base size and centers it", () => {
    const r = buildPlacements([cached()], params, { gap: 48, wrapWidth: 640 });
    expect(r.items).toHaveLength(1);
    const it = r.items[0];
    expect(it.scale).toBeCloseTo(0.8, 5);
    expect(it.fullW).toBeCloseTo(80, 5);
    expect(it.fullH).toBeCloseTo(80, 5);
    expect(it.drawX).toBeCloseTo(280, 5);
    expect(it.drawY).toBeCloseTo(0, 5);
    expect(it.cx).toBeCloseTo(280, 5);
    expect(it.cy).toBeCloseTo(0, 5);
    expect(it.imgSrc).toBe("blob:x");
  });

  it("compensates for baked-in padding so content (not bounds) is sized and placed", () => {
    const padded = cached({
      measurement: {
        width: 200, height: 200,
        contentBox: { x: 50, y: 50, width: 100, height: 100 },
        visualCenter: { x: 100, y: 100, offsetX: 0, offsetY: 0 },
        pixelDensity: 0.35,
      },
      nodeWidth: 200, nodeHeight: 200,
    });
    const it = buildPlacements([padded], params, { gap: 48, wrapWidth: 640 }).items[0];
    expect(it.scale).toBeCloseTo(0.8, 5);
    expect(it.fullW).toBeCloseTo(160, 5);
    expect(it.drawX).toBeCloseTo(240, 5);
    expect(it.drawY).toBeCloseTo(-40, 5);
  });

  it("anchors the arrangement at the selection's min x/y", () => {
    const r = buildPlacements([cached({ x: 1000, y: 500 })], params, { gap: 48, wrapWidth: 640 });
    expect(r.items[0].cx).toBeCloseTo(1280, 5);
    expect(r.items[0].cy).toBeCloseTo(500, 5);
  });
});

describe("toApply", () => {
  it("maps placements to {id, scale, x, y} from canvas coords", () => {
    const r = buildPlacements([cached(), cached({ id: "b", x: 0, y: 0 })], params, { gap: 48, wrapWidth: 640 });
    const applied = toApply(r);
    expect(applied).toHaveLength(2);
    expect(applied[0]).toMatchObject({ id: "a" });
    expect(applied[0].scale).toBeCloseTo(0.8, 5);
    expect(typeof applied[0].x).toBe("number");
    expect(typeof applied[0].y).toBe("number");
  });
});

describe("naturalRowWidth", () => {
  const p = { baseSize: 80, scaleFactor: 0.5, densityAware: false, densityFactor: 0.5 };
  const sq = (id: string): CachedLogo => ({
    id, name: id, imgSrc: "blob:" + id,
    measurement: {
      width: 100, height: 100,
      contentBox: { x: 0, y: 0, width: 100, height: 100 },
      visualCenter: { x: 50, y: 50, offsetX: 0, offsetY: 0 },
      pixelDensity: 0.35,
    },
    nodeWidth: 100, nodeHeight: 100, x: 0, y: 0,
  });

  it("sums normalized widths plus gaps for a single row", () => {
    // two 80-wide squares + one 20 gap = 180
    expect(naturalRowWidth([sq("a"), sq("b")], p, 20)).toBe(180);
  });

  it("is zero for no logos", () => {
    expect(naturalRowWidth([], p, 20)).toBe(0);
  });
});
