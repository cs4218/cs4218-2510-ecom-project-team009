import { GetNonAdminUsersController } from "./userController.js";
import userModel from "../models/userModel.js";

jest.mock("../models/userModel.js");

describe("UserController", () => {
  describe("GetNonAdminUsersController", () => {
    let req, res;

    beforeEach(() => {
      req = {};
      res = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };
      jest.clearAllMocks();
    });
    
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