// Tunable timing for the guided-activity engine — see js/activities/.
export const ACTIVITY_CONFIG = {
  // How long a step can go untouched before a hint + button highlight
  // appears (activities/activityEngine.js's struggle detection).
  struggleTimeoutMs: 15000,
};
