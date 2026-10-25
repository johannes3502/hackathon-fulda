import { stageFetch } from "./http";
import { loadPitchContext } from "./pitch";

export type StageCheckStatus = "ready" | "optional" | "blocked";

export type StageCheck = {
  id: string;
  label: string;
  status: StageCheckStatus;
  detail: string;
};

const HEALTH_PATH = "/api/health/ready";
const FACTCHECK_PATH = "/api/factcheck/settings";

const SERVICE_LABELS: Record<string, string> = {
  postgres: "Datenbank",
  storage: "Objektspeicher",
  redis: "Queue",
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

const check = (
  id: string,
  label: string,
  status: StageCheckStatus,
  detail: string,
): StageCheck => ({ id, label, status, detail });

async function checkBackend(signal: AbortSignal): Promise<StageCheck> {
  try {
    const response = await stageFetch(HEALTH_PATH, signal);
    const body = await response.json().catch(() => null);
    const unavailable = Object.entries(SERVICE_LABELS)
      .filter(([key]) => !isObject(body) || body[key] !== "ok")
      .map(([, label]) => label);
    if (response.ok && unavailable.length === 0)
      return check(
        "backend",
        "Backend",
        "ready",
        "Datenbank, Objektspeicher und Queue antworten.",
      );
    return check(
      "backend",
      "Backend",
      "blocked",
      unavailable.length > 0
        ? `Nicht bereit: ${unavailable.join(", ")}.`
        : `Health-Check meldet HTTP ${response.status}.`,
    );
  } catch (error) {
    if (signal.aborted) throw error;
    return check(
      "backend",
      "Backend",
      "blocked",
      "Nicht erreichbar. Die lokale Sofortaufnahme bleibt möglich.",
    );
  }
}

async function checkFactCheck(signal: AbortSignal): Promise<StageCheck> {
  try {
    const response = await stageFetch(FACTCHECK_PATH, signal);
    if (!response.ok)
      throw new Error(`HTTP ${response.status}`);
    const body = await response.json();
    if (!isObject(body) || typeof body.available !== "boolean")
      throw new Error("Ungültige Einstellungen");
    if (body.available) {
      const model =
        typeof body.model === "string" && body.model.trim()
          ? body.model.trim()
          : "konfiguriert";
      return check(
        "factcheck",
        "Quellencheck",
        "ready",
        `Modell: ${model}.`,
      );
    }
    return check(
      "factcheck",
      "Quellencheck",
      "optional",
      "Nicht konfiguriert. Live-Aufnahme bleibt möglich; der Quellencheck entfällt.",
    );
  } catch (error) {
    if (signal.aborted) throw error;
    return check(
      "factcheck",
      "Quellencheck",
      "optional",
      "Einstellungen nicht erreichbar; der Quellencheck entfällt.",
    );
  }
}

async function checkPitchQuestion(signal: AbortSignal): Promise<StageCheck> {
  try {
    const { source } = await loadPitchContext(signal);
    return check(
      "pitch",
      "Jury-Frage",
      "ready",
      source === "backend"
        ? "Vom lokalen Backend geladen."
        : "Lokal hinterlegt – funktioniert ohne Backend.",
    );
  } catch (error) {
    if (signal.aborted) throw error;
    return check(
      "pitch",
      "Jury-Frage",
      "ready",
      "Lokal hinterlegt – funktioniert ohne Backend.",
    );
  }
}

/** Fetch the four service checks in parallel; each failure has its own copy. */
export async function loadPreflight(signal: AbortSignal): Promise<StageCheck[]> {
  return Promise.all([
    checkBackend(signal),
    checkFactCheck(signal),
    checkPitchQuestion(signal),
  ]);
}

/** Capability checks only: never prompt for camera or microphone permission. */
export function browserPreflightChecks(): StageCheck[] {
  if (typeof window === "undefined") return [];

  let captureApi = false;
  try {
    captureApi =
      typeof navigator !== "undefined" &&
      typeof navigator.mediaDevices?.getUserMedia === "function" &&
      typeof window.MediaRecorder === "function";
  } catch {}

  let localStore = false;
  try {
    localStore = typeof indexedDB !== "undefined" && indexedDB !== null;
  } catch {}

  return [
    check(
      "camera",
      "Kamera & Mikrofon",
      captureApi ? "ready" : "blocked",
      captureApi
        ? "Browser-APIs vorhanden. Berechtigungen werden erst beim Start abgefragt."
        : "Aufnahme-APIs fehlen oder sind ohne HTTPS bzw. localhost gesperrt.",
    ),
    check(
      "secure",
      "Sichere Verbindung",
      window.isSecureContext ? "ready" : "blocked",
      window.isSecureContext
        ? "HTTPS oder localhost erkannt."
        : "Kamera und Mikrofon brauchen HTTPS oder localhost.",
    ),
    check(
      "storage",
      "Lokaler Speicher",
      localStore ? "ready" : "blocked",
      localStore
        ? "IndexedDB ist verfügbar; Aufnahmen bleiben lokal."
        : "IndexedDB fehlt; Aufnahmen können nicht lokal gespeichert werden.",
    ),
  ];
}
