// Procedural-doll walk cycle for the rigged procedural character. Ported from
// the SDSHC games-hub farm-world (the doll there is a fork of this repo's
// procedural fairy). `limbs` are the shoulder/hip pivots exposed by
// createProceduralCharacter; `carrier` is the holder group that bobs (and
// stashes walkT in its userData). While moving, the limbs swing and the body
// bobs; idle, they settle to neutral with a gentle breathing bob. `amp` scales
// the limb arcs and `freq` the cycle rate.
export function stepGait(limbs, carrier, moving, dt, t, { phase = 0, amp = 1, freq = 10.5 } = {}) {
  if (moving) {
    carrier.userData.walkT = (carrier.userData.walkT || 0) + dt * freq;
    const s = Math.sin(carrier.userData.walkT);
    limbs.legL.rotation.x = s * 0.65 * amp;
    limbs.legR.rotation.x = -s * 0.65 * amp;
    limbs.armL.rotation.x = -s * 0.5 * amp;
    limbs.armR.rotation.x = s * 0.5 * amp;
    carrier.position.y = Math.abs(s) * 0.05 * amp;
    carrier.rotation.x = 0.05; // slight forward lean
  } else {
    const settle = Math.min(1, dt * 8);
    [limbs.legL, limbs.legR, limbs.armL, limbs.armR].forEach((p) => {
      p.rotation.x -= p.rotation.x * settle;
    });
    carrier.rotation.x -= carrier.rotation.x * settle;
    carrier.position.y += (0.02 + Math.sin(t * 2.2 + phase) * 0.02 - carrier.position.y) * settle;
  }
}
