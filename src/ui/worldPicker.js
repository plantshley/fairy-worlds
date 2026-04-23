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
          onSelectScene(s);
          closeOpenGroup();
        });
        panel.appendChild(btn);
      }
      groupEl.appendChild(panel);

      container.appendChild(groupEl);
    }
    applyActive();
  }

  function applyActive() {
    for (const btn of container.querySelectorAll(".scene-btn")) {
      btn.classList.toggle("active", btn.dataset.sceneId === activeSceneId);
    }
    for (const g of container.querySelectorAll(".scene-group")) {
      const hasActive = !!g.querySelector(".scene-btn.active");
      g.classList.toggle("has-active", hasActive);
    }
  }

  function setActiveScene(sceneId) {
    activeSceneId = sceneId;
    applyActive();
  }

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".scene-group")) closeOpenGroup();
  });

  build();
  return { setActiveScene };
}
