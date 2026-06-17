export function createWorldPicker({ container, scenes, onSelectScene }) {
  let openGroupEl = null;
  let activeSceneId = null;

  // Phones in portrait get little screen real estate, so collapse the dropdown
  // after entering a scene there. Larger / landscape layouts keep it open.
  function isPhonePortrait() {
    return window.matchMedia("(max-width: 480px) and (orientation: portrait)").matches;
  }

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
    // Exception: phones in portrait collapse it after entering a scene.
    if (isPhonePortrait()) {
      closeOpenGroup();
    } else if (activeGroup && activeGroup !== openGroupEl) {
      closeOpenGroup();
      activeGroup.classList.add("open");
      openGroupEl = activeGroup;
    }
  }

  function setActiveScene(sceneId) {
    activeSceneId = sceneId;
    applyActive();
  }

  // External close — used by setNavMode when leaving picker-nav, and by the
  // viewport matchMedia listener when desktop→phone-portrait resize happens
  // while a group was left open. Without this, .scene-group.open persists in
  // the DOM and any rule like :has(#scenes .scene-group.open) keeps firing
  // even though the picker is no longer visible (e.g. hides #btn-spawn-box).
  function close() {
    closeOpenGroup();
  }

  // Desktop keeps the active world's dropdown open; phone-portrait collapses
  // it. If the viewport flips desktop→phone-portrait mid-session, no scene
  // re-activation fires to trigger applyActive's collapse path — so close
  // imperatively here too.
  window.matchMedia("(max-width: 480px) and (orientation: portrait)")
    .addEventListener("change", (e) => { if (e.matches) closeOpenGroup(); });

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
  return { setActiveScene, close };
}
