import * as THREE from "three";

// Tap = pointerdown→pointerup with small movement and short duration. Anything
// bigger is a look-drag (SparkControls / touchControls) and we leave it alone.
const TAP_MS = 300;
const TAP_PX = 6;
const VR_RAY_REACH = 8;
const DESKTOP_RAY_REACH = 50;

const _origin = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _forward = new THREE.Vector3(0, 0, -1);
const _worldQuat = new THREE.Quaternion();
const _ndc = new THREE.Vector2();

// Owns input -> portal raycast wiring. Portal mesh lifecycle lives in world.js
// (instantiate from sceneDef.portals on scene load, dispose on swap); this
// module just reads the current list via getPortals() and fires onEnter(portal)
// when a tap / VR trigger lands on one.
//
// Patterned after grab.js: window capture-phase listeners so we beat
// SparkControls / touchControls, but we only stopImmediatePropagation on a
// confirmed portal hit. Empty-space taps fall through to look controls.
export function createPortalInteraction({ renderer, camera, dolly, getPortals, onEnter }) {
  const raycaster = new THREE.Raycaster();
  const dom = renderer.domElement;
  const controllers = new Map(); // handedness -> THREE.Group

  // Mirror grab.js's controller registration so VR raycast can look up
  // "left"/"right" from a session-level select event. dolly.add(controller) is
  // idempotent if grab.js already parented it — three.js's add() short-circuits
  // when the new parent matches the current parent.
  for (let i = 0; i < 2; i++) {
    const c = renderer.xr.getController(i);
    c.addEventListener("connected", (e) => {
      const hand = e.data?.handedness;
      if (hand === "left" || hand === "right") {
        controllers.set(hand, c);
        if (!c.userData.handedness) c.userData.handedness = hand;
        if (c.parent !== dolly) dolly.add(c);
      }
    });
    c.addEventListener("disconnected", () => {
      const hand = c.userData.handedness;
      if (hand) controllers.delete(hand);
    });
  }

  // Raycast targets are the invisible click-proxy boxes (one per portal). We
  // don't raycast against the GLB itself — SkinnedMesh's bbox pre-cull (using
  // skinning-aware bounds that collapse to ~origin without an AnimationMixer
  // driving the skeleton) reliably misses the per-triangle test. The proxy is
  // sized from the bind-pose geometry boxes and is parented to root, so a
  // proxy hit walks up to its portal entry via findHitPortal.
  function portalTargets() {
    const portals = getPortals();
    const targets = [];
    for (const p of portals) if (p.proxy) targets.push(p.proxy);
    return targets;
  }

  // Proxy hits return the proxy mesh directly; walk up to find its portal
  // entry. We tolerate intermediate parents (groups) in case rendering ever
  // changes to a more complex hierarchy.
  function findHitPortal(intersection) {
    const portals = getPortals();
    let obj = intersection.object;
    while (obj) {
      for (const p of portals) if (p.root === obj) return p;
      obj = obj.parent;
    }
    return null;
  }

  // --- Desktop + touch (tap detection) ---
  //
  // Track a single pending press. If the matching release is fast + still, run
  // the portal raycast at the release point. Hit -> consume + onEnter. Miss ->
  // do nothing (SparkControls / touchControls already saw the down/move/up).
  let pending = null; // { pointerId, t0, x0, y0 }

  function onPointerDown(e) {
    if (renderer.xr?.isPresenting) return;
    if (pending) return;
    // Ignore HUD / picker / button clicks — only canvas presses are candidates.
    if (e.target !== dom) return;
    const isTouch = e.pointerType === "touch";
    if (!isTouch && e.button !== 0) return; // desktop: left button only (right is grab)
    pending = {
      pointerId: e.pointerId,
      t0: performance.now(),
      x0: e.clientX,
      y0: e.clientY,
    };
  }

  function onPointerUp(e) {
    if (!pending || e.pointerId !== pending.pointerId) return;
    const dt = performance.now() - pending.t0;
    const dx = e.clientX - pending.x0;
    const dy = e.clientY - pending.y0;
    const isTap = dt < TAP_MS && Math.hypot(dx, dy) < TAP_PX;
    pending = null;
    if (!isTap) return;

    const roots = portalTargets();
    if (roots.length === 0) return;

    const rect = dom.getBoundingClientRect();
    _ndc.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    camera.updateMatrixWorld(true);
    raycaster.setFromCamera(_ndc, camera);
    raycaster.far = DESKTOP_RAY_REACH;
    const hits = raycaster.intersectObjects(roots, true);
    if (hits.length === 0) return;
    const portal = findHitPortal(hits[0]);
    if (!portal) return;

    // Confirmed portal hit — block downstream handlers (e.g. SparkControls
    // momentum kick from the tap, or world-picker close-on-canvas listeners).
    e.preventDefault();
    e.stopImmediatePropagation();
    onEnter(portal);
  }

  function onPointerCancel(e) {
    if (pending && e.pointerId === pending.pointerId) pending = null;
  }

  window.addEventListener("pointerdown", onPointerDown, true);
  window.addEventListener("pointerup", onPointerUp, true);
  window.addEventListener("pointercancel", onPointerCancel, true);

  // --- VR ---

  function tryPortal(hand) {
    const controller = controllers.get(hand);
    if (!controller) return false;
    const roots = portalTargets();
    if (roots.length === 0) return false;
    // Update from the dolly down — controller is a dolly child and vrLocomotion
    // may have just moved dolly this frame; updating only the controller would
    // leave its world transform stale. Matches grab.js:tryGrab.
    dolly.updateMatrixWorld(true);
    controller.getWorldPosition(_origin);
    _dir.copy(_forward).applyQuaternion(controller.getWorldQuaternion(_worldQuat));
    raycaster.set(_origin, _dir);
    raycaster.far = VR_RAY_REACH;
    const hits = raycaster.intersectObjects(roots, true);
    if (hits.length === 0) return false;
    const portal = findHitPortal(hits[0]);
    if (!portal) return false;
    onEnter(portal);
    return true;
  }

  function dispose() {
    window.removeEventListener("pointerdown", onPointerDown, true);
    window.removeEventListener("pointerup", onPointerUp, true);
    window.removeEventListener("pointercancel", onPointerCancel, true);
    pending = null;
  }

  return { tryPortal, dispose };
}
