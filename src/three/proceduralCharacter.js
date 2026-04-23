import * as THREE from "three";

// shared anchor Y values so every part lines up instead of floating to its own Y
const ANCHORS = {
  floor: 0,
  ankle: 0.04,
  knee: 0.30,
  hip: 0.60,
  waist: 0.62,
  chest: 0.88,
  shoulder: 0.96,
  neck: 1.02,
  headCenter: 1.22,
  headTop: 1.44,
};

const BODY = {
  torsoRadius: 0.15,
  torsoHeight: ANCHORS.chest - ANCHORS.waist + 0.06,
  hipHalfWidth: 0.09,
  shoulderHalfWidth: 0.22,
  legRadius: 0.065,
  armRadius: 0.055,
  armLength: 0.48,
  headRadius: 0.22,
};

const DEFAULTS = {
  colors: {
    skin: "#fcd8c2",
    hair: "#e8a3d0",
    shirt: "#ffcce8",
    bottom: "#c8b3fb",
    wings: "#fff6e8",
    eyes: "#6b3a7a",
  },
  variants: {
    hair: "bob",
    bottom: "skirt",
    wings: "off",
  },
  accessories: {
    bow: false,
    glasses: false,
    star: true,
  },
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

function makeLegs(skinMat) {
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
      skinMat,
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

function makeHead(skinMat) {
  const group = new THREE.Group();
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(BODY.headRadius, 32, 24),
    skinMat,
  );
  head.position.y = ANCHORS.headCenter;
  group.add(head);

  // blush cheeks
  const blushMat = new THREE.MeshStandardMaterial({
    color: 0xffaad0,
    roughness: 0.9,
    transparent: true,
    opacity: 0.55,
  });
  for (const side of [-1, 1]) {
    const cheek = new THREE.Mesh(new THREE.CircleGeometry(0.04, 20), blushMat);
    cheek.position.set(side * 0.12, ANCHORS.headCenter - 0.07, BODY.headRadius - 0.006);
    cheek.rotation.y = side * 0.25;
    group.add(cheek);
  }
  return group;
}

function makeEyes(irisMat) {
  const group = new THREE.Group();
  const whiteMat = new THREE.MeshBasicMaterial({ color: 0xfde8dc });
  const pupilMat = new THREE.MeshBasicMaterial({ color: 0x3a2540 });
  const highlightMat = new THREE.MeshBasicMaterial({ color: 0xfff8f0 });

  const zFront = BODY.headRadius - 0.001;
  const zStep = 0.0015;
  for (const side of [-1, 1]) {
    const eye = new THREE.Group();
    eye.position.set(side * 0.085, ANCHORS.headCenter + 0.01, zFront);

    const sclera = new THREE.Mesh(new THREE.CircleGeometry(0.04, 24), whiteMat);
    sclera.scale.set(0.95, 1.3, 1);
    eye.add(sclera);

    const iris = new THREE.Mesh(new THREE.CircleGeometry(0.032, 20), irisMat);
    iris.position.set(0, -0.004, zStep);
    iris.scale.set(0.95, 1.3, 1);
    eye.add(iris);

    const pupil = new THREE.Mesh(new THREE.CircleGeometry(0.016, 16), pupilMat);
    pupil.position.set(0, -0.004, 2 * zStep);
    pupil.scale.set(0.95, 1.3, 1);
    eye.add(pupil);

    const hi = new THREE.Mesh(new THREE.CircleGeometry(0.009, 12), highlightMat);
    hi.position.set(side * -0.009, 0.012, 3 * zStep);
    eye.add(hi);

    // curve around the head and droop outer corners slightly
    eye.rotation.y = side * 0.2;
    eye.rotation.z = side * -0.12;
    group.add(eye);
  }
  return group;
}

function makeHairVariant(id, material) {
  const group = new THREE.Group();
  const r = BODY.headRadius + 0.012;
  const capY = ANCHORS.headCenter;

  if (id === "bob") {
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(r, 28, 22, 0, Math.PI * 2, 0, Math.PI * 0.55),
      material,
    );
    cap.position.y = capY;
    group.add(cap);
    const back = new THREE.Mesh(
      new THREE.SphereGeometry(r * 0.98, 28, 20, 0, Math.PI, Math.PI * 0.25, Math.PI * 0.55),
      material,
    );
    back.position.set(0, capY - 0.02, -0.01);
    back.rotation.y = Math.PI;
    group.add(back);
    // front fringe
    const fringe = new THREE.Mesh(
      new THREE.SphereGeometry(r * 0.72, 20, 14, 0, Math.PI, 0, Math.PI * 0.3),
      material,
    );
    fringe.position.set(0, capY + 0.17, 0.02);
    fringe.rotation.x = 0.2;
    group.add(fringe);
  } else if (id === "long") {
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(r, 28, 22, 0, Math.PI * 2, 0, Math.PI * 0.55),
      material,
    );
    cap.position.y = capY;
    group.add(cap);
    // back-fall: top radius matches cap's edge at phi=0.55π (ring radius = r*sin(0.55π))
    const capEdgeRadius = r * Math.sin(Math.PI * 0.55);
    const capBottomY = capY + r * Math.cos(Math.PI * 0.55);
    const backTopY = capBottomY + 0.005;
    const backBottomY = ANCHORS.waist + 0.02;
    const backH = backTopY - backBottomY;
    const back = new THREE.Mesh(
      new THREE.CylinderGeometry(capEdgeRadius, capEdgeRadius * 0.72, backH, 24, 1),
      material,
    );
    back.position.set(0, (backTopY + backBottomY) / 2, -0.015);
    group.add(back);
    const fringe = new THREE.Mesh(
      new THREE.SphereGeometry(r * 0.72, 20, 14, 0, Math.PI, 0, Math.PI * 0.3),
      material,
    );
    fringe.position.set(0, capY + 0.17, 0.02);
    fringe.rotation.x = 0.2;
    group.add(fringe);
  } else if (id === "pigtails") {
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(r, 28, 22, 0, Math.PI * 2, 0, Math.PI * 0.55),
      material,
    );
    cap.position.y = capY;
    group.add(cap);
    const fringe = new THREE.Mesh(
      new THREE.SphereGeometry(r * 0.72, 20, 14, 0, Math.PI, 0, Math.PI * 0.3),
      material,
    );
    fringe.position.set(0, capY + 0.17, 0.02);
    fringe.rotation.x = 0.2;
    group.add(fringe);
    for (const side of [-1, 1]) {
      const tail = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.065, 0.32, 8, 12),
        material,
      );
      tail.position.set(side * (r + 0.04), capY - 0.2, -0.02);
      tail.rotation.z = side * 0.25;
      group.add(tail);
    }
  } else if (id === "bun") {
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(r, 28, 22, 0, Math.PI * 2, 0, Math.PI * 0.55),
      material,
    );
    cap.position.y = capY;
    group.add(cap);
    const fringe = new THREE.Mesh(
      new THREE.SphereGeometry(r * 0.72, 20, 14, 0, Math.PI, 0, Math.PI * 0.3),
      material,
    );
    fringe.position.set(0, capY + 0.17, 0.02);
    fringe.rotation.x = 0.2;
    group.add(fringe);
    const bun = new THREE.Mesh(new THREE.SphereGeometry(0.12, 20, 16), material);
    bun.position.y = ANCHORS.headTop + 0.04;
    group.add(bun);
  }
  return group;
}

function makeShirt(material) {
  const group = new THREE.Group();
  const top = ANCHORS.shoulder - 0.02;
  const bottom = ANCHORS.waist;
  const h = top - bottom;
  // main shirt tube
  const tube = new THREE.Mesh(
    new THREE.CylinderGeometry(BODY.torsoRadius + 0.018, BODY.torsoRadius + 0.022, h, 28),
    material,
  );
  tube.position.y = (top + bottom) / 2;
  group.add(tube);
  // little sleeve caps over the shoulder joints
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
    const h = 0.28;
    const skirt = new THREE.Mesh(
      new THREE.CylinderGeometry(BODY.torsoRadius + 0.03, BODY.torsoRadius + 0.22, h, 28, 1, true),
      material,
    );
    skirt.position.y = waistY - h / 2;
    skirt.material.side = THREE.DoubleSide;
    group.add(skirt);
    // hem disk so interior isn't hollow-looking from below
    const hem = new THREE.Mesh(
      new THREE.RingGeometry(BODY.torsoRadius + 0.03, BODY.torsoRadius + 0.22, 28),
      material,
    );
    hem.rotation.x = Math.PI / 2;
    hem.position.y = waistY - h;
    hem.material.side = THREE.DoubleSide;
    group.add(hem);
  } else if (id === "pants") {
    // hip yoke: tapers from waist down to where the two legs split, covering the crotch
    const yokeHeight = 0.20;
    const yoke = new THREE.Mesh(
      new THREE.CylinderGeometry(BODY.torsoRadius + 0.022, BODY.hipHalfWidth + BODY.legRadius + 0.018, yokeHeight, 28),
      material,
    );
    yoke.position.y = waistY - yokeHeight / 2;
    group.add(yoke);
    const legTop = waistY - yokeHeight + 0.02;
    for (const side of [-1, 1]) {
      const leg = new THREE.Mesh(
        new THREE.CylinderGeometry(BODY.legRadius + 0.012, BODY.legRadius + 0.008, legTop - ANCHORS.ankle, 20),
        material,
      );
      leg.position.set(side * BODY.hipHalfWidth, (legTop + ANCHORS.ankle) / 2, 0);
      group.add(leg);
    }
  } else if (id === "shorts") {
    const shorts = new THREE.Mesh(
      new THREE.CylinderGeometry(BODY.torsoRadius + 0.022, BODY.torsoRadius + 0.04, 0.16, 28),
      material,
    );
    shorts.position.y = waistY - 0.08;
    group.add(shorts);
    for (const side of [-1, 1]) {
      const cuff = new THREE.Mesh(
        new THREE.CylinderGeometry(BODY.legRadius + 0.022, BODY.legRadius + 0.02, 0.04, 16),
        material,
      );
      cuff.position.set(side * BODY.hipHalfWidth, waistY - 0.18, 0);
      group.add(cuff);
    }
  }
  return group;
}

function makeWingsVariant(id, material) {
  const group = new THREE.Group();
  if (id === "off") return group;
  material.transparent = true;
  material.opacity = 0.7;
  material.side = THREE.DoubleSide;
  const anchorY = ANCHORS.chest;
  const anchorZ = -BODY.torsoRadius - 0.01;

  if (id === "butterfly") {
    for (const side of [-1, 1]) {
      const upper = new THREE.Mesh(new THREE.CircleGeometry(0.26, 28), material);
      upper.position.set(side * 0.22, anchorY + 0.06, anchorZ);
      upper.rotation.y = side * -0.5;
      upper.rotation.z = side * -0.1;
      group.add(upper);
      const lower = new THREE.Mesh(new THREE.CircleGeometry(0.18, 28), material);
      lower.position.set(side * 0.2, anchorY - 0.16, anchorZ);
      lower.rotation.y = side * -0.5;
      lower.rotation.z = side * 0.2;
      group.add(lower);
    }
  } else if (id === "feather") {
    for (const side of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.55), material);
      wing.position.set(side * 0.24, anchorY - 0.02, anchorZ);
      wing.rotation.y = side * -0.45;
      wing.rotation.z = side * 0.1;
      group.add(wing);
    }
  }
  return group;
}

function makeAccessories() {
  const group = new THREE.Group();

  const bow = new THREE.Group();
  const bowMat = softMat(0xff8fd8, { roughness: 0.5 });
  for (const side of [-1, 1]) {
    const loop = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 16, 12),
      bowMat,
    );
    loop.position.set(side * 0.08, ANCHORS.headTop - 0.04, -0.02);
    loop.scale.set(0.9, 1.2, 0.55);
    loop.rotation.z = side * 0.4;
    bow.add(loop);
  }
  const knot = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 12), bowMat);
  knot.position.set(0, ANCHORS.headTop - 0.04, -0.02);
  bow.add(knot);
  bow.name = "bow";
  bow.visible = false;
  group.add(bow);

  const glasses = new THREE.Group();
  const frameMat = softMat(0x3a2a4a, { roughness: 0.3 });
  for (const side of [-1, 1]) {
    const frame = new THREE.Mesh(
      new THREE.TorusGeometry(0.055, 0.009, 10, 28),
      frameMat,
    );
    frame.position.set(side * 0.085, ANCHORS.headCenter + 0.01, BODY.headRadius - 0.008);
    glasses.add(frame);
  }
  const bridge = new THREE.Mesh(
    new THREE.CylinderGeometry(0.006, 0.006, 0.05, 8),
    frameMat,
  );
  bridge.rotation.z = Math.PI / 2;
  bridge.position.set(0, ANCHORS.headCenter + 0.01, BODY.headRadius - 0.008);
  glasses.add(bridge);
  glasses.name = "glasses";
  glasses.visible = false;
  group.add(glasses);

  const star = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.055, 0),
    new THREE.MeshStandardMaterial({
      color: 0xfff6e8,
      emissive: 0xffe4a8,
      emissiveIntensity: 0.9,
      roughness: 0.3,
    }),
  );
  star.position.set(0, ANCHORS.headTop + 0.22, 0);
  star.name = "star";
  star.visible = true;
  group.add(star);

  return group;
}

export function createProceduralCharacter(initialState = {}) {
  const state = {
    colors: { ...DEFAULTS.colors, ...(initialState.colors ?? {}) },
    variants: { ...DEFAULTS.variants, ...(initialState.variants ?? {}) },
    accessories: { ...DEFAULTS.accessories, ...(initialState.accessories ?? {}) },
  };

  const root = new THREE.Group();
  root.name = "procedural-character";

  const skinMat = softMat(state.colors.skin);
  const hairMat = softMat(state.colors.hair, { roughness: 0.75 });
  const shirtMat = softMat(state.colors.shirt);
  const bottomMat = softMat(state.colors.bottom);
  const wingsMat = softMat(state.colors.wings, { transparent: true, opacity: 0.7 });
  const irisMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(state.colors.eyes) });

  root.add(makeBody(skinMat));
  root.add(makeLegs(skinMat));
  root.add(makeArms(skinMat));
  root.add(makeHead(skinMat));
  root.add(makeEyes(irisMat));

  let hairGroup = makeHairVariant(state.variants.hair, hairMat);
  let bottomGroup = makeBottomVariant(state.variants.bottom, bottomMat);
  let wingsGroup = makeWingsVariant(state.variants.wings, wingsMat);
  const accessoriesGroup = makeAccessories();
  const shirtGroup = makeShirt(shirtMat);

  root.add(shirtGroup);
  root.add(hairGroup);
  root.add(bottomGroup);
  root.add(wingsGroup);
  root.add(accessoriesGroup);

  for (const [id, visible] of Object.entries(state.accessories)) {
    const obj = accessoriesGroup.getObjectByName(id);
    if (obj) obj.visible = visible;
  }

  function setColor(partId, hex) {
    state.colors[partId] = hex;
    const color = new THREE.Color(hex);
    if (partId === "skin") skinMat.color.copy(color);
    else if (partId === "hair") hairMat.color.copy(color);
    else if (partId === "shirt") shirtMat.color.copy(color);
    else if (partId === "bottom") bottomMat.color.copy(color);
    else if (partId === "wings") wingsMat.color.copy(color);
    else if (partId === "eyes") irisMat.color.copy(color);
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
    const obj = accessoriesGroup.getObjectByName(id);
    if (obj) obj.visible = visible;
  }

  function getState() {
    return JSON.parse(JSON.stringify(state));
  }

  return {
    root,
    setColor,
    setVariant,
    setAccessory,
    getState,
  };
}

export const PROCEDURAL_CUSTOMIZATION_SCHEMA = {
  colors: [
    { id: "skin", label: "skin", default: DEFAULTS.colors.skin },
    { id: "hair", label: "hair", default: DEFAULTS.colors.hair },
    { id: "eyes", label: "eyes", default: DEFAULTS.colors.eyes },
    { id: "shirt", label: "shirt", default: DEFAULTS.colors.shirt },
    { id: "bottom", label: "bottom", default: DEFAULTS.colors.bottom },
    { id: "wings", label: "wings", default: DEFAULTS.colors.wings },
  ],
  variants: [
    { id: "hair", label: "hair style", options: ["bob", "long", "pigtails", "bun"] },
    { id: "bottom", label: "bottom", options: ["skirt", "pants", "shorts"] },
    { id: "wings", label: "wings", options: ["off", "butterfly", "feather"] },
  ],
  accessories: [
    { id: "bow", label: "bow" },
    { id: "glasses", label: "glasses" },
    { id: "star", label: "star" },
  ],
};
