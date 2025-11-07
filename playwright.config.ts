// playwright.config.ts
import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
dotenv.config();

export default defineConfig({
  testDir: "./e2e",
  testMatch: [
    "**/*.spec.ts", // Only include .spec.ts files
  ],
  timeout: 30_000,
  reporter: [["html"], ["list"]],
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  globalSetup: "./playwright.global-setup.ts",
  globalTeardown: "./playwright.global-teardown.ts",
  workers: 1,
  webServer: [
    {
      command: "npm run client",
      port: 3000,
      reuseExistingServer: true,
      env: {
        NODE_ENV: "e2e",
        PORT: "3000",
      },
    },
    {
      command: "npm run server",
      port: 6060,
      reuseExistingServer: true,
      env: {
        NODE_ENV: "e2e",
        DEV_MODE: "development",
        PORT: "6060",
        MONGO_URL:
          process.env.MONGO_URL || "mongodb://127.0.0.1:27017/ecom_e2e",
      },
    },
  ],
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
});
