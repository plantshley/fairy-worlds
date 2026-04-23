import * as THREE from "three";

const forward = new THREE.Vector3();
const right = new THREE.Vector3();
const move = new THREE.Vector3();
const DEAD_ZONE = 0.15;
const MOVE_SPEED = 2.0;
const SNAP_TURN = Math.PI / 6;
const SNAP_THRESHOLD = 0.8;

export function createVRLocomotion(renderer) {
  let snapArmed = true;

  function update(dt, dolly) {
    if (!renderer.xr?.isPresenting) return;
    const session = renderer.xr.getSession();
    if (!session) return;

    const xrCam = renderer.xr.getCamera();
    xrCam.getWorldDirection(forward);
    forward.y = 0;
    if (forward.lengthSq() < 1e-6) return;
    forward.normalize();
    right.crossVectors(forward, xrCam.up).normalize();

    let snapDir = 0;

    for (const source of session.inputSources) {
      const gp = source.gamepad;
      if (!gp) continue;
      const axes = gp.axes;
      const stickX = axes[2] ?? axes[0] ?? 0;
      const stickY = axes[3] ?? axes[1] ?? 0;

      if (source.handedness === "left") {
        if (Math.abs(stickX) > DEAD_ZONE || Math.abs(stickY) > DEAD_ZONE) {
          move.set(0, 0, 0)
            .addScaledVector(forward, -stickY * MOVE_SPEED * dt)
            .addScaledVector(right, stickX * MOVE_SPEED * dt);
          dolly.position.add(move);
        }
      } else if (source.handedness === "right") {
        if (Math.abs(stickX) > SNAP_THRESHOLD && snapArmed) {
          snapDir = stickX > 0 ? -1 : 1;
          snapArmed = false;
        } else if (Math.abs(stickX) < DEAD_ZONE) {
          snapArmed = true;
        }
      }
    }

    if (snapDir !== 0) {
      dolly.rotation.y += snapDir * SNAP_TURN;
    }
  }

  return { update };
}
