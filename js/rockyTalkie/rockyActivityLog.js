import { bus } from "../core/eventBus.js";
import { EVENTS } from "../core/events.js";
import { rockyLabelFor } from "../config/rockyConfig.js";

// Rocky Talkie's own activity log — separate from Motorola 8000's, since
// both radios' controllers are always wired (only the panel is hidden),
// and mixing their logs together would be confusing.
export function initRockyActivityLog(logListEl) {
  function addEntry(innerHtml) {
    const entry = document.createElement("li");
    const time = new Date().toLocaleTimeString();
    entry.innerHTML = `<span class="log-time">${time}</span> ${innerHtml}`;
    logListEl.prepend(entry);
    while (logListEl.children.length > 40) {
      logListEl.removeChild(logListEl.lastChild);
    }
  }

  const badge = (cls, glyph) => `<span class="log-state ${cls}">${glyph}</span>`;
  const radio = (msg) => addEntry(`${badge("radio", "⏻")} ${msg}`);
  const ptt = (msg) => addEntry(`${badge("ptt", "▮")} PTT: ${msg}`);

  bus.on(EVENTS.ROCKY_HOTSPOT_TOGGLED, ({ id, active }) => {
    addEntry(`${badge(active ? "on" : "off", active ? "●" : "○")} ${rockyLabelFor(id)}`);
  });
  bus.on(EVENTS.ROCKY_HOTSPOT_RESET, () => {
    logListEl.innerHTML = "";
  });

  bus.on(EVENTS.ROCKY_POWER_CHANGED, ({ power }) => radio(power === "on" ? "Radio powered ON." : "Radio powered OFF."));
  bus.on(EVENTS.ROCKY_CHANNEL_CHANGED, ({ channel, highPower, reason }) => {
    if (reason === "scan") return; // avoid log spam while cycling — see ROCKY_SCAN_ACTIVITY/ROCKY_SCAN_CHANGED instead
    radio(`Channel ${channel} (${highPower ? "High" : "Low"} power).`);
  });
  bus.on(EVENTS.ROCKY_LOCK_CHANGED, ({ locked }) => radio(locked ? "Radio locked." : "Radio unlocked."));
  bus.on(EVENTS.ROCKY_LOCKED_INPUT, ({ id }) => radio(`${rockyLabelFor(id)} pressed while locked — beep, no action.`));
  bus.on(EVENTS.ROCKY_NOTICE, ({ message }) => radio(message));

  bus.on(EVENTS.ROCKY_SCAN_CHANGED, ({ scanning }) => radio(scanning ? "Scan started." : "Scan stopped."));
  bus.on(EVENTS.ROCKY_SCAN_ACTIVITY, ({ channel }) => radio(`Activity detected on channel ${channel} — pausing scan.`));

  bus.on(EVENTS.ROCKY_PRIVACY_CODE_MODE_CHANGED, ({ active }) => {
    if (active) radio("Setting privacy code — use the Channel Flipper to choose, press any button to save.");
  });
  bus.on(EVENTS.ROCKY_PRIVACY_CODE_CHANGED, ({ code, type, confirmed }) => {
    if (confirmed) radio(`Privacy code set: ${type} ${code}.`);
  });
  bus.on(EVENTS.ROCKY_BATTERY_CHECK, ({ percent }) => radio(`Battery: ${percent}%.`));
  bus.on(EVENTS.ROCKY_VOLUME_CHANGED, ({ volume, max, reason }) => {
    if (reason === "up") radio(`Volume up → ${volume}/${max}.`);
    else if (reason === "down") radio(`Volume down → ${volume}/${max}.`);
  });

  bus.on(EVENTS.ROCKY_PTT_PRESSED, () => ptt("pressed — transmitting."));
  bus.on(EVENTS.ROCKY_PTT_RELEASED, ({ rawSeconds }) => ptt(`released — captured ${rawSeconds.toFixed(2)}s of audio.`));
  bus.on(EVENTS.ROCKY_PTT_TOO_SHORT, () =>
    ptt("Nothing to play back — the clip was shorter than the trimmed head + tail.")
  );
  bus.on(EVENTS.ROCKY_PTT_PLAYBACK_STARTED, ({ durationSeconds }) =>
    ptt(`Playing back ${durationSeconds.toFixed(2)}s.`)
  );
  bus.on(EVENTS.ROCKY_PTT_PLAYBACK_ENDED, () => ptt("Playback finished."));
  bus.on(EVENTS.ROCKY_PTT_ERROR, ({ message }) => ptt(message));

  // App-level radio/activity selection (see ui/radioSelector.js) — shown
  // in both radios' logs since only one is visible at a time, and it
  // should confirm in whichever log the user just switched to.
  bus.on(EVENTS.APP_RADIO_CHANGED, ({ radioName }) => addEntry(`${badge("on", "▣")} Radio: ${radioName} selected.`));
  bus.on(EVENTS.APP_ACTIVITY_CHANGED, ({ activityName }) =>
    addEntry(`${badge("on", "▣")} Activity: ${activityName} selected.`)
  );

  // ---- Guided activities (see activities/activityEngine.js) ----
  bus.on(EVENTS.ACTIVITY_STEP_CHANGED, ({ radioId, stepIndex, stepCount, instructions }) => {
    if (radioId !== "rockyTalkie") return;
    addEntry(`${badge("on", "▣")} Step ${stepIndex + 1}/${stepCount}: ${instructions}`);
  });
  bus.on(EVENTS.ACTIVITY_COMPLETED, ({ radioId, activityName }) => {
    if (radioId !== "rockyTalkie") return;
    addEntry(`${badge("on", "▣")} Activity complete: ${activityName}.`);
  });
}
