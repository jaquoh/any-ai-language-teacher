const { test, expect } = require("@playwright/test");

async function readOverallScore(page) {
  const card = page.locator("section:has-text('Overall Score') p.text-3xl").first();
  const text = await card.textContent();
  return Number(text);
}

test("navigates pages without runtime errors", async ({ page }) => {
  await page.goto("/#/");
  await expect(page.getByText("Portable AI Language Teacher").first()).toBeVisible();

  await page.click("a[href='#/prompt']");
  await expect(page.getByRole("button", { name: "Generate Prompt" })).toBeVisible();

  await page.click("a[href='#/import']");
  await expect(page.getByRole("button", { name: "Validate and Import" })).toBeVisible();

  await page.click("a[href='#/lessons']");
  await expect(page.getByText("No lessons imported yet.")).toBeVisible();

  await page.click("a[href='#/knowledge']");
  await expect(page.getByText("No vocabulary imported yet.")).toBeVisible();

  await page.click("a[href='#/plan']");
  await expect(page.getByText("Seed curriculum covers practical German")).toBeVisible();

  await page.click("a[href='#/settings']");
  await expect(page.getByText("Scoring Focus")).toBeVisible();

  await page.click("a[href='#/about']");
  await expect(page.getByText("Offline-first").first()).toBeVisible();
});

test("generates prompt packet", async ({ page }) => {
  await page.goto("/#/prompt");
  await page.getByRole("button", { name: "Generate Prompt" }).click();

  const output = page.locator("#prompt-output");
  await expect(output).toContainText("Lesson Opening");
  await expect(output).toContainText("your own words");
  await expect(output).toContainText("4 to 7 varied activities");
});

test("imports valid and invalid lesson results with repair flow", async ({ page }) => {
  await page.goto("/#/import");

  await page.getByRole("button", { name: "Load Valid Sample" }).click();
  await page.getByRole("button", { name: "Validate and Import" }).click();
  await expect(page.getByText("Lesson result imported. Great work, keep the streak going.")).toBeVisible();

  await page.click("a[href='#/']");
  await expect(page.getByText("Overall Score")).toBeVisible();

  const scoreAfterImport = await readOverallScore(page);
  expect(scoreAfterImport).toBeGreaterThan(20);

  await page.click("a[href='#/knowledge']");
  await expect(page.getByRole("columnheader", { name: "wir" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "ihr" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "sie/Sie" })).toBeVisible();
  await expect(page.getByRole("button", { name: "DE" }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Conjugation" }).first()).toBeVisible();

  await page.click("a[href='#/import']");
  await page.getByRole("button", { name: "Load Invalid Sample" }).click();
  await page.getByRole("button", { name: "Validate and Import" }).click();

  await expect(page.getByText("Import failed. Use the repair prompt")).toBeVisible();
  await expect(page.locator("#repair-prompt")).toContainText("Validation errors");
});

test("recomputes scores when sliders change", async ({ page }) => {
  await page.goto("/#/import");
  await page.getByRole("button", { name: "Load Valid Sample" }).click();
  await page.getByRole("button", { name: "Validate and Import" }).click();

  await page.click("a[href='#/']");
  const before = await readOverallScore(page);
  await page.click("a[href='#/settings']");

  for (const key of ["grammar", "verbs", "vocabulary", "fluency"]) {
    await page.locator(`input[data-weight-key='${key}']`).evaluate((node, weightKey) => {
      const slider = node;
      slider.value = weightKey === "grammar" ? "100" : "0";
      slider.dispatchEvent(new Event("input", { bubbles: true }));
    }, key);
  }

  await page.click("a[href='#/']");
  const after = await readOverallScore(page);
  expect(after).not.toBe(before);
});
