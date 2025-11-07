import mongoose from "mongoose";
import dotenv from "dotenv";
import userModel from "../../../models/userModel.js";
import orderModel from "../../../models/orderModel.js";

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

// cleanup load test data
const cleanupLoadTestData = async () => {
  try {
    console.log("\n> Starting load test cleanup\n");

    // Step 1: Find all loadtest users
    console.log("[1/4] Finding loadtest users...");
    const loadTestUsers = await userModel.find({ email: /^loadtest\./ });
    const loadTestUserIds = loadTestUsers.map((user) => user._id);
    console.log(`      Found ${loadTestUsers.length} loadtest users`);

    if (loadTestUsers.length === 0) {
      console.log("\nINFO: No loadtest users found. Nothing to cleanup.");
      process.exit(0);
    }

    // Step 2: Delete orders created by loadtest users
    console.log("\n[2/4] Deleting orders from loadtest users...");
    const orderDeleteResult = await orderModel.deleteMany({
      buyer: { $in: loadTestUserIds },
    });
    console.log(`      Deleted ${orderDeleteResult.deletedCount} orders`);

    // Step 3: Delete loadtest users
    console.log("\n[3/4] Deleting loadtest users...");
    const userDeleteResult = await userModel.deleteMany({
      email: /^loadtest\./,
    });
    console.log(`      Deleted ${userDeleteResult.deletedCount} users`);

    // Step 4: Summary
    const timestamp = new Date().toISOString().replace("T", " ").substring(0, 19);
    console.log("\n[4/4] Cleanup Summary:");
    console.log(`      Timestamp: ${timestamp}`);
    console.log(`      Orders deleted: ${orderDeleteResult.deletedCount}`);
    console.log(`      Users deleted: ${userDeleteResult.deletedCount}`);

    console.log("\nDONE: Cleanup complete! All load test data removed.\n");

    process.exit(0);
  } catch (error) {
    console.error(`\nERROR: Failed to cleanup load test data: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
};

connectDB().then(() => cleanupLoadTestData());
