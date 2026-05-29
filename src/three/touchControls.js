import * as THREE from "three";

const DEAD_ZONE = 0.15;
const MOVE_SPEED = 2.4;
const LOOK_SENSITIVITY = 0.006;
const PITCH_LIMIT = Math.PI / 2 - 0.05;
const JOYSTICK_RADIUS = 55;

const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _move = new THREE.Vector3();
const _euler = new THREE.Euler(0, 0, 0, "YXZ");

export function createTouchControls(renderer) {
  const wrapper = document.createElement("div");
  wrapper.id = "touch-controls";
  wrapper.hidden = true;

  const stick = document.createElement("div");
  stick.className = "touch-stick";
  const knob = document.createElement("div");
  knob.className = "touch-stick-knob";
  stick.appendChild(knob);
  wrapper.appendChild(stick);
  document.body.appendChild(wrapper);

  let stickX = 0;
  let stickY = 0;
  let stickPointerId = null;
  let stickOriginX = 0;
  let stickOriginY = 0;

  let lookPointerId = null;
  let lookLastX = 0;
  let lookLastY = 0;
  let pendingYaw = 0;
  let pendingPitch = 0;
  let enabled = false;

  function setKnob(dx, dy) {
    const len = Math.hypot(dx, dy);
    const clamped = Math.min(1, len / JOYSTICK_RADIUS);
    const angle = len > 0 ? Math.atan2(dy, dx) : 0;
    const kx = Math.cos(angle) * clamped * JOYSTICK_RADIUS;
    const ky = Math.sin(angle) * clamped * JOYSTICK_RADIUS;
    knob.style.transform = `translate(${kx}px, ${ky}px)`;
    stickX = Math.cos(angle) * clamped;
    stickY = Math.sin(angle) * clamped;
  }
  function resetKnob() {
    knob.style.transform = "translate(0px, 0px)";
    stickX = 0;
    stickY = 0;
  }

  function onStickDown(e) {
    if (stickPointerId !== null) return;
    stickPointerId = e.pointerId;
    const rect = stick.getBoundingClientRect();
    stickOriginX = rect.left + rect.width / 2;
    stickOriginY = rect.top + rect.height / 2;
    stick.setPointerCapture?.(e.pointerId);
    setKnob(e.clientX - stickOriginX, e.clientY - stickOriginY);
    e.preventDefault();
    e.stopPropagation();
  }
  function onStickMove(e) {
    if (e.pointerId !== stickPointerId) return;
    setKnob(e.clientX - stickOriginX, e.clientY - stickOriginY);
    e.preventDefault();
  }
  function onStickUp(e) {
    if (e.pointerId !== stickPointerId) return;
    stick.releasePointerCapture?.(e.pointerId);
    stickPointerId = null;
    resetKnob();
  }

  function onCanvasDown(e) {
    if (e.pointerType !== "touch") return;
    if (lookPointerId !== null) return;
    if (e.target.closest("#touch-controls")) return;
    lookPointerId = e.pointerId;
    lookLastX = e.clientX;
    lookLastY = e.clientY;
  }
  function onCanvasMove(e) {
    if (e.pointerId !== lookPointerId) return;
    const dx = e.clientX - lookLastX;
    const dy = e.clientY - lookLastY;
    lookLastX = e.clientX;
    lookLastY = e.clientY;
    pendingYaw -= dx * LOOK_SENSITIVITY;
    pendingPitch -= dy * LOOK_SENSITIVITY;
  }
  function onCanvasUp(e) {
    if (e.pointerId !== lookPointerId) return;
    lookPointerId = null;
  }

  stick.addEventListener("pointerdown", onStickDown);
  stick.addEventListener("pointermove", onStickMove);
  stick.addEventListener("pointerup", onStickUp);
  stick.addEventListener("pointercancel", onStickUp);

  const canvas = renderer.domElement;
  canvas.addEventListener("pointerdown", onCanvasDown);
  canvas.addEventListener("pointermove", onCanvasMove);
  canvas.addEventListener("pointerup", onCanvasUp);
  canvas.addEventListener("pointercancel", onCanvasUp);

  function update(dt, camera) {
    if (!enabled) return;

    if (pendingYaw !== 0 || pendingPitch !== 0) {
      _euler.setFromQuaternion(camera.quaternion, "YXZ");
      _euler.y += pendingYaw;
      _euler.x = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, _euler.x + pendingPitch));
      _euler.z = 0;
      camera.quaternion.setFromEuler(_euler);
      pendingYaw = 0;
      pendingPitch = 0;
    }

    if (Math.abs(stickX) < DEAD_ZONE && Math.abs(stickY) < DEAD_ZONE) return;

    camera.getWorldDirection(_forward);
    _forward.y = 0;
    if (_forward.lengthSq() < 1e-6) return;
    _forward.normalize();
    _right.crossVectors(_forward, _up).normalize();

    _move.set(0, 0, 0)
      .addScaledVector(_forward, -stickY * MOVE_SPEED * dt)
      .addScaledVector(_right, stickX * MOVE_SPEED * dt);
    camera.position.add(_move);
  }

  function enable() {
    enabled = true;
    wrapper.hidden = false;
  }
  function disable() {
    enabled = false;
    wrapper.hidden = true;
    resetKnob();
    stickPointerId = null;
    lookPointerId = null;
    pendingYaw = 0;
    pendingPitch = 0;
  }

  return { update, enable, disable };
}
