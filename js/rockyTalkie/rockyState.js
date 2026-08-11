import { bus } from "../core/eventBus.js";
import { EVENTS } from "../core/events.js";
import { playLockedBeep } from "../core/beep.js";
import { ROCKY_CONFIG, isHighPowerChannel } from "../config/rockyConfig.js";

// Owns Rocky Talkie's power/channel/lock state. No DOM knowledge — only
// emits events. Unlike Motorola 8000, there's no "booting" phase: the
// screen just goes straight from off to on, with a battery-percent
// overlay shown briefly on top (see manual: "current battery percentage
// is temporarily displayed every time you power on your radio").
function createRockyState() {
  let power = "off"; // 'off' | 'on'
  let channel = ROCKY_CONFIG.defaultChannel;
  let locked = false;
  let volume = 0;

  function emitPower() {
    bus.emit(EVENTS.ROCKY_POWER_CHANGED, { power });
  }

  function emitChannel() {
    bus.emit(EVENTS.ROCKY_CHANNEL_CHANGED, { channel, highPower: isHighPowerChannel(channel) });
  }

  function showBattery() {
    bus.emit(EVENTS.ROCKY_BATTERY_CHECK, { percent: ROCKY_CONFIG.simulatedBatteryPercent });
  }

  function powerOn() {
    if (power !== "off") return;
    power = "on";
    volume = Math.max(volume, 1);
    emitPower();
    emitChannel();
    bus.emit(EVENTS.ROCKY_VOLUME_CHANGED, { volume, max: ROCKY_CONFIG.volumeMax, reason: "power-on" });
    showBattery(); // manual: battery % shown temporarily on power-on
  }

  function powerOff() {
    if (power !== "on") return;
    power = "off";
    locked = false; // matches Motorola 8000's precedent of a fresh state on power-off
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

  function isUsable() {
    return power === "on";
  }

  function changeChannel() {
    if (!isUsable()) {
      bus.emit(EVENTS.ROCKY_NOTICE, { message: "Radio is off — channel flipper has no effect." });
      return;
    }
    if (locked) {
      playLockedBeep();
      bus.emit(EVENTS.ROCKY_LOCKED_INPUT, { id: "channelFlipperLock" });
      return;
    }
    channel = channel >= ROCKY_CONFIG.channelMax ? ROCKY_CONFIG.channelMin : channel + 1;
    emitChannel();
  }

  function toggleLock() {
    if (!isUsable()) return; // nothing to lock while off
    locked = !locked;
    bus.emit(EVENTS.ROCKY_LOCK_CHANGED, { locked });
  }

  function getState() {
    return { power, channel, locked };
  }

  return {
    powerOn,
    powerOff,
    checkBattery,
    changeChannel,
    toggleLock,
    increaseVolume,
    decreaseVolume,
    getState,
  };
}

export const rockyState = createRockyState();
