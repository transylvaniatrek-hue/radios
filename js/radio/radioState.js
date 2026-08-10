import { bus } from "../core/eventBus.js";
import { EVENTS } from "../core/events.js";
import { RADIO_CONFIG } from "../config/config.js";

// Owns the radio's power/volume state machine. Deliberately has zero DOM
// knowledge — it only reads config and emits events on the bus. Anything
// that needs to react (the LCD screen, the sidebar, a future activity
// checker) subscribes to those events instead of calling in here directly.
//
// power: 'off' | 'booting' | 'on'
// volume: 0..RADIO_CONFIG.volumeMax (0 while off)
function createRadioState() {
  let power = "off";
  let volume = 0;
  let bootTimer = null;

  function emitPower() {
    bus.emit(EVENTS.RADIO_POWER_CHANGED, { power });
  }

  function emitVolume(reason) {
    bus.emit(EVENTS.RADIO_VOLUME_CHANGED, { volume, max: RADIO_CONFIG.volumeMax, reason });
  }

  function powerOn() {
    if (power !== "off") return;
    power = "booting";
    volume = Math.max(volume, 1);
    emitPower();
    bus.emit(EVENTS.RADIO_BOOT_STARTED, {});
    emitVolume("power-on");

    clearTimeout(bootTimer);
    bootTimer = setTimeout(() => {
      power = "on";
      emitPower();
      bus.emit(EVENTS.RADIO_BOOT_COMPLETE, {});
    }, RADIO_CONFIG.bootDurationMs);
  }

  function powerOff() {
    power = "off";
    volume = 0;
    clearTimeout(bootTimer);
    bootTimer = null;
    emitPower();
    emitVolume("power-off");
  }

  function increaseVolume() {
    if (power === "booting") return; // ignore knob input mid-boot
    if (power === "off") {
      powerOn();
      return;
    }
    volume = Math.min(RADIO_CONFIG.volumeMax, volume + 1);
    emitVolume("up");
  }

  function decreaseVolume() {
    if (power === "booting") return;
    if (power === "off") {
      bus.emit(EVENTS.RADIO_NOTICE, { message: "Radio is already off." });
      return;
    }
    volume = Math.max(0, volume - 1);
    if (volume === 0) {
      powerOff();
    } else {
      emitVolume("down");
    }
  }

  function getState() {
    return { power, volume };
  }

  return { powerOn, powerOff, increaseVolume, decreaseVolume, getState };
}

// One shared radio — there's only one physical radio being simulated.
export const radioState = createRadioState();
