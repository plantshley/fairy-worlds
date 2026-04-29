const GLYPHS = ["✦", "✧", "★", "✶", "❋"];

export function buildSparkles(hostId = "sparkle-field", count = 28) {
  const host = document.getElementById(hostId);
  if (!host) return;
  host.innerHTML = "";
  for (let i = 0; i < count; i++) {
    const s = document.createElement("span");
    s.className = "sparkle";
    s.textContent = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
    s.style.setProperty("--x", `${Math.random() * 100}%`);
    s.style.setProperty("--y", `${Math.random() * 100}%`);
    s.style.setProperty("--d", `${(Math.random() * 2.2).toFixed(2)}s`);
    s.style.setProperty("--s", `${10 + Math.random() * 16}px`);
    host.appendChild(s);
  }
}

export function enableHoverSparkles(selectors, count = 14) {
  const selector = Array.isArray(selectors) ? selectors.join(",") : selectors;
  const fields = new WeakMap();

  function spawn(el) {
    if (fields.has(el)) return;
    const field = document.createElement("span");
    field.className = "hover-sparkles";
    for (let i = 0; i < count; i++) {
      const s = document.createElement("span");
      s.className = "sparkle";
      s.textContent = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      s.style.setProperty("--x", `${-10 + Math.random() * 120}%`);
      s.style.setProperty("--y", `${-30 + Math.random() * 160}%`);
      s.style.setProperty("--d", `${(Math.random() * 1.6).toFixed(2)}s`);
      s.style.setProperty("--s", `${8 + Math.random() * 12}px`);
      field.appendChild(s);
    }
    el.appendChild(field);
    fields.set(el, field);
  }

  function clear(el) {
    const field = fields.get(el);
    if (field) {
      field.remove();
      fields.delete(el);
    }
  }

  document.addEventListener("mouseover", (e) => {
    const el = e.target.closest(selector);
    if (!el) return;
    if (e.relatedTarget && el.contains(e.relatedTarget)) return;
    spawn(el);
  });
  document.addEventListener("mouseout", (e) => {
    const el = e.target.closest(selector);
    if (!el) return;
    if (e.relatedTarget && el.contains(e.relatedTarget)) return;
    clear(el);
  });
}
