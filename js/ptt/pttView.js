import { bus } from "../core/eventBus.js";
import { EVENTS } from "../core/events.js";
import { PTT_PHASE_TEXT } from "../config/config.js";

const PHASE_CLASSES = ["ptt-acquiring", "ptt-keying", "ptt-recording", "ptt-processing", "ptt-playing"];

// Renders PTT phase changes onto the PTT hotspot itself (glow color) and
// the sidebar "Push-to-Talk" status card. Pure view — never calls into
// pttController, only listens.
export function initPTTView({ pttEl, dotEl, textEl }) {
  bus.on(EVENTS.PTT_PHASE_CHANGED, ({ phase }) => {
    pttEl.classList.remove(...PHASE_CLASSES);
    if (phase !== "idle") pttEl.classList.add("ptt-" + phase);
    pttEl.setAttribute("aria-pressed", String(phase !== "idle"));

    dotEl.className = "ptt-dot" + (phase === "idle" ? "" : " ptt-" + phase);
    textEl.textContent = PTT_PHASE_TEXT[phase] || phase;
  });
}
