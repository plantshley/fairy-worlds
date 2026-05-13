import * as THREE from "three";
import { SparkRenderer, SplatMesh, SparkControls } from "@sparkjsdev/spark";
import { SCENES } from "../data/scenes.js";
import { showLoader, updateLoader, hideLoader } from "../ui/loader.js";
import { createVRLocomotion } from "../three/vrLocomotion.js";
import { createTouchControls } from "../three/touchControls.js";
import {
  trackWorldEnter,
  sceneVersionFromTitle,
  noteVRWorldVisited,
  noteVRDistance,
} from "../utils/analytics.js";

export function createWorldMode({ renderer, onSceneLoaded }) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.01,
    1000,
  );

  const spark = new SparkRenderer({ renderer });
  scene.add(spark);

  const dolly = new THREE.Group();
  dolly.add(camera);
  scene.add(dolly);

  const controls = new SparkControls({ canvas: renderer.domElement });
  const vrLocomotion = createVRLocomotion(renderer);
  const touchControls = createTouchControls(renderer);
  const isCoarsePointer = window.matchMedia?.("(pointer: coarse)").matches ?? false;

  let currentSplat = null;
  let currentSceneId = null;
  let currentWorld = null;
  let loadToken = 0;
  const dollySpawnPos = new THREE.Vector3();
  const _spawnVec = new THREE.Vector3();
  const _headPos = new THREE.Vector3();
  const _headQuat = new THREE.Quaternion();
  const _spawnQuat = new THREE.Quaternion();
  const _yawQuat = new THREE.Quaternion();
  const _forward = new THREE.Vector3();
  const Y_AXIS = new THREE.Vector3(0, 1, 0);

  // Pull yaw (rotation around Y) out of a quaternion by rotating the
  // canonical "forward" vector and projecting onto the ground plane.
  // Pitch/roll are intentionally discarded — tilting the dolly in VR
  // is nauseating, so we only recenter heading.
  function extractYaw(quat) {
    // Rotating (0,0,-1) by yaw θ around +Y gives (-sin θ, 0, -cos θ), so
    // recover θ = atan2(-forward.x, -forward.z). The previous version used
    // atan2(forward.x, -forward.z) and returned -θ, which made deltaYaw the
    // wrong sign and rotated the head AWAY from the spawn yaw.
    _forward.set(0, 0, -1).applyQuaternion(quat);
    return Math.atan2(-_forward.x, -_forward.z);
  }

  // Apply a scene's spawn pose to either the dolly (VR) or the camera (desktop).
  // VR branch does a yaw-only recenter so the user's actual head ends up at
  // spawn.position facing spawn yaw — pitch/roll are discarded since a tilted
  // dolly is nauseating. Desktop branch resets dolly to origin and writes
  // spawn directly into the camera.
  function applySpawn(sceneDef) {
    const [px, py, pz] = sceneDef.spawn.position;
    const [qx, qy, qz, qw] = sceneDef.spawn.quaternion;
    if (renderer.xr?.isPresenting) {
      const xrCam = renderer.xr.getCamera();
      xrCam.updateMatrixWorld(true);
      xrCam.getWorldPosition(_headPos);
      xrCam.getWorldQuaternion(_headQuat);
      _spawnQuat.set(qx, qy, qz, qw);
      const deltaYaw = extractYaw(_spawnQuat) - extractYaw(_headQuat);
      _yawQuat.setFromAxisAngle(Y_AXIS, deltaYaw);
      dolly.position.sub(_headPos).applyQuaternion(_yawQuat).add(_headPos);
      dolly.quaternion.premultiply(_yawQuat);
      _spawnVec.set(px, py, pz);
      dolly.position.add(_spawnVec.sub(_headPos));
      camera.position.set(0, 0, 0);
      camera.quaternion.identity();
    } else {
      dolly.position.set(0, 0, 0);
      dolly.quaternion.identity();
      camera.position.set(px, py, pz);
      camera.quaternion.set(qx, qy, qz, qw);
      // SparkControls applies inertia each frame from rotateVelocity/moveVelocity.
      // If these have nonzero residual from recent input, the camera drifts off
      // spawn immediately after our reset. Zero them.
      controls.pointerControls?.rotateVelocity?.set(0, 0, 0);
      controls.pointerControls?.moveVelocity?.set(0, 0, 0);
    }
    dollySpawnPos.copy(dolly.position);
  }

  function returnToOrigin() {
    if (!currentSceneId) return;
    const sceneDef = SCENES.find((s) => s.id === currentSceneId);
    if (sceneDef) applySpawn(sceneDef);
  }

  // Kept for callers that only want a no-op when not in VR (the VR session-
  // start hook). Desktop reset is handled by the return-to-spawn UI button.
  function recenterToCurrentSpawn() {
    if (!renderer.xr?.isPresenting) return;
    returnToOrigin();
  }

  function loadScene(sceneDef) {
    const myToken = ++loadToken;

    trackWorldEnter({
      sceneId: sceneDef.id,
      world: sceneDef.world,
      version: sceneVersionFromTitle(sceneDef.title),
      from: currentSceneId ? "world" : "home",
    });
    if (renderer.xr?.isPresenting) noteVRWorldVisited();

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

    // "Random" is a catchall group, not a real world — each scene there has its
    // own unrelated spawn, so always recenter when cycling within it.
    const isNewWorld = sceneDef.world !== currentWorld || sceneDef.world === "Random";
    currentWorld = sceneDef.world;

    if (!isNewWorld) {
      onSceneLoaded?.(sceneDef);
      return;
    }
    applySpawn(sceneDef);

    onSceneLoaded?.(sceneDef);
  }

  // Edge-detect button[3] press on either controller. On HTC Vive wand this is
  // the menu button (target headset per memory); on Quest Touch it's the
  // thumbstick click. The WebXR Emulator's Vive profile doesn't expose this
  // button — for emulator testing, press BOTH triggers simultaneously instead
  // (handled in vrButton.js as the cross-hand select gesture).
  let _recenterButtonPrev = false;
  function pollRecenterButton() {
    const session = renderer.xr.getSession();
    if (!session) return;
    let pressed = false;
    for (const src of session.inputSources) {
      if (src.gamepad?.buttons?.[3]?.pressed) {
        pressed = true;
        break;
      }
    }
    if (pressed && !_recenterButtonPrev) returnToOrigin();
    _recenterButtonPrev = pressed;
  }

  function update(dt) {
    if (renderer.xr?.isPresenting) {
      vrLocomotion.update(dt, dolly);
      pollRecenterButton();
      noteVRDistance(dolly.position.distanceTo(dollySpawnPos));
      return;
    }
    touchControls.update(dt, camera);
    controls.update(camera);
  }

  function resize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  }

  function loadDefault() {
    loadScene(SCENES[0]);
  }

  function cycleScene(direction) {
    if (!currentSceneId) return;
    const idx = SCENES.findIndex((s) => s.id === currentSceneId);
    if (idx < 0) return;
    const nextIdx = (idx + direction + SCENES.length) % SCENES.length;
    loadScene(SCENES[nextIdx]);
  }

  // Step until we land on a scene whose `world` differs from the current
  // world group, then keep stepping while still inside that new group going
  // backward so we land on its FIRST scene (in array order). For forward
  // direction this naturally lands on the first scene of the next group.
  function cycleWorld(direction) {
    if (!currentSceneId) return;
    const startIdx = SCENES.findIndex((s) => s.id === currentSceneId);
    if (startIdx < 0) return;
    const fromWorld = SCENES[startIdx].world;
    const n = SCENES.length;
    let idx = startIdx;
    for (let step = 0; step < n; step++) {
      idx = (idx + direction + n) % n;
      if (SCENES[idx].world !== fromWorld) break;
    }
    if (direction < 0) {
      const targetWorld = SCENES[idx].world;
      while (idx > 0 && SCENES[idx - 1].world === targetWorld) idx--;
    }
    loadScene(SCENES[idx]);
  }

  function activate(payload) {
    document.getElementById("world-hud")?.removeAttribute("hidden");
    document.getElementById("home-hud")?.setAttribute("hidden", "");
    document.getElementById("scenes")?.removeAttribute("hidden");
    renderer.domElement.style.pointerEvents = "auto";
    if (isCoarsePointer) touchControls.enable();
    const targetScene = payload?.scene;
    if (targetScene) loadScene(targetScene);
    else if (!currentSceneId) loadDefault();
  }

  function deactivate() {
    document.getElementById("world-hud")?.setAttribute("hidden", "");
    document.exitPointerLock?.();
    touchControls.disable();
  }

  window.camera = camera;
  window.logPose = () => {
    let p, q;
    if (renderer.xr?.isPresenting) {
      const xrCam = renderer.xr.getCamera();
      xrCam.updateMatrixWorld(true);
      p = new THREE.Vector3();
      q = new THREE.Quaternion();
      xrCam.getWorldPosition(p);
      xrCam.getWorldQuaternion(q);
      console.log(`[VR head world pose, world=${currentWorld}]`);
    } else {
      p = camera.position;
      q = camera.quaternion;
    }
    console.log(
      `position: [${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)}],\n` +
        `quaternion: [${q.x.toFixed(3)}, ${q.y.toFixed(3)}, ${q.z.toFixed(3)}, ${q.w.toFixed(3)}],`,
    );
  };

  return {
    name: "world",
    scene,
    camera,
    update,
    resize,
    activate,
    deactivate,
    loadDefault,
    loadScene,
    cycleScene,
    cycleWorld,
    recenterToCurrentSpawn,
    returnToOrigin,
  };
}
