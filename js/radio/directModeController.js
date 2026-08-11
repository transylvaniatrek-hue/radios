import { bus } from "../core/eventBus.js";
import { EVENTS } from "../core/events.js";
import { radioState } from "./radioState.js";
import { lockController } from "./lockController.js";
import { homeScreenController } from "./homeScreenController.js";

// Owns Direct Mode state — toggled by holding sideButton1 for ≥1s (see
// radio/directModeInput.js). Only usable while the radio is on, unlocked,
// and the currently-displayed channel contains "Viper" — matches the
// default home channel ("TC Viper") and Channel 5 ("Viper EM"), the only
// two CHANNEL_PRESETS entries with "Viper" in them. Resets to off on
// power-off, like lock/scan.
function createDirectModeController() {
  let active = false;

  function isOnViperChannel() {
    const { line1, line2 } = homeScreenController.getCurrentChannel();
    return (line1 && line1.includes("Viper")) || (line2 && line2.includes("Viper"));
  }

  function toggle() {
    if (radioState.getState().power !== "on") {
      bus.emit(EVENTS.RADIO_NOTICE, { message: "Radio is off — side button 1 has no effect." });
      return;
    }
    if (lockController.isLocked()) {
      lockController.blockedBeep("sideButton1");
      return;
    }
    if (!isOnViperChannel()) {
      bus.emit(EVENTS.RADIO_NOTICE, {
        message: 'Direct Mode requires a channel that shows "Viper" — side button 1 has no effect.',
      });
      return;
    }
    active = !active;
    bus.emit(EVENTS.RADIO_DIRECT_MODE_CHANGED, { active });
  }

  function isActive() {
    return active;
  }

  bus.on(EVENTS.RADIO_POWER_CHANGED, ({ power }) => {
    if (power === "off" && active) {
      active = false;
      bus.emit(EVENTS.RADIO_DIRECT_MODE_CHANGED, { active });
    }
  });

  return { toggle, isActive };
}

export const directModeController = createDirectModeController();
