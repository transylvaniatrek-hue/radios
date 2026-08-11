import { nuisanceDeleteController } from "./nuisanceDeleteController.js";

// Wires sideButton2 — a simple click/tap action (no hold gesture, unlike
// sideButton1's Direct Mode toggle).
export function initNuisanceDeleteInput({ el }) {
  if (!el) return;

  function flash() {
    el.classList.remove("action-flash");
    void el.offsetWidth;
    el.classList.add("action-flash");
  }

  const activate = () => {
    flash();
    nuisanceDeleteController.nuisanceDelete();
  };

  el.addEventListener("click", activate);
  el.addEventListener("keydown", (evt) => {
    if (evt.key === "Enter" || evt.key === " ") {
      evt.preventDefault();
      activate();
    }
  });
}
