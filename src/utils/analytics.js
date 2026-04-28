// GA4 wrapper. All calls fail silently if gtag isn't loaded
// (e.g. localhost dev, ad-blocker, offline).

function gtagSafe(...args) {
  try {
    if (typeof window !== "undefined" && typeof window.gtag === "function") {
      window.gtag(...args);
    }
  } catch {
    // swallow — analytics must never break the app
  }
}

export function trackCharacterSelect(characterId) {
  gtagSafe("event", "character_select", { character_id: characterId });
}

export function trackWorldEnter({ sceneId, world, version, from }) {
  gtagSafe("event", "world_enter", {
    scene_id: sceneId,
    world,
    version,
    from,
  });
}

// VR session metrics are accumulated here so any module can contribute
// (world.js increments worlds_visited + max_distance, vrButton.js owns
// start/end + controller_used). Reset on each session start.
let vrMetrics = null;

export function trackVRSessionStart() {
  vrMetrics = {
    startedAt: performance.now(),
    worldsVisited: 0,
    maxDistance: 0,
    controllerUsed: false,
  };
  gtagSafe("event", "vr_session_start");
}

export function trackVRSessionEnd() {
  if (!vrMetrics) return;
  const durationSeconds = (performance.now() - vrMetrics.startedAt) / 1000;
  gtagSafe("event", "vr_session_end", {
    duration_seconds: Math.round(durationSeconds),
    worlds_visited: vrMetrics.worldsVisited,
    max_distance_from_spawn: Math.round(vrMetrics.maxDistance * 100) / 100,
    controller_used: vrMetrics.controllerUsed,
  });
  vrMetrics = null;
}

export function noteVRWorldVisited() {
  if (vrMetrics) vrMetrics.worldsVisited += 1;
}

export function noteVRDistance(distance) {
  if (vrMetrics && distance > vrMetrics.maxDistance) vrMetrics.maxDistance = distance;
}

export function noteVRControllerUsed() {
  if (vrMetrics) vrMetrics.controllerUsed = true;
}

// Derive the trailing version token from a scene title, e.g.
//   "Heart Pool Pavilion 1.1"      -> "1.1"
//   "Heart Pool Pavilion 1.1-1004" -> "1.1-1004"
export function sceneVersionFromTitle(title) {
  if (!title) return "";
  const parts = title.trim().split(/\s+/);
  const last = parts[parts.length - 1];
  return /^[\d.\-]+$/.test(last) ? last : "";
}
