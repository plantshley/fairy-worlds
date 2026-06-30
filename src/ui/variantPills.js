// Renders a horizontal row of pills for the scenes in the current world group,
// minus the current scene and minus any hideInPicker entries. Reuses the
// existing .scene-btn styling so pills match the dropdown picker visually.
//
// Instantiated twice (one container per breakpoint); both get the same
// update() call. Empty group → renders nothing (container stays empty).
export function createVariantPills({ container, onSelectScene }) {
  function build(sceneDef, allScenes) {
    container.innerHTML = "";
    if (!sceneDef) return;
    // Include the CURRENT scene in the list (marked .active) so the row reads
    // like a tab strip. Hidden scenes are normally filtered out, but Animal
    // Crossing's portal-only interiors ARE surfaced here (same rule as
    // worldPicker.js) so touring the AC island from the hub exposes every room.
    const siblings = allScenes.filter(
      (s) =>
        s.world === sceneDef.world &&
        (!s.hideInPicker || s.world === "Animal Crossing"),
    );
    // List cycle-visible scenes first (e.g. the main "Animal Crossing" scene),
    // then portal-only interiors — matches the dropdown's ordering. Stable sort
    // preserves array order within each tier.
    siblings.sort((a, b) => (a.hideInPicker ? 1 : 0) - (b.hideInPicker ? 1 : 0));
    for (const s of siblings) {
      const btn = document.createElement("button");
      btn.className = "scene-btn";
      if (s.id === sceneDef.id) btn.classList.add("active");
      btn.dataset.sceneId = s.id;
      // Same title-strip pattern worldPicker.js uses, so labels match the
      // dropdown's variant text exactly.
      const label =
        s.world && s.title.startsWith(s.world)
          ? s.title.slice(s.world.length).trim() || s.title
          : s.title;
      btn.textContent = label;
      // Re-clicking the active pill is a no-op (avoids re-running loadScene
      // on the current scene).
      btn.addEventListener("click", () => {
        if (s.id !== sceneDef.id) onSelectScene(s);
      });
      container.appendChild(btn);
    }
  }

  function setVisible(visible) {
    if (visible) container.removeAttribute("hidden");
    else container.setAttribute("hidden", "");
  }

  return { update: build, setVisible };
}
