import type { MainToUi, UiToMain } from "../shared/messages";
import { mountControls, type ControlsState } from "./controls";
import { PLUGIN_DEFAULTS } from "./defaults";
import { prepare, buildPlacements, toApply, naturalRowWidth, orderByPosition, type CachedLogo } from "./pipeline";
import { renderPreview } from "./preview";

const previewHost = document.getElementById("preview")!;
const controlsHost = document.getElementById("controls")!;
const applyBtn = document.getElementById("apply") as HTMLButtonElement;
const statusEl = document.getElementById("status")!;
const themeBtn = document.getElementById("theme") as HTMLButtonElement;

let cached: CachedLogo[] = [];
let controls: ReturnType<typeof mountControls> | null = null;
let theme: "light" | "dark" = "light";
let generation = 0;

function post(msg: UiToMain): void {
  parent.postMessage({ pluginMessage: msg }, "*");
}

function revokeCached(): void {
  for (const c of cached) URL.revokeObjectURL(c.imgSrc);
}

/** Resolve the layout to use: when wrap is off, widen to the natural single-row width so nothing wraps. */
function effectiveLayout(state: ControlsState) {
  if (state.wrapEnabled) return state.layout;
  return { gap: state.layout.gap, wrapWidth: naturalRowWidth(cached, state.params, state.layout.gap) };
}

/** Logos in the order to lay out: canvas reading order when "Keep canvas order" is on, else selection order. */
function orderedLogos(state: ControlsState): CachedLogo[] {
  return state.keepOrder ? orderByPosition(cached) : cached;
}

function rerender(state: ControlsState): void {
  if (cached.length === 0) {
    previewHost.innerHTML = "";
    return;
  }
  const result = buildPlacements(orderedLogos(state), state.params, effectiveLayout(state));
  renderPreview(previewHost, result, { availableWidth: (previewHost.clientWidth || 360) - 32, theme });
}

themeBtn.onclick = () => {
  theme = theme === "light" ? "dark" : "light";
  themeBtn.textContent = theme === "light" ? "Dark bg" : "Light bg";
  if (controls) rerender(controls.getState());
};

window.onmessage = async (event: MessageEvent) => {
  const msg = event.data.pluginMessage as MainToUi | undefined;
  if (!msg) return;

  if (msg.type === "NO_SELECTION") {
    generation++;
    revokeCached();
    cached = [];
    previewHost.innerHTML = "";
    statusEl.textContent = "Select one or more logos on the canvas.";
    applyBtn.disabled = true;
    return;
  }

  if (msg.type === "LOGOS_LOADED") {
    const gen = ++generation;
    statusEl.textContent = "Measuring…";
    const next = await prepare(msg.logos);
    if (gen !== generation) {
      // A newer selection arrived while measuring; discard this stale batch.
      for (const c of next) URL.revokeObjectURL(c.imgSrc);
      return;
    }
    if (next.length === 0) {
      revokeCached();
      cached = [];
      statusEl.textContent = "None of the selected nodes could be processed.";
      applyBtn.disabled = true;
      return;
    }
    revokeCached();
    cached = next;
    if (!controls) {
      const dp = {
        baseSize: PLUGIN_DEFAULTS.baseSize,
        scaleFactor: PLUGIN_DEFAULTS.scaleFactor,
        densityAware: PLUGIN_DEFAULTS.densityAware,
        densityFactor: PLUGIN_DEFAULTS.densityFactor,
      };
      const natural = naturalRowWidth(cached, dp, PLUGIN_DEFAULTS.gap);
      controls = mountControls(controlsHost, Math.round(natural));
      controls.onChange(rerender);
    } else {
      // Re-fit the wrap slider's range to this selection's natural width.
      const dp = controls.getState().params;
      controls.setNaturalWidth(Math.round(naturalRowWidth(cached, dp, controls.getState().layout.gap)));
    }
    applyBtn.disabled = false;
    statusEl.textContent = `${cached.length} logo(s) selected.`;
    rerender(controls.getState());
  }

  if (msg.type === "APPLY_DONE") {
    statusEl.textContent = "Applied to canvas.";
  }
};

applyBtn.onclick = () => {
  if (!controls || cached.length === 0) return;
  const state = controls.getState();
  const result = buildPlacements(orderedLogos(state), state.params, effectiveLayout(state));
  applyBtn.disabled = true;
  statusEl.textContent = "Applying…";
  post({ type: "APPLY", results: toApply(result) });
};

post({ type: "READY" });
