// Minimal publish/subscribe event bus.
//
// This is the seam the whole app is built around: "controllers" (radio
// power/volume state, the PTT hold-to-transmit flow) know nothing about the
// DOM — they just emit events describing what happened. "Views" (the LCD
// screen, the sidebar cards, the activity log) subscribe and render.
//
// The payoff: when we build activities/levels later, an ActivityEngine can
// subscribe to exactly the same events (e.g. "did the trainee press PTT
// before the radio was on?") without editing radioState.js or
// pttController.js at all.
function createEventBus() {
  const listeners = new Map(); // event name -> Set<handler>

  function on(event, handler) {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event).add(handler);
    return () => off(event, handler); // convenience unsubscribe
  }

  function off(event, handler) {
    listeners.get(event)?.delete(handler);
  }

  function emit(event, payload = {}) {
    listeners.get(event)?.forEach((handler) => {
      try {
        handler(payload);
      } catch (err) {
        // A broken subscriber (e.g. a future activity checker) should never
        // be able to take down the radio simulation itself.
        console.error(`[eventBus] handler for "${event}" threw:`, err);
      }
    });
  }

  return { on, off, emit };
}

// One shared bus for the whole app. Everything imports this same instance
// so every module hears the same events.
export const bus = createEventBus();
