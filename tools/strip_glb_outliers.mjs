// Strip far-flung stray geometry from a GLB and re-pack it.
//
// Some FBX->GLB exports (e.g. props/ac-house-notreefence.glb) carry leftover
// meshes — a "tree fence", terrain scraps — scattered several units away from
// the actual model. They bloat the file, render as distant cruft, and balloon
// the click-proxy box (see computeProxyBox in src/modes/world.js).
//
// This finds every mesh node's world-space center, rejects the ones that sit
// far from the median cluster (first >5x jump in distance), disposes those
// subtrees, then prunes now-orphaned meshes/accessors/materials/textures so the
// binary buffer actually shrinks.
//
// Deps are not in package.json (one-off tool). Install first:
//   npm install --no-save @gltf-transform/core @gltf-transform/functions
// Run:
//   node tools/strip_glb_outliers.mjs <in.glb> [out.glb]   (defaults out = in)
import { NodeIO } from "@gltf-transform/core";
import { prune, dedup } from "@gltf-transform/functions";

// column-major 4x4 multiply (a * b), matching glTF node.matrix layout.
function mul(a, b) {
  const o = new Array(16).fill(0);
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++)
      for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
  return o;
}
function apply(m, [x, y, z]) {
  return [
    m[0] * x + m[4] * y + m[8] * z + m[12],
    m[1] * x + m[5] * y + m[9] * z + m[13],
    m[2] * x + m[6] * y + m[10] * z + m[14],
  ];
}

const [, , inPath, outPath = inPath] = process.argv;
if (!inPath) {
  console.error("usage: node tools/strip_glb_outliers.mjs <in.glb> [out.glb]");
  process.exit(1);
}

const io = new NodeIO();
const doc = await io.read(inPath);
const root = doc.getRoot();

// 1. World center of every mesh-bearing node.
const meshNodes = []; // { node, center:[x,y,z] }
function visit(node, parentM) {
  const m = mul(parentM, node.getMatrix());
  const mesh = node.getMesh();
  if (mesh) {
    let mn = [Infinity, Infinity, Infinity];
    let mx = [-Infinity, -Infinity, -Infinity];
    let has = false;
    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute("POSITION");
      if (!pos) continue;
      const lo = pos.getMin([]);
      const hi = pos.getMax([]);
      for (let cx = 0; cx < 2; cx++)
        for (let cy = 0; cy < 2; cy++)
          for (let cz = 0; cz < 2; cz++) {
            const w = apply(m, [cx ? hi[0] : lo[0], cy ? hi[1] : lo[1], cz ? hi[2] : lo[2]]);
            for (let i = 0; i < 3; i++) {
              mn[i] = Math.min(mn[i], w[i]);
              mx[i] = Math.max(mx[i], w[i]);
            }
            has = true;
          }
    }
    if (has) meshNodes.push({ node, center: [(mn[0] + mx[0]) / 2, (mn[1] + mx[1]) / 2, (mn[2] + mx[2]) / 2] });
  }
  for (const child of node.listChildren()) visit(child, m);
}
const I = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
for (const scene of root.listScenes()) for (const n of scene.listChildren()) visit(n, I);

// 2. Gap-detect the inlier cluster (same rule as computeProxyBox in world.js).
const med = [0, 1, 2].map((i) => {
  const s = meshNodes.map((t) => t.center[i]).sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
});
for (const t of meshNodes)
  t.d = Math.hypot(t.center[0] - med[0], t.center[1] - med[1], t.center[2] - med[2]);
const sorted = [...meshNodes].sort((a, b) => a.d - b.d);
let cutDist = Infinity;
for (let i = 0; i < sorted.length - 1; i++) {
  if (sorted[i].d > 1e-4 && sorted[i + 1].d / sorted[i].d > 5) {
    cutDist = sorted[i + 1].d;
    break;
  }
}
const keep = new Set(meshNodes.filter((t) => t.d < cutDist).map((t) => t.node));
console.log(`mesh nodes: ${meshNodes.length}  keep: ${keep.size}  drop: ${meshNodes.length - keep.size}  (cut at dist ${cutDist === Infinity ? "n/a" : cutDist.toFixed(3)})`);
if (keep.size === meshNodes.length) {
  console.log("no outliers detected — nothing to strip.");
  process.exit(0);
}

// 3. Dispose every subtree that contains no kept mesh node.
function subtreeHasKeep(node) {
  if (keep.has(node)) return true;
  for (const c of node.listChildren()) if (subtreeHasKeep(c)) return true;
  return false;
}
function disposeSubtree(node) {
  for (const c of node.listChildren()) disposeSubtree(c);
  node.dispose();
}
function walk(node) {
  for (const c of node.listChildren()) {
    if (subtreeHasKeep(c)) walk(c);
    else disposeSubtree(c);
  }
}
for (const scene of root.listScenes()) {
  for (const c of scene.listChildren()) {
    if (subtreeHasKeep(c)) walk(c);
    else disposeSubtree(c);
  }
}

// 4. Drop orphaned meshes/accessors/materials/textures, then re-pack.
await doc.transform(prune(), dedup());
await io.write(outPath, doc);
console.log(`wrote ${outPath}`);
