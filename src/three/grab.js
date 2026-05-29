import * as THREE from "three";

const DESKTOP_RAY_REACH = 20;
const VR_RAY_REACH = 5;
const ROT_SLERP_K = 12;   // sticky-grab rotation easing rate (1/s) — higher = snappier hang
const COLLISION_SKIN = 0.02; // back off the held body this much from any wall it would hit, so contacts stay clean
const VELOCITY_WINDOW_MS = 60; // shorter window = release velocity tracks the final flick instead of averaging with prior drag
const THROW_BOOST = 1.8; // scale measured velocity
const THROW_MAX_SPEED = 16; // clamp so wild flicks don't launch boxes into orbit
const THROW_MIN_SPEED = 0.6; // below this magnitude, treat the release as a drop (no throw, snap rotation back) — kills micro-cursor-drift launches
const THROW_UP_FACTOR = 0.3; // fraction of horizontal throw speed added as upward lift, so flat flicks arc instead of skidding
const THROW_SPIN_PER_SPEED = 4.0; // rad/s of tumble per m/s of throw — axis is perpendicular to velocity (forward-tumble)
const DRAG_Y_BIAS = 0.12; // fraction of cursor screen-up motion that maps to world Y in default drag (the rest goes to world Z forward-horizontal)

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
  const _UP = new THREE.Vector3(0, 1, 0);
  // Sticky-grab scratch
  const _localGrabOffset = new THREE.Vector3();
  const _grabPointWorld = new THREE.Vector3();
  const _localDir = new THREE.Vector3();
  const _targetRot = new THREE.Quaternion();
  const _rotatedOffset = new THREE.Vector3();
  const _targetPos = new THREE.Vector3();
  const _motion = new THREE.Vector3();
  const _clampedPos = new THREE.Vector3();
  const _bodyInvRot = new THREE.Quaternion();
  // Drag-axis scratch (camera + world horizontal bases)
  const _camFwd = new THREE.Vector3();
  const _camRight = new THREE.Vector3();
  const _camUp = new THREE.Vector3();
  const _worldFwdH = new THREE.Vector3();
  const _worldRightH = new THREE.Vector3();
  const _cursorDelta = new THREE.Vector3();

  let pointerGrab = null; // { entry, pointerType, pointerId, initialRotation } — desktop right-drag OR touch drag (one box at a time)
  // Lift modifier: holding F switches desktop drag to vertical-lift mode.
  // F was chosen over Alt because the browser steals focus on Alt-press
  // (the "menubar focus" behavior in Chromium-based browsers).
  let liftHeld = false;
  const _lastNDC = new THREE.Vector2(); // cursor position, resolved per-frame in update()
  const _carry = new THREE.Vector3(); // body center position from latest frame, used to feed throw velocity
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

  // GLB objects are added as Groups, so we have to recurse and walk back up
  // from the hit mesh to the entry root. Primitive boxes are a Mesh whose
  // parent is the scene — the while-loop short-circuits on the first iteration
  // (entry.mesh === hit object).
  function findEntryFromHit(hitObject) {
    let cursor = hitObject;
    while (cursor) {
      const entry = physics.findEntryByMesh(cursor);
      if (entry) return entry;
      cursor = cursor.parent;
    }
    return null;
  }

  function raycastEntries(origin, direction, maxDist) {
    raycaster.set(origin, direction);
    raycaster.far = maxDist;
    const hits = raycaster.intersectObjects(meshesFromEntries(), true);
    if (hits.length === 0) return null;
    return findEntryFromHit(hits[0].object);
  }

  // --- Desktop (right-drag) & touch (one-finger drag on a box) ---

  // STICKY-POINT GRAB: the exact spot the cursor/finger lands on the object
  // stays glued to the cursor/finger as you drag — grab a daisy by its petal
  // and the petal tracks your finger, while the rest of the daisy hangs below
  // (the held body's rotation eases toward an orientation where the grab point
  // is on top and the body hangs straight down from it).
  //
  // Drag plane:
  //   - Default: camera-facing plane (full forward, includes pitch) through the
  //     current grab-point-in-world. Cursor delta is then decomposed into
  //     screen-X → world-right-horizontal and screen-Y → world-forward-
  //     horizontal (with a small DRAG_Y_BIAS up-component) so the object
  //     slides along the floor at its grab-Y instead of floating with pitch.
  //   - Desktop F-held: same plane but normal.y zeroed — vertical cursor maps
  //     directly to world Y (lift), horizontal strafes. (F not Alt, because
  //     Alt steals focus to the browser menubar.)
  //
  // COLLISION CLAMP: before each frame's kinematic teleport, we ray-cast from
  // the body center toward the target along the motion direction and stop at
  // the first wall/floor/other-box. So the held object thumps against
  // colliders instead of tunneling through them.

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
    const hits = raycaster.intersectObjects(meshesFromEntries(), true);
    if (hits.length === 0) return;
    const entry = findEntryFromHit(hits[0].object);
    if (!entry) return;

    // Touch only claims the gesture once it's confirmed on a box, so empty-space
    // drags still reach touchControls for looking around.
    if (isTouch) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }

    // Record where on the body (in body-local frame) the cursor landed. This is
    // the "sticky" point — we'll keep it pinned under the cursor each frame.
    const hitPointWorld = hits[0].point;
    _grabPointWorld.copy(hitPointWorld);
    _bodyInvRot.copy(entry.mesh.quaternion).invert();
    _localGrabOffset
      .copy(hitPointWorld)
      .sub(entry.mesh.position)
      .applyQuaternion(_bodyInvRot);

    _carry.copy(entry.mesh.position);

    _velocityHistory.length = 0;
    pushCarryVelocitySample();

    // Remember the body's pre-grab orientation so a no-throw release can snap
    // it back (the hang-from-grab tilt during drag would otherwise leave it
    // landing on a corner, causing the tipover-bounce the user reported).
    const initialRotation = entry.mesh.quaternion.clone();
    physics.setKinematic(entry, true);
    pointerGrab = {
      entry,
      pointerType: e.pointerType,
      pointerId: e.pointerId,
      initialRotation,
    };
  }

  // Records the cursor position; F-held state is updated by window keydown/keyup.
  function onPointerMove(e) {
    if (!pointerGrab) return;
    if (renderer.xr?.isPresenting) return;
    if (pointerGrab.pointerType === "touch") {
      if (e.pointerId !== pointerGrab.pointerId) return;
      e.stopImmediatePropagation();
    }
    setMouseNDC(e);
  }

  function onKeyDown(e) {
    if (e.key === "f" || e.key === "F") liftHeld = true;
  }
  function onKeyUp(e) {
    if (e.key === "f" || e.key === "F") liftHeld = false;
  }

  // Resolve the held body's target pose from the latest cursor each frame.
  // Sticky-point math: the local grab point on the body (set at grab time)
  // is kept at the cursor's projection onto the drag plane. The body rotates
  // (smoothly slerped) so the grab point ends up on top and the body hangs
  // below — gives a natural "picked up by the petal" tilt. Target translation
  // is collision-clamped against the scene so walls/floors stop the body.
  function resolvePointerDrag(dt) {
    camera.updateMatrixWorld(true);
    raycaster.setFromCamera(_lastNDC, camera);
    const entry = pointerGrab.entry;
    const half = entry.size * 0.5;
    const isTouch = pointerGrab.pointerType === "touch";
    const liftMode = !isTouch && liftHeld;
    // Touch uses pure camera-facing plane (screen-Y maps naturally to a Y/Z
    // mix based on camera pitch — look down to lower, look up to lift). No
    // world-axis decomposition, no collision clamp — free screen-plane drag
    // matching the "drag to move · flick to throw" HUD hint.
    const freePlaneMode = isTouch || liftMode;

    // 1) Build the drag plane through the current grab-point-in-world.
    //    Default desktop: camera-facing plane (full forward, includes pitch).
    //    Desktop F-lift: same plane but normal.y zeroed → vertical cursor maps
    //    directly to world Y. Touch: camera-facing plane (no flatten).
    camera.getWorldDirection(_camFwd);
    _planeNormal.copy(_camFwd);
    if (liftMode) {
      _planeNormal.y = 0;
      if (_planeNormal.lengthSq() < 1e-6) _planeNormal.set(0, 0, 1);
    }
    _planeNormal.normalize();
    _dragPlane.setFromNormalAndCoplanarPoint(_planeNormal, _grabPointWorld);

    // 2) Cursor → plane: where the grab point wants to be (in camera-plane space).
    if (!raycaster.ray.intersectPlane(_dragPlane, _hitPoint)) return;

    if (freePlaneMode) {
      // Pure plane intersection — grab point follows cursor in 3D.
      _grabPointWorld.copy(_hitPoint);
    } else {
      // Desktop default: project the cursor delta onto camera-right (screen X)
      // and camera-up (screen Y), then rebuild it in WORLD horizontal axes —
      // screen X → world right-horizontal, screen Y → world forward-horizontal.
      // World Y of the grab point stays fixed unless F is held.
      _cursorDelta.copy(_hitPoint).sub(_grabPointWorld);
      _camRight.crossVectors(_camFwd, _UP);
      if (_camRight.lengthSq() < 1e-6) _camRight.set(1, 0, 0); // camera looking straight up/down
      _camRight.normalize();
      _camUp.crossVectors(_camRight, _camFwd).normalize();
      const dRight = _cursorDelta.dot(_camRight);
      const dUp = _cursorDelta.dot(_camUp);
      _worldFwdH.set(_camFwd.x, 0, _camFwd.z);
      if (_worldFwdH.lengthSq() < 1e-6) _worldFwdH.set(0, 0, -1);
      _worldFwdH.normalize();
      _worldRightH.crossVectors(_worldFwdH, _UP).normalize();
      _grabPointWorld.addScaledVector(_worldRightH, dRight);
      // Most of the screen-up motion goes to world Z (forward-horizontal);
      // a small DRAG_Y_BIAS fraction goes to world Y so the object rises
      // slightly as you push it away. Pure depth motion felt too "ground-glued"
      // without this.
      _grabPointWorld.addScaledVector(_worldFwdH, dUp * (1 - DRAG_Y_BIAS));
      _grabPointWorld.y += dUp * DRAG_Y_BIAS;
    }

    // 3) Target rotation: orient the body so localGrabOffset points world-up
    //    (grab point on top, body hangs below). Skip if grabbed near center.
    if (_localGrabOffset.lengthSq() >= 1e-4) {
      _localDir.copy(_localGrabOffset).normalize();
      _targetRot.setFromUnitVectors(_localDir, _UP);
      // Smooth easing: alpha = 1 - exp(-k*dt) is frame-rate-independent.
      const alpha = 1 - Math.exp(-ROT_SLERP_K * Math.max(dt, 0));
      entry.mesh.quaternion.slerp(_targetRot, alpha);
    }

    // 4) Body position so the (rotated) local grab offset lands on _grabPointWorld.
    _rotatedOffset.copy(_localGrabOffset).applyQuaternion(entry.mesh.quaternion);
    _targetPos.copy(_grabPointWorld).sub(_rotatedOffset);

    // 5) Floor clamp using the body's bounding half-extent as a cheap radius.
    if (_targetPos.y < half) _targetPos.y = half;

    // 6) Collision-clamp the translation: sweep a ray from body center toward
    //    target; stop just before any wall/floor/other-box along the way.
    //    Touch skips this — free screen-plane drag, walls only stop the body
    //    on release when physics takes over again.
    if (isTouch) {
      _clampedPos.copy(_targetPos);
    } else {
      clampMoveByRay(entry, entry.mesh.position, _targetPos, _clampedPos);
    }

    physics.setKinematicPose(entry, _clampedPos, entry.mesh.quaternion);
    _carry.copy(_clampedPos);
    pushCarryVelocitySample();
  }

  // Ray-cast body center → target along the motion direction; if anything is
  // hit, clamp the move so the body stops just short. Writes the result into
  // `out`. The skin (COLLISION_SKIN) keeps the body slightly off the surface
  // so successive frames don't pin it inside a collider.
  function clampMoveByRay(entry, currentPos, targetPos, out) {
    _motion.copy(targetPos).sub(currentPos);
    const dist = _motion.length();
    if (dist < 1e-4) {
      out.copy(currentPos);
      return;
    }
    _dir.copy(_motion).divideScalar(dist);
    const half = entry.size * 0.5;
    // castSurfaceRay excludes ground when a scene collider is active (intended
    // behavior — the real floor is the trimesh). Excluding the held body
    // prevents self-hits on a grabbed convex hull.
    const hit = physics.castSurfaceRay(currentPos, _dir, dist + half, entry.body);
    if (!hit) {
      out.copy(targetPos);
      return;
    }
    const hitDist = hit.point.distanceTo(currentPos);
    const allowed = Math.max(0, hitDist - half - COLLISION_SKIN);
    out.copy(_dir).multiplyScalar(allowed).add(currentPos);
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
        // Below the throw threshold, treat the release as a plain drop —
        // otherwise tiny cursor jitter at release time launches the object
        // off the table.
        if (v.length() >= THROW_MIN_SPEED) {
          throwVel = v;
          // Spin axis = world-up × velocity, so the box tumbles forward over
          // the direction of travel. For ~vertical throws the cross
          // degenerates — fall back to a fixed axis so we still spin.
          const speed = v.length();
          const axis = new THREE.Vector3(0, 1, 0).cross(v);
          if (axis.lengthSq() < 1e-4) axis.set(1, 0, 0);
          axis.normalize().multiplyScalar(speed * THROW_SPIN_PER_SPEED);
          throwAngvel = axis;
        }
      }
    }

    // No-throw release: snap rotation back to the body's pre-grab orientation
    // so it lands flat-side-down. Hang-from-grab during drag would otherwise
    // leave it perched on a corner, which tips → "delayed bounce".
    if (!throwVel) {
      physics.snapRotation(pointerGrab.entry, pointerGrab.initialRotation);
    }
    physics.setKinematic(pointerGrab.entry, false, throwVel, throwAngvel);
    pointerGrab = null;
    _velocityHistory.length = 0;
  }

  // Touch interrupted (e.g. system gesture): drop the box in place, no throw.
  function onPointerCancel(e) {
    if (!pointerGrab || pointerGrab.pointerType !== "touch") return;
    if (e.pointerId !== pointerGrab.pointerId) return;
    physics.snapRotation(pointerGrab.entry, pointerGrab.initialRotation);
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
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
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
    // Inline raycast so we can capture the hit point — sticky-grab needs it to
    // record where on the body the user grabbed (in body-local frame).
    raycaster.set(_origin, _dir);
    raycaster.far = VR_RAY_REACH;
    const hits = raycaster.intersectObjects(meshesFromEntries(), true);
    if (hits.length === 0) return false;
    const entry = findEntryFromHit(hits[0].object);
    if (!entry) return false;
    physics.setKinematic(entry, true);
    // localGrabOffset = (hit point - body center) expressed in body-local frame.
    // Each frame the body is posed so this local point ends up at the controller
    // position with the controller's rotation — i.e., the controller "holds"
    // the object at the spot the user pointed at.
    const hitPointWorld = hits[0].point;
    const localOffset = new THREE.Vector3()
      .copy(hitPointWorld)
      .sub(entry.mesh.position)
      .applyQuaternion(_bodyInvRot.copy(entry.mesh.quaternion).invert());
    vrGrabs.set(hand, { entry, controller, localOffset });
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

  function update(dt = 0) {
    // Pointer drag resolves here (once per frame) so the collider raycast is
    // throttled to the frame rate rather than firing per pointermove.
    if (pointerGrab && !renderer.xr?.isPresenting) resolvePointerDrag(dt);
    if (vrGrabs.size > 0) {
      dolly.updateMatrixWorld(true);
      for (const { entry, controller, localOffset } of vrGrabs.values()) {
        controller.getWorldPosition(_worldPos);
        controller.getWorldQuaternion(_worldQuat);
        // Sticky-point in VR: place the body so the local grab offset (in
        // body-local frame) ends up at the controller position. Rotation =
        // controller rotation directly (wrist motion drives orientation; no
        // slerp easing needed since the source is the user's hand).
        if (localOffset && localOffset.lengthSq() >= 1e-4) {
          _rotatedOffset.copy(localOffset).applyQuaternion(_worldQuat);
          _targetPos.copy(_worldPos).sub(_rotatedOffset);
          physics.setKinematicPose(entry, _targetPos, _worldQuat);
        } else {
          // Grabbed exactly at center — body center = controller position.
          physics.setKinematicPose(entry, _worldPos, _worldQuat);
        }
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
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    dom.removeEventListener("contextmenu", onContextMenu);
    pointerGrab = null;
    _velocityHistory.length = 0;
    vrGrabs.clear();
  }

  return { tryGrab, releaseGrab, releaseAll, update, dispose };
}
