import { expect, test } from "@playwright/test";

test("jury walkthrough runs the real rules with explicit synthetic labels, evidence and reset", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page
    .getByText("Gesture guide and calibration", { exact: true })
    .click();
  await page.getByRole("link", { name: "Try synthetic walkthrough" }).click();
  await expect(page.getByText("Synthetic example · no camera")).toBeVisible();
  await page.clock.install({ time: new Date("2026-10-24T12:00:00Z") });
  await page.clock.pauseAt(new Date("2026-10-24T12:00:01Z"));
  await page.getByRole("button", { name: "Play 22-second example" }).click();
  // The raised hand confirms after the 2 s hold, at 6 s example time.
  await page.clock.runFor(6500);
  await expect(page.locator(".gesture-example-event")).toHaveCount(1);
  await expect(page.locator(".cue-message")).toHaveText("Hand above shoulder");
  await page.getByRole("button", { name: "Pause example" }).click();
  await page.clock.runFor(10000);
  await expect(page.locator(".gesture-example-event")).toHaveCount(1);
  await page.getByRole("button", { name: "Resume example" }).click();
  await page.clock.runFor(13500);
  await expect(page.locator(".gesture-example-event")).toHaveCount(3);
  await expect(page.locator(".cue-message")).toHaveText("Evaluation paused");
  await page.getByText("How was this observed?").first().click();
  await expect(
    page.getByText("Wrist height above its shoulder", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Download gesture evidence JSON" }),
  ).toBeVisible();
  await page.screenshot({
    path: info.outputPath("gesture-walkthrough.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(() =>
      [...document.querySelectorAll("main *")]
        .filter((el) => el.getBoundingClientRect().right > innerWidth + 1)
        .map((el) => ({
          tag: el.tagName,
          class: el.className,
          right: el.getBoundingClientRect().right,
        })),
    ),
  ).toEqual([]);
  await page.getByRole("button", { name: "Restart example" }).click();
  await expect(page.locator(".gesture-example-event")).toHaveCount(0);
  await page.getByRole("link", { name: "Try with your camera" }).click();
  await expect(
    page.getByRole("button", { name: "Enable camera" }),
  ).toBeVisible();
  await page
    .getByText("Gesture guide and calibration", { exact: true })
    .click();
  await expect(page.getByLabel("Gesture setup and guide")).toBeVisible();
  expect(errors).toEqual([]);
});
