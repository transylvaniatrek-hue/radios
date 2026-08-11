import { bus } from "../core/eventBus.js";
import { EVENTS } from "../core/events.js";
import { labelFor } from "../config/config.js";

const MAX_ENTRIES = 40;

const ABORT_MESSAGES = {
  "released-before-signal": "Released before signal was confirmed — no transmission sent.",
  "released-during-keyup": "Released during key-up delay — no transmission sent.",
  "mic-denied": "Microphone access denied or unavailable — cannot transmit.",
};

// The only module that turns bus events into English. Every other module
// emits facts (structured payloads); this one is purely presentation, so
// wording can change here without touching any controller.
export function initActivityLog(logListEl) {
  function addEntry(innerHtml) {
    const entry = document.createElement("li");
    const time = new Date().toLocaleTimeString();
    entry.innerHTML = `<span class="log-time">${time}</span> ${innerHtml}`;
    logListEl.prepend(entry);
    while (logListEl.children.length > MAX_ENTRIES) {
      logListEl.removeChild(logListEl.lastChild);
    }
  }

  const badge = (cls, glyph) => `<span class="log-state ${cls}">${glyph}</span>`;
  const radio = (msg) => addEntry(`${badge("radio", "⏻")} ${msg}`);
  const ptt = (msg) => addEntry(`${badge("ptt", "▮")} PTT: ${msg}`);

  // ---- Generic hotspots ----
  bus.on(EVENTS.HOTSPOT_TOGGLED, ({ id, active }) => {
    addEntry(`${badge(active ? "on" : "off", active ? "●" : "○")} ${labelFor(id)}`);
  });
  bus.on(EVENTS.HOTSPOT_RESET, () => {
    logListEl.innerHTML = "";
  });

  // ---- Radio power/volume ----
  bus.on(EVENTS.RADIO_BOOT_STARTED, () => radio("Radio powered ON — booting…"));
  bus.on(EVENTS.RADIO_BOOT_COMPLETE, () => radio("Boot complete — home screen displayed."));
  bus.on(EVENTS.RADIO_VOLUME_CHANGED, ({ volume, max, reason }) => {
    if (reason === "up") radio(`Volume up → ${volume}/${max}.`);
    else if (reason === "down") radio(`Volume down → ${volume}/${max}.`);
    else if (reason === "power-off") radio(`Volume reached 0 — radio powered OFF.`);
  });
  bus.on(EVENTS.RADIO_NOTICE, ({ message }) => radio(message));
  bus.on(EVENTS.RADIO_CHANNEL_CHANGED, ({ line1, line2 }) => radio(`Channel changed → ${line1} / ${line2}.`));
  bus.on(EVENTS.RADIO_MUTE_CHANGED, ({ muted }) => radio(muted ? "Muted (Tones Off)." : "Unmuted (Tones On)."));
  bus.on(EVENTS.RADIO_LOCK_CHANGED, ({ locked }) => radio(locked ? "Radio locked." : "Radio unlocked."));
  bus.on(EVENTS.RADIO_LOCKED_INPUT, ({ id }) => radio(`${labelFor(id)} pressed while locked — beep, no action.`));
  bus.on(EVENTS.RADIO_SCAN_CHANGED, ({ scanning }) => radio(scanning ? "Scan ON." : "Scan OFF."));

  // ---- PTT ----
  bus.on(EVENTS.PTT_PRESSED, ({ supported }) => {
    ptt(supported ? "pressed — requesting microphone…" : "pressed (recording unsupported in this browser).");
  });
  bus.on(EVENTS.PTT_ACQUIRING, ({ acquireMs }) => ptt(`Acquiring signal (~${Math.round(acquireMs)}ms)…`));
  bus.on(EVENTS.PTT_SIGNAL_CONFIRMED, () => ptt("Signal confirmed — beep."));
  bus.on(EVENTS.PTT_ABORTED, ({ reason }) => ptt(ABORT_MESSAGES[reason] || "Transmission aborted."));
  bus.on(EVENTS.PTT_RECORDING_STARTED, () => ptt("Transmit path open — recording started."));
  bus.on(EVENTS.PTT_RELEASED, ({ rawSeconds }) => ptt(`Released — captured ${rawSeconds.toFixed(2)}s of audio.`));
  bus.on(EVENTS.PTT_TOO_SHORT, () => {
    ptt(
      "Nothing to play back — the tail is always trimmed and the clip was shorter than that. Remember to pause before releasing PTT."
    );
  });
  bus.on(EVENTS.PTT_PLAYBACK_STARTED, ({ durationSeconds, trimMs }) => {
    ptt(`Playing back ${durationSeconds.toFixed(2)}s (last ${trimMs}ms trimmed, simulating a clipped release).`);
  });
  bus.on(EVENTS.PTT_PLAYBACK_ENDED, () => ptt("Playback finished."));
  bus.on(EVENTS.PTT_ERROR, ({ message }) => ptt(message));

  // ---- Mic permission priming ----
  bus.on(EVENTS.MIC_PERMISSION_RESULT, ({ granted, supported }) => {
    if (!supported) {
      ptt(
        "This browser doesn't support microphone recording — timing/beep will still simulate, but no audio will be captured."
      );
    } else {
      ptt(
        granted
          ? "Microphone permission granted — ready for PTT."
          : "Microphone permission was not granted yet — it will be requested again on PTT press."
      );
    }
  });
}
