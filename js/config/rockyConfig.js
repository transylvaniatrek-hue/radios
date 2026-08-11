// Tunable data for Rocky Talkie — mirrors the role of config.js/radios.js
// for Motorola 8000. Sourced from the Expedition Radio user manual.

export const ROCKY_CONFIG = {
  channelMin: 1,
  channelMax: 22,
  defaultChannel: 1,
  volumeMax: 8,

  powerHoldMs: 2000, // manual: hold Power 2s to turn on/off
  lockHoldMs: 2000, // manual: hold Channel Flipper forward 2s to lock/unlock
  batteryCheckDurationMs: 2000, // how long the battery% overlay shows (power-on + manual check)

  // Cosmetic only — this simulator doesn't model battery drain.
  simulatedBatteryPercent: 92,

  // Privacy code display is static for now (Free Play doesn't yet implement
  // setting one — see manual page "Set a Privacy Code" for the real flow).
  defaultPrivacyCodeLabel: "DCS 80",

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

// Friendly labels for each hotspot id in rocky.svg — tooltips, aria-labels,
// and the (few) generic-highlight log lines.
export const ROCKY_BUTTON_LABELS = {
  channelFlipperLock: "Channel Flipper (tap: channel, hold: lock)",
  setDualChannel_TransmitOnChannelB: "A/B Dual Channel Watch",
  pushToTalk: "PTT (Push-to-Talk)",
  power: "Power (tap: battery, hold: on/off)",
  volumeUp: "Volume Up",
  volumeDown: "Volume Down",
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
  "channelFlipperLock",
  "pushToTalk",
  "power",
  "volumeUp",
  "volumeDown",
  "pushToTalkHandset",
  "volumeUpHandset",
  "volumeDownHandset",
  "screenDisplay",
]);
