import type { Page } from "@playwright/test";

export async function loginAsUser(page: Page) {
  const userEmail = "user@playwright.com";
  const userPassword = "UserPass123!";

  await page.goto("/login");
  await page.getByPlaceholder("Enter your email").fill(userEmail);
  await page.getByPlaceholder("Enter your password").fill(userPassword);
  await page.getByRole("button", { name: /^login$/i }).click();
  await page.waitForURL(/\/$/);
}

export async function loginAsAdmin(page: Page) {
  const adminEmail = "admin@playwright.com";
  const adminPassword = "AdminPass123!";

  await page.goto("/login");
  await page.getByPlaceholder("Enter your email").fill(adminEmail);
  await page.getByPlaceholder("Enter your password").fill(adminPassword);
  await page.getByRole("button", { name: /^login$/i }).click();
  await page.waitForURL(/\/$/);
}

export async function logout(page: Page) {
  const dropdown = page.getByRole("button", { name: /\(playwright\)/i });
  await dropdown.click();
  await page.getByRole("link", { name: /logout/i }).click();
  await page.waitForURL(/\/login$/);
}