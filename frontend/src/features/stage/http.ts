const DEFAULT_TIMEOUT_MS = 8_000;

/**
 * Fetch from the stage console with a bounded wait. A hanging provider must
 * never freeze the preflight; callers turn failures into a clear status.
 */
export async function stageFetch(
  url: string,
  signal: AbortSignal,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  signal.throwIfAborted();
  const controller = new AbortController();
  const abort = () => controller.abort(signal.reason);
  signal.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(
    () => controller.abort(new DOMException("Zeitüberschreitung", "TimeoutError")),
    timeoutMs,
  );
  try {
    return await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", abort);
  }
}
