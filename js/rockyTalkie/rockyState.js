import { bus } from "../core/eventBus.js";
import { EVENTS } from "../core/events.js";
import { playLockedBeep } from "../core/beep.js";
import { ROCKY_CONFIG, isHighPowerChannel, privacyCodeType } from "../config/rockyConfig.js";

// Owns Rocky Talkie's power/channel/volume/lock/scan/privacy-code state.
// No DOM knowledge — only emits events. Unlike Motorola 8000, there's no
// "booting" phase: the screen just goes straight from off to on, with a
// battery-percent overlay shown briefly on top (see manual: "current
// battery percentage is temporarily displayed every time you power on
// your radio").
//
// Scan mode and privacy-code selection are "modal" — while either is
// active, most other buttons exist only to end that mode (manual: "press
// any button" to stop scanning / to save a privacy code). Every input
// module calls consumeModalPress() first; if it returns true, the
// button's normal action doesn't run. The one exception is the Channel
// Flipper's own taps, which the manual repurposes to cycle the privacy
// code while that mode is active — see rockyChannelInput.js.
function createRockyState() {
  let power = "off"; // 'off' | 'on'
  let channel = ROCKY_CONFIG.defaultChannel;
  let locked = false;
  let volume = 0;
  let privacyCode = ROCKY_CONFIG.defaultPrivacyCode;
  let settingPrivacyCode = false;
  let scanning = false;
  let scanTimer = null;

  function emitPower() {
    bus.emit(EVENTS.ROCKY_POWER_CHANGED, { power });
  }

  function emitChannel(reason) {
    bus.emit(EVENTS.ROCKY_CHANNEL_CHANGED, { channel, highPower: isHighPowerChannel(channel), reason });
  }

  function emitPrivacyCode(confirmed) {
    bus.emit(EVENTS.ROCKY_PRIVACY_CODE_CHANGED, { code: privacyCode, type: privacyCodeType(privacyCode), confirmed });
  }

  function showBattery() {
    bus.emit(EVENTS.ROCKY_BATTERY_CHECK, { percent: ROCKY_CONFIG.simulatedBatteryPercent });
  }

  function isUsable() {
    return power === "on";
  }

  function powerOn() {
    if (power !== "off") return;
    power = "on";
    volume = Math.max(volume, 1);
    emitPower();
    emitChannel("user");
    emitPrivacyCode(false); // display it, but this is the persisted value, not a fresh save — don't log "set"
    bus.emit(EVENTS.ROCKY_VOLUME_CHANGED, { volume, max: ROCKY_CONFIG.volumeMax, reason: "power-on" });
    showBattery(); // manual: battery % shown temporarily on power-on
  }

  function powerOff() {
    if (power !== "on") return;
    power = "off";
    locked = false; // matches Motorola 8000's precedent of a fresh state on power-off
    stopScan();
    if (settingPrivacyCode) {
      settingPrivacyCode = false;
      bus.emit(EVENTS.ROCKY_PRIVACY_CODE_MODE_CHANGED, { active: false });
    }
    emitPower();
    bus.emit(EVENTS.ROCKY_LOCK_CHANGED, { locked });
  }

  // Manual: volume still works while locked ("you can still adjust the
  // volume... use the PTT button" while locked) — no lock check here.
  function increaseVolume() {
    if (power !== "on") return;
    volume = Math.min(ROCKY_CONFIG.volumeMax, volume + 1);
    bus.emit(EVENTS.ROCKY_VOLUME_CHANGED, { volume, max: ROCKY_CONFIG.volumeMax, reason: "up" });
  }

  function decreaseVolume() {
    if (power !== "on") return;
    volume = Math.max(0, volume - 1);
    bus.emit(EVENTS.ROCKY_VOLUME_CHANGED, { volume, max: ROCKY_CONFIG.volumeMax, reason: "down" });
  }

  // Tap the power button while already on: manual's "Check Battery
  // Percentage" — press once at any time to see it.
  function checkBattery() {
    if (power !== "on") return;
    showBattery();
  }

  // direction: +1 (forward tap) or -1 (back tap). Wraps at the ends.
  function changeChannel(direction) {
    if (!isUsable()) {
      bus.emit(EVENTS.ROCKY_NOTICE, { message: "Radio is off — channel flipper has no effect." });
      return;
    }
    if (locked) {
      playLockedBeep();
      bus.emit(EVENTS.ROCKY_LOCKED_INPUT, {
        id: direction > 0 ? "channelFlipperLockForward" : "channelFlipperLockBack",
      });
      return;
    }
    channel += direction;
    if (channel > ROCKY_CONFIG.channelMax) channel = ROCKY_CONFIG.channelMin;
    if (channel < ROCKY_CONFIG.channelMin) channel = ROCKY_CONFIG.channelMax;
    emitChannel("user");
  }

  function toggleLock() {
    if (!isUsable()) return; // nothing to lock while off
    locked = !locked;
    bus.emit(EVENTS.ROCKY_LOCK_CHANGED, { locked });
  }

  // ---- Scan mode (manual: hold Channel Flipper back 2s) --------------
  function scanTick() {
    if (!scanning) return;
    channel = channel >= ROCKY_CONFIG.channelMax ? ROCKY_CONFIG.channelMin : channel + 1;
    emitChannel("scan");

    if (Math.random() < ROCKY_CONFIG.scanActivityChance) {
      bus.emit(EVENTS.ROCKY_SCAN_ACTIVITY, { channel });
      scanTimer = setTimeout(scanTick, ROCKY_CONFIG.scanPauseMs);
    } else {
      scanTimer = setTimeout(scanTick, ROCKY_CONFIG.scanIntervalMs);
    }
  }

  function startScan() {
    if (!isUsable() || locked || scanning || settingPrivacyCode) return;
    scanning = true;
    bus.emit(EVENTS.ROCKY_SCAN_CHANGED, { scanning: true });
    scanTick();
  }

  function stopScan() {
    if (!scanning) return;
    scanning = false;
    clearTimeout(scanTimer);
    scanTimer = null;
    bus.emit(EVENTS.ROCKY_SCAN_CHANGED, { scanning: false });
  }

  // ---- Privacy code selection (manual: hold Volume Down ~2s) ---------
  function enterPrivacyCodeSelect() {
    if (!isUsable() || locked || settingPrivacyCode || scanning) return;
    settingPrivacyCode = true;
    bus.emit(EVENTS.ROCKY_PRIVACY_CODE_MODE_CHANGED, { active: true });
    emitPrivacyCode(false);
  }

  // direction: +1 (forward tap) or -1 (back tap), only while selecting.
  function cyclePrivacyCode(direction) {
    if (!settingPrivacyCode) return;
    privacyCode += direction;
    if (privacyCode > ROCKY_CONFIG.privacyCodeMax) privacyCode = ROCKY_CONFIG.privacyCodeMin;
    if (privacyCode < ROCKY_CONFIG.privacyCodeMin) privacyCode = ROCKY_CONFIG.privacyCodeMax;
    emitPrivacyCode(false);
  }

  function confirmPrivacyCode() {
    if (!settingPrivacyCode) return;
    settingPrivacyCode = false;
    bus.emit(EVENTS.ROCKY_PRIVACY_CODE_MODE_CHANGED, { active: false });
    emitPrivacyCode(true);
  }

  // Directly sets the privacy code without going through the manual's
  // hold/cycle/confirm gesture — used only by an activity's setup() to
  // force a known starting value (e.g. back to the default before the
  // "change it to 75" activity begins). Not a user-facing action, so it
  // emits as unconfirmed (matches powerOn()'s redisplay-only semantics).
  function resetPrivacyCode(code) {
    privacyCode = code;
    emitPrivacyCode(false);
  }

  // Every input module (except the Channel Flipper's cycling taps) calls
  // this first. Returns true if it consumed the press — the caller should
  // then do nothing else.
  function consumeModalPress() {
    if (scanning) {
      stopScan();
      return true;
    }
    if (settingPrivacyCode) {
      confirmPrivacyCode();
      return true;
    }
    return false;
  }

  function getState() {
    return { power, channel, locked, volume, privacyCode, settingPrivacyCode, scanning };
  }

  return {
    powerOn,
    powerOff,
    checkBattery,
    changeChannel,
    toggleLock,
    increaseVolume,
    decreaseVolume,
    startScan,
    stopScan,
    enterPrivacyCodeSelect,
    cyclePrivacyCode,
    confirmPrivacyCode,
    resetPrivacyCode,
    consumeModalPress,
    getState,
  };
}

export const rockyState = createRockyState();
