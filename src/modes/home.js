import * as THREE from "three";
import { addPastelLighting } from "../three/lighting.js";
import { cameraZoomIn, tween } from "../three/transition.js";
import { loadCharacter } from "../three/loadCharacter.js";
import { CHARACTERS } from "../data/characters.js";

const RESTING_RADIUS = 3.4;
const RESTING_HEIGHT = 1.4;
const RESTING_FOV = 50;
const PLATFORM_TARGET_Y = 0.6;

function makePlatform() {
  const group = new THREE.Group();
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(1.1, 1.3, 0.25, 48),
    new THREE.MeshStandardMaterial({ color: 0xffe4f5, roughness: 0.65 }),
  );
  base.position.y = -0.125;
  group.add(base);

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(1.1, 0.05, 16, 64),
    new THREE.MeshStandardMaterial({
      color: 0xffacea,
      roughness: 0.35,
      emissive: 0xffacea,
      emissiveIntensity: 0.18,
    }),
  );
  rim.rotation.x = Math.PI / 2;
  group.add(rim);
  return group;
}

export function createHomeMode({ renderer }) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    RESTING_FOV,
    window.innerWidth / window.innerHeight,
    0.01,
    1000,
  );

  addPastelLighting(scene);
  scene.add(makePlatform());

  const characterAnchor = new THREE.Group();
  scene.add(characterAnchor);
  let currentCharacter = null;
  let breathTime = 0;

  async function setCharacter(id, savedConfig) {
    const def = CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];
    if (currentCharacter) {
      characterAnchor.remove(currentCharacter.root);
      currentCharacter = null;
    }
    currentCharacter = await loadCharacter(def, savedConfig);
    if (def.kind === "procedural") {
      currentCharacter.root.scale.setScalar(1.25);
      currentCharacter.baseScale = 1.25;
    }
    characterAnchor.add(currentCharacter.root);
    return currentCharacter;
  }

  const orbit = {
    angle: 0,
    radius: RESTING_RADIUS,
    height: RESTING_HEIGHT,
    autoRotate: true,
    target: new THREE.Vector3(0, PLATFORM_TARGET_Y, 0),
  };
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const focusPlane = new THREE.Plane();
  const cursorWorld = new THREE.Vector3();
  const camForward = new THREE.Vector3();

  const drag = { active: false, lastX: 0, lastY: 0, pointerId: null, enabled: false };
  const canvas = renderer.domElement;
  const HEIGHT_MIN = 0.4;
  const HEIGHT_MAX = 2.4;
  const RADIUS_MIN = 1.6;
  const RADIUS_MAX = 6.0;

  const onPointerDown = (e) => {
    if (!drag.enabled) return;
    drag.active = true;
    drag.lastX = e.clientX;
    drag.lastY = e.clientY;
    drag.pointerId = e.pointerId;
    orbit.autoRotate = false;
    canvas.setPointerCapture?.(e.pointerId);
    canvas.style.cursor = "grabbing";
  };
  const onPointerMove = (e) => {
    if (!drag.active) return;
    const dx = e.clientX - drag.lastX;
    const dy = e.clientY - drag.lastY;
    drag.lastX = e.clientX;
    drag.lastY = e.clientY;
    orbit.angle -= dx * 0.008;
    orbit.height = Math.max(HEIGHT_MIN, Math.min(HEIGHT_MAX, orbit.height + dy * 0.005));
  };
  const onPointerUp = () => {
    if (!drag.active) return;
    drag.active = false;
    canvas.releasePointerCapture?.(drag.pointerId);
    drag.pointerId = null;
    canvas.style.cursor = drag.enabled ? "grab" : "";
  };

  const onWheel = (e) => {
    if (!drag.enabled) return;
    e.preventDefault();
    orbit.autoRotate = false;
    const factor = Math.exp(e.deltaY * 0.0004);
    const newRadius = Math.max(RADIUS_MIN, Math.min(RADIUS_MAX, orbit.radius * factor));
    const k = newRadius / orbit.radius;
    orbit.radius = newRadius;
    if (k === 1) return;

    // raycast cursor onto the focus plane to find the world point under the cursor.
    // shift target height toward/away from that point so vertical framing tracks the
    // cursor — but leave target.x/z alone so the view doesn't rotate/pan laterally.
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    raycaster.setFromCamera(ndc, camera);

    // place a plane perpendicular to the view direction passing through the target,
    // then raycast cursor against it to find the world point under the cursor at
    // target depth. shift only target.y — not x/z — so framing tracks cursor
    // vertically without lateral pan/rotation.
    camForward.subVectors(orbit.target, camera.position).normalize();
    focusPlane.setFromNormalAndCoplanarPoint(camForward, orbit.target);
    if (!raycaster.ray.intersectPlane(focusPlane, cursorWorld)) return;

    const sy = (1 - k) * (cursorWorld.y - orbit.target.y);
    orbit.target.y = Math.max(
      PLATFORM_TARGET_Y - 0.2,
      Math.min(PLATFORM_TARGET_Y + 1.2, orbit.target.y + sy),
    );
  };

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);
  canvas.addEventListener("wheel", onWheel, { passive: false });

  function update(dt) {
    const xrActive = renderer.xr?.isPresenting;
    if (!xrActive) {
      if (orbit.autoRotate) orbit.angle += dt * 0.08;
      camera.position.x = orbit.target.x + Math.sin(orbit.angle) * orbit.radius;
      camera.position.z = orbit.target.z + Math.cos(orbit.angle) * orbit.radius;
      camera.position.y = orbit.height;
      camera.lookAt(orbit.target);
    }

    if (currentCharacter) {
      breathTime += dt;
      const breath = 1 + Math.sin(breathTime * 1.6) * 0.01;
      const baseY = currentCharacter.baseScale ?? 1;
      currentCharacter.root.scale.y = baseY * breath;
      currentCharacter.update?.(dt);
    }
  }

  function resize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  }

  function activate() {
    document.getElementById("home-hud")?.removeAttribute("hidden");
    document.getElementById("world-hud")?.setAttribute("hidden", "");
    document.getElementById("scenes")?.removeAttribute("hidden");
    renderer.domElement.style.pointerEvents = "auto";
    renderer.domElement.style.cursor = "grab";
    drag.enabled = true;
    orbit.autoRotate = true;
    orbit.radius = RESTING_RADIUS;
    orbit.height = RESTING_HEIGHT;
    orbit.target.set(0, PLATFORM_TARGET_Y, 0);
    camera.fov = RESTING_FOV;
    camera.updateProjectionMatrix();
  }

  function deactivate() {
    document.getElementById("home-hud")?.setAttribute("hidden", "");
    drag.enabled = false;
    drag.active = false;
    renderer.domElement.style.cursor = "";
  }

  function prepareExit() {
    orbit.autoRotate = false;
    return cameraZoomIn(camera, {
      targetPos: [
        Math.sin(orbit.angle) * 1.4,
        PLATFORM_TARGET_Y + 0.3,
        Math.cos(orbit.angle) * 1.4,
      ],
      targetFov: 28,
      duration: 650,
    });
  }

  function prepareEnter() {
    orbit.autoRotate = true;
    orbit.radius = 1.4;
    orbit.height = PLATFORM_TARGET_Y + 0.3;
    camera.fov = 28;
    camera.updateProjectionMatrix();
    return new Promise((resolve) => {
      tween({
        duration: 700,
        onUpdate: (t) => {
          orbit.radius = 1.4 + (RESTING_RADIUS - 1.4) * t;
          orbit.height =
            PLATFORM_TARGET_Y + 0.3 + (RESTING_HEIGHT - (PLATFORM_TARGET_Y + 0.3)) * t;
          camera.fov = 28 + (RESTING_FOV - 28) * t;
          camera.updateProjectionMatrix();
        },
        onComplete: resolve,
      });
    });
  }

  return {
    name: "home",
    scene,
    camera,
    update,
    resize,
    activate,
    deactivate,
    prepareExit,
    prepareEnter,
    setCharacter,
    getCharacter: () => currentCharacter,
  };
}
