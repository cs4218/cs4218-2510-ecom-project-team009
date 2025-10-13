import request from "supertest";
import app from "../server.js";
import userModel from "../models/userModel.js";
import { hashPassword, comparePassword } from "../helpers/authHelper.js";

// Bottom-up: reuse real Express app + in-memory Mongo fake to exercise route + controller layers.
describe("Auth Route Integration (register, login, forgot-password)", () => {
  beforeAll(() => {
    process.env.NODE_ENV = "test";
  });

  describe("POST /api/v1/auth/register", () => {
    it("registers a new user and persists hashed password", async () => {
      const payload = {
        name: "Test User",
        email: "test@example.com",
        password: "password123",
        phone: "1234567890",
        address: "123 Test St",
        answer: "test answer",
      };

      const response = await request(app)
        .post("/api/v1/auth/register")
        .send(payload);

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        success: true,
        message: "User Register Successfully",
        user: expect.objectContaining({
          name: payload.name,
          email: payload.email,
          phone: payload.phone,
          address: payload.address,
        }),
      });

      const savedUser = await userModel.findOne({ email: payload.email });
      expect(savedUser).toBeTruthy();
      expect(savedUser.password).not.toBe(payload.password);
      const isHashed = await comparePassword(
        payload.password,
        savedUser.password
      );
      expect(isHashed).toBe(true);
    });

    it("prevents duplicate registrations on the same email", async () => {
      const payload = {
        name: "Existing User",
        email: "existing@example.com",
        password: "password123",
        phone: "1234567890",
        address: "123 Test St",
        answer: "test answer",
      };

      await request(app).post("/api/v1/auth/register").send(payload);

      const duplicateResponse = await request(app)
        .post("/api/v1/auth/register")
        .send({
          ...payload,
          name: "New User",
          password: "newpassword123",
          phone: "0987654321",
          address: "456 New St",
          answer: "new answer",
        });

      expect(duplicateResponse.status).toBe(409);
      expect(duplicateResponse.body).toEqual({
        success: false,
        message: "Already existing user please login",
      });

      const users = await userModel.find({ email: payload.email });
      expect(users).toHaveLength(1);
      expect(users[0].name).toBe(payload.name);
    });
  });

  describe("POST /api/v1/auth/login", () => {
    const credentials = {
      email: "test@example.com",
      password: "password123",
    };

    beforeEach(async () => {
      const hashedPassword = await hashPassword(credentials.password);

      await userModel.create({
        name: "Test User",
        email: credentials.email,
        password: hashedPassword,
        phone: "1234567890",
        address: "123 Test St",
        answer: "test answer",
      });
    });

    it("logs in an existing user and returns token + user payload", async () => {
      const response = await request(app)
        .post("/api/v1/auth/login")
        .send(credentials);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        message: "Login successfully",
        user: expect.objectContaining({
          email: credentials.email,
          name: "Test User",
        }),
      });
      expect(response.body.token).toBeDefined();
      expect(typeof response.body.token).toBe("string");
    });

    it("rejects login when password is incorrect", async () => {
      const response = await request(app).post("/api/v1/auth/login").send({
        email: credentials.email,
        password: "wrongpassword",
      });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        success: false,
        message: "Invalid Password",
      });
    });
  });

  describe("POST /api/v1/auth/forgot-password", () => {
    it("resets password when email and answer match", async () => {
      const seedUser = {
        name: "Test User",
        email: "test@example.com",
        password: "oldPassword123",
        phone: "1234567890",
        address: "123 Test St",
        answer: "test answer",
      };
      const hashedPassword = await hashPassword(seedUser.password);
      await userModel.create({
        ...seedUser,
        password: hashedPassword,
      });
      const newPassword = "newPassword123";

      const response = await request(app)
        .post("/api/v1/auth/forgot-password")
        .send({
          email: seedUser.email,
          answer: seedUser.answer,
          newPassword,
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: "Password reset successfully",
      });

      const updatedUser = await userModel.findOne({ email: seedUser.email });
      expect(updatedUser).toBeTruthy();
      expect(await comparePassword(newPassword, updatedUser.password)).toBe(
        true
      );
    });

    it("returns 404 when security answer is incorrect", async () => {
      const seedUser = {
        name: "Test User",
        email: "test@example.com",
        password: "password123",
        phone: "1234567890",
        address: "123 Test St",
        answer: "correct answer",
      };
      const hashedPassword = await hashPassword(seedUser.password);
      await userModel.create({
        ...seedUser,
        password: hashedPassword,
      });

      const response = await request(app)
        .post("/api/v1/auth/forgot-password")
        .send({
          email: seedUser.email,
          answer: "wrong answer",
          newPassword: "newPassword123",
        });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        success: false,
        message: "Wrong email or answer",
      });
    });
  });

  describe("GET /api/v1/auth/user-auth", () => {
    const baseUser = {
      name: "Test User",
      email: "test@example.com",
      password: "password123",
      phone: "1234567890",
      address: "123 Test St",
      answer: "test answer",
    };

    it("allows access when a valid token is provided", async () => {
      await request(app).post("/api/v1/auth/register").send(baseUser);
      const loginResponse = await request(app).post("/api/v1/auth/login").send({
        email: baseUser.email,
        password: baseUser.password,
      });

      const response = await request(app)
        .get("/api/v1/auth/user-auth")
        .set("Authorization", loginResponse.body.token);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ ok: true });
    });

    it("rejects access when authorization header is missing", async () => {
      const response = await request(app).get("/api/v1/auth/user-auth");

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        success: false,
        message: "Unauthorized Access",
      });
    });

    it("rejects access when token is invalid", async () => {
      const response = await request(app)
        .get("/api/v1/auth/user-auth")
        .set("Authorization", "invalid-token");

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        success: false,
        message: "Unauthorized Access",
      });
    });
  });

  describe("GET /api/v1/auth/admin-auth", () => {
    const baseUser = {
      name: "Test User",
      email: "test@example.com",
      password: "password123",
      phone: "1234567890",
      address: "123 Test St",
      answer: "test answer",
    };

    it("allows access for admin users with valid token", async () => {
      await request(app).post("/api/v1/auth/register").send(baseUser);
      await userModel.updateOne({ email: baseUser.email }, { role: 1 });

      const loginResponse = await request(app).post("/api/v1/auth/login").send({
        email: baseUser.email,
        password: baseUser.password,
      });

      const response = await request(app)
        .get("/api/v1/auth/admin-auth")
        .set("Authorization", loginResponse.body.token);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ ok: true });
    });

    it("rejects access for non-admin users", async () => {
      await request(app).post("/api/v1/auth/register").send(baseUser);
      const loginResponse = await request(app).post("/api/v1/auth/login").send({
        email: baseUser.email,
        password: baseUser.password,
      });

      const response = await request(app)
        .get("/api/v1/auth/admin-auth")
        .set("Authorization", loginResponse.body.token);

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        success: false,
        message: "Unauthorized access",
      });
    });

    it("rejects access when authorization header is missing", async () => {
      const response = await request(app).get("/api/v1/auth/admin-auth");

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        success: false,
        message: "Unauthorized Access",
      });
    });
  });
});
