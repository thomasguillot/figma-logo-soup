/** A selected logo + its current canvas geometry, sent main → ui. PNG is for measurement only. */
export type LoadedLogo = {
  id: string;
  name: string;
  pngBytes: Uint8Array;
  nodeWidth: number;
  nodeHeight: number;
  x: number;
  y: number;
};

/** A computed in-place transform for one node, sent ui → main on Apply. */
export type AppliedLogo = {
  id: string;
  scale: number;
  x: number;
  y: number;
};

export type LayoutParams = {
  gap: number;
  wrapWidth: number;
};

export type UiToMain =
  | { type: "READY" }
  | { type: "APPLY"; results: AppliedLogo[] };

export type MainToUi =
  | { type: "LOGOS_LOADED"; logos: LoadedLogo[]; defaultWrapWidth: number }
  | { type: "NO_SELECTION" }
  | { type: "APPLY_DONE" };
