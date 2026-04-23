import * as THREE from "three";

export function addPastelLighting(scene) {
  const ambient = new THREE.AmbientLight(0xfff4f9, 1.3);
  scene.add(ambient);

  const key = new THREE.DirectionalLight(0xfff4e0, 1.3);
  key.position.set(3, 5, 2);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xc8b3fb, 0.6);
  fill.position.set(-3, 2, -2);
  scene.add(fill);

  const front = new THREE.DirectionalLight(0xffffff, 0.5);
  front.position.set(0, 2, 5);
  scene.add(front);

  return { ambient, key, fill };
}
