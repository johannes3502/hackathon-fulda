/** Backend calls and Celery job polling shared by audio, fact-check and questions. */

const UUID = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
export const isObject = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);

export async function callBackend(
  endpoint: string,
  path: string,
  signal: AbortSignal,
  init?: RequestInit,
): Promise<unknown> {
  const response = await fetch(`${endpoint}${path}`, {
    ...init,
    signal: AbortSignal.any([signal, AbortSignal.timeout(120000)]),
    cache: "no-store",
  });
  if (!response.ok) {
    let detail = "";
    try {
      const body = (await response.json()) as { detail?: unknown };
      if (typeof body.detail === "string")
        detail = `: ${body.detail.slice(0, 250)}`;
    } catch {}
    throw new Error(
      `Backend ${path} failed (HTTP ${response.status})${detail}`,
    );
  }
  if (response.status === 204) return undefined;
  return response.json();
}

/**
 * POST `body` (JSON, or multipart if it is `FormData`) to `path`, then poll `${statusPath}/{job_id}` until the job
 * finishes (at most 11 minutes, the worker's hard limit).
 */
export async function runBackendJob<T>(
  endpoint: string,
  job: {
    path: string;
    statusPath: string;
    body: unknown;
    label: string;
    valid: (result: unknown) => result is T;
  },
  signal: AbortSignal,
  pollMs = 1500,
): Promise<T> {
  // FormData sets its own multipart boundary.
  const accepted = await callBackend(
    endpoint,
    job.path,
    signal,
    job.body instanceof FormData
      ? { method: "POST", body: job.body }
      : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(job.body),
        },
  );
  return waitForBackendJob(endpoint, accepted, job, signal, pollMs);
}

export async function waitForBackendJob<T>(
  endpoint: string,
  accepted: unknown,
  job: {
    statusPath: string;
    label: string;
    valid: (result: unknown) => result is T;
  },
  signal: AbortSignal,
  pollMs = 1500,
): Promise<T> {
  if (
    !isObject(accepted) ||
    typeof accepted.job_id !== "string" ||
    !UUID.test(accepted.job_id)
  )
    throw new Error(`The backend returned an invalid ${job.label} job.`);
  const active = AbortSignal.any([signal, AbortSignal.timeout(660000)]);
  while (true) {
    active.throwIfAborted();
    const status = await callBackend(
      endpoint,
      `${job.statusPath}/${accepted.job_id}`,
      active,
    );
    if (!isObject(status) || status.job_id !== accepted.job_id)
      throw new Error(`The backend returned an invalid ${job.label} job.`);
    if (status.status === "failed")
      throw new Error(
        typeof status.error === "string"
          ? status.error
          : `The ${job.label} failed.`,
      );
    if (status.status === "completed") {
      if (!job.valid(status.result))
        throw new Error(`The backend returned an invalid ${job.label}.`);
      return status.result;
    }
    if (status.status !== "queued" && status.status !== "running")
      throw new Error(`The backend returned an invalid ${job.label} job.`);
    await new Promise<void>((resolve, reject) => {
      const abort = () => {
        clearTimeout(timer);
        reject(active.reason);
      };
      const timer = setTimeout(() => {
        active.removeEventListener("abort", abort);
        resolve();
      }, pollMs);
      active.addEventListener("abort", abort, { once: true });
      if (active.aborted) abort();
    });
  }
}
