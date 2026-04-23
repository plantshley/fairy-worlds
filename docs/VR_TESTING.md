# VR testing without a headset

Fairy worlds has WebXR wired into [src/sceneManager.js](../src/sceneManager.js) +
[src/three/vrButton.js](../src/three/vrButton.js) +
[src/three/vrLocomotion.js](../src/three/vrLocomotion.js). The "✦ open in VR ✦"
button lives in the world-mode HUD. To exercise it without owning a headset,
use a browser emulator.

## Emulator: WebXR API Emulator

- **Name:** WebXR API Emulator (originally by Mozilla, now maintained by Meta)
- **Install:** Chrome Web Store or Firefox Add-ons — search "WebXR API Emulator"
- **Usage:**
  1. Install + reload any browser tabs that were already open
  2. Open DevTools → new **WebXR** tab appears
  3. Pick a device profile (e.g. "Meta Quest 3" or "Generic Headset")
  4. Load `http://localhost:5173` → the VR button label should switch to
     `✦ open in VR ✦` (instead of `no VR device`)
  5. Click the button — scene renders stereo (two eye viewports side by side)

The DevTools panel gives you drag-handles for head pose and each controller,
plus thumbstick sliders, trigger/grip buttons, and a set of preset poses.

## What to check

### Session basics
- [ ] Clicking `✦ open in VR ✦` starts a session (label flips to `✦ exit VR ✦`)
- [ ] Canvas renders two eye viewports
- [ ] Clicking `✦ exit VR ✦` ends the session cleanly; SparkControls take over again on desktop
- [ ] HUD still visible on desktop mirror while session is active (headset doesn't see DOM)

### Head pose
- [ ] Drag the emulator's head in DevTools — world rotates/translates in the scene view
- [ ] Scene spawn position from [src/data/scenes.js](../src/data/scenes.js) is where you start

### Locomotion
Implemented in [src/three/vrLocomotion.js](../src/three/vrLocomotion.js). Dead zone
0.15, move speed 2 m/s, snap turn 30°.

- [ ] **Left thumbstick forward** → translate forward (relative to head direction)
- [ ] **Left thumbstick back/strafe** → back + side movement work
- [ ] **Right thumbstick flick left/right past 0.8** → 30° snap turn
- [ ] Right stick re-arms after returning near center (can't hold for continuous spin)

### Likely first failure mode
Three.js WebXR typically respects `camera.position` / `camera.rotation` as a
player-rig offset, but some versions ignore direct rotation on the user camera.
**If the left stick doesn't translate, or the right stick doesn't rotate the
view**, the fix is to wrap the camera in a dolly `THREE.Group` and move/rotate
the group instead of the camera. The current code does direct
`camera.position.add(...)` and `camera.rotation.y += ...` in
[src/three/vrLocomotion.js](../src/three/vrLocomotion.js).

If that fix is needed, the pattern is:
```js
const dolly = new THREE.Group();
dolly.add(camera);
scene.add(dolly);
// then move dolly.position / dolly.rotation.y instead of camera's
```

### Collision
- [ ] You will walk through splat "geometry" (splats aren't solid) — expected,
      not a bug
- [ ] Fix later by adding an invisible floor + wall mesh per scene

## Limitations of the emulator

- Performance is not representative of a real headset — don't panic about frame rate
- No lens distortion, proper IPD, or depth — just two flat viewports
- Hand tracking emulates poorly; stick to controllers
- Some WebXR features (passthrough, AR) need a real device

## Features not yet implemented

- Teleport locomotion (alternative to smooth movement — some people need it for comfort)
- Controller models visible in the scene
- UI / picker interaction from inside VR (currently DOM-only, not shown in headset)
- VR in home mode (button is world-mode only)
- Collision with splat scenes
