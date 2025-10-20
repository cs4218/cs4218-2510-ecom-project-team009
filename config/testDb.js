import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import dotenv from "dotenv";

// Load test environment variables
dotenv.config();

let mongoServer;

// Setup test database before all tests
export const setupTestDB = async () => {
  try {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    // Connect mongoose to the in-memory database
    await mongoose.connect(mongoUri);
  } catch (error) {
    console.error("Test database setup failed:", error);
    throw error;
  }
};

// Clean up test database after all tests
export const teardownTestDB = async () => {
  try {
    await mongoose.connection.close();

    // Stop the in-memory MongoDB instance
    if (mongoServer) {
      await mongoServer.stop();
    }
  } catch (error) {
    console.error("Test database teardown failed:", error);
    throw error;
  }
};

// Clear all collections between tests
export const clearDatabase = async () => {
  try {
    const collections = mongoose.connection.collections;

    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
  } catch (error) {
    console.error("Failed to clear test database:", error);
    throw error;
  }
};

// Jest global setup and teardown
beforeAll(async () => {
  // Set JWT_SECRET for tests
  process.env.JWT_SECRET =
    process.env.JWT_SECRET || "test-jwt-secret-key-for-integration-tests";
  await setupTestDB();
});

afterAll(async () => {
  await teardownTestDB();
});

beforeEach(async () => {
  await clearDatabase();
});
