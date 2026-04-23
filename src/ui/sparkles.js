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
