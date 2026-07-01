import * as THREE from "three";
import { SparkRenderer, SplatMesh, SparkControls } from "@sparkjsdev/spark";
import { SCENES } from "../data/scenes.js";
import { getColliderForScene, getObjectsForScene } from "../data/sceneAssets.js";
import { showLoader, updateLoader, hideLoader } from "../ui/loader.js";
import { createVRLocomotion } from "../three/vrLocomotion.js";
import { createTouchControls } from "../three/touchControls.js";
import { ensureReady as ensureRapierReady, createPhysics } from "../three/physics.js";
import { createGrab } from "../three/grab.js";
import { addPastelLighting } from "../three/lighting.js";
import { loadCharacter } from "../three/loadCharacter.js";
import { createDecoEditor } from "../three/decoEditor.js";
import { fadeElement } from "../three/transition.js";
import { createPortalInteraction } from "../three/portals.js";

const OBJECT_MODE_KEY = "fairy-worlds-object-mode";
function isObjectMode() {
  // Default ON when unset; only an explicit "0" disables it.
  return localStorage.getItem(OBJECT_MODE_KEY) !== "0";
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

export function createWorldMode({ renderer, onSceneLoaded, onPortalEnter, onReturnToHub }) {
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

  // Make the splats write depth so meshes (portals, GLB houses, props) occlude
  // against them instead of always drawing on top. This build uses Spark's new
  // SparkRenderer, which has no smooth "stochastic" depth mode — the only lever
  // is the splat material itself: to write depth a fragment must be in the
  // OPAQUE pass (transparent:false), since transparent splats draw AFTER opaque
  // meshes and their depth lands too late to occlude. The cost is that opaque
  // splats lose alpha blending → harder, darker-fringed edges (no soft dither).
  // Off = the default smooth transparent overlay. Guarded against a Spark rename.
  function setSceneStochastic(on) {
    try {
      const mat = spark.material;
      if (!mat) return;
      mat.transparent = !on;
      mat.depthWrite = on;
      mat.needsUpdate = true;
    } catch (err) {
      console.warn("[world] could not set splat depth mode:", err);
    }
  }

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
  // While the prop editor drags a gizmo handle, freeze SparkControls so the
  // same pointer drag doesn't also spin the camera (see update()).
  let editorFreeze = false;
  const isCoarsePointer = window.matchMedia?.("(pointer: coarse)").matches ?? false;

  let currentSplat = null;
  let currentSceneId = null;
  let currentWorld = null;
  // Pose to restore when returning to Animal Crossing through a portal. Captured
  // on AC exit (recording where/how the user left), consumed on AC re-entry —
  // see enterPortal + computeReturnPose. Picker/home loads of AC don't go
  // through enterPortal, so they keep the default spawn.
  let acReturnPose = null;
  // How far (AC's scaled units) in front of a house to drop the player when they
  // RETURN after WALKING into it. Click-entry restores the exact click pose, so
  // this only affects the walk-in case.
  const AC_WALK_RETURN_DIST = 4.0;
  let loadToken = 0;
  let physics = null;
  let grab = null;
  let physicsPromise = null;
  // Round-robin index into the current world's mapped object GLBs. Resets on
  // world change so each new world starts at object 0.
  let objectCycleIdx = 0;
  const currentPortals = []; // { root, target, baseY, animation, scale, loaderText, phase }
  const currentDecorations = []; // { id, root, def } — static, non-interactive props
  // --- prop editor adapters ---------------------------------------------
  // The editor is generic over "editables": decorations and portals alike. Each
  // adapter exposes a uniform interface (root to attach the gizmo, how scale
  // maps, how to format an export line, what to do after a move) so the editor
  // needs no portal-vs-prop special cases.
  const _ef = (n, d) => Number(n.toFixed(d));
  function decoExportLine(id, r) {
    let s = `  { id: ${JSON.stringify(id)}, position: [${_ef(r.position.x, 2)}, ${_ef(r.position.y, 2)}, ${_ef(r.position.z, 2)}]`;
    if (r.rotation.x) s += `, rotationX: ${_ef(r.rotation.x, 3)}`;
    if (r.rotation.y) s += `, rotationY: ${_ef(r.rotation.y, 3)}`;
    if (r.rotation.z) s += `, rotationZ: ${_ef(r.rotation.z, 3)}`;
    return s + `, scale: ${_ef(r.scale.x, 4)} },`;
  }
  function decoEditable(entry) {
    return {
      raw: entry,
      group: "deco",
      id: entry.id,
      root: entry.root,
      kindLabel: "prop",
      uniformScale: true,
      onMoved: () => {},
      exportLine: () => decoExportLine(entry.id, entry.root),
    };
  }
  function portalEditable(p) {
    const isDoorway = p.kind === "doorway" || p.kind === "floorpad";
    const id = p.id ?? p.target;
    return {
      raw: p,
      group: "portal",
      id,
      root: p.root,
      kindLabel: p.kind,
      // Doorways size with width/height, not a uniform scale — leave scale off.
      uniformScale: !isDoorway,
      // Keep baseY in sync so the bob (re)centers on the new spot when editing ends.
      onMoved: () => {
        p.baseY = p.root.position.y;
      },
      exportLine: () => {
        const r = p.root;
        const head = `  portal ${JSON.stringify(id)} → ${p.target} (${p.kind}): position [${_ef(r.position.x, 2)}, ${_ef(r.position.y, 2)}, ${_ef(r.position.z, 2)}], rotationY ${_ef(r.rotation.y, 3)}`;
        if (isDoorway) {
          return head + `, render { width ${_ef(p.width, 2)}, height ${_ef(p.height, 2)}, radius ${_ef(p.radius, 2)} }`;
        }
        const renderScale = (p.scale || 1) * r.scale.x;
        return head + `, render.scale ${_ef(renderScale, 3)}`;
      },
    };
  }
  function getEditables() {
    return [
      ...currentDecorations.map(decoEditable),
      ...currentPortals.map(portalEditable),
    ];
  }

  // A fresh id for a duplicated editable, unique across both lists.
  function uniqueCopyId(base) {
    const taken = new Set(
      [...currentDecorations.map((d) => d.id), ...currentPortals.map((p) => p.id)].filter(Boolean),
    );
    const stem = base || "prop";
    let name = `${stem}-copy`;
    let n = 2;
    while (taken.has(name)) name = `${stem}-copy${n++}`;
    return name;
  }

  // Duplicate the selected editable: clone its def from the CURRENT (possibly
  // edited) transform, nudge it aside so it's visibly separate, and spawn a new
  // live instance. Returns a Promise of the new root for the editor to select.
  function duplicateEditable(editable) {
    const r = editable.root;
    const OFFSET = 1.0; // world units, so the copy isn't hidden behind the original
    if (editable.group === "deco") {
      const def = {
        ...editable.raw.def,
        id: uniqueCopyId(editable.raw.def.id),
        position: [r.position.x + OFFSET, r.position.y, r.position.z],
        rotationX: r.rotation.x || undefined,
        rotationY: r.rotation.y || undefined,
        rotationZ: r.rotation.z || undefined,
        scale: r.scale.x,
      };
      return buildDecoration(def, loadToken).then((e) => e?.root ?? null);
    }
    // portal
    const p = editable.raw;
    const def = {
      ...p.def,
      id: uniqueCopyId(p.id ?? p.target),
      position: [r.position.x + OFFSET, p.baseY ?? r.position.y, r.position.z],
      rotationY: r.rotation.y || 0,
    };
    if (editable.uniformScale) {
      def.render = { ...p.def.render, scale: (p.scale || 1) * r.scale.x };
    }
    return Promise.resolve(buildPortal(def, loadToken)).then((e) => e?.root ?? null);
  }

  const decoEditor = createDecoEditor({
    renderer,
    camera,
    scene,
    getEditables,
    duplicate: duplicateEditable,
    freezeControls: (on) => {
      editorFreeze = on;
      if (on) {
        controls.pointerControls?.rotateVelocity?.set(0, 0, 0);
        controls.pointerControls?.moveVelocity?.set(0, 0, 0);
      }
    },
  });
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
  // Edge-detects entering VR (see update()) so we can disarm walk-in portals on
  // the VR-entry frame — a portal armed during desktop viewing must not fire
  // while the head is still at its transient pre-spawn pose.
  let _wasPresenting = false;
  const dollySpawnPos = new THREE.Vector3();
  const _spawnVec = new THREE.Vector3();
  const _headPos = new THREE.Vector3();
  const _headQuat = new THREE.Quaternion();
  const _spawnQuat = new THREE.Quaternion();
  const _yawQuat = new THREE.Quaternion();
  const _forward = new THREE.Vector3();
  const _portalHeadPos = new THREE.Vector3();
  const _headMat = new THREE.Matrix4();
  const Y_AXIS = new THREE.Vector3(0, 1, 0);

  // Head world matrix, correct in BOTH modes. In VR, renderer.xr.getCamera() is
  // NOT a scene-graph child of the dolly — three.js only sets its world matrix
  // transiently inside render() as `dolly.matrixWorld * getCamera().matrix`, so
  // getWorldPosition()/getWorldDirection()/getWorldQuaternion() read reference
  // space (missing the dolly + spawn-yaw recenter) anywhere outside render. We
  // compose it explicitly. On desktop the camera is a real dolly child, so its
  // matrixWorld is already correct. Writes into `target` (defaults to the shared
  // _headMat scratch — pass your own if you need the result to persist).
  function getHeadWorldMatrix(target = _headMat) {
    if (renderer.xr?.isPresenting) {
      dolly.updateMatrixWorld(true);
      return target.multiplyMatrices(dolly.matrixWorld, renderer.xr.getCamera().matrix);
    }
    camera.updateMatrixWorld(true);
    return target.copy(camera.matrixWorld);
  }

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
  function applySpawn(sceneDef, override = null) {
    const spawn = override ?? sceneDef.spawn;
    const [px, py, pz] = spawn.position;
    const [qx, qy, qz, qw] = spawn.quaternion;
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
    // Any spawn jump (scene load, recenter, VR entry) teleports the head to a
    // known-safe pose. Reset walk-in arm state so portals re-arm from here
    // (arm-on-exit) rather than firing the instant the head lands near one.
    for (const p of currentPortals) p.armed = false;
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
    const p = new THREE.Vector3();
    const fwd = new THREE.Vector3();
    const head = getHeadWorldMatrix();
    p.setFromMatrixPosition(head);
    // Camera looks down -Z; the matrix's third column is +Z. (Unit scale on
    // dolly/camera, and fwd is normalized below, so reading the column is safe.)
    fwd.set(-head.elements[8], -head.elements[9], -head.elements[10]);
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

    const sceneDef = currentSceneId ? SCENES.find((s) => s.id === currentSceneId) : null;
    const mapped = sceneDef ? getObjectsForScene(sceneDef) : [];
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

  // VR session-start hook (main.js → vrButton.js onSessionStart). Recenters to
  // the current scene's spawn, but only while presenting — desktop reset is the
  // ⊙ button (returnToOrigin) instead. applySpawn also disarms walk-in portals,
  // so they re-arm from the spawn pose after every entry.
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
    disposeDecorations();

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

    // Per-scene splat depth. Spark only writes a depth buffer in "stochastic"
    // mode; without it, splats are pure alpha-blended overlays and any mesh
    // (portals, GLB houses, props) draws on top regardless of where it sits in
    // 3D. Opting a scene in (stochastic: true) makes splats write depth so
    // meshes occlude correctly — at the cost of per-pixel dither/shimmer on the
    // soft splat edges. Set every load (not just when true) so the flag doesn't
    // leak from a stochastic scene into the next one.
    setSceneStochastic(!!sceneDef.stochastic);

    spawnPortals(sceneDef, myToken);
    spawnDecorations(sceneDef, myToken);

    // "Random" and "Animal Crossing" are catchall/portal-hub groups, not real
    // worlds — each scene there has its own unrelated spawn (or an AC return
    // pose), so always recenter when moving within them.
    const isNewWorld =
      sceneDef.world !== currentWorld ||
      sceneDef.world === "Random" ||
      sceneDef.world === "Animal Crossing";
    currentWorld = sceneDef.world;

    if (!isNewWorld) {
      onSceneLoaded?.(sceneDef);
      return loadPromise;
    }
    applySpawn(sceneDef, opts.spawnOverride);

    onSceneLoaded?.(sceneDef);
    return loadPromise;
  }

  function disposePortals() {
    // Drop any gizmo selection before the roots are removed/disposed.
    decoEditor.deselect();
    if (currentPortals.length === 0) return;
    // Drop the hovered portal reference in portals.js BEFORE wiping the array
    // — otherwise a subsequent pointermove can fire onHover(false) against a
    // now-orphaned entry. Closure's find() guards against the write, but
    // letting a stale ref linger is fragile.
    portalInteraction?.clearHover();
    for (const p of currentPortals) {
      scene.remove(p.root);
      p.root.traverse((obj) => {
        // Cover Meshes (GLB geometry) and Sprites (♡ bubble) — both have
        // .material that needs disposal, and Mesh has its own geometry.
        // Sprite geometry is shared internally by three.js; don't dispose it.
        // NOTE: only material.map is disposed here. If a future shader adds
        // other texture slots (emissiveMap, alphaMap, custom uniform
        // samplers), add them to this loop or they'll leak GL textures.
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

  // Fire-and-forget per portal. The loadToken gate guarantees a stale asset
  // (user switched scenes mid-fetch) doesn't get added to the wrong scene.
  // Dispatches on render.kind: "glb" (character) or "doorway" (translucent
  // rounded-rect plane with animated swirl + hover sparkle/halo).
  // Build one portal from its def, dispatching on render.kind. Returns the
  // pushed entry (or a Promise of it for the async GLB path), or null if the
  // load was stale. Used by spawnPortals and by the editor's duplicate.
  function buildPortal(portalDef, myToken) {
    const kind = portalDef.render?.kind ?? "glb";
    if (kind === "doorway") return buildDoorwayPortal(portalDef, myToken);
    // Same swirl/sparkle material as a doorway, laid flat on the ground.
    if (kind === "floorpad") return buildDoorwayPortal(portalDef, myToken, { flat: true });
    if (kind === "orb") return buildOrbPortal(portalDef, myToken);
    return buildGLBPortal(portalDef, myToken);
  }

  function spawnPortals(sceneDef, myToken) {
    const defs = sceneDef.portals;
    if (!defs || defs.length === 0) return;
    for (const portalDef of defs) buildPortal(portalDef, myToken);
  }

  // Static decorations: plain GLBs placed in the scene with no portal trigger,
  // bubble, or animation. Unlike portals, the load is raw (scale 1) and ALL
  // transforms live on the outer group, so window.deco() can mutate them live
  // and the logged values paste back 1:1 into the scene's `decorations` array.
  // Build one decoration from its def. Returns a Promise of the pushed entry
  // (or null if the load was stale). Used by spawnDecorations and the editor's
  // duplicate.
  function buildDecoration(def, myToken) {
    return loadCharacter({ kind: "glb", url: def.url })
      .then(({ root: inner }) => {
        if (myToken !== loadToken) return null;
        {
          const root = new THREE.Group();
          root.add(inner);
          // `ground: true` re-centers the GLB on its own XZ footprint and drops
          // its base to the root origin, so def.position is simply where the
          // base sits and def.scale grows it from the floor. Lets trees with
          // off-origin pivots (e.g. the apple tree) place cleanly with just a
          // position + scale. Computed with root still at identity so inner's
          // world box equals its local box.
          if (def.ground) {
            inner.updateMatrixWorld(true);
            const box = new THREE.Box3().setFromObject(inner);
            if (!box.isEmpty()) {
              const c = box.getCenter(new THREE.Vector3());
              inner.position.x -= c.x;
              inner.position.z -= c.z;
              inner.position.y -= box.min.y;
            }
          }
          // `alphaTest: n` converts any alpha-BLEND material (e.g. tree foliage
          // atlases like sakura's M_ATLAS_VEG) to a depth-writing alpha CUTOUT.
          // BLEND foliage skips depthWrite and renders order-dependent, so its
          // leaf cards smear over nearby meshes (the "leaves cast onto the house"
          // bug). Cutout clips per-pixel and writes depth, so it sorts correctly.
          if (typeof def.alphaTest === "number") {
            inner.traverse((obj) => {
              if (!obj.isMesh) return;
              const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
              for (const m of mats) {
                if (!m || !m.transparent) continue;
                m.transparent = false;
                m.alphaTest = def.alphaTest;
                m.depthWrite = true;
                m.needsUpdate = true;
              }
            });
          }
          // `saturate: n` (>1) pushes the lit RGB away from luminance per-pixel,
          // same shader hook the GLB portals use — for trees whose baked foliage
          // atlases read washed-out under the splat lighting.
          if (typeof def.saturate === "number") applySaturation(inner, def.saturate);
          root.position.fromArray(def.position);
          root.rotation.set(def.rotationX ?? 0, def.rotationY ?? 0, def.rotationZ ?? 0);
          root.scale.setScalar(def.scale ?? 1);
          scene.add(root);
          const entry = { id: def.id, root, def };
          currentDecorations.push(entry);
          return entry;
        }
      })
      .catch((err) => {
        console.warn(`[deco] failed to load ${def.id ?? def.url}:`, err);
        return null;
      });
  }

  function spawnDecorations(sceneDef, myToken) {
    const defs = sceneDef.decorations;
    if (!defs || defs.length === 0) return;
    for (const def of defs) buildDecoration(def, myToken);
  }

  function disposeDecorations() {
    // Drop any gizmo selection before the roots are removed/disposed.
    decoEditor.deselect();
    if (currentDecorations.length === 0) return;
    for (const d of currentDecorations) {
      scene.remove(d.root);
      d.root.traverse((obj) => {
        if (obj.isMesh) obj.geometry?.dispose?.();
        if (obj.isMesh) {
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          for (const m of mats) {
            m?.map?.dispose?.();
            m?.dispose?.();
          }
        }
      });
    }
    currentDecorations.length = 0;
  }

  // Boost color saturation on every material under `root` by `factor`
  // (1 = unchanged, >1 = more vivid). Injects a tiny step into each standard
  // material's shader that pushes the lit RGB away from its luminance, so it
  // works on textured PBR materials without re-encoding the texture. Used by
  // GLB portals via render.saturate (e.g. the washed-out mushroom house).
  function applySaturation(root, factor) {
    if (!factor || factor === 1) return;
    root.traverse((obj) => {
      if (!obj.isMesh) return;
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const m of mats) {
        if (!m || m.userData?._saturated) continue;
        m.userData = m.userData || {};
        m.userData._saturated = true;
        m.onBeforeCompile = (shader) => {
          shader.uniforms.uSaturation = { value: factor };
          shader.fragmentShader =
            "uniform float uSaturation;\n" +
            shader.fragmentShader.replace(
              "#include <colorspace_fragment>",
              "vec3 _satLum = vec3(dot(gl_FragColor.rgb, vec3(0.2126, 0.7152, 0.0722)));\n" +
                "gl_FragColor.rgb = mix(_satLum, gl_FragColor.rgb, uSaturation);\n" +
                "#include <colorspace_fragment>",
            );
        };
        m.needsUpdate = true;
      }
    });
  }

  // Existing GLB path (Celeste-style character). Async because loadCharacter
  // fetches a GLB; the loadToken gate is checked once that resolves.
  function buildGLBPortal(portalDef, myToken) {
    return loadCharacter({ kind: "glb", ...portalDef.render })
      .then(({ root: inner }) => {
        if (myToken !== loadToken) return null;
        if (portalDef.render?.saturate) applySaturation(inner, portalDef.render.saturate);
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
        const localBox = computeLocalBindBox(inner, root);
        // Same box, but with far-flung stray geometry rejected — used to size the
        // click proxy so junky exports (leftover fence/terrain meshes scattered
        // units away from the actual building) don't balloon it. See computeProxyBox.
        const proxyBox = computeProxyBox(inner, root);

        // Invisible click proxy. SkinnedMesh raycast pre-culls on the same
        // collapsed skinning bbox, so the ray never reaches per-triangle
        // tests on the actual character. A simple Box mesh raycasts reliably
        // regardless of skinning, and findHitPortal walks the parent chain
        // back to `root`, so a proxy hit registers as a portal hit.
        // DoubleSide so the ray still hits if the camera ends up INSIDE the box
        // (a FrontSide box is invisible to a ray cast from within it).
        let proxy = null;
        if (!proxyBox.isEmpty()) {
          const size = new THREE.Vector3();
          proxyBox.getSize(size);
          const center = new THREE.Vector3();
          proxyBox.getCenter(center);
          const geom = new THREE.BoxGeometry(size.x, size.y, size.z);
          const mat = new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide });
          proxy = new THREE.Mesh(geom, mat);
          proxy.position.copy(center);
          root.add(proxy);
        }

        // Indicator above her head — anchored on the bind-pose top. Default is
        // the pink ♡ bubble; portalDef.bubble can be:
        //   - a string  → that glyph in the pink bubble (e.g. "★")
        //   - false     → none
        //   - an object → a glowing ORB indicator, e.g.
        //       { kind: "orb", glyph: "🌟", colorA: "#ff7ec0", colorB: "#ffd6ee", size }
        // An orb's material is stored on the portal entry so update() animates it.
        let orbBubbleMaterial = null;
        if (portalDef.bubble !== false && !localBox.isEmpty()) {
          const height = localBox.max.y - localBox.min.y;
          const width = Math.max(localBox.max.x - localBox.min.x, localBox.max.z - localBox.min.z);
          if (portalDef.bubble && typeof portalDef.bubble === "object") {
            const cfg = portalDef.bubble;
            const orbSize = cfg.size ?? Math.max(height * 0.07, width * 0.1);
            // Gap between the head top and the orb's CENTER. Default sits it just
            // above her head; cfg.offsetY overrides (world units). Tune per portal.
            const gap = cfg.offsetY ?? orbSize * 1.0;
            const { group, material } = createOrbVisual({
              size: orbSize,
              colorA: new THREE.Color(cfg.colorA ?? "#ff7ec0"),
              colorB: new THREE.Color(cfg.colorB ?? "#ffd6ee"),
              glyph: cfg.glyph ?? null,
            });
            group.position.set(0, localBox.max.y + gap, 0);
            root.add(group);
            orbBubbleMaterial = material;
          } else {
            const bubble = createBubble(typeof portalDef.bubble === "string" ? portalDef.bubble : "♡");
            const bubbleSize = Math.max(height * 0.14, width * 0.2);
            bubble.scale.set(bubbleSize, bubbleSize, 1);
            bubble.position.set(0, localBox.max.y + bubbleSize * 0.65, 0);
            root.add(bubble);
          }
        }

        // Walk-into trigger radius (XZ). GLB portals have no authored width, so
        // derive from the bind-pose box footprint, clamped to a sane range.
        // Per-portalDef `triggerRadius` overrides if set.
        const glbFootprint = localBox.isEmpty()
          ? 0.8
          : Math.max(localBox.max.x - localBox.min.x, localBox.max.z - localBox.min.z);
        scene.add(root);
        const entry = {
          id: portalDef.id,
          kind: "glb",
          def: portalDef, // kept so the prop editor's duplicate can clone it
          root,
          proxy,
          target: portalDef.target,
          baseY: portalDef.position[1],
          animation: portalDef.animation ?? "bob",
          scale: portalDef.render?.scale ?? 1,
          loaderText: portalDef.loaderText,
          // Random phase so multiple portals in one scene don't bob in lockstep.
          phase: Math.random() * Math.PI * 2,
          // Proximity entry: armed only after the head first leaves the radius
          // (arm-on-exit), so spawning beside a portal doesn't auto-trigger.
          armed: false,
          triggerRadius:
            portalDef.triggerRadius ?? Math.min(1.2, Math.max(0.6, glbFootprint / 2 + 0.3)),
          // Set only when the bubble is an orb — gives update() a material whose
          // uTime to advance (sparkle/pulse) and uHover to brighten.
          material: orbBubbleMaterial ?? undefined,
          // Hover wiring so the orb bubble brightens when the cursor/VR ray is
          // over Celeste herself — it's the same portal as clicking her. The
          // raycast hits her click proxy; portalInteraction calls onHover, which
          // nudges hoverTarget, and update() smooths it into the orb's uHover.
          hoverTarget: 0,
          hoverValue: 0,
          onHover: (hover) => {
            const e = currentPortals.find((cp) => cp.root === root);
            if (e) e.hoverTarget = hover ? 1 : 0;
          },
        };
        currentPortals.push(entry);
        return entry;
      })
      .catch((err) => {
        console.warn(`[portals] failed to load ${portalDef.id ?? portalDef.target}:`, err);
        return null;
      });
  }

  // Doorway portal: a flat translucent rounded-rect plane with an animated
  // swirly two-color gradient + in-shader twinkling sparkle stars + outer halo
  // ring that brightens on hover. Synchronous (no asset fetch).
  //
  // Geometry is slightly larger than the rect so the halo has uv space to
  // render in the surrounding ring. Click target is a SEPARATE invisible plane
  // sized exactly to the rect — clicks in the halo ring don't count.
  function buildDoorwayPortal(portalDef, myToken, opts = {}) {
    // Token check is symmetrical with the GLB path even though we're sync —
    // future-proofs against any added await without changing the contract.
    if (myToken !== loadToken) return null;
    // `flat` lays the same plane down on the ground (a glowing floor pad) by
    // tilting it -90° about X. The swirl/sparkle shader works in UV space, so
    // orientation is irrelevant to it; only the mesh transform changes.
    const flat = !!opts.flat;
    const r = portalDef.render;
    const width = r.width ?? 0.9;
    const height = r.height ?? 1.8;
    const radius = r.radius ?? 0.15;
    // Halo extends ~25% beyond rect on each side, capped so very tall doors
    // don't get absurd halos. The shader's SDF still uses the inner rect for
    // its mask; the extra geometry is purely halo space.
    const haloMargin = Math.min(0.3, Math.max(width, height) * 0.25);
    const planeW = width + haloMargin * 2;
    const planeH = height + haloMargin * 2;

    const colorA = new THREE.Color(r.colorA ?? "#ff9bce");
    const colorB = new THREE.Color(r.colorB ?? "#ffd5ec");

    const material = createDoorwayMaterial({
      colorA,
      colorB,
      size: new THREE.Vector2(width, height),
      planeSize: new THREE.Vector2(planeW, planeH),
      radius,
    });

    const root = new THREE.Group();
    root.position.fromArray(portalDef.position);
    root.rotation.y = portalDef.rotationY ?? 0;

    const planeGeom = new THREE.PlaneGeometry(planeW, planeH);
    const planeMesh = new THREE.Mesh(planeGeom, material);
    planeMesh.renderOrder = 20; // draw over splats
    if (flat) planeMesh.rotation.x = -Math.PI / 2; // lay flat on the floor
    root.add(planeMesh);

    // Invisible click proxy sized to the inner rect — the halo ring isn't
    // clickable. Only the proxy is in portalTargets(), so the decorative
    // plane never raycasts and z-ordering between the two is irrelevant.
    // DoubleSide so back-face clicks work for portals you walk past.
    const proxyGeom = new THREE.PlaneGeometry(width, height);
    const proxyMat = new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide });
    const proxy = new THREE.Mesh(proxyGeom, proxyMat);
    if (flat) proxy.rotation.x = -Math.PI / 2;
    root.add(proxy);

    // Optional emoji label above the portal, faded by hoverValue. Sprite
    // auto-billboards toward camera (works in VR too once VR hover lands).
    // Disposed via the standard disposePortals traverse (covers Sprite +
    // material.map).
    let emojiSprite = null;
    if (portalDef.emoji) {
      emojiSprite = createEmojiLabel(portalDef.emoji);
      const spriteScale = Math.max(width, height) * 0.28;
      emojiSprite.scale.set(spriteScale, spriteScale, 1);
      emojiSprite.position.set(0, height / 2 + spriteScale * 0.7, 0);
      root.add(emojiSprite);
    }

    scene.add(root);
    const entry = {
      id: portalDef.id,
      kind: flat ? "floorpad" : "doorway",
      def: portalDef, // kept so the prop editor's duplicate can clone it
      root,
      proxy,
      planeMesh,
      // Live size, kept in sync by resizeDoorway so window.portal() can rebuild
      // the geometry + shader uniforms when width/height/radius are tuned.
      width,
      height,
      radius,
      target: portalDef.target,
      baseY: portalDef.position[1],
      animation: portalDef.animation ?? "none", // doorways don't bob
      scale: 1,
      loaderText: portalDef.loaderText,
      phase: 0,
      // Walk-into trigger radius (XZ) ≈ half the door width plus a margin, so
      // stepping through the opening enters it. Armed on first exit (below).
      armed: false,
      triggerRadius: portalDef.triggerRadius ?? width / 2 + 0.3,
      // Doorway-specific: hover state + smoothed uniform updater. uHover is
      // smoothed in update(dt); setHover just nudges the target.
      material,
      emojiSprite,
      hoverTarget: 0,
      hoverValue: 0,
      onHover: (hover) => {
        const e = currentPortals.find((cp) => cp.root === root);
        if (e) e.hoverTarget = hover ? 1 : 0;
      },
    };
    currentPortals.push(entry);
    return entry;
  }

  // Rebuild a doorway portal's geometry + shader uniforms for new width/height/
  // radius. PlaneGeometry can't resize in place, so we swap geometries (disposing
  // the old ones) and re-point the size-dependent uniforms. Mirrors the sizing
  // math in buildDoorwayPortal — keep the two in sync. Used by window.portal().
  function resizeDoorway(p, { width, height, radius } = {}) {
    const w = width ?? p.width;
    const h = height ?? p.height;
    const rad = radius ?? p.radius;
    const haloMargin = Math.min(0.3, Math.max(w, h) * 0.25);
    const planeW = w + haloMargin * 2;
    const planeH = h + haloMargin * 2;

    p.planeMesh.geometry.dispose();
    p.planeMesh.geometry = new THREE.PlaneGeometry(planeW, planeH);
    p.proxy.geometry.dispose();
    p.proxy.geometry = new THREE.PlaneGeometry(w, h);

    p.material.uniforms.uRectSize.value.set(w, h);
    p.material.uniforms.uPlaneSize.value.set(planeW, planeH);
    p.material.uniforms.uRadius.value = rad;

    if (p.emojiSprite) {
      const spriteScale = Math.max(w, h) * 0.28;
      p.emojiSprite.scale.set(spriteScale, spriteScale, 1);
      p.emojiSprite.position.set(0, h / 2 + spriteScale * 0.7, 0);
    }

    // Keep the walk-into radius proportional to the new opening.
    p.triggerRadius = w / 2 + 0.3;
    p.width = w;
    p.height = h;
    p.radius = rad;
  }

  // Glowing orb / wisp portal: a small additive-blended sphere with a fresnel
  // rim glow + gentle pulse. Reads as an intentional magical light, so always
  // drawing over splats looks deliberate rather than broken. Bobs like the GLB
  // portals. render: { kind:"orb", size, colorA, colorB }.
  function buildOrbPortal(portalDef, myToken) {
    if (myToken !== loadToken) return null;
    const r = portalDef.render;
    const size = r.size ?? 0.25; // sphere radius (meters)
    const glyph = portalDef.bubble === false
      ? null
      : (portalDef.glyph ?? (typeof portalDef.bubble === "string" ? portalDef.bubble : null));

    const { group, material } = createOrbVisual({
      size,
      colorA: new THREE.Color(r.colorA ?? "#bfe9ff"),
      colorB: new THREE.Color(r.colorB ?? "#ffffff"),
      glyph,
    });
    const root = new THREE.Group();
    root.position.fromArray(portalDef.position);
    root.rotation.y = portalDef.rotationY ?? 0;
    root.add(group);

    // Invisible click proxy — a touch larger than the orb so it's easy to hit.
    const proxy = new THREE.Mesh(
      new THREE.SphereGeometry(size * 1.6, 12, 8),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    root.add(proxy);

    scene.add(root);
    const entry = {
      id: portalDef.id,
      kind: "orb",
      def: portalDef, // kept so the prop editor's duplicate can clone it
      root,
      proxy,
      target: portalDef.target,
      baseY: portalDef.position[1],
      animation: portalDef.animation ?? "bob",
      scale: 1,
      loaderText: portalDef.loaderText,
      phase: Math.random() * Math.PI * 2,
      armed: false,
      triggerRadius: portalDef.triggerRadius ?? Math.max(0.6, size * 2.5),
      material,
      hoverTarget: 0,
      hoverValue: 0,
      onHover: (hover) => {
        const e = currentPortals.find((cp) => cp.root === root);
        if (e) e.hoverTarget = hover ? 1 : 0;
      },
    };
    currentPortals.push(entry);
    return entry;
  }

  // Builds the orb VISUAL (glowing sphere + optional centered glyph) as a group,
  // independent of portal wiring — so it's reused both as a standalone orb portal
  // and as the floating indicator above a GLB character portal (Celeste). Returns
  // the group plus its material so the caller can register it for uTime animation.
  function createOrbVisual({ size, colorA, colorB, glyph }) {
    const group = new THREE.Group();
    const material = createOrbMaterial(colorA, colorB);
    const orb = new THREE.Mesh(new THREE.SphereGeometry(size, 24, 16), material);
    orb.renderOrder = 20; // draw over splats
    group.add(orb);
    // Glyph sits INSIDE the orb (centered, billboarded) with no background/outline.
    if (glyph) {
      const sprite = createGlyphSprite(glyph);
      const glyphSize = size * 1.3; // a touch smaller than the orb so it reads as "within"
      sprite.scale.set(glyphSize, glyphSize, 1);
      sprite.position.set(0, 0, 0);
      group.add(sprite);
    }
    return { group, material };
  }

  // Additive fresnel-glow sphere material for orb portals. uTime pulses it,
  // uHover brightens on cursor/ray hover (smoothed in update()).
  function createOrbMaterial(colorA, colorB) {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.FrontSide,
      uniforms: {
        uTime: { value: 0 },
        uHover: { value: 0 },
        uColorA: { value: colorA },
        uColorB: { value: colorB },
      },
      vertexShader: /* glsl */ `
        varying vec3 vN;
        varying vec3 vView;
        varying vec2 vUv;
        void main() {
          vN = normalize(normalMatrix * normal);
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vView = normalize(-mv.xyz);
          vUv = uv;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform float uHover;
        uniform vec3 uColorA;
        uniform vec3 uColorB;
        varying vec3 vN;
        varying vec3 vView;
        varying vec2 vUv;

        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }

        void main() {
          float rim = pow(1.0 - max(dot(vN, vView), 0.0), 1.6);
          float pulse = 0.85 + 0.15 * sin(uTime * 2.0);
          vec3 col = mix(uColorA, uColorB, rim);
          float a = (0.30 + 0.70 * rim) * pulse * (0.85 + 0.5 * uHover);

          // Twinkling sparkle field across the orb surface — same cross-star
          // technique as the doorway shader, sampled on the sphere's UVs. Each
          // grid cell holds one star with a random sub-position + twinkle phase.
          vec2 grid = vUv * vec2(10.0, 6.0);
          vec2 cell = floor(grid);
          vec2 cellUv = fract(grid) - 0.5;
          float rnd = hash(cell);
          vec2 starPos = (vec2(hash(cell + 1.7), hash(cell + 5.3)) - 0.5) * 0.6;
          float twinkle = 0.5 + 0.5 * sin(uTime * (2.0 + 4.0 * rnd) + rnd * 6.28);
          vec2 sp = cellUv - starPos;
          float cross = exp(-90.0 * sp.x * sp.x) + exp(-90.0 * sp.y * sp.y);
          float radial = exp(-12.0 * dot(sp, sp));
          float star = (cross * 0.5 + radial) * twinkle;
          float starGain = mix(0.25, 0.9, uHover);
          // Additive material: add sparkle straight into the color/alpha.
          col += vec3(1.0, 0.98, 1.0) * star * starGain;
          a = clamp(a + star * starGain * 0.6, 0.0, 1.0);

          gl_FragColor = vec4(col, a);
        }
      `,
    });
  }

  // A single glyph (e.g. a 🐚 seashell) drawn onto a transparent canvas — no
  // background circle, no outline. Used inside orb portals. depthTest:false +
  // renderOrder 22 so it shows over the orb's additive glow; billboards toward
  // the camera so the symbol always faces the player. Disposed by the standard
  // disposePortals traverse (covers Sprite + material.map).
  function createGlyphSprite(glyph) {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    ctx.font =
      '96px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", "Twemoji", serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(glyph, 64, 70);

    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.renderOrder = 22;
    return sprite;
  }

  // Standalone material factory so the shader is one self-contained block.
  // Uniforms drive every visual aspect — geometry only carries plane size.
  function createDoorwayMaterial({ colorA, colorB, size, planeSize, radius }) {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      // NormalBlending is the ShaderMaterial default, but Spark's renderer
      // touches global GL state — set explicitly so a future stomp doesn't
      // silently break the swirl gradient.
      blending: THREE.NormalBlending,
      uniforms: {
        uTime: { value: 0 },
        uHover: { value: 0 },
        uColorA: { value: colorA },
        uColorB: { value: colorB },
        // Inner rect size + corner radius in WORLD units (not normalized) —
        // the shader reconstructs world-space p from vUv using uPlaneSize.
        uRectSize: { value: size },
        uRadius: { value: radius },
        uPlaneSize: { value: planeSize },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform float uHover;
        uniform vec3 uColorA;
        uniform vec3 uColorB;
        uniform vec2 uRectSize;
        uniform vec2 uPlaneSize;
        uniform float uRadius;
        varying vec2 vUv;

        // SDF of axis-aligned rounded rect, centered at origin, half-extents b,
        // corner radius r. Negative inside, positive outside.
        float sdRoundRect(vec2 p, vec2 b, float r) {
          vec2 d = abs(p) - b + vec2(r);
          return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - r;
        }

        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }

        void main() {
          // Reconstruct local position on the plane from vUv (vUv ∈ [0,1]).
          vec2 p = (vUv - 0.5) * uPlaneSize;
          float d = sdRoundRect(p, uRectSize * 0.5, uRadius);

          // Inner rect alpha — soft edge in world units (~5mm).
          float edge = 0.005;
          float mask = 1.0 - smoothstep(-edge, edge, d);

          // Swirly two-color gradient. Polar coords on rect-normalized uv so
          // the swirl looks consistent across portal sizes.
          vec2 rn = p / max(uRectSize.x, uRectSize.y);
          float ang = atan(rn.y, rn.x);
          float rad = length(rn);
          float swirl = sin(ang * 3.0 + uTime * 0.6 + rad * 9.0);
          float t = 0.5 + 0.5 * swirl;
          vec3 base = mix(uColorA, uColorB, t);
          // Soft inner pulse — center is a touch brighter.
          float pulse = 0.9 + 0.1 * sin(uTime * 1.4);
          base *= 0.85 + 0.45 * pulse * (1.0 - clamp(rad * 1.4, 0.0, 1.0));

          // Sparkle field — grid cells, each cell holds one star with random
          // sub-position + twinkle phase. Cross shape (✦-ish) instead of a
          // round dot for visual continuity with the DOM glyph sparkles. Always
          // present at low intensity; hover scales them up.
          vec2 grid = vUv * vec2(8.0 * uPlaneSize.x / uPlaneSize.y, 8.0);
          vec2 cell = floor(grid);
          vec2 cellUv = fract(grid) - 0.5;
          float rnd = hash(cell);
          vec2 starPos = (vec2(hash(cell + 1.7), hash(cell + 5.3)) - 0.5) * 0.6;
          float twinkle = 0.5 + 0.5 * sin(uTime * (2.0 + 4.0 * rnd) + rnd * 6.28);
          // Cross = bright horizontal + vertical streaks centered on starPos.
          vec2 sp = cellUv - starPos;
          float cross = exp(-90.0 * sp.x * sp.x) + exp(-90.0 * sp.y * sp.y);
          float radial = exp(-12.0 * dot(sp, sp));
          float star = (cross * 0.5 + radial) * twinkle;
          float starGain = mix(0.18, 0.85, uHover);
          base += vec3(1.0, 0.96, 0.99) * star * starGain;

          // Outer halo: ring in the ~haloMargin region where d > 0. The ring
          // fades out within ~radius world units past the rect edge.
          float haloWidth = 0.2;
          float halo = (1.0 - smoothstep(0.0, haloWidth, d)) * (1.0 - mask);
          float haloIntensity = mix(0.25, 1.0, uHover);
          vec3 haloColor = mix(uColorA, uColorB, 0.5);
          base += haloColor * halo * haloIntensity;

          float alpha = mask * 0.72 + halo * (0.35 + 0.4 * uHover);
          alpha = clamp(alpha, 0.0, 1.0);
          // Clamp color — additive sparkles + halo can spike well above 1.0
          // (8-bit framebuffer clips to white), making bright sparkles look
          // like flat white holes rather than highlights.
          base = clamp(base, 0.0, 1.0);
          gl_FragColor = vec4(base, alpha);
        }
      `,
    });
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

  // Like computeLocalBindBox, but drops far-flung stray geometry before
  // unioning — used to size the invisible click proxy. Some GLB exports (e.g. an
  // FBX "house" that still carries leftover fence/terrain meshes 5-7 units from
  // the building in an otherwise ~0.1-unit model) leave junk meshes scattered
  // far from the bulk. Unioning everything balloons the proxy to hundreds of
  // units, so the camera stands INSIDE it and the box never registers a hit.
  // We collect per-mesh boxes, sort by distance from the median center, and cut
  // at the first >5x jump in that distance. Clean models (a smooth distance ramp,
  // or few meshes) pass through unfiltered.
  function computeProxyBox(inner, stopAt) {
    const tmpMat = new THREE.Matrix4();
    const items = [];
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
      for (let i = chain.length - 1; i >= 0; i--) tmpMat.multiply(chain[i]);
      const b = geo.boundingBox.clone().applyMatrix4(tmpMat);
      items.push({ box: b, center: b.getCenter(new THREE.Vector3()) });
    });
    if (items.length === 0) return new THREE.Box3();
    const box = new THREE.Box3();
    // Too few meshes to have meaningful outliers — union them all (clean houses
    // and characters land here).
    if (items.length <= 8) {
      for (const it of items) box.union(it.box);
      return box;
    }
    // Median center per-axis (robust to the outliers we're trying to drop).
    const med = new THREE.Vector3(
      ...["x", "y", "z"].map((ax) => {
        const s = items.map((it) => it.center[ax]).sort((a, b) => a - b);
        return s[Math.floor(s.length / 2)];
      }),
    );
    for (const it of items) it.d = it.center.distanceTo(med);
    items.sort((a, b) => a.d - b.d);
    let cut = items.length;
    for (let i = 0; i < items.length - 1; i++) {
      if (items[i].d > 1e-4 && items[i + 1].d / items[i].d > 5) {
        cut = i + 1;
        break;
      }
    }
    for (let i = 0; i < cut; i++) box.union(items[i].box);
    return box;
  }

  // Single emoji glyph drawn into a CanvasTexture, no background. opacity:0
  // by default — driven from portal.hoverValue in update(dt) for a fade-in
  // on hover. System emoji font stack handles cross-platform rendering.
  function createEmojiLabel(emoji) {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    ctx.font =
      '96px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", "Twemoji", serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(emoji, 64, 70);

    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
      opacity: 0,
    });
    const sprite = new THREE.Sprite(mat);
    // 21 = above the doorway plane (renderOrder 20). Both are transparent +
    // depthWrite:false, so three.js draws strictly by renderOrder; without
    // this, the doorway halo would overdraw the emoji at high uHover values.
    sprite.renderOrder = 21;
    return sprite;
  }

  // Pink circular speech bubble drawn into a CanvasTexture, with a single glyph
  // (♡ by default, or e.g. ★). Sprite auto-billboards toward the camera (works
  // in VR too). Texture + material are disposed when the portal is torn down via
  // the standard traverse in disposePortals.
  function createBubble(glyph = "♡") {
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
    // Glyph visual weight tends to sit high; nudge down a hair to look centered.
    ctx.fillText(glyph, 64, 70);

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
  // Build the pose to restore when the user returns to Animal Crossing from a
  // house/building. Click entry → the exact head pose they clicked from ("same
  // as when the user clicked the house"). Walk-in entry → just in front of the
  // house, facing it (the walk-in pose is basically inside the building, a bad
  // landing spot), keeping the eye height they had.
  function computeReturnPose(portal, entryMode) {
    const p = new THREE.Vector3();
    const q = new THREE.Quaternion();
    getHeadWorldMatrix(new THREE.Matrix4()).decompose(p, q, new THREE.Vector3());
    if (entryMode !== "walk") {
      return { position: [p.x, p.y, p.z], quaternion: [q.x, q.y, q.z, q.w] };
    }
    // Walk-in: the player is already facing the house (they walked into it), so
    // step straight BACK along their own view direction and keep that heading.
    // This lands them just outside, still looking at the house, regardless of
    // which way the house model happens to face (the GLBs vary: doorways/Celeste
    // face -Z, the AC house props face +Z — so we can't derive it from the
    // portal's rotationY without getting it backwards).
    _forward.set(0, 0, -1).applyQuaternion(q);
    _forward.y = 0;
    if (_forward.lengthSq() < 1e-6) _forward.set(0, 0, -1);
    else _forward.normalize();
    const x = p.x - _forward.x * AC_WALK_RETURN_DIST;
    const z = p.z - _forward.z * AC_WALK_RETURN_DIST;
    return { position: [x, p.y, z], quaternion: [q.x, q.y, q.z, q.w] };
  }

  async function enterPortal(portal, entryMode = "click") {
    if (!isActive || portalTransitioning) return;
    const target = SCENES.find((s) => s.id === portal.target);
    if (!target) {
      console.warn(`[portals] target scene not found: ${portal.target}`);
      return;
    }
    // Leaving Animal Crossing: remember where/how we left so a later return
    // portal can land us back at the house instead of AC's default spawn.
    if (currentSceneId === "animal-crossing") {
      acReturnPose = computeReturnPose(portal, entryMode);
    }
    // Returning to AC and we have a stored pose → override the default spawn.
    let spawnOverride = null;
    if (target.id === "animal-crossing" && acReturnPose) {
      spawnOverride = acReturnPose;
      acReturnPose = null;
    }
    portalTransitioning = true;
    // Fire BEFORE the fade so the HUD can flip to portal-nav while the overlay
    // is already animating up. main.js uses this to set navMode = "portal".
    onPortalEnter?.({ targetId: target.id });
    try {
      const overlay = document.getElementById("transition-overlay");
      await fadeElement(overlay, 0, 1, 250);
      const loadPromise = loadScene(target, { loaderText: portal.loaderText, spawnOverride });
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
  //
  // Single tap = recenter to spawn. Double tap (within MENU_DOUBLE_MS) = return
  // to the Portals Hub. We fire recenter immediately on the first tap (no
  // latency on the common action) and the hub jump on the second; the wasted
  // recenter is invisible since the hub transition overrides position anyway.
  const MENU_DOUBLE_MS = 250;
  let _recenterButtonPrev = false;
  let _menuTapTime = 0;
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
    if (pressed && !_recenterButtonPrev) {
      const now = performance.now();
      if (now - _menuTapTime < MENU_DOUBLE_MS) {
        _menuTapTime = 0; // consume so a third quick tap doesn't re-fire
        onReturnToHub?.();
      } else {
        _menuTapTime = now;
        returnToOrigin();
      }
    }
    _recenterButtonPrev = pressed;
  }

  // Edge-detect the RIGHT controller's trackpad/thumbstick PRESS (button[2] —
  // touchpad-press in the xr-standard mapping; the trackpad's *axes* drive
  // snap-turn, the click is separate). Drops a new object, but only while object
  // mode is on so it can't fire by accident in normal browsing. Like the menu
  // button, this isn't exposed by the WebXR Emulator's Vive profile, so it's
  // real-hardware only. Mirrors the desktop #btn-spawn-box HUD button.
  let _spawnButtonPrev = false;
  function pollSpawnButton() {
    if (!isObjectMode()) {
      _spawnButtonPrev = false;
      return;
    }
    const session = renderer.xr.getSession();
    if (!session) return;
    let pressed = false;
    for (const src of session.inputSources) {
      if (src.handedness === "right" && src.gamepad?.buttons?.[2]?.pressed) {
        pressed = true;
        break;
      }
    }
    if (pressed && !_spawnButtonPrev) spawnBox();
    _spawnButtonPrev = pressed;
  }

  function update(dt) {
    const presenting = !!renderer.xr?.isPresenting;
    // Entering VR: disarm all walk-in portals so one armed during desktop
    // viewing can't fire while the head is still at its transient pre-spawn pose
    // (≈world origin in the emulator, which can sit inside a ring portal's
    // radius). They re-arm via arm-on-exit once the spawn recenter lands. The
    // actual recenter is driven by onSessionStart (see main.js / vrButton.js);
    // we only need to clear stale arm-state here so nothing fires in between.
    if (presenting && !_wasPresenting) {
      for (const p of currentPortals) p.armed = false;
      // Fresh session: clear button edge-state so a button still held as the
      // previous session tore down can't swallow its first press now. (The poll
      // functions early-return on a null session without resetting these.)
      _recenterButtonPrev = false;
      _spawnButtonPrev = false;
      _menuTapTime = 0;
    }
    _wasPresenting = presenting;
    if (presenting) {
      vrLocomotion.update(dt, dolly);
      pollRecenterButton();
      pollSpawnButton();
      noteVRDistance(dolly.position.distanceTo(dollySpawnPos));
    } else {
      touchControls.update(dt, camera);
      if (!editorFreeze) controls.update(camera);
    }
    // Unconditional: when presenting it stretches the wand rays + drives portal
    // hover; when not, it hides the rays (so they don't linger on the desktop
    // mirror after a session ends) and clears any VR hover state.
    portalInteraction.updateVRHover();
    if (physics) {
      grab?.update(dt);
      physics.step(dt);
    }
    if (currentPortals.length > 0) {
      portalClock += dt;
      // 0.15 base amplitude with 1.8 rad/s reads as a relaxed AC-style hop
      // (~3.5 s per cycle). Amplitude scales with render scale so larger
      // characters get a proportionally larger bob.
      // Hover-smooth coefficient: ~6/sec → reaches ~95% of target in ~0.5s.
      // Feels responsive without snapping (snap looks twitchy on cursor pass).
      const hoverK = Math.min(1, dt * 6);
      for (const p of currentPortals) {
        // While the prop editor is open, portals hold still at baseY so a
        // selected house doesn't bob out from under the gizmo (the editor keeps
        // baseY in sync as you drag it). Bob resumes when the editor closes.
        if (p.animation === "bob" && !window.__decoEditActive) {
          p.root.position.y = p.baseY + Math.sin(portalClock * 1.8 + p.phase) * 0.15 * p.scale;
        }
        if (p.material?.uniforms) {
          p.material.uniforms.uTime.value = portalClock;
          if (typeof p.hoverTarget === "number") {
            p.hoverValue += (p.hoverTarget - p.hoverValue) * hoverK;
            p.material.uniforms.uHover.value = p.hoverValue;
            // Emoji label fades in with hover. Same smoothed value as uHover
            // so the label and halo brightening stay synchronized.
            if (p.emojiSprite) p.emojiSprite.material.opacity = p.hoverValue;
          }
        }
      }

      // Walk-into-portal: enter a portal by physically/stick-walking into it
      // (VR + desktop), alongside aim/click entry. Each portal arms only once
      // the head has left its radius (arm-on-exit + hysteresis), so spawning
      // beside a return portal can't bounce you straight back. enterPortal is
      // internally guarded by isActive/portalTransitioning, so the per-frame
      // calls during a fade are cheap no-ops. XZ distance only — door height
      // and GLB bob shouldn't affect the trigger.
      // Walk-in is NOT gated on the VR-entry spawn settle: arm-on-exit already
      // makes this safe (every portal is disarmed on the VR-entry edge below, so
      // one you're standing inside at the transient pre-spawn pose stays disarmed
      // until you leave it). Gating on the settle counter risked wedging walk-in
      // off permanently if that counter ever failed to reach 0.
      if (!portalTransitioning && !window.__decoEditActive) {
        // Head world position (see getHeadWorldMatrix — getCamera() reads
        // reference space in update(), which would drop the dolly's spawn-yaw
        // recenter and land us on the ≈opposite portal).
        _portalHeadPos.setFromMatrixPosition(getHeadWorldMatrix());
        for (const p of currentPortals) {
          const dx = _portalHeadPos.x - p.root.position.x;
          const dz = _portalHeadPos.z - p.root.position.z;
          const distSq = dx * dx + dz * dz;
          const r = p.triggerRadius ?? 0.7;
          if (!p.armed) {
            // Re-arm once clear of the radius plus a 1.5× hysteresis margin.
            const armR = r * 1.5;
            if (distSq > armR * armR) p.armed = true;
          } else if (distSq < r * r) {
            enterPortal(p, "walk");
            break; // one entry per frame
          }
        }
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
    const n = SCENES.length;
    // Skip hideInPicker entries (hub, lovely interiors) so the visible cycle
    // matches the picker pills. Bounded so an all-hidden array can't loop.
    let nextIdx = idx;
    for (let step = 0; step < n; step++) {
      nextIdx = (nextIdx + direction + n) % n;
      if (!SCENES[nextIdx].hideInPicker) {
        loadScene(SCENES[nextIdx]);
        return;
      }
    }
  }

  // Step in `direction` to the next scene in a DIFFERENT, picker-visible world,
  // then land on the FIRST visible scene of that world (array order) so each
  // world has one stable entry point regardless of travel direction. Skipping
  // hideInPicker on both the search and the landing keeps cycleWorld off the
  // Portals Glade hub (a lone "Random" entry) and AC's portal-only interiors —
  // for the Animal Crossing group it lands on the main "animal-crossing" scene.
  function cycleWorld(direction) {
    if (!currentSceneId) return;
    const startIdx = SCENES.findIndex((s) => s.id === currentSceneId);
    if (startIdx < 0) return;
    const fromWorld = SCENES[startIdx].world;
    const n = SCENES.length;
    let idx = startIdx;
    for (let step = 0; step < n; step++) {
      idx = (idx + direction + n) % n;
      if (SCENES[idx].world !== fromWorld && !SCENES[idx].hideInPicker) break;
    }
    const targetWorld = SCENES[idx].world;
    const firstVisible = SCENES.findIndex(
      (s) => s.world === targetWorld && !s.hideInPicker,
    );
    loadScene(SCENES[firstVisible >= 0 ? firstVisible : idx]);
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
  //
  // `forward` pushes the logged spot that many meters straight ahead along your
  // view (on the floor plane). Splats don't write depth, so a doorway is never
  // occluded by the room and any gap between it and the wall reads as the door
  // "sliding"/floating as you move (parallax). Stand back from the wall, pass
  // the approx distance to it (e.g. logPortalSpot(1.6, 3)) so the door lands ON
  // the wall — coplanar with the wall, it parallaxes with it and feels stuck.
  window.logPortalSpot = (eyeToFoot = 1.6, forward = 0) => {
    // getHeadWorldMatrix handles the VR reference-space gotcha (see its comment),
    // so authored coords are correct even in a yaw-recentered scene.
    const p = new THREE.Vector3();
    const q = new THREE.Quaternion();
    getHeadWorldMatrix(new THREE.Matrix4()).decompose(p, q, new THREE.Vector3());
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(q);
    // yaw = camera heading angle θ such that fwd = (-sin θ, 0, -cos θ).
    // Matches extractYaw above.
    const yaw = Math.atan2(-fwd.x, -fwd.z);
    // Ground-projected heading for the optional forward push (don't let pitch
    // shorten/lengthen the XZ step).
    const gx = -Math.sin(yaw);
    const gz = -Math.cos(yaw);
    // Setting outer.rotation.y = θ + π makes the portal's local -Z (its
    // "forward") point back toward the camera, so the portal faces you.
    const facing = yaw + Math.PI;
    console.log(
      `position: [${(p.x + gx * forward).toFixed(2)}, ${(p.y - eyeToFoot).toFixed(2)}, ${(p.z + gz * forward).toFixed(2)}],\n` +
        `rotationY: ${facing.toFixed(3)},`,
    );
  };
  // Live-tune a decoration (static prop) in the current scene. Pass an index
  // (order in the scene's `decorations` array) and any of { x, y, z, rx, ry,
  // rz, s }. Mutates the loaded group immediately and logs the full transform
  // in scene-def shape, so you can eyeball scale/placement then paste the
  // values back into scenes.js. e.g. window.deco(0, { s: 0.05, y: 1.2 })
  // Toggle the in-world prop gizmo editor (same as pressing the ` key). Click a
  // prop, w/e/r to move/rotate/scale, c to copy ALL transforms to the clipboard.
  // The drag-and-drop replacement for the window.deco() workflow below.
  window.decoEdit = () => decoEditor.toggle();
  window.deco = (i = 0, t = {}) => {
    const d = currentDecorations[i];
    if (!d) {
      console.warn(`[deco] no decoration at index ${i} (count=${currentDecorations.length})`);
      return;
    }
    const r = d.root;
    if (t.x !== undefined) r.position.x = t.x;
    if (t.y !== undefined) r.position.y = t.y;
    if (t.z !== undefined) r.position.z = t.z;
    if (t.rx !== undefined) r.rotation.x = t.rx;
    if (t.ry !== undefined) r.rotation.y = t.ry;
    if (t.rz !== undefined) r.rotation.z = t.rz;
    if (t.s !== undefined) r.scale.setScalar(t.s);
    console.log(
      `decoration "${d.id}" [${i}]:\n` +
        `  position: [${r.position.x.toFixed(2)}, ${r.position.y.toFixed(2)}, ${r.position.z.toFixed(2)}],\n` +
        (r.rotation.x ? `  rotationX: ${r.rotation.x.toFixed(3)},\n` : "") +
        `  rotationY: ${r.rotation.y.toFixed(3)},\n` +
        (r.rotation.z ? `  rotationZ: ${r.rotation.z.toFixed(3)},\n` : "") +
        `  scale: ${r.scale.x.toFixed(4)},`,
    );
  };
  // Live-tune a portal (GLB house/character or doorway) in the current scene —
  // same idea as window.deco() but for portals. Select by portal id (preferred:
  // GLB portals load async, so array order isn't deterministic) OR by index.
  // Common params: { x, y, z, ry }. GLB portals also take `s` (the ABSOLUTE
  // render.scale you'd paste back, not a multiplier). Doorway portals also take
  // { w, h, radius } — width/height/corner-radius, which rebuild the geometry.
  // Logs the result in scene-def shape, split into the portal-level fields and
  // the render-block fields. Call window.portal() with no args to list this
  // scene's portals. e.g. window.portal("mushroom-to-woodland", { w: 2.2, h: 2.6 })
  window.portal = (sel, t = {}) => {
    if (sel === undefined) {
      console.log(
        currentPortals.length
          ? currentPortals
              .map((p, i) => `  [${i}] ${p.id ?? "(no id)"} (${p.kind}) → ${p.target}`)
              .join("\n")
          : "(no portals in this scene)",
      );
      return;
    }
    const p =
      typeof sel === "number"
        ? currentPortals[sel]
        : currentPortals.find((cp) => cp.id === sel) ??
          currentPortals.find((cp) => cp.target === sel);
    if (!p) {
      console.warn(
        `[portal] no portal matching ${JSON.stringify(sel)} (count=${currentPortals.length}). ` +
          `Call window.portal() to list them.`,
      );
      return;
    }
    const r = p.root;
    if (t.x !== undefined) r.position.x = t.x;
    // Update baseY too, or a "bob" portal's per-frame y write snaps it back.
    if (t.y !== undefined) { r.position.y = t.y; p.baseY = t.y; }
    if (t.z !== undefined) r.position.z = t.z;
    if (t.ry !== undefined) r.rotation.y = t.ry;

    if (p.kind === "doorway") {
      if (t.s !== undefined) {
        console.warn("[portal] doorways size with { w, h, radius }, not { s } — ignoring s.");
      }
      if (t.w !== undefined || t.h !== undefined || t.radius !== undefined) {
        resizeDoorway(p, { width: t.w, height: t.h, radius: t.radius });
      }
    } else if (t.s !== undefined) {
      // The render.scale was baked into an inner wrapper (p.scale); the outer
      // root starts at scale 1. Convert the requested absolute render.scale into
      // the outer multiplier so the logged value pastes straight back.
      r.scale.setScalar(t.s / (p.scale || 1));
    }

    const header =
      `portal "${p.id ?? p.target}" [${currentPortals.indexOf(p)}] (${p.kind}) → ${p.target}:\n` +
      `  position: [${r.position.x.toFixed(2)}, ${r.position.y.toFixed(2)}, ${r.position.z.toFixed(2)}],\n` +
      `  rotationY: ${r.rotation.y.toFixed(3)},`;
    if (p.kind === "doorway") {
      console.log(
        header +
          `\n  render: {\n` +
          `    width: ${p.width.toFixed(2)},\n` +
          `    height: ${p.height.toFixed(2)},\n` +
          `    radius: ${p.radius.toFixed(2)},\n` +
          `  }`,
      );
    } else {
      const renderScale = (p.scale || 1) * r.scale.x;
      console.log(header + `\n  render: { scale: ${renderScale.toFixed(3)} }`);
    }
  };
  // Live preview of the splat-depth/occlusion tradeoff WITHOUT editing scenes.js.
  // window.stochastic(true) makes the current scene's splats render opaque + write
  // depth (meshes occlude correctly, but splat edges harden); (false) reverts to
  // the smooth transparent overlay. Transient — the next scene load reapplies
  // that scene's `stochastic` flag. Bake `stochastic: true` into the rooms you
  // want once you've judged the look.
  window.stochastic = (on = true) => {
    setSceneStochastic(on);
    console.log(`[splat-depth] ${on ? "ON (opaque, occludes)" : "OFF (smooth overlay)"} — transient; bake into scene def with stochastic: true`);
  };
  window.logPose = () => {
    const p = new THREE.Vector3();
    const q = new THREE.Quaternion();
    getHeadWorldMatrix(new THREE.Matrix4()).decompose(p, q, new THREE.Vector3());
    if (renderer.xr?.isPresenting) console.log(`[VR head world pose, world=${currentWorld}]`);
    console.log(
      `position: [${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)}],\n` +
        `quaternion: [${q.x.toFixed(3)}, ${q.y.toFixed(3)}, ${q.z.toFixed(3)}, ${q.w.toFixed(3)}],`,
    );
  };

  function getCurrentSceneId() {
    return currentSceneId;
  }

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
    getCurrentSceneId,
  };
}
