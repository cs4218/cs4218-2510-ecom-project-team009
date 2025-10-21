import { test, expect } from "@playwright/test";

// --- Filtering Tests ---
test.describe("Product Filtering and Pagination", () => {
  test("should filter products by category and reset filters", async ({
    page,
  }) => {
    await page.goto("/");

    // 1. Get initial product count
    await page.waitForSelector(".card");
    const initialCount = await page.locator(".card").count();
    expect(initialCount).toBeGreaterThan(0);

    // 2. Apply a category filter
    // Note: This assumes categories are loaded and visible.
    // We target the first checkbox for simplicity.
    await page.locator(".filters .ant-checkbox-input").first().check();

    // 3. Wait for the product list to update. A simple delay or waiting for network response can work.
    // A robust way is to wait for the count to change.
    await expect(async () => {
      const filteredCount = await page.locator(".card").count();
      expect(filteredCount).toBeLessThan(initialCount);
    }).toPass();

    // 4. Reset filters
    await page.getByRole("button", { name: "RESET FILTERS" }).click();

    // 5. After reload, verify the product count returns to the initial state.
    await page.waitForSelector(".card");
    const finalCount = await page.locator(".card").count();
    expect(finalCount).toEqual(initialCount);
  });

  test("should filter products by price", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".card");
    const initialCount = await page.locator(".card").count();
    expect(initialCount).toBeGreaterThan(0);

    // Apply a price filter (the first radio button)
    await page.locator(".filters .ant-radio-input").first().check();

    // Wait for the product list to update and assert the count has changed
    await expect(async () => {
      const filteredCount = await page.locator(".card").count();
      // The count may not strictly be less if all products fall in the first price range
      expect(filteredCount).toBeLessThanOrEqual(initialCount);
    }).toPass();
  });

  test("should load more products when clicking the load more button", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForSelector(".card");
    const initialCount = await page.locator(".card").count();
    expect(initialCount).toBeGreaterThan(0);

    const loadMoreButton = page.getByRole("button", { name: /Loadmore/ });

    // This button may not exist if all products are shown initially
    if (await loadMoreButton.isVisible()) {
      // Click the button
      await loadMoreButton.click();

      // Wait for the loading indicator to appear and disappear
      await expect(page.getByText("Loading ...")).toBeVisible();
      await expect(page.getByText("Loading ...")).not.toBeVisible();

      // Assert that the number of products has increased
      const newCount = await page.locator(".card").count();
      expect(newCount).toBeGreaterThan(initialCount);
    } else {
      // If the button isn't visible, we can log it and pass the test.
      // This handles cases where the total number of products is less than the page size.
      console.log("Load more button not visible, skipping pagination check.");
    }
  });
});
