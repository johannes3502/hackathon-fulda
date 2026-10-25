import { expect, test, type Page } from "@playwright/test";

const id = "fact-score-regression";
const collection = "11111111-1111-4111-8111-111111111111";
const jobId = "22222222-2222-4222-8222-222222222222";
const words = [{ word: "Synthetischer Vortrag.", start_ms: 0, end_ms: 2000 }];

async function prepare(
  page: Page,
  available = true,
  withWords = true,
  sources = true,
) {
  await page.route("**/api/factcheck/settings", (route) =>
    route.fulfill({
      json: {
        available,
        model: "synthetic",
        llm_host: "example.test",
        web_provider: null,
      },
    }),
  );
  await page.route("**/api/sources?collection_id=*", (route) =>
    route.fulfill({ json: sources ? [{ status: "ready" }] : [] }),
  );
  await page.goto("/");
  await page.evaluate(
    async ({ id, collection, words }) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open("presentation-recordings", 1);
        request.onupgradeneeded = () =>
          request.result.createObjectStore("recordings", { keyPath: "id" });
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction("recordings", "readwrite");
        tx.objectStore("recordings").put({
          id,
          config: {
            title: "Synthetic fact-score test",
            mode: "backend",
            endpoint: "/api",
            sourceCollectionId: collection,
            targetMs: 10000,
          },
          createdAt: "2026-10-25T00:00:00Z",
          durationMs: 10000,
          video: new Blob([], { type: "video/webm" }),
          mimeType: "video/webm",
          feedback: [],
          metrics: [],
          chunksSent: 0,
          bytesSent: 0,
          completion: "complete",
          notice: null,
          // Older recordings may have transcript.words without the duplicate words field.
          transcript: {
            words,
            provider: "synthetic",
            synthetic: true,
            notices: [],
          },
        });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    },
    { id, collection, words: withWords ? words : [] },
  );
}

for (const view of ["review", "analysis"]) {
  test(`fact-check action updates and persists the score in ${view}`, async ({
    page,
  }) => {
    await prepare(page);
    let posts = 0;
    await page.route("**/api/factcheck", async (route) => {
      posts++;
      expect(route.request().postDataJSON()).toEqual({
        words,
        collection_id: collection,
        use_web: false,
      });
      await route.fulfill({ status: 202, json: { job_id: jobId } });
    });
    await page.route(`**/api/factcheck/jobs/${jobId}`, (route) =>
      route.fulfill({
        json: {
          job_id: jobId,
          status: "completed",
          result: {
            claims: [
              "supports",
              "supports",
              "contradicts",
              "not_found",
              "unchecked",
            ].map((verdict, index) => ({
              claim: `Synthetic claim ${index}`,
              transcript: words[0].word,
              t_ms: index * 1000,
              duration_ms: 1000,
              verdict,
              checked: ["upload"],
              explanation: "Synthetic evidence",
              evidence:
                index < 3
                  ? {
                      kind: "upload",
                      label: "Synthetic source",
                      quote: "Synthetic verified passage.",
                      passage: "Synthetic verified passage.",
                      quote_verified: "exact",
                      weak: false,
                    }
                  : null,
            })),
            notices: [],
            events: [],
            model: "synthetic",
            sources_checked: true,
          },
        },
      }),
    );
    await page.goto(`/live/${id}/${view}`);
    const score = page
      .locator(".review-score-card")
      .filter({ hasText: "Fachwissen" });
    await expect(score.locator(".review-score-value")).toHaveText("–");
    const action = page.getByRole("button", {
      name: "Check facts",
      exact: true,
    });
    await expect(action).toBeVisible();
    await expect(action).toBeEnabled();
    expect(posts).toBe(0);
    await action.click();
    await expect(score.locator(".review-score-value")).toHaveText("67/100");
    await expect(score).toContainText("2 Aussagen offen");
    await expect
      .poll(() =>
        page.evaluate(async (id) => {
          const db = await new Promise<IDBDatabase>((resolve) => {
            const request = indexedDB.open("presentation-recordings", 1);
            request.onsuccess = () => resolve(request.result);
          });
          const stored = await new Promise<{
            factCheck?: { claims: unknown[] };
          }>((resolve) => {
            const request = db
              .transaction("recordings")
              .objectStore("recordings")
              .get(id);
            request.onsuccess = () => resolve(request.result);
          });
          db.close();
          return stored.factCheck?.claims.length;
        }, id),
      )
      .toBe(5);
    await page.reload();
    await expect(score.locator(".review-score-value")).toHaveText("67/100");
    await page.goto(`/live/${id}/${view === "review" ? "analysis" : "review"}`);
    await expect(score.locator(".review-score-value")).toHaveText("67/100");
    expect(posts).toBe(1);
  });
}

test("missing configuration, transcript and sources explain an empty score", async ({
  page,
}) => {
  await prepare(page, false, false, false);
  await page.goto(`/live/${id}/review`);
  await expect(
    page.getByText("Fact-checking is unavailable:", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByText("No transcript is available for this recording.", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("No sources are ready.", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Check facts", exact: true }),
  ).toBeDisabled();
  await expect(
    page
      .locator(".review-score-card")
      .filter({ hasText: "Fachwissen" })
      .locator(".review-score-value"),
  ).toHaveText("–");
});
