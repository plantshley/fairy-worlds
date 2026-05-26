import * as THREE from "three";

const DESKTOP_RAY_REACH = 20;
const VR_RAY_REACH = 5;
const SURFACE_RAY_REACH = 30; // max distance the cursor can place a box across the scene
const SURFACE_MIN_UP = 0.4; // min normal.y to treat a hit as ride-able floor (below = wall, ignored)
const DEBUG_DRAG = false; // logs (throttled) what the surface raycast hits — flip on to debug placement
const VELOCITY_WINDOW_MS = 60; // shorter window = release velocity tracks the final flick instead of averaging with prior drag
const THROW_BOOST = 1.8; // scale measured velocity — surface-ride tracks the cursor cleanly so less boost is needed now
const THROW_MAX_SPEED = 16; // clamp so wild flicks don't launch boxes into orbit
const THROW_UP_FACTOR = 0.3; // fraction of horizontal throw speed added as upward lift, so flat flicks arc instead of skidding
const THROW_SPIN_PER_SPEED = 4.0; // rad/s of tumble per m/s of throw — axis is perpendicular to velocity (forward-tumble)

export function createGrab({ renderer, camera, dolly, physics }) {
  const raycaster = new THREE.Raycaster();
  const _origin = new THREE.Vector3();
  const _dir = new THREE.Vector3();
  const _forward = new THREE.Vector3(0, 0, -1);
  const _worldPos = new THREE.Vector3();
  const _worldQuat = new THREE.Quaternion();
  const _dragPlane = new THREE.Plane();
  const _planeNormal = new THREE.Vector3();
  const _hitPoint = new THREE.Vector3();
  const _grabOffset = new THREE.Vector3();

  let pointerGrab = null; // { entry, pointerType, pointerId } — desktop right-drag OR touch drag (one box at a time)
  let dragMode = "surface"; // "surface" (rides collider/floor under cursor) | "vertical" (camera-facing plane: lift + strafe)
  let altHeld = false; // desktop Alt -> lift mode for the current drag
  const _lastNDC = new THREE.Vector2(); // cursor position, resolved per-frame in update()
  const _carry = new THREE.Vector3(); // current target world position of the held box center
  const _velocityHistory = []; // [{ t: ms, pos: Vector3 }]
  const vrGrabs = new Map(); // handedness -> { entry, controller }
  const controllers = new Map(); // handedness -> THREE.Group

  // Register both XR controller slots and capture their handedness on connect
  // so VR grab can look up "left"/"right" from the session-level select event.
  for (let i = 0; i < 2; i++) {
    const c = renderer.xr.getController(i);
    c.addEventListener("connected", (e) => {
      const hand = e.data?.handedness;
      if (hand === "left" || hand === "right") {
        controllers.set(hand, c);
        c.userData.handedness = hand;
      }
    });
    c.addEventListener("disconnected", () => {
      const hand = c.userData.handedness;
      if (hand) controllers.delete(hand);
    });
    dolly.add(c);
  }

  function meshesFromEntries() {
    const arr = [];
    for (const entry of physics.getEntries()) arr.push(entry.mesh);
    return arr;
  }

  function raycastEntries(origin, direction, maxDist) {
    raycaster.set(origin, direction);
    raycaster.far = maxDist;
    const hits = raycaster.intersectObjects(meshesFromEntries(), false);
    if (hits.length === 0) return null;
    return physics.findEntryByMesh(hits[0].object);
  }

  // --- Desktop (right-drag) & touch (one-finger drag on a box) ---

  // A box is grabbed by pointing at it: right-mouse-down (desktop) or a touch that
  // lands on a box (mobile). Touch on empty space is left alone so touchControls
  // can look around.
  //   - Desktop: SURFACE RIDE by default — raycast the cursor against the collider
  //              mesh (or flat ground) and sit the box on whatever's under it.
  //              Alt = LIFT onto a camera-facing vertical plane (raise/strafe).
  //              (Alt, not Shift — Shift+right-click forces Firefox's context menu.)
  //   - Touch:   FREE DRAG — the box slides on a plane facing the camera at a fixed
  //              distance, following the finger in any direction. Gravity settles
  //              it on release.
  // The drag resolves once per frame in update() (throttles the raycast), and the
  // carry-point's motion feeds throw velocity.

  const dom = renderer.domElement;

  function setMouseNDC(e) {
    const rect = dom.getBoundingClientRect();
    _lastNDC.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );
  }

  function pushCarryVelocitySample() {
    const now = performance.now();
    _velocityHistory.push({ t: now, pos: _carry.clone() });
    while (_velocityHistory.length > 1 && _velocityHistory[0].t < now - VELOCITY_WINDOW_MS) {
      _velocityHistory.shift();
    }
  }

  // Camera-facing vertical plane (normal = horizontal camera-forward), anchored at
  // the carry point so depth stays frozen while lifting/strafing.
  function buildLiftPlane() {
    camera.getWorldDirection(_planeNormal);
    _planeNormal.y = 0;
    if (_planeNormal.lengthSq() < 1e-6) _planeNormal.set(0, 0, 1); // looking straight down
    _planeNormal.normalize();
    _dragPlane.setFromNormalAndCoplanarPoint(_planeNormal, _carry);
  }

  function onPointerDown(e) {
    if (renderer.xr?.isPresenting) return;
    if (pointerGrab) return; // already holding a box

    const isTouch = e.pointerType === "touch";
    if (!isTouch) {
      // Desktop: only the right mouse button grabs (left stays SparkControls look).
      if (e.button !== 2) return;
      // Always suppress the browser menu + SparkControls for a right-press.
      e.preventDefault();
      e.stopImmediatePropagation();
    } else if (e.target !== dom) {
      // Touch: only direct canvas touches — never the joystick or HUD buttons.
      return;
    }

    camera.updateMatrixWorld(true);
    setMouseNDC(e);
    raycaster.setFromCamera(_lastNDC, camera);
    raycaster.far = DESKTOP_RAY_REACH;
    const hits = raycaster.intersectObjects(meshesFromEntries(), false);
    if (hits.length === 0) return;
    const entry = physics.findEntryByMesh(hits[0].object);
    if (!entry) return;

    // Touch only claims the gesture once it's confirmed on a box, so empty-space
    // drags still reach touchControls for looking around.
    if (isTouch) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }

    _carry.copy(entry.mesh.position);
    altHeld = e.altKey;
    dragMode = !isTouch && altHeld ? "vertical" : "surface";

    _velocityHistory.length = 0;
    pushCarryVelocitySample();

    physics.setKinematic(entry, true);
    pointerGrab = { entry, pointerType: e.pointerType, pointerId: e.pointerId };
  }

  // Only records cursor + (desktop) Alt state; the box is moved in update().
  function onPointerMove(e) {
    if (!pointerGrab) return;
    if (renderer.xr?.isPresenting) return;
    if (pointerGrab.pointerType === "touch") {
      if (e.pointerId !== pointerGrab.pointerId) return;
      e.stopImmediatePropagation();
    } else {
      altHeld = e.altKey;
    }
    setMouseNDC(e);
  }

  // Resolve the held box's target from the latest cursor each frame.
  function resolvePointerDrag() {
    camera.updateMatrixWorld(true);
    raycaster.setFromCamera(_lastNDC, camera);
    const entry = pointerGrab.entry;
    const half = entry.size * 0.5;

    if (pointerGrab.pointerType === "touch") {
      // Free screen-space drag (mobile): slide the box on a plane facing the
      // camera through its current position, so one finger moves it in any
      // direction at a fixed distance. Depth stays frozen; gravity settles it
      // on release.
      camera.getWorldDirection(_planeNormal);
      _dragPlane.setFromNormalAndCoplanarPoint(_planeNormal, _carry);
      if (raycaster.ray.intersectPlane(_dragPlane, _hitPoint)) {
        _carry.copy(_hitPoint);
        if (_carry.y < half) _carry.y = half; // don't sink below the ground
      }
      physics.setKinematicPose(entry, _carry, null);
      pushCarryVelocitySample();
      return;
    }

    // Desktop: surface-ride by default, Alt = lift on a camera-facing vertical plane.
    const mode = altHeld ? "vertical" : "surface";

    if (mode === "vertical") {
      if (dragMode !== "vertical") {
        // Entering lift mode: anchor the offset so the box doesn't jump.
        buildLiftPlane();
        if (raycaster.ray.intersectPlane(_dragPlane, _hitPoint)) {
          _grabOffset.copy(_carry).sub(_hitPoint);
        } else {
          _grabOffset.set(0, 0, 0);
        }
        dragMode = "vertical";
      } else {
        buildLiftPlane();
      }
      if (raycaster.ray.intersectPlane(_dragPlane, _hitPoint)) {
        _hitPoint.add(_grabOffset);
        _carry.x = _hitPoint.x;
        _carry.z = _hitPoint.z;
        _carry.y = Math.max(half, _hitPoint.y);
      }
    } else {
      dragMode = "surface";
      // Ride the surface under the cursor by raycasting the Rapier world (ground +
      // scene trimesh + other boxes), excluding the held box's body.
      const hit = physics.castSurfaceRay(
        raycaster.ray.origin,
        raycaster.ray.direction,
        SURFACE_RAY_REACH,
        entry.body,
      );
      // Only ride floor-like surfaces (normal points mostly up). On wall hits or
      // misses, don't freeze — glide the box at its CURRENT height following the
      // cursor (project onto a horizontal plane at carry.y), so the drag stays
      // responsive and doesn't try to climb walls. Use lift mode to change height.
      if (hit && hit.normal.y >= SURFACE_MIN_UP) {
        _carry.x = hit.point.x;
        _carry.z = hit.point.z;
        _carry.y = hit.point.y + half; // sit on top of the surface
      } else {
        _planeNormal.set(0, 1, 0);
        _dragPlane.setFromNormalAndCoplanarPoint(_planeNormal, _carry);
        if (raycaster.ray.intersectPlane(_dragPlane, _hitPoint)) {
          _carry.x = _hitPoint.x;
          _carry.z = _hitPoint.z; // keep carry.y
        }
      }
      if (DEBUG_DRAG) debugDrag(hit, half);
    }

    physics.setKinematicPose(entry, _carry, null);
    pushCarryVelocitySample();
  }

  let _debugLast = 0;
  let _fpsLast = 0;
  let _fpsFrames = 0;
  let _fps = 0;
  function debugDrag(hit, half) {
    // resolvePointerDrag runs once per frame while dragging, so counting calls
    // measures the live frame rate during a drag.
    _fpsFrames++;
    const now = performance.now();
    if (now - _fpsLast >= 500) {
      _fps = Math.round((_fpsFrames * 1000) / (now - _fpsLast));
      _fpsFrames = 0;
      _fpsLast = now;
    }
    if (now - _debugLast < 250) return;
    _debugLast = now;
    if (hit) {
      const wall = hit.normal.y < SURFACE_MIN_UP ? " WALL(ignored)" : "";
      console.log(
        `[grab] fps=${_fps} hit y=${hit.point.y.toFixed(2)} -> carry.y=${(hit.point.y + half).toFixed(2)} ` +
          `n=(${hit.normal.x.toFixed(2)},${hit.normal.y.toFixed(2)},${hit.normal.z.toFixed(2)})${wall}`,
      );
    } else {
      console.log(`[grab] fps=${_fps} surface MISS (no collider under cursor)`);
    }
  }

  function onPointerUp(e) {
    if (!pointerGrab) return;
    if (renderer.xr?.isPresenting) return;
    if (pointerGrab.pointerType === "touch") {
      if (e.pointerId !== pointerGrab.pointerId) return;
    } else if (e.button !== 2) {
      return;
    }
    e.preventDefault();
    e.stopImmediatePropagation();

    let throwVel = null;
    let throwAngvel = null;
    if (_velocityHistory.length >= 2) {
      const first = _velocityHistory[0];
      const last = _velocityHistory[_velocityHistory.length - 1];
      const dt = (last.t - first.t) / 1000;
      if (dt > 0.01) {
        const v = last.pos.clone().sub(first.pos).divideScalar(dt).multiplyScalar(THROW_BOOST);
        // Add a little lift proportional to horizontal speed so a flat flick arcs
        // up and across instead of skidding along the floor. A near-vertical throw
        // (small horizontal speed) gets almost none, so slam-downs stay slams.
        v.y += Math.hypot(v.x, v.z) * THROW_UP_FACTOR;
        if (v.lengthSq() > THROW_MAX_SPEED * THROW_MAX_SPEED) {
          v.setLength(THROW_MAX_SPEED);
        }
        throwVel = v;
        // Spin axis = world-up × velocity, so the box tumbles forward over the
        // direction of travel (like a thrown object would). For ~vertical throws
        // the cross degenerates — fall back to a fixed axis so we still spin.
        const speed = v.length();
        if (speed > 0.1) {
          const axis = new THREE.Vector3(0, 1, 0).cross(v);
          if (axis.lengthSq() < 1e-4) axis.set(1, 0, 0);
          axis.normalize().multiplyScalar(speed * THROW_SPIN_PER_SPEED);
          throwAngvel = axis;
        }
      }
    }

    physics.setKinematic(pointerGrab.entry, false, throwVel, throwAngvel);
    pointerGrab = null;
    _velocityHistory.length = 0;
  }

  // Touch interrupted (e.g. system gesture): drop the box in place, no throw.
  function onPointerCancel(e) {
    if (!pointerGrab || pointerGrab.pointerType !== "touch") return;
    if (e.pointerId !== pointerGrab.pointerId) return;
    physics.setKinematic(pointerGrab.entry, false);
    pointerGrab = null;
    _velocityHistory.length = 0;
  }

  function onContextMenu(e) {
    e.preventDefault();
  }

  // Listen on window (capture) so we beat SparkControls' / touchControls'
  // canvas-level handlers and can stopImmediatePropagation before they react.
  window.addEventListener("pointerdown", onPointerDown, true);
  window.addEventListener("pointermove", onPointerMove, true);
  window.addEventListener("pointerup", onPointerUp, true);
  window.addEventListener("pointercancel", onPointerCancel, true);
  dom.addEventListener("contextmenu", onContextMenu);

  // --- VR ---

  function tryGrab(hand) {
    if (vrGrabs.has(hand)) return true;
    const controller = controllers.get(hand);
    if (!controller) return false;
    // Update from the dolly down — controller is a child of dolly, and
    // vrLocomotion may have just moved dolly this frame. Updating only the
    // controller would leave its world transform stale relative to the moved
    // dolly.
    dolly.updateMatrixWorld(true);
    controller.getWorldPosition(_origin);
    _dir.copy(_forward).applyQuaternion(controller.getWorldQuaternion(_worldQuat));
    const entry = raycastEntries(_origin, _dir, VR_RAY_REACH);
    if (!entry) return false;
    physics.setKinematic(entry, true);
    vrGrabs.set(hand, { entry, controller });
    return true;
  }

  function releaseGrab(hand) {
    const held = vrGrabs.get(hand);
    if (!held) return false;
    physics.setKinematic(held.entry, false);
    vrGrabs.delete(hand);
    return true;
  }

  // --- Per-frame ---

  function update() {
    // Pointer drag resolves here (once per frame) so the collider raycast is
    // throttled to the frame rate rather than firing per pointermove.
    if (pointerGrab && !renderer.xr?.isPresenting) resolvePointerDrag();
    if (vrGrabs.size > 0) {
      dolly.updateMatrixWorld(true);
      for (const { entry, controller } of vrGrabs.values()) {
        controller.getWorldPosition(_worldPos);
        controller.getWorldQuaternion(_worldQuat);
        physics.setKinematicPose(entry, _worldPos, _worldQuat);
      }
    }
  }

  function releaseAll() {
    pointerGrab = null;
    vrGrabs.clear();
  }

  function dispose() {
    window.removeEventListener("pointerdown", onPointerDown, true);
    window.removeEventListener("pointermove", onPointerMove, true);
    window.removeEventListener("pointerup", onPointerUp, true);
    window.removeEventListener("pointercancel", onPointerCancel, true);
    dom.removeEventListener("contextmenu", onContextMenu);
    pointerGrab = null;
    _velocityHistory.length = 0;
    vrGrabs.clear();
  }

  return { tryGrab, releaseGrab, releaseAll, update, dispose };
}
