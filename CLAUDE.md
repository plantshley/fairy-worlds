# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start Vite dev server (default `http://localhost:5173`)
- `npm run build` — production build (Vite, `target: esnext`, `base: /fairy-worlds/`)
- `npm run preview` — serve the built `dist/`

No test runner, linter, or formatter is configured.

## Stack

- Vanilla ES modules + [Vite](vite.config.js) (no framework, no TypeScript)
- [three.js](https://threejs.org/) `^0.180`
- [@sparkjsdev/spark](https://github.com/sparkjsdev/spark) `^2.0` for Gaussian splat rendering (`.spz` files)
- [@pixiv/three-vrm](https://github.com/pixiv/three-vrm) (loaded but currently characters use raw GLB / procedural)
- WebXR enabled on the renderer for VR mode

The site is deployed to GitHub Pages under `/fairy-worlds/` — that base path is baked into [vite.config.js](vite.config.js) and every asset URL uses `import.meta.env.BASE_URL`. Don't hardcode `/splats/...` paths.

## Architecture

The app is a single-page experience with two **modes** (home vs. world) coordinated by a central manager.

### Mode lifecycle — [src/sceneManager.js](src/sceneManager.js)

`createSceneManager()` owns the single `WebGLRenderer` (xr-enabled, transparent clear) and a `Map<name, mode>`. A mode is a plain object exposing `{ name, scene, camera, activate?, deactivate?, prepareEnter?, prepareExit?, update?, resize? }`. Only one mode is active at a time. The render loop is `renderer.setAnimationLoop` and renders `current.scene` with `current.camera`.

`transitionTo(name, payload)` fades the `#transition-overlay` DOM element via [src/three/transition.js](src/three/transition.js), swaps modes, then fades back. Use this — not `setMode` — for user-visible transitions.

### Modes

- [src/modes/home.js](src/modes/home.js) — character-picker stage. Owns the procedural/GLB character (see below) and exposes `setCharacter(id, config)` / `getCharacter()`.
- [src/modes/world.js](src/modes/world.js) — splat world viewer. Mounts a `SparkRenderer` into the scene, loads a `SplatMesh` from `sceneDef.url`, drives camera with `SparkControls` (desktop) or `createVRLocomotion` (XR). Uses a monotonic `loadToken` to cancel stale loads when the user switches scenes mid-download.

### Data

- [src/data/scenes.js](src/data/scenes.js) — array of splat worlds. Each scene has `{ id, world, title, url, spawn: { position, quaternion } }`. The `spawn` is applied to the camera dolly on load. URL-encode spaces in filenames (`%20`).
- [src/data/characters.js](src/data/characters.js) — characters. `kind: "procedural"` uses [src/three/proceduralCharacter.js](src/three/proceduralCharacter.js) (fully customizable, state persisted to `localStorage`). `kind: "glb"` loads via [src/three/loadCharacter.js](src/three/loadCharacter.js) with per-character `scale` / `offset{X,Y,Z}` / `rotationY` overrides for fitup.

### Persistence

`main.js` saves to `localStorage` under two keys:
- `fairy-worlds-character` — selected character id
- `fairy-worlds-character-config` — procedural character state (from `character.getState()`)

First-run detection (`!localStorage.getItem(CHARACTER_KEY)`) auto-opens the picker.

### UI layer

DOM-based, not in-canvas. Built up in [index.html](index.html) and wired in [src/main.js](src/main.js):
- [src/ui/characterPicker.js](src/ui/characterPicker.js) — modal gallery + procedural customization panel
- [src/ui/worldPicker.js](src/ui/worldPicker.js) — scene list (left rail in world mode)
- [src/ui/companion.js](src/ui/companion.js) — floating mini-character + speech bubble; mirrors the home character into world mode
- [src/ui/loader.js](src/ui/loader.js), [src/ui/sparkles.js](src/ui/sparkles.js) — loading overlay, decorative DOM sparkles

### VR

- [src/three/vrButton.js](src/three/vrButton.js) — `createVRController(renderer, onLabel)` manages session start/exit and pushes labels to the companion bubble.
- [src/three/vrLocomotion.js](src/three/vrLocomotion.js) — controller-based movement, used only by world mode.
- See [docs/VR_TESTING.md](docs/VR_TESTING.md) for testing without a headset (WebXR API Emulator).

## Conventions

- Marble AI `.spz` exports load into Spark with **no quaternion flip** — do not apply the rotation hack from Spark's butterfly demo.
- Asset paths always use `import.meta.env.BASE_URL + "..."` (see scene/character data).
- Procedural character anchors in [src/three/proceduralCharacter.js](src/three/proceduralCharacter.js) (`ANCHORS` object) are shared Y values that all body parts must align to — don't float new parts at arbitrary Y.

## Other notes
- Always ask the user clarifying questions when needed or helpful
- Agent instructions (subagents, design/build workflow) are in the parent `.claude/CLAUDE.md` — not repeated here
