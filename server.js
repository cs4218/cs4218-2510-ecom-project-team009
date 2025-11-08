import express from "express";
import colors from "colors";
import dotenv from "dotenv";
import morgan from "morgan";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoute.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import userRoutes from "./routes/userRoute.js";
import cors from "cors";
import mongoose from "mongoose";
import productModel from "./models/productModel.js";
import categoryModel from "./models/categoryModel.js";

// configure env
dotenv.config();

// Create Express app instance
const app = express();

//middlewares
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

//routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/category", categoryRoutes);
app.use("/api/v1/product", productRoutes);
app.use("/api/v1/user", userRoutes);

// rest api
app.get("/", (req, res) => {
  res.send("<h1>Welcome to ecommerce app</h1>");
});

// Export app for testing
export default app;

// Only start server if this file is run directly (not imported for testing)
if (process.env.NODE_ENV !== "test") {
  //database config
  connectDB();

  const PORT = process.env.PORT || 6060;

  app.listen(PORT, () => {
    console.log(
      `Server running on ${process.env.DEV_MODE} mode on ${PORT}`.bgCyan.white
    );
  });
}

// Connect to database
connectDB();

// Sync indexes on startup (ONLY IN DEVELOPMENT)
if (process.env.NODE_ENV !== "production") {
  mongoose.connection.once("open", async () => {
    try {
      console.log("\n> Syncing database indexes...");
      await productModel.syncIndexes();
      await categoryModel.syncIndexes();
      console.log("✓ Indexes synced successfully\n");
    } catch (error) {
      console.error("Error syncing indexes:", error);
    }
  });
}
