import { bus } from "../core/eventBus.js";
import { EVENTS } from "../core/events.js";
import { radioState } from "./radioState.js";
import { lockController } from "./lockController.js";
import { homeScreenController } from "./homeScreenController.js";

// Owns "nuisance delete" state (sideButton2): removes the currently
// selected channel from scan rotation until the radio is power-cycled.
// Motorola 8000's scan mode is a simple on/off toggle (see
// radio/scanController.js), not a real channel-cycling simulation, so this
// just tracks *which* channels have been nuisance-deleted — ready for a
// future scan-cycling feature to consult — and reports the action via the
// activity log in the meantime.
function createNuisanceDeleteController() {
  let deleted = new Set();

  function nuisanceDelete() {
    if (radioState.getState().power !== "on") {
      bus.emit(EVENTS.RADIO_NOTICE, { message: "Radio is off — side button 2 has no effect." });
      return;
    }
    if (lockController.isLocked()) {
      lockController.blockedBeep("sideButton2");
      return;
    }
    const channel = homeScreenController.getCurrentChannel();
    const key = channel.id || "default";
    if (deleted.has(key)) {
      bus.emit(EVENTS.RADIO_NOTICE, {
        message: `${channel.line1} / ${channel.line2} is already removed from scan.`,
      });
      return;
    }
    deleted.add(key);
    bus.emit(EVENTS.RADIO_NUISANCE_DELETE, { channelId: channel.id, line1: channel.line1, line2: channel.line2 });
  }

  function isDeleted(channelId) {
    return deleted.has(channelId || "default");
  }

  // Power-cycling clears every nuisance delete, per the manual behavior
  // this simulates ("until the radio is turned off and then back on again").
  bus.on(EVENTS.RADIO_POWER_CHANGED, ({ power }) => {
    if (power === "off") deleted = new Set();
  });

  return { nuisanceDelete, isDeleted };
}

export const nuisanceDeleteController = createNuisanceDeleteController();
