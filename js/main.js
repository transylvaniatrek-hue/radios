// Entry point. Wires DOM elements to the feature modules and gets out of
// the way — this file should stay thin. See ARCHITECTURE.md for the
// overall shape of the app (controllers emit events, views render them).
import { SPECIAL_IDS, labelFor } from "./config/config.js";
import { initTooltip } from "./ui/tooltip.js";
import { initActivityLog } from "./ui/activityLog.js";
import { initHotspotHighlight } from "./ui/hotspotHighlight.js";
import { initViewToggle } from "./ui/viewToggle.js";
import { initScreenView } from "./radio/screenView.js";
import { instantiateLcdScreen } from "./radio/lcdTemplate.js";
import { initVolumeKnobInput } from "./radio/volumeKnobInput.js";
import { initHomeScreenInput } from "./radio/homeScreenInput.js";
import { initScanInput } from "./radio/scanInput.js";
import { initLockInput } from "./radio/lockInput.js";
import { createPTTController, primeMicPermission } from "./ptt/pttController.js";
import { initPTTView } from "./ptt/pttView.js";

document.addEventListener("DOMContentLoaded", () => {
  // The front and top views are two separate SVGs, each with their own
  // hotspot group; combined into one flat list for anything that operates
  // generically across every hotspot (tooltips, baseline a11y attributes,
  // the generic click-to-highlight system).
  const hotspots = Array.from(document.querySelectorAll(".hotspot-group > *"));

  hotspots.forEach((el) => {
    el.setAttribute("tabindex", "0");
    el.setAttribute("role", "button");
    el.setAttribute("aria-label", labelFor(el.id));
  });

  initTooltip(hotspots, document.getElementById("tooltip"));
  initActivityLog(document.getElementById("logList"));

  initHotspotHighlight({
    hotspots: hotspots.filter((el) => !SPECIAL_IDS.has(el.id)),
    activeCountEl: document.getElementById("activeCount"),
    resetBtn: document.getElementById("resetBtn"),
  });

  // ---- Front/Top view toggle ----
  initViewToggle({
    stageEl: document.getElementById("radioStage"),
    frontBtn: document.getElementById("viewToggleFront"),
    topBtn: document.getElementById("viewToggleTop"),
  });

  // ---- Radio power/volume + LCD screens ----
  // Four instances total: front/top views, each with an on-radio copy and
  // a larger auxiliary copy. All four stay in sync since screenView.js
  // updates everything in `screens` together.
  const screens = [
    instantiateLcdScreen(document.getElementById("lcdScreenHost"), "multi"),
    instantiateLcdScreen(document.getElementById("lcdScreenLargeHost"), "multi"),
    instantiateLcdScreen(document.getElementById("lcdScreenTopHost"), "single"),
    instantiateLcdScreen(document.getElementById("lcdScreenLargeTopHost"), "single"),
  ];

  initScreenView({
    screens,
    radioPowerDot: document.getElementById("radioPowerDot"),
    radioPowerText: document.getElementById("radioPowerText"),
    radioLockDot: document.getElementById("radioLockDot"),
    radioLockText: document.getElementById("radioLockText"),
    volumeBarsSidebar: document.getElementById("volumeBarsSidebar"),
    volumeNumber: document.getElementById("volumeNumber"),
  });

  // ---- Physical controls shared between the front and top views ----
  initVolumeKnobInput({
    clockwiseEls: [
      document.getElementById("onOffVolumeClockwise"),
      document.getElementById("on_off_volume_clockwise"),
    ],
    counterClockwiseEls: [
      document.getElementById("onOffVolumeCounterClockwise"),
      document.getElementById("on_off_volume_counterclockwise"),
    ],
  });

  initScanInput({
    orangeEls: [document.getElementById("topOrangeButton"), document.getElementById("orange_top")],
  });

  // ---- Top-view-only: lock switch ----
  initLockInput({
    lockEls: [document.getElementById("lock_switch")],
  });

  // ---- Front-view-only: keypad channel select + mute softkey ----
  initHomeScreenInput({
    keypadEls: {
      one: document.getElementById("one"),
      two: document.getElementById("two"),
      three: document.getElementById("three"),
      four: document.getElementById("four"),
      five: document.getElementById("five"),
      six: document.getElementById("six"),
      seven: document.getElementById("seven"),
      eight: document.getElementById("eight"),
      nine: document.getElementById("nine"),
    },
    muteEl: document.getElementById("menuSelectOne"),
  });

  // ---- Push-to-talk (front view only) ----
  const pttEl = document.getElementById("pttButton");
  createPTTController(pttEl);
  initPTTView({
    pttEl,
    dotEl: document.getElementById("pttDot"),
    textEl: document.getElementById("pttStatusText"),
  });
  primeMicPermission();
});
