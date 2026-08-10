import { radioState } from "./radioState.js";

// Translates clicks on the two on/off-volume-knob hotspots into
// radioState calls, plus a momentary "flash" so a discrete knob click gets
// visual feedback distinct from the persistent highlight used elsewhere
// (this is a detent click, not an on/off toggle).
export function initVolumeKnobInput({ clockwiseEl, counterClockwiseEl }) {
  if (!clockwiseEl || !counterClockwiseEl) return;

  function flash(el) {
    el.classList.remove("knob-flash");
    void el.offsetWidth; // restart the CSS animation even on rapid repeat clicks
    el.classList.add("knob-flash");
  }

  function onClockwiseActivate() {
    flash(clockwiseEl);
    radioState.increaseVolume();
  }

  function onCounterClockwiseActivate() {
    flash(counterClockwiseEl);
    radioState.decreaseVolume();
  }

  clockwiseEl.addEventListener("click", onClockwiseActivate);
  counterClockwiseEl.addEventListener("click", onCounterClockwiseActivate);

  [clockwiseEl, counterClockwiseEl].forEach((el, i) => {
    const activate = i === 0 ? onClockwiseActivate : onCounterClockwiseActivate;
    el.addEventListener("keydown", (evt) => {
      if (evt.key === "Enter" || evt.key === " ") {
        evt.preventDefault();
        activate();
      }
    });
  });
}
