export function createWorldPicker({ container, scenes, onSelectScene }) {
  let openGroupEl = null;
  let activeSceneId = null;

  function closeOpenGroup() {
    if (openGroupEl) {
      openGroupEl.classList.remove("open");
      openGroupEl = null;
    }
  }

  function build() {
    container.innerHTML = "";
    const groups = new Map();
    for (const s of scenes) {
      if (s.hideInPicker) continue;
      const world = s.world ?? "Other";
      if (!groups.has(world)) groups.set(world, []);
      groups.get(world).push(s);
    }
    for (const [world, sceneList] of groups) {
      const groupEl = document.createElement("div");
      groupEl.className = "scene-group";
      groupEl.dataset.world = world;

      const pill = document.createElement("button");
      pill.className = "group-pill";
      pill.innerHTML = `<span class="flourish">♡</span><span class="group-label">${world}</span><span class="arrow">▼</span>`;
      pill.addEventListener("click", (e) => {
        e.stopPropagation();
        const wasOpen = groupEl.classList.contains("open");
        closeOpenGroup();
        if (!wasOpen) {
          groupEl.classList.add("open");
          openGroupEl = groupEl;
        }
      });
      groupEl.appendChild(pill);

      const panel = document.createElement("div");
      panel.className = "group-scenes";
      for (const s of sceneList) {
        const btn = document.createElement("button");
        btn.className = "scene-btn";
        btn.dataset.sceneId = s.id;
        const label =
          s.world && s.title.startsWith(s.world)
            ? s.title.slice(s.world.length).trim() || s.title
            : s.title;
        btn.textContent = label;
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          // Don't collapse here — applyActive (via setActiveScene) keeps the
          // active world's dropdown open so the user can hop between its scenes.
          onSelectScene(s);
        });
        panel.appendChild(btn);
      }
      groupEl.appendChild(panel);

      container.appendChild(groupEl);
    }
    applyActive();
  }

  function applyActive() {
    let activeGroup = null;
    for (const btn of container.querySelectorAll(".scene-btn")) {
      const isActive = btn.dataset.sceneId === activeSceneId;
      btn.classList.toggle("active", isActive);
      if (isActive) activeGroup = btn.closest(".scene-group");
    }
    for (const g of container.querySelectorAll(".scene-group")) {
      g.classList.toggle("has-active", g === activeGroup);
    }
    // Keep the current world's dropdown expanded while any of its scenes is
    // active, so switching scenes within a world doesn't collapse the picker.
    if (activeGroup && activeGroup !== openGroupEl) {
      closeOpenGroup();
      activeGroup.classList.add("open");
      openGroupEl = activeGroup;
    }
  }

  function setActiveScene(sceneId) {
    activeSceneId = sceneId;
    applyActive();
  }

  document.addEventListener("click", (e) => {
    if (e.target.closest(".scene-group")) return;
    // Keep the current world's dropdown open even when clicking elsewhere
    // (e.g. moving around inside the 3D scene). Only an outside click on a
    // non-active group dismisses it; the active group is collapsed only by
    // clicking its own pill.
    if (openGroupEl?.classList.contains("has-active")) return;
    closeOpenGroup();
  });

  build();
  return { setActiveScene };
}
