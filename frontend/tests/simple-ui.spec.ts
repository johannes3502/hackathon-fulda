import { expect, test } from "@playwright/test";

test("the simple entry keeps optional setup available and shares the 418 identity", async ({
  page,
}, info) => {
  await page.route("**/sources?collection_id=*", (route) =>
    route.fulfill({ json: [] }),
  );
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Try sample demo" }),
  ).toBeVisible();
  await expect(page.getByLabel("Pitch title")).toBeHidden();
  await page
    .getByText("Customize the sample rehearsal", { exact: true })
    .click();
  await expect(page.getByLabel("Pitch title")).toBeVisible();
  await expect(page.getByLabel("Who’s listening?")).toBeHidden();
  await page.getByText("Practice options", { exact: true }).click();
  await expect(page.getByLabel("Who’s listening?")).toBeVisible();

  for (const path of ["/", "/live", "/sources", "/review-preview"]) {
    await page.goto(path);
    await expect(page.getByRole("link", { name: "418 home" })).toBeVisible();
    await expect(page.locator("main")).toHaveCount(1);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath(`${path.replaceAll("/", "") || "home"}.png`),
      fullPage: true,
    });
  }
});

test("recording consent stays visible while diagnostics and server details are optional", async ({
  page,
}) => {
  await page.goto("/live");
  await expect(
    page.getByRole("button", { name: "Pose debug", exact: true }),
  ).toBeHidden();
  await page.getByLabel("Feedback source").selectOption("backend");
  await expect(
    page.getByText("By starting, you agree", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Transcribe speech for word analysis and fact-check"),
  ).toBeVisible();
  await expect(page.getByLabel("Backend API URL")).toBeHidden();
  await page.getByText("Server connection", { exact: true }).click();
  await expect(page.getByLabel("Backend API URL")).toBeVisible();
  await page.getByText("Camera diagnostics", { exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Pose debug", exact: true }),
  ).toBeVisible();

  await page.getByRole("button", { name: "How it works" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "captures video and microphone audio",
  );
  await expect(page.getByRole("dialog")).not.toContainText(
    "No microphone is captured",
  );
});

test("sources explain their connected purpose and lead into recording", async ({
  page,
}) => {
  await page.route("**/sources?collection_id=*", (route) =>
    route.fulfill({ json: [] }),
  );
  await page.goto("/sources");
  await expect(
    page.getByRole("heading", { name: "Your sources", exact: true }),
  ).toBeVisible();
  await expect(page.locator("main")).toContainText(
    "check claims and prepare questions",
  );
  await expect(page.locator("main")).not.toContainText("not connected yet");
  await page.getByRole("link", { name: "Continue to recording" }).click();
  await expect(page).toHaveURL(/\/live$/);
});
