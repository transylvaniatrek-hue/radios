// All tunable, non-logic data for the app: hotspot labels, which hotspots
// are grouped or special-cased, and timing constants. Change numbers and
// labels here — none of this file contains behavior, so it's the one place
// to look when tuning the simulation rather than hunting through
// controllers.

// Friendly labels for each hotspot id in viperFrontMap.svg — shown in
// tooltips, the activity log, and aria-labels.
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
  topOrangeButton: "Orange Button",
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
};

// Hotspots that are two SVG shapes representing a single physical control.
// Clicking either half toggles both halves together (generic highlight
// hotspots only — the on/off-volume knob has its own dedicated logic, see
// radio/volumeKnobInput.js, since it isn't a simple on/off toggle).
export const GROUPS = {
  sixteenPositionKnobClockwise: "channelKnob",
  sixteenPositionKnobCounterClockwise: "channelKnob",
};

export function groupOf(id) {
  return GROUPS[id] || id;
}

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
]);

// ---- Home screen: channel select + mute ---------------------------------
// Only active on the regular home screen (radio powered on, no settings
// menu — see radio/homeScreenController.js). Selecting a channel updates
// the LCD's top two lines; the third line always shows the operator label
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
  line3Default: "Employee",
  muteNoticeDurationMs: 1000, // how long "Tones Off"/"Tones On" shows before reverting
};

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
  idle: "Idle — hold the PTT button to transmit.",
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
  volumeHudDurationMs: 1500, // how long the on-screen volume HUD stays visible
  clockRefreshMs: 15000, // how often the home-screen clock re-reads the time
};
