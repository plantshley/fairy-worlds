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
  camera.position.set(0, 1.3, 4.6);
  camera.lookAt(0, 0.9, 0);

  const anchor = new THREE.Group();
  anchor.scale.setScalar(1);
  scene.add(anchor);

  let currentCharacter = null;
  let baseOffsetY = 0;
  let characterTopY = 1.4;
  let loadToken = 0;
  let t = 0;

  // every character is anchored to this Y at their feet — so they all stand on the
  // same baseline. their actual on-screen height varies, and the bubble follows the
  // top each frame via projection (see loop()).
  const FOOT_Y = 0;

  async function setCharacter(id, config) {
    const myToken = ++loadToken;
    const def = CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];
    const char = await loadCharacter(def, config);
    if (myToken !== loadToken) return;
    if (currentCharacter) anchor.remove(currentCharacter.root);
    currentCharacter = char;
    anchor.add(char.root);
    char.root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(char.root);
    if (box.isEmpty()) {
      baseOffsetY = char.root.position.y;
      characterTopY = 1.4;
    } else {
      // shift so the bottom of the bbox sits at FOOT_Y in world space
      baseOffsetY = char.root.position.y + (FOOT_Y - box.min.y);
      characterTopY = FOOT_Y + (box.max.y - box.min.y);
    }
    char.root.position.y = baseOffsetY;
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

  const headWorld = new THREE.Vector3();
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
      const floatDelta = Math.sin(t * 1.4) * 0.05;
      currentCharacter.root.scale.y = baseY * breath;
      currentCharacter.root.position.y = baseOffsetY + floatDelta;
      currentCharacter.update?.(dt);

      // project the character's top into canvas pixel space and pin the bubble above it
      headWorld.set(0, characterTopY + floatDelta, 0);
      headWorld.project(camera);
      const projectedY = ((1 - headWorld.y) / 2) * r.height;
      // tail tip should sit ~14px above the projected head; bubble bottom is
      // ~12px above its translateY position relative to canvas top, so subtract ~26
      const offset = Math.max(0, projectedY - 26);
      bubbleEl.style.transform = `translateY(${offset}px)`;
    }

    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  return { setCharacter, applyState, setDialogue, show, hide };
}
