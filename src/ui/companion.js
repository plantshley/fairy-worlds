import * as THREE from "three";
import { loadCharacter } from "../three/loadCharacter.js";
import { CHARACTERS } from "../data/characters.js";
import { addPastelLighting } from "../three/lighting.js";

export function createCompanion({ containerEl, canvasEl, bubbleEl, onBubbleClick }) {
  const renderer = new THREE.WebGLRenderer({
    canvas: canvasEl,
    antialias: true,
    alpha: true,
  });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  addPastelLighting(scene);
  scene.add(new THREE.AmbientLight(0xffffff, 0.8));
  const boost = new THREE.DirectionalLight(0xffffff, 0.7);
  boost.position.set(0, 2, 4);
  scene.add(boost);

  const camera = new THREE.PerspectiveCamera(24, 1, 0.01, 100);
  camera.position.set(0, 1.4, 4.6);
  camera.lookAt(0, 1.0, 0);

  const anchor = new THREE.Group();
  scene.add(anchor);

  let currentCharacter = null;
  let loadToken = 0;
  let t = 0;

  async function setCharacter(id, config) {
    const myToken = ++loadToken;
    const def = CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];
    const char = await loadCharacter(def, config);
    if (myToken !== loadToken) return;
    if (currentCharacter) anchor.remove(currentCharacter.root);
    currentCharacter = char;
    anchor.add(char.root);
  }

  function applyState(state) {
    if (!currentCharacter || !state) return;
    if (currentCharacter.applyState) {
      currentCharacter.applyState(state);
      return;
    }
    if (state.colors) {
      for (const [id, hex] of Object.entries(state.colors)) {
        currentCharacter.setColor?.(id, hex);
      }
    }
    if (state.variants) {
      for (const [id, v] of Object.entries(state.variants)) {
        currentCharacter.setVariant?.(id, v);
      }
    }
    if (state.accessories) {
      for (const [id, on] of Object.entries(state.accessories)) {
        currentCharacter.setAccessory?.(id, on);
      }
    }
  }

  function setDialogue(text) {
    if (!text) {
      bubbleEl.setAttribute("hidden", "");
      bubbleEl.textContent = "";
      return;
    }
    bubbleEl.textContent = text;
    bubbleEl.removeAttribute("hidden");
  }

  function show() {
    containerEl.removeAttribute("hidden");
  }
  function hide() {
    containerEl.setAttribute("hidden", "");
  }

  if (onBubbleClick) bubbleEl.addEventListener("click", onBubbleClick);

  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    t += dt;

    const r = canvasEl.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) {
      const w = Math.round(r.width);
      const h = Math.round(r.height);
      if (renderer.domElement.width !== w * window.devicePixelRatio ||
          renderer.domElement.height !== h * window.devicePixelRatio) {
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      }
    }

    anchor.rotation.y = Math.sin(t * 0.7) * 0.35;
    if (currentCharacter) {
      const baseY = currentCharacter.baseScale ?? 1;
      const breath = 1 + Math.sin(t * 1.8) * 0.015;
      currentCharacter.root.scale.y = baseY * breath;
      currentCharacter.root.position.y = Math.sin(t * 1.4) * 0.05;
      currentCharacter.update?.(dt);
    }

    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  return { setCharacter, applyState, setDialogue, show, hide };
}
