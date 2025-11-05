import { test, expect } from "@playwright/test";
import { loginAsAdmin, loginAsUser, logout, createTestUser, deleteTestUser } from "../utils/auth-helpers";

test.describe("User flows - Guards, Dashboard, Menu", () => {
  const users = {
    regular: {
      email: "userflows-regular@test.com",
      password: "UserFlow123!",
      name: "User Flows Regular User",
    },
    admin: {
      email: "userflows-admin@test.com",
      password: "AdminFlow123!",
      name: "User Flows Admin User",
    },
  };

  test.beforeAll(async () => {
    await createTestUser({
      name: users.regular.name,
      email: users.regular.email,
      password: users.regular.password,
      phone: "1111111111",
      address: "123 User Flow St",
      answer: "userflow-answer",
      role: 0,
    });

    await createTestUser({
      name: users.admin.name,
      email: users.admin.email,
      password: users.admin.password,
      phone: "2222222222",
      address: "456 Admin Flow Ave",
      answer: "adminflow-answer",
      role: 1,
    });
  });

  test.afterAll(async () => {
    await deleteTestUser(users.regular.email);
    await deleteTestUser(users.admin.email);
  });

  test("unauthenticated user redirected from private route", async ({
    page,
  }) => {
    // Step 1: navigate to private route without login
    await page.goto("/dashboard/user");

    // Step 2: verify redirecting message appears
    await expect(page.getByText(/redirecting to you in \d+ second/i)).toBeVisible();

    // Step 3: verify redirect to home page (Private route redirects to "/" not "/login")
    await expect(page).toHaveURL(/\/$/, { timeout: 5000 });
  });

  test("regular user blocked from admin routes", async ({ page }) => {
    // Step 1: login as regular user
    await loginAsUser(page, users.regular.email, users.regular.password);

    // Step 2: attempt to access admin dashboard
    await page.goto("/dashboard/admin");

    // Step 3: verify redirecting message
    await expect(page.getByText(/redirecting to you in \d+ second/i)).toBeVisible();

    // Step 4: verify redirect to home page
    await expect(page).toHaveURL(/\/$/, { timeout: 5000 });

    // Step 5: verify no admin content visible
    await expect(page.getByText(/Admin Panel/i)).toHaveCount(0);
    await expect(page.getByText(/Admin Name :/i)).toHaveCount(0);
    await expect(page.getByText(/Admin Email :/i)).toHaveCount(0);

    // Step 6: logout
    await logout(page, users.regular.name);
  });

  test("admin can access admin routes", async ({ page }) => {
    // Step 1: login as admin
    await loginAsAdmin(page, users.admin.email, users.admin.password);

    // Step 2: navigate to admin dashboard
    await page.goto("/dashboard/admin");

    // Step 3: verify admin panel content visible
    await expect(page.getByText(/Admin Panel/i)).toBeVisible();
    await expect(page.getByText(/Admin Name :/i)).toBeVisible();
    await expect(page.getByText(/Admin Email :/i)).toBeVisible();
    await expect(page.getByText(/Admin Contact :/i)).toBeVisible();

    // Step 4: logout
    await logout(page, users.admin.name);
  });

  test("user dashboard displays user information", async ({ page }) => {
    // Step 1: login as regular user
    await loginAsUser(page, users.regular.email, users.regular.password);

    // Step 2: navigate to user dashboard via header dropdown
    const userDropdown = page.getByRole("button", {
      name: new RegExp(users.regular.name, "i"),
    });
    await userDropdown.click();
    await page.getByRole("link", { name: /dashboard/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/user$/);

    // Step 3: verify user details displayed
    await expect(page.getByRole("heading", { name: new RegExp(users.regular.name, "i") })).toBeVisible();
    await expect(page.getByRole("heading", { name: new RegExp(users.regular.email, "i") })).toBeVisible();

    // Step 4: logout
    await logout(page, users.regular.name);
  });

  test("user menu navigation works", async ({ page }) => {
    // Step 1: login as regular user
    await loginAsUser(page, users.regular.email, users.regular.password);

    // Step 2: navigate to user dashboard
    await page.goto("/dashboard/user");
    await expect(page).toHaveURL(/\/dashboard\/user$/);

    // Step 3: verify user menu visible with links
    await expect(page.getByRole("heading", { name: /Dashboard/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Profile/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Orders/i })).toBeVisible();

    // Step 4: click Profile link and verify navigation
    await page.getByRole("link", { name: /Profile/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/user\/profile$/);

    // Step 5: navigate back to dashboard
    await page.goto("/dashboard/user");

    // Step 6: click Orders link and verify navigation
    await page.getByRole("link", { name: /Orders/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/user\/orders$/);

    // Step 7: logout
    await logout(page, users.regular.name);
  });

  test("menu shows different links for admin vs user", async ({ page }) => {
    // Step 1: login as admin
    await loginAsAdmin(page, users.admin.email, users.admin.password);

    // Step 2: verify admin dropdown exists
    const adminDropdown = page.getByRole("button", {
      name: new RegExp(users.admin.name, "i"),
    });
    await expect(adminDropdown).toBeVisible();

    // Step 3: click dropdown and verify admin links
    await adminDropdown.click();
    await expect(page.getByRole("link", { name: /dashboard/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /logout/i })).toBeVisible();

    // Close dropdown before logout to avoid state conflict
    await page.keyboard.press("Escape");

    // Step 4: logout
    await logout(page, users.admin.name);

    // Step 5: login as regular user
    await loginAsUser(page, users.regular.email, users.regular.password);

    // Step 6: verify user dropdown exists
    const userDropdown = page.getByRole("button", {
      name: new RegExp(users.regular.name, "i"),
    });
    await expect(userDropdown).toBeVisible();

    // Step 7: verify user menu does not show admin-specific links
    await userDropdown.click();
    await expect(page.getByRole("link", { name: /dashboard/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /logout/i })).toBeVisible();

    // Step 8: verify no "Admin Panel" link visible for regular user
    await expect(page.getByRole("link", { name: /admin panel/i })).toHaveCount(0);

    // Close dropdown before logout to avoid state conflict
    await page.keyboard.press("Escape");

    // Step 9: logout
    await logout(page, users.regular.name);
  });
});
