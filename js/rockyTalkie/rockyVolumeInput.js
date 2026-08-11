import { rockyState } from "./rockyState.js";

// Volume Up/Down exist on both the radio body and the accessory hand mic
// (see rocky.svg: volumeUp/volumeDown vs volumeUpHandset/volumeDownHandset)
// — either input drives the same shared volume. Always works regardless of
// lock, per the manual.
export function initRockyVolumeInput({ upEls, downEls }) {
  function flash(el) {
    el.classList.remove("knob-flash");
    void el.offsetWidth;
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

  wire(upEls, () => rockyState.increaseVolume());
  wire(downEls, () => rockyState.decreaseVolume());
}
