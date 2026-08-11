import { bus } from "../core/eventBus.js";
import { EVENTS } from "../core/events.js";
import { radioState } from "./radioState.js";
import { lockController } from "./lockController.js";

// Owns scan on/off state, toggled by the orange button (present on both the
// front and top views — see radio/scanInput.js). Like the other radio/*
// controllers, no DOM knowledge — it just emits events.
function createScanController() {
  let scanning = false;

  function toggleScan() {
    if (radioState.getState().power !== "on") {
      bus.emit(EVENTS.RADIO_NOTICE, { message: "Radio is off — orange button has no effect." });
      return;
    }
    if (lockController.isLocked()) {
      lockController.blockedBeep("topOrangeButton");
      return;
    }
    scanning = !scanning;
    bus.emit(EVENTS.RADIO_SCAN_CHANGED, { scanning });
  }

  return { toggleScan };
}

export const scanController = createScanController();
