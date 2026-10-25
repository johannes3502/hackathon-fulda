import { expect, test } from "@playwright/test";
import { syntheticCamera, syntheticPose } from "./helpers/capture";

for (const stage of [true, false]) {
  test(`${stage ? "local Stage" : "backend"}: measured positive posture and voice reach both reviews and survive reload`, async ({
    page,
  }) => {
    await syntheticCamera(page);
    await syntheticPose(page);
    await page.route("**/api/health/**", (route) =>
      route.fulfill({ json: { status: "ok" } }),
    );
    await page.route("**/api/speech/analyze", (route) =>
      route.fulfill({ status: 202, json: { job_id: "positive-test" } }),
    );
    await page.route("**/api/speech/jobs/positive-test", (route) =>
      route.fulfill({
        json: {
          job_id: "positive-test",
          status: "completed",
          result: {
            audio: { summary: {} },
            events: [],
            words: [],
            synthetic_demo: true,
          },
        },
      }),
    );
    await page.routeWebSocket("**/api/speech/feedback", (socket) =>
      socket.close(),
    );
    await page.routeWebSocket("**/api/speech/live", (socket) => socket.close());
    await page.goto(stage ? "/live?stage=1&local=1" : "/live");
    if (!stage) {
      await page.getByText("Recording options", { exact: true }).click();
      await page.getByLabel("Create a transcript").uncheck();
    }
    await page.getByRole("button", { name: "Enable camera" }).click();
    await expect(
      page.getByRole("button", {
        name: stage ? "Demo starten" : "Start recording",
        exact: true,
      }),
    ).toBeEnabled();
    await page
      .getByRole("button", {
        name: stage ? "Demo starten" : "Start recording",
        exact: true,
      })
      .click();
    await expect(page.locator(".live-view-time")).toHaveText("0:09", {
      timeout: 18000,
    });
    await page
      .getByRole("button", {
        name: stage ? "Demo beenden & Review" : "Finish & review",
      })
      .click();
    await expect(page).toHaveURL(/\/review(?:\?stage=1)?$/);
    const scores = page.getByRole("region", {
      name: "Bewertung der drei Kriterien",
    });
    await expect(scores.locator(".review-score-value")).toHaveText([
      "100/100",
      "–",
      "100/100",
    ]);
    await page.reload();
    await expect(scores.locator(".review-score-value")).toHaveText([
      "100/100",
      "–",
      "100/100",
    ]);
    await page.goto(page.url().replace(/review(?:\?stage=1)?$/, "analysis"));
    await expect(scores.locator(".review-score-value")).toHaveText([
      "100/100",
      "–",
      "100/100",
    ]);
    await expect(
      page.getByRole("button", { name: /Torso steady near your reference/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Voice level near your reference/ }),
    ).toBeVisible();
  });
}
