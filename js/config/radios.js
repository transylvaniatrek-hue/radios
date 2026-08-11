// Catalog of radios and their available activities. This is the seam for
// adding a second working radio later — everything Motorola-8000-specific
// currently lives in its own panel in index.html and its own set of
// controllers under js/radio, js/ptt, etc.; Rocky Talkie has none of that
// yet, so it just shows a placeholder panel until it's built.
//
// Every radio lists "Free Play" as its default (and, for now, only)
// activity. Add more entries per radio as scenario activities get built —
// see ARCHITECTURE.md for how an activity engine would hook into this.
export const RADIOS = [
  { id: "motorola8000", name: "Motorola 8000", implemented: true },
  { id: "rockyTalkie", name: "Rocky Talkie", implemented: false },
];

export const ACTIVITIES = {
  motorola8000: [{ id: "freePlay", name: "Free Play" }],
  rockyTalkie: [{ id: "freePlay", name: "Free Play" }],
};

export function activitiesFor(radioId) {
  return ACTIVITIES[radioId] || [];
}
