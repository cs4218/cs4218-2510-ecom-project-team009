import { jest } from "@jest/globals";

await jest.unstable_mockModule("../models/userModel.js", () => {
  const constructor = jest.fn(function (doc) {
    Object.assign(this, doc);
    this.save = jest.fn();
  });

  constructor.find = jest.fn(() => {
    return null;
  });

  return { default: constructor };
});

const { default: userModel } = await import("../models/userModel.js");
const { GetNonAdminUsersController } = await import("./userController.js");

describe("UserController", () => {
  let req, res;

  const originalImpl = userModel.getMockImplementation();

  beforeEach(() => {
    jest.clearAllMocks();

    userModel.mockImplementation(originalImpl);

    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
      json: jest.fn(),
    };
  });

  describe("GetNonAdminUsersController", () => {
    it("should attempt to return only non-admin users", async () => {
      const mockUsers = [
        { name: "User1", role: 0 },
        { name: "User2", role: 0 },
      ];
      userModel.find.mockResolvedValueOnce(mockUsers);

      await GetNonAdminUsersController(req, res);

      expect(userModel.find).toHaveBeenCalledWith({ role: 0 });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        message: "All non-admin users list",
        users: mockUsers,
      });
    });

    it("should handle errors and return 500", async () => {
      const error = new Error("DB Error");
      userModel.find.mockRejectedValueOnce(error);

      await GetNonAdminUsersController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        error,
        message: "Error getting all non-admin users",
      });
    });
  });
});