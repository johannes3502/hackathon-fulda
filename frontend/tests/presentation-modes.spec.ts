import { expect, test } from "@playwright/test";
import {
  PRESENTATION_MODES,
  PRESENTATION_MODE_OPTIONS,
} from "../src/features/questions/presentation";

for (const mode of PRESENTATION_MODE_OPTIONS) {
  const details = PRESENTATION_MODES[mode];
  test(`${mode} questioning is set alongside uploads and retained in the studio`, async ({
    page,
  }, info) => {
    await page.route("**/sources?collection_id=*", (route) =>
      route.fulfill({ json: [] }),
    );
    await page.goto("/sources");
    const select = page.getByRole("combobox", {
      name: "What are you preparing for?",
    });
    await expect(select).toBeVisible();
    await expect(select.locator("option")).toHaveText([
      "Classroom presentation",
      "Thesis defense",
    ]);
    await expect(page.locator('input[type="file"]')).toBeEnabled();
    await select.selectOption(mode);
    await expect(page.locator("#presentation-mode-focus")).toContainText(
      details.focus,
    );
    await page.reload();
    await expect(select).toHaveValue(mode);
    if (mode === "school")
      await page.screenshot({
        path: info.outputPath("question-mode-with-uploads.png"),
        fullPage: true,
      });
    await page
      .getByRole("link", { name: "Continue to recording", exact: true })
      .click();
    await page.getByText("Presentation & material", { exact: false }).click();
    await expect(select).toHaveValue(mode);
    await select.selectOption("school");
    await page
      .getByRole("link", { name: "Back to sources", exact: true })
      .click();
    await expect(select).toHaveValue("school");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}

test("a retired saved mode resets to classroom practice during preparation", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("pitchcoach.presentationMode", "startup"),
  );
  await page.route("**/sources?collection_id=*", (route) =>
    route.fulfill({ json: [] }),
  );
  await page.goto("/sources");
  await expect(
    page.getByRole("combobox", { name: "What are you preparing for?" }),
  ).toHaveValue("school");
});
