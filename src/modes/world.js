import * as THREE from "three";
import { SparkRenderer, SplatMesh, SparkControls } from "@sparkjsdev/spark";
import { SCENES } from "../data/scenes.js";
import { getColliderForScene, getObjectsForWorld } from "../data/sceneAssets.js";
import { showLoader, updateLoader, hideLoader } from "../ui/loader.js";
import { createVRLocomotion } from "../three/vrLocomotion.js";
import { createTouchControls } from "../three/touchControls.js";
import { ensureReady as ensureRapierReady, createPhysics } from "../three/physics.js";
import { createGrab } from "../three/grab.js";
import { addPastelLighting } from "../three/lighting.js";
import { loadCharacter } from "../three/loadCharacter.js";
import { fadeElement } from "../three/transition.js";
import { createPortalInteraction } from "../three/portals.js";

const OBJECT_MODE_KEY = "fairy-worlds-object-mode";
function isObjectMode() {
  return localStorage.getItem(OBJECT_MODE_KEY) === "1";
}

// Single in-world target size (meters, longest bbox dimension) applied to
// every GLB dropped via spawnBox. Source GLBs come from different tools at
// different authoring scales — this constant pins them all to a consistent
// hand-sized object. Tweak here.
const OBJECT_TARGET_SIZE = 0.4;

// Average standing eye height (meters). Used as the offset between a scene's
// spawn.y (which is the camera/eye position in splat coords) and the floor's
// Y when `autoAlignFloor: true` is set on a scene — the collider's lowest
// vertex gets snapped to (spawn.y − this), which is approximately where the
// splat's floor sits.
const ASSUMED_EYE_HEIGHT = 1.6;
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

  // maxStdDev defaults to sqrt(8)≈2.83 — splats extend out far enough to
  // overlap neighbors and close inter-splat gaps. Earlier this was clamped to
  // sqrt(4)=2 for perf, but that made sparse scenes (AC-style interiors) show
  // visible "loose dots" because adjacent splats no longer touched.
  // focalAdjustment 2.0 matches PlayCanvas-style splat sharpening, which is
  // the likely renderer behind Marble's viewer.
  const spark = new SparkRenderer({ renderer, focalAdjustment: 2.0 });
  scene.add(spark);

  // Splats are self-colored (Spark) and physics boxes are MeshBasicMaterial,
  // so the world scene was unlit. Portal GLBs (e.g. Celeste) use PBR
  // materials — without lights they render solid black. Adding lights here is
  // safe: unlit materials ignore them, lit materials become visible.
  addPastelLighting(scene);

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
  let physics = null;
  let grab = null;
  let physicsPromise = null;
  // Round-robin index into the current world's mapped object GLBs. Resets on
  // world change so each new world starts at object 0.
  let objectCycleIdx = 0;
  const currentPortals = []; // { root, target, baseY, animation, scale, loaderText, phase }
  let portalClock = 0;
  // Held by loadScene so a follow-up loadScene can unblock the previous load's
  // awaiters before replacing the resolver. Cleared on resolve. enterPortal
  // awaits the Promise returned from loadScene directly, not this variable.
  let _loadResolve = null;
  // Gates portal entry: true only while world mode is the active mode AND no
  // portal transition is in flight. Prevents (a) home-mode canvas taps that
  // accidentally raycast-hit a stale world-scene portal, and (b) re-entrant
  // enterPortal calls racing on the overlay fade + loadToken.
  let isActive = false;
  let portalTransitioning = false;
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

  // Cache the in-flight promise so concurrent callers share one init instead of
  // racing two (which would double-register grab's DOM listeners).
  function ensurePhysics() {
    if (physicsPromise) return physicsPromise;
    physicsPromise = (async () => {
      await ensureRapierReady();
      physics = createPhysics({ scene });
      grab = createGrab({ renderer, camera, dolly, physics });
    })();
    return physicsPromise;
  }

  // Drops something in front of the player. If the current world has mapped
  // object GLBs (see src/data/sceneAssets.js), cycles through them
  // deterministically; otherwise falls back to a randomly-colored primitive
  // box. Spawn position is ~2.5m in front of the camera, 0.4m above eye level,
  // with light XZ jitter so repeated drops don't stack on the same point.
  function spawnBox() {
    if (!physics) {
      ensurePhysics().then(() => physics && spawnBox());
      return;
    }
    const head = renderer.xr?.isPresenting ? renderer.xr.getCamera() : camera;
    head.updateMatrixWorld(true);
    const p = new THREE.Vector3();
    const fwd = new THREE.Vector3();
    head.getWorldPosition(p);
    head.getWorldDirection(fwd);
    fwd.y = 0;
    if (fwd.lengthSq() < 1e-6) fwd.set(0, 0, -1);
    else fwd.normalize();
    const spawnDistance = 2.5;
    const jitterX = (Math.random() - 0.5) * 0.3;
    const jitterZ = (Math.random() - 0.5) * 0.3;
    const position = {
      x: p.x + fwd.x * spawnDistance + jitterX,
      y: p.y + 0.4,
      z: p.z + fwd.z * spawnDistance + jitterZ,
    };

    const mapped = currentWorld ? getObjectsForWorld(currentWorld) : [];
    if (mapped.length > 0) {
      const url = mapped[objectCycleIdx % mapped.length];
      objectCycleIdx++;
      physics.spawnObject({ url, position, targetSize: OBJECT_TARGET_SIZE }).catch((err) => {
        console.warn(`[world] spawnObject failed for ${url}, falling back to box:`, err);
        physics.spawnBox({ position, size: 0.3, color: 0xff88cc });
      });
      return;
    }

    const palette = [0xff88cc, 0xc8b3fb, 0xfccb83, 0x88ddff, 0xb3fbc8];
    const color = palette[Math.floor(Math.random() * palette.length)];
    physics.spawnBox({ position, size: 0.3, color });
  }

  function tryGrab(hand) {
    return grab?.tryGrab(hand) ?? false;
  }
  function releaseGrab(hand) {
    return grab?.releaseGrab(hand) ?? false;
  }

  window.addEventListener("objectmodechange", () => {
    if (isObjectMode()) ensurePhysics();
  });

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

  // Returns a Promise that resolves when the splat's onLoad fires for this
  // load (or immediately on stale-load cancel). enterPortal awaits it so the
  // fade-out only runs once the new scene is actually rendered.
  function loadScene(sceneDef, opts = {}) {
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
    disposePortals();

    if (isObjectMode() && !physics) ensurePhysics();
    const sceneChanged = sceneDef.id !== currentSceneId;
    // Boxes/objects clear on every scene change (the dropped state was
    // positioned against the old collider — keeping it after a swap would
    // leave items floating or stuck in new geometry).
    if (physics && sceneChanged) {
      // Drop any active grab BEFORE freeing bodies — otherwise grab.update()
      // calls setKinematicPose on a freed Rapier handle next frame.
      grab?.releaseAll();
      physics.clearAll();
      objectCycleIdx = 0;
    }
    // Collider URL is auto-derived from scene id via the asset-manifest plugin
    // (see src/data/sceneAssets.js). Explicit sceneDef.collider still wins if
    // present, so a scene can override the convention. We only load the
    // collider if object mode is on OR physics is already initialized — no
    // point spinning up Rapier just to install a collider nobody can interact
    // with yet.
    const colliderUrl = sceneDef.collider ?? getColliderForScene(sceneDef.id);
    if (sceneChanged && (isObjectMode() || physics)) {
      // Pack collider load options. autoAlignFloor: true on a scene snaps the
      // collider's lowest vertex to the splat's estimated floor Y, so Marble
      // exports with random baked offsets self-correct.
      const colliderOpts = {
        offset: sceneDef.colliderOffset,
        autoAlignFloorY: sceneDef.autoAlignFloor
          ? sceneDef.spawn.position[1] - ASSUMED_EYE_HEIGHT
          : undefined,
      };
      ensurePhysics().then(() => {
        if (!physics) return;
        if (colliderUrl) physics.loadSceneCollider(colliderUrl, colliderOpts);
        else physics.clearSceneCollider();
      });
    }

    // Per-scene DPR override — default 2 matches the cap set in sceneManager;
    // drop a scene to 1.5 (or lower) if its splats are dense enough that the
    // perf cost outweighs the crispness gain.
    const targetPR = Math.min(window.devicePixelRatio, sceneDef.pixelRatio ?? 2);
    if (renderer.getPixelRatio() !== targetPR) {
      renderer.setPixelRatio(targetPR);
      renderer.setSize(window.innerWidth, window.innerHeight);
    }

    showLoader(opts.loaderText ?? sceneDef.title);

    // Unblock the previous load's awaiters (no-op if already resolved) before
    // installing a fresh resolver. Standard deferred pattern — no tagging on
    // the Promise object itself.
    _loadResolve?.();
    let resolveThisLoad;
    const loadPromise = new Promise((r) => { resolveThisLoad = r; });
    _loadResolve = resolveThisLoad;

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
        resolveThisLoad();
        // Only clear the shared slot if it's still ours — a newer load may
        // have already overwritten it with its own resolver.
        if (_loadResolve === resolveThisLoad) _loadResolve = null;
      },
    });
    splat.position.set(0, 0, 0);
    scene.add(splat);
    currentSplat = splat;
    currentSceneId = sceneDef.id;

    spawnPortals(sceneDef, myToken);

    // "Random" is a catchall group, not a real world — each scene there has its
    // own unrelated spawn, so always recenter when cycling within it.
    const isNewWorld = sceneDef.world !== currentWorld || sceneDef.world === "Random";
    currentWorld = sceneDef.world;

    if (!isNewWorld) {
      onSceneLoaded?.(sceneDef);
      return loadPromise;
    }
    applySpawn(sceneDef);

    onSceneLoaded?.(sceneDef);
    return loadPromise;
  }

  function disposePortals() {
    if (currentPortals.length === 0) return;
    for (const p of currentPortals) {
      scene.remove(p.root);
      p.root.traverse((obj) => {
        // Cover Meshes (GLB geometry) and Sprites (♡ bubble) — both have
        // .material that needs disposal, and Mesh has its own geometry.
        // Sprite geometry is shared internally by three.js; don't dispose it.
        if (obj.isMesh) obj.geometry?.dispose?.();
        if (obj.isMesh || obj.isSprite) {
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          for (const m of mats) {
            m?.map?.dispose?.();
            m?.dispose?.();
          }
        }
      });
    }
    currentPortals.length = 0;
  }

  // Fire-and-forget per portal. The loadToken gate guarantees a stale GLB
  // (user switched scenes mid-fetch) doesn't get added to the wrong scene.
  function spawnPortals(sceneDef, myToken) {
    const defs = sceneDef.portals;
    if (!defs || defs.length === 0) return;
    for (const portalDef of defs) {
      loadCharacter({ kind: "glb", ...portalDef.render })
        .then(({ root: inner }) => {
          if (myToken !== loadToken) return;
          // Wrap in an outer group so the portal's world pose lives here,
          // leaving any offsetX/Y/Z + rotationY that wrapWithScale baked into
          // `inner` intact (same fitup vocabulary as characters.js).
          const root = new THREE.Group();
          root.position.fromArray(portalDef.position);
          root.rotation.y = portalDef.rotationY ?? 0;
          root.add(inner);

          // Compute a LOCAL-to-root bbox from bind-pose geometry boxes. We do
          // this manually instead of Box3.setFromObject because SkinnedMesh
          // overrides computeBoundingBox to use post-skinning vertices via
          // getVertexPosition() — and with no AnimationMixer running, the
          // skeleton hasn't been driven, so getVertexPosition collapses every
          // vertex to ~origin. The bind-pose geometry.boundingBox is what we
          // actually want for sizing a click proxy + bubble anchor.
          // bbox expressed in root's LOCAL frame (so proxy + bubble positions
          // copy directly without further transforms). stopAt=root includes
          // inner's wrapper scale in the chain.
          const localBox = computeLocalBindBox(inner, root);

          // Invisible click proxy. SkinnedMesh raycast pre-culls on the same
          // collapsed skinning bbox, so the ray never reaches per-triangle
          // tests on the actual character. A simple Box mesh raycasts reliably
          // regardless of skinning, and findHitPortal walks the parent chain
          // back to `root`, so a proxy hit registers as a portal hit.
          let proxy = null;
          if (!localBox.isEmpty()) {
            const size = new THREE.Vector3();
            localBox.getSize(size);
            const center = new THREE.Vector3();
            localBox.getCenter(center);
            const geom = new THREE.BoxGeometry(size.x, size.y, size.z);
            const mat = new THREE.MeshBasicMaterial({ visible: false });
            proxy = new THREE.Mesh(geom, mat);
            proxy.position.copy(center);
            root.add(proxy);
          }

          // ♡ speech bubble above her head — anchored on the bind-pose top.
          // Size is proportional to character height with a sensible floor so
          // small-scale characters still show a visible bubble.
          if (portalDef.bubble !== false && !localBox.isEmpty()) {
            const height = localBox.max.y - localBox.min.y;
            const width = Math.max(localBox.max.x - localBox.min.x, localBox.max.z - localBox.min.z);
            const bubble = createHeartBubble();
            const bubbleSize = Math.max(height * 0.14, width * 0.2);
            bubble.scale.set(bubbleSize, bubbleSize, 1);
            bubble.position.set(0, localBox.max.y + bubbleSize * 0.65, 0);
            root.add(bubble);
          }

          scene.add(root);
          currentPortals.push({
            root,
            proxy,
            target: portalDef.target,
            baseY: portalDef.position[1],
            animation: portalDef.animation ?? "bob",
            scale: portalDef.render?.scale ?? 1,
            loaderText: portalDef.loaderText,
            // Random phase so multiple portals in one scene don't bob in lockstep.
            phase: Math.random() * Math.PI * 2,
          });
        })
        .catch((err) => {
          console.warn(`[portals] failed to load ${portalDef.id ?? portalDef.target}:`, err);
        });
    }
  }

  // Manual bbox from bind-pose geometry boxes, expressed in `stopAt`'s local
  // frame. We compose each descendant's transform RELATIVE to stopAt (not via
  // matrixWorld, which depends on scene-level matrix updates and can be stale
  // when called synchronously after .add()). For SkinnedMesh we deliberately
  // use the static geometry.boundingBox — SkinnedMesh.computeBoundingBox()
  // applies skinning, and with no AnimationMixer driving the skeleton it
  // collapses every vertex to ≈origin.
  function computeLocalBindBox(inner, stopAt) {
    const box = new THREE.Box3();
    const tmpBox = new THREE.Box3();
    const tmpMat = new THREE.Matrix4();
    inner.traverse((obj) => {
      if (!obj.isMesh && !obj.isSkinnedMesh) return;
      const geo = obj.geometry;
      if (!geo) return;
      if (!geo.boundingBox) geo.computeBoundingBox();
      tmpMat.identity();
      const chain = [];
      let cursor = obj;
      while (cursor && cursor !== stopAt) {
        cursor.updateMatrix();
        chain.push(cursor.matrix);
        cursor = cursor.parent;
      }
      // chain is [obj.matrix, parent.matrix, ...]; compose outermost first so
      // the result is parent*…*obj — the standard local-frame transform.
      for (let i = chain.length - 1; i >= 0; i--) tmpMat.multiply(chain[i]);
      tmpBox.copy(geo.boundingBox).applyMatrix4(tmpMat);
      box.union(tmpBox);
    });
    return box;
  }

  // Pink circular ♡ bubble drawn into a CanvasTexture. Sprite auto-billboards
  // toward the camera (works in VR too). Texture + material are disposed when
  // the portal is torn down via the standard traverse in disposePortals.
  function createHeartBubble() {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "rgba(255, 200, 225, 0.95)";
    ctx.beginPath();
    ctx.arc(64, 64, 56, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(220, 80, 150, 0.85)";
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.fillStyle = "#d63384";
    ctx.font = "bold 80px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    // ♡ visual weight sits in the lobes; nudge down a hair to look centered.
    ctx.fillText("♡", 64, 70);

    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.renderOrder = 10;
    return sprite;
  }

  // Same overlay/helper as home↔scene transitions in sceneManager.transitionTo,
  // just shorter durations. enterPortal stays inside world mode (no manager
  // mode swap), so the two flows never overlap.
  //
  // Guarded against (a) entry from a non-active world mode (e.g. a home-screen
  // canvas tap that happens to raycast-hit a stale portal mesh), and (b)
  // re-entrant calls during the fade/load, which would stomp the overlay fade
  // and race the loadToken. Both would corrupt the user-visible transition.
  async function enterPortal(portal) {
    if (!isActive || portalTransitioning) return;
    const target = SCENES.find((s) => s.id === portal.target);
    if (!target) {
      console.warn(`[portals] target scene not found: ${portal.target}`);
      return;
    }
    portalTransitioning = true;
    try {
      const overlay = document.getElementById("transition-overlay");
      await fadeElement(overlay, 0, 1, 250);
      const loadPromise = loadScene(target, { loaderText: portal.loaderText });
      // Fallback so a failed splat load can't leave the screen permanently black.
      await Promise.race([
        loadPromise,
        new Promise((r) => setTimeout(r, 1500)),
      ]);
      await fadeElement(overlay, 1, 0, 350);
    } finally {
      portalTransitioning = false;
    }
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
    } else {
      touchControls.update(dt, camera);
      controls.update(camera);
    }
    if (physics) {
      grab?.update(dt);
      physics.step(dt);
    }
    if (currentPortals.length > 0) {
      portalClock += dt;
      // 0.15 base amplitude with 1.8 rad/s reads as a relaxed AC-style hop
      // (~3.5 s per cycle). Amplitude scales with render scale so larger
      // characters get a proportionally larger bob.
      for (const p of currentPortals) {
        if (p.animation !== "bob") continue;
        p.root.position.y = p.baseY + Math.sin(portalClock * 1.8 + p.phase) * 0.15 * p.scale;
      }
    }
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
    isActive = true;
    const targetScene = payload?.scene;
    if (targetScene) loadScene(targetScene);
    else if (!currentSceneId) loadDefault();
  }

  function deactivate() {
    document.getElementById("world-hud")?.setAttribute("hidden", "");
    document.exitPointerLock?.();
    touchControls.disable();
    isActive = false;
  }

  // Instantiated after enterPortal is defined so the closure resolves cleanly.
  // getPortals returns the live array (not a snapshot) so swaps are seen.
  const portalInteraction = createPortalInteraction({
    renderer,
    camera,
    dolly,
    getPortals: () => currentPortals,
    onEnter: (portal) => { enterPortal(portal); },
  });

  function tryPortal(hand) {
    return portalInteraction.tryPortal(hand);
  }

  window.camera = camera;
  // Fire enterPortal(currentPortals[idx]) directly — no raycast needed. Use
  // this to smoke-test the load+fade+spawn flow when the WebXR Emulator makes
  // controller aiming awkward. Defaults to the first portal.
  window.testPortal = (idx = 0) => {
    const portal = currentPortals[idx];
    if (!portal) {
      console.warn(`[portals] no portal at index ${idx} (currentPortals.length=${currentPortals.length})`);
      return;
    }
    enterPortal(portal);
  };
  // Prints a portal stub from the CURRENT camera/head pose: feet-on-ground
  // position (y - eyeToFoot) plus a rotationY that makes the portal face you.
  // For Animal Crossing's larger scale, pass eyeToFoot ≈ 3.6 (eyeball-tuned;
  // bake the empirical value here once the first portal is placed).
  window.logPortalSpot = (eyeToFoot = 1.6) => {
    let p, q;
    if (renderer.xr?.isPresenting) {
      const xrCam = renderer.xr.getCamera();
      xrCam.updateMatrixWorld(true);
      p = new THREE.Vector3();
      q = new THREE.Quaternion();
      xrCam.getWorldPosition(p);
      xrCam.getWorldQuaternion(q);
    } else {
      p = camera.position;
      q = camera.quaternion;
    }
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(q);
    // yaw = camera heading angle θ such that fwd = (-sin θ, 0, -cos θ).
    // Matches extractYaw above.
    const yaw = Math.atan2(-fwd.x, -fwd.z);
    // Setting outer.rotation.y = θ + π makes the portal's local -Z (its
    // "forward") point back toward the camera, so the portal faces you.
    const facing = yaw + Math.PI;
    console.log(
      `position: [${p.x.toFixed(2)}, ${(p.y - eyeToFoot).toFixed(2)}, ${p.z.toFixed(2)}],\n` +
        `rotationY: ${facing.toFixed(3)},`,
    );
  };
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
    spawnBox,
    tryGrab,
    releaseGrab,
    tryPortal,
    enterPortal,
  };
}
