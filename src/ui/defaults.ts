export type ProcessParams = {
  baseSize: number;
  scaleFactor: number;
  densityAware: boolean;
  densityFactor: number;
};

export const PLUGIN_DEFAULTS = {
  baseSize: 80,
  scaleFactor: 0.5,
  densityAware: true,
  densityFactor: 0.5,
  gap: 48,
} as const;
