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
  torsoHeight: ANCHORS.chest - ANCHORS.waist + 0,
  hipHalfWidth: 0.09,
  shoulderHalfWidth: 0.22,
  legRadius: 0.065,
  armRadius: 0.055,
  armLength: 0.45,
  headRadius: 0.22,
};

const ACCESSORY_DEFS = [
  { id: "bow", label: "bow", defaultColor: "#ff008c" },
  { id: "halo", label: "halo", defaultColor: "#fff1a8" },
  { id: "horns", label: "horns", defaultColor: "#2a1830" },
  { id: "ears", label: "cat ears", defaultColor: "#ffb0de" },
  { id: "lashes", label: "lashes", defaultColor: "#591246" },
  { id: "mustache", label: "mustache", defaultColor: "#591246" },
  { id: "star", label: "star", defaultColor: "#fff6e8" },
  { id: "socks", label: "socks", defaultColor: "#ffe1f2" },
  { id: "glasses", label: "glasses", defaultColor: "#2a1830" },
  { id: "freckles", label: "freckles", defaultColor: "#a8623c" },
  { id: "flowerCrown", label: "flower crown", defaultColor: "#ff9ad5" },
  { id: "antennae", label: "antennae", defaultColor: "#ff66c4" },
  { id: "blushHeart", label: "heart stickers", defaultColor: "#ff5ea8" },
  { id: "blushStar", label: "star stickers", defaultColor: "#ffd166" },
];

const DEFAULTS = {
  colors: {
    skin: "#936a4e",
    hair: "#ea1dc8",
    shirt: "#ff7ec5",
    bottom: "#ff008c",
    wings: "#d37df8",
    eyes: "#930d9d",
    blush: "#c91d6a",
    shoes: "#d37df8",
  },
  variants: {
    hair: "long",
    bottom: "skirt",
    wings: "bat",
    shirt: "tee",
  },
  accessories: {
    bow: true,
    halo: false,
    horns: false,
    ears: false,
    lashes: true,
    mustache: false,
    star: false,
    socks: false,
    glasses: false,
    freckles: false,
    flowerCrown: false,
    antennae: false,
    blushHeart: false,
    blushStar: false,
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
  hip.scale.set(1.15, 0.95, 1);
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
    armMesh.position.y = 0.05 -BODY.armLength / 2;
    arm.add(armMesh);

    const hand = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 16, 12),
      skinMat,
    );
    hand.position.y = 0.05-BODY.armLength;
    hand.scale.set(1, 0.9, 0.9);
    arm.add(hand);

    arm.position.set(side * BODY.shoulderHalfWidth * 0.82, ANCHORS.shoulder, 0);
    arm.rotation.z = side * 0.32; // slight outward flare
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
        BODY.torsoRadius + 0.04,
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
      new THREE.SphereGeometry(BODY.torsoRadius + 0.02, 20, 12, Math.PI, Math.PI, 0, Math.PI * 0.5),
      material,
    );
    tip.material.side = THREE.DoubleSide;
    tip.position.set(0, backBottomY, 0);
   // group.add(tip);
  } else if (id === "pigtails") {
    group.add(bobShell(Math.PI * 0.15, Math.PI * 0.2));
    for (const side of [-1, 1]) {
      const tail = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.065, 0.4, 8, 12),
        material,
      );
      tail.position.set(side * (r + 0.04), capY - 0.125, -0.02);
      tail.rotation.z = side * 0.25;
      group.add(tail);
    }
  } else if (id === "bun") {
    group.add(bobShell(Math.PI * 0.17, Math.PI * 0.2));
    const bun = new THREE.Mesh(new THREE.SphereGeometry(0.12, 20, 16), material);
    bun.position.y = ANCHORS.headTop + 0.03;
    group.add(bun);
  } else if (id === "afro") {
    const puffR = 0.31;
    const headR = BODY.headRadius;
    const innerOffset = 0.005;
    const cy = ANCHORS.headCenter + 0.05;
    const sx = 1.0, sy = 0.9, sz = 1.0;
    const afroMat = material.clone();
    afroMat.color = material.color;
    afroMat.side = THREE.DoubleSide;
    // top hemisphere covers crown + forehead (full 360 around)
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(puffR, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.5),
      afroMat,
    );
    dome.position.y = cy;
    dome.scale.set(sx, sy, sz);
    group.add(dome);
    // skirt — solid thick band on sides+back, lathed from a closed cross-section
    const phiStart = Math.PI / 3;
    const phiLength = (Math.PI * 4) / 3;
    const thetaStart = Math.PI * 0.5;
    const thetaEnd = Math.PI * 0.69;
    const N = 12;
    const outerPts = [];
    const innerPts = [];
    for (let i = 0; i <= N; i++) {
      const t = thetaStart + (thetaEnd - thetaStart) * (i / N);
      const yLocal = puffR * Math.cos(t) * sy;
      const yWorld = cy + yLocal;
      const headLocalY = yWorld - ANCHORS.headCenter;
      const innerR =
        Math.sqrt(Math.max(0, headR * headR - headLocalY * headLocalY)) + innerOffset;
      outerPts.push(new THREE.Vector2(puffR * Math.sin(t) * sx, yLocal));
      innerPts.push(new THREE.Vector2(innerR, yLocal));
    }
    const profile = [...outerPts];
    // round the bottom edge with a half-circle arc connecting outer bottom to inner bottom
    const arcN = 8;
    const ax = (outerPts[N].x + innerPts[N].x) / 2;
    const ay = outerPts[N].y;
    const ar = (outerPts[N].x - innerPts[N].x) / 2;
    for (let k = 1; k < arcN; k++) {
      const ang = -Math.PI * (k / arcN);
      profile.push(
        new THREE.Vector2(ax + ar * Math.cos(ang), ay + ar * Math.sin(ang)),
      );
    }
    for (let i = innerPts.length - 1; i >= 0; i--) profile.push(innerPts[i]);
    profile.push(profile[0].clone());
    const skirt = new THREE.Mesh(
      new THREE.LatheGeometry(profile, 48, phiStart, phiLength),
      afroMat,
    );
    skirt.position.y = cy;
    group.add(skirt);
    // caps at the two cut edges so the front of the band reads solid, not hollow
    const capShape = new THREE.Shape();
    capShape.moveTo(profile[0].x, profile[0].y);
    for (let i = 1; i < profile.length; i++) capShape.lineTo(profile[i].x, profile[i].y);
    const capGeo = new THREE.ShapeGeometry(capShape);
    for (const phi of [phiStart, phiStart + phiLength]) {
      const cap = new THREE.Mesh(capGeo, afroMat);
      cap.rotation.y = phi - Math.PI / 2;
      cap.position.y = cy;
      group.add(cap);
    }
    // close the front-cut underside of the dome with a horizontal annulus that fits to the head
    const headXZAtCy = Math.sqrt(
      Math.max(0, headR * headR - (cy - ANCHORS.headCenter) ** 2),
    );
    const floor = new THREE.Mesh(
      new THREE.RingGeometry(
        headXZAtCy + 0.001,
        puffR * sx,
        32,
        1,
        Math.PI / 6,
        (Math.PI * 2) / 3,
      ),
      afroMat,
    );
    floor.rotation.x = Math.PI / 2;
    floor.position.y = cy;
    group.add(floor);
    // forehead-level closure: another horizontal ring higher up, fitting to the head and dome
    const foreheadY = cy + 0.06;
    const foreheadHeadXZ = Math.sqrt(
      Math.max(0, headR * headR - (foreheadY - ANCHORS.headCenter) ** 2),
    );
    const foreheadDomeT = Math.acos((foreheadY - cy) / (puffR * sy));
    const foreheadDomeXZ = puffR * Math.sin(foreheadDomeT) * sx;
    const forehead = new THREE.Mesh(
      new THREE.RingGeometry(
        foreheadHeadXZ + 0.001,
        foreheadDomeXZ,
        32,
        1,
        Math.PI / 6,
        (Math.PI * 2) / 3,
      ),
      afroMat,
    );
    forehead.rotation.x = Math.PI / 2;
    forehead.position.y = foreheadY;
    group.add(forehead);
  } else if (id === "fade") {
    // flared cylinder: slightly larger at top, tapering to meet the head exactly at the bottom
    const bottomOffset = 0.075;
    const bottomRadius = Math.sqrt(
      Math.max(0, BODY.headRadius * BODY.headRadius - bottomOffset * bottomOffset),
    );
    const topRadius = BODY.headRadius + 0.0025;
    const cylHeight = 0.15;
    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(topRadius, bottomRadius, cylHeight, 28, 1, false),
      material,
    );
    cap.position.y = ANCHORS.headCenter + bottomOffset + cylHeight / 2;
    group.add(cap);
    const top = new THREE.Mesh(
      new THREE.CircleGeometry(topRadius, 28),
      material,
    );
    top.rotation.x = -Math.PI / 2;
    top.position.y = ANCHORS.headCenter + bottomOffset + cylHeight;
    group.add(top);
    // forehead/temple sides — short fade band, flush with head
    const band = new THREE.Mesh(
      new THREE.SphereGeometry(BODY.headRadius + 0.001, 32, 24, 0, Math.PI * 2, Math.PI * 0.405, Math.PI * 0.02),
      material,
    );
    band.position.y = ANCHORS.headCenter;
    group.add(band);
  } else if (id === "twinbuns") {
    group.add(bobShell(Math.PI * 0.17, Math.PI * 0.2));
    for (const side of [-1, 1]) {
      const bun = new THREE.Mesh(new THREE.SphereGeometry(0.1, 18, 14), material);
      bun.position.set(side * 0.2, capY + 0.12, -0.01);
      group.add(bun);
    }
  } else if (id === "braids") {
    group.add(bobShell(Math.PI * 0.17, Math.PI * 0.2));
    for (const side of [-1, 1]) {
      const braid = new THREE.Group();
      const N = 9;
      const len = 0.5;
      for (let i = 0; i <= N; i++) {
        const t = i / N;
        const beadR = 0.05 * (1 - t * 0.45) * (1 + 0.18 * Math.sin(i * 1.6));
        const bead = new THREE.Mesh(new THREE.SphereGeometry(beadR, 10, 8), material);
        // arc forward as it descends so the braid drapes over the front of the
        // shoulder and clears the arms instead of clipping through them
        bead.position.set(0, -len * t, t * t * 0.1);
        braid.add(bead);
      }
      braid.position.set(side * (r - 0.02), capY - 0.09, 0.04);
      braid.rotation.z = side * 0.2;
      group.add(braid);
    }
  } else if (id === "mohawk") {
    // central strip of spikes following the scalp midline; shaved sides show skin
    const spikes = 8;
    for (let i = 0; i < spikes; i++) {
      const t = i / (spikes - 1); // 0 front → 1 back
      const ang = -0.6 + t * 1.9;
      const ny = Math.cos(ang) * r;
      const nz = -Math.sin(ang) * r;
      const h = 0.07 + 0.07 * Math.sin(t * Math.PI);
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.05, h, 12), material);
      spike.position.set(0, capY + ny, nz);
      const normal = new THREE.Vector3(0, ny, nz).normalize();
      spike.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
      spike.translateY(h / 2 - 0.02); // push outward so the base sits on the scalp
      group.add(spike);
    }
  }
  return group;
}

// `accentMaterial` (the bottom color) is used only by the overalls bib + straps,
// so the dungarees track whatever bottom color is selected
function makeShirtVariant(id, material, accentMaterial) {
  const group = new THREE.Group();
  const top = ANCHORS.shoulder + 0.02;
  const bottom = id === "crop" ? (ANCHORS.shoulder + ANCHORS.waist) / 2 + 0.02 : ANCHORS.waist+0.025;
  const h = top - bottom;
  const tube = new THREE.Mesh(
    new THREE.CylinderGeometry(BODY.torsoRadius + 0.001, BODY.torsoRadius + 0.02, h, 28),
    material,
  );
  tube.position.y = (top + bottom) / 2;
  group.add(tube);

  if (id !== "tank") {
    // tee / crop / long all share short cap sleeves; tank is strapless
    for (const side of [-1, 1]) {
      const sleeve = new THREE.Mesh(
        new THREE.SphereGeometry(BODY.armRadius + 0.018, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.6),
        material,
      );
      sleeve.position.set(side * BODY.shoulderHalfWidth * 0.82, ANCHORS.shoulder, 0);
      sleeve.rotation.z = side * 0.32;
      group.add(sleeve);
    }
  }

  if (id === "long") {
    // full sleeves down the arms — match arm position/rotation in makeArms
    for (const side of [-1, 1]) {
      const sleeveLen = BODY.armLength * 0.8;
      const sleeve = new THREE.Mesh(
        new THREE.CylinderGeometry(BODY.armRadius + 0.012, BODY.armRadius + 0.001, sleeveLen, 16),
        material,
      );
      const arm = new THREE.Group();
      arm.position.set(side * BODY.shoulderHalfWidth * 0.82, ANCHORS.shoulder, 0);
      arm.rotation.z = side * 0.32;
      sleeve.position.y = -sleeveLen / 2;
      arm.add(sleeve);
      group.add(arm);
    }
  }

  if (id === "overalls" && accentMaterial) {
    // dungaree bib + straps laid over the tee base, in the bottom's color
    const bibTop = ANCHORS.chest - 0.02;
    const bibBottom = ANCHORS.waist + 0.02;
    const bibH = bibTop - bibBottom;
    const bibR = BODY.torsoRadius + 0.025; // just outside the tee tube
    const bib = new THREE.Mesh(
      new THREE.CylinderGeometry(
        bibR,
        bibR,
        bibH,
        24,
        1,
        true,
        Math.PI / 2 - Math.PI / 3.4,
        Math.PI / 1.7,
      ),
      accentMaterial,
    );
    bib.material.side = THREE.DoubleSide;
    bib.position.y = (bibTop + bibBottom) / 2;
    group.add(bib);

    for (const side of [-1, 1]) {
      const front = new THREE.Vector3(side * 0.06, bibTop, BODY.torsoRadius + 0.03);
      const over = new THREE.Vector3(side * 0.085, ANCHORS.shoulder + 0.04, 0);
      const back = new THREE.Vector3(side * 0.06, ANCHORS.waist + 0.08, -BODY.torsoRadius - 0.03);
      const curve = new THREE.CatmullRomCurve3([front, over, back]);
      const strap = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 24, 0.014, 8, false),
        accentMaterial,
      );
      group.add(strap);
      const button = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.012, 0.012, 12),
        accentMaterial,
      );
      button.rotation.x = Math.PI / 2;
      button.position.set(side * 0.06, bibTop - 0.005, BODY.torsoRadius + 0.04);
      group.add(button);
    }
  }

  return group;
}

// yoke + crotch seat + two trouser legs — shared by pants and overalls
function addTrouserBase(group, material, waistY) {
  const yokeHeight = 0.1;
  const seatY = waistY - yokeHeight + 0.01;
  const yokeBottomR = BODY.hipHalfWidth + BODY.legRadius + 0.0;
  const yoke = new THREE.Mesh(
    new THREE.CylinderGeometry(BODY.torsoRadius + 0.02, yokeBottomR + 0.005, yokeHeight, 28),
    material,
  );
  yoke.position.y = 0.025 + waistY - yokeHeight / 2;
  group.add(yoke);

  // seat cap fills the crotch so no skin shows between the legs;
  // its widest point sits exactly at the yoke's bottom edge for a flush join
  const seat = new THREE.Mesh(
    new THREE.SphereGeometry(yokeBottomR + 0.005, 24, 16),
    material,
  );
  seat.position.y = 0.025 + seatY;
  seat.scale.set(1, 0.6, 1);
  group.add(seat);

  const legTop = seatY + 0.05;
  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(
      new THREE.CylinderGeometry(BODY.legRadius + 0.0075, BODY.legRadius + 0.0175, legTop - ANCHORS.ankle - 0.03, 20),
      material,
    );
    leg.position.set(side * BODY.hipHalfWidth, 0.03 + (legTop + ANCHORS.ankle) / 2, 0);
    group.add(leg);
  }
}

function makeBottomVariant(id, material) {
  const group = new THREE.Group();
  const waistY = ANCHORS.waist;
  if (id === "skirt") {
    const h = 0.26;
    const skirt = new THREE.Mesh(
      new THREE.CylinderGeometry(BODY.torsoRadius + 0.01, BODY.torsoRadius + 0.13, h, 28, 1, true),
      material,
    );
    skirt.position.y = 0.05 + waistY - h / 2;
    skirt.material.side = THREE.DoubleSide;
    group.add(skirt);
    const hem = new THREE.Mesh(
      new THREE.RingGeometry(BODY.torsoRadius + 0.03, BODY.torsoRadius + 0.13, 28),
      material,
    );
    hem.rotation.x = Math.PI / 2;
    hem.position.y = 0.05 + waistY - h;
    hem.material.side = THREE.DoubleSide;
    group.add(hem);
  } else if (id === "pants") {
    addTrouserBase(group, material, waistY);
  } else if (id === "shorts") {
    const yokeHeight = 0.1;
    const shortsHeight = 0.1;
    const seatY = waistY - yokeHeight +0.01;
    const shortsBottomR = BODY.hipHalfWidth + BODY.legRadius + 0.0;
    const shorts = new THREE.Mesh(
      new THREE.CylinderGeometry(BODY.torsoRadius + 0.02, shortsBottomR + 0.005, shortsHeight, 28),
      material,
    );
    shorts.position.y = 0.025 + waistY - shortsHeight / 2;
    group.add(shorts);

    const seat = new THREE.Mesh(
      new THREE.SphereGeometry(shortsBottomR + 0.005, 24, 16),
      material,
    );
    seat.position.y = 0.025+seatY;
    seat.scale.set(1, 0.6, 1);
    group.add(seat);

    for (const side of [-1, 1]) {
      const cuff = new THREE.Mesh(
        new THREE.CylinderGeometry(BODY.legRadius + 0.0075, BODY.legRadius + 0.0175, 0.2, 18),
        material,
      );
      cuff.position.set(side * BODY.hipHalfWidth, 0.015 + waistY - shortsHeight - 0.005, 0);
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
      upper.position.set(side * 0.3, anchorY + 0.08, anchorZ-0.15);
      upper.rotation.y = side * 0.5;
      upper.rotation.z = side * -0.1;
      group.add(upper);
      const lower = new THREE.Mesh(new THREE.CircleGeometry(0.24, 28), material);
      lower.position.set(side * 0.28, anchorY - 0.2, anchorZ-0.15);
      lower.rotation.y = side * 0.5;
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
      wing.position.set(side * 0.12, anchorY + 0.05, anchorZ-0.05);
      wing.rotation.y = side * 0.2;
      wing.scale.x = side;
      group.add(wing);
    }
  } else if (id === "bat") {
    // scalloped membrane silhouette via THREE.Shape
    for (const side of [-1, 1]) {
      const shape = new THREE.Shape();
      shape.moveTo(0, 0.3);
      shape.lineTo(0.85, 0.26);
      shape.quadraticCurveTo(0.78, 0.02, 0.7, 0.1);
      shape.quadraticCurveTo(0.64, -0.1, 0.55, 0.03);
      shape.quadraticCurveTo(0.48, -0.16, 0.38, -0.02);
      shape.quadraticCurveTo(0.3, -0.18, 0.2, -0.06);
      shape.quadraticCurveTo(0.12, -0.12, 0.0, 0.08);
      const geom = new THREE.ShapeGeometry(shape);
      const mesh = new THREE.Mesh(geom, material);
      mesh.position.set(side * 0.001, anchorY-0.15, anchorZ);
      mesh.rotation.y = side * 0.2;
      mesh.rotation.z = side * 0.35;
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
    new THREE.TorusGeometry(0.125, 0.01, 12, 48),
    material,
  );
  halo.rotation.x = Math.PI / 2;
  halo.position.y = ANCHORS.headTop + 0.08;
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
    const outer = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.16, 20), material);
    outer.position.set(side * 0.15, ANCHORS.headTop - 0.01, -0.015);
    outer.rotation.z = side * -0.4;
    outer.rotation.y = Math.PI/5;
    outer.scale.set(1.75, 1, 0.5);
    ears.add(outer);
    const inner = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.1, 30), innerMat);
    inner.position.set(side * 0.15, ANCHORS.headTop - 0.01, 0.0005);
    inner.rotation.copy(outer.rotation);
    inner.scale.set(1, 0.7, 0.5);
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
      { t: Math.PI / 6, len: 0.02, r: 0.06 },
      { t: Math.PI / 3, len: 0.02, r: 0.054 },
      { t: Math.PI / 2, len: 0.02, r: 0.054 },
      { t: Math.PI / 1.5, len: 0.02, r: 0.054 },
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
  const yLocal = -0.09;
  const halfX = 0.03;
  for (const side of [-1, 1]) {
    const xLocal = side * halfX;
    const zLocal = Math.sqrt(
      Math.max(0, BODY.headRadius * BODY.headRadius - yLocal * yLocal - xLocal * xLocal),
    );
    const pivot = new THREE.Group();
    pivot.position.set(0, ANCHORS.headCenter, 0);
    const normal = new THREE.Vector3(xLocal, yLocal, zLocal).normalize();
    pivot.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);

    // arc built from a chain of beads with shrinking radius — tapers the outer
    // edge to a rounded point while the inner end keeps the full tube thickness
    const half = new THREE.Group();
    const N = 16;
    const arcRadius = 0.02;
    const arcSweep = Math.PI * 0.7;
    const baseTube = 0.012;
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const beta = t * arcSweep;
      // side>0 (rotation.z=π): β=0 → toward center, β=0.7π → outer (tip at t=1)
      // side<0 (rotation.z=-0.7π): β=0 → outer, β=0.7π → toward center (tip at t=0)
      const tipFraction = side > 0 ? t : 1 - t;
      const tube = baseTube * (1 - tipFraction * tipFraction * 0.92);
      const bead = new THREE.Mesh(new THREE.SphereGeometry(tube, 10, 8), material);
      bead.position.set(arcRadius * Math.cos(beta), arcRadius * Math.sin(beta), 0);
      half.add(bead);
    }
    half.position.z = BODY.headRadius - 0.001;
    half.scale.set(1.1, 1, 1);
    half.rotation.z = side > 0 ? Math.PI : -Math.PI * 0.7;
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

function buildSocks(material) {
  const group = new THREE.Group();
  const sockBottom = ANCHORS.ankle + 0.0;
  const sockTop = ANCHORS.ankle + 0.22; // mid-shin
  const sockH = sockTop - sockBottom;
  for (const side of [-1, 1]) {
    const sock = new THREE.Mesh(
      new THREE.CylinderGeometry(BODY.legRadius + 0.005, BODY.legRadius + 0.001, sockH, 20),
      material,
    );
    sock.position.set(side * BODY.hipHalfWidth, (sockBottom + sockTop) / 2, 0);
    group.add(sock);
    // rolled cuff at the top — slightly thicker torus to suggest a folded edge
    const cuff = new THREE.Mesh(
      new THREE.TorusGeometry(BODY.legRadius + 0.001, 0.001, 20, 20),
      material,
    );
    cuff.rotation.x = Math.PI / 2;
    cuff.position.set(side * BODY.hipHalfWidth, sockTop, 0);
    group.add(cuff);
  }
  return group;
}

// pivot at head center oriented so its local +z is the head-surface normal at
// (xLocal, yLocal); place children at z ≈ BODY.headRadius to sit flush on the face
function headSurfacePivot(xLocal, yLocal) {
  const zLocal = Math.sqrt(
    Math.max(0, BODY.headRadius * BODY.headRadius - yLocal * yLocal - xLocal * xLocal),
  );
  const pivot = new THREE.Group();
  pivot.position.set(0, ANCHORS.headCenter, 0);
  const normal = new THREE.Vector3(xLocal, yLocal, zLocal).normalize();
  pivot.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
  return pivot;
}

function heartShape(s) {
  const shape = new THREE.Shape();
  shape.moveTo(0, -0.6 * s);
  shape.bezierCurveTo(0, -0.3 * s, 0.5 * s, -0.1 * s, 0.5 * s, 0.25 * s);
  shape.bezierCurveTo(0.5 * s, 0.55 * s, 0.2 * s, 0.62 * s, 0, 0.4 * s);
  shape.bezierCurveTo(-0.2 * s, 0.62 * s, -0.5 * s, 0.55 * s, -0.5 * s, 0.25 * s);
  shape.bezierCurveTo(-0.5 * s, -0.1 * s, 0, -0.3 * s, 0, -0.6 * s);
  return shape;
}

function starShape(outer, inner, points = 5) {
  const shape = new THREE.Shape();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

function buildGlasses(material) {
  const glasses = new THREE.Group();
  const eyeX = 0.085;
  const eyeY = -0.05; // sit low on the face, around/below the eyes
  for (const side of [-1, 1]) {
    const pivot = headSurfacePivot(side * eyeX, eyeY);
    const frame = new THREE.Mesh(
      new THREE.TorusGeometry(0.058, 0.0035, 10, 32),
      material,
    );
    frame.position.z = BODY.headRadius - 0.001;
    frame.scale.set(1.12, 1, 1);
    pivot.add(frame);
    // short temple arm sweeping back toward the ear
    const arm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0035, 0.0035, 0.08, 8),
      material,
    );
    arm.rotation.z = Math.PI / 2;
    arm.position.set(side * 0.07, 0.01, BODY.headRadius - 0.035);
    arm.rotation.y = side * 0.6;
    pivot.add(arm);
    glasses.add(pivot);
  }
  // bridge across the nose
  const bridge = headSurfacePivot(0, eyeY + 0.005);
  const bar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0035, 0.0035, 0.045, 8),
    material,
  );
  bar.rotation.z = Math.PI / 2;
  bar.position.z = BODY.headRadius - 0.001;
  bridge.add(bar);
  glasses.add(bridge);
  return glasses;
}

function buildFreckles(material) {
  const freckles = new THREE.Group();
  const layout = [
    // nose bridge
    { x: 0.0, y: -0.048, r: 0.0045 },
    { x: 0.014, y: -0.058, r: 0.003 },
    { x: -0.014, y: -0.058, r: 0.003 },
    // inner cheeks
    { x: 0.034, y: -0.062, r: 0.005 },
    { x: -0.034, y: -0.062, r: 0.005 },
    { x: 0.05, y: -0.052, r: 0.0035 },
    { x: -0.05, y: -0.052, r: 0.0035 },
    // mid cheeks
    { x: 0.066, y: -0.07, r: 0.0055 },
    { x: -0.066, y: -0.07, r: 0.0055 },
    { x: 0.084, y: -0.062, r: 0.003 },
    { x: -0.084, y: -0.062, r: 0.003 },
    // outer cheeks
    { x: 0.1, y: -0.078, r: 0.005 },
    { x: -0.1, y: -0.078, r: 0.005 },
    { x: 0.088, y: -0.098, r: 0.0035 },
    { x: -0.088, y: -0.098, r: 0.0035 },
    { x: 0.112, y: -0.094, r: 0.003 },
    { x: -0.112, y: -0.094, r: 0.003 },
  ];
  for (const { x, y, r } of layout) {
    const pivot = headSurfacePivot(x, y);
    const dot = new THREE.Mesh(new THREE.CircleGeometry(r, 12), material);
    dot.position.z = BODY.headRadius + 0.0008;
    pivot.add(dot);
    freckles.add(pivot);
  }
  return freckles;
}

function buildFlowerCrown(material) {
  const crown = new THREE.Group();
  const crownY = ANCHORS.headCenter + 0.12;
  const headXZ = Math.sqrt(
    Math.max(0, BODY.headRadius * BODY.headRadius - (crownY - ANCHORS.headCenter) ** 2),
  );
  const ringR = headXZ + 0.02;
  const N = 14; // full ring around the head
  for (let i = 0; i < N; i++) {
    const alpha = (i / N) * Math.PI * 2;
    const x = ringR * Math.cos(alpha);
    const z = ringR * Math.sin(alpha);
    const flower = new THREE.Group();
    flower.position.set(x, crownY + (i % 2) * 0.012, z);
    flower.rotation.y = Math.PI / 2 - alpha; // local +z faces outward
    const petalR = 0.022;
    for (let p = 0; p < 5; p++) {
      const a = (p / 5) * Math.PI * 2;
      const petal = new THREE.Mesh(new THREE.SphereGeometry(petalR, 8, 6), material);
      petal.position.set(Math.cos(a) * petalR, Math.sin(a) * petalR, 0);
      petal.scale.set(1, 1, 0.5);
      flower.add(petal);
    }
    const center = new THREE.Mesh(new THREE.SphereGeometry(petalR * 0.7, 8, 6), material);
    center.scale.set(1, 1, 0.6);
    flower.add(center);
    crown.add(flower);
  }
  return crown;
}

function buildAntennae(material) {
  const antennae = new THREE.Group();
  for (const side of [-1, 1]) {
    const stalk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.004, 0.008, 0.18, 8),
      material,
    );
    stalk.position.set(side * 0.07, ANCHORS.headTop + 0.06, -0.01);
    stalk.rotation.z = side * -0.35;
    antennae.add(stalk);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.025, 12, 10), material);
    tip.position.set(side * 0.13, ANCHORS.headTop + 0.15, -0.01);
    antennae.add(tip);
  }
  return antennae;
}

function buildBlushHeart(material) {
  const group = new THREE.Group();
  const cheekX = 0.12;
  const cheekY = -0.075;
  for (const side of [-1, 1]) {
    const pivot = headSurfacePivot(side * cheekX, cheekY);
    const heart = new THREE.Mesh(new THREE.ShapeGeometry(heartShape(0.036)), material);
    heart.position.z = BODY.headRadius + 0.0009;
    pivot.add(heart);
    group.add(pivot);
  }
  return group;
}

function buildBlushStar(material) {
  const group = new THREE.Group();
  const cheekX = 0.12;
  const cheekY = -0.075;
  for (const side of [-1, 1]) {
    const pivot = headSurfacePivot(side * cheekX, cheekY);
    const star = new THREE.Mesh(
      new THREE.ShapeGeometry(starShape(0.028, 0.013)),
      material,
    );
    star.position.z = BODY.headRadius + 0.0009;
    pivot.add(star);
    group.add(pivot);
  }
  return group;
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
    } else if (def.id === "lashes" || def.id === "freckles") {
      mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(def.defaultColor) });
    } else if (def.id === "blushHeart" || def.id === "blushStar") {
      mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(def.defaultColor),
        transparent: true,
        opacity: 0.92,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
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
    else if (def.id === "socks") node = buildSocks(mat);
    else if (def.id === "glasses") node = buildGlasses(mat);
    else if (def.id === "freckles") node = buildFreckles(mat);
    else if (def.id === "flowerCrown") node = buildFlowerCrown(mat);
    else if (def.id === "antennae") node = buildAntennae(mat);
    else if (def.id === "blushHeart") node = buildBlushHeart(mat);
    else if (def.id === "blushStar") node = buildBlushStar(mat);

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
  let shirtGroup = makeShirtVariant(state.variants.shirt, shirtMat, bottomMat);

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
    } else if (partId === "shirt") {
      root.remove(shirtGroup);
      shirtGroup = makeShirtVariant(variantId, shirtMat, bottomMat);
      root.add(shirtGroup);
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
    { id: "hair", label: "⋆.˚⟡ hair styles ⟡˚.⋆", options: ["bob", "long", "pigtails", "bun", "afro", "fade", "twinbuns", "braids", "mohawk"] },
    { id: "shirt", label: "⊹˚. ♡ shirts ♡ .˚⊹", options: ["tee", "tank", "crop", "long", "overalls"] },
    { id: "bottom", label: "*ೃ.⋆❀ bottoms ❀⋆.ೃ࿔*", options: ["skirt", "pants", "shorts"] },
    { id: "wings", label: "꒰ა ⊹ wings ⊹ ࣪໒꒱", options: ["off", "butterfly", "angel", "bat"] },
  ],
  accessories: ACCESSORY_DEFS.map(({ id, label, defaultColor }) => ({
    id,
    label, 
    defaultColor,
  })),
};
