// Instantiates the shared <template id="lcdScreenTemplate"> (see index.html)
// into a host element. The LCD's markup is defined in exactly one place even
// though it's rendered twice — once on the radio's real screen, once in the
// larger auxiliary panel next to it — so future screen-content changes never
// need to be made in two places.
export function instantiateLcdScreen(hostEl) {
  const template = document.getElementById("lcdScreenTemplate");
  const node = template.content.firstElementChild.cloneNode(true);
  hostEl.appendChild(node);
  return {
    lcdScreen: node,
    timeDisplay: node.querySelector('[data-role="time"]'),
  };
}
