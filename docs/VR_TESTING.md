# VR testing without a headset

Fairy worlds has WebXR wired into [src/sceneManager.js](../src/sceneManager.js) +
[src/three/vrButton.js](../src/three/vrButton.js) +
[src/three/vrLocomotion.js](../src/three/vrLocomotion.js) +
[src/modes/world.js](../src/modes/world.js). The "✦ open in VR ✦" label is
attached to the companion speech bubble in world mode — clicking the bubble
starts/exits the session. To exercise it without owning a headset, use a
browser emulator.

## In-VR controls (HTC VIVE wand mapping, target headset)

Single-trigger vs. double-trigger is edge-detected in
[src/three/vrButton.js](../src/three/vrButton.js) with a 250ms window — a second
trigger on the same hand within that window upgrades the action.

| Input | Action | Wired in |
| --- | --- | --- |
| Left trackpad axes | Walk (forward/back/strafe relative to head direction) | [src/three/vrLocomotion.js](../src/three/vrLocomotion.js) |
| Right trackpad X-axis flick (past 0.8) | 30° snap-turn (left or right) | [src/three/vrLocomotion.js](../src/three/vrLocomotion.js) |
| **Right wand trigger** — single click | **Next scene** (cycles in [SCENES](../src/data/scenes.js) order, wraps at end) | [src/three/vrButton.js](../src/three/vrButton.js) → [src/main.js](../src/main.js) → `worldMode.cycleScene(1)` |
| **Left wand trigger** — single click | **Previous scene** (wraps at start) | same |
| **Right wand trigger** — double click | **Next world group** (jumps to the first scene of the next world) | [src/three/vrButton.js](../src/three/vrButton.js) → `worldMode.cycleWorld(1)` |
| **Left wand trigger** — double click | **Previous world group** | same |
| **Either wand menu button** (gamepad button[3]) — real-hardware | **Return to spawn** — yaw-recenters dolly so head is back at the scene's defined spawn position/yaw. On Quest Touch this is the thumbstick click instead. | [src/modes/world.js](../src/modes/world.js) `pollRecenterButton` → `returnToOrigin` |
| **Both triggers simultaneously** (left + right selectstart within 250ms) — emulator-friendly | **Return to spawn** (same as above). Provided because the WebXR Emulator's HTC Vive profile only exposes select + squeeze, not menu/touchpad-press. Cross-hand gesture, so it doesn't collide with single-hand single/double trigger actions. | [src/three/vrButton.js](../src/three/vrButton.js) `onSelectStart` → `onRecenter` → [src/main.js](../src/main.js) → `worldMode.returnToOrigin()` |
| **Either wand grip** (`squeezestart`) | **Exit VR session** | [src/three/vrButton.js](../src/three/vrButton.js) calls `currentSession.end()` |

### Spawn behavior when cycling

Defined in [src/modes/world.js](../src/modes/world.js) `loadScene`:

- **Single-trigger within the same world group:** the splat reloads but the
  dolly is NOT touched — your headset stays where you walked to. This makes
  flipping between versions of the same world (e.g. heart-pool-1-1-1004 →
  heart-pool-1-1-1006) feel like a wardrobe-change rather than a teleport.
- **Single-trigger that crosses a world boundary** (last scene of one world →
  first scene of next world): yaw-recenter to the new scene's spawn.
- **Double-trigger (cycleWorld):** lands on the first scene of the
  next/previous group, which always crosses a world boundary, so it always
  yaw-recenters.
- **Random group exception:** the `world: "Random"` group is a catchall for
  unrelated scenes (ocean-breeze-office, fairy-kitchen, animal-crossing),
  not a coherent world. Every cycle within Random recenters, because the
  scenes share nothing geometrically. See the `isNewWorld` check in
  `loadScene`.
- **VR session start:** [src/main.js](../src/main.js) wires `onSessionStart` →
  `worldMode.recenterToCurrentSpawn()` so entering VR on a scene that was
  loaded on desktop snaps the dolly to spawn (loadScene's VR branch only
  fires if isPresenting was true at load time).
- **Manual recenter:** the desktop `⊙` button in the world HUD (left of the
  "click canvas" hint, floating above the companion on touch) calls
  `worldMode.returnToOrigin()`. In VR, the menu button does the same.

## Emulator: WebXR API Emulator

- **Name:** WebXR API Emulator (originally by Mozilla, now maintained by Meta)
- **Install:** Chrome Web Store or Firefox Add-ons — search "WebXR API Emulator"
- **Usage:**
  1. Install + reload any browser tabs that were already open
  2. Open DevTools → new **WebXR** tab appears
  3. Pick a device profile — **HTC Vive** is closest to the target hardware;
     **Meta Quest 3** also works for testing
  4. Load `http://localhost:5173` → the companion bubble should switch to
     `✦ open in VR ✦` (instead of `✦ no VR device ✦`)
  5. Click the bubble — scene renders stereo (two eye viewports side by side)

The DevTools panel gives you drag-handles for head pose and each controller,
plus thumbstick sliders, trigger/grip/menu/touchpad buttons, and a set of
preset poses.

## What to check

### Session basics
- [ ] Clicking the `✦ open in VR ✦` bubble starts a session (label flips to `✦ exit VR ✦`)
- [ ] Canvas renders two eye viewports
- [ ] Clicking the bubble again, OR either grip in the emulator, ends the session cleanly; SparkControls take over again on desktop
- [ ] HUD still visible on desktop mirror while session is active (headset doesn't see DOM)

### Head pose
- [ ] Drag the emulator's head in DevTools — world rotates/translates in the scene view
- [ ] Scene spawn position from [src/data/scenes.js](../src/data/scenes.js) is where you start

### Locomotion
Implemented in [src/three/vrLocomotion.js](../src/three/vrLocomotion.js).
Dead zone 0.15, move speed 2 m/s, snap turn 30°. The render loop and
button-polling for return-to-spawn live in
[src/modes/world.js](../src/modes/world.js) `update`.

- [ ] **Left thumbstick forward** → translate forward (relative to head direction)
- [ ] **Left thumbstick back/strafe** → back + side movement work
- [ ] **Right thumbstick flick left/right past 0.8** → 30° snap turn
- [ ] Right stick re-arms after returning near center (can't hold for continuous spin)

### Single + double trigger (WebXR Emulator steps)
Wired in [src/three/vrButton.js](../src/three/vrButton.js) +
[src/main.js](../src/main.js).

The Emulator's panel has, per controller, a row of buttons labeled
**Trigger / Grip / Touchpad / Button A / Button B**. Clicking **Trigger**
fires `selectstart`; **Grip** fires `squeezestart`. Other buttons map by
gamepad index — see the next section for menu-button (button[3]) caveats.

- [ ] Set device to **HTC Vive** (two controllers, handedness `left` / `right`)
- [ ] Enter VR, then:
  - [ ] Single click **right controller → Trigger** → wait ~250ms → splat reloads,
        next scene in array order. Wraps from `animal-crossing` back to
        `heart-pool-1-1-1004`.
  - [ ] Single click **left controller → Trigger** → previous scene. Wraps backward.
  - [ ] **Double click** the right Trigger within 250ms → skips to the first scene
        of the next `world` group (e.g. heart-pool → berry-dream-kitchen).
  - [ ] **Double click** the left Trigger within 250ms → first scene of the
        previous group.
  - [ ] Click **either Grip** → VR session ends, bubble flips back to
        `✦ open in VR ✦`, DOM picker is interactable again.

### Return-to-spawn
Two paths to fire `returnToOrigin`:

**Emulator path (HTC Vive profile)** — the WebXR API Emulator's HTC Vive
profile only exposes select (trigger) + squeeze (grip) per controller.
Use the cross-hand simultaneous-trigger gesture:

- [ ] Walk a few meters from the spawn point with the left stick
- [ ] In the Emulator panel, click **left controller → Trigger**, then within
      ~250ms click **right controller → Trigger** (or vice versa)
- [ ] Headset snaps back to the scene's spawn position with spawn yaw
- [ ] Tradeoff to be aware of: a deliberate "left-cycle then right-cycle"
      within 250ms is now consumed as recenter. If you wanted prev+next in
      quick succession you need to wait out the window between them.

**Real-hardware path (HTC Vive wand)** — use the menu button (button[3]).
On Quest Touch controllers this is the thumbstick click. Wired in
[src/modes/world.js](../src/modes/world.js) `pollRecenterButton` (polls each
frame, rising-edge detection).

- [ ] Pitch and roll are intentionally preserved (a tilted dolly is nauseating)
- [ ] Holding the button down only fires once. Release and press again to fire twice.

### Random world group recenter
- [ ] Cycle to a scene in the **Random** group (e.g. ocean-breeze-office)
- [ ] Walk a few meters
- [ ] Single-trigger to the next Random scene (fairy-kitchen)
- [ ] Confirm headset recenters to the new spawn — even though both scenes
      share `world: "Random"`, the group is treated as a catchall, so every
      cycle within it recenters

### Companion bubble + world picker sync
- [ ] World-picker highlight in the side rail updates as you cycle (driven by
      `onSceneLoaded` callback in [src/modes/world.js](../src/modes/world.js))
- [ ] Cycling rapidly (multiple trigger clicks before splat finishes loading)
      does not crash — `loadToken` in `loadScene` cancels stale loads

### Desktop / mobile recenter button
Not VR, but the same `returnToOrigin` path:

- [ ] On desktop, the `⊙` button sits to the left of the "click canvas" hint
      in the top-right HUD. Clicking it resets the camera to scene spawn.
- [ ] On touch (phone/tablet), the `⊙` button is rendered inside the
      `#companion` container and tracks the character's head every frame via
      the same projection used by the desktop speech bubble (see
      [src/ui/companion.js](../src/ui/companion.js) — it gets a
      `translate(-50%, Ypx)` written each frame).

### Collision
- [ ] You will walk through splat "geometry" (splats aren't solid) — expected,
      not a bug
- [ ] Fix later by adding an invisible floor + wall mesh per scene

## Limitations of the emulator

- Performance is not representative of a real headset — don't panic about frame rate
- No lens distortion, proper IPD, or depth — just two flat viewports
- Hand tracking emulates poorly; stick to controllers
- Some WebXR features (passthrough, AR) need a real device
- Emulator button naming is inconsistent across device profiles — the
  important thing is which gamepad button index fires, not the label

## Features not yet implemented

- Teleport locomotion (alternative to smooth movement — some people need it for comfort)
- Controller models visible in the scene
- 3D in-VR scene picker (current single/double trigger works for navigating,
  but jump-to-specific-scene requires exiting VR and using the DOM picker)
- VR in home mode (button is world-mode only)
- Collision with splat scenes
