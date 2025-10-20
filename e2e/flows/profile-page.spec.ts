import { test, expect } from "@playwright/test";
import { loginAsUser, logout } from "../utils/auth-helpers";

test.describe("Profile page flow", () => {
    test("user can view profile details", async ({
        page,
    }) => {
        await loginAsUser(page);

        await page.getByTestId("user-menu-button").click();
        await page.getByRole("link", { name: /Dashboard/i }).click();
        await page.waitForURL(/\/dashboard\/user$/);

        await page.getByTestId("user-menu-profile-link").click();

        await expect(page.getByText(/User Profile/i)).toBeVisible();
        await expect(page.getByTestId("email-input")).toBeVisible();
        await expect(page.getByTestId("email-input")).toHaveValue("user@playwright.com");
    });

    test("user can update profile details", async ({
        page,
    }) => {
        await loginAsUser(page);

        await page.getByTestId("user-menu-button").click();
        await page.getByRole("link", { name: /Dashboard/i }).click();
        await page.waitForURL(/\/dashboard\/user$/);

        await page.getByTestId("user-menu-profile-link").click();

        await expect(page.getByText(/User Profile/i)).toBeVisible();

        const nameInput = page.getByTestId("name-input");
        const phoneInput = page.getByTestId("phone-input");
        const addressInput = page.getByTestId("address-input");
        await nameInput.fill("Updated User");
        await phoneInput.fill("123-456-7890");
        await addressInput.fill("123 Updated St, Update City, UP 12345");
        await page.getByTestId("update-profile-button").click();

        await expect(page.getByText(/Profile updated successfully/i)).toBeVisible();

        await expect(nameInput).toHaveValue("Updated User");
        await expect(phoneInput).toHaveValue("123-456-7890");
        await expect(addressInput).toHaveValue("123 Updated St, Update City, UP 12345");
    });
});