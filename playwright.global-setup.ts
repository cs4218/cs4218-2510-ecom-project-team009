import mongoose from "mongoose";
import dotenv from "dotenv";
import userModel from "./models/userModel.js";
import { hashPassword } from "./helpers/authHelper.js";

dotenv.config();

const DEFAULT_MONGO_URL = "mongodb://127.0.0.1:27017/ecom_e2e";

type SeedUser = {
  name: string;
  email: string;
  password: string;
  phone: string;
  address: string;
  answer: string;
  role: 0 | 1;
};

async function upsertUser(seed: SeedUser): Promise<void> {
  const hashed = await hashPassword(seed.password);
  const existing = await userModel.findOne({ email: seed.email });
  if (existing) {
    existing.set({
      name: seed.name,
      phone: seed.phone,
      address: seed.address,
      answer: seed.answer,
      role: seed.role,
      password: hashed,
    });
    await existing.save();
  } else {
    await userModel.create({
      name: seed.name,
      email: seed.email,
      phone: seed.phone,
      address: seed.address,
      answer: seed.answer,
      role: seed.role,
      password: hashed,
    });
  }
}

export default async function globalSetup() {
  const mongoUrl = process.env.MONGO_URL || DEFAULT_MONGO_URL;
  await mongoose.connect(mongoUrl);

  const adminUser: SeedUser = {
    name: "Admin User (Playwright)",
    email: "admin@playwright.com",
    password: "AdminPass123!",
    phone: "9876543210",
    address: "1 Admin Way",
    answer: "admin-answer",
    role: 1,
  };

  const regularUser: SeedUser = {
    name: "Regular User (Playwright)",
    email: "user@playwright.com",
    password: "UserPass123!",
    phone: "1234567890",
    address: "1 User Way",
    answer: "user-answer",
    role: 0,
  };

  await upsertUser(adminUser);
  await upsertUser(regularUser);
}
