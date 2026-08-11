import { bindHoldOrTap } from "../core/holdOrTap.js";
import { ROCKY_CONFIG } from "../config/rockyConfig.js";
import { rockyState } from "./rockyState.js";

// Volume Up/Down exist on both the radio body and the accessory hand mic
// (see rocky.svg: volumeUp/volumeDown vs volumeUpHandset/volumeDownHandset)
// — either input drives the same shared volume. Volume itself always works
// regardless of lock, per the manual — but Volume Down has a second job:
// holding it ~2s enters privacy-code selection (manual: "Press the Volume
// Minus (-) button until CT or DCS flashes on the screen"), which *does*
// require the radio to be unlocked (checked in rockyState).
export function initRockyVolumeInput({ upEls, downEls }) {
  function flash(el) {
    el.classList.remove("knob-flash");
    void el.offsetWidth;
    el.classList.add("knob-flash");
  }

  (upEls || []).forEach((el) => {
    if (!el) return;
    const activate = () => {
      flash(el);
      if (rockyState.consumeModalPress()) return;
      rockyState.increaseVolume();
    };
    el.addEventListener("click", activate);
    el.addEventListener("keydown", (evt) => {
      if (evt.key === "Enter" || evt.key === " ") {
        evt.preventDefault();
        activate();
      }
    });
  });

  (downEls || []).forEach((el) => {
    if (!el) return;
    bindHoldOrTap(el, {
      holdMs: ROCKY_CONFIG.privacyCodeHoldMs,
      onTap: () => {
        flash(el);
        if (rockyState.consumeModalPress()) return;
        rockyState.decreaseVolume();
      },
      onHold: () => {
        flash(el);
        if (rockyState.consumeModalPress()) return;
        rockyState.enterPrivacyCodeSelect();
      },
    });
  });
}
