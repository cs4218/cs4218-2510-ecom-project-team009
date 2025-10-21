import { jest } from "@jest/globals";
import {
  registerController,
  loginController,
  forgotPasswordController,
  getOrdersController,
  getAllOrdersController,
  orderStatusController,
} from "./authController.js";
import mongoose from "mongoose";
import userModel from "../models/userModel.js";
import orderModel from "../models/orderModel.js";
import productModel from "../models/productModel.js";
import { hashPassword, comparePassword } from "../helpers/authHelper.js";

const buildMockReq = (body = {}) => ({ body });

const buildMockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};

const clonePayload = (payload, overrides = {}) => ({ ...payload, ...overrides });

const omitField = (payload, field) => {
  const { [field]: _omitted, ...rest } = payload;
  return rest;
};

const seedUser = async (payload) => {
  const hashedPassword = await hashPassword(payload.password);
  return userModel.create({ ...payload, password: hashedPassword });
};

const seedUserAndOrder = async (userPayload, orders) => {
  const user = await seedUser(userPayload);
  const seededProduct = await productModel.create({
    name: "Sample Product",
    slug: "sample-product",
    description: "This is a sample product for testing.",
    price: 199.99,
    category: new mongoose.Types.ObjectId(),
    quantity: 10,
    shipping: true,
  });

  const enrichedOrders = orders.map((order) => ({
    ...order,
    products: [seededProduct._id],
    buyer: user._id,
  }));
  const newOrders = await orderModel.insertMany(enrichedOrders);
  return { user, orders: newOrders };
};

const REGISTER_VALID = Object.freeze({
  name: "Test User",
  email: "test@example.com",
  password: "password123",
  phone: "1234567890",
  address: "123 Test St",
  answer: "test answer",
});

const REGISTER_EXISTING = Object.freeze({
  ...REGISTER_VALID,
  name: "Existing User",
  email: "existing@example.com",
});

const REGISTER_DUPLICATE_ATTEMPT = Object.freeze({
  name: "New User",
  email: REGISTER_EXISTING.email,
  password: "newpassword123",
  phone: "0987654321",
  address: "456 New St",
  answer: "new answer",
});

const LOGIN_USER = Object.freeze({
  ...REGISTER_VALID,
});

const FORGOT_PASSWORD_USER = Object.freeze({
  ...REGISTER_VALID,
  password: "oldPassword123",
});

const FORGOT_WRONG_ANSWER_USER = Object.freeze({
  ...REGISTER_VALID,
  answer: "correct answer",
});

const sampleOrders = [
  {
    products: [],
    buyer: "",
    payment: { method: "card" },
    status: "Processing",
  },
  {
    products: [],
    buyer: "",
    payment: { method: "paypal" },
    status: "deliverd",
  },
  {
    products: [],
    buyer: "",
    payment: { method: "cash" },
    status: "Shipped",
  },
];

describe("Auth Controller Integration (register, login, forgot-password)", () => {
  beforeAll(() => {
    process.env.NODE_ENV = "test";
  });

  describe("registerController", () => {
    it("registers a new user with hashed password", async () => {
      const res = buildMockRes();

      await registerController(buildMockReq(clonePayload(REGISTER_VALID)), res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "User Register Successfully",
          user: expect.objectContaining({
            name: REGISTER_VALID.name,
            email: REGISTER_VALID.email,
            phone: REGISTER_VALID.phone,
            address: REGISTER_VALID.address,
            answer: REGISTER_VALID.answer,
          }),
        })
      );

      const savedUser = await userModel.findOne({ email: REGISTER_VALID.email });
      expect(savedUser).toBeTruthy();
      expect(savedUser.password).not.toBe(REGISTER_VALID.password);
      expect(
        await comparePassword(REGISTER_VALID.password, savedUser.password)
      ).toBe(true);
    });

    it("rejects duplicate registrations on the same email", async () => {
      await seedUser(clonePayload(REGISTER_EXISTING));

      const res = buildMockRes();

      await registerController(
        buildMockReq(clonePayload(REGISTER_DUPLICATE_ATTEMPT)),
        res
      );

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Already existing user please login",
      });

      const users = await userModel.find({ email: REGISTER_EXISTING.email });
      expect(users).toHaveLength(1);
      expect(users[0].name).toBe(REGISTER_EXISTING.name);
    });

    const registerValidationCases = [
      { field: "name", message: "Name is Required" },
      { field: "email", message: "Email is Required" },
      { field: "password", message: "Password is Required" },
      { field: "phone", message: "Phone no is Required" },
      { field: "address", message: "Address is Required" },
      { field: "answer", message: "Answer is Required" },
    ];

    registerValidationCases.forEach(({ field, message }) => {
      it(`returns 400 when ${field} is missing`, async () => {
        const invalidPayload = omitField(clonePayload(REGISTER_VALID), field);
        const res = buildMockRes();

        await registerController(buildMockReq(invalidPayload), res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({ message });
        expect(await userModel.countDocuments()).toBe(0);
      });
    });
  });

  describe("loginController", () => {
    it("logs in successfully with valid credentials", async () => {
      const savedUser = await seedUser(clonePayload(LOGIN_USER));
      const loginPayload = {
        email: LOGIN_USER.email,
        password: LOGIN_USER.password,
      };

      const res = buildMockRes();

      await loginController(buildMockReq(loginPayload), res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Login successfully",
          token: expect.any(String),
          user: expect.objectContaining({
            _id: savedUser._id,
            name: LOGIN_USER.name,
            email: LOGIN_USER.email,
            phone: LOGIN_USER.phone,
            address: LOGIN_USER.address,
            role: savedUser.role,
          }),
        })
      );
    });

    it("returns 404 when email does not exist", async () => {
      const res = buildMockRes();

      await loginController(
        buildMockReq({ email: "invalid@example.com", password: "password123" }),
        res
      );

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Email is not registerd",
      });
      expect(await userModel.findOne({ email: "invalid@example.com" })).toBeNull();
    });

    it("returns 401 when password is incorrect", async () => {
      await seedUser(clonePayload(LOGIN_USER));

      const res = buildMockRes();

      await loginController(
        buildMockReq({ email: LOGIN_USER.email, password: "wrongpassword" }),
        res
      );

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Invalid Password",
      });

      const user = await userModel.findOne({ email: LOGIN_USER.email });
      expect(user).toBeTruthy();
      expect(
        await comparePassword(LOGIN_USER.password, user.password)
      ).toBe(true);
    });

    it("returns 404 when password is missing", async () => {
      const res = buildMockRes();

      await loginController(buildMockReq({ email: LOGIN_USER.email }), res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Invalid email or password",
      });
    });

    it("returns 404 when email is missing", async () => {
      const res = buildMockRes();

      await loginController(
        buildMockReq({ password: LOGIN_USER.password }),
        res
      );

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Invalid email or password",
      });
    });
  });

  describe("forgotPasswordController", () => {
    it("resets password when email and answer are valid", async () => {
      await seedUser(clonePayload(FORGOT_PASSWORD_USER));
      const resetPayload = {
        email: FORGOT_PASSWORD_USER.email,
        answer: FORGOT_PASSWORD_USER.answer,
        newPassword: "newPassword123",
      };

      const res = buildMockRes();

      await forgotPasswordController(buildMockReq(resetPayload), res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        message: "Password reset successfully",
      });

      const updatedUser = await userModel.findOne({
        email: FORGOT_PASSWORD_USER.email,
      });
      expect(updatedUser).toBeTruthy();
      expect(
        await comparePassword(resetPayload.newPassword, updatedUser.password)
      ).toBe(true);
      expect(
        await comparePassword(
          FORGOT_PASSWORD_USER.password,
          updatedUser.password
        )
      ).toBe(false);
    });

    it("returns 404 when email is incorrect", async () => {
      const res = buildMockRes();

      await forgotPasswordController(
        buildMockReq({
          email: "nonexistent@example.com",
          answer: "test answer",
          newPassword: "newPassword123",
        }),
        res
      );

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Wrong email or answer",
      });
    });

    it("returns 404 when security answer is incorrect", async () => {
      await seedUser(clonePayload(FORGOT_WRONG_ANSWER_USER));

      const res = buildMockRes();

      await forgotPasswordController(
        buildMockReq({
          email: FORGOT_WRONG_ANSWER_USER.email,
          answer: "wrong answer",
          newPassword: "newPassword123",
        }),
        res
      );

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Wrong email or answer",
      });

      const user = await userModel.findOne({
        email: FORGOT_WRONG_ANSWER_USER.email,
      });
      expect(
        await comparePassword(FORGOT_WRONG_ANSWER_USER.password, user.password)
      ).toBe(true);
    });

    const forgotValidationCases = [
      { field: "email", message: "Email is required" },
      { field: "answer", message: "Answer is required" },
      { field: "newPassword", message: "New password is required" },
    ];

    forgotValidationCases.forEach(({ field, message }) => {
      it(`returns 400 when ${field} is missing`, async () => {
        const invalidPayload = omitField(
          {
            email: FORGOT_PASSWORD_USER.email,
            answer: FORGOT_PASSWORD_USER.answer,
            newPassword: "newPassword123",
          },
          field
        );
        const res = buildMockRes();

        await forgotPasswordController(buildMockReq(invalidPayload), res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({ message });
      });
    });

    it("allows login with the new password and rejects the old one", async () => {
      await seedUser(clonePayload(FORGOT_PASSWORD_USER));
      const resetPayload = {
        email: FORGOT_PASSWORD_USER.email,
        answer: FORGOT_PASSWORD_USER.answer,
        newPassword: "newPassword123",
      };

      const resetRes = buildMockRes();
      await forgotPasswordController(buildMockReq(resetPayload), resetRes);
      expect(resetRes.status).toHaveBeenCalledWith(200);

      const loginRes = buildMockRes();
      await loginController(
        buildMockReq({
          email: FORGOT_PASSWORD_USER.email,
          password: resetPayload.newPassword,
        }),
        loginRes
      );

      expect(loginRes.status).toHaveBeenCalledWith(200);
      expect(loginRes.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Login successfully",
          token: expect.any(String),
        })
      );

      const oldLoginRes = buildMockRes();
      await loginController(
        buildMockReq({
          email: FORGOT_PASSWORD_USER.email,
          password: FORGOT_PASSWORD_USER.password,
        }),
        oldLoginRes
      );

      expect(oldLoginRes.status).toHaveBeenCalledWith(401);
      expect(oldLoginRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Invalid Password",
      });
    });
  });

  describe("getOrdersController", () => {
    beforeEach(async () => {
      await orderModel.deleteMany({});
      await userModel.deleteMany({});
      await productModel.deleteMany({});
    });

    afterAll(async () => {
      await orderModel.deleteMany({});
      await userModel.deleteMany({});
      await productModel.deleteMany({});
    });

    it("returns orders for a specific user", async () => {
      const { user: newUser } = await seedUserAndOrder(clonePayload(LOGIN_USER), sampleOrders);

      const req = { user: { _id: newUser._id } };
      const res = buildMockRes();

      await getOrdersController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Orders fetched successfully",
          orders: expect.arrayContaining([
            expect.objectContaining({ status: "Processing" }),
            expect.objectContaining({ status: "deliverd" }),
          ]),
        })
      );
    });

    it("returns empty array if user has no orders", async () => {
      const req = { user: { _id: new mongoose.Types.ObjectId() } };
      const res = buildMockRes();

      await getOrdersController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        message: "Orders fetched successfully",
        orders: [],
      });
    });

    it("handles internal server error", async () => {
      const { user: newUser } = await seedUserAndOrder(clonePayload(LOGIN_USER), sampleOrders);

      const req = { user: newUser };
      const res = buildMockRes();

      // Simulate DB error
      const originalFind = orderModel.find;
      orderModel.find = jest.fn(() => {
        throw new Error("DB failure");
      });

      await getOrdersController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Error while getting orders",
        })
      );

      // Restore original
      orderModel.find = originalFind;
    });
  });

  describe("getAllOrdersController", () => {
    beforeEach(async () => {
      await orderModel.deleteMany({});
      await userModel.deleteMany({});
      await productModel.deleteMany({});
    });

    afterAll(async () => {
      await orderModel.deleteMany({});
      await userModel.deleteMany({});
      await productModel.deleteMany({});
    });

    it("returns all orders", async () => {
      await seedUserAndOrder(clonePayload(LOGIN_USER), sampleOrders);
      const req = {};
      const res = buildMockRes();

      await getAllOrdersController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Orders fetched successfully",
          orders: expect.any(Array),
        })
      );
      expect(res.send.mock.calls[0][0].orders.length).toBe(3);
    });

    it("returns empty array when no orders exist", async () => {
      await orderModel.deleteMany({});
      const req = {};
      const res = buildMockRes();

      await getAllOrdersController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        message: "Orders fetched successfully",
        orders: [],
      });
    });

    it("handles internal server error", async () => {
      const req = {};
      const res = buildMockRes();

      const originalFind = orderModel.find;
      orderModel.find = jest.fn(() => {
        throw new Error("DB error");
      });

      await getAllOrdersController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Error while getting orders",
        })
      );

      orderModel.find = originalFind;
    });
  });

  describe("orderStatusController", () => {
    beforeEach(async () => {
      await orderModel.deleteMany({});
      await userModel.deleteMany({});
      await productModel.deleteMany({});
    });

    afterAll(async () => {
      await orderModel.deleteMany({});
      await userModel.deleteMany({});
      await productModel.deleteMany({});
    });

    it("updates order status successfully", async () => {
      const { orders } = await seedUserAndOrder(clonePayload(LOGIN_USER), sampleOrders);
      const res = buildMockRes();

      const order = orders[0];
      const req = {
        params: {
          orderId: order._id.toString(),
        },
        body: {
          status: "Shipped",
        },
      };

      await orderStatusController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Order updated successfully",
          orders: expect.objectContaining({
            _id: order._id,
            status: "Shipped",
          }),
        })
      );

      const updatedOrder = await orderModel.findById(order._id);
      expect(updatedOrder.status).toBe("Shipped");
    });

    it("returns 404 if orderId is invalid or not found", async () => {
      const req = {
        params: {
          orderId: new mongoose.Types.ObjectId(),
        },
        body: {
          status: "Shipped",
        },
      };
      const res = buildMockRes();

      await orderStatusController(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Order not found",
      });
    });

    it("returns 500 on server error", async () => {
      const req = {
        params: {
          orderId: new mongoose.Types.ObjectId().toString(),
        },
        body: {
          status: "Cancelled",
        },
      };
      const res = buildMockRes();

      // Simulate internal error
      const originalFindByIdAndUpdate = orderModel.findByIdAndUpdate;
      orderModel.findByIdAndUpdate = jest.fn(() => {
        throw new Error("DB failure");
      });

      await orderStatusController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Error while updating order",
        })
      );

      orderModel.findByIdAndUpdate = originalFindByIdAndUpdate;
    });
  });
});
