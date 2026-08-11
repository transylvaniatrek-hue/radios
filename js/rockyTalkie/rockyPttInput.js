// Wires the PTT button — present on both the radio body (pushToTalk) and
// the accessory hand mic (pushToTalkHandset) — to a shared PTT controller.
// Either input transmits the same audio.
export function initRockyPttInput({ pttEls, controller }) {
  (pttEls || []).forEach((el) => {
    if (!el) return;
    el.addEventListener("pointerdown", (evt) => {
      evt.preventDefault();
      try {
        el.setPointerCapture(evt.pointerId);
      } catch (e) {
        /* ignore */
      }
      controller.onPress();
    });
    el.addEventListener("pointerup", () => controller.onRelease());
    el.addEventListener("pointercancel", () => controller.onRelease());
    el.addEventListener("keydown", (evt) => {
      if ((evt.key === "Enter" || evt.key === " ") && !evt.repeat) {
        evt.preventDefault();
        controller.onPress();
      }
    });
    el.addEventListener("keyup", (evt) => {
      if (evt.key === "Enter" || evt.key === " ") {
        evt.preventDefault();
        controller.onRelease();
      }
    });
  });
}
