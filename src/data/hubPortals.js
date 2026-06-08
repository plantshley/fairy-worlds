// Builds the portals[] array for a hub scene from a single high-level config.
// Each portal is a "doorway" kind (true circle: width = height = portalSize,
// radius = portalSize / 2) arranged on a ring around `center` at `height`,
// facing inward toward the center. Colors auto-distributed around the hue
// wheel; per-target colorA/colorB overrides skip the generator for that slot.
//
// Rotation math: the outward direction from center to portal at angle α is
// (sin α, 0, cos α). To make the portal face inward, its local -Z must point
// inward (-sin α, 0, -cos α). Rotating (0,0,-1) by yaw θ around +Y gives
// (-sin θ, 0, -cos θ). Therefore θ = α.

export function buildHubPortals({
  center,
  radius,
  height,
  portalSize,
  startAngle = 0,
  hueStart = 0,
  hueDirection = 1,
  saturation = 0.78,
  lightnessA = 0.62,
  lightnessB = 0.86,
  targets,
}) {
  const [cx, cz] = center;
  const n = targets.length;
  const portals = new Array(n);
  const TWO_PI = Math.PI * 2;
  for (let i = 0; i < n; i++) {
    const t = targets[i];
    const alpha = startAngle + (i * TWO_PI) / n;
    // Canonicalize to [0, 2π) so equivalent startAngles (e.g. 0 vs 2π) emit
    // bit-identical rotation values — purely cosmetic for three.js but keeps
    // serialized output stable.
    const rotationY = ((alpha % TWO_PI) + TWO_PI) % TWO_PI;
    const hue = (((hueStart + hueDirection * i * (360 / n)) % 360) + 360) % 360;
    portals[i] = {
      id: `hub-to-${t.id}`,
      target: t.id,
      position: [cx + radius * Math.sin(alpha), height, cz + radius * Math.cos(alpha)],
      rotationY,
      loaderText: t.label,
      emoji: t.emoji,
      render: {
        kind: "doorway",
        width: portalSize,
        height: portalSize,
        radius: portalSize / 2,
        colorA: t.colorA ?? hslToHex(hue, saturation, lightnessA),
        colorB: t.colorB ?? hslToHex(hue, saturation, lightnessB),
      },
    };
  }
  return portals;
}

// Standard HSL→RGB conversion, output as "#rrggbb". Kept dependency-free so
// this module doesn't pull in three.js just for color math.
export function hslToHex(h, s, l) {
  const hue = ((h % 360) + 360) % 360 / 360;
  const sat = Math.max(0, Math.min(1, s));
  const lit = Math.max(0, Math.min(1, l));
  let r, g, b;
  if (sat === 0) {
    r = g = b = lit;
  } else {
    const q = lit < 0.5 ? lit * (1 + sat) : lit + sat - lit * sat;
    const p = 2 * lit - q;
    r = hueToRgb(p, q, hue + 1 / 3);
    g = hueToRgb(p, q, hue);
    b = hueToRgb(p, q, hue - 1 / 3);
  }
  return "#" + toHex(r) + toHex(g) + toHex(b);
}

function hueToRgb(p, q, t) {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}

function toHex(v) {
  const n = Math.round(Math.max(0, Math.min(1, v)) * 255);
  return n.toString(16).padStart(2, "0");
}
