import { bindHoldOrTap } from "../core/holdOrTap.js";
import { ROCKY_CONFIG } from "../config/rockyConfig.js";
import { rockyState } from "./rockyState.js";

// Power button: tap to check battery %, hold 2s to turn on/off — see
// manual "Power ON/OFF" and "Check Battery Percentage". Like every button
// except the Channel Flipper's cycling taps, it defers to
// consumeModalPress() first — while scanning or selecting a privacy code,
// pressing Power just ends that mode instead of its usual action.
export function initRockyPowerInput({ powerEl }) {
  if (!powerEl) return;

  function flash() {
    powerEl.classList.remove("action-flash");
    void powerEl.offsetWidth;
    powerEl.classList.add("action-flash");
  }

  bindHoldOrTap(powerEl, {
    holdMs: ROCKY_CONFIG.powerHoldMs,
    onTap: () => {
      flash();
      if (rockyState.consumeModalPress()) return;
      rockyState.checkBattery();
    },
    onHold: () => {
      flash();
      if (rockyState.consumeModalPress()) return;
      const { power } = rockyState.getState();
      if (power === "off") rockyState.powerOn();
      else rockyState.powerOff();
    },
  });
}
