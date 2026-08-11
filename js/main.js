// Entry point. Wires DOM elements to the feature modules and gets out of
// the way — this file should stay thin. See ARCHITECTURE.md for the
// overall shape of the app (controllers emit events, views render them).
import { EVENTS } from "./core/events.js";
import { SPECIAL_IDS, LOCK_EXEMPT_IDS, labelFor as motorolaLabelFor } from "./config/config.js";
import { ROCKY_SPECIAL_IDS, rockyLabelFor } from "./config/rockyConfig.js";
import { initTooltip } from "./ui/tooltip.js";
import { initActivityLog } from "./ui/activityLog.js";
import { initHotspotHighlight } from "./ui/hotspotHighlight.js";
import { initViewToggle } from "./ui/viewToggle.js";
import { initRadioSelector } from "./ui/radioSelector.js";
import { instantiateLcdScreen } from "./core/lcdTemplate.js";
import { initScreenView } from "./radio/screenView.js";
import { initVolumeKnobInput } from "./radio/volumeKnobInput.js";
import { initHomeScreenInput } from "./radio/homeScreenInput.js";
import { initScanInput } from "./radio/scanInput.js";
import { initLockInput } from "./radio/lockInput.js";
import { lockController } from "./radio/lockController.js";
import { createPTTController, primeMicPermission } from "./ptt/pttController.js";
import { initPTTView } from "./ptt/pttView.js";
import { initRockyScreenView } from "./rockyTalkie/rockyScreenView.js";
import { initRockyActivityLog } from "./rockyTalkie/rockyActivityLog.js";
import { initRockyPowerInput } from "./rockyTalkie/rockyPowerInput.js";
import { initRockyChannelInput } from "./rockyTalkie/rockyChannelInput.js";
import { initRockyVolumeInput } from "./rockyTalkie/rockyVolumeInput.js";
import { initRockyPttInput } from "./rockyTalkie/rockyPttInput.js";
import { initRockyPttView } from "./rockyTalkie/rockyPttView.js";
import { createRockyPttController } from "./rockyTalkie/rockyPttController.js";
import { initRockySkewOverlay } from "./rockyTalkie/rockySkewOverlay.js";

function labelFor(id) {
  const fromMotorola = motorolaLabelFor(id);
  return fromMotorola !== id ? fromMotorola : rockyLabelFor(id);
}

document.addEventListener("DOMContentLoaded", () => {
  // Every radio's hotspots, combined, for anything that operates the same
  // way regardless of which radio it belongs to (tooltips, baseline a11y
  // attributes).
  const motorolaHotspots = Array.from(
    document.querySelectorAll("#InteractiveElements > *, #InteractiveElementsTop > *")
  );
  const rockyHotspots = Array.from(document.querySelectorAll("#InteractiveElementsRocky > *"));
  const hotspots = [...motorolaHotspots, ...rockyHotspots];

  hotspots.forEach((el) => {
    el.setAttribute("tabindex", "0");
    el.setAttribute("role", "button");
    el.setAttribute("aria-label", labelFor(el.id));
  });

  initTooltip(hotspots, document.getElementById("tooltip"));

  // ---- Radio + activity selection (app-level scaffold) ----
  initRadioSelector({
    radioSelectEl: document.getElementById("radioSelect"),
    activitySelectEl: document.getElementById("activitySelect"),
    panels: {
      motorola8000: document.getElementById("motorola8000Panel"),
      rockyTalkie: document.getElementById("rockyTalkiePanel"),
    },
  });

  // =====================================================================
  // Motorola 8000
  // =====================================================================
  initActivityLog(document.getElementById("logList"));

  initHotspotHighlight({
    hotspots: motorolaHotspots.filter((el) => !SPECIAL_IDS.has(el.id)),
    activeCountEl: document.getElementById("activeCount"),
    resetBtn: document.getElementById("resetBtn"),
    guard: (id) => {
      if (lockController.isLocked() && !LOCK_EXEMPT_IDS.has(id)) {
        lockController.blockedBeep(id);
        return true;
      }
      return false;
    },
  });

  initViewToggle({
    stageEl: document.getElementById("radioStage"),
    frontBtn: document.getElementById("viewToggleFront"),
    topBtn: document.getElementById("viewToggleTop"),
  });

  // Four LCD instances: front/top views, each with an on-radio copy and a
  // larger auxiliary copy. All four stay in sync since screenView.js
  // updates everything in `screens` together.
  const motorolaScreens = [
    instantiateLcdScreen(document.getElementById("lcdScreenHost"), "multi"),
    instantiateLcdScreen(document.getElementById("lcdScreenLargeHost"), "multi"),
    instantiateLcdScreen(document.getElementById("lcdScreenTopHost"), "single"),
    instantiateLcdScreen(document.getElementById("lcdScreenLargeTopHost"), "single"),
  ];

  initScreenView({
    screens: motorolaScreens,
    radioPowerDot: document.getElementById("radioPowerDot"),
    radioPowerText: document.getElementById("radioPowerText"),
    radioLockDot: document.getElementById("radioLockDot"),
    radioLockText: document.getElementById("radioLockText"),
    volumeBarsSidebar: document.getElementById("volumeBarsSidebar"),
    volumeNumber: document.getElementById("volumeNumber"),
  });

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

  initLockInput({
    lockEls: [document.getElementById("lock_switch")],
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

  const pttEl = document.getElementById("pttButton");
  createPTTController(pttEl);
  initPTTView({
    pttEl,
    dotEl: document.getElementById("pttDot"),
    textEl: document.getElementById("pttStatusText"),
  });
  primeMicPermission(); // one-time mic permission prompt, shared across both radios

  // =====================================================================
  // Rocky Talkie
  // =====================================================================
  initRockyActivityLog(document.getElementById("rockyLogList"));

  initHotspotHighlight({
    hotspots: rockyHotspots.filter((el) => !ROCKY_SPECIAL_IDS.has(el.id)),
    activeCountEl: document.getElementById("rockyActiveCount"),
    resetBtn: document.getElementById("rockyResetBtn"),
    toggledEvent: EVENTS.ROCKY_HOTSPOT_TOGGLED,
    resetEvent: EVENTS.ROCKY_HOTSPOT_RESET,
    // No guard: every remaining generic hotspot here (A/B channel watch)
    // stays usable even while locked, per the manual.
  });

  const rockyScreens = [
    instantiateLcdScreen(document.getElementById("rockyScreenHost"), "rocky"),
    instantiateLcdScreen(document.getElementById("rockyScreenLargeHost"), "rocky"),
  ];

  initRockySkewOverlay({
    svgEl: document.getElementById("rockyMap"),
    overlayHostEl: document.getElementById("rockyScreenHost"),
    viewBoxWidth: 2204.61,
  });

  initRockyScreenView({
    screens: rockyScreens,
    powerDot: document.getElementById("rockyPowerDot"),
    powerText: document.getElementById("rockyPowerText"),
    lockDot: document.getElementById("rockyLockDot"),
    lockText: document.getElementById("rockyLockText"),
    volumeBarsSidebar: document.getElementById("rockyVolumeBarsSidebar"),
    volumeNumber: document.getElementById("rockyVolumeNumber"),
  });

  initRockyPowerInput({ powerEl: document.getElementById("power") });
  initRockyChannelInput({ flipperEl: document.getElementById("channelFlipperLock") });
  initRockyVolumeInput({
    upEls: [document.getElementById("volumeUp"), document.getElementById("volumeUpHandset")],
    downEls: [document.getElementById("volumeDown"), document.getElementById("volumeDownHandset")],
  });

  const rockyPttEls = [document.getElementById("pushToTalk"), document.getElementById("pushToTalkHandset")];
  const rockyPttController = createRockyPttController();
  initRockyPttInput({ pttEls: rockyPttEls, controller: rockyPttController });
  initRockyPttView({
    pttEls: rockyPttEls,
    dotEl: document.getElementById("rockyPttDot"),
    textEl: document.getElementById("rockyPttStatusText"),
  });
});
