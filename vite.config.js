import { defineConfig } from "vite";
import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

// Scans public/colliders and public/objects at config time and exposes the
// filenames via a virtual ES module. Drop a file into one of those folders and
// it shows up in the manifest — no code edits required. Used by
// src/data/sceneAssets.js to drive auto-collider loading and world→object
// mapping.
//
// In dev, the manifest is re-read on every server full-reload; the configureServer
// hook below watches both folders and triggers a reload when files appear or
// disappear, so adding a GLB shows up immediately without restarting Vite.
function assetManifestPlugin() {
  const VIRTUAL_ID = "virtual:asset-manifest";
  const RESOLVED_ID = "\0" + VIRTUAL_ID;
  const FOLDERS = ["colliders", "objects"];

  function scan() {
    const out = {};
    for (const folder of FOLDERS) {
      const dir = join("public", folder);
      out[folder] = existsSync(dir)
        ? readdirSync(dir).filter((f) => f.toLowerCase().endsWith(".glb")).sort()
        : [];
    }
    return out;
  }

  return {
    name: "fairy-worlds-asset-manifest",
    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID;
    },
    load(id) {
      if (id !== RESOLVED_ID) return;
      const manifest = scan();
      // Inline as JSON so the bundle gets a frozen snapshot at build time.
      return `export const colliders = ${JSON.stringify(manifest.colliders)};
export const objects = ${JSON.stringify(manifest.objects)};`;
    },
    configureServer(server) {
      const watchPaths = FOLDERS.map((f) => join("public", f));
      for (const p of watchPaths) {
        if (existsSync(p)) server.watcher.add(p);
      }
      const onChange = (path) => {
        if (FOLDERS.some((f) => path.includes(`public${join("/", f)}`) || path.includes(`public\\${f}`))) {
          // Invalidate the virtual module so the next request re-scans.
          const mod = server.moduleGraph.getModuleById(RESOLVED_ID);
          if (mod) server.moduleGraph.invalidateModule(mod);
          server.ws.send({ type: "full-reload" });
        }
      };
      server.watcher.on("add", onChange);
      server.watcher.on("unlink", onChange);
    },
  };
}

export default defineConfig({
  base: "/fairy-worlds/",
  build: {
    target: "esnext",
  },
  plugins: [assetManifestPlugin()],
});
