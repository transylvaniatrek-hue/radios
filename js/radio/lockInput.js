import { lockController } from "./lockController.js";

// Wires the lock switch (top view only) to lockController. Always works —
// obviously locking/unlocking itself can't be blocked by being locked.
export function initLockInput({ lockEls }) {
  function flash(el) {
    el.classList.remove("action-flash");
    void el.offsetWidth;
    el.classList.add("action-flash");
  }

  (lockEls || []).forEach((el) => {
    if (!el) return;
    const activate = () => {
      flash(el);
      lockController.toggleLock();
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
