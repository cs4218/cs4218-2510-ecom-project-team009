import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

let mongoServer;

// Setup test database before all tests
export const setupTestDB = async () => {
  try {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    // Connect mongoose to the in-memory database
    await mongoose.connect(mongoUri);
    console.log("Test database connected");
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
    console.log("Test database disconnected");
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
    console.log("Test database cleared");
  } catch (error) {
    console.error("Failed to clear test database:", error);
    throw error;
  }
};

// Jest global setup and teardown
beforeAll(async () => {
  await setupTestDB();
});

afterAll(async () => {
  await teardownTestDB();
});

beforeEach(async () => {
  await clearDatabase();
});
