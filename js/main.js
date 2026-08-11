// Entry point. Wires DOM elements to the feature modules and gets out of
// the way — this file should stay thin. See ARCHITECTURE.md for the
// overall shape of the app (controllers emit events, views render them).
import { SPECIAL_IDS, labelFor } from "./config/config.js";
import { initTooltip } from "./ui/tooltip.js";
import { initActivityLog } from "./ui/activityLog.js";
import { initHotspotHighlight } from "./ui/hotspotHighlight.js";
import { initScreenView } from "./radio/screenView.js";
import { instantiateLcdScreen } from "./radio/lcdTemplate.js";
import { initVolumeKnobInput } from "./radio/volumeKnobInput.js";
import { initHomeScreenInput } from "./radio/homeScreenInput.js";
import { createPTTController, primeMicPermission } from "./ptt/pttController.js";
import { initPTTView } from "./ptt/pttView.js";

document.addEventListener("DOMContentLoaded", () => {
  const svg = document.getElementById("radioMap");
  const hotspots = Array.from(svg.querySelectorAll("#InteractiveElements > *"));

  // Baseline accessibility wiring shared by every hotspot, regardless of
  // which controller (if any) owns its behavior.
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

  // ---- Radio power/volume + LCD screen(s) ----
  // Two instances of the same template: the real on-radio screen, and the
  // larger auxiliary panel next to it. Both stay in sync automatically
  // since screenView.js updates everything in `screens` together.
  const screens = [
    instantiateLcdScreen(document.getElementById("lcdScreenHost")),
    instantiateLcdScreen(document.getElementById("lcdScreenLargeHost")),
  ];

  initScreenView({
    screens,
    radioPowerDot: document.getElementById("radioPowerDot"),
    radioPowerText: document.getElementById("radioPowerText"),
    volumeBarsSidebar: document.getElementById("volumeBarsSidebar"),
    volumeNumber: document.getElementById("volumeNumber"),
  });

  initVolumeKnobInput({
    clockwiseEl: document.getElementById("onOffVolumeClockwise"),
    counterClockwiseEl: document.getElementById("onOffVolumeCounterClockwise"),
  });

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

  // ---- Push-to-talk ----
  const pttEl = document.getElementById("pttButton");
  createPTTController(pttEl);
  initPTTView({
    pttEl,
    dotEl: document.getElementById("pttDot"),
    textEl: document.getElementById("pttStatusText"),
  });
  primeMicPermission();
});
