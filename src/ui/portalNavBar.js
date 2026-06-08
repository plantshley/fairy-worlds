// Wires the four prev/next world arrow buttons (two desktop edge buttons +
// two mobile in-bar buttons). The DOM lives in index.html — this module only
// attaches click handlers and exposes setVisible(). CSS handles per-breakpoint
// visibility; setVisible() just toggles the body data attribute that gates
// every portal-nav element at once.
export function createPortalNavBar({ onPrev, onNext }) {
  const ids = ["prev-world-edge", "next-world-edge", "prev-world-bar", "next-world-bar"];
  const els = ids.map((id) => document.getElementById(id));
  const [prevEdge, nextEdge, prevBar, nextBar] = els;
  // The mobile top-bar CONTAINER also needs its [hidden] toggled — it starts
  // hidden in HTML, and CSS only hides via media query, never unhides. Without
  // this, the mobile pills + bar arrows never render on actual mobile because
  // the parent container stays display:none.
  const barContainer = document.getElementById("portal-nav-bar");

  prevEdge?.addEventListener("click", onPrev);
  prevBar?.addEventListener("click", onPrev);
  nextEdge?.addEventListener("click", onNext);
  nextBar?.addEventListener("click", onNext);

  function setVisible(visible) {
    // Each button has its own [hidden] toggle so they don't take up event-target
    // space when off. CSS media queries decide which of the visible ones
    // actually render (edge on desktop, bar on mobile).
    for (const el of els) {
      if (!el) continue;
      if (visible) el.removeAttribute("hidden");
      else el.setAttribute("hidden", "");
    }
    if (barContainer) {
      if (visible) barContainer.removeAttribute("hidden");
      else barContainer.setAttribute("hidden", "");
    }
  }

  function dispose() {
    prevEdge?.removeEventListener("click", onPrev);
    prevBar?.removeEventListener("click", onPrev);
    nextEdge?.removeEventListener("click", onNext);
    nextBar?.removeEventListener("click", onNext);
  }

  return { setVisible, dispose };
}
