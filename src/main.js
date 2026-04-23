import { createSceneManager } from "./sceneManager.js";
import { createWorldMode } from "./modes/world.js";
import { createHomeMode } from "./modes/home.js";
import { buildSparkles } from "./ui/sparkles.js";
import { createCharacterPicker } from "./ui/characterPicker.js";
import { createWorldPicker } from "./ui/worldPicker.js";
import { createVRController } from "./three/vrButton.js";
import { createCompanion } from "./ui/companion.js";
import { CHARACTERS, DEFAULT_CHARACTER_ID } from "./data/characters.js";
import { SCENES } from "./data/scenes.js";

const CHARACTER_KEY = "fairy-worlds-character";
const CONFIG_KEY = "fairy-worlds-character-config";

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

const manager = createSceneManager();
const homeMode = createHomeMode({ renderer: manager.renderer });
const worldMode = createWorldMode({
  renderer: manager.renderer,
  onSceneLoaded: (sceneDef) => worldPicker.setActiveScene(sceneDef.id),
});
manager.register(homeMode);
manager.register(worldMode);

const companion = createCompanion({
  containerEl: document.getElementById("companion"),
  canvasEl: document.getElementById("companion-canvas"),
  bubbleEl: document.getElementById("companion-bubble"),
  onBubbleClick: () => vr.toggle(),
});

const worldPicker = createWorldPicker({
  container: document.getElementById("scenes"),
  scenes: SCENES,
  onSelectScene: async (sceneDef) => {
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

if (isFirstRun) {
  picker.open();
}

document.getElementById("btn-enter-world")?.addEventListener("click", async () => {
  picker.close();
  await manager.transitionTo("world");
  companion.show();
});
document.getElementById("btn-home")?.addEventListener("click", () => {
  manager.transitionTo("home");
  companion.hide();
});
document.getElementById("btn-change-character")?.addEventListener("click", () => {
  const character = homeMode.getCharacter();
  picker.setActive(savedId, character, CHARACTERS.find((c) => c.id === savedId));
  picker.open();
});

const vr = createVRController(manager.renderer, (label) => {
  companion.setDialogue(label);
});
