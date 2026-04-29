import * as THREE from "three";
import { SparkRenderer, SplatMesh, SparkControls } from "@sparkjsdev/spark";
import { SCENES } from "../data/scenes.js";
import { showLoader, updateLoader, hideLoader } from "../ui/loader.js";
import { createVRLocomotion } from "../three/vrLocomotion.js";
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

  // Apply the current scene's spawn to the dolly using VR-aware math, without
  // touching the splat. Call this on VR session start, since loadScene only
  // ran the VR branch if isPresenting was true at load time — entering VR
  // after the scene was already loaded on desktop leaves the dolly at origin.
  function recenterToCurrentSpawn() {
    if (!currentSceneId || !renderer.xr?.isPresenting) return;
    const sceneDef = SCENES.find((s) => s.id === currentSceneId);
    if (!sceneDef) return;
    const [px, py, pz] = sceneDef.spawn.position;
    const [qx, qy, qz, qw] = sceneDef.spawn.quaternion;
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
    dollySpawnPos.copy(dolly.position);
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

    const isNewWorld = sceneDef.world !== currentWorld;
    currentWorld = sceneDef.world;

    const [px, py, pz] = sceneDef.spawn.position;
    const [qx, qy, qz, qw] = sceneDef.spawn.quaternion;
    if (!isNewWorld) {
      onSceneLoaded?.(sceneDef);
      return;
    }
    if (renderer.xr?.isPresenting) {
      // In VR, the user's actual head pose = dolly + headset_local_offset.
      // Two corrections:
      //   (1) Yaw recenter: rotate dolly around the head's world position so
      //       the head ends up facing the spawn yaw direction. Pitch/roll on
      //       the spawn are discarded — a tilted dolly is nauseating in VR.
      //   (2) Position recenter: shift dolly so the head lands on spawn.pos.
      const xrCam = renderer.xr.getCamera();
      // selectstart fires between renders; xrCam pose can be one frame stale.
      xrCam.updateMatrixWorld(true);
      xrCam.getWorldPosition(_headPos);
      xrCam.getWorldQuaternion(_headQuat);
      _spawnQuat.set(qx, qy, qz, qw);

      const deltaYaw = extractYaw(_spawnQuat) - extractYaw(_headQuat);
      _yawQuat.setFromAxisAngle(Y_AXIS, deltaYaw);
      // Pivot dolly around the head world position, then apply yaw to dolly.
      dolly.position.sub(_headPos).applyQuaternion(_yawQuat).add(_headPos);
      dolly.quaternion.premultiply(_yawQuat);

      // After rotation the head is still at _headPos. Now translate dolly so
      // the head lands at spawn.position.
      _spawnVec.set(px, py, pz);
      dolly.position.add(_spawnVec.sub(_headPos));
      camera.position.set(0, 0, 0);
      camera.quaternion.identity();
    } else {
      dolly.position.set(0, 0, 0);
      dolly.quaternion.identity();
      camera.position.set(px, py, pz);
      camera.quaternion.set(qx, qy, qz, qw);
    }
    dollySpawnPos.copy(dolly.position);

    onSceneLoaded?.(sceneDef);
  }

  function update(dt) {
    if (renderer.xr?.isPresenting) {
      vrLocomotion.update(dt, dolly);
      noteVRDistance(dolly.position.distanceTo(dollySpawnPos));
      return;
    }
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
    const targetScene = payload?.scene;
    if (targetScene) loadScene(targetScene);
    else if (!currentSceneId) loadDefault();
  }

  function deactivate() {
    document.getElementById("world-hud")?.setAttribute("hidden", "");
    document.exitPointerLock?.();
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
  };
}
