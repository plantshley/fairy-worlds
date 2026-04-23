import * as THREE from "three";

const easeInQuad = (t) => t * t;
const easeOutQuad = (t) => 1 - (1 - t) * (1 - t);

export function tween({ duration, ease = easeInQuad, onUpdate, onComplete }) {
  const start = performance.now();
  function frame(now) {
    const raw = Math.min(1, (now - start) / duration);
    const t = ease(raw);
    onUpdate(t);
    if (raw < 1) requestAnimationFrame(frame);
    else onComplete?.();
  }
  requestAnimationFrame(frame);
}

export function fadeElement(el, from, to, duration = 250) {
  return new Promise((resolve) => {
    el.style.opacity = from;
    el.hidden = false;
    tween({
      duration,
      ease: easeOutQuad,
      onUpdate: (t) => {
        el.style.opacity = (from + (to - from) * t).toFixed(3);
      },
      onComplete: () => {
        if (to === 0) el.hidden = true;
        resolve();
      },
    });
  });
}

export function cameraZoomIn(camera, { targetPos, targetFov, duration = 600 }) {
  const startPos = camera.position.clone();
  const startFov = camera.fov;
  const endPos = new THREE.Vector3(...targetPos);
  return new Promise((resolve) => {
    tween({
      duration,
      ease: easeInQuad,
      onUpdate: (t) => {
        camera.position.lerpVectors(startPos, endPos, t);
        camera.fov = startFov + (targetFov - startFov) * t;
        camera.updateProjectionMatrix();
      },
      onComplete: resolve,
    });
  });
}
