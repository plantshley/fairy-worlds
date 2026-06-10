import { createSceneManager } from "./sceneManager.js";
import { createWorldMode } from "./modes/world.js";
import { createHomeMode } from "./modes/home.js";
import { buildSparkles, enableHoverSparkles } from "./ui/sparkles.js";
import { createCharacterPicker } from "./ui/characterPicker.js";
import { createWorldPicker } from "./ui/worldPicker.js";
import { createVariantPills } from "./ui/variantPills.js";
import { createPortalNavBar } from "./ui/portalNavBar.js";
import { createVRController } from "./three/vrButton.js";
import { createCompanion } from "./ui/companion.js";
import { CHARACTERS, DEFAULT_CHARACTER_ID } from "./data/characters.js";
import { SCENES } from "./data/scenes.js";
import { trackCharacterSelect } from "./utils/analytics.js";

const HUB_ID = "hub-heart-pool";

// Two ways of navigating between scenes: the dropdown picker (`"picker"`) and
// the in-world portals + edge arrows + variant pills (`"portal"`). Stored on
// body as a data attribute so CSS gates the entire HUD swap at once.
let navMode = "picker";
function setNavMode(mode) {
  navMode = mode;
  document.body.dataset.navMode = mode;
}
setNavMode("picker");

const CHARACTER_KEY = "fairy-worlds-character";
const CONFIG_KEY = "fairy-worlds-character-config-v2";
const OBJECT_MODE_KEY = "fairy-worlds-object-mode";
localStorage.removeItem("fairy-worlds-character-config");

function loadSavedCharacterId() {
  const id = localStorage.getItem(CHARACTER_KEY);
  return CHARACTERS.some((c) => c.id === id) ? id : DEFAULT_CHARACTER_ID;
}
function loadSavedConfig() {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    return raw ? JSON.parse(raw) : undefined;
  } catch {
    return undefined;
  }
}
function saveCharacterId(id) {
  localStorage.setItem(CHARACTER_KEY, id);
}
function saveConfig(config) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

buildSparkles("sparkle-field");
buildSparkles("transition-sparkle-field", 40);
enableHoverSparkles([
  ".group-pill",
  ".home-btn",
  ".hud-btn",
  ".companion-bubble",
  ".recenter-btn",
  ".circle-btn",
  ".variant-pills .scene-btn",
]);

const manager = createSceneManager();
const homeMode = createHomeMode({ renderer: manager.renderer });
const worldMode = createWorldMode({
  renderer: manager.renderer,
  onSceneLoaded: (sceneDef) => {
    worldPicker.setActiveScene(sceneDef.id);
    // Hub gets its own nav mode regardless of how it was entered (dropdown,
    // portals-hub button, return-from-portal). Hub-nav hides the dropdown +
    // pills + edge arrows and surfaces the hub-hint instead.
    if (sceneDef.id === HUB_ID) setNavMode("hub");
    refreshPortalNavUI(sceneDef);
    // Re-evaluate the drop-object button visibility — it depends on whether
    // we just landed on the hub (hidden) vs any other scene (per-toggle).
    applyObjectModeUI();
  },
  // Entering a scene via a clickable portal flips us into portal-nav. If the
  // target is the hub itself, onSceneLoaded overrides this to "hub" after load.
  onPortalEnter: () => setNavMode("portal"),
});
manager.register(homeMode);
manager.register(worldMode);

const companion = createCompanion({
  containerEl: document.getElementById("companion"),
  canvasEl: document.getElementById("companion-canvas"),
  bubbleEl: document.getElementById("companion-bubble"),
  recenterEl: document.getElementById("btn-recenter-mobile"),
  onBubbleClick: () => vr.toggle(),
  onRecenterClick: () => worldMode.returnToOrigin(),
  // Character click always exits to the actual home page. The hub-return
  // behavior is reserved for the #btn-home flower button at the top of the HUD
  // (goHomeOrHub) — clicking the character should be a single, predictable
  // "I'm done, take me home" gesture. exitToHome resets navMode so the home
  // page's dropdown reappears.
  onCharacterClick: () => {
    if (manager.currentName() !== "home") exitToHome();
  },
});

const worldPicker = createWorldPicker({
  container: document.getElementById("scenes"),
  scenes: SCENES,
  onSelectScene: async (sceneDef) => {
    // Dropdown picks are always picker-nav (they're the picker entry point).
    setNavMode("picker");
    if (manager.currentName() === "world") {
      worldMode.loadScene(sceneDef);
    } else {
      picker?.close();
      await manager.transitionTo("world", { scene: sceneDef });
      companion.show();
    }
    worldPicker.setActiveScene(sceneDef.id);
  },
});

// Two pill instances — desktop in the HUD, mobile in the top bar. CSS hides
// whichever isn't appropriate for the current breakpoint; we always update
// both so a window resize doesn't show stale data.
const variantPillsDesktop = createVariantPills({
  container: document.getElementById("variant-pills-desktop"),
  onSelectScene: (s) => {
    setNavMode("portal"); // intra-world variant switch stays in portal-nav
    worldMode.loadScene(s);
  },
});
const variantPillsMobile = createVariantPills({
  container: document.getElementById("variant-pills-mobile"),
  onSelectScene: (s) => {
    setNavMode("portal");
    worldMode.loadScene(s);
  },
});

const portalNavBar = createPortalNavBar({
  onPrev: () => {
    setNavMode("portal");
    worldMode.cycleWorld(-1);
  },
  onNext: () => {
    setNavMode("portal");
    worldMode.cycleWorld(1);
  },
});

function refreshPortalNavUI(sceneDef) {
  const showPortalNav = navMode === "portal";
  variantPillsDesktop.setVisible(showPortalNav);
  variantPillsMobile.setVisible(showPortalNav);
  portalNavBar.setVisible(showPortalNav);
  variantPillsDesktop.update(sceneDef, SCENES);
  variantPillsMobile.update(sceneDef, SCENES);
}

// Always reset to picker-nav when leaving world mode so the home page (and
// next world entry) sees a fresh dropdown. Without this, navMode stuck at
// "portal" leaves the CSS rule hiding #scenes — dropdown invisible at home.
function exitToHome() {
  setNavMode("picker");
  manager.transitionTo("home");
  companion.hide();
}

// Home / flower-button action. At hub → always exit to home page. In
// portal-nav at a non-hub scene → return to hub. Otherwise → exit to home.
// Used by #btn-home. The companion character click uses exitToHome directly
// (no hub-return) — per user spec, character tap is a "take me all the way
// home" gesture, only the flower button stops at the hub.
function goHomeOrHub() {
  const atHub = worldMode.getCurrentSceneId?.() === HUB_ID;
  if (navMode === "portal" && !atHub) {
    const hub = SCENES.find((s) => s.id === HUB_ID);
    if (hub) {
      // onSceneLoaded flips navMode to "hub" once the splat is in.
      worldMode.loadScene(hub);
      return;
    }
  }
  exitToHome();
}

manager.setMode("home");
manager.start();

const picker = createCharacterPicker({
  modalEl: document.getElementById("character-picker"),
  galleryEl: document.getElementById("picker-gallery"),
  customizationEl: document.getElementById("picker-customization"),
  closeBtn: document.getElementById("picker-close"),
  characters: CHARACTERS,
  onSelectCharacter: async (id) => {
    const def = CHARACTERS.find((c) => c.id === id);
    const config = id === savedId ? loadSavedConfig() : undefined;
    const character = await homeMode.setCharacter(id, config);
    if (id !== savedId) trackCharacterSelect(id);
    savedId = id;
    saveCharacterId(id);
    if (character?.getState) saveConfig(character.getState());
    picker.setActive(id, character, def);
    companion.setCharacter(id, character?.getState?.());
  },
  onCustomize: () => {
    const character = homeMode.getCharacter();
    if (character?.getState) {
      const state = character.getState();
      saveConfig(state);
      companion.applyState(state);
    }
  },
});

const isFirstRun = !localStorage.getItem(CHARACTER_KEY);
let savedId = loadSavedCharacterId();
const initialConfig = loadSavedConfig();
const initialCharacter = await homeMode.setCharacter(savedId, initialConfig);
picker.setActive(savedId, initialCharacter, CHARACTERS.find((c) => c.id === savedId));
saveCharacterId(savedId);
companion.setCharacter(savedId, initialCharacter?.getState?.());

// First-run nudge: leave the picker closed (per design) but gently pulse the
// "pick a character" button so new visitors notice it. Clears on first click.
if (isFirstRun) {
  const changeBtn = document.getElementById("btn-change-character");
  if (changeBtn) {
    changeBtn.classList.add("hint-pulse");
    changeBtn.addEventListener(
      "click",
      () => changeBtn.classList.remove("hint-pulse"),
      { once: true },
    );
  }
}

document.getElementById("btn-enter-world")?.addEventListener("click", async () => {
  // Entering world via the dropdown / home page is picker-nav.
  setNavMode("picker");
  picker.close();
  await manager.transitionTo("world");
  companion.show();
});
document.getElementById("btn-home")?.addEventListener("click", goHomeOrHub);
document.getElementById("btn-portals-hub")?.addEventListener("click", async () => {
  const hub = SCENES.find((s) => s.id === HUB_ID);
  if (!hub) return;
  picker.close();
  await manager.transitionTo("world", { scene: hub });
  companion.show();
  // onSceneLoaded fires after the splat finishes loading and sets navMode to "hub".
});
document.getElementById("btn-recenter")?.addEventListener("click", () => {
  worldMode.returnToOrigin();
});
const objectModeToggle = document.getElementById("object-mode-toggle");
const spawnBoxBtn = document.getElementById("btn-spawn-box");
const boxHint = document.getElementById("box-hint");

// Touch drags an object with one finger; desktop uses right-drag, with F held
// down for vertical-lift mode (F not Alt — Alt steals browser-menu focus).
const isCoarsePointer = window.matchMedia?.("(pointer: coarse)").matches ?? false;
if (boxHint) {
  boxHint.textContent = isCoarsePointer
    ? "drag to move · flick to throw"
    : "right-drag: slide · hold F + right-drag: lift";
}

function applyObjectModeUI() {
  const on = localStorage.getItem(OBJECT_MODE_KEY) === "1";
  // Hub has no useful objects to drop and the spawn-box button competes with
  // the variant pills for HUD space — hide it at hub even when object mode is
  // on. Re-evaluated on every scene load so swapping in/out of hub updates it.
  const atHub = worldMode.getCurrentSceneId?.() === HUB_ID;
  const showSpawnUI = on && !atHub;
  if (objectModeToggle) {
    objectModeToggle.setAttribute("aria-pressed", on ? "true" : "false");
    objectModeToggle.textContent = on ? "✦ object mode: on ✦" : "✦ object mode: off ✦";
  }
  for (const el of [spawnBoxBtn, boxHint]) {
    if (!el) continue;
    if (showSpawnUI) el.removeAttribute("hidden");
    else el.setAttribute("hidden", "");
  }
}
applyObjectModeUI();

objectModeToggle?.addEventListener("click", () => {
  const next = localStorage.getItem(OBJECT_MODE_KEY) === "1" ? "0" : "1";
  localStorage.setItem(OBJECT_MODE_KEY, next);
  applyObjectModeUI();
  window.dispatchEvent(new Event("objectmodechange"));
});

spawnBoxBtn?.addEventListener("click", () => {
  if (manager.currentName() === "world") worldMode.spawnBox();
});

document.getElementById("btn-change-character")?.addEventListener("click", () => {
  const character = homeMode.getCharacter();
  picker.setActive(savedId, character, CHARACTERS.find((c) => c.id === savedId));
  picker.open();
});

const vr = createVRController(
  manager.renderer,
  (label) => {
    companion.setDialogue(label);
  },
  {
    onCycleNext: () => {
      if (manager.currentName() === "world") worldMode.cycleScene(1);
    },
    onCyclePrev: () => {
      if (manager.currentName() === "world") worldMode.cycleScene(-1);
    },
    onWorldNext: () => {
      if (manager.currentName() === "world") worldMode.cycleWorld(1);
    },
    onWorldPrev: () => {
      if (manager.currentName() === "world") worldMode.cycleWorld(-1);
    },
    onRecenter: () => {
      if (manager.currentName() === "world") worldMode.returnToOrigin();
    },
    onSessionStart: () => {
      if (manager.currentName() === "world") worldMode.recenterToCurrentSpawn();
    },
    onTryPortal: (hand) => {
      if (manager.currentName() !== "world") return false;
      return worldMode.tryPortal(hand);
    },
    onTryGrab: (hand) => {
      if (manager.currentName() !== "world") return false;
      if (localStorage.getItem(OBJECT_MODE_KEY) !== "1") return false;
      return worldMode.tryGrab(hand);
    },
    onGrabRelease: (hand) => {
      if (manager.currentName() !== "world") return false;
      return worldMode.releaseGrab(hand);
    },
  },
);
