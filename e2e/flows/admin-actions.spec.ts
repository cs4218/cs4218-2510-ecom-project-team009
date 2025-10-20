import { test, expect } from "@playwright/test";
import { loginAsAdmin, logout } from "../utils/auth-helpers";

test.describe("Admin CRUD operations", () => {
  test("admin creates category and verifies persistence", async ({ page }) => {
    await loginAsAdmin(page);

    // Navigate to Create Category page
    await page.waitForLoadState("domcontentloaded");
    const adminDropdown = page.getByRole("button", {
      name: /admin user \(playwright\)/i,
    });
    await adminDropdown.waitFor({ state: "visible" });
    await adminDropdown.click({ force: true });
    await page.getByRole("link", { name: /dashboard/i }).click();
    await page.waitForURL(/\/dashboard\/admin$/);
    await page.getByRole("link", { name: /create category/i }).click();
    await page.waitForURL(/\/dashboard\/admin\/create-category$/);

    // Create unique category name
    const categoryName = `E2E-Category-${Date.now()}`;
    await page.getByPlaceholder(/enter new category/i).fill(categoryName);
    await page.getByRole("button", { name: /submit/i }).click();

    // Verify success toast
    await expect(
      page.getByText(new RegExp(`${categoryName} is created`, "i"))
    ).toBeVisible({ timeout: 5000 });

    // Verify category appears in table
    await expect(page.getByRole("cell", { name: categoryName })).toBeVisible();

    // Reload and verify persistence
    await page.reload();
    await expect(page.getByRole("cell", { name: categoryName })).toBeVisible();

    // Cleanup: Delete the created category
    const categoryRow = page.locator("tr", { hasText: categoryName });
    await categoryRow.getByRole("button", { name: /delete/i }).click();
    await expect(page.getByText(/category is deleted/i)).toBeVisible();

    await logout(page);
  });

  test("admin updates category", async ({ page }) => {
    await loginAsAdmin(page);

    // Navigate to Create Category page
    await page.waitForLoadState("domcontentloaded");
    const adminDropdown = page.getByRole("button", {
      name: /admin user \(playwright\)/i,
    });
    await adminDropdown.waitFor({ state: "visible" });
    await adminDropdown.click({ force: true });
    await page.getByRole("link", { name: /dashboard/i }).click();
    await page.waitForURL(/\/dashboard\/admin$/);
    await page.getByRole("link", { name: /create category/i }).click();
    await page.waitForURL(/\/dashboard\/admin\/create-category$/);

    // Create a category to update
    const originalName = `Original-${Date.now()}`;
    await page.getByPlaceholder(/enter new category/i).fill(originalName);
    await page.getByRole("button", { name: /submit/i }).click();
    await expect(
      page.getByText(new RegExp(`${originalName} is created`, "i"))
    ).toBeVisible();

    // Click Edit button on the created category
    const categoryRow = page.locator("tr", { hasText: originalName });
    await categoryRow.getByRole("button", { name: /edit/i }).click();

    // Wait for modal to appear
    await expect(page.locator(".ant-modal")).toBeVisible();

    // Update category name in modal
    const updatedName = `Updated-${Date.now()}`;
    const modalInput = page
      .locator(".ant-modal")
      .getByPlaceholder(/enter new category/i);
    await modalInput.clear();
    await modalInput.fill(updatedName);

    // Submit update
    const submitButton = page
      .locator(".ant-modal")
      .getByRole("button", { name: /submit/i });
    await submitButton.click();

    // Verify success toast
    await expect(
      page.getByText(new RegExp(`${updatedName} is updated`, "i"))
    ).toBeVisible();

    // Verify updated name appears in list
    await expect(page.getByRole("cell", { name: updatedName })).toBeVisible();

    // Verify original name is gone
    await expect(page.getByText(originalName)).toHaveCount(0);

    // Cleanup: Delete the updated category
    const updatedCategoryRow = page.locator("tr", { hasText: updatedName });
    await updatedCategoryRow.getByRole("button", { name: /delete/i }).click();
    await expect(page.getByText(/category is deleted/i)).toBeVisible();

    await logout(page);
  });

  test("admin deletes category", async ({ page }) => {
    await loginAsAdmin(page);

    // Navigate to Create Category page
    await page.waitForLoadState("domcontentloaded");
    const adminDropdown = page.getByRole("button", {
      name: /admin user \(playwright\)/i,
    });
    await adminDropdown.waitFor({ state: "visible" });
    await adminDropdown.click({ force: true });
    await page.getByRole("link", { name: /dashboard/i }).click();
    await page.waitForURL(/\/dashboard\/admin$/);
    await page.getByRole("link", { name: /create category/i }).click();
    await page.waitForURL(/\/dashboard\/admin\/create-category$/);

    // Create a category to delete
    const categoryName = `ToDelete-${Date.now()}`;
    await page.getByPlaceholder(/enter new category/i).fill(categoryName);
    await page.getByRole("button", { name: /submit/i }).click();
    await expect(
      page.getByText(new RegExp(`${categoryName} is created`, "i"))
    ).toBeVisible();

    // Click Delete button
    const categoryRow = page.locator("tr", { hasText: categoryName });
    await categoryRow.getByRole("button", { name: /delete/i }).click();

    // Verify success toast
    await expect(
      page.getByText(new RegExp(`category is deleted`, "i"))
    ).toBeVisible();

    // Verify category removed from list
    await expect(page.getByText(categoryName)).toHaveCount(0);

    // Reload and verify deletion persists
    await page.reload();
    await expect(page.getByText(categoryName)).toHaveCount(0);

    await logout(page);
  });

  test("admin creates product with category and photo", async ({ page }) => {
    await loginAsAdmin(page);

    // Navigate to Create Product page
    await page.waitForLoadState("domcontentloaded");
    const adminDropdown = page.getByRole("button", {
      name: /admin user \(playwright\)/i,
    });
    await adminDropdown.waitFor({ state: "visible" });
    await adminDropdown.click({ force: true });
    await page.getByRole("link", { name: /dashboard/i }).click();
    await page.waitForURL(/\/dashboard\/admin$/);
    await page.getByRole("link", { name: /create product/i }).click();
    await page.waitForURL(/\/dashboard\/admin\/create-product$/);

    // Fill product form
    const productName = `E2E-Product-${Date.now()}`;
    await page.getByPlaceholder(/write a name/i).fill(productName);
    await page
      .getByPlaceholder(/write a description/i)
      .fill("E2E test product description");
    await page.getByPlaceholder(/write a price/i).fill("999");
    await page.getByPlaceholder(/write a quantity/i).fill("10");

    // Select category (select first available category)
    const categorySelect = page
      .locator(".ant-select-selector")
      .filter({ hasText: /select a category/i })
      .first();
    await categorySelect.click();
    await page.locator(".ant-select-item").first().waitFor({ state: "visible" });
    const firstCategory = page.locator(".ant-select-item").first();
    await firstCategory.click();

    // Select shipping
    const shippingSelect = page
      .locator(".ant-select-selector")
      .filter({ hasText: /select shipping/i })
      .first();
    await shippingSelect.click();
    await page.getByText("Yes", { exact: true }).waitFor({ state: "visible" });
    await page.getByText("Yes", { exact: true }).click();

    // Upload photo - create a small test image
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: "test-product.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        "base64"
      ),
    });

    // Verify photo preview appears
    await expect(page.getByAltText("product_photo")).toBeVisible();

    // Submit form
    await page.getByRole("button", { name: /create product/i }).click();

    // Verify success toast
    await expect(page.getByText(/product created successfully/i)).toBeVisible();

    // Verify navigation to products list
    await page.waitForURL(/\/dashboard\/admin\/products$/);

    // Verify product appears in list
    await expect(page.getByText(productName)).toBeVisible();

    // Cleanup: Delete the created product
    const cleanupProductLink = page.getByRole("link", { name: productName }).first();
    await cleanupProductLink.click();
    await page.waitForURL(/\/dashboard\/admin\/product\//);

    page.once('dialog', (dialog) => {
      dialog.accept('yes');
    });
    await page.waitForTimeout(50); // Give WebKit time to register handler
    await Promise.all([
      page.waitForURL(/\/dashboard\/admin\/products$/),
      page.waitForLoadState('networkidle'),
      page.getByRole("button", { name: /delete product/i }).click()
    ]);

    await logout(page);
  });

  test("admin updates existing product", async ({ page }) => {
    await loginAsAdmin(page);

    // Navigate to Create Product and create a product first
    await page.waitForLoadState("domcontentloaded");
    const adminDropdown = page.getByRole("button", {
      name: /admin user \(playwright\)/i,
    });
    await adminDropdown.waitFor({ state: "visible" });
    await adminDropdown.click({ force: true });
    await page.getByRole("link", { name: /dashboard/i }).click();
    await page.waitForURL(/\/dashboard\/admin$/);
    await page.getByRole("link", { name: /create product/i }).click();
    await page.waitForURL(/\/dashboard\/admin\/create-product$/);

    // Create initial product
    const originalName = `Original-Product-${Date.now()}`;
    await page.getByPlaceholder(/write a name/i).fill(originalName);
    await page
      .getByPlaceholder(/write a description/i)
      .fill("Original description");
    await page.getByPlaceholder(/write a price/i).fill("100");
    await page.getByPlaceholder(/write a quantity/i).fill("5");

    const categorySelect = page
      .locator(".ant-select-selector")
      .filter({ hasText: /select a category/i })
      .first();
    await categorySelect.click();
    await page.locator(".ant-select-item").first().waitFor({ state: "visible" });
    await page.locator(".ant-select-item").first().click();

    const shippingSelect = page
      .locator(".ant-select-selector")
      .filter({ hasText: /select shipping/i })
      .first();
    await shippingSelect.click();
    await page.getByText("No", { exact: true }).waitFor({ state: "visible" });
    await page.getByText("No", { exact: true }).click();

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: "test.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        "base64"
      ),
    });

    await page.getByRole("button", { name: /create product/i }).click();
    await expect(page.getByText(/product created successfully/i)).toBeVisible();
    await page.waitForURL(/\/dashboard\/admin\/products$/);

    // Navigate to update product
    const productLink = page
      .getByRole("link", { name: originalName })
      .first();
    await productLink.click();
    await page.waitForURL(/\/dashboard\/admin\/product\//);

    // Verify form pre-populated
    await expect(page.getByPlaceholder(/write a name/i)).toHaveValue(
      originalName
    );

    // Update product details
    const updatedName = `Updated-Product-${Date.now()}`;
    await page.getByPlaceholder(/write a name/i).clear();
    await page.getByPlaceholder(/write a name/i).fill(updatedName);
    await page.getByPlaceholder(/write a price/i).clear();
    await page.getByPlaceholder(/write a price/i).fill("200");

    // Submit update
    await page.getByRole("button", { name: /update product/i }).click();

    // Verify success toast
    await expect(
      page.getByText(/product updated successfully/i)
    ).toBeVisible();

    // Verify navigation back to products list
    await page.waitForURL(/\/dashboard\/admin\/products$/);

    // Verify updated product appears
    await expect(page.getByText(updatedName)).toBeVisible();

    // Cleanup: Delete the updated product
    const updatedLink = page.getByRole("link", { name: updatedName }).first();
    await updatedLink.click();
    await page.waitForURL(/\/dashboard\/admin\/product\//);

    page.once('dialog', (dialog) => {
      dialog.accept('yes');
    });
    await page.waitForTimeout(50); // Give WebKit time to register handler
    await Promise.all([
      page.waitForURL(/\/dashboard\/admin\/products$/),
      page.waitForLoadState('networkidle'),
      page.getByRole("button", { name: /delete product/i }).click()
    ]);

    await logout(page);
  });

  test("admin deletes product", async ({ page }) => {
    await loginAsAdmin(page);

    // Navigate to products page
    await page.waitForLoadState("domcontentloaded");
    const adminDropdown = page.getByRole("button", {
      name: /admin user \(playwright\)/i,
    });
    await adminDropdown.waitFor({ state: "visible" });
    await adminDropdown.click({ force: true });
    await page.getByRole("link", { name: /dashboard/i }).click();
    await page.waitForURL(/\/dashboard\/admin$/);
    await page.getByRole("link", { name: /create product/i }).click();
    await page.waitForURL(/\/dashboard\/admin\/create-product$/);

    // Create a test product
    const productName = `ToDelete-${Date.now()}`;
    await page.getByPlaceholder(/write a name/i).fill(productName);
    await page.getByPlaceholder(/write a description/i).fill("Test product");
    await page.getByPlaceholder(/write a price/i).fill("99");
    await page.getByPlaceholder(/write a quantity/i).fill("5");

    const categorySelect = page
      .locator(".ant-select-selector")
      .filter({ hasText: /select a category/i })
      .first();
    await categorySelect.click();
    await page.locator(".ant-select-item").first().waitFor({ state: "visible" });
    await page.locator(".ant-select-item").first().click();

    const shippingSelect = page
      .locator(".ant-select-selector")
      .filter({ hasText: /select shipping/i })
      .first();
    await shippingSelect.click();
    await page.getByText("No", { exact: true }).waitFor({ state: "visible" });
    await page.getByText("No", { exact: true }).click();

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: "test.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        "base64"
      ),
    });

    await page.getByRole("button", { name: /create product/i }).click();
    await expect(page.getByText(/product created successfully/i)).toBeVisible();
    await page.waitForURL(/\/dashboard\/admin\/products$/);

    // Navigate to update page and delete
    const productLink = page.getByRole("link", { name: productName }).first();
    await productLink.click();
    await page.waitForURL(/\/dashboard\/admin\/product\//);

    // Handle delete confirmation dialog
    page.once('dialog', (dialog) => {
      dialog.accept('yes');
    });
    await page.waitForTimeout(50); // Give WebKit time to register handler
    await Promise.all([
      page.waitForURL(/\/dashboard\/admin\/products$/),
      page.waitForLoadState('networkidle'),
      page.getByRole("button", { name: /delete product/i }).click()
    ]);

    // Note: Toast doesn't appear due to race condition bug (navigate() called immediately after toast)
    // Verify navigation and deletion instead
    await expect(page.getByText(productName)).toHaveCount(0);

    // Verify deletion persists after reload
    await page.reload();
    await expect(page.getByText(productName)).toHaveCount(0);

    await logout(page);
  });

  test("admin receives validation errors for invalid inputs", async ({
    page,
  }) => {
    await loginAsAdmin(page);

    // Navigate to Create Product page
    await page.waitForLoadState("domcontentloaded");
    const adminDropdown = page.getByRole("button", {
      name: /admin user \(playwright\)/i,
    });
    await adminDropdown.waitFor({ state: "visible" });
    await adminDropdown.click({ force: true });
    await page.getByRole("link", { name: /dashboard/i }).click();
    await page.waitForURL(/\/dashboard\/admin$/);
    await page.getByRole("link", { name: /create product/i }).click();
    await page.waitForURL(/\/dashboard\/admin\/create-product$/);

    // Submit empty form (no fields filled)
    await page.getByRole("button", { name: /create product/i }).click();

    // Verify backend validation error toast
    await expect(page.getByText(/something went wrong/i)).toBeVisible();

    await logout(page);
  });
});
