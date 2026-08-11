// Shared tone-generation utility. One AudioContext for the whole app —
// created lazily on first use (audio contexts can't be created until a user
// gesture in most browsers, and every caller here is only ever invoked from
// a click/keypress handler anyway).
let sharedCtx = null;

function ensureAudioCtx() {
  if (!sharedCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    sharedCtx = new Ctx();
  }
  if (sharedCtx.state === "suspended") sharedCtx.resume();
  return sharedCtx;
}

// Plays a single short tone. Used for the PTT confirmation beep and can be
// composed (see playLockedBeep below) into multi-tone sequences. Pass an
// existing AudioContext via `ctx` to reuse one a caller already has (e.g.
// pttController's, which also needs a context for recording playback) —
// otherwise a lazily-created shared context is used.
export function playTone({ frequency = 1200, durationMs = 180, volume = 0.3, delayMs = 0, ctx } = {}) {
  const audioCtx = ctx || ensureAudioCtx();
  const dur = durationMs / 1000;
  const t0 = audioCtx.currentTime + delayMs / 1000;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "sine";
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(volume, t0 + 0.015);
  gain.gain.setValueAtTime(volume, t0 + Math.max(dur - 0.02, 0.015));
  gain.gain.linearRampToValueAtTime(0, t0 + dur);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

// Two short low tones — the "that control is locked" error beep, played
// when a button is pressed while the radio is locked. Deliberately
// different from the single higher-pitched PTT confirmation beep so the
// two are easy to tell apart by ear.
export function playLockedBeep() {
  playTone({ frequency: 620, durationMs: 90, volume: 0.25 });
  playTone({ frequency: 620, durationMs: 90, volume: 0.25, delayMs: 130 });
}
