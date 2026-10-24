import type {
  PresentationMode,
  ProgressResponse,
  ProfileGoalRecord,
  ProfileIdentity,
  ProgressWindow,
} from "./contract";
import type { StoredProfile } from "./profile-store";

export type ProgressQuery = {
  window: ProgressWindow;
  presentationMode: PresentationMode | "all";
  includeExcluded: boolean;
};

export class ProgressApiError extends Error {
  status: number;
  code?: string;
  requestId?: string;

  constructor(
    message: string,
    status: number,
    code?: string,
    requestId?: string,
  ) {
    super(message);
    this.name = "ProgressApiError";
    this.status = status;
    this.code = code;
    this.requestId = requestId;
  }
}

function newIdempotencyKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function parseError(response: Response): Promise<ProgressApiError> {
  let message = `Anfrage fehlgeschlagen (HTTP ${response.status}).`;
  let code: string | undefined;
  let requestId: string | undefined;
  try {
    const body = (await response.json()) as {
      error?: { code?: string; message?: string; requestId?: string };
      detail?: unknown;
    };
    if (body.error?.message) message = body.error.message;
    if (body.error?.code) code = body.error.code;
    if (body.error?.requestId) requestId = body.error.requestId;
    if (!body.error && typeof body.detail === "string") message = body.detail;
  } catch {
    // Keep the HTTP fallback; never surface a token or raw URL.
  }
  return new ProgressApiError(message, response.status, code, requestId);
}

async function request<T>(
  path: string,
  profile: StoredProfile | null,
  init?: RequestInit,
  signal?: AbortSignal,
): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");
  if (profile) headers.set("X-Profile-Token", profile.token);
  const response = await fetch(path, {
    ...init,
    headers,
    signal,
    cache: "no-store",
  });
  if (!response.ok) throw await parseError(response);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export async function createProfile(displayName: string): Promise<StoredProfile> {
  const now = new Date();
  const retention = new Date(now);
  retention.setUTCFullYear(retention.getUTCFullYear() + 1);
  const body = {
    displayName: displayName.trim() || "Mein Übungsprofil",
    locale: "de",
    consent: {
      granted: true,
      at: now.toISOString(),
      version: "2026-10-24",
      scope: "long-term-progress",
      retentionUntil: retention.toISOString(),
    },
  };
  const response = await request<{
    profile: ProfileIdentity;
    token: string | null;
    tokenIssued: boolean;
  }>("/api/profiles", null, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": newIdempotencyKey(),
    },
    body: JSON.stringify(body),
  });
  if (!response.token) {
    throw new ProgressApiError(
      "Das Profil wurde angelegt, aber der Token wurde nicht ausgeliefert. Bitte lege ein neues Profil an.",
      500,
      "E_PROFILE_TOKEN_MISSING",
    );
  }
  return {
    profileId: response.profile.profileId,
    token: response.token,
    displayName: response.profile.displayName,
    createdAt: response.profile.createdAt,
  };
}

export async function loadProgress(
  profile: StoredProfile,
  query: ProgressQuery,
  signal?: AbortSignal,
): Promise<ProgressResponse> {
  const parameters = new URLSearchParams({
    window: query.window,
    metrics: "primary",
    includeExcluded: String(query.includeExcluded),
  });
  if (query.presentationMode !== "all") {
    parameters.set("presentationMode", query.presentationMode);
  }
  return request<ProgressResponse>(
    `/api/profiles/${encodeURIComponent(profile.profileId)}/progress?${parameters}`,
    profile,
    undefined,
    signal,
  );
}

export async function saveGoal(
  profile: StoredProfile,
  metricId: string,
  goal: {
    direction: "increase" | "decrease" | "target_band";
    targetValue?: number | null;
    targetMin?: number | null;
    targetMax?: number | null;
  },
): Promise<ProfileGoalRecord> {
  const response = await request<{ goal: ProfileGoalRecord }>(
    `/api/profiles/${encodeURIComponent(profile.profileId)}/goals/${encodeURIComponent(metricId)}`,
    profile,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": newIdempotencyKey(),
      },
      body: JSON.stringify({
        direction: goal.direction,
        targetValue: goal.targetValue ?? null,
        targetMin: goal.targetMin ?? null,
        targetMax: goal.targetMax ?? null,
      }),
    },
  );
  return response.goal;
}

export async function removeGoal(
  profile: StoredProfile,
  metricId: string,
): Promise<void> {
  await request<void>(
    `/api/profiles/${encodeURIComponent(profile.profileId)}/goals/${encodeURIComponent(metricId)}`,
    profile,
    {
      method: "DELETE",
      headers: { "Idempotency-Key": newIdempotencyKey() },
    },
  );
}

export async function deleteProfile(profile: StoredProfile): Promise<void> {
  try {
    await request<void>(
      `/api/profiles/${encodeURIComponent(profile.profileId)}`,
      profile,
      {
        method: "DELETE",
        headers: { "Idempotency-Key": newIdempotencyKey() },
      },
    );
  } catch (error) {
    if (!(error instanceof ProgressApiError) || error.status !== 404) {
      throw error;
    }
  }
}

export async function downloadExport(
  profile: StoredProfile,
  format: "json" | "csv",
): Promise<void> {
  const response = await fetch(
    `/api/profiles/${encodeURIComponent(profile.profileId)}/export?format=${format}`,
    {
      headers: { "X-Profile-Token": profile.token },
      cache: "no-store",
    },
  );
  if (!response.ok) throw await parseError(response);
  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition") ?? "";
  const filename =
    /filename="?([^";]+)"?/.exec(disposition)?.[1] ??
    `progress-${profile.profileId}.${format}`;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function isAbortError(error: unknown) {
  return (
    error instanceof DOMException &&
    (error.name === "AbortError" || error.name === "TimeoutError")
  );
}
