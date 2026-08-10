import { bus } from "../core/eventBus.js";
import { EVENTS } from "../core/events.js";
import { RADIO_CONFIG } from "../config/config.js";

// Renders radioState's events onto the LCD (inside the SVG foreignObject)
// and the sidebar "Radio" card. Pure view — never calls into radioState,
// only listens.
export function initScreenView(refs) {
  const {
    lcdScreen,
    timeDisplay,
    volumeHud,
    volumeHudBars,
    radioPowerDot,
    radioPowerText,
    volumeBarsSidebar,
    volumeNumber,
  } = refs;

  let clockTimer = null;
  let hudTimer = null;

  function renderVolumeBars(container, count) {
    container.innerHTML = "";
    for (let i = 0; i < RADIO_CONFIG.volumeMax; i++) {
      const seg = document.createElement("span");
      seg.className = "seg" + (i < count ? " filled" : "");
      container.appendChild(seg);
    }
  }

  function updateClock() {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    timeDisplay.textContent = `${hh}:${mm}`;
  }

  function startClock() {
    updateClock();
    if (!clockTimer) clockTimer = setInterval(updateClock, RADIO_CONFIG.clockRefreshMs);
  }

  function stopClock() {
    clearInterval(clockTimer);
    clockTimer = null;
  }

  bus.on(EVENTS.RADIO_POWER_CHANGED, ({ power }) => {
    lcdScreen.dataset.power = power;
    radioPowerDot.classList.toggle("on", power !== "off");
    radioPowerText.textContent =
      power === "off" ? "Off" : power === "booting" ? "Booting…" : "On";

    if (power === "on") startClock();
    if (power === "off") {
      stopClock();
      volumeHud.classList.remove("visible");
    }
  });

  bus.on(EVENTS.RADIO_VOLUME_CHANGED, ({ volume, reason }) => {
    renderVolumeBars(volumeBarsSidebar, volume);
    volumeNumber.textContent = `${volume}/${RADIO_CONFIG.volumeMax}`;

    // Only flash the on-screen HUD for a live, user-driven adjustment —
    // not as a side effect of powering on/off.
    if (reason === "up" || reason === "down") {
      renderVolumeBars(volumeHudBars, volume);
      volumeHud.classList.add("visible");
      clearTimeout(hudTimer);
      hudTimer = setTimeout(
        () => volumeHud.classList.remove("visible"),
        RADIO_CONFIG.volumeHudDurationMs
      );
    }
  });
}
