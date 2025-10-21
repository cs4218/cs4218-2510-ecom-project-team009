import type { Page } from "@playwright/test";

export async function loginAsUser(page: Page, userEmail: string = "user@playwright.com", userPassword: string = "UserPass123!") {
  await page.goto("/login");
  await page.getByPlaceholder("Enter your email").fill(userEmail);
  await page.getByPlaceholder("Enter your password").fill(userPassword);

  // Triple-layer defense: Layer 2 (Promise.all) + Layer 3 (networkidle)
  await Promise.all([
    page.waitForURL(/\/$/, { timeout: 60000 }),
    page.waitForLoadState('networkidle'), // Wait for login API to complete
    page.getByRole("button", { name: /^login$/i }).click()
  ]);
}

export async function loginAsAdmin(page: Page, adminEmail: string = "admin@playwright.com", adminPassword: string = "AdminPass123!") {
  await page.goto("/login");
  await page.getByPlaceholder("Enter your email").fill(adminEmail);
  await page.getByPlaceholder("Enter your password").fill(adminPassword);

  // Triple-layer defense: Layer 2 (Promise.all) + Layer 3 (networkidle)
  await Promise.all([
    page.waitForURL(/\/$/, { timeout: 60000 }),
    page.waitForLoadState('networkidle'), // Wait for login API to complete
    page.getByRole("button", { name: /^login$/i }).click()
  ]);
}

export async function logout(page: Page) {
  const dropdown = page.getByRole("button", { name: /\(playwright\)/i });
  await dropdown.click();
  await page.getByRole("link", { name: /logout/i }).click();
  await page.waitForURL(/\/login$/);
}