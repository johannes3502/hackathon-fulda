import { expect, test } from "@playwright/test";

test("dropdown chevrons stay inset without overlapping text in either theme", async ({
  page,
}, info) => {
  await page.route("**/sources?collection_id=*", (route) =>
    route.fulfill({ json: [] }),
  );
  await page.goto("/live");
  const setup = page.locator(".presentation-setup:visible").first();
  await setup.locator("summary").click();
  const presentation = setup.getByRole("combobox");
  await expect(presentation).toBeVisible();
  await presentation.focus();
  await expect(presentation).toBeFocused();
  await presentation.selectOption("thesis");
  await expect(presentation).toHaveValue("thesis");

  for (const theme of ["light", "dark"] as const) {
    await page.evaluate((value) => {
      document.documentElement.dataset.appearance = value;
    }, theme);
    for (const dropdown of await page.locator("select:visible").all()) {
      await expect(dropdown).toHaveCSS("appearance", "none");
      await expect(dropdown).toHaveCSS(
        "background-position",
        "calc(100% - 14px) 50%",
      );
      await expect(dropdown).toHaveCSS("background-size", "16px auto");
      await expect(dropdown).toHaveCSS("padding-right", "44px");
      await expect(dropdown).toHaveCSS("background-repeat", "no-repeat");
    }
    await presentation.screenshot({
      path: info.outputPath(`dropdown-${theme}.png`),
    });
  }

  await page.emulateMedia({ forcedColors: "active" });
  await expect(presentation).toHaveCSS("appearance", "auto");
  await expect(presentation).toHaveCSS("background-image", "none");
});
