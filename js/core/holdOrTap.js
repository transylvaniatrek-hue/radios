// Binds an element to distinguish a quick tap from a press-and-hold — e.g.
// Rocky Talkie's power button ("tap to check battery, hold 2s to power
// on/off") and channel flipper ("tap to change channel, hold 2s to
// lock/unlock"). Any control where one physical button does two different
// things depending on press duration should use this instead of writing
// its own timer logic.
export function bindHoldOrTap(el, { onTap, onHold, holdMs = 2000 } = {}) {
  let timer = null;
  let fired = false;

  function start() {
    fired = false;
    clearTimeout(timer);
    timer = setTimeout(() => {
      fired = true;
      onHold && onHold();
    }, holdMs);
  }

  function end() {
    clearTimeout(timer);
    timer = null;
    if (!fired) onTap && onTap();
  }

  function cancel() {
    clearTimeout(timer);
    timer = null;
  }

  el.addEventListener("pointerdown", (evt) => {
    evt.preventDefault();
    try {
      el.setPointerCapture(evt.pointerId);
    } catch (e) {
      /* ignore */
    }
    start();
  });
  el.addEventListener("pointerup", end);
  el.addEventListener("pointercancel", cancel);

  el.addEventListener("keydown", (evt) => {
    if ((evt.key === "Enter" || evt.key === " ") && !evt.repeat) {
      evt.preventDefault();
      start();
    }
  });
  el.addEventListener("keyup", (evt) => {
    if (evt.key === "Enter" || evt.key === " ") {
      evt.preventDefault();
      end();
    }
  });
}
