import { expect, test } from "@playwright/test";

test("home shows an empty recording overview without demo statistics and keeps navigation and styling", async ({
  page,
}, info) => {
  await page.route("**/sources?collection_id=*", (route) =>
    route.fulfill({ json: [] }),
  );
  await page.goto("/");
  await expect(page).toHaveURL(/\/$/);
  expect(
    await page.evaluate(
      async () =>
        (await document.fonts.load('16px "Open Sans Variable"')).length,
    ),
  ).toBeGreaterThan(0);

  await expect(
    page.getByRole("article", { name: "Aufnahmeübersicht" }),
  ).toContainText("Noch keine Aufnahmen");
  await expect(
    page.getByRole("heading", {
      name: "Deine Aufnahmen im Überblick.",
      exact: true,
    }),
  ).toHaveCSS(
    "font-family",
    '\"Open Sans Variable\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", Arial, sans-serif',
  );
  await expect(page.locator(".stats418-kpi-grid")).toContainText("0:00");
  await expect(page.locator("main")).not.toContainText("%");
  await expect(page.locator("main")).not.toContainText("Mai 2026");
  await expect(page.getByRole("status")).toContainText(
    "Hier erscheinen deine aufgenommenen Präsentationen.",
  );

  await page.getByRole("button", { name: "Menü", exact: true }).click();
  const drawer = page.getByRole("navigation", { name: "App-Navigation" });
  await expect(drawer).toBeVisible();
  await expect(
    drawer.getByRole("link", { name: /Start & Aufnahmen/i }),
  ).toHaveAttribute("aria-current", "page");
  await drawer.getByRole("link", { name: /Live-Studio/i }).click();
  await expect(page).toHaveURL(/\/live$/);

  for (const [selector, color] of [
    ["body", "#f5f5f7"],
    [".stage-placeholder .button", "#3803bf"],
    [".live-camera-stage", "#1c1c1f"],
  ]) {
    const matches = await page
      .locator(selector)
      .evaluate((element, expected) => {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 1;
        const context = canvas.getContext("2d")!;
        const pixel = (value: string) => {
          context.fillStyle = value;
          context.fillRect(0, 0, 1, 1);
          return [...context.getImageData(0, 0, 1, 1).data];
        };
        const reference = pixel(expected);
        return pixel(getComputedStyle(element).backgroundColor).every(
          (channel, index) => Math.abs(channel - reference[index]) <= 1,
        );
      }, color);
    expect(matches, `${selector} uses the configured palette`).toBe(true);
  }
  await expect(
    page.getByRole("button", { name: "Enable camera", exact: true }),
  ).toHaveCSS("color", "rgb(255, 255, 255)");
  await expect(
    page.getByRole("heading", {
      name: "Practice your presentation.",
      exact: true,
    }),
  ).toHaveCSS("font-family", /Open Sans Variable/);
  await expect(
    page.getByRole("button", { name: "Large view", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
  await expect(
    page.getByRole("region", { name: "Live camera preview" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Enable camera", exact: true }),
  ).toBeInViewport();
  await expect(
    page.getByRole("button", { name: "Start recording", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByLabel("Speech analysis")).toBeVisible();
  await expect(
    page
      .locator(".stage-placeholder")
      .getByRole("button", { name: "Enable camera", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Nothing is recorded until you press Start recording.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Live feedback", exact: true }),
  ).toHaveCount(0);
  const monitor = await page
    .getByRole("region", { name: "Live camera preview" })
    .boundingBox();
  const workspace = await page.locator(".live-studio-grid").boundingBox();
  // Before feedback exists, the camera must not reserve an empty sidebar.
  expect(monitor!.width / workspace!.width).toBeGreaterThan(0.98);
  await expect(
    page.getByRole("navigation", { name: "Main navigation" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Studio", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await page.screenshot({
    path: info.outputPath("monitoring-entry.png"),
    fullPage: true,
  });
  await page.getByRole("link", { name: "Sample demo", exact: true }).click();
  await expect(page).toHaveURL(/\/demo$/);
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
    await expect(
      page.getByRole("button", { name: "Menü", exact: true }),
    ).toBeVisible();
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
  await page.getByText("Recording options", { exact: true }).click();
  await page.getByLabel("Speech analysis").selectOption("backend");
  await expect(page.locator(".live-audio-hint")).toContainText(
    "Microphone audio is sent to your server",
  );
  await expect(
    page.getByText("By starting, you agree", { exact: false }),
  ).toBeVisible();
  await expect(page.getByLabel("Create a transcript")).toBeVisible();
  await expect(page.getByLabel("Backend API URL")).toBeHidden();
  await page.getByText("Server connection", { exact: true }).click();
  await expect(page.getByLabel("Backend API URL")).toBeVisible();
  await page.getByText("Camera diagnostics", { exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Pose debug", exact: true }),
  ).toBeVisible();

  await page.getByText("Recording options", { exact: true }).click();
  await expect(page.locator(".recording-consent")).toContainText(
    "By starting, you agree to send your video and microphone audio",
  );
  await expect(page.locator(".recording-consent")).toBeVisible();
  await page.getByRole("button", { name: "How it works" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "captures video and microphone audio",
  );
  await expect(page.getByRole("dialog")).toContainText(
    "Deepgram’s EU endpoint",
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

test("camera permission is requested only on click, with a clear retry after denial", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const state = window as unknown as {
      cameraRequests: number;
      denyCamera: () => void;
    };
    state.cameraRequests = 0;
    navigator.mediaDevices.getUserMedia = () => {
      state.cameraRequests++;
      return new Promise<MediaStream>((_, reject) => {
        state.denyCamera = () =>
          reject(new DOMException("Denied", "NotAllowedError"));
      });
    };
  });
  await page.goto("/live");
  await expect(
    page.getByRole("button", { name: "Enable camera", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => (window as unknown as { cameraRequests: number }).cameraRequests,
    ),
  ).toBe(0);
  await page
    .getByRole("button", { name: "Enable camera", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Waiting for camera permission…" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Start recording", exact: true }),
  ).toHaveCount(0);
  await page.evaluate(() =>
    (window as unknown as { denyCamera: () => void }).denyCamera(),
  );
  await expect(
    page.getByText("Camera permission was denied.", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Enable camera", exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByRole("link", { name: "Sample demo", exact: true }),
  ).toBeVisible();
});

test("shared navigation and help work with keyboard focus", async ({
  page,
}) => {
  await page.route("**/sources?collection_id=*", (route) =>
    route.fulfill({ json: [] }),
  );
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "Deine Aufnahmen im Überblick.",
      exact: true,
    }),
  ).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();
  const menuButton = page.getByRole("button", { name: "Menü", exact: true });
  await menuButton.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("navigation", { name: "App-Navigation" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("navigation", { name: "App-Navigation" }),
  ).toHaveCount(0);
  const navigation = page.getByRole("navigation", { name: "Main navigation" });
  for (const [label, path] of [
    ["Sources", "/sources"],
    ["Sample demo", "/demo"],
    ["Studio", "/live"],
  ]) {
    const link = navigation.getByRole("link", { name: label, exact: true });
    await link.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(link).toHaveAttribute("aria-current", "page");
  }
  const help = page.getByRole("button", { name: "How it works" });
  await help.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(help).toBeFocused();
});

test("shared surfaces stay readable in light and dark appearance", async ({
  page,
}) => {
  await page.route("**/sources?collection_id=*", (route) =>
    route.fulfill({ json: [] }),
  );
  for (const colorScheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
    for (const path of [
      "/",
      "/live",
      "/sources",
      "/demo",
      "/review-preview",
      "/stats-preview",
    ]) {
      await page.goto(path);
      await expect(
        page.getByRole("navigation", { name: "Main navigation" }),
      ).toBeVisible();
      await expect(page.locator("html")).toHaveCSS("color-scheme", colorScheme);
      const ratios = await page.evaluate(() => {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 1;
        const context = canvas.getContext("2d")!;
        const luminance = (color: string) => {
          context.fillStyle = color;
          context.fillRect(0, 0, 1, 1);
          const rgb = [...context.getImageData(0, 0, 1, 1).data]
            .slice(0, 3)
            .map((value) => {
              const channel = value / 255;
              return channel <= 0.04045
                ? channel / 12.92
                : ((channel + 0.055) / 1.055) ** 2.4;
            });
          return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
        };
        const contrast = (a: string, b: string) => {
          const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
          return (values[0] + 0.05) / (values[1] + 0.05);
        };
        const body = getComputedStyle(document.body);
        const footer = getComputedStyle(document.querySelector(".app-footer")!);
        const primary = document.querySelector(
          ".button-primary, .review418-play-section",
        );
        const action = primary ? getComputedStyle(primary) : null;
        return [
          contrast(body.color, body.backgroundColor),
          contrast(footer.color, body.backgroundColor),
          ...(action ? [contrast(action.color, action.backgroundColor)] : []),
        ];
      });
      for (const ratio of ratios)
        expect(ratio, `${path} in ${colorScheme}`).toBeGreaterThanOrEqual(4.5);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
  }
});

test("enlarged text reflows without hiding navigation or primary controls", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await page.route("**/sources?collection_id=*", (route) =>
    route.fulfill({ json: [] }),
  );
  for (const path of ["/", "/live", "/sources", "/demo", "/review-preview"]) {
    await page.goto(path);
    await expect(
      page.getByRole("navigation", { name: "Main navigation" }),
    ).toBeVisible();
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "200%";
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      path,
    ).toBe(true);
    for (const link of await page.locator(".app-nav a").all()) {
      await expect(link).toBeVisible();
      expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
    if (path === "/live") {
      const camera = page.getByRole("button", {
        name: "Enable camera",
        exact: true,
      });
      await camera.scrollIntoViewIfNeeded();
      await expect(camera).toBeInViewport();
    }
  }
});
