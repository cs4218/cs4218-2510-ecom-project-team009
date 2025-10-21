import { jest } from "@jest/globals";
import request from "supertest";
import express from "express";
import formidable from "express-formidable";
import mongoose from "mongoose";
import slugify from "slugify";

// Import real models
import productModel from "../models/productModel.js";
import categoryModel from "../models/categoryModel.js";
import orderModel from "../models/orderModel.js";

// --- START: Braintree Mocking ---
// Create stable mock functions in a scope accessible to both the mock and the tests
const mockClientTokenGenerate = jest.fn();
const mockTransactionSale = jest.fn();

// Use jest.unstable_mockModule for modern ES Module mocking
await jest.unstable_mockModule("braintree", () => ({
  default: {
    BraintreeGateway: jest.fn(function () {
      this.clientToken = {
        generate: mockClientTokenGenerate,
      };
      this.transaction = {
        sale: mockTransactionSale,
      };
    }),
    Environment: {
      Sandbox: "sandbox",
    },
  },
}));

// Dynamically import the controllers AFTER the mock has been defined.
// This ensures they receive the mocked version of 'braintree'.
const {
  createProductController,
  getProductController,
  getSingleProductController,
  productPhotoController,
  deleteProductController,
  updateProductController,
  productFiltersController,
  productCountController,
  productListController,
  searchProductController,
  relatedProductController,
  productCategoryController,
  braintreeTokenController,
  brainTreePaymentController,
} = await import("./productController.js");
// --- END: Braintree Mocking ---

// Middleware to simulate an authenticated user
const mockAuthMiddleware = (req, res, next) => {
  req.user = { _id: new mongoose.Types.ObjectId().toString() }; // Simulate a logged-in user
  next();
};

// Create Express app for integration testing
const createTestApp = () => {
  const app = express();
  app.use(express.json());

  // Configure slugify globally for consistency
  slugify.extend({ ".": "-" });

  // Routes
  app.post(
    "/api/v1/product/create-product",
    formidable(),
    createProductController
  );
  app.put(
    "/api/v1/product/update-product/:pid",
    formidable(),
    updateProductController
  );
  app.get("/api/v1/product/get-product", getProductController);
  app.get("/api/v1/product/get-product/:slug", getSingleProductController);
  app.get("/api/v1/product/product-photo/:pid", productPhotoController);
  app.delete("/api/v1/product/delete-product/:pid", deleteProductController);
  app.post("/api/v1/product/product-filters", productFiltersController);
  app.get("/api/v1/product/product-count", productCountController);
  app.get("/api/v1/product/product-list/:page", productListController);
  app.get("/api/v1/product/search/:keyword", searchProductController);
  app.get(
    "/api/v1/product/related-product/:pid/:cid",
    relatedProductController
  );
  app.get("/api/v1/product/product-category/:slug", productCategoryController);

  // Braintree routes - note the addition of mock auth middleware for payment
  app.get("/api/v1/product/braintree/token", braintreeTokenController);
  app.post(
    "/api/v1/product/braintree/payment",
    mockAuthMiddleware,
    brainTreePaymentController
  );

  return app;
};

describe("Product Controller Integration Tests", () => {
  let app;
  let testCategory;

  beforeAll(() => {
    // Suppress console.log during tests
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});

    app = createTestApp();
  });

  afterAll(() => {
    // Restore console after tests
    console.log.mockRestore();
    console.error.mockRestore();
  });

  beforeEach(async () => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    // Clean up database collections
    await productModel.deleteMany({});
    await categoryModel.deleteMany({});
    await orderModel.deleteMany({});

    // Create a fresh test category for each test
    testCategory = await categoryModel.create({
      name: "Electronics",
      slug: "electronics",
    });
  });

  // ==========================================================================
  // PAYMENT GATEWAY INTEGRATION - Braintree Token and Payment
  // ==========================================================================
  describe("Payment Gateway Integration - Braintree", () => {
    describe("Braintree Token Generation", () => {
      it("should return a client token when braintree generates it successfully", async () => {
        // Arrange: Mock the braintree gateway's success response
        const mockBraintreeResponse = {
          clientToken: "mock-client-token-string",
        };
        mockClientTokenGenerate.mockImplementation((_, callback) => {
          callback(null, mockBraintreeResponse);
        });

        // Act: Make the API request
        const response = await request(app).get(
          "/api/v1/product/braintree/token"
        );

        // Assert: Check the HTTP response
        expect(response.status).toBe(200);
        expect(response.body).toEqual(mockBraintreeResponse);
        expect(mockClientTokenGenerate).toHaveBeenCalledTimes(1);
      });

      it("should return a 500 error if braintree fails to generate a token", async () => {
        // Arrange: Mock the braintree gateway's error response
        const mockError = { success: false, message: "Braintree SDK Error" };
        mockClientTokenGenerate.mockImplementation((_, callback) => {
          callback(mockError, null);
        });

        // Act: Make the API request
        const response = await request(app).get(
          "/api/v1/product/braintree/token"
        );

        // Assert: Check the error response
        expect(response.status).toBe(500);
        expect(response.body).toEqual(mockError);
      });
    });

    describe("Braintree Payment Processing", () => {
      let mockCart;

      beforeEach(async () => {
        // Create some products to add to the cart
        const p1Doc = await productModel.create({
          name: "Laptop",
          price: 1200,
          category: testCategory._id,
          quantity: 10,
          description: "A laptop",
          slug: slugify("Laptop"), // Manually generate slug here
        });
        const p2Doc = await productModel.create({
          name: "Mouse",
          price: 50,
          category: testCategory._id,
          quantity: 100,
          description: "A mouse",
          slug: slugify("Mouse"), // Manually generate slug here
        });

        // FIX: To ensure data integrity, re-fetch the created products directly from the database
        // using .lean() to get a plain JS object. This guarantees the 'slug' and all other
        // fields are present exactly as they are in the DB, avoiding validation errors.
        const p1 = await productModel.findById(p1Doc._id).lean();
        const p2 = await productModel.findById(p2Doc._id).lean();

        mockCart = [p1, p2];
      });

      it("should process payment, create an order in the database, and return { ok: true }", async () => {
        // Arrange: Mock a successful transaction result from Braintree
        const mockTransactionResult = {
          success: true,
          transaction: { id: "txn_12345", amount: "1250.00" },
        };
        mockTransactionSale.mockImplementation((options, callback) => {
          callback(null, mockTransactionResult);
        });

        const mockPaymentNonce = "fake-valid-nonce";

        // Act: Make the API request to process payment
        const response = await request(app)
          .post("/api/v1/product/braintree/payment")
          .send({ nonce: mockPaymentNonce, cart: mockCart });

        // Assert: Check the HTTP response
        expect(response.status).toBe(200);
        expect(response.body).toEqual({ ok: true });

        // Assert: Verify the Braintree API was called correctly
        expect(mockTransactionSale).toHaveBeenCalledWith(
          expect.objectContaining({
            amount: 1250, // 1200 (Laptop) + 50 (Mouse)
            paymentMethodNonce: mockPaymentNonce,
          }),
          expect.any(Function)
        );

        // Assert: Verify that the order was saved to the database
        const savedOrder = await orderModel.findOne();
        expect(savedOrder).not.toBeNull();
        expect(savedOrder.products.length).toBe(2);
        expect(savedOrder.payment.transaction.id).toBe("txn_12345");
        expect(savedOrder.buyer).toBeDefined();
        expect(savedOrder.status).toBe("Not Process"); // Default status from schema
      });

      it("should return a 500 error and NOT create an order if payment fails", async () => {
        // Arrange: Mock a failed transaction from Braintree
        const mockErrorResult = {
          success: false,
          message: "Payment method declined.",
        };
        mockTransactionSale.mockImplementation((options, callback) => {
          callback(mockErrorResult, null); // First argument is error
        });
        const mockPaymentNonce = "fake-declined-nonce";

        // Act
        const response = await request(app)
          .post("/api/v1/product/braintree/payment")
          .send({ nonce: mockPaymentNonce, cart: mockCart });

        // Assert: Check the HTTP response
        expect(response.status).toBe(500);
        expect(response.body).toEqual(mockErrorResult);

        // Assert: Verify that NO order was created in the database
        const orderCount = await orderModel.countDocuments();
        expect(orderCount).toBe(0);
      });
    });
  });
});
