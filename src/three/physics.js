import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import RAPIER from "@dimforge/rapier3d-compat";

const GRAVITY = { x: 0, y: -9.81, z: 0 };
const GROUND_HALF_EXTENTS = { x: 100, y: 0.1, z: 100 };
const GROUND_Y = -0.1;
const SHOW_GROUND_DEBUG = false;
// Per-scene collider meshes load as Rapier trimesh + a translucent wireframe so
// alignment vs. the splat can be eyeballed. Toggled at runtime via
// localStorage.setItem("fairy-worlds-debug-collider", "1") then reload — flip
// it on when a collider GLB looks misaligned, off otherwise (the wireframe
// raster cost is real for high-poly colliders).
const SHOW_SCENE_COLLIDER_DEBUG =
  typeof localStorage !== "undefined" &&
  localStorage.getItem("fairy-worlds-debug-collider") === "1";

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
      .setLinearDamping(0.6)
      .setAngularDamping(2.0)
      // CCD so a fast throw doesn't tunnel through the (one-triangle-thin) trimesh
      // floor in a single step. Negligible cost for ~handful of boxes.
      .setCcdEnabled(true);
    const body = world.createRigidBody(bodyDesc);
    world.createCollider(
      // Zero restitution → no bounce; high friction + angular damping so a tilted
      // landing thuds and settles instead of rolling.
      RAPIER.ColliderDesc.cuboid(half, half, half).setRestitution(0.0).setFriction(0.6),
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

  // Drops a GLB at `position`. Builds a convex hull from the union of every
  // mesh's vertices (after applying each mesh's local-to-root transform) so
  // the physics shape matches the visible model — a daisy lands flat, a CRT
  // monitor lands on its corners. Falls back to a bounding-box cuboid if the
  // hull build fails (degenerate or near-coplanar vertices).
  //
  // `targetSize` (if set) overrides `scale` — every loaded GLB is rescaled so
  // its longest bounding-box dimension equals targetSize. This is the standard
  // way to get a consistent in-world size across heterogeneous source GLBs
  // (CRT monitor vs daisy come from different authoring scales).
  //
  // entry.size is set to the FINAL bounding-box max dimension (post-scale) so
  // grab.js's floor-clamp + spawn-distance math still works on non-cube shapes.
  async function spawnObject({ url, position, scale = 1, targetSize = null }) {
    const gltf = await new GLTFLoader().loadAsync(url);
    const root = gltf.scene;

    // First pass at scale=1 to measure the natural bbox, then either pin to
    // targetSize or use the caller-supplied scale.
    root.scale.setScalar(1);
    root.updateMatrixWorld(true);
    const naturalBox = new THREE.Box3().setFromObject(root);
    const naturalSize = new THREE.Vector3();
    naturalBox.getSize(naturalSize);
    const naturalMaxDim = Math.max(naturalSize.x, naturalSize.y, naturalSize.z);
    const finalScale =
      targetSize && naturalMaxDim > 1e-6 ? targetSize / naturalMaxDim : scale;
    root.scale.setScalar(finalScale);
    root.updateMatrixWorld(true);

    // Collect vertices in a frame that matches how three.js will render them.
    // At render time the visual mesh is anchored at body.translation with
    // body.rotation, and three.js multiplies by root.scale (= finalScale) when
    // computing matrixWorld. So the body-local frame the collider lives in
    // must ALSO include finalScale — otherwise hull vertices are at scale=1
    // while the visual is at scale=finalScale, and the collider rests on the
    // floor while the visual floats above it.
    //
    // root has no parent at this point, so root.matrixWorld is just a scale
    // matrix. obj.matrixWorld = root.matrixWorld * obj.localChain, which
    // already includes the scale. Just use obj.matrixWorld directly — no
    // rootInv multiply (the old code cancelled the scale).
    //
    // SkinnedMesh skinning is skipped (bind-pose vertices only), same reason
    // as the portal bbox logic in world.js.
    const verts = [];
    const v = new THREE.Vector3();
    const bbox = new THREE.Box3();
    root.traverse((obj) => {
      if (!obj.isMesh && !obj.isSkinnedMesh) return;
      const geom = obj.geometry;
      const posAttr = geom?.getAttribute("position");
      if (!posAttr) return;
      for (let i = 0; i < posAttr.count; i++) {
        v.fromBufferAttribute(posAttr, i).applyMatrix4(obj.matrixWorld);
        verts.push(v.x, v.y, v.z);
        bbox.expandByPoint(v);
      }
    });

    if (verts.length === 0) {
      console.warn("[physics] object GLB has no mesh geometry:", url);
      return null;
    }

    const size = new THREE.Vector3();
    bbox.getSize(size);
    const center = new THREE.Vector3();
    bbox.getCenter(center);
    const maxDim = Math.max(size.x, size.y, size.z);

    const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(position.x, position.y, position.z)
      .setLinearDamping(0.6)
      .setAngularDamping(2.0)
      .setCcdEnabled(true);
    const body = world.createRigidBody(bodyDesc);

    // Try convex hull first; fall back to a cuboid the size of the bounding box.
    let colliderDesc = RAPIER.ColliderDesc.convexHull(new Float32Array(verts));
    if (!colliderDesc) {
      console.warn(`[physics] convex hull failed for ${url}, using bbox cuboid`);
      colliderDesc = RAPIER.ColliderDesc.cuboid(size.x * 0.5, size.y * 0.5, size.z * 0.5)
        .setTranslation(center.x, center.y, center.z);
    }
    // Zero restitution + high friction + high angular damping → tilted landings
    // thud onto the surface and settle instead of bouncing + rolling off.
    world.createCollider(colliderDesc.setRestitution(0.0).setFriction(0.6), body);

    scene.add(root);
    root.position.copy(position);

    const entry = { mesh: root, body, size: maxDim };
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

  // Instant rotation snap — bypasses the kinematic next-step queue. Used by
  // grab on a no-throw release to reset the body's tilt to its pre-grab
  // orientation before flipping back to Dynamic, so it lands flat instead of
  // perched on the corner that the hang-from-grab tilt left it on.
  function snapRotation(entry, quat) {
    if (!entry?.body || !quat) return;
    entry.body.setRotation({ x: quat.x, y: quat.y, z: quat.z, w: quat.w }, true);
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
      // Primitive boxes are a Mesh; GLB objects are a Group with descendant
      // meshes. Traverse covers both — Mesh.traverse visits itself.
      mesh.traverse?.((obj) => {
        if (obj.isMesh || obj.isSkinnedMesh) {
          obj.geometry?.dispose?.();
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          for (const m of mats) {
            m?.map?.dispose?.();
            m?.dispose?.();
          }
        }
      });
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
  //
  // Optional `opts`:
  //   - offset:   [x, y, z] applied to every vertex after baking GLB
  //               transforms. Use to manually correct a known shift.
  //   - autoAlignFloorY: if a number, shifts the whole collider so its lowest
  //               vertex Y matches this value. Used to snap Marble exports
  //               (which sometimes pick up a baked Y offset) to the splat's
  //               floor — pass (spawn.y − eyeHeight) from the scene def.
  //               Applied BEFORE `offset`, so offset still works as a fine-tune.
  async function loadSceneCollider(url, opts = {}) {
    const myToken = ++sceneColliderToken;
    clearSceneCollider();
    const gltf = await new GLTFLoader().loadAsync(url);
    if (myToken !== sceneColliderToken) return; // another scene swapped in mid-load

    const positions = [];
    const indices = [];
    gltf.scene.updateMatrixWorld(true);
    const v = new THREE.Vector3();
    let minY = Infinity;
    gltf.scene.traverse((obj) => {
      if (!obj.isMesh || !obj.geometry) return;
      const geom = obj.geometry;
      const posAttr = geom.getAttribute("position");
      if (!posAttr) return;
      const baseIndex = positions.length / 3;
      for (let i = 0; i < posAttr.count; i++) {
        v.fromBufferAttribute(posAttr, i).applyMatrix4(obj.matrixWorld);
        positions.push(v.x, v.y, v.z);
        if (v.y < minY) minY = v.y;
      }
      if (geom.index) {
        const idx = geom.index.array;
        for (let i = 0; i < idx.length; i++) indices.push(idx[i] + baseIndex);
      } else {
        // Non-indexed: vertices are already in triangle order.
        for (let i = 0; i < posAttr.count; i++) indices.push(i + baseIndex);
      }
    });

    // Apply auto-align floor (snap lowest Y to the target) and then any manual
    // offset, both as a single Y shift + xyz shift over positions in-place.
    const autoShiftY =
      typeof opts.autoAlignFloorY === "number" && isFinite(minY)
        ? opts.autoAlignFloorY - minY
        : 0;
    const ox = opts.offset?.[0] ?? 0;
    const oy = (opts.offset?.[1] ?? 0) + autoShiftY;
    const oz = opts.offset?.[2] ?? 0;
    if (ox || oy || oz) {
      for (let i = 0; i < positions.length; i += 3) {
        positions[i] += ox;
        positions[i + 1] += oy;
        positions[i + 2] += oz;
      }
    }

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
    spawnObject,
    step,
    setKinematic,
    setKinematicPose,
    snapRotation,
    getEntries,
    findEntryByMesh,
    clearAll,
    loadSceneCollider,
    clearSceneCollider,
    castSurfaceRay,
    dispose,
  };
}
