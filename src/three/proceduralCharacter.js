import * as THREE from "three";

const DEFAULTS = {
  colors: {
    skin: "#fcd8c2",
    hair: "#e8a3d0",
    shirt: "#ffcce8",
    bottom: "#c8b3fb",
    wings: "#fff6e8",
    eyes: "#3a2a4a",
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

function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    roughness: opts.roughness ?? 0.55,
    metalness: 0,
    transparent: opts.transparent ?? false,
    opacity: opts.opacity ?? 1,
    emissive: opts.emissive ?? 0x000000,
    emissiveIntensity: opts.emissiveIntensity ?? 0,
  });
}

function makeBody(material) {
  const geo = new THREE.CapsuleGeometry(0.22, 0.45, 8, 16);
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.y = 0.5;
  return mesh;
}

function makeHead(material) {
  const geo = new THREE.SphereGeometry(0.27, 32, 24);
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.y = 1.0;
  return mesh;
}

function makeEyes(irisMaterial) {
  const group = new THREE.Group();
  const sclera = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 16, 16), sclera);
    eye.position.set(side * 0.08, 1.02, 0.235);
    group.add(eye);
    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.025, 12, 12), irisMaterial);
    iris.position.set(side * 0.08, 1.02, 0.26);
    group.add(iris);
  }
  return group;
}

function makeHairVariant(id, material) {
  const group = new THREE.Group();
  if (id === "bob") {
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 24, 20, 0, Math.PI * 2, 0, Math.PI / 1.9),
      material,
    );
    cap.position.y = 1.03;
    group.add(cap);
    const back = new THREE.Mesh(
      new THREE.SphereGeometry(0.29, 24, 20, 0, Math.PI, Math.PI / 4, Math.PI / 2),
      material,
    );
    back.position.set(0, 1.0, -0.02);
    back.rotation.y = Math.PI;
    group.add(back);
  } else if (id === "long") {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 20, 0, Math.PI * 2, 0, Math.PI / 2), material);
    cap.position.y = 1.02;
    group.add(cap);
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.12), material);
    back.position.set(0, 0.75, -0.22);
    group.add(back);
  } else if (id === "pigtails") {
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 24, 20, 0, Math.PI * 2, 0, Math.PI / 1.9),
      material,
    );
    cap.position.y = 1.03;
    group.add(cap);
    for (const side of [-1, 1]) {
      const tail = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.07, 0.3, 8, 12),
        material,
      );
      tail.position.set(side * 0.32, 0.88, -0.06);
      tail.rotation.z = side * 0.3;
      group.add(tail);
    }
  } else if (id === "bun") {
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 24, 20, 0, Math.PI * 2, 0, Math.PI / 1.9),
      material,
    );
    cap.position.y = 1.03;
    group.add(cap);
    const bun = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 16), material);
    bun.position.y = 1.32;
    group.add(bun);
  }
  return group;
}

function makeShirt(material) {
  const geo = new THREE.CylinderGeometry(0.25, 0.25, 0.35, 24, 1, true);
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.y = 0.55;
  return mesh;
}

function makeBottomVariant(id, material) {
  const group = new THREE.Group();
  if (id === "skirt") {
    const skirt = new THREE.Mesh(
      new THREE.ConeGeometry(0.38, 0.35, 24, 1, true),
      material,
    );
    skirt.position.y = 0.3;
    skirt.material.side = THREE.DoubleSide;
    group.add(skirt);
  } else if (id === "pants") {
    for (const side of [-1, 1]) {
      const leg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.09, 0.4, 16),
        material,
      );
      leg.position.set(side * 0.11, 0.2, 0);
      group.add(leg);
    }
  } else if (id === "shorts") {
    const shorts = new THREE.Mesh(
      new THREE.CylinderGeometry(0.26, 0.22, 0.18, 24),
      material,
    );
    shorts.position.y = 0.34;
    group.add(shorts);
  }
  return group;
}

function makeWingsVariant(id, material) {
  const group = new THREE.Group();
  if (id === "off") return group;
  material.transparent = true;
  material.opacity = 0.75;
  material.side = THREE.DoubleSide;
  if (id === "butterfly") {
    for (const side of [-1, 1]) {
      const upper = new THREE.Mesh(
        new THREE.CircleGeometry(0.24, 24),
        material,
      );
      upper.position.set(side * 0.26, 0.75, -0.12);
      upper.rotation.y = side * -0.4;
      group.add(upper);
      const lower = new THREE.Mesh(
        new THREE.CircleGeometry(0.17, 24),
        material,
      );
      lower.position.set(side * 0.22, 0.5, -0.12);
      lower.rotation.y = side * -0.4;
      group.add(lower);
    }
  } else if (id === "feather") {
    for (const side of [-1, 1]) {
      const wing = new THREE.Mesh(
        new THREE.PlaneGeometry(0.4, 0.5),
        material,
      );
      wing.position.set(side * 0.3, 0.65, -0.12);
      wing.rotation.y = side * -0.35;
      group.add(wing);
    }
  }
  return group;
}

function makeAccessories(skinMat) {
  const group = new THREE.Group();

  const bow = new THREE.Group();
  const bowMat = new THREE.MeshStandardMaterial({ color: 0xff8fd8, roughness: 0.4 });
  for (const side of [-1, 1]) {
    const loop = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.12, 12), bowMat);
    loop.position.set(side * 0.05, 1.28, 0);
    loop.rotation.z = side * Math.PI / 2;
    bow.add(loop);
  }
  const knot = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 12), bowMat);
  knot.position.y = 1.28;
  bow.add(knot);
  bow.name = "bow";
  bow.visible = false;
  group.add(bow);

  const glasses = new THREE.Group();
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x3a2a4a, roughness: 0.3 });
  for (const side of [-1, 1]) {
    const frame = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.012, 8, 24), frameMat);
    frame.position.set(side * 0.09, 1.02, 0.26);
    glasses.add(frame);
  }
  const bridge = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.06, 8), frameMat);
  bridge.rotation.z = Math.PI / 2;
  bridge.position.set(0, 1.02, 0.26);
  glasses.add(bridge);
  glasses.name = "glasses";
  glasses.visible = false;
  group.add(glasses);

  const star = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.05, 0),
    new THREE.MeshStandardMaterial({
      color: 0xfff6e8,
      emissive: 0xffe4a8,
      emissiveIntensity: 0.8,
      roughness: 0.2,
    }),
  );
  star.position.set(0, 1.42, 0);
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

  const skinMat = mat(state.colors.skin);
  const hairMat = mat(state.colors.hair);
  const shirtMat = mat(state.colors.shirt);
  const bottomMat = mat(state.colors.bottom);
  const wingsMat = mat(state.colors.wings, { transparent: true, opacity: 0.75 });
  const irisMat = mat(state.colors.eyes, { roughness: 0.3 });

  const body = makeBody(skinMat);
  const head = makeHead(skinMat);
  const eyes = makeEyes(irisMat);
  const shirt = makeShirt(shirtMat);

  root.add(body);
  root.add(head);
  root.add(eyes);
  root.add(shirt);

  let hairGroup = makeHairVariant(state.variants.hair, hairMat);
  let bottomGroup = makeBottomVariant(state.variants.bottom, bottomMat);
  let wingsGroup = makeWingsVariant(state.variants.wings, wingsMat);
  const accessoriesGroup = makeAccessories(skinMat);

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
