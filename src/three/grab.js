import * as THREE from "three";

const DESKTOP_RAY_REACH = 20;
const VR_RAY_REACH = 5;
const WHEEL_DEPTH_SCALE = 0.002; // metres of depth change per wheel-delta pixel
const VELOCITY_WINDOW_MS = 100;
const THROW_MAX_SPEED = 12; // clamp so wild flicks don't launch boxes into orbit

export function createGrab({ renderer, camera, dolly, physics }) {
  const raycaster = new THREE.Raycaster();
  const _origin = new THREE.Vector3();
  const _dir = new THREE.Vector3();
  const _forward = new THREE.Vector3(0, 0, -1);
  const _worldPos = new THREE.Vector3();
  const _worldQuat = new THREE.Quaternion();
  const _ndc = new THREE.Vector2();
  const _dragPlane = new THREE.Plane();
  const _planeNormal = new THREE.Vector3();
  const _hitPoint = new THREE.Vector3();
  const _grabOffset = new THREE.Vector3();

  let mouseGrab = null;
  let initialGrabDistance = 0;
  let depthOffset = 0;
  const _velocityHistory = []; // [{ t: ms, pos: Vector3 }]
  const _target = new THREE.Vector3();
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

  // --- Desktop ---

  // Right-click + drag. Right mouse avoids clashing with SparkControls' left-click
  // look-around. We raycast THROUGH the cursor position (not screen center), and
  // while dragging we project the cursor onto a plane parallel to the camera at
  // the original grab depth so the box stays with the mouse as it moves.

  const dom = renderer.domElement;

  function setMouseNDC(e) {
    const rect = dom.getBoundingClientRect();
    _ndc.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );
  }

  function onPointerDown(e) {
    if (e.button !== 2) return;
    if (renderer.xr?.isPresenting) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (mouseGrab) return;
    camera.updateMatrixWorld(true);
    setMouseNDC(e);
    raycaster.setFromCamera(_ndc, camera);
    raycaster.far = DESKTOP_RAY_REACH;
    const meshes = meshesFromEntries();
    const hits = raycaster.intersectObjects(meshes, false);
    if (hits.length === 0) return;
    const entry = physics.findEntryByMesh(hits[0].object);
    if (!entry) return;

    initialGrabDistance = hits[0].distance;
    depthOffset = 0;
    // Offset between box center and the surface point we grabbed, so the box
    // doesn't snap-center onto the cursor.
    _grabOffset.copy(entry.mesh.position).sub(hits[0].point);

    _velocityHistory.length = 0;
    _velocityHistory.push({ t: performance.now(), pos: entry.mesh.position.clone() });

    physics.setKinematic(entry, true);
    mouseGrab = entry;
  }

  function onPointerMove(e) {
    if (!mouseGrab) return;
    if (renderer.xr?.isPresenting) return;
    camera.updateMatrixWorld(true);
    setMouseNDC(e);
    raycaster.setFromCamera(_ndc, camera);

    // Rebuild the drag plane each frame so it tracks camera rotation, and
    // shift along the camera-forward by the accumulated wheel depth offset.
    camera.getWorldPosition(_origin);
    camera.getWorldDirection(_planeNormal);
    const planeDist = Math.max(0.3, initialGrabDistance + depthOffset);
    _target.copy(_origin).addScaledVector(_planeNormal, planeDist);
    _dragPlane.setFromNormalAndCoplanarPoint(_planeNormal, _target);

    if (!raycaster.ray.intersectPlane(_dragPlane, _hitPoint)) return;
    _hitPoint.add(_grabOffset);
    // Kinematic bodies don't collide with the ground, so dragging the cursor
    // below the floor would phase the box through it. Keep the box bottom
    // above ground (top of ground body == y=0).
    const minY = mouseGrab.size * 0.5;
    if (_hitPoint.y < minY) _hitPoint.y = minY;
    physics.setKinematicPose(mouseGrab, _hitPoint, null);

    const now = performance.now();
    _velocityHistory.push({ t: now, pos: _hitPoint.clone() });
    while (_velocityHistory.length > 1 && _velocityHistory[0].t < now - VELOCITY_WINDOW_MS) {
      _velocityHistory.shift();
    }
  }

  function onPointerUp(e) {
    if (e.button !== 2) return;
    if (renderer.xr?.isPresenting) return;
    if (!mouseGrab) return;
    e.preventDefault();
    e.stopImmediatePropagation();

    let throwVel = null;
    if (_velocityHistory.length >= 2) {
      const first = _velocityHistory[0];
      const last = _velocityHistory[_velocityHistory.length - 1];
      const dt = (last.t - first.t) / 1000;
      if (dt > 0.01) {
        const v = last.pos.clone().sub(first.pos).divideScalar(dt);
        if (v.lengthSq() > THROW_MAX_SPEED * THROW_MAX_SPEED) {
          v.setLength(THROW_MAX_SPEED);
        }
        throwVel = v;
      }
    }

    physics.setKinematic(mouseGrab, false, throwVel);
    mouseGrab = null;
    _velocityHistory.length = 0;
  }

  function onWheel(e) {
    if (!mouseGrab) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    depthOffset += e.deltaY * WHEEL_DEPTH_SCALE;
  }

  function onContextMenu(e) {
    e.preventDefault();
  }

  // Listen on window (capture) so we beat SparkControls' canvas-level handlers
  // and can stopImmediatePropagation before they react.
  window.addEventListener("pointerdown", onPointerDown, true);
  window.addEventListener("pointermove", onPointerMove, true);
  window.addEventListener("pointerup", onPointerUp, true);
  window.addEventListener("wheel", onWheel, { capture: true, passive: false });
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
    // Desktop drag updates happen in pointermove; nothing to do here per-frame
    // when only the mouse is held.
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
    mouseGrab = null;
    vrGrabs.clear();
  }

  function dispose() {
    window.removeEventListener("pointerdown", onPointerDown, true);
    window.removeEventListener("pointermove", onPointerMove, true);
    window.removeEventListener("pointerup", onPointerUp, true);
    window.removeEventListener("wheel", onWheel, { capture: true, passive: false });
    dom.removeEventListener("contextmenu", onContextMenu);
    mouseGrab = null;
    _velocityHistory.length = 0;
    vrGrabs.clear();
  }

  return { tryGrab, releaseGrab, releaseAll, update, dispose };
}
