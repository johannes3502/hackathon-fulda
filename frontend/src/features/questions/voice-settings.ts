const STORAGE_KEY = "pitchcoach.protectAgentSpeech";
const CHANGED = "pitchcoach:voice-settings";
let fallback = false;

/** Off by default: keep the existing interruptible conversation unless opted in. */
export function voiceProtectionSnapshot(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return fallback;
  }
}

export function storeVoiceProtection(enabled: boolean) {
  fallback = enabled;
  try {
    localStorage.setItem(STORAGE_KEY, String(enabled));
  } catch {}
  window.dispatchEvent(new Event(CHANGED));
}

export function subscribeVoiceProtection(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) onChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(CHANGED, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CHANGED, onChange);
  };
}
