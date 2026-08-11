import { bus } from "../core/eventBus.js";
import { EVENTS } from "../core/events.js";
import { playLockedBeep } from "../core/beep.js";

// Owns lock/unlock state. Locking the radio still allows the volume knob,
// channel knob, and A/B/C switch to work (see LOCK_EXEMPT_IDS in
// config.js) — every other button just beeps instead of doing anything.
// Other controllers (homeScreenController, pttController, scanController,
// hotspotHighlight) call blockedBeep(id) instead of acting when
// isLocked() is true.
function createLockController() {
  let locked = false;

  function toggleLock() {
    locked = !locked;
    bus.emit(EVENTS.RADIO_LOCK_CHANGED, { locked });
  }

  function isLocked() {
    return locked;
  }

  function blockedBeep(id) {
    playLockedBeep();
    bus.emit(EVENTS.RADIO_LOCKED_INPUT, { id });
  }

  return { toggleLock, isLocked, blockedBeep };
}

export const lockController = createLockController();
