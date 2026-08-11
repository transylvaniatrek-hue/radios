import { bus } from "../core/eventBus.js";
import { EVENTS } from "../core/events.js";
import { playTone } from "../core/beep.js";
import { ROCKY_CONFIG } from "../config/rockyConfig.js";
import { rockyState } from "./rockyState.js";

export const SUPPORTS_RECORDING =
  !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) &&
  typeof window.MediaRecorder !== "undefined";

// Rocky Talkie's PTT is deliberately simpler than Motorola 8000's: per the
// manual, the TX beep just confirms the button press "before and after
// transmitting" — it doesn't gate anything. There's no signal-acquire
// delay to wait through, and the trim on release is light and symmetric
// (both ends) rather than one heavy tail trim. PTT also isn't blocked by
// the lock (manual: "you can still... use the PTT button" while locked).
export function createRockyPttController() {
  const state = {
    phase: "idle", // idle | recording | processing | playing
    pressToken: 0,
    audioCtx: null,
    micStream: null,
    recorder: null,
    chunks: [],
    recordStart: 0,
  };

  function setPhase(phase) {
    state.phase = phase;
    bus.emit(EVENTS.ROCKY_PTT_PHASE_CHANGED, { phase });
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
    playTone({
      ctx: ensureAudioCtx(),
      frequency: ROCKY_CONFIG.pttBeepFrequency,
      durationMs: ROCKY_CONFIG.pttBeepDurationMs,
      volume: 0.3,
    });
  }

  function stopMicStream() {
    if (state.micStream) {
      state.micStream.getTracks().forEach((t) => t.stop());
      state.micStream = null;
    }
  }

  // Trims a little off BOTH ends, unlike Motorola 8000 which only trims
  // the tail.
  function trimBothEnds(buffer, startSeconds, endSeconds, ctx) {
    const startSamples = Math.round(startSeconds * buffer.sampleRate);
    const endSamples = Math.round(endSeconds * buffer.sampleRate);
    const newLength = buffer.length - startSamples - endSamples;
    if (newLength <= 0) return null;
    const newBuffer = ctx.createBuffer(buffer.numberOfChannels, newLength, buffer.sampleRate);
    for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
      const data = buffer.getChannelData(ch).subarray(startSamples, startSamples + newLength);
      newBuffer.copyToChannel(new Float32Array(data), ch);
    }
    return newBuffer;
  }

  async function onPress() {
    if (state.phase !== "idle") return; // busy with a previous transmission
    const token = ++state.pressToken;

    ensureAudioCtx();
    playBeep(); // confirms the press — doesn't gate anything

    if (!SUPPORTS_RECORDING) {
      bus.emit(EVENTS.ROCKY_PTT_PRESSED, {});
      setPhase("recording");
      return;
    }

    bus.emit(EVENTS.ROCKY_PTT_PRESSED, {});
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      bus.emit(EVENTS.ROCKY_PTT_ERROR, { message: "Microphone access denied or unavailable — cannot transmit." });
      return;
    }
    if (token !== state.pressToken) {
      stream.getTracks().forEach((t) => t.stop());
      return;
    }
    state.micStream = stream;

    setPhase("recording"); // recording starts immediately — no wait
    state.chunks = [];
    let recorder;
    try {
      recorder = new MediaRecorder(stream);
    } catch (err) {
      bus.emit(EVENTS.ROCKY_PTT_ERROR, { message: "Recording failed to start in this browser." });
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
  }

  function onRelease() {
    if (state.phase !== "recording") return;
    playBeep(); // confirms the release too
    if (!SUPPORTS_RECORDING) {
      setPhase("idle");
      return;
    }
    if (state.recorder && state.recorder.state === "recording") {
      state.recorder.stop();
    }
  }

  async function handleStop(token) {
    if (token !== state.pressToken) return;
    const rawSeconds = (performance.now() - state.recordStart) / 1000;
    stopMicStream();
    bus.emit(EVENTS.ROCKY_PTT_RELEASED, { rawSeconds });
    setPhase("processing");

    let trimmedBuffer = null;
    if (state.chunks.length) {
      try {
        const blob = new Blob(state.chunks, { type: state.chunks[0].type });
        const arrayBuf = await blob.arrayBuffer();
        const ctx = ensureAudioCtx();
        const decoded = await ctx.decodeAudioData(arrayBuf);
        trimmedBuffer = trimBothEnds(
          decoded,
          ROCKY_CONFIG.pttTrimStartMs / 1000,
          ROCKY_CONFIG.pttTrimEndMs / 1000,
          ctx
        );
      } catch (err) {
        bus.emit(EVENTS.ROCKY_PTT_ERROR, { message: "Couldn't process the recording: " + err.message });
      }
    }

    setTimeout(() => {
      if (token !== state.pressToken) return;

      if (!trimmedBuffer) {
        bus.emit(EVENTS.ROCKY_PTT_TOO_SHORT, {});
        setPhase("idle");
        return;
      }

      bus.emit(EVENTS.ROCKY_PTT_PLAYBACK_STARTED, { durationSeconds: trimmedBuffer.duration });
      setPhase("playing");
      const ctx = ensureAudioCtx();
      const src = ctx.createBufferSource();
      src.buffer = trimmedBuffer;
      src.connect(ctx.destination);
      src.onended = () => {
        if (token !== state.pressToken) return;
        bus.emit(EVENTS.ROCKY_PTT_PLAYBACK_ENDED, {});
        setPhase("idle");
      };
      src.start();
    }, ROCKY_CONFIG.pttPlaybackDelayMs);
  }

  return { onPress, onRelease, getPhase: () => state.phase };
}
