import { test, expect } from "@playwright/test";
import { loginAsUser, logout } from "../utils/auth-helpers";

test.describe("Search feature", () => {
    test("Search feature should show relevant results", async ({
        page,
    }) => {
        await loginAsUser(page);

        const searchInput = page.getByTestId("search-input");
        await searchInput.fill("laptop");
        await page.getByTestId("search-button").click();
        
        await expect(page.getByText(/Search Results/i)).toBeVisible();
        const results = page.getByTestId("search-result-item");
        const count = await results.count();
        expect(count).toBe(1);
    });

    test("Search feature should show no results for irrelevant query", async ({
        page,
    }) => {
        await loginAsUser(page);

        const searchInput = page.getByTestId("search-input");
        await searchInput.fill("nonexistentproduct");
        await page.getByTestId("search-button").click();
        
        await expect(page.getByText(/Search Results/i)).toBeVisible();
        await expect(page.getByText(/No Products Found/i)).toBeVisible();
        const results = page.getByTestId("search-result-item");
        const count = await results.count();
        expect(count).toBe(0);
    });
});