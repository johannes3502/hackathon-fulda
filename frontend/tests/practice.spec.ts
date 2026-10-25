import { expect, test, type Page } from "@playwright/test";
async function sample(page: Page) {
  await page.goto("/demo");
  await page.getByRole("button", { name: "Try sample demo" }).click();
  await expect(
    page.getByRole("button", { name: "Continue with demo preview" }),
  ).toBeVisible();
}
async function demoMenu(page: Page) {
  const menu = page.locator("details.demo-controls");
  if (!(await menu.getAttribute("open"))) await menu.locator("summary").click();
}
async function noOverflow(page: Page) {
  const overflow = await page.evaluate(() =>
    [...document.querySelectorAll("body *")]
      .filter((el) => {
        const box = el.getBoundingClientRect();
        return box.width > 0 && box.right > innerWidth + 1;
      })
      .map((el) => ({
        element: el.tagName,
        class: el.className,
        width: el.getBoundingClientRect().width,
        right: el.getBoundingClientRect().right,
      })),
  );
  expect(overflow).toEqual([]);
}

test("complete no-permission rehearsal, evidence, retry and restored report", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = async () => {
      throw new Error("The demo must not request media");
    };
  });
  await page.goto("/demo");
  await noOverflow(page);
  await page.screenshot({
    path: `test-results/setup-${info.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "Try sample demo" }).click();
  await page
    .getByRole("button", { name: "Continue with demo preview" })
    .click();
  await demoMenu(page);
  await page.getByRole("button", { name: "Next event", exact: true }).click();
  await page.getByRole("button", { name: "Next event", exact: true }).click();
  await expect(
    page.getByText("Sample presenter · partial", { exact: true }).first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Next event", exact: true }).click();
  await expect(
    page.getByText("Sample presenter · partial", { exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Next event", exact: true }).click();
  await page.getByRole("button", { name: "Next event", exact: true }).click();
  await page.getByRole("button", { name: "Next event", exact: true }).click();
  await expect(
    page.getByText("Give your idea room.", { exact: false }).first(),
  ).toBeVisible();
  await noOverflow(page);
  await page.screenshot({
    path: `test-results/studio-${info.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "Next event", exact: true }).click();
  await page.getByRole("button", { name: "Next event", exact: true }).click();
  await page
    .getByRole("button", { name: "End presentation", exact: true })
    .click();
  await expect(
    page
      .locator(".judge-question")
      .filter({ hasText: "You said understanding improves" }),
  ).toBeVisible();
  await noOverflow(page);
  await page.screenshot({
    path: `test-results/judge-${info.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "Start answer", exact: true }).click();
  await page
    .getByRole("button", { name: "Vague answer", exact: false })
    .click();
  await page
    .getByRole("button", { name: "Submit answer", exact: true })
    .click();
  await expect(
    page
      .locator(".judge-question")
      .filter({ hasText: "You described a positive reaction" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Finish Q&A and review" }).click();
  await expect(page).toHaveURL(/\/review$/);
  await expect(
    page.getByText("This presentation ended early.", { exact: false }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "View evidence", exact: false })
    .first()
    .click();
  await expect(
    page.getByText("Selected moment", { exact: false }),
  ).toBeVisible();
  await noOverflow(page);
  await page.screenshot({
    path: `test-results/review-${info.project.name}.png`,
    fullPage: true,
  });
  const selectedRow = page.locator("#review-evidence .transcript-row.selected");
  await expect(selectedRow).toBeInViewport();
  await page.getByRole("button", { name: "Try a focused retry" }).click();
  await expect(
    page.getByText("Answer the evidence question in 30 seconds", {
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Continue with demo preview" })
    .click();
  await expect(
    page.getByRole("button", { name: "Start answer", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Start answer", exact: true }).click();
  await page
    .getByRole("button", { name: "Direct answer", exact: false })
    .click();
  await page
    .getByRole("button", { name: "Submit answer", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your focused retry" }),
  ).toBeVisible();
  await expect(
    page.getByText("Clearer sample evidence", { exact: true }),
  ).toBeVisible();
  await noOverflow(page);
  await page.screenshot({
    path: `test-results/comparison-${info.project.name}.png`,
    fullPage: true,
  });
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Your focused retry" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("custom context, simulation mode, interruption, failure and active refresh recovery", async ({
  page,
}) => {
  await page.goto("/demo");
  await page
    .getByText("Customize the sample rehearsal", { exact: true })
    .click();
  await page
    .getByRole("button", { name: "Start practice", exact: true })
    .click();
  await expect(page.getByLabel("Presentation title")).toBeFocused();
  await page
    .getByLabel("Presentation title")
    .fill("A reusable learning toolkit");
  await page
    .getByLabel("What will you explain?")
    .fill("A synthetic proposal to help students share learning materials.");
  await page.getByText("Practice options", { exact: true }).click();
  await expect(
    page.getByText("Sample audience: University examiner"),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Simulation Feedback at the end" })
    .click();
  await page
    .getByRole("button", { name: "Start practice", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "A reusable learning toolkit" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Your coach" })).toHaveCount(
    0,
  );
  await page
    .getByRole("button", { name: "Continue with demo preview" })
    .click();
  await demoMenu(page);
  await page.getByRole("button", { name: "Jump to Q&A" }).click();
  await page.getByRole("button", { name: "Fail next request" }).click();
  await page.getByRole("button", { name: "Start answer", exact: true }).click();
  await expect(page.locator(".status-error[role=alert]")).toContainText(
    "Simulated request failed",
  );
  await page.getByRole("button", { name: "Start answer", exact: true }).click();
  await page.getByRole("button", { name: "Simulate interruption" }).click();
  await expect(
    page.getByText("Demo connection interrupted.", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Resume session", exact: true })
    .click();
  await page.reload();
  await expect(
    page.getByText("This attempt was interrupted.", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Restart interrupted attempt" })
    .click();
  await expect(
    page.getByRole("button", { name: "Continue with demo preview" }),
  ).toBeVisible();
  await noOverflow(page);
});

test("camera denied and missing session both offer usable continuation", async ({
  page,
}) => {
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = async () => {
      throw new DOMException("Denied", "NotAllowedError");
    };
  });
  await sample(page);
  await page.getByRole("button", { name: "Enable camera preview" }).click();
  await expect(
    page.getByText("Camera permission was denied.", { exact: false }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Continue with demo preview" })
    .click();
  await expect(
    page.getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible();
  await page.goto("/practice/missing-session");
  await expect(
    page.getByRole("heading", { name: "Let’s start fresh." }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Start new practice" }),
  ).toBeVisible();
});

test("pending camera can be bypassed and late tracks are stopped after exit", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const target = window as unknown as {
      resolveCamera: () => void;
      stoppedTracks: number;
    };
    target.stoppedTracks = 0;
    navigator.mediaDevices.getUserMedia = () =>
      new Promise<MediaStream>((resolve) => {
        target.resolveCamera = () =>
          resolve({
            getTracks: () => [
              {
                stop: () => {
                  target.stoppedTracks++;
                },
              },
            ],
          } as unknown as MediaStream);
      });
  });
  await sample(page);
  await page.getByRole("button", { name: "Enable camera preview" }).click();
  await expect(
    page.getByRole("button", { name: "Permission pending…" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Continue with demo preview" }),
  ).toBeEnabled();
  await page.getByRole("link", { name: "Start new practice" }).click();
  await expect(
    page.getByRole("button", { name: "Try sample demo", exact: true }),
  ).toBeVisible();
  await page.evaluate(() =>
    (window as unknown as { resolveCamera: () => void }).resolveCamera(),
  );
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as { stoppedTracks: number }).stoppedTracks,
      ),
    )
    .toBe(1);
});

test("demo playback speed resets coherently on jumps and retry", async ({
  page,
}) => {
  await sample(page);
  await demoMenu(page);
  await page.getByLabel("Playback speed").selectOption("4");
  await expect(page.getByLabel("Playback speed")).toHaveValue("4");
  await page.getByRole("button", { name: "Jump to review" }).click();
  await expect(page).toHaveURL(/\/review$/);
  await demoMenu(page);
  await expect(page.getByLabel("Playback speed")).toHaveValue("1");
  await page.getByRole("button", { name: "Try a focused retry" }).click();
  await expect(
    page.getByRole("button", { name: "Continue with demo preview" }),
  ).toBeVisible();
  await demoMenu(page);
  await expect(page.getByLabel("Playback speed")).toHaveValue("1");
});

test("unavailable camera and unavailable browser storage do not block the demo", async ({
  page,
}) => {
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = async () => {
      throw new DOMException("No device", "NotFoundError");
    };
    Storage.prototype.setItem = () => {
      throw new DOMException("Storage disabled", "SecurityError");
    };
  });
  await sample(page);
  await expect(
    page.getByText("Browser storage is unavailable.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Enable camera preview" }).click();
  await expect(
    page.getByText("No camera is available here.", { exact: false }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Continue with demo preview" })
    .click();
  await expect(
    page.getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible();
});

test("keyboard skip navigation and help dialog work at both widths", async ({
  page,
}) => {
  await page.goto("/demo");
  const skip = page.getByRole("link", { name: "Skip to content" });
  await expect(skip).toHaveCSS("clip-path", "inset(50%)");
  await page.keyboard.press("Tab");
  await expect(skip).toBeFocused();
  await expect(skip).toHaveCSS("clip-path", "none");
  await page.keyboard.press("Enter");
  await expect(page.locator("#main")).toBeFocused();
  await page.getByRole("button", { name: "How it works" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "How it works" }),
  ).toBeFocused();
});
