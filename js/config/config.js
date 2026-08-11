// All tunable, non-logic data for the app: hotspot labels, which hotspots
// are grouped or special-cased, and timing constants. Change numbers and
// labels here — none of this file contains behavior, so it's the one place
// to look when tuning the simulation rather than hunting through
// controllers.

// Friendly labels for each hotspot id in viperFrontMap.svg / viperTopMap.svg
// — shown in tooltips, the activity log, and aria-labels.
export const BUTTON_LABELS = {
  one: "Keypad 1",
  two: "Keypad 2",
  three: "Keypad 3",
  four: "Keypad 4",
  five: "Keypad 5",
  six: "Keypad 6",
  seven: "Keypad 7",
  eight: "Keypad 8",
  nine: "Keypad 9",
  zero: "Keypad 0",
  star: "Keypad *",
  pound: "Keypad #",
  upNavigation: "Navigation – Up",
  downNavigation: "Navigation – Down",
  leftNavigation: "Navigation – Left",
  rightNavigation: "Navigation – Right",
  home: "Home Button",
  data: "Data Button",
  menuSelectOne: "Menu / Select Softkey 1",
  menuSelectTwo: "Menu / Select Softkey 2",
  menuSelectThree: "Menu / Select Softkey 3",
  topOrangeButton: "Orange Button (Scan)",
  sixteenPositionKnobClockwise: "16-Position Channel Knob",
  sixteenPositionKnobCounterClockwise: "16-Position Channel Knob",
  threePositionABCSwitch: "A/B/C 3-Position Switch",
  onOffVolumeClockwise: "On/Off – Volume Knob",
  onOffVolumeCounterClockwise: "On/Off – Volume Knob",
  pttButton: "PTT (Push-to-Talk)",
  topSideSellectButton: "Top Side Select Button",
  sideButton1: "Side Button 1",
  sideButton2: "Side Button 2",
  batteryLatchLeft: "Battery Latch – Left",
  batteryLatchRight: "Battery Latch – Right",
  microphone: "Microphone",
  radioScreen: "Display Screen",

  // Top-view-only hotspots (viperTopMap.svg) — the rest of the top view's
  // controls are the same physical parts as the front view, just viewed
  // from a different angle; see GROUPS/LOCK_EXEMPT_IDS below for how they
  // stay in sync with their front-view counterparts.
  screen_top: "Display Screen",
  orange_top: "Orange Button (Scan)",
  _3_position_switch: "A/B/C 3-Position Switch",
  lock_switch: "Lock / Unlock Switch",
  on_off_volume_clockwise: "On/Off – Volume Knob",
  on_off_volume_counterclockwise: "On/Off – Volume Knob",
  _16_position_clockwise: "16-Position Channel Knob",
  _16_position_counterclockwise: "16-Position Channel Knob",
};

// Hotspots that are two (or more) SVG shapes representing a single physical
// control — including the same control seen from both the front and top
// views. Clicking any of them toggles the shared on/off state together.
export const GROUPS = {
  sixteenPositionKnobClockwise: "channelKnob",
  sixteenPositionKnobCounterClockwise: "channelKnob",
  _16_position_clockwise: "channelKnob",
  _16_position_counterclockwise: "channelKnob",
  threePositionABCSwitch: "abcSwitch",
  _3_position_switch: "abcSwitch",
};

export function groupOf(id) {
  return GROUPS[id] || id;
}

// Hotspot ids that exist only in the top view (viperTopMap.svg) — used by
// the activity engine's struggle-hint highlighting (activities/activityView.js)
// to know when it needs to switch views before a highlighted control
// becomes visible.
export const TOP_VIEW_ONLY_IDS = new Set([
  "screen_top",
  "orange_top",
  "_3_position_switch",
  "lock_switch",
  "on_off_volume_clockwise",
  "on_off_volume_counterclockwise",
  "_16_position_clockwise",
  "_16_position_counterclockwise",
]);

export function labelFor(id) {
  return BUTTON_LABELS[id] || id;
}

// Hotspot ids that get their own dedicated controller instead of the
// generic click-to-highlight behavior (ui/hotspotHighlight.js skips these).
export const SPECIAL_IDS = new Set([
  "pttButton",
  "onOffVolumeClockwise",
  "onOffVolumeCounterClockwise",
  "radioScreen",
  // Does nothing for now — excluded from the generic click-to-highlight
  // behavior entirely (no dedicated controller either) so clicking it has
  // no effect at all, per explicit request.
  "topSideSellectButton",
  // Held ≥1s to toggle Direct Mode (see radio/directModeController.js) —
  // only usable while the current channel display contains "Viper".
  "sideButton1",
  // Nuisance delete: removes the currently-selected channel from scan
  // until the radio is power-cycled (see radio/nuisanceDeleteController.js).
  "sideButton2",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "menuSelectOne",
  "topOrangeButton",
  // Top-view-only:
  "screen_top",
  "orange_top",
  "lock_switch",
  "on_off_volume_clockwise",
  "on_off_volume_counterclockwise",
]);

// The knobs and switches that stay usable even when the radio is locked —
// everything else beeps instead of acting (see radio/lockController.js).
// Includes both the front- and top-view hotspot ids for each physical
// control.
export const LOCK_EXEMPT_IDS = new Set([
  "onOffVolumeClockwise",
  "onOffVolumeCounterClockwise",
  "on_off_volume_clockwise",
  "on_off_volume_counterclockwise",
  "sixteenPositionKnobClockwise",
  "sixteenPositionKnobCounterClockwise",
  "_16_position_clockwise",
  "_16_position_counterclockwise",
  "threePositionABCSwitch",
  "_3_position_switch",
]);

// ---- PTT timing model ---------------------------------------------------
// The numbers to tune to match the real radio's behavior.
export const PTT_TIMING = {
  acquireMinMs: 500, // shortest time the radio takes to confirm it has signal
  acquireMaxMs: 900, // typical longest time
  acquireLongTailChance: 0.2, // sometimes it takes noticeably longer than that
  acquireLongTailExtraMinMs: 300,
  acquireLongTailExtraMaxMs: 700,
  beepDurationMs: 180, // length of the confirmation beep
  postBeepDelayMs: 250, // gap after the beep before the mic actually goes hot
  trimTailMs: 500, // amount clipped off the end of every recording
  playbackDelayMs: 1000, // wait after release before auto-playback starts
};

// Human-readable status text per PTT phase, shared by every view that shows
// PTT status (the hotspot itself, the sidebar card).
export const PTT_PHASE_TEXT = {
  idle: "Idle.",
  acquiring: "Acquiring signal…",
  keying: "Signal confirmed — keying up…",
  recording: "Transmitting — recording your voice.",
  processing: "Processing transmission…",
  playing: "Playing back your transmission…",
};

// ---- Radio power/volume model -------------------------------------------
export const RADIO_CONFIG = {
  volumeMax: 8,
  bootDurationMs: 2200, // how long the Motorola boot splash is shown
  clockRefreshMs: 15000, // how often the home-screen clock re-reads the time
  topScreenRotateMs: 1500, // how long each line shows on the top view's single-line display
  directModeHoldMs: 1000, // sideButton1 held this long toggles Direct Mode — see radio/directModeController.js
};

// ---- Home screen: channel select + mute ---------------------------------
// Only active on the regular home screen (radio powered on, not locked —
// see radio/homeScreenController.js). Selecting a channel updates the
// display's top two lines; the third line always shows the operator label
// except for the momentary mute notice.
export const CHANNEL_PRESETS = {
  one: { line1: "TC Main", line2: "FIRE" },
  two: { line1: "TC Main", line2: "Rescue 280" },
  three: { line1: "TC Main", line2: "Ops 3" },
  four: { line1: "TC Main", line2: "EMS" },
  five: { line1: "TC Main", line2: "Viper EM" },
  six: { line1: "Local Hospital", line2: "TRH" },
  seven: { line1: "TC Main", line2: "FIRE" },
  eight: { line1: "TC Main", line2: "FIRE" },
  nine: { line1: "TC Main", line2: "FIRE" },
};

export const HOME_SCREEN = {
  defaultLine1: "TC Viper",
  defaultLine2: "TAC 1",
  line3Default: "Employee",
  muteNoticeDurationMs: 1000, // how long "Tones Off"/"Tones On" shows before reverting
  lockedText: "CTRL LCK", // shown on the top view's single-line display while locked
};
