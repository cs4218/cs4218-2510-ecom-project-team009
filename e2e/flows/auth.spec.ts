import { test, expect } from "@playwright/test";

const uniqueEmail = () =>
  `playwright-flow1-${Date.now()}@example.com`.toLowerCase();

test.describe("Auth flows", () => {
  test("new user can register, login, hit guard, and logout", async ({
    page,
  }) => {
    const email = uniqueEmail();
    const password = "Password123!";
    const name = "Playwright User";

    // Step 1: visit register page and trigger client validations
    await page.goto("/register");
    await page.getByRole("button", { name: /register/i }).click();
    await expect(page.getByText("Name is required")).toBeVisible();
    await expect(page.getByText("Enter a valid email address")).toBeVisible();
    await expect(
      page.getByText("Password must be at least 8 characters")
    ).toBeVisible();
    await expect(
      page.getByText("Enter a valid phone number (10-15 digits)")
    ).toBeVisible();
    await expect(page.getByText("Address is Required")).toBeVisible();
    await expect(page.getByText("Date of birth is required")).toBeVisible();
    await expect(page.getByText("Security answer is required")).toBeVisible();

    // Step 2: fill valid registration details
    await page.getByPlaceholder("Enter your name").fill(name);
    await page.getByPlaceholder("Enter your email").fill(email);
    await page.getByPlaceholder("Enter your password").fill(password);
    await page.getByPlaceholder("Enter your phone").fill("9876543210");
    await page
      .getByPlaceholder("Enter your address")
      .fill("123 Playwright Lane");
    await page.getByPlaceholder("Enter your DOB").fill("1995-05-05");
    await page
      .getByPlaceholder("What is your favorite sport")
      .fill("basketball");
    await page.getByRole("button", { name: /^register$/i }).click();

    // Step 3: confirm redirect to login
    await expect(
      page.getByText(/Register successful, please login/i)
    ).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);

    // Step 4: login with new credentials
    await page.getByPlaceholder("Enter your email").fill(email);
    await page.getByPlaceholder("Enter your password").fill(password);
    await page.getByRole("button", { name: /^login$/i }).click();

    // Step 5: landing on home with authenticated header
    await expect(page).toHaveURL(/\/$/);
    const userDropdown = page.getByRole("button", { name: name.toUpperCase() });
    await expect(userDropdown).toBeVisible();

    // Step 6: hitting a public route should redirect home
    await page.goto("/register");
    await expect(page).toHaveURL(/\/$/);

    // Step 7: logout and verify guard resets
    await userDropdown.click();
    await page.getByRole("link", { name: /logout/i }).click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(
      page.getByRole("heading", { name: /login form/i })
    ).toBeVisible();
  });

  test("forgot password flow resets credential and guards work", async ({
    page,
  }) => {
    const seededEmail = "user@playwright.com";
    const wrongAnswer = "incorrect-answer";
    const correctAnswer = "user-answer";
    const newPassword = "ResetPass123!";

    // Step 1: go to login, navigte to forgot-password
    await page.goto("/login");
    await page.getByRole("button", { name: /forgot password/i }).click();
    await expect(page).toHaveURL(/\/forgot-password$/);

    // Step 2: trigger client validations
    await page.getByRole("button", { name: /reset password/i }).click();
    await expect(page.getByText("Email is required")).toBeVisible();
    await expect(page.getByText("Answer is required")).toBeVisible();
    await expect(page.getByText("New password is required")).toBeVisible();

    // Step 3: submit wrong info to trigger error toast
    await page.getByPlaceholder("Enter your email").fill(seededEmail);
    await page.getByPlaceholder("Enter your answer").fill(wrongAnswer);
    await page.getByPlaceholder("Enter your new password").fill(newPassword);
    await page.getByRole("button", { name: /reset password/i }).click();
    await expect(page.getByText(/Wrong email or answer/i)).toBeVisible();

    // Step 4: submit correct recovery data
    await page.getByPlaceholder("Enter your answer").fill(correctAnswer);
    await page.getByRole("button", { name: /reset password/i }).click();
    await expect(page.getByText(/Password reset successfully/i)).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);

    // Step 5: log in with new password and confirm redirect to home with authenticated header
    await page.getByPlaceholder("Enter your email").fill(seededEmail);
    await page.getByPlaceholder("Enter your password").fill(newPassword);
    await page.getByRole("button", { name: /^login$/i }).click();
    await expect(page).toHaveURL(/\/$/);
    const userDropdown = page.getByRole("button", {
      name: /regular user \(playwright\)/i,
    });
    await expect(userDropdown).toBeVisible();

    // Step 6: hit a public route while logged in and confirm redirect
    await page.goto("/login");
    await expect(page).toHaveURL(/\/$/);

    // Step 7: logout
    await userDropdown.click();
    await page.getByRole("link", { name: /logout/i }).click();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("admin dashboard menu accessible and guarded for admin role", async ({
    page,
    context,
  }) => {
    const adminEmail = "admin@playwright.com";
    const adminPassword = "AdminPass123!";

    // Step 1: login as admin
    await page.goto("/login");
    await page.getByPlaceholder("Enter your email").fill(adminEmail);
    await page.getByPlaceholder("Enter your password").fill(adminPassword);
    await page.getByRole("button", { name: /^login$/i }).click();
    await expect(page).toHaveURL(/\/$/);

    // Step 2: navigate to admin dashboard through header dropdown
    const adminDropdown = page.getByRole("button", {
      name: /admin user \(playwright\)/i,
    });
    await expect(adminDropdown).toBeVisible();
    await adminDropdown.click();
    await page.getByRole("link", { name: /dashboard/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/admin$/);

    // Step 3: wait for admin auth to resolve and verify dashboard data
    await expect(page.getByText(/Admin Panel/i)).toBeVisible();
    await expect(page.getByText(/Admin Name :/i)).toBeVisible();
    await expect(page.getByText(/Admin Email :/i)).toBeVisible();
    await expect(page.getByText(/Admin Contact :/i)).toBeVisible();

    // Step 4: iterate through menu links and confirm each page loads
    const adminMenuLinks = [
      { text: "Create Category", url: /\/dashboard\/admin\/create-category$/ },
      { text: "Create Product", url: /\/dashboard\/admin\/create-product$/ },
      { text: "Products", url: /\/dashboard\/admin\/products$/ },
      { text: "Orders", url: /\/dashboard\/admin\/orders$/ },
      { text: "Users", url: /\/dashboard\/admin\/users$/ },
    ];

    for (const link of adminMenuLinks) {
      await page.getByRole("link", { name: link.text }).click();
      await expect(page).toHaveURL(link.url);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await page.goto("/dashboard/admin");
    }

    // Step 5: log out
    await adminDropdown.click();
    await page.getByRole("link", { name: /logout/i }).click();
    await expect(page).toHaveURL(/\/login$/);

    // Step 6: ensure admin route is guarded when not authenticated
    const freshPage = await context.newPage();
    await freshPage.goto("/dashboard/admin");
    await expect(freshPage.getByText(/redirecting/i)).toBeVisible();
    await expect(freshPage).toHaveURL(/\/login$/);
  });
});
