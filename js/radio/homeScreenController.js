import { bus } from "../core/eventBus.js";
import { EVENTS } from "../core/events.js";
import { CHANNEL_PRESETS } from "../config/config.js";
import { radioState } from "./radioState.js";
import { lockController } from "./lockController.js";

// Owns channel selection + mute state for the regular home screen. Like
// radioState.js, this has zero DOM knowledge — it just emits events. Kept
// separate from radioState.js because it's a distinct concern (what's
// shown/selected vs. power/volume) even though both live under radio/.
function createHomeScreenController() {
  let muted = false;

  // These controls only do anything on the regular home screen — the radio
  // must be powered on (not off, not mid-boot). There's no settings/menu
  // mode yet; when one exists, gate on that here too.
  function isUsable() {
    return radioState.getState().power === "on";
  }

  function selectChannel(id) {
    const preset = CHANNEL_PRESETS[id];
    if (!preset) return;
    if (!isUsable()) {
      bus.emit(EVENTS.RADIO_NOTICE, { message: "Radio is off — keypad has no effect." });
      return;
    }
    if (lockController.isLocked()) {
      lockController.blockedBeep(id);
      return;
    }
    bus.emit(EVENTS.RADIO_CHANNEL_CHANGED, { id, ...preset });
  }

  function toggleMute() {
    if (!isUsable()) {
      bus.emit(EVENTS.RADIO_NOTICE, { message: "Radio is off — softkey has no effect." });
      return;
    }
    if (lockController.isLocked()) {
      lockController.blockedBeep("menuSelectOne");
      return;
    }
    muted = !muted;
    bus.emit(EVENTS.RADIO_MUTE_CHANGED, { muted });
  }

  return { selectChannel, toggleMute };
}

export const homeScreenController = createHomeScreenController();
