import { expect, test } from "@playwright/test";

test("a completed take with only measured positive evidence shows its final score after reload", async ({
  page,
}) => {
  await page.route("**/api/questions/agent/settings", (route) =>
    route.fulfill({ json: { available: false } }),
  );
  await page.goto("/");
  await page.evaluate(async () => {
    const request = indexedDB.open("presentation-recordings", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("recordings", { keyPath: "id" });
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("recordings", "readwrite");
      tx.objectStore("recordings").put({
        id: "positive-final",
        config: {
          title: "Synthetic completed take",
          targetMs: 60000,
          mode: "local",
          endpoint: "/api",
        },
        durationMs: 60000,
        createdAt: "2026-10-25T00:00:00Z",
        video: new Blob(["synthetic"], { type: "video/webm" }),
        mimeType: "video/webm",
        conversationFinished: true,
        conversation: [{ role: "agent", text: "Synthetic question." }],
        feedback: ["Posture", "volume"].map((category) => ({
          id: category,
          category,
          kind: "positive",
          startMs: 4000,
          endMs: 60000,
          title: `Measured ${category}`,
          detail: "Synthetic measurements",
          action: "Replay",
        })),
        metrics: [],
        chunksSent: 1,
        bytesSent: 9,
        completion: "complete",
        notice: null,
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  });
  await page.goto("/live/positive-final/review");
  for (let visit = 0; visit < 2; visit++) {
    await page
      .getByRole("group", { name: "Review steps" })
      .getByRole("button", { name: "Practice questions" })
      .click();
    await expect(
      page.getByRole("heading", { name: "Your take at a glance" }),
    ).toBeVisible();
    await expect(page.locator(".performance-score")).toHaveText("100/100");
    await expect(page.locator(".performance-evidence")).toHaveCount(2);
    await page.reload();
  }
});
