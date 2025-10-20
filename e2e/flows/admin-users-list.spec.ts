import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "../utils/auth-helpers";

test.describe("Admin view users flow", () => {
    test("Admin can view all user details", async ({
        page,
    }) => {
        await loginAsAdmin(page);

        await page.getByTestId("user-menu-button").click();
        await page.getByRole("link", { name: /Dashboard/i }).click();
        await page.waitForURL(/\/dashboard\/admin$/);

        await page.getByTestId("admin-users-link").click();
        await page.waitForURL(/\/dashboard\/admin\/users$/);

        await expect(page.getByText(/All Users/i)).toBeVisible();
        await expect(page.getByTestId("user-list-table")).toBeVisible();
        
        const count1 = await page.getByText("hello@test.com").count();
        expect(count1).toBeGreaterThan(0);
        const count2 = await page.getByText("test@gmail.com").count();
        expect(count2).toBeGreaterThan(0);
        
    });
});