import { test } from "node:test";
import assert from "node:assert/strict";
import { buildHubPortals, hslToHex } from "../src/data/hubPortals.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const EPSILON = 1e-10;

function approxEqual(a, b, eps = EPSILON) {
  return Math.abs(a - b) <= eps;
}

function assertApprox(a, b, msg, eps = EPSILON) {
  if (!approxEqual(a, b, eps)) {
    assert.fail(`${msg ?? "approxEqual"}: expected ${a} ≈ ${b} (diff ${Math.abs(a - b)})`);
  }
}

function makeTargets(n) {
  return Array.from({ length: n }, (_, i) => ({
    id: `world-${i}`,
    label: `World ${i}`,
    emoji: "🌸",
  }));
}

// ---------------------------------------------------------------------------
// Test 1 — N portals at radius 3 around origin: positions form a circle
// ---------------------------------------------------------------------------

test("N portals at radius 3 around origin — positions form a circle", () => {
  const N = 6;
  const config = {
    center: [0, 0],
    radius: 3,
    height: 1.5,
    portalSize: 1.0,
    targets: makeTargets(N),
  };
  const portals = buildHubPortals(config);

  assert.equal(portals.length, N, "portal count matches targets.length");

  for (const p of portals) {
    const [px, py, pz] = p.position;
    // Distance from center (XZ plane)
    const dist = Math.sqrt(px * px + pz * pz);
    assertApprox(dist, 3, `XZ distance from center should equal radius (got ${dist})`);
    // All at same Y
    assertApprox(py, 1.5, `portal Y should equal height (got ${py})`);
  }
});

// ---------------------------------------------------------------------------
// Test 2 — rotationY math with N=4
// ---------------------------------------------------------------------------

test("rotationY math is correctly α_i for N=4 portals", () => {
  const config = {
    center: [0, 0],
    radius: 3,
    height: 0,
    portalSize: 1,
    startAngle: 0,
    targets: makeTargets(4),
  };
  const portals = buildHubPortals(config);
  const step = (Math.PI * 2) / 4; // π/2

  for (let i = 0; i < 4; i++) {
    const expected = i * step;
    assertApprox(
      portals[i].rotationY,
      expected,
      `portal[${i}].rotationY should be ${expected} (got ${portals[i].rotationY})`
    );
    // Position consistency: px = sin(α), pz = cos(α) at radius 3
    const [px, , pz] = portals[i].position;
    assertApprox(px, 3 * Math.sin(expected), `portal[${i}].position[0] (px)`);
    assertApprox(pz, 3 * Math.cos(expected), `portal[${i}].position[2] (pz)`);
  }
});

// ---------------------------------------------------------------------------
// Test 3 — Per-target color override
// ---------------------------------------------------------------------------

test("colorA override is used as-is; colorB still falls back to generator when only colorA is set", () => {
  const overrideColorA = "#aabbcc";
  const targets = [
    { id: "a", label: "A", emoji: "🌟", colorA: overrideColorA },
    { id: "b", label: "B", emoji: "🌟" }, // no override — reference for comparison
  ];
  const config = {
    center: [0, 0],
    radius: 3,
    height: 1,
    portalSize: 1,
    saturation: 0.78,
    lightnessA: 0.62,
    lightnessB: 0.86,
    hueStart: 0,
    hueDirection: 1,
    targets,
  };
  const portals = buildHubPortals(config);

  // colorA override
  assert.equal(portals[0].render.colorA, overrideColorA, "colorA override should be preserved exactly");

  // colorB should be generated (not the override value)
  const hue0 = 0; // i=0, hueStart=0, n=2 → hue = 0
  const expectedColorB = hslToHex(hue0, 0.78, 0.86);
  assert.equal(portals[0].render.colorB, expectedColorB, "colorB should fall back to generator when only colorA is overridden");
});

test("colorB override is used as-is; colorA still falls back to generator when only colorB is set", () => {
  const overrideColorB = "#112233";
  const targets = [
    { id: "a", label: "A", emoji: "🌟", colorB: overrideColorB },
  ];
  const config = {
    center: [0, 0],
    radius: 3,
    height: 1,
    portalSize: 1,
    saturation: 0.78,
    lightnessA: 0.62,
    lightnessB: 0.86,
    hueStart: 0,
    hueDirection: 1,
    targets,
  };
  const portals = buildHubPortals(config);

  assert.equal(portals[0].render.colorB, overrideColorB, "colorB override should be preserved exactly");
  const expectedColorA = hslToHex(0, 0.78, 0.62);
  assert.equal(portals[0].render.colorA, expectedColorA, "colorA should fall back to generator when only colorB is overridden");
});

test("both colorA and colorB overrides are used as-is", () => {
  const overrideA = "#aabbcc";
  const overrideB = "#112233";
  const targets = [
    { id: "a", label: "A", emoji: "🌟", colorA: overrideA, colorB: overrideB },
  ];
  const config = {
    center: [0, 0], radius: 3, height: 1, portalSize: 1, targets,
  };
  const portals = buildHubPortals(config);
  assert.equal(portals[0].render.colorA, overrideA);
  assert.equal(portals[0].render.colorB, overrideB);
});

// ---------------------------------------------------------------------------
// Test 4 — Hue distribution
// ---------------------------------------------------------------------------

test("default rainbow has evenly-spaced hues across N targets", () => {
  const N = 6;
  const config = {
    center: [0, 0],
    radius: 3,
    height: 1,
    portalSize: 1,
    hueStart: 0,
    hueDirection: 1,
    saturation: 1,
    lightnessA: 0.5,
    lightnessB: 0.7,
    targets: makeTargets(N),
  };
  const portals = buildHubPortals(config);
  const step = 360 / N;
  for (let i = 0; i < N; i++) {
    const expectedHue = (i * step) % 360;
    const expectedColor = hslToHex(expectedHue, 1, 0.5);
    assert.equal(portals[i].render.colorA, expectedColor, `portal[${i}] colorA hue spacing`);
  }
});

test("hueDirection: -1 reverses the hue direction", () => {
  const N = 4;
  const config = {
    center: [0, 0],
    radius: 3,
    height: 1,
    portalSize: 1,
    hueStart: 0,
    hueDirection: -1,
    saturation: 1,
    lightnessA: 0.5,
    lightnessB: 0.7,
    targets: makeTargets(N),
  };
  const portals = buildHubPortals(config);
  const step = 360 / N;
  for (let i = 0; i < N; i++) {
    const expectedHue = (((0 + -1 * i * step) % 360) + 360) % 360;
    const expectedColor = hslToHex(expectedHue, 1, 0.5);
    assert.equal(portals[i].render.colorA, expectedColor, `portal[${i}] colorA with hueDirection:-1`);
  }
});

test("hueStart: 180 shifts the starting hue", () => {
  const N = 4;
  const config = {
    center: [0, 0],
    radius: 3,
    height: 1,
    portalSize: 1,
    hueStart: 180,
    hueDirection: 1,
    saturation: 1,
    lightnessA: 0.5,
    lightnessB: 0.7,
    targets: makeTargets(N),
  };
  const portals = buildHubPortals(config);
  const step = 360 / N;
  for (let i = 0; i < N; i++) {
    const expectedHue = (180 + i * step) % 360;
    const expectedColor = hslToHex(expectedHue, 1, 0.5);
    assert.equal(portals[i].render.colorA, expectedColor, `portal[${i}] colorA with hueStart:180`);
  }
});

// ---------------------------------------------------------------------------
// Test 5 — portalSize → circle (render.radius === portalSize / 2)
// ---------------------------------------------------------------------------

test("render.radius === portalSize / 2 (true circle SDF)", () => {
  for (const size of [1.0, 0.5, 2.4, 0.1]) {
    const config = {
      center: [0, 0],
      radius: 3,
      height: 1,
      portalSize: size,
      targets: makeTargets(1),
    };
    const portals = buildHubPortals(config);
    assert.equal(portals[0].render.radius, size / 2, `portalSize ${size}: render.radius should be ${size / 2}`);
    assert.equal(portals[0].render.width, size, `portalSize ${size}: render.width should equal portalSize`);
    assert.equal(portals[0].render.height, size, `portalSize ${size}: render.height should equal portalSize`);
  }
});

// ---------------------------------------------------------------------------
// Test 6 — hslToHex correctness
// ---------------------------------------------------------------------------

test("hslToHex(0, 1, 0.5) → red #ff0000", () => {
  assert.equal(hslToHex(0, 1, 0.5), "#ff0000");
});

test("hslToHex(120, 1, 0.5) → green #00ff00", () => {
  assert.equal(hslToHex(120, 1, 0.5), "#00ff00");
});

test("hslToHex(240, 1, 0.5) → blue #0000ff", () => {
  assert.equal(hslToHex(240, 1, 0.5), "#0000ff");
});

test("hslToHex(0, 0, 0.5) → medium gray #808080", () => {
  assert.equal(hslToHex(0, 0, 0.5), "#808080");
});

test("hslToHex — negative hue wraps correctly (hue=-120 → same as hue=240 → blue)", () => {
  assert.equal(hslToHex(-120, 1, 0.5), "#0000ff");
});

test("hslToHex — hue > 360 wraps correctly (hue=480 → same as hue=120 → green)", () => {
  assert.equal(hslToHex(480, 1, 0.5), "#00ff00");
});

test("hslToHex — s > 1 is clamped (saturation=2 → treated as 1)", () => {
  const clampedResult = hslToHex(0, 1, 0.5);
  const overResult = hslToHex(0, 2, 0.5);
  assert.equal(overResult, clampedResult, "saturation > 1 should be clamped to 1");
});

test("hslToHex — l > 1 is clamped (lightness=2 → treated as 1, white)", () => {
  assert.equal(hslToHex(0, 1, 2), "#ffffff", "lightness > 1 should be clamped to 1 (white)");
});

test("hslToHex — l=0 → black regardless of hue/sat", () => {
  assert.equal(hslToHex(120, 1, 0), "#000000");
});

test("hslToHex — l=1 → white regardless of hue/sat", () => {
  assert.equal(hslToHex(120, 1, 1), "#ffffff");
});

// ---------------------------------------------------------------------------
// Test 7 — Empty targets
// ---------------------------------------------------------------------------

test("empty targets array returns [] without crashing", () => {
  const config = {
    center: [0, 0],
    radius: 3,
    height: 1,
    portalSize: 1,
    targets: [],
  };
  const portals = buildHubPortals(config);
  assert.deepEqual(portals, [], "empty targets should return empty array");
});

// ---------------------------------------------------------------------------
// Test 8 — Custom startAngle
// ---------------------------------------------------------------------------

test("custom startAngle offsets all rotationY values", () => {
  const N = 4;
  const startAngle = Math.PI / 4; // 45 degrees
  const config = {
    center: [0, 0],
    radius: 3,
    height: 1,
    portalSize: 1,
    startAngle,
    targets: makeTargets(N),
  };
  const portals = buildHubPortals(config);
  const step = (Math.PI * 2) / N;

  for (let i = 0; i < N; i++) {
    const expectedAlpha = startAngle + i * step;
    assertApprox(
      portals[i].rotationY,
      expectedAlpha,
      `portal[${i}].rotationY with startAngle=π/4`
    );
    // Positions should also reflect the offset angle
    const [px, , pz] = portals[i].position;
    assertApprox(px, 3 * Math.sin(expectedAlpha), `portal[${i}] px with startAngle=π/4`);
    assertApprox(pz, 3 * Math.cos(expectedAlpha), `portal[${i}] pz with startAngle=π/4`);
  }
});

test("startAngle=0 and startAngle=2π produce same rotationY values (mod 2π)", () => {
  const N = 3;
  const config0 = {
    center: [0, 0], radius: 3, height: 1, portalSize: 1,
    startAngle: 0, targets: makeTargets(N),
  };
  const config2pi = {
    center: [0, 0], radius: 3, height: 1, portalSize: 1,
    startAngle: Math.PI * 2, targets: makeTargets(N),
  };
  const portals0 = buildHubPortals(config0);
  const portals2pi = buildHubPortals(config2pi);

  for (let i = 0; i < N; i++) {
    // rotationY differs by exactly 2π between the two — sin/cos are the same
    const diffMod2pi = (portals2pi[i].rotationY - portals0[i].rotationY) % (Math.PI * 2);
    assertApprox(Math.abs(diffMod2pi), 0, `portal[${i}] rotationY mod 2π should match`, 1e-9);
    // Positions should be identical
    for (let axis = 0; axis < 3; axis++) {
      assertApprox(
        portals0[i].position[axis],
        portals2pi[i].position[axis],
        `portal[${i}] position[${axis}] should be same for startAngle=0 vs 2π`
      );
    }
  }
});

// ---------------------------------------------------------------------------
// Test — id and target fields
// ---------------------------------------------------------------------------

test("portal id is hub-to-<target.id> and target field is target.id", () => {
  const targets = [
    { id: "forest", label: "Forest", emoji: "🌲" },
    { id: "ocean", label: "Ocean", emoji: "🌊" },
  ];
  const config = {
    center: [0, 0], radius: 3, height: 1, portalSize: 1, targets,
  };
  const portals = buildHubPortals(config);
  assert.equal(portals[0].id, "hub-to-forest");
  assert.equal(portals[0].target, "forest");
  assert.equal(portals[1].id, "hub-to-ocean");
  assert.equal(portals[1].target, "ocean");
});

test("loaderText and emoji are passed through from target", () => {
  const targets = [
    { id: "x", label: "My Label", emoji: "🦋" },
  ];
  const config = {
    center: [0, 0], radius: 3, height: 1, portalSize: 1, targets,
  };
  const portals = buildHubPortals(config);
  assert.equal(portals[0].loaderText, "My Label");
  assert.equal(portals[0].emoji, "🦋");
});

// ---------------------------------------------------------------------------
// Test — non-origin center
// ---------------------------------------------------------------------------

test("non-origin center shifts all positions correctly", () => {
  const cx = 5, cz = -3;
  const radius = 2;
  const N = 3;
  const config = {
    center: [cx, cz],
    radius,
    height: 1,
    portalSize: 1,
    startAngle: 0,
    targets: makeTargets(N),
  };
  const portals = buildHubPortals(config);
  const step = (Math.PI * 2) / N;

  for (let i = 0; i < N; i++) {
    const alpha = i * step;
    const [px, , pz] = portals[i].position;
    assertApprox(px, cx + radius * Math.sin(alpha), `portal[${i}] px with center offset`);
    assertApprox(pz, cz + radius * Math.cos(alpha), `portal[${i}] pz with center offset`);
  }
});
