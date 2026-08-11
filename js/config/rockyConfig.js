// Tunable data for Rocky Talkie — mirrors the role of config.js/radios.js
// for Motorola 8000. Sourced from the Expedition Radio user manual.

export const ROCKY_CONFIG = {
  channelMin: 1,
  channelMax: 22,
  defaultChannel: 2, // matches the reference photos ("DCS 80" on channel 2)
  volumeMax: 8,

  powerHoldMs: 2000, // manual: hold Power 2s to turn on/off
  lockHoldMs: 2000, // manual: hold Channel Flipper forward 2s to lock/unlock
  batteryCheckDurationMs: 2000, // how long the battery% overlay shows (power-on + manual check)

  // Cosmetic only — this simulator doesn't model battery drain.
  simulatedBatteryPercent: 92,

  // ---- Privacy codes ----
  // Manual: "Privacy codes 1 through 38 are CTCSS... Privacy codes 39
  // through 121 are DCS." Entering selection mode: "Press the Volume
  // Minus (-) button until CT or DCS flashes on the screen (about 2
  // seconds)."
  privacyCodeMin: 1,
  privacyCodeMax: 121,
  ctcssMax: 38, // codes 1-38 are CT, 39-121 are DCS
  defaultPrivacyCode: 80, // matches the reference photos
  privacyCodeHoldMs: 2000,

  // ---- Scan mode ----
  // Manual: cycles the first 22 channels until activity is detected, then
  // pauses on that channel for 3s before resuming.
  scanIntervalMs: 450, // how long each channel is shown while cycling
  scanActivityChance: 0.18, // simulated odds of "detecting activity" each tick
  scanPauseMs: 3000, // manual: "After 3 seconds of inactivity, it will resume scanning"

  // PTT: unlike Motorola 8000, there's no signal-acquire delay to wait
  // through — pressing PTT starts recording immediately. The TX beep
  // (manual: "confirms you pressed PTT, before and after") is just an
  // operator cue layered on top, not a gate. Trim is light and symmetric,
  // rather than one heavy tail trim.
  pttTrimStartMs: 120,
  pttTrimEndMs: 150,
  pttPlaybackDelayMs: 500,
  pttBeepFrequency: 1000,
  pttBeepDurationMs: 90,
};

// Manual: "Channels 1-7 and 15-22 are High Power... Channels 8-14 are Low
// Power." Returns true for High.
export function isHighPowerChannel(channel) {
  return !(channel >= 8 && channel <= 14);
}

// Manual: codes 1-38 show as "CT" (CTCSS), 39-121 show as "DCS".
export function privacyCodeType(code) {
  return code <= ROCKY_CONFIG.ctcssMax ? "CT" : "DCS";
}

// Friendly labels for each hotspot id in rocky.svg — tooltips, aria-labels,
// and the (few) generic-highlight log lines.
export const ROCKY_BUTTON_LABELS = {
  channelFlipperLockForward: "Channel Flipper – Forward (tap: channel up, hold: lock)",
  channelFlipperLockBack: "Channel Flipper – Back (tap: channel down, hold: scan)",
  setDualChannel_TransmitOnChannelB: "A/B Dual Channel Watch",
  pushToTalk: "PTT (Push-to-Talk)",
  power: "Power (tap: battery, hold: on/off)",
  volumeUp: "Volume Up",
  volumeDown: "Volume Down (hold: set privacy code)",
  pushToTalkHandset: "PTT (Hand Mic)",
  volumeUpHandset: "Volume Up (Hand Mic)",
  volumeDownHandset: "Volume Down (Hand Mic)",
  screenDisplay: "Display Screen",
};

export function rockyLabelFor(id) {
  return ROCKY_BUTTON_LABELS[id] || id;
}

// Hotspot ids with their own dedicated controller instead of the generic
// click-to-highlight behavior (ui/hotspotHighlight.js skips these).
export const ROCKY_SPECIAL_IDS = new Set([
  "channelFlipperLockForward",
  "channelFlipperLockBack",
  "pushToTalk",
  "power",
  "volumeUp",
  "volumeDown",
  "pushToTalkHandset",
  "volumeUpHandset",
  "volumeDownHandset",
  "screenDisplay",
]);
