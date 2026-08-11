import { bus } from "../core/eventBus.js";
import { EVENTS } from "../core/events.js";
import { RADIOS, activitiesFor } from "../config/radios.js";

// Wires the Radio and Activity dropdowns in the header. Switching radios
// shows/hides the matching panel (see index.html's #motorola8000Panel /
// #rockyTalkiePanel) and repopulates the Activity dropdown from that
// radio's own activity list. There's no activity engine yet — selecting an
// activity just emits an event for now (see ARCHITECTURE.md); this is
// purely the scaffold it will hook into.
export function initRadioSelector({ radioSelectEl, activitySelectEl, panels }) {
  function showPanel(radioId) {
    Object.entries(panels).forEach(([id, el]) => {
      if (el) el.hidden = id !== radioId;
    });
  }

  function populateActivities(radioId) {
    activitySelectEl.innerHTML = "";
    activitiesFor(radioId).forEach((activity) => {
      const opt = document.createElement("option");
      opt.value = activity.id;
      opt.textContent = activity.name;
      activitySelectEl.appendChild(opt);
    });
  }

  function selectRadio(radioId) {
    const radio = RADIOS.find((r) => r.id === radioId);
    showPanel(radioId);
    populateActivities(radioId);
    bus.emit(EVENTS.APP_RADIO_CHANGED, { radioId, radioName: radio ? radio.name : radioId });

    // Switching radios always resets to that radio's default (first) activity.
    const defaultActivity = activitiesFor(radioId)[0];
    if (defaultActivity) {
      activitySelectEl.value = defaultActivity.id;
      bus.emit(EVENTS.APP_ACTIVITY_CHANGED, {
        radioId,
        activityId: defaultActivity.id,
        activityName: defaultActivity.name,
      });
    }
  }

  RADIOS.forEach((radio) => {
    const opt = document.createElement("option");
    opt.value = radio.id;
    opt.textContent = radio.implemented ? radio.name : `${radio.name} (coming soon)`;
    radioSelectEl.appendChild(opt);
  });

  radioSelectEl.addEventListener("change", () => selectRadio(radioSelectEl.value));
  activitySelectEl.addEventListener("change", () => {
    const radioId = radioSelectEl.value;
    const activity = activitiesFor(radioId).find((a) => a.id === activitySelectEl.value);
    bus.emit(EVENTS.APP_ACTIVITY_CHANGED, {
      radioId,
      activityId: activitySelectEl.value,
      activityName: activity ? activity.name : activitySelectEl.value,
    });
  });

  selectRadio(RADIOS[0].id);
}
