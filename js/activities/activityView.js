import { bus } from "../core/eventBus.js";
import { EVENTS } from "../core/events.js";

// Renders activities/activityEngine.js's events onto one radio's sidebar
// Activity card, and highlights the hinted control(s) on that radio's SVG
// when the trainee seems stuck. Pure view — never calls into
// activityEngine.js or any radio controller. Call once per radio (see
// main.js), each with its own card elements and hint-lookup functions, so
// Motorola 8000's and Rocky Talkie's cards/highlights never cross-react to
// each other's activity.
//
// `findHintEl(id)` resolves a hint target id to that radio's DOM element.
// `showView(hintTargetIds)` is Motorola-only — it switches to whichever
// physical view (front/top) actually contains the hinted control; Rocky
// Talkie has a single view, so it's omitted there.
export function initActivityView({ radioId, cardEl, progressEl, instructionsEl, hintEl, findHintEl, showView }) {
  let highlightedEls = [];

  function clearHighlight() {
    highlightedEls.forEach((el) => el.classList.remove("hint-pulse"));
    highlightedEls = [];
    if (hintEl) {
      hintEl.hidden = true;
      hintEl.textContent = "";
    }
  }

  function isThisRadio(payload) {
    return payload.radioId === radioId;
  }

  bus.on(EVENTS.ACTIVITY_STEP_CHANGED, (payload) => {
    if (!isThisRadio(payload)) return;
    clearHighlight();
    if (cardEl) cardEl.hidden = false;
    if (progressEl) {
      progressEl.textContent = `${payload.activityName} — Step ${payload.stepIndex + 1} of ${payload.stepCount}`;
    }
    if (instructionsEl) {
      instructionsEl.textContent = payload.instructions;
      instructionsEl.classList.remove("activity-complete");
    }
  });

  bus.on(EVENTS.ACTIVITY_STRUGGLING, (payload) => {
    if (!isThisRadio(payload)) return;
    if (hintEl) {
      hintEl.textContent = payload.hintText;
      hintEl.hidden = false;
    }
    const ids = payload.hintTargetIds || [];
    highlightedEls = ids.map((id) => findHintEl && findHintEl(id)).filter(Boolean);
    highlightedEls.forEach((el) => el.classList.add("hint-pulse"));
    if (showView) showView(ids);
  });

  bus.on(EVENTS.ACTIVITY_COMPLETED, (payload) => {
    if (!isThisRadio(payload)) return;
    clearHighlight();
    if (cardEl) cardEl.hidden = false;
    if (progressEl) progressEl.textContent = `${payload.activityName} — Complete!`;
    if (instructionsEl) {
      instructionsEl.textContent = "Nice work — you completed every step.";
      instructionsEl.classList.add("activity-complete");
    }
  });

  bus.on(EVENTS.ACTIVITY_ENDED, () => {
    clearHighlight();
    if (cardEl) cardEl.hidden = true;
  });
}
