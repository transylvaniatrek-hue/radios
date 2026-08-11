import { scanController } from "./scanController.js";

// Wires the orange button — present on both the front and top views — to
// scanController. Both elements trigger the same shared scan state.
export function initScanInput({ orangeEls }) {
  function flash(el) {
    el.classList.remove("action-flash");
    void el.offsetWidth;
    el.classList.add("action-flash");
  }

  (orangeEls || []).forEach((el) => {
    if (!el) return;
    const activate = () => {
      flash(el);
      scanController.toggleScan();
    };
    el.addEventListener("click", activate);
    el.addEventListener("keydown", (evt) => {
      if (evt.key === "Enter" || evt.key === " ") {
        evt.preventDefault();
        activate();
      }
    });
  });
}
