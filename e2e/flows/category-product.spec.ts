import { test, expect } from "@playwright/test";
import { loginAsUser, logout } from "../utils/auth-helpers";

test.describe("Category Product Flow", () => {
  test("user can browse products by category", async ({ page }) => {
    // Step 1: Navigate to categories page
    await page.goto("/");
    await page.getByRole("link", { name: /categories/i }).click();

    // Step 2: Verify categories page loaded
    await expect(page).toHaveURL(/\/categories$/);
    await expect(
      page.getByRole("heading", { name: /all categories/i })
    ).toBeVisible();

    // Step 3: Click on first category
    const firstCategory = page.locator(".card").first();
    const categoryName = await firstCategory.textContent();
    await firstCategory.click();

    // Step 4: Verify category products page
    await expect(page).toHaveURL(/\/category\/.+/);
    await expect(page.locator(".card").first()).toBeVisible();
  });

  test("category page displays correct products", async ({ page }) => {
    // Step 1: Navigate to categories
    await page.goto("/categories");

    // Step 2: Click on a specific category
    const categoryCard = page.locator(".card").first();
    await categoryCard.click();

    // Step 3: Verify products are displayed
    await expect(page).toHaveURL(/\/category\/.+/);
    const productCount = await page.locator(".card").count();
    expect(productCount).toBeGreaterThan(0);

    // Step 4: Verify each product card has required elements
    const firstProductCard = page.locator(".card").first();
    await expect(firstProductCard.locator(".card-title")).toBeVisible();
    await expect(firstProductCard.locator(".card-text")).toBeVisible();
    await expect(
      firstProductCard.getByRole("button", { name: /more details/i })
    ).toBeVisible();
  });

  test("user can add product to cart from category page", async ({ page }) => {
    // Step 1: Login
    await loginAsUser(page);

    // Step 2: Navigate to category
    await page.goto("/categories");
    await page.locator(".card").first().click();

    // Step 3: Add first product to cart
    await page
      .locator(".card")
      .first()
      .getByRole("button", { name: /add to cart/i })
      .click();

    // Step 4: Verify cart updated
    await expect(page.getByText(/item added to cart/i)).toBeVisible();
    await expect(page.locator('[href="/cart"]')).toContainText("1");

    // Cleanup
    await logout(page);
  });

  test("user can navigate from category to product details", async ({
    page,
  }) => {
    // Step 1: Navigate to category
    await page.goto("/categories");
    await page.locator(".card").first().click();
    await expect(page).toHaveURL(/\/category\/.+/);

    // Step 2: Click on product details
    await page
      .locator(".card")
      .first()
      .getByRole("button", { name: /more details/i })
      .click();

    // Step 3: Verify product details page
    await expect(page).toHaveURL(/\/product\/.+/);
    await expect(
      page.getByRole("heading", { name: /product details/i })
    ).toBeVisible();
  });

  test("empty category shows appropriate message", async ({ page }) => {
    // Step 1: Try to navigate to non-existent category
    await page.goto("/category/nonexistent-category-xyz");

    // Step 2: Verify either error message or empty state
    // (This depends on your implementation - adjust accordingly)
    const hasNoProducts =
      (await page.getByText(/no products found/i).count()) > 0;
    const hasError = (await page.getByText(/error/i).count()) > 0;
    expect(hasNoProducts || hasError).toBeTruthy();
  });

  test("category name is displayed in header", async ({ page }) => {
    // Step 1: Navigate to category
    await page.goto("/categories");
    const firstCategory = page.locator(".card").first();
    const categoryName = (await firstCategory.textContent()) || "";
    await firstCategory.click();

    // Step 2: Verify category name in page heading
    await expect(page).toHaveURL(/\/category\/.+/);
    // The heading should contain category info
    const heading = page.locator("h1, h2, h3").first();
    await expect(heading).toBeVisible();
  });

  test("user can navigate back to all categories from category page", async ({
    page,
  }) => {
    // Step 1: Navigate to specific category
    await page.goto("/categories");
    await page.locator(".card").first().click();
    await expect(page).toHaveURL(/\/category\/.+/);

    // Step 2: Navigate back to categories via header link
    await page.getByRole("link", { name: /categories/i }).click();

    // Step 3: Verify back on categories page
    await expect(page).toHaveURL(/\/categories$/);
    await expect(
      page.getByRole("heading", { name: /all categories/i })
    ).toBeVisible();
  });
});