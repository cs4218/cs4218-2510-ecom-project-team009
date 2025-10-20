import { test, expect } from "@playwright/test";
import { loginAsAdmin, logout } from "../utils/auth-helpers";

test.describe("Admin View - Orders & Products", () => {
  test("admin views all orders with details", async ({ page }) => {
    // Step 1: Login as admin
    await loginAsAdmin(page);

    // Step 2: Navigate to Orders page via admin menu
    const adminDropdown = page.getByRole("button", {
      name: /admin user \(playwright\)/i,
    });
    await adminDropdown.click();
    await page.getByRole("link", { name: /dashboard/i }).click();
    await page.waitForURL(/\/dashboard\/admin$/);

    await page.getByRole("link", { name: /^orders$/i }).click();
    await page.waitForURL(/\/dashboard\/admin\/orders$/);

    // Step 3: Verify orders page heading
    await expect(
      page.getByRole("heading", { name: /all orders/i })
    ).toBeVisible();

    // Step 4: Verify table headers are present
    await expect(page.getByRole("columnheader", { name: "#" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Status" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Buyer" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /date/i })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Payment" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Quantity" })).toBeVisible();

    // Step 5: Logout
    await logout(page);
  });

  test("admin updates order status and verifies persistence", async ({
    page,
  }) => {
    // Step 1: Login as admin
    await loginAsAdmin(page);

    // Step 2: Navigate to Orders page
    await page.goto("/dashboard/admin/orders");
    await page.waitForURL(/\/dashboard\/admin\/orders$/);

    // Step 3: Find first order's status dropdown (Ant Design Select)
    const firstStatusDropdown = page.locator(".ant-select").first();

    // Only proceed if orders exist
    const ordersExist = (await page.locator(".ant-select").count()) > 0;
    if (ordersExist) {
      // Step 4: Get current status
      const currentStatus = await firstStatusDropdown.textContent();

      // Step 5: Open dropdown and select a different status
      await firstStatusDropdown.click();
      await page.waitForTimeout(300); // Wait for dropdown animation

      // Select "Processing" if it's not already selected
      const targetStatus =
        currentStatus?.includes("Processing") ? "Shipped" : "Processing";
      await page.getByText(targetStatus, { exact: true }).click();

      // Step 6: Verify status updated immediately
      await expect(firstStatusDropdown).toContainText(targetStatus);

      // Step 7: Reload page and verify persistence
      await page.reload();
      await page.waitForURL(/\/dashboard\/admin\/orders$/);

      const updatedDropdown = page.locator(".ant-select").first();
      await expect(updatedDropdown).toContainText(targetStatus);
    }

    // Step 8: Logout
    await logout(page);
  });

  test("admin views all products list", async ({ page }) => {
    // Step 1: Login as admin
    await loginAsAdmin(page);

    // Step 2: Navigate to Products page via admin menu
    const adminDropdown = page.getByRole("button", {
      name: /admin user \(playwright\)/i,
    });
    await adminDropdown.click();
    await page.getByRole("link", { name: /dashboard/i }).click();
    await page.waitForURL(/\/dashboard\/admin$/);

    await page.getByRole("link", { name: /^products$/i }).click();
    await page.waitForURL(/\/dashboard\/admin\/products$/);

    // Step 3: Verify products page heading
    await expect(
      page.getByRole("heading", { name: /all products list/i })
    ).toBeVisible();

    // Step 4: Verify product cards display (if products exist)
    const productCards = page.locator(".card");
    const productCount = await productCards.count();

    if (productCount > 0) {
      // Verify first product card structure
      const firstCard = productCards.first();
      await expect(firstCard.locator(".card-img-top")).toBeVisible();
      await expect(firstCard.locator(".card-title")).toBeVisible();
      await expect(firstCard.locator(".card-text")).toBeVisible();
    }

    // Step 5: Logout
    await logout(page);
  });

  test("admin navigates from products list to update product page", async ({
    page,
  }) => {
    // Step 1: Login as admin
    await loginAsAdmin(page);

    // Step 2: Navigate to Products page
    await page.goto("/dashboard/admin/products");
    await page.waitForURL(/\/dashboard\/admin\/products$/);

    // Step 3: Find first product link (if products exist)
    const productLinks = page.locator(".product-link");
    const productCount = await productLinks.count();

    if (productCount > 0) {
      // Step 4: Get product name before clicking
      const firstProductCard = productLinks.first().locator(".card");
      const productName = await firstProductCard
        .locator(".card-title")
        .textContent();

      // Step 5: Click product card to navigate to Update Product page
      await productLinks.first().click();

      // Step 6: Verify navigation to update product page
      await expect(page).toHaveURL(/\/dashboard\/admin\/product\/.+$/);

      // Step 7: Verify update form is visible
      await expect(
        page.getByRole("heading", { name: /update product/i })
      ).toBeVisible();

      // Step 8: Verify form has product name input
      if (productName) {
        const nameInput = page.getByPlaceholder(/write a name/i);
        await expect(nameInput).toBeVisible();
        await expect(nameInput).toHaveValue(productName.trim());
      }
    }

    // Step 9: Logout
    await logout(page);
  });

  test("admin views orders page when no orders exist", async ({ page }) => {
    // Step 1: Login as admin
    await loginAsAdmin(page);

    // Step 2: Navigate directly to Orders page
    await page.goto("/dashboard/admin/orders");
    await page.waitForURL(/\/dashboard\/admin\/orders$/);

    // Step 3: Verify page heading is visible regardless of data
    await expect(
      page.getByRole("heading", { name: /all orders/i })
    ).toBeVisible();

    // Step 4: Verify page doesn't crash with empty state
    await expect(page.getByRole("columnheader", { name: "Status" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Buyer" })).toBeVisible();

    // Step 5: Logout
    await logout(page);
  });
});
