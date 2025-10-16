import { test, expect } from "@playwright/test";

const uniqueEmail = () =>
  `playwright-flow1-${Date.now()}@example.com`.toLowerCase();

test.describe("Auth flows", () => {
  test("new user can register, login, hit guard, and logout", async ({
    page,
  }) => {
    const email = uniqueEmail();
    const password = "Password123!";
    const name = "Playwright Flow1";

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
});
