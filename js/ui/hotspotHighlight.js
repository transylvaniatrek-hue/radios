import { bus } from "../core/eventBus.js";
import { EVENTS } from "../core/events.js";
import { groupOf, LOCK_EXEMPT_IDS } from "../config/config.js";
import { lockController } from "../radio/lockController.js";

// Generic click-to-highlight behavior for every hotspot that doesn't have
// its own dedicated controller (PTT, the volume knob, the screen). Clicking
// toggles a persistent highlight; clicking again clears it. Paired shapes
// (e.g. the 16-position channel knob's two hit-regions) share one logical
// on/off state via config.GROUPS.
//
// Locking the radio blocks every hotspot here except the ones in
// LOCK_EXEMPT_IDS (the channel knob and A/B/C switch) — those are knobs,
// not buttons, so they keep working; everything else beeps instead.
export function initHotspotHighlight({ hotspots, activeCountEl, resetBtn }) {
  const activeGroups = new Set();

  function elementsInGroup(group) {
    return hotspots.filter((el) => groupOf(el.id) === group);
  }

  function setGroupState(group, isActive) {
    elementsInGroup(group).forEach((el) => el.classList.toggle("active", isActive));
  }

  function updateActiveCount() {
    activeCountEl.textContent = activeGroups.size;
  }

  function activate(el) {
    if (lockController.isLocked() && !LOCK_EXEMPT_IDS.has(el.id)) {
      lockController.blockedBeep(el.id);
      return;
    }
    const group = groupOf(el.id);
    const nowActive = !activeGroups.has(group);
    if (nowActive) {
      activeGroups.add(group);
    } else {
      activeGroups.delete(group);
    }
    setGroupState(group, nowActive);
    elementsInGroup(group).forEach((e) => e.setAttribute("aria-pressed", String(nowActive)));
    updateActiveCount();
    bus.emit(EVENTS.HOTSPOT_TOGGLED, { id: el.id, active: nowActive, group });
  }

  hotspots.forEach((el) => {
    el.setAttribute("aria-pressed", "false");
    el.addEventListener("click", () => activate(el));
    el.addEventListener("keydown", (evt) => {
      if (evt.key === "Enter" || evt.key === " ") {
        evt.preventDefault();
        activate(el);
      }
    });
  });

  resetBtn.addEventListener("click", () => {
    activeGroups.forEach((group) => setGroupState(group, false));
    activeGroups.clear();
    hotspots.forEach((el) => el.setAttribute("aria-pressed", "false"));
    updateActiveCount();
    bus.emit(EVENTS.HOTSPOT_RESET, {});
  });

  updateActiveCount();
}
