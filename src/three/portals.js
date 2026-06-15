import * as THREE from "three";

// Tap = pointerdown→pointerup with small movement and short duration. Anything
// bigger is a look-drag (SparkControls / touchControls) and we leave it alone.
const TAP_MS = 300;
const TAP_PX = 6;
const VR_RAY_REACH = 8;
const DESKTOP_RAY_REACH = 50;

// VR pointer ray colors: pale pink when aiming at nothing, bright pink when the
// ray is over a portal (matched with the doorway shader's hover brightening).
const RAY_IDLE = 0xffd5ec;
const RAY_HOVER = 0xff5fa2;

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

  // A thin laser line parented to each controller so the player can see where
  // they're aiming. Unit length along -Z; scale.z is stretched to the hit
  // distance (or full reach) each frame in updateVRHover.
  function makeRay() {
    const geom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -1),
    ]);
    const mat = new THREE.LineBasicMaterial({
      color: RAY_IDLE,
      transparent: true,
      opacity: 0.4,
      depthTest: false, // draw over splats so the ray is always visible
    });
    const line = new THREE.Line(geom, mat);
    line.scale.z = VR_RAY_REACH;
    line.renderOrder = 30;
    line.visible = false; // shown only while presenting (see updateVRHover)
    return line;
  }

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
        if (!c.userData.ray) {
          const ray = makeRay();
          c.add(ray);
          c.userData.ray = ray;
        }
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

    // Confirmed portal hit. We do NOT stopImmediatePropagation here:
    // SparkControls listens for pointerup on `document` and touchControls
    // listens on the canvas. Swallowing this event leaves them stuck thinking
    // the pointer is still down — next pointermove drags the camera with no
    // click. The pointerdown was already let through, so they need to see the
    // matching up to clear their drag state. preventDefault still suppresses
    // browser-default behaviors (text selection on touch, etc.).
    e.preventDefault();
    onEnter(portal);
  }

  function onPointerCancel(e) {
    if (pending && e.pointerId === pending.pointerId) pending = null;
  }

  // --- Hover (desktop only) ---
  //
  // Tracks the last-hovered portal across pointermove events and fires
  // portal.onHover(true|false) on enter/leave. Touch devices have no hover,
  // and a "touch" pointermove with no buttons pressed never fires, so we just
  // gate on pointerType === "mouse". Skip during a press so a drag doesn't
  // toggle hover state while the user is swinging the camera. Skip in VR
  // (controller raycast has no equivalent event — could be added later by
  // polling controller pose).
  let hovered = null;
  function clearHover() {
    if (hovered) {
      hovered.onHover?.(false);
      hovered = null;
    }
  }
  function onPointerMove(e) {
    if (renderer.xr?.isPresenting) return;
    if (e.pointerType !== "mouse") return;
    if (pending) return;
    if (e.target !== dom) {
      clearHover();
      return;
    }
    const roots = portalTargets();
    if (roots.length === 0) {
      clearHover();
      return;
    }
    const rect = dom.getBoundingClientRect();
    _ndc.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    camera.updateMatrixWorld(true);
    raycaster.setFromCamera(_ndc, camera);
    raycaster.far = DESKTOP_RAY_REACH;
    const hits = raycaster.intersectObjects(roots, true);
    const portal = hits.length > 0 ? findHitPortal(hits[0]) : null;
    if (portal === hovered) return;
    hovered?.onHover?.(false);
    hovered = portal;
    hovered?.onHover?.(true);
  }

  window.addEventListener("pointerdown", onPointerDown, true);
  window.addEventListener("pointerup", onPointerUp, true);
  window.addEventListener("pointercancel", onPointerCancel, true);
  window.addEventListener("pointermove", onPointerMove, true);

  // --- VR ---

  // Raycast a single controller against the portal proxies. Returns the first
  // hit portal + its distance, or null. Updates from the dolly down — the
  // controller is a dolly child and vrLocomotion may have just moved dolly this
  // frame; updating only the controller would leave its world transform stale.
  // Matches grab.js:tryGrab.
  function castController(controller) {
    const roots = portalTargets();
    if (roots.length === 0) return null;
    dolly.updateMatrixWorld(true);
    controller.getWorldPosition(_origin);
    _dir.copy(_forward).applyQuaternion(controller.getWorldQuaternion(_worldQuat));
    raycaster.set(_origin, _dir);
    raycaster.far = VR_RAY_REACH;
    const hits = raycaster.intersectObjects(roots, true);
    if (hits.length === 0) return null;
    const portal = findHitPortal(hits[0]);
    if (!portal) return null;
    return { portal, distance: hits[0].distance };
  }

  function tryPortal(hand) {
    const controller = controllers.get(hand);
    if (!controller) return false;
    const hit = castController(controller);
    if (!hit) return false;
    onEnter(hit.portal);
    return true;
  }

  // Per-frame VR hover: stretch each controller's laser to its hit (or full
  // reach) and toggle portal.onHover across the union of what both wands point
  // at. Called from world.js update() while presenting. Diffing a Set handles
  // two controllers cleanly (a portal stays hovered while either wand is on it)
  // and avoids re-firing onHover every frame.
  let vrHovered = new Set();
  function updateVRHover() {
    if (!renderer.xr?.isPresenting) {
      for (const c of controllers.values()) {
        if (c.userData.ray) c.userData.ray.visible = false;
      }
      if (vrHovered.size) {
        for (const p of vrHovered) p.onHover?.(false);
        vrHovered = new Set();
      }
      return;
    }
    // Desktop hover state is frozen while in VR (pointermove early-returns); drop
    // it so a portal left "hovered" on desktop doesn't stay lit in the headset.
    if (hovered) clearHover();

    const nowHovered = new Set();
    for (const controller of controllers.values()) {
      const hit = castController(controller);
      const ray = controller.userData.ray;
      if (ray) {
        ray.visible = true;
        ray.scale.z = hit ? hit.distance : VR_RAY_REACH;
        ray.material.color.setHex(hit ? RAY_HOVER : RAY_IDLE);
        ray.material.opacity = hit ? 0.9 : 0.4;
      }
      if (hit) nowHovered.add(hit.portal);
    }
    for (const p of nowHovered) if (!vrHovered.has(p)) p.onHover?.(true);
    for (const p of vrHovered) if (!nowHovered.has(p)) p.onHover?.(false);
    vrHovered = nowHovered;
  }

  function dispose() {
    window.removeEventListener("pointerdown", onPointerDown, true);
    window.removeEventListener("pointerup", onPointerUp, true);
    window.removeEventListener("pointercancel", onPointerCancel, true);
    window.removeEventListener("pointermove", onPointerMove, true);
    pending = null;
    hovered = null;
    for (const p of vrHovered) p.onHover?.(false);
    vrHovered = new Set();
  }

  return { tryPortal, updateVRHover, dispose, clearHover };
}
