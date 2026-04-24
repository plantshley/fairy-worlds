import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VRMLoaderPlugin } from "@pixiv/three-vrm";
import { createProceduralCharacter } from "./proceduralCharacter.js";

function collectMaterials(root) {
  const seen = new Map();
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const m of mats) {
      if (!m || seen.has(m.uuid)) continue;
      seen.set(m.uuid, { name: m.name || `material-${seen.size}`, material: m });
    }
  });
  return Array.from(seen.values());
}

function materialApi(materials, tintable) {
  let exposed = materials;
  if (tintable && tintable.length) {
    const materialByName = new Map(materials.map((m) => [m.name, m]));
    exposed = tintable
      .filter((t) => materialByName.has(t.name))
      .map((t) => ({ ...materialByName.get(t.name), name: t.name, label: t.label ?? t.name }));
  }
  function setMaterialColor(name, hex) {
    const mat = exposed.find((m) => m.name === name);
    if (!mat) return;
    if (mat.material.color) mat.material.color.set(hex);
    if (mat.material.uniforms?.color?.value)
      mat.material.uniforms.color.value.set(hex);
  }
  function getState() {
    const out = { materials: {} };
    for (const m of exposed) {
      const c = m.material.color ?? m.material.uniforms?.color?.value;
      if (c) out.materials[m.name] = "#" + c.getHexString();
    }
    return out;
  }
  function applyState(state) {
    if (!state?.materials) return;
    for (const [name, hex] of Object.entries(state.materials)) {
      setMaterialColor(name, hex);
    }
  }
  return {
    getMaterials: () => exposed,
    setMaterialColor,
    getState,
    applyState,
  };
}

function filterByNodePrefix(scene, prefix) {
  const toRemove = scene.children.filter(
    (c) => !(c.name && c.name.startsWith(prefix)),
  );
  for (const obj of toRemove) scene.remove(obj);

  scene.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(scene);
  if (!box.isEmpty()) {
    const center = box.getCenter(new THREE.Vector3());
    for (const child of scene.children) {
      child.position.x -= center.x;
      child.position.z -= center.z;
      child.position.y -= box.min.y;
    }
  }
}

function wrapWithScale(root, scale, offsetY) {
  const needsWrap = (scale && scale !== 1) || offsetY;
  if (!needsWrap) return root;
  const wrapper = new THREE.Group();
  if (scale && scale !== 1) wrapper.scale.setScalar(scale);
  if (offsetY) wrapper.position.y = offsetY;
  wrapper.add(root);
  return wrapper;
}

export async function loadCharacter(def, initialState) {
  if (def.kind === "procedural") {
    const proc = createProceduralCharacter(initialState);
    return {
      kind: "procedural",
      root: proc.root,
      setColor: proc.setColor,
      setVariant: proc.setVariant,
      setAccessory: proc.setAccessory,
      setAccessoryColor: proc.setAccessoryColor,
      getState: proc.getState,
      update: () => {},
    };
  }

  if (def.kind === "glb") {
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync(def.url);
    if (def.nodePrefix) filterByNodePrefix(gltf.scene, def.nodePrefix);
    const materials = collectMaterials(gltf.scene);
    const root = wrapWithScale(gltf.scene, def.scale, def.offsetY);
    const api = materialApi(materials, def.tintable);
    api.applyState(initialState);
    return {
      kind: "glb",
      root,
      baseScale: def.scale ?? 1,
      animations: gltf.animations ?? [],
      update: () => {},
      ...api,
    };
  }

  if (def.kind === "vrm") {
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));
    const gltf = await loader.loadAsync(def.url);
    const vrm = gltf.userData.vrm;
    vrm.scene.rotation.y = Math.PI;

    const materials = collectMaterials(vrm.scene);
    const root = wrapWithScale(vrm.scene, def.scale, def.offsetY);
    const api = materialApi(materials, def.tintable);
    api.applyState(initialState);
    return {
      kind: "vrm",
      root,
      baseScale: def.scale ?? 1,
      vrm,
      update: (dt) => vrm.update(dt),
      ...api,
    };
  }

  throw new Error(`Unknown character kind: ${def.kind}`);
}
