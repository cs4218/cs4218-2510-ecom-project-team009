import { test, expect } from "@playwright/test";
import { loginAsUser, logout } from "../utils/auth-helpers";

test.describe("Product Details Flow", () => {
  test("guest can view product details and related products", async ({
    page,
  }) => {
    // Step 1: Navigate to homepage
    await page.goto("/");
    await expect(page).toHaveURL(/\/$/);

    // Step 2: Click on first product "More Details"
    const firstProduct = page
      .getByRole("button", { name: /more details/i })
      .first();
    await firstProduct.click();

    // Step 3: Verify product details page loaded
    await expect(page).toHaveURL(/\/product\/.+/);
    await expect(
      page.getByRole("heading", { name: /product details/i })
    ).toBeVisible();

    // Step 4: Verify product information is displayed
    await expect(page.getByText(/Name :/i)).toBeVisible();
    await expect(page.getByText(/Description :/i)).toBeVisible();
    await expect(page.getByText(/Price :/i)).toBeVisible();
    await expect(page.getByText(/Category :/i)).toBeVisible();

    // Step 5: Verify "Similar Products" section exists
    await expect(
      page.getByRole("heading", { name: /similar products/i })
    ).toBeVisible();

    // Step 6: Click on a related product
    const relatedProducts = page
      .locator(".card")
      .filter({ hasText: /similar products/i })
      .locator(".card");

    if ((await relatedProducts.count()) > 0) {
      const firstRelated = relatedProducts
        .first()
        .getByRole("button", { name: /more details/i });
      await firstRelated.click();

      // Step 7: Verify navigation to related product
      await expect(page).toHaveURL(/\/product\/.+/);
      await expect(
        page.getByRole("heading", { name: /product details/i })
      ).toBeVisible();
    }
  });

  test("authenticated user can add product to cart from details page", async ({
    page,
  }) => {
    // Step 1: Login as user
    await loginAsUser(page);

    // Step 2: Navigate to product details
    const firstProduct = page
      .getByRole("button", { name: /more details/i })
      .first();
    await firstProduct.click();
    await expect(page).toHaveURL(/\/product\/.+/);

    // Step 3: Add product to cart
    await page.getByRole("button", { name: /add to cart/i }).click();

    // Step 4: Verify success message
    await expect(page.getByText(/item added to cart/i)).toBeVisible();

    // Step 5: Verify cart badge updated
    await expect(page.locator('[href="/cart"]')).toContainText("1");

    // Step 6: Navigate to cart to verify
    await page.goto("/cart");
    await expect(page).toHaveURL(/\/cart$/);
    await expect(
      page.getByText(/You Have \d+ items in your cart/i)
    ).toBeVisible();

    // Cleanup
    await logout(page);
  });

  test("guest sees login prompt when adding to cart", async ({ page }) => {
    // Step 1: Navigate to product details as guest
    await page.goto("/");
    const firstProduct = page
      .getByRole("button", { name: /more details/i })
      .first();
    await firstProduct.click();

    // Step 2: Try to add to cart
    await page.getByRole("button", { name: /add to cart/i }).click();

    // Step 3: Verify item added (cart works for guests too)
    await expect(page.getByText(/item added to cart/i)).toBeVisible();

    // Step 4: Navigate to cart
    await page.goto("/cart");

    // Step 5: Verify guest checkout message
    await expect(page.getByText(/hello guest/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /please login to checkout/i })
    ).toBeVisible();
  });

  test("product price displays correctly with decimals", async ({ page }) => {
    // Step 1: Navigate to product details
    await page.goto("/");
    await page.getByRole("button", { name: /more details/i }).first().click();

    // Step 2: Verify price format (should include $ and decimal)
    const priceText = await page
      .locator("text=/Price : \\$/i")
      .textContent();
    expect(priceText).toMatch(/\$\d+(\.\d{2})?/);
  });

  test("product navigation between related products works", async ({
    page,
  }) => {
    // Step 1: Go to first product
    await page.goto("/");
    await page.getByRole("button", { name: /more details/i }).first().click();
    await expect(page).toHaveURL(/\/product\/.+/);

    const firstProductName = await page
      .locator("text=/Name :/i")
      .textContent();

    // Step 2: Click on second related product
    const relatedProducts = page.locator(".card").filter({
      has: page.locator("text=/similar products/i").locator(".."),
    });

    if ((await relatedProducts.count()) > 1) {
      await relatedProducts
        .nth(1)
        .getByRole("button", { name: /more details/i })
        .click();

      // Step 3: Verify product changed
      const secondProductName = await page
        .locator("text=/Name :/i")
        .textContent();
      expect(firstProductName).not.toBe(secondProductName);
    }
  });

  test("product image photo displays or shows placeholder", async ({
    page,
  }) => {
    // Step 1: Navigate to product details
    await page.goto("/");
    await page.getByRole("button", { name: /more details/i }).first().click();

    // Step 2: Check if image or placeholder exists
    const productImage = page.locator("img").first();
    await expect(productImage).toBeVisible();
  });
});