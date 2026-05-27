// Resolves which collider + dropable objects belong to a scene/world, based on
// filename conventions in public/colliders and public/objects (scanned by the
// vite asset-manifest plugin).
//
// Conventions:
//   Colliders: public/colliders/<scene-id>_collider.glb
//     The <scene-id> matches a SCENES[].id verbatim. One collider per scene
//     (multiple scenes in the same world group can share a collider only by
//     duplicating the file with each scene id — that's fine, GLBs are small).
//
//   Objects:   public/objects/<world-slug>_<anything>.glb
//     <world-slug> is the world name lowercased with non-alphanumerics replaced
//     by '-' (collapsed, trimmed). e.g. "Frutiger Rainbow Cafe" -> "frutiger-rainbow-cafe".
//     <anything> is free-form (used only for cycle order — alphabetical by
//     filename). A world with no matching files falls back to colored boxes.

import { colliders, objects } from "virtual:asset-manifest";

const BASE = import.meta.env.BASE_URL;

export function worldSlug(worldName) {
  return worldName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Returns the collider URL for a scene id, or null if no file matches.
// File names are scanned at build/config time, so a missing file means a
// silent "no collider" — caller doesn't need to handle 404.
export function getColliderForScene(sceneId) {
  const filename = `${sceneId}_collider.glb`;
  if (!colliders.includes(filename)) return null;
  return BASE + "colliders/" + encodeURIComponent(filename);
}

// Returns the list of object URLs mapped to a world, sorted alphabetically by
// filename so the spawn cycle is deterministic. Empty array if none.
export function getObjectsForWorld(worldName) {
  const prefix = worldSlug(worldName) + "_";
  return objects
    .filter((f) => f.toLowerCase().startsWith(prefix))
    .map((f) => BASE + "objects/" + encodeURIComponent(f));
}
