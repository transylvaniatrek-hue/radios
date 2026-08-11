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
};
