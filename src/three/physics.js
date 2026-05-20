import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";

const GRAVITY = { x: 0, y: -9.81, z: 0 };
const GROUND_HALF_EXTENTS = { x: 100, y: 0.1, z: 100 };
const GROUND_Y = -0.1;
const SHOW_GROUND_DEBUG = false;

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

  const groundBodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(0, GROUND_Y, 0);
  const groundBody = world.createRigidBody(groundBodyDesc);
  world.createCollider(
    RAPIER.ColliderDesc.cuboid(GROUND_HALF_EXTENTS.x, GROUND_HALF_EXTENTS.y, GROUND_HALF_EXTENTS.z),
    groundBody,
  );

  let groundMesh = null;
  if (SHOW_GROUND_DEBUG) {
    groundMesh = new THREE.GridHelper(20, 20, 0xff88dd, 0xaa66cc);
    groundMesh.position.y = 0;
    scene.add(groundMesh);
  }

  function spawnBox({ position, size = 0.3, color = 0xff88cc }) {
    const half = size / 2;
    const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(position.x, position.y, position.z)
      .setLinearDamping(0.1)
      .setAngularDamping(0.2);
    const body = world.createRigidBody(bodyDesc);
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(half, half, half).setRestitution(0.3).setFriction(0.7),
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

  function setKinematic(entry, kinematic, releaseLinvel) {
    if (!entry?.body) return;
    const targetType = kinematic
      ? RAPIER.RigidBodyType.KinematicPositionBased
      : RAPIER.RigidBodyType.Dynamic;
    entry.body.setBodyType(targetType, true);
    if (!kinematic) {
      const v = releaseLinvel || { x: 0, y: 0, z: 0 };
      entry.body.setLinvel({ x: v.x, y: v.y, z: v.z }, true);
      entry.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
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

  function dispose() {
    clearAll();
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
    dispose,
  };
}
