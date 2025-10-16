import mongoose from "mongoose";
import dotenv from "dotenv";
import userModel from "./models/userModel.js";

dotenv.config();

const DEFAULT_MONGO_URL = "mongodb://127.0.0.1:27017/ecom_e2e";

export default async function globalTeardown() {
  const mongoUrl = process.env.MONGO_URL || DEFAULT_MONGO_URL;

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(mongoUrl);
  }

  await userModel.deleteMany({
    email: { $in: ["admin@playwright.com", "user@playwright.com"] },
  });

  await mongoose.connection.close();
}
