// React Native's AbortController lacks AbortSignal.any/timeout/throwIfAborted.
export function requestAbort(parent: AbortSignal, timeoutMs: number) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  parent.addEventListener("abort", abort, { once: true });
  if (parent.aborted) abort();
  const timer = setTimeout(abort, timeoutMs);
  return {
    signal: controller.signal,
    dispose: () => {
      clearTimeout(timer);
      parent.removeEventListener("abort", abort);
    },
  };
}
export function waitForPoll(signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const stop = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", stop);
      reject(new Error("Analysis cancelled."));
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", stop);
      resolve();
    }, 1000);
    signal.addEventListener("abort", stop, { once: true });
    if (signal.aborted) stop();
  });
}
