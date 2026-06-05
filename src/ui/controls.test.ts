import { describe, it, expect, beforeEach, vi } from "vitest";
import { mountControls } from "./controls";

describe("mountControls", () => {
  let host: HTMLElement;
  beforeEach(() => {
    document.body.innerHTML = '<div id="host"></div>';
    host = document.getElementById("host")!;
    vi.useFakeTimers();
  });

  it("renders controls seeded with defaults and reports initial state", () => {
    const ctl = mountControls(host, 1200);
    const state = ctl.getState();
    expect(state.params.baseSize).toBe(80);
    expect(state.params.scaleFactor).toBe(0.5);
    expect(state.params.densityAware).toBe(true);
    expect(state.layout.gap).toBe(48);
    // Wrap is off by default; the wrap-width slider starts at ~half the natural width.
    expect(state.wrapEnabled).toBe(false);
    expect(state.keepOrder).toBe(true);
    expect(state.layout.wrapWidth).toBe(600);
    expect(host.querySelectorAll("input")).not.toHaveLength(0);
  });

  it("setNaturalWidth widens the wrap-width slider range for a larger selection", () => {
    const ctl = mountControls(host, 1200);
    const wrapRange = host
      .querySelector<HTMLInputElement>('[data-control="wrapWidth"]')!;
    expect(Number(wrapRange.max)).toBe(2000); // max(2000, 1200+400)

    ctl.setNaturalWidth(5000);
    expect(Number(wrapRange.max)).toBe(5400); // 5000 + 400
  });

  it("flushes live DOM values on getState (no stale read within the debounce window)", () => {
    const ctl = mountControls(host, 1200);
    const base = host.querySelector<HTMLInputElement>('[data-control="baseSize"]')!;
    base.value = "150";
    base.dispatchEvent(new Event("input"));
    // Read immediately, before the 120ms debounce fires.
    expect(ctl.getState().params.baseSize).toBe(150);
  });

  it("hides the wrap-width slider until wrap is enabled, then reveals it", () => {
    const ctl = mountControls(host, 1200);
    const wrapField = host
      .querySelector<HTMLInputElement>('[data-control="wrapWidth"]')!
      .closest(".ls-field") as HTMLElement;
    expect(wrapField.style.display).toBe("none");

    const toggle = host.querySelector<HTMLInputElement>('[data-control="wrapEnabled"]')!;
    toggle.checked = true;
    toggle.dispatchEvent(new Event("input"));
    expect(wrapField.style.display).toBe("");

    vi.advanceTimersByTime(150);
    expect(ctl.getState().wrapEnabled).toBe(true);
  });

  it("emits debounced changes when a slider moves", () => {
    const onChange = vi.fn();
    const ctl = mountControls(host, 640);
    ctl.onChange(onChange);

    const base = host.querySelector<HTMLInputElement>('[data-control="baseSize"]')!;
    base.value = "120";
    base.dispatchEvent(new Event("input"));

    expect(onChange).not.toHaveBeenCalled(); // debounced
    vi.advanceTimersByTime(150);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(ctl.getState().params.baseSize).toBe(120);
  });

  it("reads the density toggle", () => {
    const ctl = mountControls(host, 640);
    const toggle = host.querySelector<HTMLInputElement>('[data-control="densityAware"]')!;
    toggle.checked = false;
    toggle.dispatchEvent(new Event("input"));
    vi.advanceTimersByTime(150);
    expect(ctl.getState().params.densityAware).toBe(false);
  });
});
