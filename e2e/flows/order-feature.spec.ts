import { test, expect } from "@playwright/test";
import { loginAsUser, loginAsAdmin } from "../utils/auth-helpers";

test.describe("Order feature flow", () => {
    test("user can view order details", async ({
        page,
    }) => {
        await loginAsUser(page, "cs4218@test.com", "cs4218@test.com");

        await page.getByTestId("user-menu-button").click();
        await page.getByRole("link", { name: /Dashboard/i }).click();
        await page.waitForURL(/\/dashboard\/user$/);

        await page.getByTestId("user-menu-orders-link").click();

        await expect(page.getByText(/All Orders/i)).toBeVisible();

        await page.getByTestId("order-products-container").waitFor({ state: "visible", timeout: 10_000 });

        const count = await page.getByTestId("order-product").count();
        expect(count).toBe(3);
    });

    test("admin should see orders made by all users", async ({
        page,
    }) => {
        await loginAsAdmin(page);

        await page.getByTestId("user-menu-button").click();
        await page.getByRole("link", { name: /Dashboard/i }).click();
        await page.waitForURL(/\/dashboard\/admin$/);

        await page.getByTestId("admin-orders-link").click();

        await expect(page.getByText(/All Orders/i)).toBeVisible();

        await page.getByTestId("order-products-container").waitFor({ state: "visible", timeout: 10_000 });

        const count = await page.getByTestId("order-product").count();
        expect(count).toBe(3);
    });
});