import * as THREE from "three";

// shared anchor Y values so every part lines up instead of floating to its own Y
const ANCHORS = {
  floor: 0,
  ankle: 0.04,
  knee: 0.30,
  hip: 0.60,
  waist: 0.62,
  chest: 0.82,
  shoulder: 0.88,
  neck: 0.94,
  headCenter: 1.14,
  headTop: 1.36,
};

const BODY = {
  torsoRadius: 0.15,
  torsoHeight: ANCHORS.chest - ANCHORS.waist + 0.06,
  hipHalfWidth: 0.09,
  shoulderHalfWidth: 0.22,
  legRadius: 0.065,
  armRadius: 0.055,
  armLength: 0.42,
  headRadius: 0.22,
};

const ACCESSORY_DEFS = [
  { id: "bow", label: "bow", defaultColor: "#ff008c" },
  { id: "halo", label: "halo", defaultColor: "#fff1a8" },
  { id: "horns", label: "horns", defaultColor: "#2a1830" },
  { id: "ears", label: "cat ears", defaultColor: "#ffb0de" },
  { id: "lashes", label: "lashes", defaultColor: "#591246" },
  { id: "mustache", label: "mustache", defaultColor: "#2a1830" },
  { id: "star", label: "star", defaultColor: "#fff6e8" },
];

const DEFAULTS = {
  colors: {
    skin: "#936a4e",
    hair: "#ea1dc8",
    shirt: "#ff59b4",
    bottom: "#ff008c",
    wings: "#ff0044",
    eyes: "#901685",
    blush: "#dc2c7b",
    shoes: "#ff0044",
  },
  variants: {
    hair: "bob",
    bottom: "skirt",
    wings: "bat",
  },
  accessories: {
    bow: true,
    halo: false,
    horns: false,
    ears: false,
    lashes: true,
    mustache: false,
    star: false,
  },
  accessoryColors: Object.fromEntries(
    ACCESSORY_DEFS.map((a) => [a.id, a.defaultColor]),
  ),
};

function softMat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    roughness: opts.roughness ?? 0.85,
    metalness: 0,
    transparent: opts.transparent ?? false,
    opacity: opts.opacity ?? 1,
    side: opts.side ?? THREE.FrontSide,
    emissive: opts.emissive ?? 0x000000,
    emissiveIntensity: opts.emissiveIntensity ?? 0,
  });
}

function darkerShade(hex, factor = 0.55) {
  const c = new THREE.Color(hex);
  c.multiplyScalar(factor);
  return c;
}

function makeBody(skinMat) {
  const group = new THREE.Group();

  // torso: capsule from waist up to shoulder
  const torso = new THREE.Mesh(
    new THREE.CapsuleGeometry(BODY.torsoRadius, BODY.torsoHeight, 10, 20),
    skinMat,
  );
  torso.position.y = (ANCHORS.waist + ANCHORS.shoulder) / 2;
  group.add(torso);

  // neck
  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.065, 0.08, ANCHORS.headCenter - ANCHORS.shoulder - 0.12, 16),
    skinMat,
  );
  neck.position.y = (ANCHORS.shoulder + ANCHORS.neck) / 2 + 0.01;
  group.add(neck);

  // hip bridge so skirt/pants anchor cleanly
  const hip = new THREE.Mesh(
    new THREE.SphereGeometry(BODY.torsoRadius * 0.95, 16, 12),
    skinMat,
  );
  hip.position.y = ANCHORS.hip;
  hip.scale.set(1.15, 0.7, 1);
  group.add(hip);

  return group;
}

function makeLegs(skinMat, shoesMat) {
  const group = new THREE.Group();
  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(
      new THREE.CapsuleGeometry(BODY.legRadius, ANCHORS.hip - ANCHORS.ankle - 0.05, 8, 16),
      skinMat,
    );
    leg.position.set(side * BODY.hipHalfWidth, (ANCHORS.hip + ANCHORS.ankle) / 2, 0);
    group.add(leg);

    const foot = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 16, 12),
      shoesMat,
    );
    foot.position.set(side * BODY.hipHalfWidth, ANCHORS.floor + 0.03, 0.04);
    foot.scale.set(0.95, 0.5, 1.4);
    group.add(foot);
  }
  return group;
}

function makeArms(skinMat) {
  const group = new THREE.Group();
  for (const side of [-1, 1]) {
    const arm = new THREE.Group();
    const armMesh = new THREE.Mesh(
      new THREE.CapsuleGeometry(BODY.armRadius, BODY.armLength - 2 * BODY.armRadius, 8, 16),
      skinMat,
    );
    armMesh.position.y = -BODY.armLength / 2;
    arm.add(armMesh);

    const hand = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 16, 12),
      skinMat,
    );
    hand.position.y = -BODY.armLength;
    hand.scale.set(1, 0.9, 0.9);
    arm.add(hand);

    arm.position.set(side * BODY.shoulderHalfWidth * 0.82, ANCHORS.shoulder, 0);
    arm.rotation.z = side * 0.22; // slight outward flare
    group.add(arm);
  }
  return group;
}

function makeHead(skinMat, blushMat) {
  const group = new THREE.Group();
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(BODY.headRadius, 32, 24),
    skinMat,
  );
  head.position.y = ANCHORS.headCenter;
  group.add(head);

  const cheekOffsetY = -0.075;
  const cheekOffsetX = 0.12;
  for (const side of [-1, 1]) {
    const yLocal = cheekOffsetY;
    const xLocal = side * cheekOffsetX;
    const zLocal = Math.sqrt(
      Math.max(0, BODY.headRadius * BODY.headRadius - yLocal * yLocal - xLocal * xLocal),
    );
    const pivot = new THREE.Group();
    pivot.position.set(0, ANCHORS.headCenter, 0);
    const normal = new THREE.Vector3(xLocal, yLocal, zLocal).normalize();
    pivot.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);

    const cheek = new THREE.Mesh(new THREE.CircleGeometry(0.042, 24), blushMat);
    cheek.position.z = BODY.headRadius + 0.0005;
    cheek.renderOrder = -1;
    pivot.add(cheek);
    group.add(pivot);
  }
  return group;
}

function makeEyes(irisMat, pupilMat) {
  const group = new THREE.Group();
  const whiteMat = new THREE.MeshBasicMaterial({ color: 0xfde8dc });
  const highlightMat = new THREE.MeshBasicMaterial({ color: 0xfff8f0 });

  const eyeX = 0.085;
  const eyeY = -0.02;
  const zStep = 0.0015;
  for (const side of [-1, 1]) {
    const xLocal = side * eyeX;
    const yLocal = eyeY;
    const zLocal = Math.sqrt(
      Math.max(0, BODY.headRadius * BODY.headRadius - yLocal * yLocal - xLocal * xLocal),
    );
    const pivot = new THREE.Group();
    pivot.position.set(0, ANCHORS.headCenter, 0);
    const normal = new THREE.Vector3(xLocal, yLocal, zLocal).normalize();
    pivot.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
    pivot.name = `eye-pivot-${side < 0 ? "L" : "R"}`;

    const eye = new THREE.Group();
    eye.position.z = BODY.headRadius + 0.0005;

    const sclera = new THREE.Mesh(new THREE.CircleGeometry(0.04, 24), whiteMat);
    sclera.scale.set(1.25, 1, 1.25);
    eye.add(sclera);

    const iris = new THREE.Mesh(new THREE.CircleGeometry(0.032, 20), irisMat);
    iris.position.set(0, 0, zStep);
    iris.scale.set(1.25, 1.25, 1.25);
    eye.add(iris);

    const pupil = new THREE.Mesh(new THREE.CircleGeometry(0.016, 16), pupilMat);
    pupil.position.set(0, 0, 2 * zStep);
    pupil.scale.set(1.7, 1.7, 1);
    eye.add(pupil);

    // bigger primary sparkle + secondary smaller sparkle for a glossier look
    const hi = new THREE.Mesh(new THREE.CircleGeometry(0.011, 14), highlightMat);
    hi.position.set(side * -0.01, 0.014, 3 * zStep);
    eye.add(hi);
    const hi2 = new THREE.Mesh(new THREE.CircleGeometry(0.006, 12), highlightMat);
    hi2.position.set(side * 0.012, -0.008, 3 * zStep);
    eye.add(hi2);
    const hi3 = new THREE.Mesh(new THREE.CircleGeometry(0.003, 10), highlightMat);
    hi3.position.set(side * -0.02, -0.015, 3 * zStep);
    eye.add(hi3);

    eye.rotation.z = side * -0.12;
    pivot.add(eye);
    group.add(pivot);
  }
  return group;
}

function makeHairVariant(id, material) {
  const group = new THREE.Group();
  const r = BODY.headRadius + 0.012;
  const capY = ANCHORS.headCenter;
  const capPhi = Math.PI * 0.45;

  const bobShell = (wrapForward = Math.PI * 0.15, backDrop = Math.PI * 0.5) => {
    const shell = new THREE.Group();
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(r, 28, 22, 0, Math.PI * 2, 0, capPhi),
      material,
    );
    cap.position.y = capY;
    shell.add(cap);
    const thetaLen = Math.PI + wrapForward * 2;
    const back = new THREE.Mesh(
      new THREE.SphereGeometry(r, 32, 22, 0, thetaLen, capPhi, backDrop),
      material,
    );
    back.position.y = capY;
    back.rotation.y = Math.PI - wrapForward;
    shell.add(back);
    return shell;
  };

  if (id === "bob") {
    group.add(bobShell(Math.PI * 0.18, Math.PI * 0.5));
  } else if (id === "long") {
    group.add(bobShell(Math.PI * 0.2, Math.PI * 0.2));
    const capEdgeRadius = r * Math.sin(capPhi) - 0.0001;
    const capBottomY = capY + r * Math.cos(capPhi);
    const backTopY = capBottomY;
    const backBottomY = ANCHORS.waist + 0.02;
    const backH = backTopY - backBottomY;
    const back = new THREE.Mesh(
      new THREE.CylinderGeometry(
        capEdgeRadius,
        BODY.torsoRadius + 0.02,
        backH,
        28,
        1,
        true,
        Math.PI * 0.5,
        Math.PI,
      ),
      material,
    );
    back.material.side = THREE.DoubleSide;
    back.position.set(0, (backTopY + backBottomY) / 2, 0);
    group.add(back);
    const tip = new THREE.Mesh(
      new THREE.SphereGeometry(BODY.torsoRadius + 0.02, 20, 12, Math.PI * 0.5, Math.PI, 0, Math.PI * 0.5),
      material,
    );
    tip.material.side = THREE.DoubleSide;
    tip.position.set(0, backBottomY, 0);
    group.add(tip);
  } else if (id === "pigtails") {
    group.add(bobShell(Math.PI * 0.15, Math.PI * 0.2));
    for (const side of [-1, 1]) {
      const tail = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.065, 0.32, 8, 12),
        material,
      );
      tail.position.set(side * (r + 0.04), capY - 0.1, -0.02);
      tail.rotation.z = side * 0.25;
      group.add(tail);
    }
  } else if (id === "bun") {
    group.add(bobShell(Math.PI * 0.1, Math.PI * 0.2));
    const bun = new THREE.Mesh(new THREE.SphereGeometry(0.12, 20, 16), material);
    bun.position.y = ANCHORS.headTop + 0.04;
    group.add(bun);
  } else if (id === "afro") {
    const puff = new THREE.Mesh(
      new THREE.SphereGeometry(BODY.headRadius + 0.11, 28, 22),
      material,
    );
    puff.position.y = ANCHORS.headCenter + 0.05;
    puff.scale.set(1.05, 1.0, 1.05);
    group.add(puff);
    // a few smaller bumps to sell the curly volume silhouette
    const bumpPositions = [
      [0.22, 0.18, 0.05],
      [-0.22, 0.18, 0.05],
      [0.0, 0.28, 0.0],
      [0.18, 0.05, -0.18],
      [-0.18, 0.05, -0.18],
      [0.18, 0.05, 0.18],
      [-0.18, 0.05, 0.18],
    ];
    for (const [bx, by, bz] of bumpPositions) {
      const bump = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 12), material);
      bump.position.set(bx, ANCHORS.headCenter + by, bz);
      group.add(bump);
    }
  } else if (id === "fade") {
    // tight cap hugging the crown; shorter on the sides
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(r + 0.005, 28, 22, 0, Math.PI * 2, 0, Math.PI * 0.4),
      material,
    );
    cap.position.y = capY;
    group.add(cap);
    // forehead/temple sides — short fade band
    const band = new THREE.Mesh(
      new THREE.SphereGeometry(r + 0.002, 28, 22, 0, Math.PI * 2, Math.PI * 0.42, Math.PI * 0.05),
      material,
    );
    band.position.y = capY+0.025;
    band.scale.y = 0.5;
    group.add(band);
  }
  return group;
}

function makeShirt(material) {
  const group = new THREE.Group();
  const top = ANCHORS.shoulder - 0.02;
  const bottom = ANCHORS.waist;
  const h = top - bottom;
  const tube = new THREE.Mesh(
    new THREE.CylinderGeometry(BODY.torsoRadius + 0.018, BODY.torsoRadius + 0.022, h, 28),
    material,
  );
  tube.position.y = (top + bottom) / 2;
  group.add(tube);
  for (const side of [-1, 1]) {
    const sleeve = new THREE.Mesh(
      new THREE.SphereGeometry(BODY.armRadius + 0.018, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.6),
      material,
    );
    sleeve.position.set(side * BODY.shoulderHalfWidth * 0.82, ANCHORS.shoulder, 0);
    sleeve.rotation.z = side * 0.22;
    group.add(sleeve);
  }
  return group;
}

function makeBottomVariant(id, material) {
  const group = new THREE.Group();
  const waistY = ANCHORS.waist;
  if (id === "skirt") {
    const h = 0.26;
    const skirt = new THREE.Mesh(
      new THREE.CylinderGeometry(BODY.torsoRadius + 0.03, BODY.torsoRadius + 0.13, h, 28, 1, true),
      material,
    );
    skirt.position.y = waistY - h / 2;
    skirt.material.side = THREE.DoubleSide;
    group.add(skirt);
    const hem = new THREE.Mesh(
      new THREE.RingGeometry(BODY.torsoRadius + 0.03, BODY.torsoRadius + 0.13, 28),
      material,
    );
    hem.rotation.x = Math.PI / 2;
    hem.position.y = waistY - h;
    hem.material.side = THREE.DoubleSide;
    group.add(hem);
  } else if (id === "pants") {
    const yokeHeight = 0.13;
    const yokeBottomR = BODY.hipHalfWidth + BODY.legRadius + 0.0;
    const yoke = new THREE.Mesh(
      new THREE.CylinderGeometry(
        BODY.torsoRadius + 0.022,
        yokeBottomR,
        yokeHeight,
        28,
      ),
      material,
    );
    yoke.position.y = waistY - yokeHeight / 2;
    group.add(yoke);

    // seat cap fills the crotch so no skin shows between the legs
    const seat = new THREE.Mesh(
      new THREE.SphereGeometry(yokeBottomR, 24, 16),
      material,
    );
    seat.position.y = waistY - yokeHeight + 0.005;
    seat.scale.set(1, 0.3, 1);
    group.add(seat);

    const legTop = waistY - yokeHeight + 0.1;
    for (const side of [-1, 1]) {
      const leg = new THREE.Mesh(
        new THREE.CylinderGeometry(BODY.legRadius + 0.012, BODY.legRadius + 0.008, legTop - ANCHORS.ankle, 20),
        material,
      );
      leg.position.set(side * BODY.hipHalfWidth, (legTop + ANCHORS.ankle) / 2, 0);
      group.add(leg);
    }
  } else if (id === "shorts") {
    const shortsHeight = 0.13;
    const shortsBottomR = BODY.hipHalfWidth + BODY.legRadius + 0.0;
    const shorts = new THREE.Mesh(
      new THREE.CylinderGeometry(BODY.torsoRadius + 0.022, shortsBottomR, shortsHeight, 28),
      material,
    );
    shorts.position.y = waistY - shortsHeight / 2;
    group.add(shorts);

    const seat = new THREE.Mesh(
      new THREE.SphereGeometry(shortsBottomR, 24, 16),
      material,
    );
    seat.position.y = waistY - shortsHeight + 0.005;
    seat.scale.set(1, 0.3, 1);
    group.add(seat);

    for (const side of [-1, 1]) {
      const cuff = new THREE.Mesh(
        new THREE.CylinderGeometry(BODY.legRadius + 0.015, BODY.legRadius + 0.0175, 0.2, 18),
        material,
      );
      cuff.position.set(side * BODY.hipHalfWidth, waistY - shortsHeight - 0.005, 0);
      group.add(cuff);
    }
  }
  return group;
}

function makeWingsVariant(id, material) {
  const group = new THREE.Group();
  if (id === "off") return group;
  material.transparent = true;
  material.opacity = id === "bat" ? 0.92 : 0.78;
  material.side = THREE.DoubleSide;
  const anchorY = ANCHORS.chest;
  const anchorZ = -BODY.torsoRadius - 0.015;

  if (id === "butterfly") {
    for (const side of [-1, 1]) {
      const upper = new THREE.Mesh(new THREE.CircleGeometry(0.34, 28), material);
      upper.position.set(side * 0.28, anchorY + 0.08, anchorZ);
      upper.rotation.y = side * -0.5;
      upper.rotation.z = side * -0.1;
      group.add(upper);
      const lower = new THREE.Mesh(new THREE.CircleGeometry(0.24, 28), material);
      lower.position.set(side * 0.26, anchorY - 0.2, anchorZ);
      lower.rotation.y = side * -0.5;
      lower.rotation.z = side * 0.2;
      group.add(lower);
    }
  } else if (id === "angel") {
    // layered feather plumage: a wide base + several smaller overlapping feather ellipses
    for (const side of [-1, 1]) {
      const wing = new THREE.Group();
      const base = new THREE.Mesh(new THREE.CircleGeometry(0.32, 28), material);
      base.scale.set(1.5, 0.85, 1);
      base.position.set(0.2, 0.02, 0);
      base.rotation.z = -0.1;
      wing.add(base);
      const layers = [
        { r: 0.22, sx: 1.7, sy: 0.55, x: 0.32, y: 0.0, rot: -0.25, z: 0.002 },
        { r: 0.18, sx: 1.7, sy: 0.5, x: 0.28, y: -0.12, rot: -0.35, z: 0.004 },
        { r: 0.14, sx: 1.7, sy: 0.5, x: 0.22, y: -0.22, rot: -0.5, z: 0.006 },
        { r: 0.1, sx: 1.7, sy: 0.5, x: 0.14, y: -0.28, rot: -0.75, z: 0.008 },
      ];
      for (const L of layers) {
        const f = new THREE.Mesh(new THREE.CircleGeometry(L.r, 22), material);
        f.scale.set(L.sx, L.sy, 1);
        f.position.set(L.x, L.y, L.z);
        f.rotation.z = L.rot;
        wing.add(f);
      }
      wing.position.set(side * 0.12, anchorY + 0.05, anchorZ);
      wing.rotation.y = side * 0.15;
      wing.scale.x = side;
      group.add(wing);
    }
  } else if (id === "bat") {
    // scalloped membrane silhouette via THREE.Shape
    for (const side of [-1, 1]) {
      const shape = new THREE.Shape();
      shape.moveTo(0, 0.08);
      shape.lineTo(0.85, 0.26);
      shape.quadraticCurveTo(0.78, 0.02, 0.7, 0.1);
      shape.quadraticCurveTo(0.64, -0.1, 0.55, 0.03);
      shape.quadraticCurveTo(0.48, -0.16, 0.38, -0.02);
      shape.quadraticCurveTo(0.3, -0.18, 0.2, -0.06);
      shape.quadraticCurveTo(0.12, -0.12, 0.0, 0.08);
      const geom = new THREE.ShapeGeometry(shape);
      const mesh = new THREE.Mesh(geom, material);
      mesh.position.set(side * 0.12, anchorY, anchorZ);
      mesh.rotation.y = side * -0.4;
      mesh.scale.x = side;
      group.add(mesh);
    }
  }

  const wingsScale = 0.72;
  group.scale.setScalar(wingsScale);
  group.position.y = anchorY * (1 - wingsScale);
  group.position.z = anchorZ * (1 - wingsScale);
  return group;
}

function buildBow(material) {
  const bow = new THREE.Group();
  for (const side of [-1, 1]) {
    const loop = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 16, 12),
      material,
    );
    loop.position.set(side * 0.06, ANCHORS.headTop + 0.015, -0.02);
    loop.scale.set(0.9, 1.2, 0.55);
    loop.rotation.z = side * 1.9;
    bow.add(loop);
  }
  const knot = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 12), material);
  knot.position.set(0, ANCHORS.headTop - 0.04, -0.02);
  bow.add(knot);
  return bow;
}

function buildHalo(material) {
  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(0.17, 0.02, 14, 40),
    material,
  );
  halo.rotation.x = Math.PI / 2;
  halo.position.y = ANCHORS.headTop + 0.1;
  return halo;
}

function buildHorns(material) {
  const horns = new THREE.Group();
  for (const side of [-1, 1]) {
    const horn = new THREE.Mesh(
      new THREE.ConeGeometry(0.04, 0.2, 16),
      material,
    );
    horn.position.set(side * 0.1, ANCHORS.headTop - 0.01, -0.02);
    horn.rotation.x = -0.2;
    horn.rotation.z = side * 0.22;
    horns.add(horn);
  }
  return horns;
}

function buildCatEars(material) {
  const ears = new THREE.Group();
  // inner color is a lighter tint of the ear color (computed at build time; not exposed separately)
  const innerColor = new THREE.Color(material.color).lerp(new THREE.Color(0xffffff), 0.55);
  const innerMat = softMat(innerColor.getHex(), { roughness: 0.75 });
  for (const side of [-1, 1]) {
    const outer = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.16, 4), material);
    outer.position.set(side * 0.13, ANCHORS.headTop + 0.04, -0.015);
    outer.rotation.z = side * -0.25;
    outer.rotation.y = Math.PI / 4;
    outer.scale.set(1, 1, 0.45);
    ears.add(outer);
    const inner = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.1, 4), innerMat);
    inner.position.set(side * 0.13, ANCHORS.headTop + 0.02, 0.005);
    inner.rotation.copy(outer.rotation);
    inner.scale.set(1, 1, 0.3);
    ears.add(inner);
  }
  // keep a pointer so we can update the inner tint when outer color changes
  ears.userData.innerMat = innerMat;
  return ears;
}

function buildLashArcs(material) {
  const arcs = new THREE.Group();
  const eyeX = 0.085;
  const eyeY = -0.03;
  for (const side of [-1, 1]) {
    const xLocal = side * eyeX;
    const yLocal = eyeY;
    const zLocal = Math.sqrt(
      Math.max(0, BODY.headRadius * BODY.headRadius - yLocal * yLocal - xLocal * xLocal),
    );
    const pivot = new THREE.Group();
    pivot.position.set(0, ANCHORS.headCenter, 0);
    const normal = new THREE.Vector3(xLocal, yLocal, zLocal).normalize();
    pivot.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);

    const arc = new THREE.Mesh(
      new THREE.TorusGeometry(0.048, 0.005, 5, 18, Math.PI),
      material,
    );
    arc.position.z = BODY.headRadius - 0.001;
    arc.scale.set(1.1, 1, 1);
    pivot.add(arc);
    arcs.add(pivot);
  }
  return arcs;
}

function buildLashes(material) {
  const flicks = new THREE.Group();
  const eyeX = 0.085;
  const eyeY = -0.03;
  for (const side of [-1, 1]) {
    const xLocal = side * eyeX;
    const yLocal = eyeY;
    const zLocal = Math.sqrt(
      Math.max(0, BODY.headRadius * BODY.headRadius - yLocal * yLocal - xLocal * xLocal),
    );
    const pivot = new THREE.Group();
    pivot.position.set(0, ANCHORS.headCenter, 0);
    const normal = new THREE.Vector3(xLocal, yLocal, zLocal).normalize();
    pivot.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);

    // outer corner flick — original position/rotation preserved
    const outer = new THREE.Mesh(
      new THREE.CylinderGeometry(0.005, 0.003, 0.03, 6),
      material,
    );
    outer.position.set(side * 0.067, 0.006, BODY.headRadius - 0.0001);
    outer.rotation.z = side * (Math.PI / 2 + 0.3);
    pivot.add(outer);

    // three more lashes radiating along the top of the arc
    const lashLayout = [
      { t: Math.PI / 6, len: 0.028, r: 0.055 },
      { t: Math.PI / 3, len: 0.026, r: 0.054 },
      { t: Math.PI / 2, len: 0.024, r: 0.054 },
    ];
    for (const { t, len, r } of lashLayout) {
      const flick = new THREE.Mesh(
        new THREE.CylinderGeometry(0.005, 0.003, len, 6),
        material,
      );
      flick.position.set(
        side * Math.cos(t) * r,
        Math.sin(t) * r + 0.006,
        BODY.headRadius - 0.0001,
      );
      flick.rotation.z = side * (Math.PI / 2 + t);
      pivot.add(flick);
    }

    flicks.add(pivot);
  }
  return flicks;
}

function buildMustache(material) {
  const mustache = new THREE.Group();
  // sit just above the chin/mouth area on the front of the face
  const yLocal = -0.11;
  const halfX = 0.05;
  for (const side of [-1, 1]) {
    const xLocal = side * halfX;
    const zLocal = Math.sqrt(
      Math.max(0, BODY.headRadius * BODY.headRadius - yLocal * yLocal - xLocal * xLocal),
    );
    const pivot = new THREE.Group();
    pivot.position.set(0, ANCHORS.headCenter, 0);
    const normal = new THREE.Vector3(xLocal, yLocal, zLocal).normalize();
    pivot.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);

    const half = new THREE.Mesh(
      new THREE.TorusGeometry(0.035, 0.011, 8, 14, Math.PI * 0.7),
      material,
    );
    half.position.z = BODY.headRadius - 0.001;
    half.scale.set(1.1, 0.85, 1);
    half.rotation.z = side > 0 ? Math.PI : 0;
    pivot.add(half);
    mustache.add(pivot);
  }
  return mustache;
}

function buildStar(material) {
  const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.055, 0), material);
  star.position.set(0, ANCHORS.headTop + 0.1, 0);
  return star;
}

function makeAccessories() {
  const group = new THREE.Group();
  const materials = {};
  const nodes = {};

  for (const def of ACCESSORY_DEFS) {
    let mat;
    if (def.id === "star") {
      mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(def.defaultColor),
        emissive: new THREE.Color(def.defaultColor),
        emissiveIntensity: 0.7,
        roughness: 0.3,
      });
    } else if (def.id === "halo") {
      mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(def.defaultColor),
        emissive: new THREE.Color(def.defaultColor),
        emissiveIntensity: 0.5,
        roughness: 0.3,
      });
    } else if (def.id === "lashes") {
      mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(def.defaultColor) });
    } else {
      mat = softMat(def.defaultColor, { roughness: 0.5 });
    }
    materials[def.id] = mat;

    let node;
    if (def.id === "bow") node = buildBow(mat);
    else if (def.id === "halo") node = buildHalo(mat);
    else if (def.id === "horns") node = buildHorns(mat);
    else if (def.id === "ears") node = buildCatEars(mat);
    else if (def.id === "lashes") node = buildLashes(mat);
    else if (def.id === "mustache") node = buildMustache(mat);
    else if (def.id === "star") node = buildStar(mat);

    node.name = def.id;
    node.visible = false;
    nodes[def.id] = node;
    group.add(node);
  }

  return { group, materials, nodes };
}

export function createProceduralCharacter(initialState = {}) {
  const state = {
    colors: { ...DEFAULTS.colors, ...(initialState.colors ?? {}) },
    variants: { ...DEFAULTS.variants, ...(initialState.variants ?? {}) },
    accessories: { ...DEFAULTS.accessories, ...(initialState.accessories ?? {}) },
    accessoryColors: { ...DEFAULTS.accessoryColors, ...(initialState.accessoryColors ?? {}) },
  };

  const root = new THREE.Group();
  root.name = "procedural-character";

  const skinMat = softMat(state.colors.skin);
  const hairMat = softMat(state.colors.hair, { roughness: 0.75 });
  const shirtMat = softMat(state.colors.shirt);
  const bottomMat = softMat(state.colors.bottom);
  const wingsMat = softMat(state.colors.wings, { transparent: true, opacity: 0.78 });
  const shoesMat = softMat(state.colors.shoes, { roughness: 0.6 });
  const irisMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(state.colors.eyes) });
  const pupilMat = new THREE.MeshBasicMaterial({ color: darkerShade(state.colors.eyes) });
  const blushMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(state.colors.blush),
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  });

  root.add(makeBody(skinMat));
  root.add(makeLegs(skinMat, shoesMat));
  root.add(makeArms(skinMat));
  root.add(makeHead(skinMat, blushMat));
  root.add(makeEyes(irisMat, pupilMat));

  let hairGroup = makeHairVariant(state.variants.hair, hairMat);
  let bottomGroup = makeBottomVariant(state.variants.bottom, bottomMat);
  let wingsGroup = makeWingsVariant(state.variants.wings, wingsMat);
  const { group: accessoriesGroup, materials: accessoryMaterials, nodes: accessoryNodes } = makeAccessories();
  const shirtGroup = makeShirt(shirtMat);

  root.add(shirtGroup);
  root.add(hairGroup);
  root.add(bottomGroup);
  root.add(wingsGroup);
  root.add(accessoriesGroup);
  // lash arcs always visible regardless of the lashes accessory toggle —
  // they share the lashes accessory material so color stays in sync
  root.add(buildLashArcs(accessoryMaterials.lashes));

  // apply initial accessory visibility + colors
  for (const def of ACCESSORY_DEFS) {
    const node = accessoryNodes[def.id];
    if (node) node.visible = !!state.accessories[def.id];
    const color = state.accessoryColors[def.id] ?? def.defaultColor;
    applyAccessoryColor(def.id, color);
  }

  function applyAccessoryColor(id, hex) {
    const mat = accessoryMaterials[id];
    if (!mat) return;
    mat.color.set(hex);
    if (mat.emissive) mat.emissive.set(hex);
    // cat ears: also refresh the inner-ear tint so it tracks the outer color
    if (id === "ears") {
      const node = accessoryNodes.ears;
      const innerMat = node?.userData?.innerMat;
      if (innerMat) {
        innerMat.color.copy(new THREE.Color(hex).lerp(new THREE.Color(0xffffff), 0.55));
      }
    }
  }

  function setColor(partId, hex) {
    state.colors[partId] = hex;
    const color = new THREE.Color(hex);
    if (partId === "skin") skinMat.color.copy(color);
    else if (partId === "hair") hairMat.color.copy(color);
    else if (partId === "shirt") shirtMat.color.copy(color);
    else if (partId === "bottom") bottomMat.color.copy(color);
    else if (partId === "wings") wingsMat.color.copy(color);
    else if (partId === "shoes") shoesMat.color.copy(color);
    else if (partId === "blush") blushMat.color.copy(color);
    else if (partId === "eyes") {
      irisMat.color.copy(color);
      pupilMat.color.copy(darkerShade(hex));
    }
  }

  function setVariant(partId, variantId) {
    state.variants[partId] = variantId;
    if (partId === "hair") {
      root.remove(hairGroup);
      hairGroup = makeHairVariant(variantId, hairMat);
      root.add(hairGroup);
    } else if (partId === "bottom") {
      root.remove(bottomGroup);
      bottomGroup = makeBottomVariant(variantId, bottomMat);
      root.add(bottomGroup);
    } else if (partId === "wings") {
      root.remove(wingsGroup);
      wingsGroup = makeWingsVariant(variantId, wingsMat);
      root.add(wingsGroup);
    }
  }

  function setAccessory(id, visible) {
    state.accessories[id] = visible;
    const node = accessoryNodes[id];
    if (node) node.visible = visible;
  }

  function setAccessoryColor(id, hex) {
    state.accessoryColors[id] = hex;
    applyAccessoryColor(id, hex);
  }

  function getState() {
    return JSON.parse(JSON.stringify(state));
  }

  return {
    root,
    setColor,
    setVariant,
    setAccessory,
    setAccessoryColor,
    getState,
  };
}

export const PROCEDURAL_CUSTOMIZATION_SCHEMA = {
  colors: [
    { id: "skin", label: "skin", default: DEFAULTS.colors.skin },
    { id: "hair", label: "hair", default: DEFAULTS.colors.hair },
    { id: "eyes", label: "eyes", default: DEFAULTS.colors.eyes },
    { id: "blush", label: "blush", default: DEFAULTS.colors.blush },
    { id: "shirt", label: "shirt", default: DEFAULTS.colors.shirt },
    { id: "bottom", label: "bottom", default: DEFAULTS.colors.bottom },
    { id: "wings", label: "wings", default: DEFAULTS.colors.wings },
    { id: "shoes", label: "shoes", default: DEFAULTS.colors.shoes },
  ],
  variants: [
    { id: "hair", label: "hair style", options: ["bob", "long", "pigtails", "bun", "afro", "fade"] },
    { id: "bottom", label: "bottom", options: ["skirt", "pants", "shorts"] },
    { id: "wings", label: "wings", options: ["off", "butterfly", "angel", "bat"] },
  ],
  accessories: ACCESSORY_DEFS.map(({ id, label, defaultColor }) => ({
    id,
    label,
    defaultColor,
  })),
};
