# VR testing without a headset

Fairy worlds has WebXR wired into [src/sceneManager.js](../src/sceneManager.js) +
[src/three/vrButton.js](../src/three/vrButton.js) +
[src/three/vrLocomotion.js](../src/three/vrLocomotion.js) +
[src/three/portals.js](../src/three/portals.js) +
[src/modes/world.js](../src/modes/world.js). The "✦ open in VR ✦" label is
attached to the companion speech bubble in world mode — clicking the bubble
starts/exits the session. To exercise it without owning a headset, use a
browser emulator.

## VR Controls Guide (for players)

Pick a character, step into a world, and put the headset on.

**First, the natural stuff:** just **look around and walk** like you normally
would — turn your head, lean in, take real steps. The headset tracks your body,
so your view moves with you inside your room's play space. The wand controls
below are for when you want to travel *farther than your room allows* or turn
without physically spinning (handy on the VIVE so you don't wind up the cable).

| You want to… | Do this |
| --- | --- |
| **Look / move a little** | Just move — turn your head and walk around physically. Tracked automatically within your play area. |
| **Walk farther than your room** | Push the **left** thumbstick / trackpad. You move whichever way you're looking — push forward to go forward, pull back to back up, push sideways to strafe. |
| **Turn without spinning yourself** | Flick the **right** thumbstick / trackpad left or right. You snap-turn 30° each flick (comfier than smooth spinning). Flick again to keep turning. |
| **Hop to the next scene** | Pull the **right** trigger. Pull the **left** trigger to go back a scene. |
| **Jump to a whole new world** | Double-pull the **right** trigger (quickly, twice) to jump to the next world; double-pull the **left** trigger for the previous one. |
| **Step through a magic doorway** | Either point a wand at a glowing portal (or a floating character) and pull that wand's trigger — *or just walk into it.* Either way you're whisked to where it leads. Visit the **Portals Glade** for a ring of doorways to every world. |
| **Pick up an object** *(object mode on)* | Point a wand at a droppable object and pull the trigger to grab it. **Let go of the trigger** to drop it. |
| **Drop a new object** *(object mode on)* | Click in (press down) the **right** trackpad / thumbstick to plop a fresh object in front of you. |
| **Reset your spot** | Wandered off or facing the wrong way? Press the **menu button** on either wand to snap back to this world's entrance (your spawn point). It won't leave the world — just repositions you here. |
| **Back to the portals glade** | **Double-tap the menu button** (two quick presses) on either wand to whisk yourself back to the Portals Glade — the ring of doorways to every world. |
| **Take the headset off** | Squeeze the **grip** on either wand to leave VR. |

> 💡 Triggers are context-sensitive. If your wand is aimed at a doorway or a
> grabbable object, the trigger uses *that* first; aimed at empty space, it
> changes rooms. So a portal you're pointing at always wins over "next room."

## In-VR controls (HTC VIVE wand mapping, target headset) — technical

The trigger is **overloaded** and resolved as a priority chain in
[src/three/vrButton.js](../src/three/vrButton.js) `onSelectStart`. On each
trigger pull, in order: (1) if the controller ray hits a **portal**, teleport
through it; else (2) if **object mode** is on and the ray hits a **grabbable**,
grab it; else (3) the cross-hand / double / single **cycle** logic below. The
first match consumes the trigger, so the cycle actions only fire when you're
pointing at empty space.

Single-trigger vs. double-trigger is edge-detected with a 250ms window — a
second trigger on the **same** hand within that window upgrades scene→world; a
trigger on the **other** hand within that window fires recenter instead.

| Input | Action | Wired in |
| --- | --- | --- |
| Left thumbstick / trackpad axes | Walk (forward/back/strafe relative to head direction) | [src/three/vrLocomotion.js](../src/three/vrLocomotion.js) |
| Right thumbstick / trackpad X-axis flick (past 0.8) | 30° snap-turn (left or right) | [src/three/vrLocomotion.js](../src/three/vrLocomotion.js) |
| **Either trigger** aimed at a **portal** | **Teleport** through the portal to its target scene (controller-ray raycast, ≤8m reach). Consumes the trigger — takes priority over grab and cycle. | [src/three/vrButton.js](../src/three/vrButton.js) `onTryPortal` → [src/three/portals.js](../src/three/portals.js) `tryPortal` |
| **Either trigger** aimed at a **grabbable** (object mode on) | **Grab** the object. Release the trigger (`selectend`) to drop it. Consumes the trigger — takes priority over cycle. | [src/three/vrButton.js](../src/three/vrButton.js) `onTryGrab` / `onSelectEnd` → [src/three/grab.js](../src/three/grab.js) |
| **Right wand trackpad/thumbstick press** (gamepad button[2], object mode on) — real-hardware | **Spawn** a new object in front of the head (cycles the scene's mapped GLBs, else a colored box). Gated on object mode so it can't fire while browsing. Not exposed by the WebXR Emulator. | [src/modes/world.js](../src/modes/world.js) `pollSpawnButton` → `spawnBox` |
| **Right wand trigger** — single click (empty space) | **Next scene** (cycles in [SCENES](../src/data/scenes.js) order, **skipping `hideInPicker` scenes**, wraps at end) | [src/three/vrButton.js](../src/three/vrButton.js) → [src/main.js](../src/main.js) → `worldMode.cycleScene(1)` |
| **Left wand trigger** — single click (empty space) | **Previous scene** (wraps at start) | same |
| **Right wand trigger** — double click (empty space) | **Next world group** (jumps to the first scene of the next world) | [src/three/vrButton.js](../src/three/vrButton.js) → `worldMode.cycleWorld(1)` |
| **Left wand trigger** — double click (empty space) | **Previous world group** | same |
| **Either wand menu button** (gamepad button[3]) — single tap, real-hardware | **Return to spawn** — yaw-recenters dolly so head is back at the scene's defined spawn position/yaw. On Quest Touch this is the thumbstick click instead. | [src/modes/world.js](../src/modes/world.js) `pollRecenterButton` → `returnToOrigin` |
| **Either wand menu button** — double tap (two presses within 250ms), real-hardware | **Return to the Portals Glade** from any world (no-op if already at the hub). Recenter still fires on the first tap; the hub jump on the second — the wasted recenter is invisible under the transition fade. **Not testable in the WebXR emulator** (Vive profile exposes no menu button). | [src/modes/world.js](../src/modes/world.js) `pollRecenterButton` → `onReturnToHub` → [src/main.js](../src/main.js) → `worldMode.loadScene(hub)` |
| **Both triggers simultaneously** (left + right selectstart within 250ms, both aimed at empty space) — emulator-friendly | **Return to spawn** (same as above). Provided because the WebXR Emulator's HTC Vive profile only exposes select + squeeze, not menu/touchpad-press. Cross-hand gesture, so it doesn't collide with single-hand single/double trigger actions. | [src/three/vrButton.js](../src/three/vrButton.js) `onSelectStart` → `onRecenter` → [src/main.js](../src/main.js) → `worldMode.returnToOrigin()` |
| **Either wand grip** (`squeezestart`) | **Exit VR session** | [src/three/vrButton.js](../src/three/vrButton.js) calls `currentSession.end()` |

> ⚠️ Because the trigger is a priority chain, the cross-hand recenter gesture
> only fires if **neither** trigger landed on a portal or grabbable. If you're
> aimed at a portal, that trigger teleports instead of contributing to the
> recenter gesture.

### Portals & the hub

Portals are clickable/aimable doorways (and floating character GLBs) placed in
scenes via `sceneDef.portals` in [src/data/scenes.js](../src/data/scenes.js).
The **Portals Glade** (scene id `hub-heart-pool`; still called "the hub" in code
and internal nav-mode) is a dedicated scene holding a ring of 12
portals — one per world — built by
[src/data/hubPortals.js](../src/data/hubPortals.js). Reach it via the flower /
hub button in the HUD. In VR, point a wand at a portal and pull the trigger
([src/three/portals.js](../src/three/portals.js) `tryPortal`); on desktop/touch,
tap it. This is the in-VR "jump to a specific world" path.

**Walk-into entry** (VR + desktop): you can also just move into a portal. The
per-frame proximity check lives in [src/modes/world.js](../src/modes/world.js)
`update` — it measures the head's **XZ** distance to each portal and calls
`enterPortal` when you're inside the portal's `triggerRadius` (doorways: ~half
the door width + 0.3m; GLBs: derived from the bind-pose footprint; override per
portal with `portalDef.triggerRadius`). Each portal uses **arm-on-exit**: it
only becomes "hot" once your head has first left its radius (plus a 1.5×
hysteresis margin), so spawning right next to a return portal can't bounce you
straight back. `enterPortal` is internally guarded by `isActive` /
`portalTransitioning`, so per-frame calls during a fade are cheap no-ops.

**VR pointer + hover:** each controller projects a thin laser
([src/three/portals.js](../src/three/portals.js) `makeRay`) so you can see where
you're aiming. `updateVRHover` (called every frame from
[src/modes/world.js](../src/modes/world.js) `update`) raycasts both wands against
the portal proxies, stretches each laser to its hit point, and toggles the
portal's `onHover` — the same hook desktop pointer-hover uses, so doorways
brighten their halo + emoji label when a wand points at them (a portal stays lit
while *either* wand is on it). The laser turns pink over a portal and is hidden
whenever you're not in a session. GLB-character portals don't have an `onHover`
visual yet, but the laser still shortens to them so you can tell you're on
target.

### Object mode (grab / drop)

Object mode is **on by default** — the HUD toggle persists to
`fairy-worlds-object-mode`, and only an explicit `"0"` disables it (see
`isObjectMode` in [src/modes/world.js](../src/modes/world.js)). When on, scenes
load a Rapier collider and you can spawn droppable GLBs/boxes. In VR, aim a wand
at a dropped object and pull the trigger to grab it; release the trigger to drop.
New objects are spawned via the desktop HUD "drop object" button, or in VR by
pressing the **right wand's trackpad/thumbstick** (`pollSpawnButton`, gated on
object mode). Object mode itself is toggled from the desktop HUD before entering
VR — there's no in-VR toggle.

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
  - [ ] Aim at empty space first (a portal/grabbable under the ray would be used
        instead — see the priority chain above).
  - [ ] Single click **right controller → Trigger** → wait ~250ms → splat reloads,
        next scene in array order, **skipping `hideInPicker` scenes** (the
        lovely-melody/pink/mint interiors and the Portals Glade). The last
        cyclable scene is `animal-crossing`, which wraps back to
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

- [ ] Only **yaw** (heading) is recentered — the dolly is never pitched or
      rolled (a tilted dolly is nauseating); your real head tilt still applies.
      See `extractYaw` in [src/modes/world.js](../src/modes/world.js).
- [ ] Holding the button down only fires once. Release and press again to fire twice.
- [ ] **Double-tap** the menu button → returns to the **Portals Glade** instead
      (single tap stays a recenter); see `pollRecenterButton`.

### Random world group recenter
- [ ] Cycle to a scene in the **Random** group (e.g. ocean-breeze-office)
- [ ] Walk a few meters
- [ ] Single-trigger to the next Random scene (fairy-kitchen)
- [ ] Confirm headset recenters to the new spawn — even though both scenes
      share `world: "Random"`, the group is treated as a catchall, so every
      cycle within it recenters

### Portals: pointer, hover & entry
Wired in [src/three/portals.js](../src/three/portals.js) (`updateVRHover`,
`tryPortal`) + [src/modes/world.js](../src/modes/world.js) (`update`'s walk-into
proximity check). Enter VR on a scene that has portals — the **Portals Glade**
(flower / hub button) or one of the Animal Crossing / lovely-interior scenes.

- [ ] A thin laser projects from each controller; drag a controller in DevTools
      and the laser follows
- [ ] Aiming a wand at a portal turns its laser **pink** and shortens it to the
      portal; the doorway brightens its halo + emoji label (GLB-character
      portals shorten the laser but don't brighten yet)
- [ ] Moving off the portal returns the laser to pale full-length and the
      doorway dims again
- [ ] Pull the trigger while aimed at a portal → teleports through it
- [ ] **Walk into** a portal (left-stick / move toward it) → also teleports
- [ ] **You enter the portal you moved toward, not the opposite one.** (Regression
      guard: in VR the head world position must be composed as
      `dolly.matrixWorld * getCamera().matrix`; reading `getCamera()
      .getWorldPosition()` in `update()` drops the dolly's spawn-yaw recenter and
      sends you to the ≈opposite portal in the hub ring.)
- [ ] After arriving, you spawn beside the return portal but do NOT bounce
      straight back (arm-on-exit) — step away and back in to re-enter
- [ ] **Enter VR while viewing the Portals Glade** → you land at the defined ring
      center (NOT wherever you'd moved before) and are NOT instantly teleported
      into a portal. (Regression guard: the ring's first portal sits ~0.69m from
      world origin, where the emulator's head starts before the spawn recenter;
      `update()` disarms every portal on the VR-entry edge, so arm-on-exit keeps
      the one you're standing in from firing until you step out of it.)
- [ ] **Re-entry works too:** hub → VR → walk through a portal → exit VR →
      return to hub (flower button) → VR again → walk-into entry STILL works,
      and you're back at the ring center. (Regression guard: no sticky
      "suppress walk-in" flag — entry is only ever blocked by an in-flight
      portal transition, and disarm-on-entry resets arm-state each time.)
- [ ] **Double-tap the menu button** (real hardware only) from any world →
      returns to the Portals Glade; single tap still just recenters to spawn
- [ ] **Press the right trackpad/thumbstick** (real hardware only, object mode
      on) → a new object drops ~2.5m in front of where you're looking (NOT
      behind/opposite you — same dolly-transform fix as walk-in); does nothing
      when object mode is off
- [ ] Exit the session → lasers disappear from the desktop mirror (not left
      floating at the dolly origin)

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
- [ ] You will walk through splat "geometry" while moving — locomotion writes
      `dolly.position` with no collision test, so the player is never blocked.
      Expected, not a bug.
- [ ] Note: per-scene Rapier colliders **do** exist now (loaded in object mode,
      see `loadSceneCollider` in [src/modes/world.js](../src/modes/world.js)),
      but they only stop **dropped objects** — they don't constrain the player.
      Player-vs-world collision is still unimplemented.

## Limitations of the emulator

- Performance is not representative of a real headset — don't panic about frame rate
- No lens distortion, proper IPD, or depth — just two flat viewports
- Hand tracking emulates poorly; stick to controllers
- Some WebXR features (passthrough, AR) need a real device
- Emulator button naming is inconsistent across device profiles — the
  important thing is which gamepad button index fires, not the label

## Features not yet implemented

- Smooth/teleport-arc locomotion as an explicit comfort option (current snap-turn
  + smooth-walk is the only scheme; some people want a parabolic teleport)
- Controller models visible in the scene (you get an aiming laser, but not a
  rendered wand mesh)
- VR in home mode (the VR button + all cycle/portal/grab handlers are world-mode only)
- **Player**-vs-splat collision (object colliders exist; the player still walks
  through everything)

> Note: jump-to-a-specific-world *inside* VR is now handled by the **Portals
> Hub** (point + trigger at a doorway), so it's no longer a missing feature —
> see "Portals & the hub" above.
