// Instantiates one of the shared LCD <template>s (see index.html) into a
// host element. Screen content is defined in exactly one place per flavor
// even though it's rendered multiple times per radio (once on the radio's
// real screen, once in a larger auxiliary panel) — this is shared,
// radio-agnostic infrastructure, not specific to any one radio.
//
// Motorola 8000 uses two flavors:
//   "multi"  (front view) — three stacked lines + clock + full icon row.
//   "single" (top view)   — one line that rotates through the three
//                           values, reduced icon row, no clock.
// Rocky Talkie uses a third:
//   "rocky" — dark segment-display look: big channel number, H/L power
//             letter, lock/beep icons, and a transient battery-percent
//             overlay. See js/rockyTalkie/rockyScreenView.js.
const TEMPLATE_IDS = {
  multi: "lcdScreenTemplate",
  single: "lcdScreenTopTemplate",
  rocky: "lcdScreenRockyTemplate",
};

export function instantiateLcdScreen(hostEl, kind = "multi") {
  const templateId = TEMPLATE_IDS[kind] || TEMPLATE_IDS.multi;
  const template = document.getElementById(templateId);
  const node = template.content.firstElementChild.cloneNode(true);
  hostEl.appendChild(node);

  const refs = {
    kind,
    lcdScreen: node,
    scanIcon: node.querySelector('[data-role="scanIcon"]'),
  };

  if (kind === "single") {
    refs.singleLine = node.querySelector('[data-role="singleLine"]');
  } else if (kind === "rocky") {
    refs.channel = node.querySelector('[data-role="channel"]');
    refs.lockIcon = node.querySelector('[data-role="lockIcon"]');
    refs.beepIcon = node.querySelector('[data-role="beepIcon"]');
    refs.powerLevel = node.querySelector('[data-role="powerLevel"]');
    refs.battery = node.querySelector('[data-role="battery"]');
  } else {
    refs.timeDisplay = node.querySelector('[data-role="time"]');
    refs.line1 = node.querySelector('[data-role="line1"]');
    refs.line2 = node.querySelector('[data-role="line2"]');
    refs.line3 = node.querySelector('[data-role="line3"]');
  }

  return refs;
}
