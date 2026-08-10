import { bus } from "../core/eventBus.js";
import { EVENTS } from "../core/events.js";
import { groupOf } from "../config/config.js";

// Generic click-to-highlight behavior for every hotspot that doesn't have
// its own dedicated controller (PTT, the volume knob, the screen). Clicking
// toggles a persistent highlight; clicking again clears it. Paired shapes
// (e.g. the 16-position channel knob's two hit-regions) share one logical
// on/off state via config.GROUPS.
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
