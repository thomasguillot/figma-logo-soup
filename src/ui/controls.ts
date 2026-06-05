import type { LayoutParams } from "../shared/messages";
import { PLUGIN_DEFAULTS, type ProcessParams } from "./defaults";

export type ControlsState = {
  params: ProcessParams;
  layout: LayoutParams;
  /** When false, logos stay on a single row and the wrap-width slider is hidden. */
  wrapEnabled: boolean;
  /** When true, arrange logos in canvas reading order rather than selection/z-order. */
  keepOrder: boolean;
};
export type ControlsHandle = {
  getState: () => ControlsState;
  /** Registers the single change subscriber (last call wins). One subscriber is sufficient for this panel. */
  onChange: (cb: (state: ControlsState) => void) => void;
  /** Re-fit the wrap-width slider's range to a new selection's natural single-row width. */
  setNaturalWidth: (naturalWidth: number) => void;
};

/** Upper bound for the wrap-width slider: a full single row plus headroom, never below 2000. */
function wrapMaxFor(naturalWidth: number): number {
  return Math.max(2000, Math.ceil(naturalWidth) + 400);
}

/**
 * A labelled range field with an editable number input. The range carries the
 * `data-control` (it is the canonical value source for `read()`); the number
 * field mirrors it two-way so users can drag or type an exact value.
 */
function slider(
  label: string,
  control: string,
  min: number,
  max: number,
  step: number,
  value: number,
): HTMLElement {
  const wrap = document.createElement("label");
  wrap.className = "ls-field";

  const head = document.createElement("div");
  head.className = "ls-field-head";
  const name = document.createElement("span");
  name.className = "ls-label";
  name.textContent = label;

  const number = document.createElement("input");
  number.type = "number";
  number.className = "ls-num";
  number.min = String(min);
  number.max = String(max);
  number.step = String(step);
  number.value = String(value);
  head.append(name, number);

  const range = document.createElement("input");
  range.type = "range";
  range.className = "ls-range";
  range.min = String(min);
  range.max = String(max);
  range.step = String(step);
  range.value = String(value);
  range.dataset.control = control;

  // Two-way sync. The range auto-clamps/steps any value assigned to it, so the
  // canonical state (read from the range) always stays within bounds.
  range.addEventListener("input", () => {
    number.value = range.value;
  });
  number.addEventListener("input", () => {
    range.value = number.value;
  });
  // On commit, snap the field back to the clamped/stepped value.
  number.addEventListener("change", () => {
    range.value = number.value;
    number.value = range.value;
  });

  wrap.append(head, range);
  return wrap;
}

/** A labelled checkbox row. */
function checkbox(label: string, control: string, checked: boolean): HTMLElement {
  const wrap = document.createElement("label");
  wrap.className = "ls-row";
  const input = document.createElement("input");
  input.type = "checkbox";
  input.className = "ls-check";
  input.checked = checked;
  input.dataset.control = control;
  const text = document.createElement("span");
  text.textContent = label;
  wrap.append(input, text);
  return wrap;
}

export function mountControls(host: HTMLElement, naturalWidth: number): ControlsHandle {
  // The wrap-width slider can reach a full single row plus headroom for larger soups.
  const wrapMax = wrapMaxFor(naturalWidth);
  // When wrap is first enabled, start narrow enough to actually wrap into rows.
  const wrapStart = Math.min(wrapMax, Math.max(200, Math.round(naturalWidth / 2)));

  const state: ControlsState = {
    params: {
      baseSize: PLUGIN_DEFAULTS.baseSize,
      scaleFactor: PLUGIN_DEFAULTS.scaleFactor,
      densityAware: PLUGIN_DEFAULTS.densityAware,
      densityFactor: PLUGIN_DEFAULTS.densityFactor, // fixed strength; only the on/off toggle is user-controllable
    },
    layout: { gap: PLUGIN_DEFAULTS.gap, wrapWidth: wrapStart },
    wrapEnabled: false,
    keepOrder: true,
  };

  host.appendChild(slider("Base size", "baseSize", 24, 200, 1, state.params.baseSize));
  host.appendChild(slider("Balance", "scaleFactor", 0, 1, 0.05, state.params.scaleFactor));
  host.appendChild(slider("Gap", "gap", 0, 200, 1, state.layout.gap));
  host.appendChild(checkbox("Density compensation", "densityAware", state.params.densityAware));
  host.appendChild(checkbox("Keep canvas order", "keepOrder", state.keepOrder));
  host.appendChild(checkbox("Wrap into rows", "wrapEnabled", state.wrapEnabled));

  // Wrap-width slider — only shown when "Wrap into rows" is enabled.
  const wrapField = slider("Wrap width", "wrapWidth", 100, wrapMax, 10, state.layout.wrapWidth);
  wrapField.style.display = state.wrapEnabled ? "" : "none";
  host.appendChild(wrapField);

  let cb: ((s: ControlsState) => void) | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  function read(): void {
    state.params.baseSize = num("baseSize");
    state.params.scaleFactor = num("scaleFactor");
    state.params.densityAware = bool("densityAware");
    state.layout.gap = num("gap");
    state.layout.wrapWidth = num("wrapWidth");
    state.wrapEnabled = bool("wrapEnabled");
    state.keepOrder = bool("keepOrder");
  }
  function num(control: string): number {
    return Number(host.querySelector<HTMLInputElement>(`[data-control="${control}"]`)!.value);
  }
  function bool(control: string): boolean {
    return host.querySelector<HTMLInputElement>(`[data-control="${control}"]`)!.checked;
  }

  function scheduleUpdate(): void {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      read();
      cb?.(state);
    }, 120);
  }

  // Toggling wrap shows/hides the wrap-width slider; reflect it immediately.
  host
    .querySelector<HTMLInputElement>('[data-control="wrapEnabled"]')!
    .addEventListener("input", (e) => {
      wrapField.style.display = (e.target as HTMLInputElement).checked ? "" : "none";
    });

  host.querySelectorAll<HTMLInputElement>("input").forEach((input) => {
    input.addEventListener("input", scheduleUpdate);
  });

  const wrapRange = wrapField.querySelector<HTMLInputElement>('input[type="range"]')!;
  const wrapNumber = wrapField.querySelector<HTMLInputElement>('input[type="number"]')!;

  function setNaturalWidth(naturalWidth: number): void {
    const max = wrapMaxFor(naturalWidth);
    wrapRange.max = String(max);
    wrapNumber.max = String(max);
    if (Number(wrapRange.value) > max) {
      wrapRange.value = String(max);
      wrapNumber.value = String(max);
      state.layout.wrapWidth = max;
    }
  }

  return {
    // Flush live DOM values before returning so a read taken right after a change
    // (e.g. Apply clicked within the debounce window) is never stale.
    getState: () => {
      read();
      return state;
    },
    onChange: (fn) => {
      cb = fn;
    },
    setNaturalWidth,
  };
}
