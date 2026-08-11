import { bus } from "../core/eventBus.js";
import { EVENTS } from "../core/events.js";
import { CHANNEL_PRESETS, HOME_SCREEN } from "../config/config.js";
import { radioState } from "./radioState.js";
import { lockController } from "./lockController.js";

// Owns channel selection + mute state for the regular home screen. Like
// radioState.js, this has zero DOM knowledge — it just emits events. Kept
// separate from radioState.js because it's a distinct concern (what's
// shown/selected vs. power/volume) even though both live under radio/.
function createHomeScreenController() {
  let muted = false;
  // The currently-selected channel — null until the user picks one via the
  // keypad, in which case the screen is still showing the template's
  // hardcoded default (see getCurrentChannel()). Read by
  // directModeController.js (the "on a channel that says Viper" check) and
  // nuisanceDeleteController.js (which channel to remove from scan).
  let currentChannel = null;

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
    currentChannel = { id, ...preset };
    bus.emit(EVENTS.RADIO_CHANNEL_CHANGED, { id, ...preset });
  }

  // Always returns a valid { id, line1, line2 } — id is null for the
  // template's default (unselected) state, which is what's actually shown
  // on screen until the first keypad press.
  function getCurrentChannel() {
    return currentChannel || { id: null, line1: HOME_SCREEN.defaultLine1, line2: HOME_SCREEN.defaultLine2 };
  }

  // Reset to the default (unselected) state on power-off, matching the
  // real radio coming back up on its home channel rather than remembering
  // the last one selected.
  bus.on(EVENTS.RADIO_POWER_CHANGED, ({ power }) => {
    if (power === "off") currentChannel = null;
  });

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

  return { selectChannel, toggleMute, getCurrentChannel };
}

export const homeScreenController = createHomeScreenController();
