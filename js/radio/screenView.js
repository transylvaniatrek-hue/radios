import { bus } from "../core/eventBus.js";
import { EVENTS } from "../core/events.js";
import { RADIO_CONFIG, HOME_SCREEN } from "../config/config.js";

// Renders every radio-related event onto every LCD instance (front/top,
// on-radio/large — see radio/lcdTemplate.js) and the sidebar Radio card.
// Pure view — never calls into a controller, only listens.
//
// Screens come in two kinds (see lcdTemplate.js):
//   "multi"  (front view) — three stacked lines, shown together, has a clock
//   "single" (top view)   — one line that rotates through the three values,
//                           no clock; shows a fixed "CTRL LCK" while locked
//
// Note: neither view shows an on-screen volume indicator — the real radio
// doesn't have one, so that feedback lives only in the sidebar Radio card.
export function initScreenView(refs) {
  const { screens, radioPowerDot, radioPowerText, radioLockDot, radioLockText, volumeBarsSidebar, volumeNumber } =
    refs;

  const multiScreens = screens.filter((s) => s.kind === "multi");
  const singleScreens = screens.filter((s) => s.kind === "single");

  let clockTimer = null;
  let toneRevertTimer = null;
  let rotateTimer = null;
  let rotateIndex = 0;
  let locked = false;
  let currentLines = {
    line1: HOME_SCREEN.defaultLine1,
    line2: HOME_SCREEN.defaultLine2,
    line3: HOME_SCREEN.line3Default,
  };

  function renderVolumeBars(container, count) {
    container.innerHTML = "";
    for (let i = 0; i < RADIO_CONFIG.volumeMax; i++) {
      const seg = document.createElement("span");
      seg.className = "seg" + (i < count ? " filled" : "");
      container.appendChild(seg);
    }
  }

  // ---- Clock (multi/front screens only) ----
  function updateClock() {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const text = `${hh}:${mm}`;
    multiScreens.forEach((s) => (s.timeDisplay.textContent = text));
  }

  function startClock() {
    updateClock();
    if (!clockTimer) clockTimer = setInterval(updateClock, RADIO_CONFIG.clockRefreshMs);
  }

  function stopClock() {
    clearInterval(clockTimer);
    clockTimer = null;
  }

  // ---- Rotating single-line display (single/top screens only) ----
  function renderRotation() {
    const values = [currentLines.line1, currentLines.line2, currentLines.line3];
    const text = values[rotateIndex % values.length];
    singleScreens.forEach((s) => (s.singleLine.textContent = text));
    rotateIndex++;
  }

  function startRotation() {
    if (locked) return; // locked screens show CTRL LCK instead — see below
    renderRotation();
    if (!rotateTimer) rotateTimer = setInterval(renderRotation, RADIO_CONFIG.topScreenRotateMs);
  }

  function stopRotation() {
    clearInterval(rotateTimer);
    rotateTimer = null;
    rotateIndex = 0;
  }

  // ---- Power ----
  bus.on(EVENTS.RADIO_POWER_CHANGED, ({ power }) => {
    screens.forEach((s) => (s.lcdScreen.dataset.power = power));
    radioPowerDot.classList.toggle("on", power !== "off");
    radioPowerText.textContent = power === "off" ? "Off" : power === "booting" ? "Booting…" : "On";

    if (power === "on") {
      startClock();
      if (locked) {
        singleScreens.forEach((s) => (s.singleLine.textContent = HOME_SCREEN.lockedText));
      } else {
        startRotation();
      }
    }
    if (power === "off") {
      stopClock();
      stopRotation();
      clearTimeout(toneRevertTimer);
      multiScreens.forEach((s) => (s.line3.textContent = HOME_SCREEN.line3Default));
    }
  });

  // ---- Volume (sidebar only — the real radio has no on-screen indicator) ----
  bus.on(EVENTS.RADIO_VOLUME_CHANGED, ({ volume }) => {
    renderVolumeBars(volumeBarsSidebar, volume);
    volumeNumber.textContent = `${volume}/${RADIO_CONFIG.volumeMax}`;
  });

  // ---- Channel select ----
  bus.on(EVENTS.RADIO_CHANNEL_CHANGED, ({ line1, line2 }) => {
    currentLines = { ...currentLines, line1, line2 };
    multiScreens.forEach((s) => {
      s.line1.textContent = line1;
      s.line2.textContent = line2;
    });
    // The single-line rotation just picks up the new values on its next
    // tick; no need to force a re-render.
  });

  // ---- Mute (multi/front screens only — see ARCHITECTURE.md) ----
  bus.on(EVENTS.RADIO_MUTE_CHANGED, ({ muted }) => {
    const noticeText = muted ? "Tones Off" : "Tones On";
    multiScreens.forEach((s) => (s.line3.textContent = noticeText));
    clearTimeout(toneRevertTimer);
    toneRevertTimer = setTimeout(() => {
      multiScreens.forEach((s) => (s.line3.textContent = HOME_SCREEN.line3Default));
    }, HOME_SCREEN.muteNoticeDurationMs);
  });

  // ---- Lock ----
  bus.on(EVENTS.RADIO_LOCK_CHANGED, ({ locked: isLocked }) => {
    locked = isLocked;
    if (radioLockDot) radioLockDot.classList.toggle("on", locked);
    if (radioLockText) radioLockText.textContent = locked ? "Locked" : "Unlocked";

    if (locked) {
      stopRotation();
      singleScreens.forEach((s) => (s.singleLine.textContent = HOME_SCREEN.lockedText));
    } else {
      startRotation();
    }
  });

  // ---- Scan ----
  bus.on(EVENTS.RADIO_SCAN_CHANGED, ({ scanning }) => {
    screens.forEach((s) => {
      if (s.scanIcon) s.scanIcon.classList.toggle("scan-active", scanning);
    });
  });
}
