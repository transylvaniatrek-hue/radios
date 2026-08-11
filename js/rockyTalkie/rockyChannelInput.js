import { bindHoldOrTap } from "../core/holdOrTap.js";
import { ROCKY_CONFIG } from "../config/rockyConfig.js";
import { rockyState } from "./rockyState.js";

// The Channel Flipper is split into two hotspots — Forward and Back —
// since its behavior depends on which way it's pushed (see rocky.svg):
//
//   Forward: tap = channel up,   hold 2s = lock/unlock
//   Back:    tap = channel down, hold 2s = start scan
//
// Its taps have one more job: while a privacy code is being selected
// (manual: "Use the Channel Flipper to select a code"), taps cycle the
// code instead of the channel — that's the one input Rocky Talkie's modal
// "press any button" rule (rockyState.consumeModalPress()) doesn't apply
// to, since the flipper is how you make the selection in the first place.
export function initRockyChannelInput({ forwardEl, backEl }) {
  function flash(el) {
    el.classList.remove("action-flash");
    void el.offsetWidth;
    el.classList.add("action-flash");
  }

  function tap(el, direction) {
    flash(el);
    const { settingPrivacyCode } = rockyState.getState();
    if (settingPrivacyCode) {
      rockyState.cyclePrivacyCode(direction);
      return;
    }
    if (rockyState.consumeModalPress()) return; // e.g. stops an active scan
    rockyState.changeChannel(direction);
  }

  function hold(el, action) {
    flash(el);
    if (rockyState.consumeModalPress()) return;
    action();
  }

  if (forwardEl) {
    bindHoldOrTap(forwardEl, {
      holdMs: ROCKY_CONFIG.lockHoldMs,
      onTap: () => tap(forwardEl, 1),
      onHold: () => hold(forwardEl, () => rockyState.toggleLock()),
    });
  }

  if (backEl) {
    bindHoldOrTap(backEl, {
      holdMs: ROCKY_CONFIG.lockHoldMs,
      onTap: () => tap(backEl, -1),
      onHold: () => hold(backEl, () => rockyState.startScan()),
    });
  }
}
