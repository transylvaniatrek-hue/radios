import { bus } from "../core/eventBus.js";
import { EVENTS } from "../core/events.js";
import { PTT_TIMING } from "../config/config.js";

export const SUPPORTS_RECORDING =
  !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) &&
  typeof window.MediaRecorder !== "undefined";

// Ask for microphone permission up front (e.g. on page load) so the first
// PTT press doesn't interrupt the trainee with a browser permission prompt.
// The stream is released immediately — a fresh (fast, no re-prompt once
// granted) stream is grabbed per PTT press so the mic is only actually
// "hot" while transmitting.
export async function primeMicPermission() {
  if (!SUPPORTS_RECORDING) {
    bus.emit(EVENTS.MIC_PERMISSION_RESULT, { granted: false, supported: false });
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop());
    bus.emit(EVENTS.MIC_PERMISSION_RESULT, { granted: true, supported: true });
  } catch (err) {
    bus.emit(EVENTS.MIC_PERMISSION_RESULT, { granted: false, supported: true });
  }
}

// Owns the PTT hold-to-transmit state machine: acquire signal → beep → key-up
// delay → record → trim tail → wait → playback. No DOM knowledge beyond the
// pointer/keyboard listeners on its own hotspot element (the natural input
// surface) — every observable change is emitted on the bus for views (and
// eventually activity checkers) to react to.
export function createPTTController(el) {
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
    bus.emit(EVENTS.PTT_PHASE_CHANGED, { phase });
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
          (PTT_TIMING.acquireLongTailExtraMaxMs - PTT_TIMING.acquireLongTailExtraMinMs);
    }
    return d;
  }

  function trimTail(buffer, trimSeconds, ctx) {
    const trimSamples = Math.round(trimSeconds * buffer.sampleRate);
    const newLength = buffer.length - trimSamples;
    if (newLength <= 0) return null;
    const newBuffer = ctx.createBuffer(buffer.numberOfChannels, newLength, buffer.sampleRate);
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

  function abort(reason) {
    clearTimers();
    stopMicStream();
    setPhase("idle");
    bus.emit(EVENTS.PTT_ABORTED, { reason });
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
      bus.emit(EVENTS.PTT_PRESSED, { supported: false });
      setPhase("acquiring");
      state.acquireTimer = setTimeout(() => {
        if (token !== state.pressToken) return;
        playBeep();
        setPhase("idle");
      }, computeAcquireDelay());
      return;
    }

    bus.emit(EVENTS.PTT_PRESSED, { supported: true });
    try {
      state.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      bus.emit(EVENTS.PTT_ABORTED, { reason: "mic-denied" });
      return;
    }
    if (token !== state.pressToken) {
      // superseded before mic access resolved
      state.micStream.getTracks().forEach((t) => t.stop());
      return;
    }
    if (state.releaseRequested) {
      abort("released-before-signal");
      return;
    }

    ensureAudioCtx();
    setPhase("acquiring");
    const acquireMs = computeAcquireDelay();
    bus.emit(EVENTS.PTT_ACQUIRING, { acquireMs });

    state.acquireTimer = setTimeout(() => {
      if (token !== state.pressToken) return;
      if (state.releaseRequested) {
        abort("released-before-signal");
        return;
      }
      bus.emit(EVENTS.PTT_SIGNAL_CONFIRMED, {});
      playBeep();
      setPhase("keying");

      state.beepTimer = setTimeout(() => {
        if (token !== state.pressToken) return;
        if (state.releaseRequested) {
          abort("released-during-keyup");
          return;
        }
        startRecording(token);
      }, PTT_TIMING.postBeepDelayMs);
    }, acquireMs);
  }

  function startRecording(token) {
    setPhase("recording");
    bus.emit(EVENTS.PTT_RECORDING_STARTED, {});
    state.chunks = [];
    let recorder;
    try {
      recorder = new MediaRecorder(state.micStream);
    } catch (err) {
      bus.emit(EVENTS.PTT_ERROR, { message: "Recording failed to start in this browser." });
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
    bus.emit(EVENTS.PTT_RELEASED, { rawSeconds });
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
        bus.emit(EVENTS.PTT_ERROR, { message: "Couldn't process the recording: " + err.message });
      }
    }

    setTimeout(() => {
      if (token !== state.pressToken) return;

      if (!trimmedBuffer) {
        bus.emit(EVENTS.PTT_TOO_SHORT, {});
        setPhase("idle");
        return;
      }

      bus.emit(EVENTS.PTT_PLAYBACK_STARTED, {
        durationSeconds: trimmedBuffer.duration,
        trimMs: PTT_TIMING.trimTailMs,
      });
      setPhase("playing");
      const ctx = ensureAudioCtx();
      const src = ctx.createBufferSource();
      src.buffer = trimmedBuffer;
      src.connect(ctx.destination);
      src.onended = () => {
        if (token !== state.pressToken) return;
        bus.emit(EVENTS.PTT_PLAYBACK_ENDED, {});
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

  return { getPhase: () => state.phase };
}
