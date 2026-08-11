import { bindHoldOrTap } from "../core/holdOrTap.js";
import { ROCKY_CONFIG } from "../config/rockyConfig.js";
import { rockyState } from "./rockyState.js";

// Channel Flipper: tap to change channel, hold 2s to lock/unlock — see
// manual "Select a Channel" and "Lock/Unlock Your Radio". The hold action
// always works (you must always be able to unlock); the tap action is
// blocked while locked (rockyState.changeChannel() checks that itself).
export function initRockyChannelInput({ flipperEl }) {
  if (!flipperEl) return;

  function flash() {
    flipperEl.classList.remove("action-flash");
    void flipperEl.offsetWidth;
    flipperEl.classList.add("action-flash");
  }

  bindHoldOrTap(flipperEl, {
    holdMs: ROCKY_CONFIG.lockHoldMs,
    onTap: () => {
      flash();
      rockyState.changeChannel();
    },
    onHold: () => {
      flash();
      rockyState.toggleLock();
    },
  });
}
