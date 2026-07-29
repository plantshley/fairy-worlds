import * as THREE from "three";
import { loadCharacter } from "./loadCharacter.js";
import { stepGait } from "./gait.js";

// Third-person controller for the (hidden) playable fairy. Owns a visible
// rigged procedural fairy placed in the world scene, a Rapier kinematic capsule
// that collides against the scene trimesh, WASD + on-screen-joystick input, and
// an orbit-follow camera. Only used in world mode (desktop + mobile), never VR.
//
// Scene-graph of the character:
//   pivot (feet position + heading yaw, added to scene)
//     └ carrier (scaled; stepGait bobs Y + leans X; stashes walkT)
//         └ character.root (the procedural fairy, feet at y=0)
//
// The camera passed in is world mode's own PerspectiveCamera — we drive its
// position/quaternion directly (SparkControls must be disabled meanwhile).

const MOVE_SPEED = 2.6; // m/s
const TURN_RATE = 12; // heading lerp toward travel direction (per second)
const CAM_SMOOTH = 10; // camera position lerp (per second)
const DEAD_ZONE = 0.15;
const JOY_RADIUS = 55;

const _fwd = new THREE.Vector3();
const _right = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _move = new THREE.Vector3();
const _target = new THREE.Vector3();
const _camGoal = new THREE.Vector3();
const _offset = new THREE.Vector3();

// Dispose every geometry + material (+ its textures) under a root — same
// coverage as physics.js's clearAll, including SkinnedMesh.
function disposeRoot(root) {
  root?.traverse?.((obj) => {
    if (!obj.isMesh && !obj.isSkinnedMesh) return;
    obj.geometry?.dispose?.();
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const m of mats) {
      m?.map?.dispose?.();
      m?.dispose?.();
    }
  });
}

export function createThirdPersonController({ renderer, camera, scene, physics, characterDef, characterState, scale = 1 }) {
  const canvas = renderer.domElement;

  // ---- scene-graph -------------------------------------------------------
  const pivot = new THREE.Group();
  pivot.name = "tp-character-pivot";
  const carrier = new THREE.Group();
  carrier.scale.setScalar(scale);
  pivot.add(carrier);
  scene.add(pivot);

  let character = null; // { root, limbs } from loadCharacter
  let ready = false;
  let disposed = false;
  const CHAR_HEIGHT = 1.36 * scale; // approx visual height (ANCHORS.headTop)

  // ---- physics capsule ---------------------------------------------------
  const radius = 0.22 * scale;
  const halfHeight = 0.42 * scale;
  const feetToCenter = halfHeight + radius; // capsule center is this above feet
  const character3d = physics.createCharacter({ radius, halfHeight });

  // ---- orbit camera state ------------------------------------------------
  let camYaw = 0; // radians; 0 looks toward -Z
  let camPitch = 0.32;
  let camDist = 2.2 * scale; // start zoomed in close to the fairy
  const CAM_DIST_MIN = 1.2 * scale;
  const CAM_DIST_MAX = 9 * scale;
  const PITCH_MIN = 0.05;
  const PITCH_MAX = 1.25;
  const HEAD_HEIGHT = CHAR_HEIGHT * 0.85; // look target height above feet

  let heading = 0; // character facing yaw
  let feetY = 0; // last known floor Y (for camera target before first move)
  const feet = new THREE.Vector3();
  let clock = 0;
  let firstFrame = true;

  // ---- input state -------------------------------------------------------
  const move2 = { x: 0, y: 0 }; // x: strafe(+right), y: +back/-forward (screen)
  const keys = new Set();
  const _kb = { x: 0, y: 0 }; // reused scratch for keyVec()
  let enabled = false;

  function keyVec() {
    _kb.x = 0;
    _kb.y = 0;
    if (keys.has("KeyW") || keys.has("ArrowUp")) _kb.y -= 1;
    if (keys.has("KeyS") || keys.has("ArrowDown")) _kb.y += 1;
    if (keys.has("KeyA") || keys.has("ArrowLeft")) _kb.x -= 1;
    if (keys.has("KeyD") || keys.has("ArrowRight")) _kb.x += 1;
    return _kb;
  }

  // Held keys never receive their keyup when the window loses focus (alt-tab,
  // OS switch), which would leave the fairy walking forever. Clear on blur.
  function onBlur() {
    keys.clear();
  }

  function onKeyDown(e) {
    if (!enabled) return;
    // Don't hijack typing in inputs, and leave the '3' toggle / editor keys alone.
    if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) return;
    if (["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
      keys.add(e.code);
      e.preventDefault();
    } else if (e.code === "Space") {
      // Edge-triggered (keydown auto-repeats while held) so holding Space doesn't
      // auto-bounce — one tap, one hop. character3d.jump() ignores it mid-air.
      if (!keys.has("Space")) {
        keys.add("Space");
        character3d.jump();
      }
      e.preventDefault();
    }
  }
  function onKeyUp(e) {
    keys.delete(e.code);
  }

  // ---- pointer orbit (drag on canvas, not on the joystick) ---------------
  let orbitPointerId = null;
  let lastX = 0;
  let lastY = 0;
  const ORBIT_SENS = 0.006;

  function onPointerDown(e) {
    if (!enabled) return;
    if (e.target.closest("#tp-joystick")) return; // joystick owns its pointer
    if (orbitPointerId !== null) return;
    orbitPointerId = e.pointerId;
    lastX = e.clientX;
    lastY = e.clientY;
    // Capture so a fast drag that leaves the canvas still delivers move/up here
    // — otherwise orbitPointerId never clears and dragging locks up.
    canvas.setPointerCapture?.(e.pointerId);
  }
  function onPointerMove(e) {
    if (e.pointerId !== orbitPointerId) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    camYaw -= dx * ORBIT_SENS;
    camPitch = Math.max(PITCH_MIN, Math.min(PITCH_MAX, camPitch + dy * ORBIT_SENS));
  }
  function onPointerUp(e) {
    if (e.pointerId !== orbitPointerId) return;
    canvas.releasePointerCapture?.(e.pointerId);
    orbitPointerId = null;
  }
  function onWheel(e) {
    if (!enabled) return;
    camDist = Math.max(CAM_DIST_MIN, Math.min(CAM_DIST_MAX, camDist + e.deltaY * 0.01 * scale));
    e.preventDefault();
  }

  // ---- on-screen joystick (mobile) --------------------------------------
  const joy = document.createElement("div");
  joy.id = "tp-joystick";
  joy.className = "touch-stick"; // reuse existing joystick styling
  joy.hidden = true;
  const knob = document.createElement("div");
  knob.className = "touch-stick-knob";
  joy.appendChild(knob);
  document.body.appendChild(joy);

  let joyPointerId = null;
  let joyCX = 0;
  let joyCY = 0;
  function setKnob(dx, dy) {
    const len = Math.hypot(dx, dy);
    const clamped = Math.min(1, len / JOY_RADIUS);
    const ang = len > 0 ? Math.atan2(dy, dx) : 0;
    knob.style.transform = `translate(${Math.cos(ang) * clamped * JOY_RADIUS}px, ${Math.sin(ang) * clamped * JOY_RADIUS}px)`;
    move2.x = Math.cos(ang) * clamped;
    move2.y = Math.sin(ang) * clamped;
  }
  function resetKnob() {
    knob.style.transform = "translate(0,0)";
    move2.x = 0;
    move2.y = 0;
  }
  function onJoyDown(e) {
    if (joyPointerId !== null) return;
    joyPointerId = e.pointerId;
    const r = joy.getBoundingClientRect();
    joyCX = r.left + r.width / 2;
    joyCY = r.top + r.height / 2;
    joy.setPointerCapture?.(e.pointerId);
    setKnob(e.clientX - joyCX, e.clientY - joyCY);
    e.preventDefault();
    e.stopPropagation();
  }
  function onJoyMove(e) {
    if (e.pointerId !== joyPointerId) return;
    setKnob(e.clientX - joyCX, e.clientY - joyCY);
    e.preventDefault();
  }
  function onJoyUp(e) {
    if (e.pointerId !== joyPointerId) return;
    joy.releasePointerCapture?.(e.pointerId);
    joyPointerId = null;
    resetKnob();
  }
  joy.addEventListener("pointerdown", onJoyDown);
  joy.addEventListener("pointermove", onJoyMove);
  joy.addEventListener("pointerup", onJoyUp);
  joy.addEventListener("pointercancel", onJoyUp);

  // ---- on-screen jump button (mobile) -----------------------------------
  // Mirror of the joystick on the opposite (right) side; the desktop key is
  // Space. Tapping requests a jump (physics buffers + gates it on grounded).
  const jumpBtn = document.createElement("div");
  jumpBtn.id = "tp-jump";
  jumpBtn.textContent = "↑";
  jumpBtn.hidden = true;
  function onJumpDown(e) {
    character3d.jump();
    jumpBtn.classList.add("pressed");
    e.preventDefault();
    e.stopPropagation();
  }
  function onJumpUp(e) {
    jumpBtn.classList.remove("pressed");
    e?.preventDefault?.();
  }
  jumpBtn.addEventListener("pointerdown", onJumpDown);
  jumpBtn.addEventListener("pointerup", onJumpUp);
  jumpBtn.addEventListener("pointercancel", onJumpUp);
  jumpBtn.addEventListener("pointerleave", onJumpUp);
  document.body.appendChild(jumpBtn);

  const isCoarse = window.matchMedia?.("(pointer: coarse)")?.matches;

  // ---- build the fairy ---------------------------------------------------
  loadCharacter(characterDef, characterState).then((c) => {
    if (disposed) { disposeRoot(c.root); return; } // torn down mid-load
    character = c;
    carrier.add(c.root);
    ready = true;
  });

  // Rebuild the fairy from a fresh customization state (e.g. user re-edited it).
  async function setCharacterState(state) {
    const c = await loadCharacter(characterDef, state);
    if (disposed) { disposeRoot(c.root); return; }
    if (character) {
      carrier.remove(character.root);
      disposeRoot(character.root);
    }
    character = c;
    carrier.add(c.root);
    ready = true;
  }

  // ---- lifecycle ---------------------------------------------------------
  function enable() {
    if (enabled) return;
    enabled = true;
    firstFrame = true; // snap the camera on the first frame after (re)enabling
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    if (isCoarse) {
      joy.hidden = false;
      jumpBtn.hidden = false;
    }
    pivot.visible = true;
  }
  function disable() {
    if (!enabled) return;
    enabled = false;
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    window.removeEventListener("blur", onBlur);
    canvas.removeEventListener("pointerdown", onPointerDown);
    canvas.removeEventListener("pointermove", onPointerMove);
    canvas.removeEventListener("pointerup", onPointerUp);
    canvas.removeEventListener("pointercancel", onPointerUp);
    canvas.removeEventListener("wheel", onWheel);
    keys.clear();
    resetKnob();
    joyPointerId = null;
    orbitPointerId = null;
    joy.hidden = true;
    jumpBtn.hidden = true;
    jumpBtn.classList.remove("pressed");
    pivot.visible = false;
  }

  // Place the fairy at spawn: `pos` is the floor point (feet), `yaw` the facing.
  // Called by world mode after resolving the floor Y via a downward raycast.
  function spawnAt(pos, yaw = 0) {
    heading = yaw;
    feetY = pos.y;
    character3d.teleport({ x: pos.x, y: pos.y + feetToCenter, z: pos.z });
    pivot.position.set(pos.x, pos.y, pos.z);
    pivot.rotation.y = heading;
    // Park the camera behind the new facing (the fairy's face is +Z, so +π puts
    // the camera on its back) so it doesn't sweep across the scene on frame one.
    camYaw = heading + Math.PI;
    firstFrame = true;
  }

  // Show/hide the fairy without touching input listeners. World mode hides it
  // during a scene load (before the collider trimesh is in the world) so it
  // never flashes at a wrong, floor-guessed position, then shows it once the
  // real floor is known and it's been re-spawned onto it.
  function setVisible(visible) {
    pivot.visible = visible;
  }

  // World-space feet position (for portal walk-into proximity). Returns the
  // internal reused vector — read/copy it immediately, don't stash it.
  function getPlayerPosition() {
    return feet;
  }

  const _step = { x: 0, z: 0 }; // reused per-frame movement scratch

  function update(dt) {
    clock += dt;
    if (!enabled) return;

    // Camera-relative movement: forward = camera's ground-projected look dir.
    camera.getWorldDirection(_fwd);
    _fwd.y = 0;
    if (_fwd.lengthSq() < 1e-6) _fwd.set(0, 0, -1);
    _fwd.normalize();
    _right.crossVectors(_fwd, _up).normalize();

    const kb = keyVec();
    const inX = Math.abs(move2.x) > DEAD_ZONE ? move2.x : 0;
    const inY = Math.abs(move2.y) > DEAD_ZONE ? move2.y : 0;
    const wishX = inX + kb.x; // strafe
    const wishY = inY + kb.y; // screen-forward (negative = away from camera)

    _move.set(0, 0, 0);
    _move.addScaledVector(_fwd, -wishY);
    _move.addScaledVector(_right, wishX);
    const moving = _move.lengthSq() > 1e-6;
    if (moving) _move.normalize();

    // Advance the capsule (physics resolves walls/floor/steps + gravity).
    _step.x = _move.x * MOVE_SPEED * dt;
    _step.z = _move.z * MOVE_SPEED * dt;
    const res = character3d.move(_step, dt);
    feet.set(res.position.x, res.position.y - feetToCenter, res.position.z);
    pivot.position.copy(feet);
    feetY = feet.y;

    // Turn the fairy toward travel direction.
    if (moving) {
      const targetHeading = Math.atan2(_move.x, _move.z);
      let d = targetHeading - heading;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      heading += d * Math.min(1, TURN_RATE * dt);
      pivot.rotation.y = heading;
    }

    // Walk gait on the rigged limbs.
    if (ready && character.limbs) stepGait(character.limbs, carrier, moving, dt, clock);

    // Orbit-follow camera around the head.
    _target.set(feet.x, feet.y + HEAD_HEIGHT, feet.z);
    const cp = Math.cos(camPitch);
    _offset.set(
      camDist * cp * Math.sin(camYaw),
      camDist * Math.sin(camPitch),
      camDist * cp * Math.cos(camYaw),
    );
    _camGoal.copy(_target).add(_offset);
    if (firstFrame) {
      camera.position.copy(_camGoal);
      firstFrame = false;
    } else {
      camera.position.lerp(_camGoal, Math.min(1, CAM_SMOOTH * dt));
    }
    camera.lookAt(_target);
  }

  function dispose() {
    disposed = true;
    disable();
    scene.remove(pivot);
    character3d.dispose();
    joy.remove();
    jumpBtn.remove();
    disposeRoot(character?.root);
  }

  return { enable, disable, update, spawnAt, setVisible, getPlayerPosition, setCharacterState, dispose };
}
