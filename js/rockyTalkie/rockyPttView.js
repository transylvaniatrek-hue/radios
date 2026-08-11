import { bus } from "../core/eventBus.js";
import { EVENTS } from "../core/events.js";

const PHASE_TEXT = {
  idle: "Idle.",
  recording: "Transmitting — recording your voice.",
  processing: "Processing transmission…",
  playing: "Playing back your transmission…",
};

const PHASE_CLASSES = ["ptt-recording", "ptt-processing", "ptt-playing"];

// Renders Rocky's PTT phase onto both PTT hotspots (radio body + hand mic)
// and the sidebar PTT card. Pure view.
export function initRockyPttView({ pttEls, dotEl, textEl }) {
  bus.on(EVENTS.ROCKY_PTT_PHASE_CHANGED, ({ phase }) => {
    (pttEls || []).forEach((el) => {
      if (!el) return;
      el.classList.remove(...PHASE_CLASSES);
      if (phase !== "idle") el.classList.add("ptt-" + phase);
      el.setAttribute("aria-pressed", String(phase !== "idle"));
    });
    if (dotEl) dotEl.className = "ptt-dot" + (phase === "idle" ? "" : " ptt-" + phase);
    if (textEl) textEl.textContent = PHASE_TEXT[phase] || phase;
  });
}
