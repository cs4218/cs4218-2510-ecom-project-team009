import { jest } from "@jest/globals";

await jest.unstable_mockModule("jsonwebtoken", () => {
  const sign = jest.fn(() => "jwt-token");
  const verify = jest.fn(() => ({ _id: "123" }));
  return { default: { sign, verify }, sign, verify };
});

await jest.unstable_mockModule("../models/userModel.js", () => {
  const constructor = jest.fn(function (doc) {
    Object.assign(this, doc);
    this.save = jest.fn();
  });

  constructor.findOne = jest.fn(() => {
    return null;
  });

  constructor.findById = jest.fn(() => {
    return { _id: "123", role: 1 };
  });

  return { default: constructor };
});

const { default: JWT } = await import("jsonwebtoken");
const { default: userModel } = await import("../models/userModel.js");
const { requireSignIn, isAdmin } = await import(
  "../middlewares/authMiddleware.js"
);

describe("Auth Middleware", () => {
  let mockReq, mockRes;
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.clearAllMocks();

    process.env = { ...ORIGINAL_ENV };
    mockReq = { headers: { authorization: "Bearer test-token" } };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
      json: jest.fn(),
    };
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  describe("requireSignIn middleware", () => {
    it("should verify token and call next", async () => {
      process.env.JWT_SECRET = "test-secret";
      mockReq.headers.authorization = "Bearer test-token";
      const next = jest.fn();

      await requireSignIn(mockReq, mockRes, next);
      expect(JWT.verify).toHaveBeenCalledWith(
        "Bearer test-token",
        "test-secret"
      );
      expect(next).toHaveBeenCalled();
      expect(mockReq.user).toEqual({ _id: "123" });
    });

    it("should return 401 if the token is invalid", async () => {
      JWT.verify.mockImplementationOnce(() => {
        throw new Error("Invalid token");
      });
      const next = jest.fn();
      await requireSignIn(mockReq, mockRes, next);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: false,
        error: expect.any(Error),
        message: "Unauthorized Access",
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe("isAdmin middleware", () => {
    it("should call next if the user is an admin", async () => {
      mockReq.user = { _id: "123" };
      userModel.findById.mockResolvedValueOnce({ _id: "123", role: 1 });
      const next = jest.fn();
      await isAdmin(mockReq, mockRes, next);

      expect(userModel.findById).toHaveBeenCalledWith("123");
      expect(next).toHaveBeenCalled();
    });

    it("should return 401 if the user is not an admin", async () => {
      mockReq.user = { _id: "123" };
      userModel.findById.mockResolvedValueOnce({ _id: "123", role: 2 });
      const next = jest.fn();
      await isAdmin(mockReq, mockRes, next);

      expect(userModel.findById).toHaveBeenCalledWith("123");
      expect(next).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Unauthorized access",
      });
    });

    it("should return 401 if the user is null", async () => {
      mockReq.user = { _id: "123" };
      userModel.findById.mockResolvedValueOnce(null);
      const next = jest.fn();
      await isAdmin(mockReq, mockRes, next);

      expect(userModel.findById).toHaveBeenCalledWith("123");
      expect(next).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Unauthorized access",
      });
    });

    it("should return 500 if there is an error", async () => {
      mockReq.user = { _id: "123" };
      userModel.findById.mockRejectedValueOnce(new Error("db down"));
      const next = jest.fn();
      await isAdmin(mockReq, mockRes, next);

      expect(userModel.findById).toHaveBeenCalledWith("123");
      expect(next).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Error in admin middleware",
        error: expect.any(Error),
      });
    });
  });
});
