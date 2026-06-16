# ⋆.˚✿🌷 fairy worlds 🌷✿˚.⋆

A dreamy little web experience: pick a cute character, customize it, and wander
through a gallery of pastel 3D worlds rendered as Gaussian splats. Works on
desktop, phone/tablet, and in VR.

**⁠❥ Live site:** https://plantshley.github.io/fairy-worlds/

The worlds are real captured/AI-generated 3D scenes (Marble AI `.spz` splats)
streamed in your browser with [three.js](https://threejs.org/) +
[Spark](https://github.com/sparkjsdev/spark). No install, no account — just open
the link.

---

## ⋆˚꒰ User guide ꒱˚⋆

### ❀ Getting started

1. **Open the site.** 
2. **Pick a character** from the gallery — a fully customizable fairy companion,
   or one of several cute GLB characters (alien, kitty, kuromi, bunnies, Animal
   Crossing friends).
3. **Customize** (optional). The fairy can be tinted, re-shaped, and toggled part
   by part; the GLB characters let you re-tint their body parts. Your choices are
   saved in your browser, so you'll see the same character next time.
4. **Step into a world.** Close the picker, open up any of the world dropdowns from the **"select a world"** list, then choose a scene. The scene streams in with a loading sparkle, then you're dropped inside. Or use the **portals glade** to enter worlds. 
5. **Look around and explore.** Controls depend on your device — see below.

Your companion character floats in the corner of the screen and follows you from
scene to scene.

### ❀ The Portals Glade (the hub)

The **Portals Glade** is a special scene holding a ring of glowing portals — one
per world. It's a whimsical way to jump straight to any world:

- Reach it from the **✦ portals glade ✦** button (top toolbar) on the homepage.
- On desktop/mobile, **tap** or **walk into** a portal spot to travel through it.
- In VR, **point a wand at a doorway and pull the trigger**, or simply **walk
  into it**.
- When in portal mode, quickly jump between worlds using the use the **‹ ›** arrows and switch scenes using the pills in the toolbar. 

### ❀ The worlds

Twelve themed worlds (most with a few versions you can flip between), plus a
"Random" grab-bag of one-off scenes (I recommend talking to Celeste in Animal Crossing 👀):

> Heart Pool Pavilion · Berry Dream Kitchen · Twinkle Butterfly Patio ·
> Swan Lake Suite · Sunkissed Sparkle Room · Pink Cherry Plane ·
> Lavender Laundry · Jewel Princess Bathroom · Glitter Hibiscus Lodge ·
> Frutiger Rainbow Cafe · Flowers of our Future Club · Angelic Quartz Chamber

### ❀ Object mode

Toggle **✦ object mode ✦** in the top toolbar to spawn little physics objects you
can drop and play with. On desktop use the **✦ drop object ✦** button; in VR,
press the right wand's trackpad/thumbstick. Objects bounce off the world's floor
but the player walks freely (you can pass through scenery). Use right-click-drag to slide along x and z, and f+right-click-drag to lift along y. 

---

## ⋆｡‧˚ʚ Navigation controls ɞ˚‧｡⋆

### ♥︎ Desktop (mouse + keyboard)

| You want to… | Do this |
| --- | --- |
| **Look around** | **Click the canvas** to capture the mouse, then move the mouse to look. |
| **Move** | **WASD** keys, or **scroll** to glide forward/back. |
| **Move faster / slower** | Hold **Shift** to speed up, **Ctrl** to slow down. |
| **Travel to a world** | Click a world in the "select a world" list, or enter a portal. |
| **Reset your position** | Click the **⊙** button (top-right HUD) to snap back to the world's entrance. |
| **Return to home** | Click the **✿** flower button in the toolbar, or your **companion character**. |
| **Drop an object** *(object mode on)* | Click **✦ drop object ✦**. Right-drag to slide it, Alt+right-drag to lift. |
| **Change character** | Click **♡ pick a character ♡**. |

### ♥︎ Mobile / tablet (touch)

| You want to… | Do this |
| --- | --- |
| **Look around** | **Drag** anywhere on the scene (one finger). |
| **Move** | Use the **on-screen joystick** in the bottom corner or two-finger pinch gestures. |
| **Travel to a world** | Tap a world in the list, or tap a portal doorway. |
| **Reset your position** | Tap the **⊙** button that floats by your companion. |

### ♥︎ VR (WebXR — built for the HTC VIVE)

Enter VR by clicking the **✦ open in VR ✦** label on your companion's speech
bubble while in a world. First, just **look around and walk** naturally — the
headset tracks your body within your room's play space. The wand controls below
are for traveling farther than your room allows, or turning without physically
spinning.

| You want to… | Do this |
| --- | --- |
| **Look / move a little** | Just move — turn your head and walk physically (tracked within your play area). |
| **Walk farther than your room** | Push the **left** thumbstick / trackpad. You move whichever way you're looking. |
| **Turn without spinning yourself** | Flick the **right** thumbstick / trackpad left or right — 30° snap-turn each flick. |
| **Hop to the next scene** | Pull the **right** trigger (in empty space). Pull the **left** trigger to go back a scene. |
| **Jump to a whole new world** | Double-pull the **right** trigger to advance a world; double-pull the **left** for the previous. |
| **Step through a doorway** | Point a wand at a glowing portal and pull the trigger — *or just walk into it.* |
| **Grab an object** *(object mode on)* | Point a wand at an object and hold the trigger; **release** to drop it. |
| **Drop a new object** *(object mode on)* | Click in the **right** trackpad / thumbstick. |
| **Reset your spot** | Press the **menu button** on either wand to snap back to the world's entrance. |
| **Back to the Portals Glade** | **Double-tap the menu button** on either wand. |
| **Leave VR** | Squeeze the **grip** on either wand. You can return to home from here via the **✿** flower button in the toolbar. |

> ⁠❥ Triggers are context-sensitive: aimed at a doorway or grabbable object the
> trigger uses *that* first; aimed at empty space it changes scenes.

**No headset?** You can still test VR in a browser with the **WebXR API
Emulator** extension. See [docs/VR_TESTING.md](docs/VR_TESTING.md) for the full
in-depth VR controls reference, regression checklist, and emulator setup.

---

## ೃ｡୨୧ For developers ୨୧˚࿐ೃ

### ✦ Stack

- Vanilla ES modules + [Vite](vite.config.js) — no framework, no TypeScript
- [three.js](https://threejs.org/) `^0.180` with WebXR enabled
- [@sparkjsdev/spark](https://github.com/sparkjsdev/spark) `^2.0` for Gaussian
  splat rendering (`.spz` files)
- [@dimforge/rapier3d-compat](https://rapier.rs/) for the object-mode physics
- [@pixiv/three-vrm](https://github.com/pixiv/three-vrm) (loaded; characters
  currently use raw GLB / procedural)

### ✦ Commands

```bash
npm install        # install deps
npm run dev        # start Vite dev server (http://localhost:5173)
npm run build      # production build → dist/ (base: /fairy-worlds/)
npm run preview    # serve the built dist/
```

There is no test runner, linter, or formatter configured.

### ✦ Project layout

```
src/
  main.js                 # boot + wires DOM HUD to modes
  sceneManager.js         # owns the single WebGLRenderer; swaps home ⇄ world modes
  modes/
    home.js               # character-picker stage
    world.js              # splat world viewer + portals + locomotion glue
  data/
    scenes.js             # the list of splat worlds (+ spawn poses)
    characters.js         # selectable characters
    hubPortals.js         # the Portals Glade ring
  three/                  # proceduralCharacter, loadCharacter, vrButton,
                          # vrLocomotion, touchControls, portals, grab, physics…
  ui/                     # characterPicker, worldPicker, companion, loader, sparkles
docs/VR_TESTING.md        # deep VR controls + emulator testing guide
public/                   # splats, character GLBs, fonts
```

### ✦ Architecture in brief

The app is a single page with two **modes** (home vs. world) coordinated by
`createSceneManager()`, which owns the one XR-enabled `WebGLRenderer` and renders
the active mode's scene/camera each frame. `transitionTo(name, payload)` fades a
DOM overlay, swaps modes, then fades back.

Persisted to `localStorage`: the selected character id
(`fairy-worlds-character`), the procedural character's state
(`fairy-worlds-character-config-v2`), and the object-mode toggle
(`fairy-worlds-object-mode`).

See [CLAUDE.md](CLAUDE.md) for deeper conventions (splat orientation, asset path
rules, character anchors).

### ✦ Deployment

The site is built for GitHub Pages under the `/fairy-worlds/` base path — that's
baked into [vite.config.js](vite.config.js), and every asset URL is built from
`import.meta.env.BASE_URL`, so **don't hardcode `/splats/...` paths**.

---

## ⋆˚࿔ ❀ ❁ ✽ Credits ⋆ 𖤓 ⋆˚࿔ 𐫱 

- **Worlds** — created with [World Labs' Marble](https://marble.worldlabs.ai/?user=fairykun)
  (my profile). The 3D scenes are exported as Gaussian splats (`.spz`).
- **Characters & objects** — free 3D models from
  [Sketchfab](https://sketchfab.com/), used under their respective licenses.

---

Made by fairy ⊹˚₊🌷🍒 ₍ᐢ. .ᐢ₎ ₊˚⊹♡₊🌺˚ೀ⋆｡˚
