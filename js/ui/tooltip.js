import { labelFor } from "../config/config.js";

// Hover/focus tooltip shared by every hotspot, regardless of which
// controller (if any) owns its click behavior.
export function initTooltip(hotspots, tooltipEl) {
  hotspots.forEach((el) => {
    el.addEventListener("mouseenter", () => {
      tooltipEl.textContent = labelFor(el.id);
      tooltipEl.classList.add("visible");
    });
    el.addEventListener("mousemove", (evt) => {
      tooltipEl.style.left = evt.clientX + 16 + "px";
      tooltipEl.style.top = evt.clientY + 16 + "px";
    });
    el.addEventListener("mouseleave", () => {
      tooltipEl.classList.remove("visible");
    });
    el.addEventListener("focus", () => {
      tooltipEl.textContent = labelFor(el.id);
      tooltipEl.classList.add("visible");
      const rect = el.getBoundingClientRect();
      tooltipEl.style.left = rect.left + rect.width / 2 + "px";
      tooltipEl.style.top = rect.top - 8 + "px";
    });
    el.addEventListener("blur", () => tooltipEl.classList.remove("visible"));
  });
}
