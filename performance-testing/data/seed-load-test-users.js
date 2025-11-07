import mongoose from "mongoose";
import dotenv from "dotenv";
import userModel from "../../models/userModel.js";
import { hashPassword } from "../../helpers/authHelper.js";

// load env vars
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

// seed 100 load test users
const seedLoadTestUsers = async () => {
  try {
    console.log("\n> Starting load test user seeding\n");

    // Check if loadtest users already exist
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

    console.log("> Creating 100 load test users");
    const password = "LoadTest@123";
    const hashedPassword = await hashPassword(password);

    const userIds = [];
    const batchSize = 10;

    for (let i = 1; i <= 100; i++) {
      const user = await userModel.create({
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
        role: 0, // Regular user
      });

      userIds.push(user._id);

      if (i % batchSize === 0) {
        console.log(`ADD: Created users ${i - batchSize + 1} to ${i}`);
      }
    }

    // Log any remaining users not in a complete batch
    if (100 % batchSize !== 0) {
      const remaining = 100 % batchSize;
      console.log(`ADD: Created users ${100 - remaining + 1} to 100`);
    }

    console.log("\nDONE: Load test user seeding complete\n");
    console.log("INFO: Summary");
    console.log(`  Users created: 100`);
    console.log(`  Email pattern: loadtest.user1@test.com to loadtest.user100@test.com`);
    console.log(`  Password (all): LoadTest@123`);
    console.log(`  Prefix: loadtest. (for easy cleanup)`);
    console.log("\n> Ready for load testing");
    console.log(
      `> Run: npm run run-load-test\n`
    );

    process.exit(0);
  } catch (error) {
    console.error(`\nERROR: Failed to seed load test users: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
};

connectDB().then(() => seedLoadTestUsers());
