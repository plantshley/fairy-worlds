import * as THREE from "three";
import { SparkRenderer, SplatMesh, SparkControls } from "@sparkjsdev/spark";

const SCENES = [
  {
    id: "heart-pool-1-1-1004",
    world: "Heart Pool Pavilion",
    title: "Heart Pool Pavilion 1.1-1004",
    url: "/splats/Heart%20Pool%20Pavilion.spz",
    spawn: {
      position: [0, 1.5, 0.82],
      quaternion: [0, 0, 0, 1],
    },
  },
  {
    id: "heart-pool-1-1",
    world: "Heart Pool Pavilion",
    title: "Heart Pool Pavilion 1.1",
    url: "/splats/Heart%20Pool%20Pavilion%201-1.spz",
    spawn: {
      position: [0, 1.5, 0.82],
      quaternion: [0, 0, 0, 1],
    },
  },
  {
    id: "heart-pool-1-0",
    world: "Heart Pool Pavilion",
    title: "Heart Pool Pavilion 1.0",
    url: "/splats/Heart%20Pool%20Pavilion%201-0.spz",
    spawn: {
      position: [-0.02, 1.36, 0.72],
      quaternion: [-0.048, 0.014, 0.001, 0.999],
    },
  },
  {
    id: "berry-dream-kitchen-1-1",
    world: "Berry Dream Kitchen",
    title: "Berry Dream Kitchen 1.1",
    url: "/splats/Berry%20Dream%20Kitchen%201-1.spz",
    spawn: {
      position: [-0.02, 1.36, 0.72],
      quaternion: [-0.048, 0.014, 0.001, 0.999],
    },
  },
  {
    id: "berry-dream-kitchen-1-0",
    world: "Berry Dream Kitchen",
    title: "Berry Dream Kitchen 1.0",
    url: "/splats/Berry%20Dream%20Kitchen%201-0.spz",
    spawn: {
      position: [-0.02, 1.36, 0.72],
      quaternion: [-0.048, 0.014, 0.001, 0.999],
    },
  },
  {
    id: "pink-cherry-plane-1-1",
    world: "Pink Cherry Plane",
    title: "Pink Cherry Plane 1.1",
    url: "/splats/Pink%20Cherry%20Plane%201-1.spz",
    spawn: {
      position: [-0.21, 1.57, 0.82],
      quaternion: [-0.007, -0.115, -0.000, 0.993],
    },
  },
  {
    id: "pink-cherry-plane-1-0",
    world: "Pink Cherry Plane",
    title: "Pink Cherry Plane 1.0",
    url: "/splats/Pink%20Cherry%20Plane%201-0.spz",
    spawn: {
      position: [-0.21, 1.57, 0.82],
      quaternion: [-0.007, -0.115, -0.000, 0.993],
    },
  },
];

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.01,
  1000,
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const spark = new SparkRenderer({ renderer });
scene.add(spark);

const controls = new SparkControls({ canvas: renderer.domElement });

let currentSplat = null;
let currentSceneId = null;
let loadToken = 0;

const loader = document.getElementById("loader");
const loaderTitle = loader.querySelector(".loader-title");
const loaderFill = loader.querySelector(".loader-bar-fill");
const loaderPct = loader.querySelector(".loader-pct");

function showLoader(title) {
  loaderTitle.textContent = title;
  loaderFill.style.width = "0%";
  loaderPct.textContent = "0%";
  loader.hidden = false;
}
function updateLoader(pct) {
  const clamped = Math.max(0, Math.min(99, pct));
  loaderFill.style.width = `${clamped}%`;
  loaderPct.textContent = `${Math.round(clamped)}%`;
}
function hideLoader() {
  loaderFill.style.width = "100%";
  loaderPct.textContent = "100%";
  setTimeout(() => {
    loader.hidden = true;
  }, 280);
}

function loadScene(sceneDef) {
  const myToken = ++loadToken;

  if (currentSplat) {
    scene.remove(currentSplat);
    currentSplat.dispose?.();
    currentSplat = null;
  }

  showLoader(sceneDef.title);

  const splat = new SplatMesh({
    url: sceneDef.url,
    onProgress: (event) => {
      if (myToken !== loadToken) return;
      if (event && event.total > 0) {
        updateLoader((event.loaded / event.total) * 100);
      }
    },
    onLoad: () => {
      if (myToken !== loadToken) return;
      hideLoader();
    },
  });
  splat.position.set(0, 0, 0);
  scene.add(splat);
  currentSplat = splat;
  currentSceneId = sceneDef.id;

  const [px, py, pz] = sceneDef.spawn.position;
  const [qx, qy, qz, qw] = sceneDef.spawn.quaternion;
  camera.position.set(px, py, pz);
  camera.quaternion.set(qx, qy, qz, qw);

  updateNavActive();
}

const nav = document.getElementById("scenes");
let openGroupEl = null;

function closeOpenGroup() {
  if (openGroupEl) {
    openGroupEl.classList.remove("open");
    openGroupEl = null;
  }
}

function buildNav() {
  nav.innerHTML = "";
  const groups = new Map();
  for (const s of SCENES) {
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
        loadScene(s);
        closeOpenGroup();
      });
      panel.appendChild(btn);
    }
    groupEl.appendChild(panel);

    nav.appendChild(groupEl);
  }
}

function updateNavActive() {
  for (const btn of nav.querySelectorAll(".scene-btn")) {
    btn.classList.toggle("active", btn.dataset.sceneId === currentSceneId);
  }
  for (const g of nav.querySelectorAll(".scene-group")) {
    const hasActive = !!g.querySelector(".scene-btn.active");
    g.classList.toggle("has-active", hasActive);
  }
}

document.addEventListener("click", (e) => {
  if (!e.target.closest(".scene-group")) closeOpenGroup();
});

function buildSparkles(count = 28) {
  const host = document.getElementById("sparkle-field");
  if (!host) return;
  host.innerHTML = "";
  const glyphs = ["✦", "✧", "★", "✶", "❋"];
  for (let i = 0; i < count; i++) {
    const s = document.createElement("span");
    s.className = "sparkle";
    s.textContent = glyphs[Math.floor(Math.random() * glyphs.length)];
    s.style.setProperty("--x", `${Math.random() * 100}%`);
    s.style.setProperty("--y", `${Math.random() * 100}%`);
    s.style.setProperty("--d", `${(Math.random() * 2.2).toFixed(2)}s`);
    s.style.setProperty("--s", `${10 + Math.random() * 16}px`);
    host.appendChild(s);
  }
}
buildSparkles();

buildNav();
loadScene(SCENES[0]);

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

renderer.setAnimationLoop(() => {
  controls.update(camera);
  renderer.render(scene, camera);
});

window.camera = camera;
window.logPose = () => {
  const p = camera.position;
  const q = camera.quaternion;
  console.log(
    `position: [${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)}],\n` +
      `quaternion: [${q.x.toFixed(3)}, ${q.y.toFixed(3)}, ${q.z.toFixed(3)}, ${q.w.toFixed(3)}],`,
  );
};
