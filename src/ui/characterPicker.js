import { PROCEDURAL_CUSTOMIZATION_SCHEMA } from "../three/proceduralCharacter.js";

export function createCharacterPicker({
  modalEl,
  galleryEl,
  customizationEl,
  closeBtn,
  characters,
  onSelectCharacter,
  onCustomize,
}) {
  let activeId = null;
  let activeCharacter = null;

  function open() {
    modalEl.removeAttribute("hidden");
    document.getElementById("home-hud")?.setAttribute("hidden", "");
  }
  function close() {
    modalEl.setAttribute("hidden", "");
    document.getElementById("home-hud")?.removeAttribute("hidden");
  }

  closeBtn.addEventListener("click", close);

  function renderGallery(selectedId) {
    galleryEl.innerHTML = "";
    for (const def of characters) {
      const card = document.createElement("button");
      card.className = "picker-card-item";
      if (def.id === selectedId) card.classList.add("active");
      card.innerHTML = `
        <div class="picker-card-title">${def.title}</div>
        <div class="picker-card-sub">${def.description ?? def.kind}</div>
      `;
      card.addEventListener("click", () => onSelectCharacter(def.id));
      galleryEl.appendChild(card);
    }
  }

  function renderCustomization(character, charDef) {
    customizationEl.innerHTML = "";
    activeCharacter = character;

    if (!character) return;

    if (charDef?.kind === "vrm" || charDef?.kind === "glb") {
      renderMaterialCustomization(character);
      return;
    }

    if (charDef?.kind !== "procedural") {
      const note = document.createElement("div");
      note.className = "picker-note";
      note.textContent = "customization for this character coming in a later phase";
      customizationEl.appendChild(note);
      return;
    }

    const state = character.getState();

    const colorSection = makeSection("colors");
    for (const { id, label, default: defaultColor } of PROCEDURAL_CUSTOMIZATION_SCHEMA.colors) {
      const wrap = document.createElement("label");
      wrap.className = "picker-color";
      const input = document.createElement("input");
      input.type = "color";
      input.value = state.colors[id] ?? defaultColor;
      input.addEventListener("input", () => {
        character.setColor(id, input.value);
        onCustomize?.();
      });
      const txt = document.createElement("span");
      txt.textContent = label;
      wrap.appendChild(input);
      wrap.appendChild(txt);
      colorSection.row.appendChild(wrap);
    }
    customizationEl.appendChild(colorSection.section);

    for (const { id, label, options } of PROCEDURAL_CUSTOMIZATION_SCHEMA.variants) {
      const sec = makeSection(label);
      for (const opt of options) {
        const pill = document.createElement("button");
        pill.type = "button";
        pill.className = "picker-pill";
        pill.textContent = opt;
        if (state.variants[id] === opt) pill.classList.add("active");
        pill.addEventListener("click", () => {
          character.setVariant(id, opt);
          sec.row.querySelectorAll(".picker-pill").forEach((p) => p.classList.remove("active"));
          pill.classList.add("active");
          onCustomize?.();
        });
        sec.row.appendChild(pill);
      }
      customizationEl.appendChild(sec.section);
    }

    const accSec = makeSection("accessories");
    for (const { id, label } of PROCEDURAL_CUSTOMIZATION_SCHEMA.accessories) {
      const wrap = document.createElement("label");
      wrap.className = "picker-toggle";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = !!state.accessories[id];
      cb.addEventListener("change", () => {
        character.setAccessory(id, cb.checked);
        onCustomize?.();
      });
      wrap.appendChild(cb);
      const txt = document.createElement("span");
      txt.textContent = label;
      wrap.appendChild(txt);
      accSec.row.appendChild(wrap);
    }
    customizationEl.appendChild(accSec.section);
  }

  function renderMaterialCustomization(character) {
    const materials = character.getMaterials?.() ?? [];
    if (!materials.length) {
      const note = document.createElement("div");
      note.className = "picker-note";
      note.textContent = "no tintable materials found on this model";
      customizationEl.appendChild(note);
      return;
    }

    const sec = makeSection("✧♡ change colors ♡✧");
    for (const { name, label, material } of materials) {
      const wrap = document.createElement("label");
      wrap.className = "picker-color";
      const input = document.createElement("input");
      input.type = "color";
      const current = material.color ?? material.uniforms?.color?.value;
      input.value = current ? "#" + current.getHexString() : "#ffffff";
      input.addEventListener("input", () => {
        character.setMaterialColor(name, input.value);
        onCustomize?.();
      });
      const txt = document.createElement("span");
      txt.textContent = label ?? name;
      wrap.appendChild(input);
      wrap.appendChild(txt);
      sec.row.appendChild(wrap);
    }
    customizationEl.appendChild(sec.section);

    const note = document.createElement("div");
    note.className = "picker-note";
    note.textContent = "tip: names come from the model — try them to see which is which";
    customizationEl.appendChild(note);
  }

  function makeSection(labelText) {
    const section = document.createElement("div");
    section.className = "picker-section";
    const label = document.createElement("div");
    label.className = "picker-section-label";
    label.textContent = labelText;
    const row = document.createElement("div");
    row.className = "picker-row";
    section.appendChild(label);
    section.appendChild(row);
    return { section, row };
  }

  function setActive(id, character, def) {
    activeId = id;
    renderGallery(id);
    renderCustomization(character, def);
  }

  return { open, close, setActive };
}
