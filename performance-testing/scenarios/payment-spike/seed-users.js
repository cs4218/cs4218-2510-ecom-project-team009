import mongoose from "mongoose";
import dotenv from "dotenv";
import userModel from "../../../models/userModel.js";
import { hashPassword } from "../../../helpers/authHelper.js";

dotenv.config();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URL);
    console.log(`> Connected to MongoDB: ${conn.connection.host}`);
  } catch (error) {
    console.error(`ERROR: MongoDB connection failed: ${error}`);
    process.exit(1);
  }
};

const seedPaymentSpikeUsers = async () => {
  try {
    console.log("\n> Starting payment spike test user seeding\n");

    const existingCount = await userModel.countDocuments({
      email: /^loadtest\./,
    });
    if (existingCount > 0) {
      console.log(
        `WARN: Found ${existingCount} existing loadtest users. Cleaning up first...`
      );
      await userModel.deleteMany({ email: /^loadtest\./ });
      console.log("DONE: Cleaned up existing loadtest users\n");
    }

    console.log("> Creating 100 payment spike test users");
    const password = "LoadTest@123";
    const hashedPassword = await hashPassword(password);
    const batchSize = 10;

    for (let i = 1; i <= 100; i++) {
      await userModel.create({
        name: `Load Test User ${i}`,
        email: `loadtest.user${i}@test.com`,
        password: hashedPassword,
        phone: `+6590${String(i).padStart(6, "0")}`,
        address: {
          street: `${i} Test Street`,
          city: "Singapore",
          state: "Singapore",
          zip: "123456",
        },
        answer: "loadtest",
        role: 0,
      });
      if (i % batchSize === 0)
        console.log(`ADD: Created users ${i - batchSize + 1} to ${i}`);
    }

    console.log("\nDONE: Payment spike test user seeding complete\n");
    console.log("INFO: Summary");
    console.log(`  Users created: 100`);
    console.log(
      `  Email: loadtest.user1@test.com to loadtest.user100@test.com`
    );
    console.log(`  Password: LoadTest@123\n`);
    process.exit(0);
  } catch (error) {
    console.error(`\nERROR: Failed to seed users: ${error.message}`);
    process.exit(1);
  }
};

connectDB().then(() => seedPaymentSpikeUsers());
