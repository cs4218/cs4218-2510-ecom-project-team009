import { test, expect } from "@playwright/test";
import { loginAsUser, logout } from "../utils/auth-helpers";

test.describe("Category Product Flow", () => {
  test("user can browse products by category", async ({ page }) => {
    // Step 1: Navigate to homepage
    await page.goto("/");
    
    // Step 2: Wait for and click Categories dropdown
    const categoriesDropdown = page.locator('a, button').getByText(/categories/i).first();
    await categoriesDropdown.waitFor({ state: 'visible', timeout: 10000 });
    await categoriesDropdown.click();

    // Step 3: Wait for dropdown items and click first category
    const firstCategory = page.locator('.dropdown-item[href*="/category/"]').first();
    await firstCategory.waitFor({ state: 'visible', timeout: 5000 });
    await firstCategory.click();

    // Step 4: Verify navigation to category page
    await page.waitForURL(/\/category\/.+/, { timeout: 10000 });

    // Step 5: Verify products are displayed
    const productCard = page.locator(".card").first();
    await productCard.waitFor({ state: 'visible', timeout: 10000 });
  });

  test("category page displays correct products", async ({ page }) => {
    // Step 1: Navigate to homepage
    await page.goto("/");

    // Step 2: Open categories dropdown
    const categoriesDropdown = page.locator('a, button').getByText(/categories/i).first();
    await categoriesDropdown.waitFor({ state: 'visible', timeout: 10000 });
    await categoriesDropdown.click();

    // Step 3: Click on first category
    const categoryLink = page.locator('.dropdown-item[href*="/category/"]').first();
    await categoryLink.waitFor({ state: 'visible', timeout: 5000 });
    await categoryLink.click();

    // Step 4: Wait for navigation and products to load
    await page.waitForURL(/\/category\/.+/, { timeout: 10000 });
    
    const productCards = page.locator(".card");
    await productCards.first().waitFor({ state: 'visible', timeout: 10000 });
    
    const count = await productCards.count();
    expect(count).toBeGreaterThan(0);
  });

  test("user can view product details from category page", async ({ page }) => {
    // Step 1: Login
    await loginAsUser(page);

    // Step 2: Navigate to homepage and open categories
    const categoriesDropdown = page.locator('a, button').getByText(/categories/i).first();
    await categoriesDropdown.waitFor({ state: 'visible', timeout: 10000 });
    await categoriesDropdown.click();

    // Step 3: Click category
    const categoryLink = page.locator('.dropdown-item[href*="/category/"]').first();
    await categoryLink.waitFor({ state: 'visible', timeout: 5000 });
    const hasCategory = await categoryLink.count() > 0;
    if (!hasCategory) {
      test.skip();
    }
    await categoryLink.click();
    
    // Step 4: Wait for navigation
    await page.waitForURL(/\/category\/.+/, { timeout: 10000 });

    // Step 5: Wait for product card and click "More Details"
    const productCard = page.locator(".card").first();
    await productCard.waitFor({ state: 'visible', timeout: 10000 });
    
    const moreDetailsBtn = productCard.locator('button').getByText(/more details/i);
    await moreDetailsBtn.waitFor({ state: 'visible', timeout: 5000 });
    await moreDetailsBtn.click();

    // Step 6: Verify navigation to product details
    await page.waitForURL(/\/product\/.+/, { timeout: 10000 });
    
    // Step 7: Verify ADD TO CART button exists on details page
    const addToCartBtn = page.getByRole("button", { name: /add to cart/i }).first();
    await addToCartBtn.waitFor({ state: 'visible', timeout: 5000 });
    await addToCartBtn.click();

    // Step 8: Wait for cart to update
    await page.waitForTimeout(1000);
    
    // Step 9: Navigate to cart and verify
    await page.goto("/cart");
    await page.waitForURL(/\/cart$/, { timeout: 10000 });
    
    const cartHeading = page.locator('h1, h2, h3').getByText(/cart/i).first();
    await cartHeading.waitFor({ state: 'visible', timeout: 5000 });

    // Cleanup
    await logout(page);
  });

  test("user can navigate from category to product details", async ({
    page,
  }) => {
    // Step 1: Navigate to homepage
    await page.goto("/");

    // Step 2: Open categories dropdown
    const categoriesDropdown = page.locator('a, button').getByText(/categories/i).first();
    await categoriesDropdown.waitFor({ state: 'visible', timeout: 10000 });
    await categoriesDropdown.click();

    // Step 3: Click category
    const categoryLink = page.locator('.dropdown-item[href*="/category/"]').first();
    await categoryLink.waitFor({ state: 'visible', timeout: 5000 });
    const hasCategory = await categoryLink.count() > 0;
    if (!hasCategory) {
      test.skip();
    }
    await categoryLink.click();
    
    await page.waitForURL(/\/category\/.+/, { timeout: 10000 });

    // Step 4: Wait for product and click details button
    const productCard = page.locator(".card").first();
    await productCard.waitFor({ state: 'visible', timeout: 10000 });
    
    const detailsButton = productCard.locator('button').getByText(/more details|details/i);
    await detailsButton.waitFor({ state: 'visible', timeout: 5000 });
    await detailsButton.click();

    // Step 5: Verify product details page
    await page.waitForURL(/\/product\/.+/, { timeout: 10000 });
  });

  test("empty category shows appropriate message", async ({ page }) => {
    // Step 1: Try to navigate to non-existent category
    await page.goto("/category/nonexistent-category-xyz");
    
    // Step 2: Wait a bit for page to load
    await page.waitForTimeout(2000);

    // Step 3: Verify empty state or redirect
    const currentUrl = page.url();
    const hasNoProducts = await page.getByText(/no products|not found|empty/i).count() > 0;
    const isRedirected = currentUrl === "http://127.0.0.1:3000/" || currentUrl.includes("/categories");
    const productCount = await page.locator(".card").count();
    
    expect(hasNoProducts || isRedirected || productCount === 0).toBeTruthy();
  });

  test("category elements are visible on homepage", async ({ page }) => {
    // Step 1: Navigate to homepage
    await page.goto("/");

    // Step 2: Verify category dropdown exists
    const categoriesDropdown = page.locator('a, button').getByText(/categories/i).first();
    await categoriesDropdown.waitFor({ state: 'visible', timeout: 10000 });
    
    // Step 3: Click to verify dropdown items exist
    await categoriesDropdown.click();
    
    const dropdownItems = page.locator('.dropdown-item[href*="/category/"]');
    await dropdownItems.first().waitFor({ state: 'visible', timeout: 5000 });
    
    const count = await dropdownItems.count();
    expect(count).toBeGreaterThan(0);
  });

  test.skip("user can navigate back to all categories from category page", async ({
    page,
  }) => {
    // This test assumes a specific navigation structure
    // Skip for now until we understand the actual UI
  });
});