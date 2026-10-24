import { expect, test } from "@playwright/test";

for (const model of ["lite", "heavy"] as const) {
  for (const runningMode of ["IMAGE", "VIDEO"] as const) {
    test(`real local ${model}/${runningMode} worker processes consecutive synthetic frames`, async ({
      page,
    }, info) => {
      await page.goto("/");
      const result = await page.evaluate(
        async (options) => {
          const worker = new Worker("/pose/worker.js");
          return new Promise<{
            backend: {
              model: string;
              runningMode: string;
              pose: string;
              hand: string | null;
            };
            timestamps: number[];
            inferenceMs: number[];
          }>((resolve, reject) => {
            const timeout = setTimeout(() => {
              worker.terminate();
              reject(new Error("Real model worker timed out"));
            }, 45000);
            const finish = () => {
              clearTimeout(timeout);
              worker.terminate();
            };
            let backend: {
              model: string;
              runningMode: string;
              pose: string;
              hand: string | null;
            };
            const timestamps: number[] = [],
              inferenceMs: number[] = [];
            function sendFrame(timestamp: number) {
              const canvas = new OffscreenCanvas(640, 480);
              const ctx = canvas.getContext("2d")!;
              ctx.fillStyle = "#18324b";
              ctx.fillRect(0, 0, 640, 480);
              ctx.fillStyle = "#ffffff";
              ctx.fillRect(timestamp / 10, 100, 30, 30);
              const frame = canvas.transferToImageBitmap();
              worker.postMessage({ type: "frame", frame, timestamp }, [frame]);
            }
            worker.onerror = (event) => {
              finish();
              reject(new Error(event.message));
            };
            worker.onmessage = ({ data }) => {
              if (data.type === "error") {
                finish();
                reject(new Error(data.message));
              }
              if (data.type === "ready") {
                backend = data.backend;
                sendFrame(1000);
              }
              if (data.type === "backend") backend = data.backend;
              if (data.type === "sample") {
                timestamps.push(data.timestamp);
                inferenceMs.push(data.inferenceMs);
                if (timestamps.length === 1) sendFrame(1100);
                else {
                  finish();
                  resolve({ backend, timestamps, inferenceMs });
                }
              }
            };
            worker.postMessage({ type: "init", options });
          });
        },
        { model, runningMode },
      );
      expect(result.backend).toMatchObject({ model, runningMode });
      expect(["CPU", "GPU"]).toContain(result.backend.hand);
      expect(["CPU", "GPU"]).toContain(result.backend.pose);
      expect(result.timestamps).toEqual([1000, 1100]);
      expect(
        result.inferenceMs.every((n) => Number.isFinite(n) && n >= 0),
      ).toBe(true);
      await info.attach("synthetic-worker-smoke", {
        body: JSON.stringify(result, null, 2),
        contentType: "application/json",
      });
    });
  }
}
