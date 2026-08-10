import { bus } from "../core/eventBus.js";
import { EVENTS } from "../core/events.js";
import { RADIO_CONFIG } from "../config/config.js";

// Renders radioState's events onto every LCD instance (the real on-radio
// screen and the larger auxiliary panel — see radio/lcdTemplate.js) and the
// sidebar "Radio" card. Pure view — never calls into radioState, only
// listens.
//
// Note: the real radio has no on-screen volume indicator — that feedback
// lives only in the sidebar Radio card (volumeBarsSidebar/volumeNumber).
export function initScreenView(refs) {
  const { screens, radioPowerDot, radioPowerText, volumeBarsSidebar, volumeNumber } = refs;

  let clockTimer = null;

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
    const text = `${hh}:${mm}`;
    screens.forEach((s) => (s.timeDisplay.textContent = text));
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
    screens.forEach((s) => (s.lcdScreen.dataset.power = power));
    radioPowerDot.classList.toggle("on", power !== "off");
    radioPowerText.textContent =
      power === "off" ? "Off" : power === "booting" ? "Booting…" : "On";

    if (power === "on") startClock();
    if (power === "off") stopClock();
  });

  bus.on(EVENTS.RADIO_VOLUME_CHANGED, ({ volume }) => {
    renderVolumeBars(volumeBarsSidebar, volume);
    volumeNumber.textContent = `${volume}/${RADIO_CONFIG.volumeMax}`;
  });
}
