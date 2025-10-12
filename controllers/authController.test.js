import { jest } from "@jest/globals";
import { mock } from "node:test";
await jest.unstable_mockModule("../helpers/authHelper.js", () => ({
  hashPassword: jest.fn(async () => "hashed"),
  comparePassword: jest.fn(),
}));

await jest.unstable_mockModule("jsonwebtoken", () => {
  const sign = jest.fn(() => "jwt-token");
  return { default: { sign }, sign };
});

await jest.unstable_mockModule("../models/userModel.js", () => {
  const constructor = jest.fn(function (doc) {
    Object.assign(this, doc);
    this.save = jest.fn();
  });

  constructor.findOne = jest.fn(() => {
    return null;
  });

  return { default: constructor };
});

await jest.unstable_mockModule("../models/orderModel.js", () => {
  const orderModel = {
    find: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  };
  return { default: orderModel };
});

const { hashPassword, comparePassword } = await import(
  "../helpers/authHelper.js"
);
const { default: JWT } = await import("jsonwebtoken");
const { default: userModel } = await import("../models/userModel.js");
const { default: orderModel } = await import("../models/orderModel.js");
const {
  registerController,
  loginController,
  forgotPasswordController,
  updateProfileController,
  getOrdersController,
  getAllOrdersController,
  orderStatusController,
} = await import("./authController.js");

describe("Auth Controller", () => {
  let mockReq, mockRes;

  const originalImpl = userModel.getMockImplementation();

  beforeEach(() => {
    jest.clearAllMocks();

    // restore the default constructor
    userModel.mockImplementation(originalImpl);

    // Common mock setup
    mockReq = {};
    mockRes = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
      json: jest.fn(),
    };
  });

  // ============================================================================
  // REGISTER CONTROLLER TESTS
  // ============================================================================
  describe("Register Controller", () => {
    describe("Input Validations", () => {
      // Concept: dec table
      const validationTests = [
        {
          missingField: "name",
          expectedMessage: "Name is Required",
        },
        {
          missingField: "email",
          expectedMessage: "Email is Required",
        },
        {
          missingField: "password",
          expectedMessage: "Password is Required",
        },
        {
          missingField: "phone",
          expectedMessage: "Phone no is Required",
        },
        {
          missingField: "address",
          expectedMessage: "Address is Required",
        },
        {
          missingField: "answer",
          expectedMessage: "Answer is Required",
        },
      ];

      validationTests.forEach(({ missingField, expectedMessage }) => {
        it(`should return an error if the ${missingField} is not provided`, async () => {
          mockReq.body = {
            name: "Jm San Diego",
            email: "jmsandiego@example.com",
            password: "password123",
            phone: "1234567890",
            address: "123 Street",
            answer: "Bowling",
            [missingField]: undefined,
          };

          await registerController(mockReq, mockRes);

          expect(mockRes.send).toHaveBeenCalledWith({
            message: expectedMessage,
          });
        });
      });
    });

    //Test successful registration
    it("returns 201 and success when user is not already registered", async () => {
      // Arrange
      userModel.findOne = jest.fn().mockResolvedValueOnce(null);
      userModel.mockImplementation(function (doc) {
        Object.assign(this, doc);
        this.save = jest.fn().mockResolvedValue({ _id: "u1", ...doc });
      });

      mockReq.body = {
        name: "Jm San Diego",
        email: "jmsandiego@example.com",
        password: "password123",
        phone: "1234567890",
        address: "123 Street",
        answer: "Bowling",
      };

      // Act
      await registerController(mockReq, mockRes);

      // Assert (only what the client observes)
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "User Register Successfully",
          user: expect.any(Object),
        })
      );
    });

    it("returns 409 and duplicate message when email already exists", async () => {
      userModel.findOne = jest.fn().mockResolvedValueOnce({ _id: "u1" });
      mockReq.body = {
        name: "JM",
        email: "jmsandiego@example.com",
        password: "password123",
        phone: "1234567890",
        address: "123 Street",
        answer: "Bowling",
      };

      await registerController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Already existing user please login",
      });
    });

    it("returns 500 when saving the user fails", async () => {
      // Arrange: user not found so flow reaches save()
      userModel.findOne = jest.fn().mockResolvedValueOnce(null);

      // Override constructor only for this test; make save reject
      userModel.mockImplementation(function (doc) {
        Object.assign(this, doc);
        this.save = jest.fn().mockRejectedValue(new Error("db down"));
      });

      mockReq.body = {
        name: "Jm San Diego",
        email: "jmsandiego@example.com",
        password: "password123",
        phone: "1234567890",
        address: "123 Street",
        answer: "Bowling",
      };

      // Act
      await registerController(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Error in Registeration",
          // error shape can vary; just ensure it's present
          error: expect.anything(),
        })
      );
    });
  });

  // ============================================================================
  // LOGIN CONTROLLER TESTS
  // ============================================================================
  describe("Login Controller", () => {
    const ORIGINAL_ENV = process.env;

    beforeEach(() => {
      process.env = { ...ORIGINAL_ENV };
    });

    afterEach(() => {
      process.env = ORIGINAL_ENV;
    });

    describe("Input Validations", () => {
      // Concept: equiv part.
      const validationTests = [
        {
          missingField: "email",
          expectedMessage: "Invalid email or password",
        },
        {
          missingField: "password",
          expectedMessage: "Invalid email or password",
        },
        {
          missingField: ["email", "password"],
          expectedMessage: "Invalid email or password",
        },
      ];

      validationTests.forEach(({ missingField, expectedMessage }) => {
        it(`should return an error if the ${missingField} is not provided`, async () => {
          mockReq.body = Array.isArray(missingField)
            ? Object.fromEntries(
                missingField.map((field) => [field, undefined])
              )
            : {
                [missingField]: undefined,
              };

          await loginController(mockReq, mockRes);

          expect(mockRes.status).toHaveBeenCalledWith(404);
          expect(mockRes.send).toHaveBeenCalledWith({
            success: false,
            message: expectedMessage,
          });
        });
      });
    });

    it("should return 404 and 'Email is not registerd' when user does not exist", async () => {
      // Arrange
      userModel.findOne = jest.fn().mockResolvedValueOnce(null);
      mockReq.body = {
        email: "jmsandiego@example.com",
        password: "password123",
      };

      // Act
      await loginController(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Email is not registerd",
      });
    });

    it("returns 401 and 'Invalid Password' when password is incorrect", async () => {
      // Arrange
      userModel.findOne = jest.fn().mockResolvedValueOnce({
        _id: "u1",
        email: "jmsandiego@example.com",
        password: "password123",
      });
      comparePassword.mockResolvedValueOnce(false);

      mockReq.body = {
        email: "jmsandiego@example.com",
        password: "password123",
      };

      // Act
      await loginController(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Invalid Password",
      });
    });

    it("should return 500 and 'Error in login' when there is a server error", async () => {
      // Arrange
      userModel.findOne = jest.fn().mockResolvedValueOnce({
        _id: "u1",
        email: "jmsandiego@example.com",
        password: "password123",
      });
      comparePassword.mockRejectedValueOnce(
        new Error("comparePassword unexpected error")
      );

      mockReq.body = {
        email: "jmsandiego@example.com",
        password: "password123",
      };

      // Act
      await loginController(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Error in login",
        error: expect.anything(),
      });
    });

    it("returns 200 with token and sanitized user when credentials are valid", async () => {
      process.env.JWT_SECRET = "test-secret";
      userModel.findOne = jest.fn().mockResolvedValueOnce({
        _id: "u1",
        name: "JM",
        email: "jmsandiego@example.com",
        phone: "1234567890",
        address: "123 Street",
        role: 0,
        password: "hashed",
      });
      comparePassword.mockResolvedValueOnce(true);
      mockReq.body = {
        email: "jmsandiego@example.com",
        password: "password123",
      };

      await loginController(mockReq, mockRes);

      expect(userModel.findOne).toHaveBeenCalledWith({
        email: "jmsandiego@example.com",
      });
      expect(comparePassword).toHaveBeenCalledWith("password123", "hashed");
      expect(JWT.sign).toHaveBeenCalledWith({ _id: "u1" }, "test-secret", {
        expiresIn: "7d",
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "login successfully",
          token: "jwt-token",
          user: expect.objectContaining({
            _id: "u1",
            name: "JM",
            email: "jmsandiego@example.com",
            phone: "1234567890",
            address: "123 Street",
            role: 0,
          }),
        })
      );
    });
  });

  // ============================================================================
  // FORGOT PASSWORD CONTROLLER TESTS
  // ============================================================================
  describe("Forgot Password Controller", () => {
    describe("Input Validations", () => {
      const validationTests = [
        {
          missingField: "email",
          expectedMessage: "Email is required",
        },
        {
          missingField: "answer",
          expectedMessage: "Answer is required",
        },
        {
          missingField: "newPassword",
          expectedMessage: "New password is required",
        },
      ];

      validationTests.forEach(({ missingField, expectedMessage }) => {
        it(`should return an error and status 400 if the ${missingField} is not provided`, async () => {
          mockReq.body = {
            email: "jmsandiego@example.com",
            answer: "Bowling",
            newPassword: "newpassword123",
            [missingField]: undefined,
          };

          await forgotPasswordController(mockReq, mockRes);

          expect(mockRes.status).toHaveBeenCalledWith(400);
          expect(mockRes.send).toHaveBeenCalledWith({
            message: expectedMessage,
          });
        });
      });
    });

    it("should return 404 and 'Wrong email or answer' when user does not exist", async () => {
      // Arrange
      userModel.findOne = jest.fn().mockResolvedValueOnce(null);
      mockReq.body = {
        email: "jmsandiego@example.com",
        answer: "Bowling",
        newPassword: "newpassword123",
      };

      // Act
      await forgotPasswordController(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Wrong email or answer",
      });
    });

    it("should return 500 and 'Something went wrong' when there is a server error", async () => {
      // Arrange
      userModel.findOne = jest.fn().mockResolvedValueOnce({
        _id: "u1",
        email: "jmsandiego@example.com",
        answer: "Bowling",
      });

      mockReq.body = {
        email: "jmsandiego@example.com",
        answer: "Bowling",
        newPassword: "newpassword123",
      };
      hashPassword.mockRejectedValueOnce(
        new Error("comparePassword unexpected error")
      );

      // Act
      await forgotPasswordController(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Something went wrong",
        error: expect.anything(),
      });
    });

    it("returns 200 and updates the password when data is valid", async () => {
      userModel.findOne = jest.fn().mockResolvedValueOnce({
        _id: "u1",
        email: "jmsandiego@example.com",
        answer: "Bowling",
      });
      userModel.findByIdAndUpdate = jest.fn();
      hashPassword.mockResolvedValueOnce("hashed-new-password");

      mockReq.body = {
        email: "jmsandiego@example.com",
        answer: "Bowling",
        newPassword: "newpassword123",
      };

      await forgotPasswordController(mockReq, mockRes);

      expect(hashPassword).toHaveBeenCalledWith("newpassword123");
      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith("u1", {
        password: "hashed-new-password",
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: true,
        message: "Password reset successfully",
      });
    });
  });

  // ============================================================================
  // UPDATE PROFILE CONTROLLER TESTS
  // ============================================================================
  describe("Update Profile Controller", () => {
    beforeEach(() => {
      mockReq.body = {
        name: "JM",
        password: "password123",
        phone: "1234567890",
        address: "123 Street",
      };

      mockReq.user = { _id: "u1" };

      userModel.findById = jest.fn().mockResolvedValue({
        _id: "u1",
        name: "JM",
        password: "stored-hash",
        phone: "1234567890",
        address: "123 Street",
      });
      userModel.findByIdAndUpdate = jest.fn();
    });

    //Boundary value analysis: 0 <= pw, 1 <= pw <= 6, pw >= 7
    //Boundary values: 0, 1, 2, 5, 6, 7, 8
    it("updates profile excluding password when no password is input", async () => {
      mockReq.body.address = "different address";
      const updatedDoc = { ...mockReq.body, password: "stored-hash" };
      delete mockReq.body.password;

      userModel.findByIdAndUpdate.mockResolvedValueOnce(updatedDoc);

      await updateProfileController(mockReq, mockRes);

      expect(hashPassword).not.toHaveBeenCalled();
      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockReq.user._id,
        updatedDoc,
        { new: true }
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: true,
        message: "Profile updated successfully",
        updatedUser: updatedDoc,
      });
    });

    it("returns validation error when new password is length 1", async () => {
      mockReq.body.password = "1";

      await updateProfileController(mockReq, mockRes);

      expect(userModel.findById).toHaveBeenCalledWith(mockReq.user._id);
      expect(hashPassword).not.toHaveBeenCalled();
      expect(userModel.findByIdAndUpdate).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(422);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Password is required and 6 character long",
      });
    });

    it("returns validation error when new password is length 2", async () => {
      mockReq.body.password = "12";

      await updateProfileController(mockReq, mockRes);

      expect(userModel.findById).toHaveBeenCalledWith(mockReq.user._id);
      expect(hashPassword).not.toHaveBeenCalled();
      expect(userModel.findByIdAndUpdate).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(422);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Password is required and 6 character long",
      });
    });

    it("returns validation error when new password is length 5", async () => {
      mockReq.body.password = "12345";

      await updateProfileController(mockReq, mockRes);

      expect(userModel.findById).toHaveBeenCalledWith(mockReq.user._id);
      expect(hashPassword).not.toHaveBeenCalled();
      expect(userModel.findByIdAndUpdate).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(422);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Password is required and 6 character long",
      });
    });

    it("successfully updates password when new password length is 7", async () => {
      hashPassword.mockResolvedValueOnce("hashed-new-password");
      mockReq.body.password = "1234567";

      const updatedDoc = { ...mockReq.body, password: "hashed-new-password" };
      userModel.findByIdAndUpdate.mockResolvedValueOnce(updatedDoc);

      await updateProfileController(mockReq, mockRes);

      expect(hashPassword).toHaveBeenCalledWith(mockReq.body.password);
      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockReq.user._id,
        updatedDoc,
        { new: true }
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: true,
        message: "Profile updated successfully",
        updatedUser: updatedDoc,
      });
    });

    it("successfully updates password when new password length is 8", async () => {
      hashPassword.mockResolvedValueOnce("hashed-new-password");
      mockReq.body.password = "12345678";

      const updatedDoc = { ...mockReq.body, password: "hashed-new-password" };
      userModel.findByIdAndUpdate.mockResolvedValueOnce(updatedDoc);

      await updateProfileController(mockReq, mockRes);

      expect(hashPassword).toHaveBeenCalledWith(mockReq.body.password);
      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockReq.user._id,
        updatedDoc,
        { new: true }
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: true,
        message: "Profile updated successfully",
        updatedUser: updatedDoc,
      });
    });

    it("keeps existing profile fields when no updates are provided", async () => {
      mockReq.body = {};

      const currentUser = {
        _id: "u1",
        name: "Existing",
        password: "stored-hash",
        phone: "1234567890",
        address: "123 Street",
      };
      userModel.findById.mockResolvedValueOnce(currentUser);
      const updatedDoc = { ...currentUser };
      userModel.findByIdAndUpdate.mockResolvedValueOnce(updatedDoc);

      await updateProfileController(mockReq, mockRes);

      expect(hashPassword).not.toHaveBeenCalled();
      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
        currentUser._id,
        {
          name: "Existing",
          password: "stored-hash",
          phone: "1234567890",
          address: "123 Street",
        },
        { new: true }
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: true,
        message: "Profile updated successfully",
        updatedUser: updatedDoc,
      });
    });

    it("returns 500 when fetching or updating the user fails", async () => {
      userModel.findById.mockRejectedValueOnce(new Error("db down"));
      mockReq.body = {};

      await updateProfileController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Error while updating profile",
        error: expect.anything(),
      });
    });
  });

  // ============================================================================
  // GET ORDERS CONTROLLER TESTS
  // ============================================================================
  describe("Get Orders Controller", () => {
    beforeEach(() => {
      mockReq.user = { _id: "buyer-1" };
      orderModel.find.mockReset();
    });

    it("returns buyer's orders with products and buyer fields populated", async () => {
      const orders = [{ _id: "o1" }];

      const secondPopulate = jest.fn().mockReturnValue(Promise.resolve(orders));
      const firstPopulate = jest.fn().mockReturnValue({
        populate: secondPopulate,
      });
      orderModel.find.mockReturnValue({ populate: firstPopulate });

      await getOrdersController(mockReq, mockRes);

      expect(orderModel.find).toHaveBeenCalledWith({ buyer: mockReq.user._id });
      expect(firstPopulate).toHaveBeenCalledWith("products", "-photo");
      expect(secondPopulate).toHaveBeenCalledWith("buyer", "name");
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: true,
        message: "Orders fetched successfully",
        orders,
      });
    });

    it("returns empty orders array when no orders are found", async () => {
      const orders = [];
      const secondPopulate = jest.fn().mockReturnValue(Promise.resolve(orders));
      const firstPopulate = jest.fn().mockReturnValue({
        populate: secondPopulate,
      });
      orderModel.find.mockReturnValue({ populate: firstPopulate });

      await getOrdersController(mockReq, mockRes);

      expect(orderModel.find).toHaveBeenCalledWith({ buyer: mockReq.user._id });
      expect(firstPopulate).toHaveBeenCalledWith("products", "-photo");
      expect(secondPopulate).toHaveBeenCalledWith("buyer", "name");
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: true,
        message: "Orders fetched successfully",
        orders,
      });
    });

    it("returns 500 when fetching orders fails", async () => {
      orderModel.find.mockImplementation(() => {
        throw new Error("db down");
      });

      await getOrdersController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Error while getting orders",
        error: expect.anything(),
      });
    });
  });

  // ============================================================================
  // GET ALL ORDERS CONTROLLER TESTS
  // ============================================================================
  describe("Get All Orders Controller", () => {
    beforeEach(() => {
      orderModel.find.mockReset();
    });

    it("returns every order with products and buyer populated and sorted descending", async () => {
      const orders = [{ _id: "o1" }];
      const sort = jest.fn().mockResolvedValue(orders);
      const secondPopulate = jest.fn().mockReturnValue({ sort });
      const firstPopulate = jest.fn().mockReturnValue({
        populate: secondPopulate,
      });
      orderModel.find.mockReturnValue({ populate: firstPopulate });

      await getAllOrdersController(mockReq, mockRes);

      expect(orderModel.find).toHaveBeenCalledWith({});
      expect(firstPopulate).toHaveBeenCalledWith("products", "-photo");
      expect(secondPopulate).toHaveBeenCalledWith("buyer", "name");
      expect(sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: true,
        message: "Orders fetched successfully",
        orders,
      });
    });

    it("returns empty orders array when no orders are found", async () => {
      const orders = [];
      const sort = jest.fn().mockResolvedValue(orders);
      const secondPopulate = jest.fn().mockReturnValue({ sort });
      const firstPopulate = jest.fn().mockReturnValue({
        populate: secondPopulate,
      });
      orderModel.find.mockReturnValue({ populate: firstPopulate });

      await getAllOrdersController(mockReq, mockRes);

      expect(orderModel.find).toHaveBeenCalledWith({});
      expect(firstPopulate).toHaveBeenCalledWith("products", "-photo");
      expect(secondPopulate).toHaveBeenCalledWith("buyer", "name");
      expect(sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: true,
        message: "Orders fetched successfully",
        orders,
      });
    });

    it("returns 500 when fetching all orders fails", async () => {
      orderModel.find.mockImplementation(() => {
        throw new Error("db down");
      });

      await getAllOrdersController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Error while getting orders",
        error: expect.anything(),
      });
    });
  });

  // ============================================================================
  // ORDER STATUS CONTROLLER TESTS
  // ============================================================================
  describe("Order Status Controller", () => {
    beforeEach(() => {
      mockReq.params = { orderId: "order-1" };
      mockReq.body = { status: "shipped" };
      orderModel.findByIdAndUpdate.mockReset();
    });

    it("updates status and returns the updated order", async () => {
      const updatedOrder = { _id: "order-1", status: "shipped" };
      orderModel.findByIdAndUpdate.mockResolvedValueOnce(updatedOrder);

      await orderStatusController(mockReq, mockRes);

      expect(orderModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockReq.params.orderId,
        { status: updatedOrder.status },
        { new: true }
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: true,
        message: "Order updated successfully",
        orders: updatedOrder,
      });
    });

    it("returns 404 if no order is found", async () => {
      orderModel.findByIdAndUpdate.mockResolvedValueOnce(null);

      await orderStatusController(mockReq, mockRes);

      expect(orderModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockReq.params.orderId,
        { status: mockReq.body.status },
        { new: true }
      );
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Order not found",
      });
    });

    it("returns 500 when the update fails", async () => {
      orderModel.findByIdAndUpdate.mockRejectedValueOnce(new Error("db down"));

      await orderStatusController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Error while updating order",
        error: expect.anything(),
      });
    });
  });
});
