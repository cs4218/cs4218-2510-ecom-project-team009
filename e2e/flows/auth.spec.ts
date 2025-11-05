import { test, expect } from "@playwright/test";
import mongoose from "mongoose";
import userModel from "../../models/userModel.js";
import { hashPassword } from "../../helpers/authHelper.js";

const uniqueEmail = () =>
  `playwright-flow1-${Date.now()}@example.com`.toLowerCase();

const DEFAULT_MONGO_URL = "mongodb://127.0.0.1:27017/ecom_e2e";

const AUTH_TEST_USERS = {
  admin: {
    name: "Auth Test Admin",
    email: "auth-test-admin@playwright.com",
    password: "AuthAdmin123!",
    phone: "1111111111",
    address: "Auth Test Admin Address",
    answer: "auth-admin-answer",
    role: 1,
  },
  user: {
    name: "Auth Test User",
    email: "auth-test-user@playwright.com",
    password: "AuthUser123!",
    phone: "2222222222",
    address: "Auth Test User Address",
    answer: "auth-user-answer",
    role: 0,
  },
};

test.describe("Auth flows", () => {
  test.beforeAll(async () => {
    const mongoUrl = process.env.MONGO_URL || DEFAULT_MONGO_URL;
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUrl);
    }

    // Seed test-specific users
    for (const userData of Object.values(AUTH_TEST_USERS)) {
      const hashedPassword = await hashPassword(userData.password);
      const existing = await userModel.findOne({ email: userData.email });

      if (existing) {
        existing.set({
          name: userData.name,
          password: hashedPassword,
          phone: userData.phone,
          address: userData.address,
          answer: userData.answer,
          role: userData.role,
        });
        await existing.save();
      } else {
        await userModel.create({
          name: userData.name,
          email: userData.email,
          password: hashedPassword,
          phone: userData.phone,
          address: userData.address,
          answer: userData.answer,
          role: userData.role,
        });
      }
    }
  });

  test.afterAll(async () => {
    // Delete test-specific users
    const testEmails = Object.values(AUTH_TEST_USERS).map((u) => u.email);
    await userModel.deleteMany({ email: { $in: testEmails } });

    await mongoose.connection.close();
  });

  test.afterEach(async ({ page, context }, testInfo) => {
    const testTitle = testInfo.title;

    // Database cleanup
    if (testTitle.includes("new user can register")) {
      await userModel.deleteMany({
        email: { $regex: /playwright-flow1-\d+@example\.com/ },
      });
    }

    if (testTitle.includes("forgot password flow")) {
      const correctPassword = await hashPassword(AUTH_TEST_USERS.user.password);
      await userModel.updateOne(
        { email: AUTH_TEST_USERS.user.email },
        { password: correctPassword, answer: AUTH_TEST_USERS.user.answer }
      );
    }

    // Ensure logout
    try {
      const dropdown = page.getByRole("button", { name: /user|admin/i });
      if (await dropdown.isVisible({ timeout: 1000 })) {
        await dropdown.click();
        await page.getByRole("link", { name: /logout/i }).click();
        await page.waitForURL(/\/login$/);
      }
    } catch {
      // Already logged out
    }

    // Clear browser state
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await context.clearCookies();
    await page.goto("/login");
  });

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
    const seededEmail = AUTH_TEST_USERS.user.email;
    const wrongAnswer = "incorrect-answer";
    const correctAnswer = AUTH_TEST_USERS.user.answer;
    const newPassword = "ResetPass123!";
    const originalPassword = AUTH_TEST_USERS.user.password;

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
      name: /auth test user/i,
    });
    await expect(userDropdown).toBeVisible();

    // Step 6: hit a public route while logged in and confirm redirect
    await page.goto("/login");
    await expect(page).toHaveURL(/\/$/);

    // Step 7: logout
    await userDropdown.click();
    await page.getByRole("link", { name: /logout/i }).click();
    await expect(page).toHaveURL(/\/login$/);

    // Step 8: restore original password via forgot-password flow
    await page.getByRole("button", { name: /forgot password/i }).click();
    await expect(page).toHaveURL(/\/forgot-password$/);
    await page.getByPlaceholder("Enter your email").fill(seededEmail);
    await page.getByPlaceholder("Enter your answer").fill(correctAnswer);
    await page
      .getByPlaceholder("Enter your new password")
      .fill(originalPassword);
    await page.getByRole("button", { name: /reset password/i }).click();
    await expect(page.getByText(/Password reset successfully/i)).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);

    // Step 9: confirm original password works and finish logged out
    await page.getByPlaceholder("Enter your email").fill(seededEmail);
    await page.getByPlaceholder("Enter your password").fill(originalPassword);
    await page.getByRole("button", { name: /^login$/i }).click();
    await expect(page).toHaveURL(/\/$/);
    const restoredDropdown = page.getByRole("button", {
      name: /auth test user/i,
    });
    await expect(restoredDropdown).toBeVisible();
    await restoredDropdown.click();
    await page.getByRole("link", { name: /logout/i }).click();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("admin dashboard menu accessible and guarded for admin role", async ({
    page,
    context,
  }) => {
    const adminEmail = AUTH_TEST_USERS.admin.email;
    const adminPassword = AUTH_TEST_USERS.admin.password;

    // Step 1: login as admin
    await page.goto("/login");
    await page.getByPlaceholder("Enter your email").fill(adminEmail);
    await page.getByPlaceholder("Enter your password").fill(adminPassword);
    await page.getByRole("button", { name: /^login$/i }).click();
    await expect(page).toHaveURL(/\/$/);

    // Step 2: navigate to admin dashboard through header dropdown
    const adminDropdown = page.getByRole("button", {
      name: /auth test admin/i,
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

  test("regular user cannot access admin dashboard", async ({ page }) => {
    const userEmail = AUTH_TEST_USERS.user.email;
    const userPassword = AUTH_TEST_USERS.user.password;

    // Step 1: log in as seeded regular user
    await page.goto("/login");
    await page.getByPlaceholder("Enter your email").fill(userEmail);
    await page.getByPlaceholder("Enter your password").fill(userPassword);
    await page.getByRole("button", { name: /^login$/i }).click();
    await expect(page).toHaveURL(/\/$/);

    // Step 2: attempt to access admin dashboard
    await page.goto("/dashboard/admin");
    await expect(page.getByText(/redirecting/i)).toBeVisible();
    await expect(page).toHaveURL(/\/$/);

    // Step 3: ensure no admin panel elements are visible
    await expect(page.getByText(/Admin Panel/i)).toHaveCount(0);
    await expect(page.getByText(/Admin Name :/i)).toHaveCount(0);
    await expect(page.getByText(/Admin Email :/i)).toHaveCount(0);
    await expect(page.getByText(/Admin Contact :/i)).toHaveCount(0);

    // Step 4: logout
    if (
      await page
        .getByRole("button", { name: /auth test user/i })
        .isVisible()
    ) {
      await page
        .getByRole("button", { name: /auth test user/i })
        .click();
      await page.getByRole("link", { name: /logout/i }).click();
    }
    await expect(page).toHaveURL(/\/login$/);
  });

  test("session survives reload, cart clears after logout", async ({
    page,
  }) => {
    const userEmail = AUTH_TEST_USERS.user.email;
    const userPassword = AUTH_TEST_USERS.user.password;

    // Step 1: login as regular user
    await page.goto("/login");
    await page.getByPlaceholder("Enter your email").fill(userEmail);
    await page.getByPlaceholder("Enter your password").fill(userPassword);
    await page.getByRole("button", { name: /^login$/i }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(
      page.getByRole("button", { name: /auth test user/i })
    ).toBeVisible();

    // Step 2: refresh the page and ensure session remains active
    await page.reload();
    await expect(page).toHaveURL(/\/$/);
    await expect(
      page.getByRole("button", { name: /auth test user/i })
    ).toBeVisible();

    // Step 3: open a product detail page and add it to the cart
    const moreDetailsButton = page
      .getByRole("button", { name: /more details/i })
      .first();
    await expect(moreDetailsButton).toBeVisible();
    await moreDetailsButton.click();
    await expect(page).toHaveURL(/\/product\//);
    await page
      .getByRole("button", { name: /^add to cart$/i })
      .first()
      .click();
    await expect(page.getByText(/item added to cart/i)).toBeVisible();

    // Step 4: visit cart to confirm the item and authenticated view
    await page.goto("/cart");
    await expect(page).toHaveURL(/\/cart$/);
    await expect(
      page.getByText(/You Have \d+ items in your cart/i)
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /cart summary/i })
    ).toBeVisible();

    // Step 5: attempt to access guarded register page while logged in
    await page.goto("/register");
    await expect(page).toHaveURL(/\/$/);

    // Step 6: logout from the header dropdown
    await page
      .getByRole("button", { name: /auth test user/i })
      .click();
    await page.getByRole("link", { name: /logout/i }).click();
    await expect(page).toHaveURL(/\/login$/);

    // Step 7: confirm cart shows guest messaging after logout
    await page.goto("/cart");
    await expect(page).toHaveURL(/\/cart$/);
    await expect(page.getByText(/hello guest/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /please login to checkout/i })
    ).toBeVisible();

    // Step 8: confirm register page is accessible again after logout
    await page.goto("/register");
    await expect(page).toHaveURL(/\/register$/);
    await expect(
      page.getByRole("heading", { name: /register form/i })
    ).toBeVisible();
  });
});
