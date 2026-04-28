import {
  trackVRSessionStart,
  trackVRSessionEnd,
  noteVRControllerUsed,
} from "../utils/analytics.js";

export function createVRController(renderer, onStatus, handlers = {}) {
  let currentSession = null;

  function onSelectStart(event) {
    noteVRControllerUsed();
    const hand = event.inputSource?.handedness;
    if (hand === "right") handlers.onCycleNext?.();
    else if (hand === "left") handlers.onCyclePrev?.();
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
    } catch (err) {
      console.error("renderer.xr.setSession failed:", err);
    }
  }

  function onSessionEnded() {
    if (!currentSession) return;
    currentSession.removeEventListener("end", onSessionEnded);
    currentSession.removeEventListener("selectstart", onSelectStart);
    currentSession.removeEventListener("squeezestart", onSqueezeStart);
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
