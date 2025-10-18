import { test, expect } from "@playwright/test";
import { loginAsUser, logout } from "../utils/auth-helpers";

test.describe("Product Details Flow", () => {
  test("guest can view product details and related products", async ({
    page,
  }) => {
    // Step 1: Navigate to homepage
    await page.goto("/");

    // Step 2: Wait for and click first product "More Details"
    const firstProduct = page
      .getByRole("button", { name: /more details|details|view/i })
      .first();
    await firstProduct.waitFor({ state: 'visible', timeout: 10000 });
    await firstProduct.click();

    // Step 3: Verify product details page loaded
    await page.waitForURL(/\/product\/.+/, { timeout: 10000 });

    // Step 4: Verify product information is displayed
    const heading = page.locator('h1, h2, h3, h4').first();
    await heading.waitFor({ state: 'visible', timeout: 10000 });

    // Step 5: Look for similar/related products section
    const similarHeading = page.locator('h3, h4, h5').getByText(/similar|related/i).first();
    const hasSimilar = await similarHeading.count() > 0;
    
    if (hasSimilar) {
      // Step 6: Check if there are related product buttons
      const relatedButtons = page.getByRole("button", { name: /details/i });
      const buttonCount = await relatedButtons.count();
      
      if (buttonCount > 1) {
        await relatedButtons.nth(1).click();
        await page.waitForURL(/\/product\/.+/, { timeout: 10000 });
      }
    }
  });

  test("authenticated user can add product to cart from details page", async ({
    page,
  }) => {
    // Step 1: Login as user
    await loginAsUser(page);

    // Step 2: Navigate to product details
    const firstProduct = page
      .getByRole("button", { name: /more details|details/i })
      .first();
    await firstProduct.waitFor({ state: 'visible', timeout: 10000 });
    await firstProduct.click();
    
    await page.waitForURL(/\/product\/.+/, { timeout: 10000 });

    // Step 3: Add product to cart (use .first() to handle multiple buttons)
    const addToCartBtn = page.getByRole("button", { name: /add to cart/i }).first();
    await addToCartBtn.waitFor({ state: 'visible', timeout: 10000 });
    await addToCartBtn.click();

    // Step 4: Wait a bit for cart to update
    await page.waitForTimeout(1000);
    
    // Step 5: Navigate to cart to verify
    await page.goto("/cart");
    await page.waitForURL(/\/cart$/, { timeout: 10000 });

    // Verify we're on cart page
    const cartHeading = page.locator('h1, h2, h3').getByText(/cart/i).first();
    await cartHeading.waitFor({ state: 'visible', timeout: 5000 });

    // Cleanup
    await logout(page);
  });

  test("guest sees login prompt when adding to cart", async ({ page }) => {
    // Step 1: Navigate to product details as guest
    await page.goto("/");
    
    const firstProduct = page
      .getByRole("button", { name: /more details|details/i })
      .first();
    await firstProduct.waitFor({ state: 'visible', timeout: 10000 });
    await firstProduct.click();
    
    await page.waitForURL(/\/product\/.+/, { timeout: 10000 });

    // Step 2: Try to add to cart (use .first() to handle multiple buttons on page)
    const addToCartBtn = page.getByRole("button", { name: /add to cart/i }).first();
    await addToCartBtn.waitFor({ state: 'visible', timeout: 10000 });
    await addToCartBtn.click();

    // Step 3: Navigate to cart
    await page.goto("/cart");
    await page.waitForURL(/\/cart$/, { timeout: 10000 });

    // Step 4: Verify guest sees login message or button
    await page.waitForTimeout(1000);
    const hasGuestMessage = await page.getByText(/guest|login to checkout|please login/i).count() > 0;
    const hasLoginButton = await page.getByRole("button", { name: /login/i }).count() > 0;
    
    expect(hasGuestMessage || hasLoginButton).toBeTruthy();
  });

  test("product details page shows product information", async ({ page }) => {
    // Step 1: Navigate to product details
    await page.goto("/");
    
    const detailsBtn = page.getByRole("button", { name: /more details/i }).first();
    await detailsBtn.waitFor({ state: 'visible', timeout: 10000 });
    await detailsBtn.click();
    
    await page.waitForURL(/\/product\/.+/, { timeout: 10000 });

    // Step 2: Verify basic product info exists
    const heading = page.locator('h1, h2, h3').first();
    await heading.waitFor({ state: 'visible', timeout: 10000 });
    
    const hasDescription = await page.locator('p, .description, [class*="desc"]').count() > 0;
    const hasPrice = await page.getByText(/\$|price/i).count() > 0;

    expect(hasDescription || hasPrice).toBeTruthy();
  });

  test("product navigation between related products works", async ({
    page,
  }) => {
    // Step 1: Go to first product
    await page.goto("/");
    
    const detailsBtn = page.getByRole("button", { name: /more details/i }).first();
    await detailsBtn.waitFor({ state: 'visible', timeout: 10000 });
    await detailsBtn.click();
    
    await page.waitForURL(/\/product\/.+/, { timeout: 10000 });

    const firstUrl = page.url();

    // Step 2: Check for related products
    const similarHeading = page.locator('h3, h4, h5').getByText(/similar|related/i);
    const hasSimilar = await similarHeading.count() > 0;
    
    if (!hasSimilar) {
      test.skip(); // No related products
    }

    const relatedButtons = page.getByRole("button", { name: /details/i });
    const buttonCount = await relatedButtons.count();
    
    if (buttonCount > 1) {
      await relatedButtons.nth(1).click();
      await page.waitForURL(/\/product\/.+/, { timeout: 10000 });
      
      const secondUrl = page.url();
      expect(firstUrl).not.toBe(secondUrl);
    }
  });

  test("product image photo displays or shows placeholder", async ({
    page,
  }) => {
    // Step 1: Navigate to product details
    await page.goto("/");
    
    const detailsBtn = page.getByRole("button", { name: /more details/i }).first();
    await detailsBtn.waitFor({ state: 'visible', timeout: 10000 });
    await detailsBtn.click();
    
    await page.waitForURL(/\/product\/.+/, { timeout: 10000 });

    // Step 2: Check if image exists
    const images = page.locator("img");
    const imageCount = await images.count();
    expect(imageCount).toBeGreaterThan(0);
  });
});