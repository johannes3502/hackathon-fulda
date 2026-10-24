import { expect, test } from "@playwright/test";

test("opening a native collection persists it and reopening keeps loaded sources", async ({
  page,
}) => {
  const id = "11111111-2222-3333-4444-555555555555";
  await page.route("**/sources?collection_id=*", async (route) => {
    const collection = new URL(route.request().url()).searchParams.get(
      "collection_id",
    );
    await route.fulfill({
      json:
        collection === id
          ? [
              {
                id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
                collection_id: id,
                filename: "Synthetic native notes.txt",
                status: "ready",
                size_bytes: 100,
                chunk_count: 1,
                error: null,
              },
            ]
          : [],
    });
  });
  await page.goto("/sources");
  await page.getByText("Use this collection on another device").click();
  await page.getByLabel("Collection ID from another device").fill(id);
  await page
    .getByRole("button", { name: "Open collection", exact: true })
    .click();
  await expect(
    page.getByText("Synthetic native notes.txt", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Open collection", exact: true })
    .click();
  await expect(
    page.getByText("Synthetic native notes.txt", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("Synthetic native notes.txt", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
