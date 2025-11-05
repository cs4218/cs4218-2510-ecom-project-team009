import type { Page } from "@playwright/test";
import mongoose from "mongoose";
import userModel from "../../models/userModel.js";
import { hashPassword } from "../../helpers/authHelper.js";

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByPlaceholder("Enter your email").fill(email);
  await page.getByPlaceholder("Enter your password").fill(password);

  await Promise.all([
    page.waitForURL(/\/$/, { timeout: 60000 }),
    page.waitForLoadState('networkidle'),
    page.getByRole("button", { name: /^login$/i }).click()
  ]);
}

export async function loginAsUser(page: Page, userEmail: string = "user@playwright.com", userPassword: string = "UserPass123!") {
  await login(page, userEmail, userPassword);
}

export async function loginAsAdmin(page: Page, adminEmail: string = "admin@playwright.com", adminPassword: string = "AdminPass123!") {
  await login(page, adminEmail, adminPassword);
}

export async function logout(page: Page, userName?: string) {
  let dropdown;
  if (userName) {
    dropdown = page.getByRole("button", { name: new RegExp(userName, "i") });
  } else {
    dropdown = page.getByRole("button", { name: /\(playwright\)/i });
  }
  await dropdown.click();
  await page.getByRole("link", { name: /logout/i }).click();
  await page.waitForURL(/\/login$/);
}

export async function createTestUser(userData: {
  name: string;
  email: string;
  password: string;
  phone: string;
  address: string;
  answer: string;
  role: 0 | 1;
}) {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URL || "mongodb://127.0.0.1:27017/ecom_e2e");
  }

  const hashedPassword = await hashPassword(userData.password);

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

export async function deleteTestUser(email: string) {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URL || "mongodb://127.0.0.1:27017/ecom_e2e");
  }

  await userModel.deleteOne({ email });
}