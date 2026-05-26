import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import RAPIER from "@dimforge/rapier3d-compat";

const GRAVITY = { x: 0, y: -9.81, z: 0 };
const GROUND_HALF_EXTENTS = { x: 100, y: 0.1, z: 100 };
const GROUND_Y = -0.1;
const SHOW_GROUND_DEBUG = false;
// Per-scene collider meshes load as Rapier trimesh + a translucent wireframe so
// alignment vs. the splat can be eyeballed. Keep false in normal use — rendering a
// high-poly collider as wireframe every frame tanks the framerate to single digits.
const SHOW_SCENE_COLLIDER_DEBUG = false;

let rapierReady = null;
export function ensureReady() {
  if (!rapierReady) rapierReady = RAPIER.init().then(() => RAPIER);
  return rapierReady;
}

export function createPhysics({ scene }) {
  const world = new RAPIER.World(GRAVITY);
  const bodies = new Set();
  const _tmpQuat = new THREE.Quaternion();
  const _tmpVec = new THREE.Vector3();
  const _ray = new RAPIER.Ray({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 });
  const _hitNormal = new THREE.Vector3();

  const groundBodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(0, GROUND_Y, 0);
  const groundBody = world.createRigidBody(groundBodyDesc);
  const groundCollider = world.createCollider(
    RAPIER.ColliderDesc.cuboid(GROUND_HALF_EXTENTS.x, GROUND_HALF_EXTENTS.y, GROUND_HALF_EXTENTS.z),
    groundBody,
  );

  let groundMesh = null;
  if (SHOW_GROUND_DEBUG) {
    groundMesh = new THREE.GridHelper(20, 20, 0xff88dd, 0xaa66cc);
    groundMesh.position.y = 0;
    scene.add(groundMesh);
  }

  // When a scene collider mesh is loaded, skip the flat y=0 ground in surface
  // raycasts — otherwise the ray pops through gaps in the mesh down to y=0 and
  // the dragged box jitters between the real floor and the ground plane.
  function _surfaceFilter(collider) {
    if (sceneCollider && collider.handle === groundCollider.handle) return false;
    return true;
  }

  // Raycast the physics world (ground + scene trimesh + boxes) for the cursor.
  // Rapier's QBVH makes this fast even against a high-poly collider, unlike a
  // brute-force three.js mesh raycast. `excludeBody` skips the held box.
  // Returns { point, normal } (both reused — copy before the next call) or null.
  function castSurfaceRay(origin, dir, maxDist, excludeBody) {
    _ray.origin.x = origin.x;
    _ray.origin.y = origin.y;
    _ray.origin.z = origin.z;
    _ray.dir.x = dir.x;
    _ray.dir.y = dir.y;
    _ray.dir.z = dir.z;
    const hit = world.castRayAndGetNormal(
      _ray,
      maxDist,
      true,
      undefined,
      undefined,
      undefined,
      excludeBody || undefined,
      _surfaceFilter,
    );
    if (!hit) return null;
    const t = hit.timeOfImpact;
    _tmpVec.set(origin.x + dir.x * t, origin.y + dir.y * t, origin.z + dir.z * t);
    _hitNormal.set(hit.normal.x, hit.normal.y, hit.normal.z);
    return { point: _tmpVec, normal: _hitNormal };
  }

  function spawnBox({ position, size = 0.3, color = 0xff88cc }) {
    const half = size / 2;
    const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(position.x, position.y, position.z)
      .setLinearDamping(0.2)
      .setAngularDamping(0.3)
      // CCD so a fast throw doesn't tunnel through the (one-triangle-thin) trimesh
      // floor in a single step. Negligible cost for ~handful of boxes.
      .setCcdEnabled(true);
    const body = world.createRigidBody(bodyDesc);
    world.createCollider(
      // Low restitution so boxes thud rather than ricochet when they hit things.
      RAPIER.ColliderDesc.cuboid(half, half, half).setRestitution(0.1).setFriction(0.8),
      body,
    );

    // MeshBasicMaterial because world.js currently has no lights — Standard/Lambert
    // would render as black. Flat shading reads as cute/cartoon, which fits the vibe.
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(size, size, size),
      new THREE.MeshBasicMaterial({ color }),
    );
    mesh.position.copy(position);
    scene.add(mesh);

    const entry = { mesh, body, size };
    bodies.add(entry);
    return entry;
  }

  function step(dt) {
    world.timestep = Math.min(dt, 1 / 30);
    world.step();
    for (const { mesh, body } of bodies) {
      const t = body.translation();
      const r = body.rotation();
      mesh.position.set(t.x, t.y, t.z);
      mesh.quaternion.set(r.x, r.y, r.z, r.w);
    }
  }

  function setKinematic(entry, kinematic, releaseLinvel, releaseAngvel) {
    if (!entry?.body) return;
    const targetType = kinematic
      ? RAPIER.RigidBodyType.KinematicPositionBased
      : RAPIER.RigidBodyType.Dynamic;
    entry.body.setBodyType(targetType, true);
    if (!kinematic) {
      const v = releaseLinvel || { x: 0, y: 0, z: 0 };
      const w = releaseAngvel || { x: 0, y: 0, z: 0 };
      entry.body.setLinvel({ x: v.x, y: v.y, z: v.z }, true);
      entry.body.setAngvel({ x: w.x, y: w.y, z: w.z }, true);
    }
  }

  function setKinematicPose(entry, worldPos, worldQuat) {
    if (!entry?.body) return;
    entry.body.setNextKinematicTranslation({ x: worldPos.x, y: worldPos.y, z: worldPos.z });
    if (worldQuat) {
      entry.body.setNextKinematicRotation({
        x: worldQuat.x,
        y: worldQuat.y,
        z: worldQuat.z,
        w: worldQuat.w,
      });
    }
  }

  function getEntries() {
    return bodies;
  }

  function findEntryByMesh(mesh) {
    for (const entry of bodies) {
      if (entry.mesh === mesh) return entry;
    }
    return null;
  }

  function clearAll() {
    for (const { mesh, body } of bodies) {
      scene.remove(mesh);
      mesh.geometry.dispose();
      mesh.material.dispose();
      world.removeRigidBody(body);
    }
    bodies.clear();
  }

  // Per-scene trimesh collider (set of meshes from a GLB). Tracked separately
  // from `bodies` so we can swap it on world change without touching spawned boxes.
  let sceneCollider = null; // { body, mesh } | null  (mesh is always present for cursor raycasting; visible only in debug)
  let sceneColliderToken = 0;

  function clearSceneCollider() {
    if (!sceneCollider) return;
    if (sceneCollider.mesh) {
      scene.remove(sceneCollider.mesh);
      sceneCollider.mesh.geometry.dispose();
      sceneCollider.mesh.material.dispose();
    }
    world.removeRigidBody(sceneCollider.body);
    sceneCollider = null;
  }

  // Loads a GLB, bakes every mesh's world transform into a single
  // positions+indices pair, and creates a fixed Rapier trimesh + (optionally)
  // a wireframe overlay for verifying alignment against the splat.
  async function loadSceneCollider(url) {
    const myToken = ++sceneColliderToken;
    clearSceneCollider();
    const gltf = await new GLTFLoader().loadAsync(url);
    if (myToken !== sceneColliderToken) return; // another scene swapped in mid-load

    const positions = [];
    const indices = [];
    gltf.scene.updateMatrixWorld(true);
    const v = new THREE.Vector3();
    gltf.scene.traverse((obj) => {
      if (!obj.isMesh || !obj.geometry) return;
      const geom = obj.geometry;
      const posAttr = geom.getAttribute("position");
      if (!posAttr) return;
      const baseIndex = positions.length / 3;
      for (let i = 0; i < posAttr.count; i++) {
        v.fromBufferAttribute(posAttr, i).applyMatrix4(obj.matrixWorld);
        positions.push(v.x, v.y, v.z);
      }
      if (geom.index) {
        const idx = geom.index.array;
        for (let i = 0; i < idx.length; i++) indices.push(idx[i] + baseIndex);
      } else {
        // Non-indexed: vertices are already in triangle order.
        for (let i = 0; i < posAttr.count; i++) indices.push(i + baseIndex);
      }
    });

    if (positions.length === 0 || indices.length === 0) {
      console.warn("[physics] collider GLB has no mesh geometry:", url);
      return;
    }

    const verts = new Float32Array(positions);
    const tris = new Uint32Array(indices);
    console.log(`[physics] collider loaded: ${tris.length / 3} triangles, ${verts.length / 3} verts`);
    const bodyDesc = RAPIER.RigidBodyDesc.fixed();
    const body = world.createRigidBody(bodyDesc);
    world.createCollider(
      RAPIER.ColliderDesc.trimesh(verts, tris).setFriction(0.7).setRestitution(0.1),
      body,
    );

    // Wireframe overlay only in debug — dragging raycasts the Rapier collider,
    // not this mesh, so it isn't needed for interaction.
    let mesh = null;
    if (SHOW_SCENE_COLLIDER_DEBUG) {
      const meshGeom = new THREE.BufferGeometry();
      meshGeom.setAttribute("position", new THREE.BufferAttribute(verts, 3));
      meshGeom.setIndex(new THREE.BufferAttribute(tris, 1));
      mesh = new THREE.Mesh(
        meshGeom,
        new THREE.MeshBasicMaterial({
          color: 0xff88dd,
          wireframe: true,
          transparent: true,
          opacity: 0.35,
          depthWrite: false,
        }),
      );
      scene.add(mesh);
    }

    sceneCollider = { body, mesh };
  }

  function dispose() {
    clearAll();
    clearSceneCollider();
    if (groundMesh) scene.remove(groundMesh);
    world.free();
  }

  return {
    spawnBox,
    step,
    setKinematic,
    setKinematicPose,
    getEntries,
    findEntryByMesh,
    clearAll,
    loadSceneCollider,
    clearSceneCollider,
    castSurfaceRay,
    dispose,
  };
}
