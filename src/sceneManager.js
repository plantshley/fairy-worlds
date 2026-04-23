import * as THREE from "three";
import { fadeElement } from "./three/transition.js";

export function createSceneManager() {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  const modes = new Map();
  let current = null;
  let lastTime = performance.now();
  let transitioning = false;

  function register(mode) {
    modes.set(mode.name, mode);
  }

  function setMode(name, payload) {
    const next = modes.get(name);
    if (!next) throw new Error(`Unknown mode: ${name}`);
    current?.deactivate?.();
    current = next;
    current.activate?.(payload);
  }

  async function transitionTo(name, payload) {
    if (transitioning) return;
    const next = modes.get(name);
    if (!next) throw new Error(`Unknown mode: ${name}`);
    if (next === current) return;

    transitioning = true;
    const overlay = document.getElementById("transition-overlay");

    current?.prepareExit?.();
    await fadeElement(overlay, 0, 1, 500);

    current?.deactivate?.();
    current = next;
    current.activate?.(payload);
    current.prepareEnter?.(payload);

    await fadeElement(overlay, 1, 0, 400);
    transitioning = false;
  }

  function start() {
    renderer.setAnimationLoop((now) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      if (!current) return;
      current.update?.(dt);
      renderer.render(current.scene, current.camera);
    });
  }

  window.addEventListener("resize", () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    for (const mode of modes.values()) mode.resize?.();
  });

  return {
    renderer,
    register,
    setMode,
    transitionTo,
    start,
    currentName: () => current?.name ?? null,
  };
}
