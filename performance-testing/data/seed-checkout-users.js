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

// seed 200 checkout test users
const seedCheckoutUsers = async () => {
  try {
    console.log("\n> Starting checkout flow stress test user seeding\n");

    // Check if testuser users already exist
    const existingCount = await userModel.countDocuments({
      email: /^testuser\d+@example\.com$/,
    });

    if (existingCount > 0) {
      console.log(
        `WARN: Found ${existingCount} existing testuser accounts. Cleaning up first...`
      );
      await userModel.deleteMany({ email: /^testuser\d+@example\.com$/ });
      console.log("DONE: Cleaned up existing testuser accounts\n");
    }

    console.log("> Creating 200 checkout test users");
    const password = "password123";
    const hashedPassword = await hashPassword(password);

    const userIds = [];
    const batchSize = 10;

    for (let i = 1; i <= 200; i++) {
      const user = await userModel.create({
        name: `Test User ${i}`,
        email: `testuser${i}@example.com`,
        password: hashedPassword,
        phone: `+6598${String(i).padStart(6, "0")}`,
        address: `${i} Test Avenue, Singapore 123456`,
        answer: "checkout",
        role: 0, // Regular user
      });

      userIds.push(user._id);

      if (i % batchSize === 0) {
        console.log(`ADD: Created users ${i - batchSize + 1} to ${i}`);
      }
    }

    console.log("\nDONE: Checkout test user seeding complete\n");
    console.log("INFO: Summary");
    console.log(`  Users created: 200`);
    console.log(`  Email pattern: testuser1@example.com to testuser200@example.com`);
    console.log(`  Password (all): password123`);
    console.log(`  Pattern: testuser[1-200]@example.com (for easy cleanup)`);
    console.log("\n> Ready for checkout flow stress testing");
    console.log(
      `> Next steps:`
    );
    console.log(`  1. Ensure backend is running on port 8080`);
    console.log(`  2. Ensure test data is seeded: npm run seed-stress-test`);
    console.log(`  3. Run: ./performance-testing/scenarios/checkout-flow/run-stress-test.sh\n`);

    process.exit(0);
  } catch (error) {
    console.error(`\nERROR: Failed to seed checkout users: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
};

connectDB().then(() => seedCheckoutUsers());
