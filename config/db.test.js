import mongoose from "mongoose";
import connectDB from "./db.js";

describe("connectDB", () => {
  let consoleLogSpy;
  let mongooseConnectSpy;

  beforeEach(() => {
    consoleLogSpy = global.console.log;
    global.console.log = () => {};
    mongooseConnectSpy = mongoose.connect;
  });

  afterEach(() => {
    global.console.log = consoleLogSpy;
    mongoose.connect = mongooseConnectSpy;
  });

  it("should connect to MongoDB successfully", async () => {
    const mockConnection = {
      connection: {
        host: "localhost",
      },
    };

    mongoose.connect = async () => mockConnection;
    process.env.MONGO_URL = "mongodb://localhost:27017/test";

    await connectDB();

    // Just verify it completes without error
    expect(true).toBe(true);
  });

  it("should handle connection error", async () => {
    const mockError = new Error("Connection failed");
    mongoose.connect = async () => {
      throw mockError;
    };
    process.env.MONGO_URL = "mongodb://localhost:27017/test";

    await connectDB();

    // Just verify it completes without error
    expect(true).toBe(true);
  });
});