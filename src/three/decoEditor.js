import * as THREE from "three";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";

// In-world prop/portal editor. Toggle with the backtick key (`) on desktop,
// click a prop OR a house/portal to attach a transform gizmo, then drag/rotate/
// scale it. Press `d` to duplicate the selection, `c` to copy ALL transforms to
// the clipboard in scene-def shape. Replaces the window.deco()/window.portal()
// console workflow — no per-tweak reload, no pasted helpers.
//
// Desktop-only (gizmos make no sense with VR controllers). The host (world.js)
// supplies an "editables" abstraction so this module needs no prop-vs-portal
// special cases:
//   getEditables() -> [{ raw, group, id, root, kindLabel, uniformScale,
//                        onMoved(), exportLine() }]
//   duplicate(editable) -> Promise<newRoot|null>
//   freezeControls(on) -> suspend SparkControls during a gizmo drag
// and is responsible for honoring window.__decoEditActive in portal input so a
// select-tap doesn't also fire a portal.
const TAP_MS = 300;
const TAP_PX = 6;
const MODE_KEYS = { w: "translate", e: "rotate", r: "scale" };

const _ndc = new THREE.Vector2();

export function createDecoEditor({ renderer, camera, scene, getEditables, duplicate, freezeControls }) {
  const dom = renderer.domElement;
  const raycaster = new THREE.Raycaster();

  const control = new TransformControls(camera, dom);
  control.setSpace("world");
  control.enabled = false;
  scene.add(control.getHelper());

  let enabled = false;
  let selected = null; // a editable root (THREE.Group), or null
  let scaleStart = 1; // root.scale.x captured at the start of a scale drag
  let press = null; // { t, x, y } pending tap for click-to-select

  function entryFor(root) {
    return getEditables().find((e) => e.root === root) ?? null;
  }

  // --- gizmo events ---
  control.addEventListener("dragging-changed", (e) => {
    freezeControls?.(e.value);
    if (e.value && selected) scaleStart = selected.scale.x;
  });
  control.addEventListener("objectChange", () => {
    if (!selected) return;
    const entry = entryFor(selected);
    // Editables with a uniform scale (props, GLB houses) only support a single
    // `scale`, but the scale gizmo edits axes independently — snap back to
    // uniform using whichever axis moved furthest from the drag-start value.
    if (entry?.uniformScale && control.getMode() === "scale") {
      const { x, y, z } = selected.scale;
      let v = x,
        d = Math.abs(x - scaleStart);
      if (Math.abs(y - scaleStart) > d) {
        v = y;
        d = Math.abs(y - scaleStart);
      }
      if (Math.abs(z - scaleStart) > d) v = z;
      if (v > 0) selected.scale.setScalar(v);
    }
    entry?.onMoved?.();
    updateHud();
  });

  // --- selection ---
  function rootsList() {
    return getEditables().map((e) => e.root);
  }
  function select(root) {
    if (!root) return;
    selected = root;
    control.attach(root);
    // Doorways have no meaningful uniform scale — bounce a scale gizmo to move.
    if (control.getMode() === "scale" && entryFor(root)?.uniformScale === false) {
      control.setMode("translate");
    }
    updateHud();
  }
  function deselect() {
    selected = null;
    control.detach();
    updateHud();
  }
  function selectAt(clientX, clientY) {
    const roots = rootsList();
    if (roots.length === 0) return;
    const rect = dom.getBoundingClientRect();
    _ndc.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    camera.updateMatrixWorld(true);
    raycaster.setFromCamera(_ndc, camera);
    // recursive: covers prop meshes, house GLB meshes, and the invisible portal
    // proxies (raycast ignores material visibility, so proxies still register).
    const hits = raycaster.intersectObjects(roots, true);
    if (hits.length === 0) {
      deselect();
      return;
    }
    let obj = hits[0].object;
    while (obj) {
      if (roots.includes(obj)) {
        select(obj);
        return;
      }
      obj = obj.parent;
    }
    deselect();
  }
  function cycle(dir) {
    const roots = rootsList();
    if (roots.length === 0) return;
    const i = selected ? roots.indexOf(selected) : -1;
    const next = (i + dir + roots.length) % roots.length;
    select(roots[next]);
  }

  // --- tap detection (so a camera-rotate drag isn't read as a select) ---
  function onPointerDown(e) {
    if (!enabled || e.target !== dom || e.button !== 0) return;
    // A gizmo-handle grab is the gizmo's job, not a selection tap.
    if (control.dragging || control.axis) return;
    press = { t: performance.now(), x: e.clientX, y: e.clientY };
  }
  function onPointerUp(e) {
    if (!enabled || !press) return;
    const isTap =
      performance.now() - press.t < TAP_MS &&
      Math.hypot(e.clientX - press.x, e.clientY - press.y) < TAP_PX;
    const { x, y } = press;
    press = null;
    if (isTap && !control.dragging) selectAt(x, y);
  }

  function isTyping(e) {
    const t = e.target;
    return t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
  }
  function onKeyDown(e) {
    if (isTyping(e)) return;
    if (e.code === "Backquote") {
      e.preventDefault();
      toggle();
      return;
    }
    if (!enabled) return;
    const k = e.key.toLowerCase();
    if (MODE_KEYS[k]) {
      // Don't switch to scale on a doorway (no uniform scale to edit).
      if (MODE_KEYS[k] === "scale" && selected && entryFor(selected)?.uniformScale === false) {
        return;
      }
      control.setMode(MODE_KEYS[k]);
      updateHud();
    } else if (k === "q") {
      control.setSpace(control.space === "local" ? "world" : "local");
      updateHud();
    } else if (e.key === "Escape") {
      selected ? deselect() : disable();
    } else if (e.key === "[") {
      cycle(-1);
    } else if (e.key === "]") {
      cycle(1);
    } else if (k === "d") {
      duplicateSelected();
    } else if (k === "c") {
      exportAll();
    }
  }

  window.addEventListener("pointerdown", onPointerDown, true);
  window.addEventListener("pointerup", onPointerUp, true);
  window.addEventListener("keydown", onKeyDown);

  // --- duplicate ---
  function duplicateSelected() {
    if (!selected || !duplicate) return;
    const entry = entryFor(selected);
    if (!entry) return;
    // Duplicate is props-only: a portal copy would share its source's target and
    // can't be fully reconstructed from an export, so it's intentionally blocked.
    if (entry.group !== "deco") {
      console.log("[deco-editor] duplicate is props-only — houses/portals can't be duplicated");
      return;
    }
    Promise.resolve(duplicate(entry))
      .then((newRoot) => {
        if (newRoot) {
          select(newRoot);
          console.log(`[deco-editor] duplicated "${entry.id}" — drag the copy into place`);
        }
      })
      .catch((err) => console.warn("[deco-editor] duplicate failed:", err));
  }

  // --- export ---
  function exportAll() {
    const editables = getEditables();
    if (editables.length === 0) {
      console.warn("[deco-editor] nothing in this scene to export");
      return;
    }
    const decoLines = editables.filter((e) => e.group === "deco").map((e) => e.exportLine());
    const portalLines = editables.filter((e) => e.group === "portal").map((e) => e.exportLine());
    let text = "";
    if (decoLines.length) text += `decorations:\n[\n${decoLines.join("\n")}\n]\n`;
    if (portalLines.length) text += `portals:\n${portalLines.join("\n")}\n`;
    text = text.trimEnd();
    navigator.clipboard
      ?.writeText(text)
      .then(() => console.log("[deco-editor] copied to clipboard:\n" + text))
      .catch(() => console.log("[deco-editor] clipboard blocked — copy from here:\n" + text));
    if (!navigator.clipboard) console.log("[deco-editor] " + text);
  }

  // --- HUD ---
  const f = (n, d) => Number(n.toFixed(d));
  let hud = null;
  function ensureHud() {
    if (hud) return hud;
    hud = document.createElement("div");
    hud.style.cssText =
      "position:fixed;left:12px;bottom:12px;z-index:9999;pointer-events:none;" +
      "font:12px/1.5 ui-monospace,Menlo,Consolas,monospace;color:#fff;" +
      "background:rgba(20,12,28,0.78);padding:10px 12px;border-radius:8px;" +
      "border:1px solid rgba(255,160,220,0.5);max-width:340px;white-space:pre;";
    document.body.appendChild(hud);
    return hud;
  }
  function updateHud() {
    if (!enabled) {
      if (hud) hud.style.display = "none";
      return;
    }
    const el = ensureHud();
    el.style.display = "block";
    let sel = "none";
    if (selected) {
      const entry = entryFor(selected);
      const r = selected;
      sel =
        `${entry?.id ?? "?"} (${entry?.kindLabel ?? "?"})\n` +
        `  pos [${f(r.position.x, 2)}, ${f(r.position.y, 2)}, ${f(r.position.z, 2)}]\n` +
        `  rotY ${f(r.rotation.y, 3)}  scale ${f(r.scale.x, 3)}`;
    }
    el.textContent =
      "PROP EDITOR  (` to exit)\n" +
      `mode: ${control.getMode()} (w/e/r)   space: ${control.space} (q)\n` +
      "click=select  [ ]=cycle  d=dup(props)  c=copy all  esc=deselect\n" +
      "selected: " +
      sel;
  }

  // --- enable / disable ---
  function enable() {
    if (enabled) return;
    enabled = true;
    control.enabled = true;
    window.__decoEditActive = true;
    updateHud();
    console.log(
      "[deco-editor] ON. click a prop or house, w/e/r = move/rotate/scale, " +
        "d = duplicate, [ ] cycle, c = copy all, ` to exit.",
    );
  }
  function disable() {
    if (!enabled) return;
    enabled = false;
    control.enabled = false;
    window.__decoEditActive = false;
    deselect();
    updateHud();
    freezeControls?.(false);
  }
  function toggle() {
    enabled ? disable() : enable();
  }

  function dispose() {
    disable();
    window.removeEventListener("pointerdown", onPointerDown, true);
    window.removeEventListener("pointerup", onPointerUp, true);
    window.removeEventListener("keydown", onKeyDown);
    control.detach();
    scene.remove(control.getHelper());
    control.dispose?.();
    hud?.remove();
    hud = null;
  }

  return { enable, disable, toggle, deselect, isEnabled: () => enabled, dispose };
}
