// Catalog of radios and their available activities. This is the seam for
// adding a second working radio later — everything Motorola-8000-specific
// currently lives in its own panel in index.html and its own set of
// controllers under js/radio, js/ptt, etc.; Rocky Talkie has none of that
// yet, so it just shows a placeholder panel until it's built.
//
// Every radio lists "Free Play" as its default activity, plus any guided
// scenario activities built for it. This list only drives the Activity
// dropdown's options (id + display name) — the actual step-by-step
// behavior behind each non-"freePlay" id lives in
// activities/motorolaActivities.js / activities/rockyActivities.js (see
// activities/activityEngine.js), keyed by the same id. Adding an activity
// here without a matching definition there just means selecting it does
// nothing (same as Free Play) — see ARCHITECTURE.md.
export const RADIOS = [
  { id: "motorola8000", name: "Motorola 8000", implemented: true },
  { id: "rockyTalkie", name: "Rocky Talkie", implemented: true },
];

export const ACTIVITIES = {
  motorola8000: [
    { id: "freePlay", name: "Free Play" },
    { id: "lockUnlock", name: "Lock / Unlock" },
    { id: "scan", name: "Scan" },
  ],
  rockyTalkie: [
    { id: "freePlay", name: "Free Play" },
    { id: "lockUnlock", name: "Lock / Unlock" },
    { id: "privacyCode75to80", name: "Change Privacy Code" },
  ],
};

export function activitiesFor(radioId) {
  return ACTIVITIES[radioId] || [];
}
