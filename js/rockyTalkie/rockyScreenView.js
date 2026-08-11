import { bus } from "../core/eventBus.js";
import { EVENTS } from "../core/events.js";
import { ROCKY_CONFIG } from "../config/rockyConfig.js";

// Renders rocky:* events onto every Rocky LCD instance (the skewed
// on-radio screen and the larger, undistorted auxiliary panel — see
// js/core/lcdTemplate.js) and the sidebar Radio card. Pure view — never
// calls into rockyState/rockyPttController, only listens.
export function initRockyScreenView(refs) {
  const { screens, powerDot, powerText, lockDot, lockText, volumeBarsSidebar, volumeNumber } = refs;

  let batteryTimer = null;

  function renderVolumeBars(container, count) {
    container.innerHTML = "";
    for (let i = 0; i < ROCKY_CONFIG.volumeMax; i++) {
      const seg = document.createElement("span");
      seg.className = "seg" + (i < count ? " filled" : "");
      container.appendChild(seg);
    }
  }

  bus.on(EVENTS.ROCKY_POWER_CHANGED, ({ power }) => {
    screens.forEach((s) => (s.lcdScreen.dataset.power = power));
    powerDot.classList.toggle("on", power === "on");
    powerText.textContent = power === "on" ? "On" : "Off";
    if (power === "off") {
      clearTimeout(batteryTimer);
      screens.forEach((s) => s.battery.classList.remove("visible"));
    }
  });

  bus.on(EVENTS.ROCKY_CHANNEL_CHANGED, ({ channel, highPower }) => {
    screens.forEach((s) => {
      s.channel.textContent = String(channel);
      s.powerLevel.textContent = highPower ? "H" : "L";
    });
  });

  bus.on(EVENTS.ROCKY_LOCK_CHANGED, ({ locked }) => {
    lockDot.classList.toggle("on", locked);
    lockText.textContent = locked ? "Locked" : "Unlocked";
    screens.forEach((s) => s.lockIcon.classList.toggle("active-icon", locked));
  });

  bus.on(EVENTS.ROCKY_VOLUME_CHANGED, ({ volume }) => {
    renderVolumeBars(volumeBarsSidebar, volume);
    volumeNumber.textContent = `${volume}/${ROCKY_CONFIG.volumeMax}`;
  });

  bus.on(EVENTS.ROCKY_BATTERY_CHECK, ({ percent }) => {
    screens.forEach((s) => {
      s.battery.textContent = `${percent}%`;
      s.battery.classList.add("visible");
    });
    clearTimeout(batteryTimer);
    batteryTimer = setTimeout(() => {
      screens.forEach((s) => s.battery.classList.remove("visible"));
    }, ROCKY_CONFIG.batteryCheckDurationMs);
  });
}
