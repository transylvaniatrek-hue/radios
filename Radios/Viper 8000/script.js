// Viper 8000 Radio Trainer — Proof of Concept
// Click a button hotspot on the radio to highlight it; click again to unhighlight.
// The PTT button is special-cased below with a realistic hold-to-transmit flow.

// Friendly labels for each hotspot id in viperFrontMap.svg
const BUTTON_LABELS = {
  one: "Keypad 1",
  two: "Keypad 2",
  three: "Keypad 3",
  four: "Keypad 4",
  five: "Keypad 5",
  six: "Keypad 6",
  seven: "Keypad 7",
  eight: "Keypad 8",
  nine: "Keypad 9",
  zero: "Keypad 0",
  star: "Keypad *",
  pound: "Keypad #",
  upNavigation: "Navigation – Up",
  downNavigation: "Navigation – Down",
  leftNavigation: "Navigation – Left",
  rightNavigation: "Navigation – Right",
  home: "Home Button",
  data: "Data Button",
  menuSelectOne: "Menu / Select Softkey 1",
  menuSelectTwo: "Menu / Select Softkey 2",
  menuSelectThree: "Menu / Select Softkey 3",
  topOrangeButton: "Orange Button",
  sixteenPositionKnobClockwise: "16-Position Channel Knob",
  sixteenPositionKnobCounterClockwise: "16-Position Channel Knob",
  threePositionABCSwitch: "A/B/C 3-Position Switch",
  onOffVolumeClockwise: "On/Off – Volume Knob",
  onOffVolumeCounterClockwise: "On/Off – Volume Knob",
  pttButton: "PTT (Push-to-Talk)",
  topSideSellectButton: "Top Side Select Button",
  sideButton1: "Side Button 1",
  sideButton2: "Side Button 2",
  batteryLatchLeft: "Battery Latch – Left",
  batteryLatchRight: "Battery Latch – Right",
  microphone: "Microphone",
  radioScreen: "Display Screen",
};

// Hotspots that are two SVG shapes representing a single physical control.
// Clicking either half toggles both halves together.
const GROUPS = {
  sixteenPositionKnobClockwise: "channelKnob",
  sixteenPositionKnobCounterClockwise: "channelKnob",
  onOffVolumeClockwise: "volumeKnob",
  onOffVolumeCounterClockwise: "volumeKnob",
};

function groupOf(id) {
  return GROUPS[id] || id;
}

function labelFor(id) {
  return BUTTON_LABELS[id] || id;
}

// ---- PTT timing model -------------------------------------------------
// These are the numbers to tune to match real radio behavior.
const PTT_TIMING = {
  acquireMinMs: 500, // shortest time the radio takes to confirm it has signal
  acquireMaxMs: 900, // typical longest time
  acquireLongTailChance: 0.2, // sometimes it takes noticeably longer than that
  acquireLongTailExtraMinMs: 300,
  acquireLongTailExtraMaxMs: 700,
  beepDurationMs: 180, // length of the confirmation beep
  postBeepDelayMs: 250, // gap after the beep before the mic actually goes hot
  trimTailMs: 500, // amount clipped off the end of every recording
  playbackDelayMs: 1000, // wait after release before auto-playback starts
};

const SUPPORTS_RECORDING =
  !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) &&
  typeof window.MediaRecorder !== "undefined";

document.addEventListener("DOMContentLoaded", () => {
  const svg = document.getElementById("radioMap");
  const hotspots = Array.from(svg.querySelectorAll("#InteractiveElements > *"));
  const tooltip = document.getElementById("tooltip");
  const logList = document.getElementById("logList");
  const activeCount = document.getElementById("activeCount");
  const resetBtn = document.getElementById("resetBtn");
  const pttDot = document.getElementById("pttDot");
  const pttStatusText = document.getElementById("pttStatusText");

  // Track active state per logical group (not per shape) for the plain toggle buttons
  const activeGroups = new Set();

  function updateActiveCount() {
    activeCount.textContent = activeGroups.size;
  }

  function elementsInGroup(group) {
    return hotspots.filter((el) => groupOf(el.id) === group);
  }

  function setGroupState(group, isActive) {
    elementsInGroup(group).forEach((el) => {
      el.classList.toggle("active", isActive);
    });
  }

  function addLogEntry(innerHtml) {
    const entry = document.createElement("li");
    const time = new Date().toLocaleTimeString();
    entry.innerHTML = `<span class="log-time">${time}</span> ${innerHtml}`;
    logList.prepend(entry);
    while (logList.children.length > 40) {
      logList.removeChild(logList.lastChild);
    }
  }

  function logToggle(id, isActive) {
    addLogEntry(
      `<span class="log-state ${isActive ? "on" : "off"}">${
        isActive ? "●" : "○"
      }</span> ${labelFor(id)}`
    );
  }

  function logPTT(message) {
    addLogEntry(`<span class="log-state ptt">▮</span> PTT: ${message}`);
  }

  // ---- Generic click-to-highlight wiring (all buttons except PTT) -----
  hotspots.forEach((el) => {
    el.setAttribute("tabindex", "0");
    el.setAttribute("role", "button");
    el.setAttribute("aria-label", labelFor(el.id));

    el.addEventListener("mouseenter", () => {
      tooltip.textContent = labelFor(el.id);
      tooltip.classList.add("visible");
    });
    el.addEventListener("mousemove", (evt) => {
      tooltip.style.left = evt.clientX + 16 + "px";
      tooltip.style.top = evt.clientY + 16 + "px";
    });
    el.addEventListener("mouseleave", () => {
      tooltip.classList.remove("visible");
    });
    el.addEventListener("focus", () => {
      tooltip.textContent = labelFor(el.id);
      tooltip.classList.add("visible");
      const rect = el.getBoundingClientRect();
      tooltip.style.left = rect.left + rect.width / 2 + "px";
      tooltip.style.top = rect.top - 8 + "px";
    });
    el.addEventListener("blur", () => tooltip.classList.remove("visible"));

    if (el.id === "pttButton") {
      // The PTT button gets its own hold-to-transmit behavior below,
      // not the generic click-toggle behavior.
      return;
    }

    el.setAttribute("aria-pressed", "false");

    const activate = () => {
      const group = groupOf(el.id);
      const nowActive = !activeGroups.has(group);
      if (nowActive) {
        activeGroups.add(group);
      } else {
        activeGroups.delete(group);
      }
      setGroupState(group, nowActive);
      elementsInGroup(group).forEach((e) =>
        e.setAttribute("aria-pressed", String(nowActive))
      );
      updateActiveCount();
      logToggle(el.id, nowActive);
    };

    el.addEventListener("click", activate);
    el.addEventListener("keydown", (evt) => {
      if (evt.key === "Enter" || evt.key === " ") {
        evt.preventDefault();
        activate();
      }
    });
  });

  resetBtn.addEventListener("click", () => {
    activeGroups.forEach((group) => setGroupState(group, false));
    activeGroups.clear();
    hotspots.forEach((el) => {
      if (el.id !== "pttButton") el.setAttribute("aria-pressed", "false");
    });
    updateActiveCount();
    logList.innerHTML = "";
  });

  updateActiveCount();

  // ---- PTT hold-to-transmit ---------------------------------------
  const pttEl = document.getElementById("pttButton");
  if (pttEl) {
    setupPTT(pttEl, {
      log: logPTT,
      setStatus: (phase, text) => {
        pttDot.className = "ptt-dot" + (phase === "idle" ? "" : " ptt-" + phase);
        pttStatusText.textContent = text;
      },
    });
  }

  if (!SUPPORTS_RECORDING) {
    logPTT(
      "This browser doesn't support microphone recording — timing/beep will still simulate, but no audio will be captured."
    );
  }
});

function setupPTT(el, ui) {
  const PHASE_TEXT = {
    idle: "Idle — hold the PTT button to transmit.",
    acquiring: "Acquiring signal…",
    keying: "Signal confirmed — keying up…",
    recording: "Transmitting — recording your voice.",
    processing: "Processing transmission…",
    playing: "Playing back your transmission…",
  };

  const state = {
    phase: "idle",
    pressToken: 0,
    releaseRequested: false,
    audioCtx: null,
    micStream: null,
    recorder: null,
    chunks: [],
    recordStart: 0,
    acquireTimer: null,
    beepTimer: null,
  };

  function setPhase(phase) {
    state.phase = phase;
    el.classList.remove(
      "ptt-acquiring",
      "ptt-keying",
      "ptt-recording",
      "ptt-processing",
      "ptt-playing"
    );
    if (phase !== "idle") el.classList.add("ptt-" + phase);
    el.setAttribute("aria-pressed", String(phase !== "idle"));
    ui.setStatus(phase, PHASE_TEXT[phase] || phase);
  }

  function ensureAudioCtx() {
    if (!state.audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      state.audioCtx = new Ctx();
    }
    if (state.audioCtx.state === "suspended") state.audioCtx.resume();
    return state.audioCtx;
  }

  function playBeep() {
    const ctx = ensureAudioCtx();
    const dur = PTT_TIMING.beepDurationMs / 1000;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 1200;
    const t0 = ctx.currentTime;
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(0.3, t0 + 0.015);
    gain.gain.setValueAtTime(0.3, t0 + Math.max(dur - 0.02, 0.015));
    gain.gain.linearRampToValueAtTime(0, t0 + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function computeAcquireDelay() {
    let d =
      PTT_TIMING.acquireMinMs +
      Math.random() * (PTT_TIMING.acquireMaxMs - PTT_TIMING.acquireMinMs);
    if (Math.random() < PTT_TIMING.acquireLongTailChance) {
      d +=
        PTT_TIMING.acquireLongTailExtraMinMs +
        Math.random() *
          (PTT_TIMING.acquireLongTailExtraMaxMs -
            PTT_TIMING.acquireLongTailExtraMinMs);
    }
    return d;
  }

  function trimTail(buffer, trimSeconds, ctx) {
    const trimSamples = Math.round(trimSeconds * buffer.sampleRate);
    const newLength = buffer.length - trimSamples;
    if (newLength <= 0) return null;
    const newBuffer = ctx.createBuffer(
      buffer.numberOfChannels,
      newLength,
      buffer.sampleRate
    );
    for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
      newBuffer.copyToChannel(buffer.getChannelData(ch).subarray(0, newLength), ch);
    }
    return newBuffer;
  }

  function clearTimers() {
    clearTimeout(state.acquireTimer);
    clearTimeout(state.beepTimer);
    state.acquireTimer = null;
    state.beepTimer = null;
  }

  function stopMicStream() {
    if (state.micStream) {
      state.micStream.getTracks().forEach((t) => t.stop());
      state.micStream = null;
    }
  }

  function abort(message) {
    clearTimers();
    stopMicStream();
    setPhase("idle");
    ui.log(message);
  }

  async function onPointerDown(evt) {
    if (state.phase !== "idle") return; // busy with a previous transmission
    evt.preventDefault();
    try {
      el.setPointerCapture(evt.pointerId);
    } catch (e) {
      /* ignore */
    }

    const token = ++state.pressToken;
    state.releaseRequested = false;

    if (!SUPPORTS_RECORDING) {
      ui.log("PTT pressed (recording unsupported in this browser).");
      setPhase("acquiring");
      state.acquireTimer = setTimeout(() => {
        if (token !== state.pressToken) return;
        playBeep();
        setPhase("idle");
      }, computeAcquireDelay());
      return;
    }

    ui.log("PTT pressed — requesting microphone…");
    try {
      state.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      ui.log("Microphone access denied or unavailable — cannot transmit.");
      return;
    }
    if (token !== state.pressToken) {
      // superseded before mic access resolved
      state.micStream.getTracks().forEach((t) => t.stop());
      return;
    }
    if (state.releaseRequested) {
      abort("Released before signal was acquired — no transmission sent.");
      return;
    }

    ensureAudioCtx();
    setPhase("acquiring");
    const acquireMs = computeAcquireDelay();
    ui.log(`Acquiring signal (~${Math.round(acquireMs)}ms)…`);

    state.acquireTimer = setTimeout(() => {
      if (token !== state.pressToken) return;
      if (state.releaseRequested) {
        abort("Released before signal was confirmed — no transmission sent.");
        return;
      }
      ui.log("Signal confirmed — beep.");
      playBeep();
      setPhase("keying");

      state.beepTimer = setTimeout(() => {
        if (token !== state.pressToken) return;
        if (state.releaseRequested) {
          abort("Released during key-up delay — no transmission sent.");
          return;
        }
        startRecording(token);
      }, PTT_TIMING.postBeepDelayMs);
    }, acquireMs);
  }

  function startRecording(token) {
    setPhase("recording");
    ui.log("Transmit path open — recording started.");
    state.chunks = [];
    let recorder;
    try {
      recorder = new MediaRecorder(state.micStream);
    } catch (err) {
      ui.log("Recording failed to start in this browser.");
      stopMicStream();
      setPhase("idle");
      return;
    }
    state.recorder = recorder;
    state.recordStart = performance.now();
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size) state.chunks.push(e.data);
    };
    recorder.onstop = () => handleStop(token);
    recorder.start();

    if (state.releaseRequested) {
      // PTT was already released while we were spinning up the recorder
      recorder.stop();
    }
  }

  function onPointerUp() {
    if (state.phase === "idle") return;
    state.releaseRequested = true;
    if (state.recorder && state.recorder.state === "recording") {
      state.recorder.stop();
    }
    // If we're still in acquiring/keying, the pending timers check
    // releaseRequested themselves and will abort without recording.
  }

  async function handleStop(token) {
    if (token !== state.pressToken) return;
    const rawSeconds = (performance.now() - state.recordStart) / 1000;
    stopMicStream();
    ui.log(`Released — captured ${rawSeconds.toFixed(2)}s of audio.`);
    setPhase("processing");

    let trimmedBuffer = null;
    if (state.chunks.length) {
      try {
        const blob = new Blob(state.chunks, { type: state.chunks[0].type });
        const arrayBuf = await blob.arrayBuffer();
        const ctx = ensureAudioCtx();
        const decoded = await ctx.decodeAudioData(arrayBuf);
        trimmedBuffer = trimTail(decoded, PTT_TIMING.trimTailMs / 1000, ctx);
      } catch (err) {
        ui.log("Couldn't process the recording: " + err.message);
      }
    }

    setTimeout(() => {
      if (token !== state.pressToken) return;

      if (!trimmedBuffer) {
        ui.log(
          `Nothing to play back — the last ${PTT_TIMING.trimTailMs}ms is always trimmed and the clip was shorter than that. Remember to pause before releasing PTT.`
        );
        setPhase("idle");
        return;
      }

      ui.log(
        `Playing back ${trimmedBuffer.duration.toFixed(2)}s (last ${
          PTT_TIMING.trimTailMs
        }ms trimmed, simulating a clipped release).`
      );
      setPhase("playing");
      const ctx = ensureAudioCtx();
      const src = ctx.createBufferSource();
      src.buffer = trimmedBuffer;
      src.connect(ctx.destination);
      src.onended = () => {
        if (token !== state.pressToken) return;
        ui.log("Playback finished.");
        setPhase("idle");
      };
      src.start();
    }, PTT_TIMING.playbackDelayMs);
  }

  el.addEventListener("pointerdown", onPointerDown);
  el.addEventListener("pointerup", onPointerUp);
  el.addEventListener("pointercancel", onPointerUp);
  el.addEventListener("keydown", (evt) => {
    if ((evt.key === "Enter" || evt.key === " ") && !evt.repeat) {
      evt.preventDefault();
      onPointerDown({ pointerId: -1, preventDefault() {} });
    }
  });
  el.addEventListener("keyup", (evt) => {
    if (evt.key === "Enter" || evt.key === " ") {
      evt.preventDefault();
      onPointerUp();
    }
  });
}
