// Instantiates one of the shared LCD <template>s (see index.html) into a
// host element. Screen content is defined in exactly one place per flavor
// even though it's rendered multiple times — once per view (front/top) on
// the radio's real screen, and once per view in the larger auxiliary panel
// — so future screen-content changes never need to be made in more than
// one place per flavor.
//
// "multi" (front view): three stacked lines + clock + full icon row.
// "single" (top view): one line that rotates through the three values +
// a reduced icon row, no clock.
export function instantiateLcdScreen(hostEl, kind = "multi") {
  const templateId = kind === "single" ? "lcdScreenTopTemplate" : "lcdScreenTemplate";
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
  } else {
    refs.timeDisplay = node.querySelector('[data-role="time"]');
    refs.line1 = node.querySelector('[data-role="line1"]');
    refs.line2 = node.querySelector('[data-role="line2"]');
    refs.line3 = node.querySelector('[data-role="line3"]');
  }

  return refs;
}
