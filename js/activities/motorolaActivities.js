import { EVENTS } from "../core/events.js";
import { radioState } from "../radio/radioState.js";
import { lockController } from "../radio/lockController.js";
import { scanController } from "../radio/scanController.js";

// Guided-activity definitions for Motorola 8000 — consumed by
// activities/activityEngine.js. Ids/names here must match the entries
// registered in config/radios.js's ACTIVITIES.motorola8000 (that list
// drives the Activity dropdown; this one drives the actual behavior).
// See activities/rockyActivities.js for Rocky Talkie's.
export const MOTOROLA_ACTIVITIES = [
  {
    id: "lockUnlock",
    radioId: "motorola8000",
    name: "Lock / Unlock",
    // Known starting state: powered on and unlocked, so the first step
    // ("lock it") is unambiguous.
    setup() {
      if (radioState.getState().power === "off") radioState.powerOn();
      if (lockController.isLocked()) lockController.toggleLock();
    },
    steps: [
      {
        instructions: "Lock the radio using the lock switch (Top View, next to the antenna).",
        hintText: "Switch to the Top View, then click/tap the lock switch to lock the radio.",
        hintTargetIds: ["lock_switch"],
        eventName: EVENTS.RADIO_LOCK_CHANGED,
        isMatch: (p) => p.locked === true,
      },
      {
        instructions: "Now unlock the radio — toggle the same lock switch again.",
        hintText: "On the Top View, click/tap the lock switch again to unlock the radio.",
        hintTargetIds: ["lock_switch"],
        eventName: EVENTS.RADIO_LOCK_CHANGED,
        isMatch: (p) => p.locked === false,
      },
    ],
  },
  {
    id: "scan",
    radioId: "motorola8000",
    name: "Scan",
    setup() {
      if (radioState.getState().power === "off") radioState.powerOn();
      if (lockController.isLocked()) lockController.toggleLock();
      if (scanController.isScanning()) scanController.toggleScan();
    },
    steps: [
      {
        instructions: "Turn the radio into Scan mode — press the orange button.",
        hintText: "Click/tap the orange button (front or top view) to start scanning.",
        hintTargetIds: ["topOrangeButton", "orange_top"],
        eventName: EVENTS.RADIO_SCAN_CHANGED,
        isMatch: (p) => p.scanning === true,
      },
      {
        instructions: "Now take the radio out of Scan mode — press the orange button again.",
        hintText: "Click/tap the orange button again to stop scanning.",
        hintTargetIds: ["topOrangeButton", "orange_top"],
        eventName: EVENTS.RADIO_SCAN_CHANGED,
        isMatch: (p) => p.scanning === false,
      },
    ],
  },
];
