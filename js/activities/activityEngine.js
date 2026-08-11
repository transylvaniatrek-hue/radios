import { bus } from "../core/eventBus.js";
import { EVENTS } from "../core/events.js";
import { ACTIVITY_CONFIG } from "../config/activityConfig.js";

// Generic, radio-agnostic step-based engine for guided activities
// (Lock/Unlock, Scan, Change Privacy Code, …). It knows nothing about any
// one radio's hardware — activity *definitions* (steps, a setup() to force
// a known starting state, and per-step completion/hint data) live in
// activities/motorolaActivities.js and activities/rockyActivities.js; this
// module just drives whichever one is currently selected:
//
//   1. Listens for APP_ACTIVITY_CHANGED (ui/radioSelector.js) to know which
//      definition (if any — Free Play has none) should be running.
//   2. On start, calls the definition's setup(), then subscribes to
//      exactly the one bus event its first step cares about.
//   3. When that event's payload matches the step's isMatch(), advances to
//      the next step (or emits ACTIVITY_COMPLETED if that was the last one).
//   4. If a step goes untouched for ACTIVITY_CONFIG.struggleTimeoutMs,
//      emits ACTIVITY_STRUGGLING so a view can show a stronger hint.
//
// No DOM knowledge — activities/activityView.js renders everything this
// emits onto the relevant radio's sidebar Activity card.
export function initActivityEngine(definitions) {
  const byKey = new Map(definitions.map((d) => [`${d.radioId}:${d.id}`, d]));

  let active = null; // the running definition, or null (Free Play / none)
  let stepIndex = 0;
  let stepUnsubscribe = null;
  let struggleTimer = null;

  function clearStepListener() {
    if (stepUnsubscribe) {
      stepUnsubscribe();
      stepUnsubscribe = null;
    }
    clearTimeout(struggleTimer);
    struggleTimer = null;
  }

  function armStruggleTimer() {
    clearTimeout(struggleTimer);
    const step = active.steps[stepIndex];
    struggleTimer = setTimeout(() => {
      bus.emit(EVENTS.ACTIVITY_STRUGGLING, {
        radioId: active.radioId,
        activityId: active.id,
        stepIndex,
        hintText: step.hintText || step.instructions,
        hintTargetIds: step.hintTargetIds || [],
      });
    }, ACTIVITY_CONFIG.struggleTimeoutMs);
  }

  function announceStep() {
    const step = active.steps[stepIndex];
    bus.emit(EVENTS.ACTIVITY_STEP_CHANGED, {
      radioId: active.radioId,
      activityId: active.id,
      activityName: active.name,
      stepIndex,
      stepCount: active.steps.length,
      instructions: step.instructions,
    });
  }

  function listenForCurrentStep() {
    clearStepListener();
    const step = active.steps[stepIndex];
    stepUnsubscribe = bus.on(step.eventName, (payload) => {
      if (step.isMatch(payload)) advance();
    });
    armStruggleTimer();
  }

  function advance() {
    clearStepListener();
    stepIndex++;
    if (stepIndex >= active.steps.length) {
      const { radioId, id, name } = active;
      active = null;
      bus.emit(EVENTS.ACTIVITY_COMPLETED, { radioId, activityId: id, activityName: name });
      return;
    }
    announceStep();
    listenForCurrentStep();
  }

  function stop() {
    clearStepListener();
    active = null;
    // Unconditional, not just when something was actually running — a
    // just-completed activity has already cleared `active` itself (see
    // advance()), but its card is still showing "Complete!" until
    // something tells the view to hide it. Switching to Free Play (or any
    // id with no definition) should always clear that.
    bus.emit(EVENTS.ACTIVITY_ENDED, {});
  }

  function start(definition) {
    stop();
    active = definition;
    stepIndex = 0;
    if (definition.setup) definition.setup();
    announceStep();
    listenForCurrentStep();
  }

  bus.on(EVENTS.APP_ACTIVITY_CHANGED, ({ radioId, activityId }) => {
    const definition = byKey.get(`${radioId}:${activityId}`);
    if (definition) {
      start(definition);
    } else {
      stop(); // Free Play, or an activity id with no guided definition
    }
  });
}
