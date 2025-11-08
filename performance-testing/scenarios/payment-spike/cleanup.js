import mongoose from "mongoose";
import dotenv from "dotenv";
import userModel from "../../../models/userModel.js";
import orderModel from "../../../models/orderModel.js";

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

const cleanupPaymentSpikeData = async () => {
  try {
    console.log("\n> Starting payment spike test cleanup\n");

    console.log("[1/3] Finding loadtest users...");
    const loadTestUsers = await userModel.find({ email: /^loadtest\./ });
    const loadTestUserIds = loadTestUsers.map((user) => user._id);
    console.log(`      Found ${loadTestUsers.length} loadtest users`);

    if (loadTestUsers.length === 0) {
      console.log("\nINFO: No loadtest users found. Nothing to cleanup.");
      process.exit(0);
    }

    console.log("\n[2/3] Deleting orders from loadtest users...");
    const orderDeleteResult = await orderModel.deleteMany({
      buyer: { $in: loadTestUserIds },
    });
    console.log(`      Deleted ${orderDeleteResult.deletedCount} orders`);

    console.log("\n[3/3] Deleting loadtest users...");
    const userDeleteResult = await userModel.deleteMany({
      email: /^loadtest\./,
    });
    console.log(`      Deleted ${userDeleteResult.deletedCount} users`);

    console.log("\nDONE: Cleanup complete!\n");
    process.exit(0);
  } catch (error) {
    console.error(`\nERROR: Failed to cleanup: ${error.message}`);
    process.exit(1);
  }
};

connectDB().then(() => cleanupPaymentSpikeData());
