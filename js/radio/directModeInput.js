import { bindHoldOrTap } from "../core/holdOrTap.js";
import { RADIO_CONFIG } from "../config/config.js";
import { directModeController } from "./directModeController.js";

// Wires sideButton1: held ≥1s toggles Direct Mode (see
// directModeController.js). A quick tap does nothing — there's no separate
// short-press action defined for this button.
export function initDirectModeInput({ el }) {
  if (!el) return;

  function flash() {
    el.classList.remove("action-flash");
    void el.offsetWidth; // restart the animation even on rapid repeat presses
    el.classList.add("action-flash");
  }

  bindHoldOrTap(el, {
    holdMs: RADIO_CONFIG.directModeHoldMs,
    onHold: () => {
      flash();
      directModeController.toggle();
    },
  });
}
