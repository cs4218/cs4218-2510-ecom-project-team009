import { test, expect } from "@playwright/test";

// Test suite for the main e-commerce flow (Home and Cart pages)
test.describe("E-commerce Main Flow", () => {
  // --- Unauthenticated User Tests ---
  test.describe("Unauthenticated User", () => {
    test("should load the homepage and display products", async ({ page }) => {
      // Navigate to the homepage
      await page.goto("/");

      // 1. Verify the page title
      await expect(page).toHaveTitle("ALL Products - Best offers ");

      // 2. Check for the main heading
      await expect(
        page.getByRole("heading", { name: "All Products" })
      ).toBeVisible();

      // 3. Ensure product cards are rendered by waiting for the first one
      await expect(page.locator(".card").first()).toBeVisible();
    });

    test("should add a product to the cart and view it", async ({ page }) => {
      await page.goto("/");

      // 1. Find the first product card and add it to the cart
      const firstProductCard = page.locator(".card").first();
      await firstProductCard
        .getByRole("button", { name: "ADD TO CART" })
        .click();

      // 2. Verify success toast message and wait for it to disappear
      const toast = page.getByText("Item Added to cart");
      await expect(toast).toBeVisible();
      await expect(toast).not.toBeVisible(); // Ensures async operations are complete

      // 3. Navigate to the cart page by going to the URL
      await page.goto("/cart");
      await expect(page).toHaveURL("/cart");

      // 4. Verify guest user message
      await expect(
        page.getByRole("heading", { name: /Hello Guest/ })
      ).toBeVisible();

      // 5. Check if the added item is in the cart
      await expect(page.locator(".cart-page .card").first()).toBeVisible();

      // 6. Verify the "login to checkout" button is present
      await expect(
        page.getByRole("button", { name: "Please Login to checkout" })
      ).toBeVisible();
    });

    test("should remove a product from the cart", async ({ page }) => {
      await page.goto("/");

      // 1. Add item to cart first
      const toast = page.getByText("Item Added to cart");
      await page
        .locator(".card")
        .first()
        .getByRole("button", { name: "ADD TO CART" })
        .click();
      await expect(toast).toBeVisible();
      await expect(toast).not.toBeVisible();

      // 2. Go to cart page
      await page.goto("/cart");
      await expect(page.locator(".cart-page .card").first()).toBeVisible();

      // 3. Remove the item
      await page.getByRole("button", { name: "Remove" }).click();

      // 4. Verify cart is now empty
      await expect(page.getByText("Your Cart Is Empty")).toBeVisible();
      await expect(page.locator(".cart-page .card")).toHaveCount(0);
    });
  });

  // --- Authenticated User Tests ---
  test.describe("Authenticated User", () => {
    // Before each test in this group, log in the user
    test.beforeEach(async ({ page }) => {
      await page.goto("/login");
      await page
        .getByPlaceholder("Enter Your Email")
        .fill("user@playwright.com");
      await page.getByPlaceholder("Enter Your Password").fill("UserPass123!");
      await page.getByRole("button", { name: "LOGIN" }).click();
      // Wait for navigation to homepage after login
      await expect(page).toHaveURL("/");
    });

    test("should add product to cart and see correct user details", async ({
      page,
    }) => {
      // 1. Add item from homepage
      const firstProductCard = page.locator(".card").first();
      const productName = await firstProductCard
        .locator(".card-title")
        .first()
        .textContent();
      const toast = page.getByText("Item Added to cart");
      await firstProductCard
        .getByRole("button", { name: "ADD TO CART" })
        .click();
      await expect(toast).toBeVisible();
      await expect(toast).not.toBeVisible();

      // 2. Go to cart page
      await page.goto("/cart");
      await expect(page).toHaveURL("/cart");

      // 3. Verify personalized greeting
      await expect(
        page.getByRole("heading", { name: /Hello Regular User \(Playwright\)/ })
      ).toBeVisible();

      // 4. Verify product is in the cart using a more specific locator
      const cartItem = page.locator(".cart-page .card", {
        hasText: productName!,
      });
      await expect(cartItem).toBeVisible();
      await expect(
        cartItem.getByText(productName!, { exact: true })
      ).toBeVisible();
    });

    test("should display address and payment options for checkout", async ({
      page,
    }) => {
      await page.goto("/");

      // 1. Add item to cart to satisfy the `cart.length > 0` condition for payment UI
      const toast = page.getByText("Item Added to cart");
      await page
        .locator(".card")
        .first()
        .getByRole("button", { name: "ADD TO CART" })
        .click();
      await expect(toast).toBeVisible();
      await expect(toast).not.toBeVisible();

      // 2. Go to cart page
      await page.goto("/cart");

      // 3. CRITICAL: Wait for the API call that provides the `clientToken` and confirm it was successful.
      // The payment UI will not render until this token is fetched.
      const tokenResponse = await page.waitForResponse(
        "**/api/v1/product/braintree/token"
      );
      expect(tokenResponse.ok()).toBeTruthy();

      // 4. Verify user address is displayed (from global-setup)
      await expect(page.getByText("Current Address")).toBeVisible();
      await expect(page.getByText("1 User Way")).toBeVisible();

      // 5. Verify "Make Payment" button is visible and enabled, as all conditions are now met.
      const makePaymentButton = page.getByRole("button", {
        name: "Make Payment",
      });
      await expect(makePaymentButton).toBeVisible();
      await expect(makePaymentButton).toBeEnabled();

      // 6. Click the "Card" payment option to expand the form
      await page.getByRole("button", { name: "Paying with Card" }).click();

      // 7. Verify that the card number input label is now visible.
      await expect(page.getByText("Card Number")).toBeVisible();
    });

    test("should successfully complete a payment and redirect to orders", async ({
      page,
    }) => {
      await page.goto("/");

      // 1. Add item to cart
      const toast = page.getByText("Item Added to cart");
      await page
        .locator(".card")
        .first()
        .getByRole("button", { name: "ADD TO CART" })
        .click();
      await expect(toast).toBeVisible();
      await expect(toast).not.toBeVisible();

      // 2. Go to cart page
      await page.goto("/cart");

      // 3. Wait for the Braintree token API call
      const tokenResponse = await page.waitForResponse(
        "**/api/v1/product/braintree/token"
      );
      expect(tokenResponse.ok()).toBeTruthy();

      // 4. Expand the card payment form
      await page.getByRole("button", { name: "Paying with Card" }).click();
      await expect(page.getByText("Card Number")).toBeVisible();

      // 5. Fill in Braintree hosted fields (they are in iframes)
      // Braintree provides test card numbers.
      const cardNumberFrame = page.frameLocator(
        'iframe[name="braintree-hosted-field-number"]'
      );
      await cardNumberFrame
        .getByLabel("Credit Card Number")
        .fill("4111111111111111");

      const expirationDateFrame = page.frameLocator(
        'iframe[name="braintree-hosted-field-expirationDate"]'
      );
      await expirationDateFrame.getByLabel("Expiration Date").fill("1229"); // MMYY format

      const cvvFrame = page.frameLocator(
        'iframe[name="braintree-hosted-field-cvv"]'
      );
      await cvvFrame.getByLabel("CVV").fill("123");

      // 6. Click the Make Payment button
      await page.getByRole("button", { name: "Make Payment" }).click();

      // 7. Assert navigation to the orders page
      await page.waitForURL("**/dashboard/user/orders");
      await expect(page).toHaveURL("/dashboard/user/orders");

      // 8. Verify the success toast message on the new page
      await expect(
        page.getByText("Payment Completed Successfully")
      ).toBeVisible();
    });
  });
});
