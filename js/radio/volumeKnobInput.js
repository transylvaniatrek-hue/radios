import { radioState } from "./radioState.js";

// Translates clicks on the on/off-volume-knob hotspots into radioState
// calls, plus a momentary "flash" so a discrete knob click gets visual
// feedback distinct from the persistent highlight used elsewhere (this is a
// detent click, not an on/off toggle). Takes arrays because the same
// physical knob has a separate hotspot on the front and top views — either
// one, from either view, drives the same shared volume state. Always
// works, even when the radio is locked (see radio/lockController.js).
export function initVolumeKnobInput({ clockwiseEls, counterClockwiseEls }) {
  function flash(el) {
    el.classList.remove("knob-flash");
    void el.offsetWidth; // restart the CSS animation even on rapid repeat clicks
    el.classList.add("knob-flash");
  }

  function wire(els, onActivate) {
    (els || []).forEach((el) => {
      if (!el) return;
      const activate = () => {
        flash(el);
        onActivate();
      };
      el.addEventListener("click", activate);
      el.addEventListener("keydown", (evt) => {
        if (evt.key === "Enter" || evt.key === " ") {
          evt.preventDefault();
          activate();
        }
      });
    });
  }

  wire(clockwiseEls, () => radioState.increaseVolume());
  wire(counterClockwiseEls, () => radioState.decreaseVolume());
}
