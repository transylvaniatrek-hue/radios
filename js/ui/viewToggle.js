import { bus } from "../core/eventBus.js";
import { EVENTS } from "../core/events.js";

// Switches which physical view (front/top) of the radio is displayed. This
// is purely a viewing convenience for the simulator — not part of the
// simulated radio hardware — so it owns its own tiny bit of state directly
// rather than living under radio/.
export function initViewToggle({ stageEl, frontBtn, topBtn }) {
  function setMode(mode) {
    stageEl.dataset.view = mode;
    frontBtn.classList.toggle("active", mode === "front");
    topBtn.classList.toggle("active", mode === "top");
    frontBtn.setAttribute("aria-pressed", String(mode === "front"));
    topBtn.setAttribute("aria-pressed", String(mode === "top"));
    bus.emit(EVENTS.VIEW_MODE_CHANGED, { mode });
  }

  frontBtn.addEventListener("click", () => setMode("front"));
  topBtn.addEventListener("click", () => setMode("top"));

  setMode("front");
}
