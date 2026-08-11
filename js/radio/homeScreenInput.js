import { homeScreenController } from "./homeScreenController.js";

// Wires the keypad (channel select) and the mute softkey to
// homeScreenController, plus a momentary flash for click feedback — these
// are single-press action buttons, not toggles, so they don't get the
// generic persistent highlight (see SPECIAL_IDS in config.js).
export function initHomeScreenInput({ keypadEls, muteEl }) {
  function flash(el) {
    el.classList.remove("action-flash");
    void el.offsetWidth; // restart the animation even on rapid repeat clicks
    el.classList.add("action-flash");
  }

  function wire(el, onActivate) {
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
  }

  Object.entries(keypadEls).forEach(([id, el]) => {
    wire(el, () => homeScreenController.selectChannel(id));
  });

  wire(muteEl, () => homeScreenController.toggleMute());
}
