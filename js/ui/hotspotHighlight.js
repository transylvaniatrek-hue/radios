import { bus } from "../core/eventBus.js";
import { EVENTS } from "../core/events.js";
import { groupOf as defaultGroupOf } from "../config/config.js";

// Generic click-to-highlight behavior for every hotspot that doesn't have
// its own dedicated controller. Clicking toggles a persistent highlight;
// clicking again clears it. Paired shapes (e.g. the 16-position channel
// knob's two hit-regions) share one logical on/off state via a `groupOf`
// function.
//
// Radio-agnostic on purpose: this is shared infrastructure called once per
// radio (each with its own hotspot list, count/reset elements, and event
// names), not owned by any one radio's lock system. A radio that wants
// locked hotspots to beep instead of act passes a `guard(id)` — return
// true to block the action; the guard itself is responsible for any
// feedback (beep, log entry). See main.js for how Motorola 8000 wires its
// guard through lockController, and note Rocky Talkie passes none, since
// its only remaining generic hotspot (A/B channel swap) stays usable even
// while locked per its manual.
export function initHotspotHighlight({
  hotspots,
  activeCountEl,
  resetBtn,
  groupOf = defaultGroupOf,
  guard = null,
  toggledEvent = EVENTS.HOTSPOT_TOGGLED,
  resetEvent = EVENTS.HOTSPOT_RESET,
}) {
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
    if (guard && guard(el.id)) return;
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
    bus.emit(toggledEvent, { id: el.id, active: nowActive, group });
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
    bus.emit(resetEvent, {});
  });

  updateActiveCount();
}
