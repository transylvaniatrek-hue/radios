// Catalog of every event name emitted on the shared bus (see eventBus.js).
//
// Import EVENTS.WHATEVER instead of typing string literals: a typo in a
// string silently fails (the handler just never fires), a typo in an
// imported constant is a ReferenceError you catch immediately. This file
// also doubles as documentation of everything the app can currently notify
// about — a useful map when wiring up activities/levels later.
export const EVENTS = {
  // Generic click-to-highlight hotspots (keypad, nav ring, softkeys, etc.)
  // — see ui/hotspotHighlight.js
  HOTSPOT_TOGGLED: "hotspot:toggled", // { id, active, group }
  HOTSPOT_RESET: "hotspot:reset", // {}

  // Radio power/volume state — see radio/radioState.js
  RADIO_POWER_CHANGED: "radio:power-changed", // { power: 'off'|'booting'|'on' }
  RADIO_VOLUME_CHANGED: "radio:volume-changed", // { volume, max, reason: 'power-on'|'up'|'down'|'power-off' }
  RADIO_BOOT_STARTED: "radio:boot-started", // {}
  RADIO_BOOT_COMPLETE: "radio:boot-complete", // {}
  RADIO_NOTICE: "radio:notice", // { message } — minor informational blurbs (e.g. "already off")

  // Home-screen channel select + mute — see radio/homeScreenController.js
  RADIO_CHANNEL_CHANGED: "radio:channel-changed", // { id, line1, line2 }
  RADIO_MUTE_CHANGED: "radio:mute-changed", // { muted }

  // Lock/unlock — see radio/lockController.js. Locking still allows the
  // volume and channel knobs (and the A/B/C switch) to work; every other
  // button beeps instead of acting while locked.
  RADIO_LOCK_CHANGED: "radio:lock-changed", // { locked }
  RADIO_LOCKED_INPUT: "radio:locked-input", // { id } — a button was pressed while locked (beep, no action)

  // Scan mode — see radio/scanController.js
  RADIO_SCAN_CHANGED: "radio:scan-changed", // { scanning }

  // PTT hold-to-transmit lifecycle — see ptt/pttController.js
  PTT_PHASE_CHANGED: "ptt:phase-changed", // { phase: 'idle'|'acquiring'|'keying'|'recording'|'processing'|'playing' }
  PTT_PRESSED: "ptt:pressed", // { supported }
  PTT_ACQUIRING: "ptt:acquiring", // { acquireMs }
  PTT_SIGNAL_CONFIRMED: "ptt:signal-confirmed", // {}
  PTT_ABORTED: "ptt:aborted", // { reason: 'released-before-signal'|'released-during-keyup'|'mic-denied' }
  PTT_RECORDING_STARTED: "ptt:recording-started", // {}
  PTT_RELEASED: "ptt:released", // { rawSeconds }
  PTT_TOO_SHORT: "ptt:too-short", // {} — clip was entirely inside the trimmed tail
  PTT_PLAYBACK_STARTED: "ptt:playback-started", // { durationSeconds, trimMs }
  PTT_PLAYBACK_ENDED: "ptt:playback-ended", // {}
  PTT_ERROR: "ptt:error", // { message }

  // Microphone permission priming on page load — see ptt/pttController.js
  MIC_PERMISSION_RESULT: "mic:permission-result", // { granted, supported }

  // Front/top view toggle — purely a viewing convenience for this
  // simulator, not part of the simulated radio hardware. See ui/viewToggle.js.
  VIEW_MODE_CHANGED: "view:mode-changed", // { mode: 'front'|'top' }

  // Radio/activity selection — the app-level scaffold, not simulated
  // hardware. See ui/radioSelector.js and config/radios.js. No activity
  // engine exists yet; APP_ACTIVITY_CHANGED is the seam it will hook into.
  APP_RADIO_CHANGED: "app:radio-changed", // { radioId, radioName }
  APP_ACTIVITY_CHANGED: "app:activity-changed", // { radioId, activityId, activityName }

  // ---- Rocky Talkie — a second, independent radio (see js/rockyTalkie/) ----
  // Deliberately a separate "rocky:" namespace, not reused "radio:"/"ptt:"
  // names — both radios' controllers are always live in the DOM (only the
  // panel is hidden when not selected), so sharing event names would make
  // Motorola 8000's views react to Rocky Talkie's state changes and vice
  // versa.
  ROCKY_POWER_CHANGED: "rocky:power-changed", // { power: 'off'|'on' }
  ROCKY_CHANNEL_CHANGED: "rocky:channel-changed", // { channel, highPower }
  ROCKY_LOCK_CHANGED: "rocky:lock-changed", // { locked }
  ROCKY_LOCKED_INPUT: "rocky:locked-input", // { id } — blocked action while locked (beep)
  ROCKY_BATTERY_CHECK: "rocky:battery-check", // { percent } — transient overlay (power-on + manual tap)
  ROCKY_NOTICE: "rocky:notice", // { message } — minor informational blurbs (e.g. "radio is off")

  ROCKY_PTT_PHASE_CHANGED: "rocky:ptt-phase-changed", // { phase: 'idle'|'recording'|'processing'|'playing' }
  ROCKY_PTT_PRESSED: "rocky:ptt-pressed", // {}
  ROCKY_PTT_RELEASED: "rocky:ptt-released", // { rawSeconds }
  ROCKY_PTT_TOO_SHORT: "rocky:ptt-too-short", // {}
  ROCKY_PTT_PLAYBACK_STARTED: "rocky:ptt-playback-started", // { durationSeconds }
  ROCKY_PTT_PLAYBACK_ENDED: "rocky:ptt-playback-ended", // {}
  ROCKY_PTT_ERROR: "rocky:ptt-error", // { message }

  ROCKY_VOLUME_CHANGED: "rocky:volume-changed", // { volume, max, reason: 'up'|'down' }

  // Generic click-to-highlight, Rocky Talkie's own instance (kept separate
  // from HOTSPOT_TOGGLED/RESET so it logs to Rocky's own activity log
  // instead of Motorola 8000's — see ui/hotspotHighlight.js).
  ROCKY_HOTSPOT_TOGGLED: "rocky:hotspot-toggled", // { id, active, group }
  ROCKY_HOTSPOT_RESET: "rocky:hotspot-reset", // {}
};
