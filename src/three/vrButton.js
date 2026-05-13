import {
  trackVRSessionStart,
  trackVRSessionEnd,
  noteVRControllerUsed,
} from "../utils/analytics.js";

export function createVRController(renderer, onStatus, handlers = {}) {
  let currentSession = null;

  // Double-trigger detection: hold the single-trigger action for
  // DOUBLE_WINDOW_MS; if a second trigger on the same hand fires within that
  // window, cancel and fire the world-skip action instead. A second trigger
  // on the OTHER hand within that window cancels too and fires recenter.
  const DOUBLE_WINDOW_MS = 250;
  const pendingSingle = { left: null, right: null };

  function onSelectStart(event) {
    noteVRControllerUsed();
    const hand = event.inputSource?.handedness;
    if (hand !== "left" && hand !== "right") return;
    const otherHand = hand === "left" ? "right" : "left";

    // Both triggers within DOUBLE_WINDOW_MS = recenter. Provided as an
    // emulator-friendly alternative to the menu button (button[3]) since the
    // WebXR Emulator's HTC Vive profile only exposes select + squeeze.
    if (pendingSingle[otherHand]) {
      clearTimeout(pendingSingle[otherHand]);
      pendingSingle[otherHand] = null;
      handlers.onRecenter?.();
      return;
    }

    if (pendingSingle[hand]) {
      clearTimeout(pendingSingle[hand]);
      pendingSingle[hand] = null;
      if (hand === "right") handlers.onWorldNext?.();
      else handlers.onWorldPrev?.();
      return;
    }

    pendingSingle[hand] = setTimeout(() => {
      pendingSingle[hand] = null;
      if (hand === "right") handlers.onCycleNext?.();
      else handlers.onCyclePrev?.();
    }, DOUBLE_WINDOW_MS);
  }

  function onSqueezeStart() {
    noteVRControllerUsed();
    currentSession?.end();
  }

  const sessionInit = {
    optionalFeatures: ["local-floor", "bounded-floor", "hand-tracking"],
  };

  function setLabel(text) {
    onStatus?.(text);
  }

  async function onSessionStarted(session) {
    session.addEventListener("end", onSessionEnded);
    session.addEventListener("selectstart", onSelectStart);
    session.addEventListener("squeezestart", onSqueezeStart);
    currentSession = session;
    trackVRSessionStart();
    setLabel("✦ exit VR ✦");
    try {
      await renderer.xr.setSession(session);
      // Defer to next frame so xrCam has a valid pose before recentering.
      requestAnimationFrame(() => handlers.onSessionStart?.());
    } catch (err) {
      console.error("renderer.xr.setSession failed:", err);
    }
  }

  function onSessionEnded() {
    if (!currentSession) return;
    currentSession.removeEventListener("end", onSessionEnded);
    currentSession.removeEventListener("selectstart", onSelectStart);
    currentSession.removeEventListener("squeezestart", onSqueezeStart);
    if (pendingSingle.left) clearTimeout(pendingSingle.left);
    if (pendingSingle.right) clearTimeout(pendingSingle.right);
    pendingSingle.left = pendingSingle.right = null;
    currentSession = null;
    trackVRSessionEnd();
    setLabel("✦ open in VR ✦");
  }

  async function toggle() {
    if (currentSession) {
      await currentSession.end();
      return;
    }
    if (!navigator.xr) return;
    try {
      const session = await navigator.xr.requestSession("immersive-vr", sessionInit);
      await onSessionStarted(session);
    } catch (err) {
      console.warn("VR session failed:", err);
      setLabel("VR unavailable");
    }
  }

  async function refreshSupport() {
    if (!navigator.xr) {
      setLabel("✦ VR unavailable ✦");
      return;
    }
    try {
      const supported = await navigator.xr.isSessionSupported("immersive-vr");
      setLabel(supported ? "✦ open in VR ✦" : "✦ no VR device ✦");
    } catch {
      setLabel("✦ VR error ✦");
    }
  }

  refreshSupport();

  return { toggle, isPresenting: () => !!currentSession };
}
