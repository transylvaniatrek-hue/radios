import { EVENTS } from "../core/events.js";
import { rockyState } from "../rockyTalkie/rockyState.js";
import { ROCKY_CONFIG } from "../config/rockyConfig.js";

// Guided-activity definitions for Rocky Talkie — consumed by
// activities/activityEngine.js. Ids/names here must match the entries
// registered in config/radios.js's ACTIVITIES.rockyTalkie. See
// activities/motorolaActivities.js for Motorola 8000's.
//
// Note on timing: the manual (and the already-built, tested Free Play
// mechanic) has the Channel Flipper's lock/unlock hold at ~2 seconds, not
// the ~1 second mentioned when this activity was requested — the
// instructions below describe the real, implemented gesture rather than
// re-timing it, so what's asked of the trainee always matches what
// actually works.
function ensureReadyState() {
  const s = rockyState.getState();
  if (s.power !== "on") rockyState.powerOn();
  if (s.scanning) rockyState.stopScan();
  if (s.settingPrivacyCode) rockyState.confirmPrivacyCode();
  if (s.locked) rockyState.toggleLock();
}

export const ROCKY_ACTIVITIES = [
  {
    id: "lockUnlock",
    radioId: "rockyTalkie",
    name: "Lock / Unlock",
    setup: ensureReadyState,
    steps: [
      {
        instructions: "Lock the radio — hold the Channel Flipper toward the front (Forward) for about 2 seconds.",
        hintText: "Press and hold the front half of the Channel Flipper for about 2 seconds to lock the radio.",
        hintTargetIds: ["channelFlipperLockForward"],
        eventName: EVENTS.ROCKY_LOCK_CHANGED,
        isMatch: (p) => p.locked === true,
      },
      {
        instructions: "Now unlock it — hold the Channel Flipper Forward again for about 2 seconds.",
        hintText: "Press and hold the front half of the Channel Flipper again for about 2 seconds to unlock.",
        hintTargetIds: ["channelFlipperLockForward"],
        eventName: EVENTS.ROCKY_LOCK_CHANGED,
        isMatch: (p) => p.locked === false,
      },
    ],
  },
  {
    id: "privacyCode75to80",
    radioId: "rockyTalkie",
    name: "Change Privacy Code",
    setup() {
      ensureReadyState();
      rockyState.resetPrivacyCode(ROCKY_CONFIG.defaultPrivacyCode);
    },
    steps: [
      {
        instructions:
          'Change the privacy code to 75. Make sure the radio is unlocked, hold Volume Minus (–) for about 2 seconds until CT or DCS flashes, use the Channel Flipper to select 75, then press any button to save.',
        hintText:
          "Hold the Volume Minus (–) button for about 2 seconds until CT/DCS starts flashing, tap the Channel Flipper until the display reads 75, then press any button to confirm.",
        hintTargetIds: ["volumeDown"],
        eventName: EVENTS.ROCKY_PRIVACY_CODE_CHANGED,
        isMatch: (p) => p.confirmed && p.code === 75,
      },
      {
        instructions: "Now change it back to 80 the same way.",
        hintText:
          "Hold Volume Minus (–) for about 2 seconds again, use the Channel Flipper to land back on 80, then press any button to confirm.",
        hintTargetIds: ["volumeDown"],
        eventName: EVENTS.ROCKY_PRIVACY_CODE_CHANGED,
        isMatch: (p) => p.confirmed && p.code === 80,
      },
    ],
  },
];
