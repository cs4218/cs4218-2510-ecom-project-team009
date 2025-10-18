import { jest } from "@jest/globals";
import request from "supertest";
import express from "express";
import formidable from "express-formidable";
import mongoose from "mongoose";
import slugify from "slugify";

// Import real models (not mocked)
import productModel from "../models/productModel.js";
import categoryModel from "../models/categoryModel.js";
import orderModel from "../models/orderModel.js";

// Import controllers
import {
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
} from "./productController.js";

// Create Express app for integration testing
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  
  // Configure slugify globally for consistency
  slugify.extend({ '.': '-' });
  
  // Routes without authentication middleware (for testing)
  app.post("/api/v1/product/create-product", formidable(), createProductController);
  app.put("/api/v1/product/update-product/:pid", formidable(), updateProductController);
  app.get("/api/v1/product/get-product", getProductController);
  app.get("/api/v1/product/get-product/:slug", getSingleProductController);
  app.get("/api/v1/product/product-photo/:pid", productPhotoController);
  app.delete("/api/v1/product/delete-product/:pid", deleteProductController);
  app.post("/api/v1/product/product-filters", productFiltersController);
  app.get("/api/v1/product/product-count", productCountController);
  app.get("/api/v1/product/product-list/:page", productListController);
  app.get("/api/v1/product/search/:keyword", searchProductController);
  app.get("/api/v1/product/related-product/:pid/:cid", relatedProductController);
  app.get("/api/v1/product/product-category/:slug", productCategoryController);
  app.get("/api/v1/product/braintree/token", braintreeTokenController);
  app.post("/api/v1/product/braintree/payment", brainTreePaymentController);
  
  return app;
};

describe("Product Controller Integration Tests", () => {
  let app;
  let testCategory;

  beforeAll(() => {
    // Suppress console.log during tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    
    app = createTestApp();
  });

  afterAll(() => {
    // Restore console after tests
    console.log.mockRestore();
    console.error.mockRestore();
  });

  beforeEach(async () => {
    // Just create a test category for product associations
    testCategory = await categoryModel.create({
      name: "Electronics",
      slug: "electronics",
    });
  });

  // ==========================================================================
  // API LAYER INTEGRATION - HTTP Request → Controller → Database
  // ==========================================================================
  describe("API Layer Integration - Create Product", () => {
    it("should create product with photo through full HTTP flow", async () => {
      const response = await request(app)
        .post("/api/v1/product/create-product")
        .field("name", "Gaming Laptop")
        .field("description", "High-performance gaming laptop with RTX 4090")
        .field("price", "2500")
        .field("category", testCategory._id.toString())
        .field("quantity", "10")
        .field("shipping", "true")
        .attach("photo", Buffer.from("fake-image-data"), {
          filename: "laptop.jpg",
          contentType: "image/jpeg",
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.products.name).toBe("Gaming Laptop");
      
      const actualSlug = response.body.products.slug;
      expect(actualSlug).toBeTruthy();
      expect(actualSlug.toLowerCase()).toBe("gaming-laptop");

      const dbProduct = await productModel.findOne({ slug: actualSlug });
      expect(dbProduct).toBeTruthy();
      expect(dbProduct.name).toBe("Gaming Laptop");
      expect(dbProduct.price).toBe(2500);
      expect(dbProduct.photo.contentType).toBe("image/jpeg");
    });

    it("should reject product creation when photo size exceeds 1MB", async () => {
      const largBuffer = Buffer.alloc(1500000); // 1.5MB

      const response = await request(app)
        .post("/api/v1/product/create-product")
        .field("name", "Gaming Laptop")
        .field("description", "High-performance gaming laptop")
        .field("price", "2500")
        .field("category", testCategory._id.toString())
        .field("quantity", "10")
        .attach("photo", largBuffer, {
          filename: "large.jpg",
          contentType: "image/jpeg",
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe("Photo size must be <= 1mb");

      // Verify product was NOT saved to database
      const dbProduct = await productModel.findOne({ name: "Gaming Laptop" });
      expect(dbProduct).toBeNull();
    });

    it("should reject product creation without required fields", async () => {
      const response = await request(app)
        .post("/api/v1/product/create-product")
        .field("name", "Gaming Laptop")
        // Missing description, price, category, quantity
        .attach("photo", Buffer.from("fake-image-data"), {
          filename: "laptop.jpg",
          contentType: "image/jpeg",
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeTruthy();
    });

    it("should create product without shipping field (defaults to false)", async () => {
      const response = await request(app)
        .post("/api/v1/product/create-product")
        .field("name", "Budget Laptop")
        .field("description", "Affordable laptop for students")
        .field("price", "500")
        .field("category", testCategory._id.toString())
        .field("quantity", "20")
        .attach("photo", Buffer.from("fake-image-data"), {
          filename: "laptop.jpg",
          contentType: "image/jpeg",
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      
      const dbProduct = await productModel.findById(response.body.products._id);
      expect(dbProduct.shipping).toBeUndefined()
    });

    it("should handle photo with exact 1MB size", async () => {
      const exactBuffer = Buffer.alloc(1000000); // Exactly 1MB

      const response = await request(app)
        .post("/api/v1/product/create-product")
        .field("name", "Test Laptop")
        .field("description", "Testing exact size")
        .field("price", "1000")
        .field("category", testCategory._id.toString())
        .field("quantity", "5")
        .attach("photo", exactBuffer, {
          filename: "exact.jpg",
          contentType: "image/jpeg",
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });
  });

  // ==========================================================================
  // DATABASE INTEGRATION - Controller → MongoDB CRUD Operations
  // ==========================================================================
  describe("Database Integration - CRUD Operations", () => {
    let createdProduct;

    beforeEach(async () => {
      // Create a product directly in database for testing
      createdProduct = await productModel.create({
        name: "Test Laptop",
        slug: "test-laptop",
        description: "A test laptop for integration testing",
        price: 1500,
        category: testCategory._id,
        quantity: 5,
        shipping: true,
        photo: {
          data: Buffer.from("test-photo-data"),
          contentType: "image/jpeg",
        },
      });
    });

    it("should fetch all products with category populated", async () => {
      const response = await request(app).get("/api/v1/product/get-product");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.products).toHaveLength(1);
      expect(response.body.products[0].name).toBe("Test Laptop");
      expect(response.body.products[0].category.name).toBe("Electronics");
      expect(response.body.products[0].photo).toBeUndefined(); // Photo excluded
    });

    it("should fetch single product by slug with category populated", async () => {
      const response = await request(app).get(
        "/api/v1/product/get-product/test-laptop"
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.product.name).toBe("Test Laptop");
      expect(response.body.product.category._id.toString()).toBe(
        testCategory._id.toString()
      );
    });

    it("should fetch product photo as binary data", async () => {
      const response = await request(app).get(
        `/api/v1/product/product-photo/${createdProduct._id}`
      );

      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toBe("image/jpeg");
      expect(response.body).toEqual(Buffer.from("test-photo-data"));
    });

    it("should update product and persist changes to database", async () => {
      const response = await request(app)
        .put(`/api/v1/product/update-product/${createdProduct._id}`)
        .field("name", "Updated Laptop")
        .field("description", "Updated description")
        .field("price", "2000")
        .field("category", testCategory._id.toString())
        .field("quantity", "15")
        .field("shipping", "false");

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.products.name).toBe("Updated Laptop");
      
      const actualSlug = response.body.products.slug;
      expect(actualSlug.toLowerCase()).toBe("updated-laptop");

      // Verify database update
      const dbProduct = await productModel.findById(createdProduct._id);
      expect(dbProduct.name).toBe("Updated Laptop");
      expect(dbProduct.price).toBe(2000);
      expect(dbProduct.quantity).toBe(15);
      expect(dbProduct.shipping).toBe(false);
    });

    it("should delete product from database", async () => {
      const response = await request(app).delete(
        `/api/v1/product/delete-product/${createdProduct._id}`
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Product Deleted successfully");

      // Verify database deletion
      const dbProduct = await productModel.findById(createdProduct._id);
      expect(dbProduct).toBeNull();
    });

    it("should update product with new photo", async () => {
      const response = await request(app)
        .put(`/api/v1/product/update-product/${createdProduct._id}`)
        .field("name", "Updated with Photo")
        .field("description", "Updated description")
        .field("price", "1800")
        .field("category", testCategory._id.toString())
        .field("quantity", "10")
        .attach("photo", Buffer.from("new-photo-data"), {
          filename: "new.jpg",
          contentType: "image/jpeg",
        });

      expect(response.status).toBe(201);
      
      const dbProduct = await productModel.findById(createdProduct._id);
      expect(dbProduct.photo.data.toString()).toBe("new-photo-data");
    });

    it("should reject update with oversized photo", async () => {
      const largeBuffer = Buffer.alloc(1500000);

      const response = await request(app)
        .put(`/api/v1/product/update-product/${createdProduct._id}`)
        .field("name", "Updated Laptop")
        .field("description", "Updated description")
        .field("price", "2000")
        .field("category", testCategory._id.toString())
        .field("quantity", "15")
        .attach("photo", largeBuffer, {
          filename: "large.jpg",
          contentType: "image/jpeg",
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe("Photo size must be <= 1mb");
    });
  });

  // ==========================================================================
  // BUSINESS LOGIC INTEGRATION - Filtering, Searching, Pagination
  // ==========================================================================
  describe("Business Logic Integration - Filters and Search", () => {
    beforeEach(async () => {
      // Create multiple products for filtering/searching
      await productModel.create([
        {
          name: "Gaming Laptop",
          slug: "gaming-laptop",
          description: "High-performance gaming laptop with RTX 4090",
          price: 2500,
          category: testCategory._id,
          quantity: 10,
        },
        {
          name: "Office Laptop",
          slug: "office-laptop",
          description: "Budget-friendly laptop for office work",
          price: 800,
          category: testCategory._id,
          quantity: 20,
        },
        {
          name: "Ultrabook",
          slug: "ultrabook",
          description: "Lightweight ultrabook for travel",
          price: 1500,
          category: testCategory._id,
          quantity: 15,
        },
      ]);
    });

    it("should filter products by price range", async () => {
      const response = await request(app)
        .post("/api/v1/product/product-filters")
        .send({
          checked: [],
          radio: [1000, 2000],
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.products).toHaveLength(1);
      expect(response.body.products[0].name).toBe("Ultrabook");
    });

    it("should filter products by category and price range", async () => {
      const response = await request(app)
        .post("/api/v1/product/product-filters")
        .send({
          checked: [testCategory._id.toString()],
          radio: [500, 1000],
        });

      expect(response.status).toBe(200);
      expect(response.body.products).toHaveLength(1);
      expect(response.body.products[0].name).toBe("Office Laptop");
    });

    it("should search products by keyword in name", async () => {
      const response = await request(app).get("/api/v1/product/search/gaming");

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].name).toBe("Gaming Laptop");
    });

    it("should search products by keyword in description", async () => {
      const response = await request(app).get("/api/v1/product/search/office");

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].name).toBe("Office Laptop");
    });

    it("should return paginated products (page 1)", async () => {
      const response = await request(app).get("/api/v1/product/product-list/1");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.products).toHaveLength(3);
    });

    it("should return correct product count", async () => {
      const response = await request(app).get("/api/v1/product/product-count");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.total).toBe(3);
    });

    it("should return empty array for non-matching search", async () => {
      const response = await request(app).get("/api/v1/product/search/nonexistent");

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(0);
    });

    it("should filter with only category (no price range)", async () => {
      const response = await request(app)
        .post("/api/v1/product/product-filters")
        .send({
          checked: [testCategory._id.toString()],
          radio: [],
        });

      expect(response.status).toBe(200);
      expect(response.body.products).toHaveLength(3);
    });

    it("should handle pagination for page 2 (empty results)", async () => {
      const response = await request(app).get("/api/v1/product/product-list/2");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.products).toHaveLength(0);
    });

    it("should search case-insensitively", async () => {
      const response = await request(app).get("/api/v1/product/search/GAMING");

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].name).toBe("Gaming Laptop");
    });
  });

  // ==========================================================================
  // RELATIONSHIP INTEGRATION - Category Associations & Related Products
  // ==========================================================================
  describe("Relationship Integration - Category and Related Products", () => {
    let gamingCategory;
    let officeCategory;
    let gamingLaptop;

    beforeEach(async () => {
      // Create multiple categories
      gamingCategory = await categoryModel.create({
        name: "Gaming",
        slug: "gaming",
      });
      officeCategory = await categoryModel.create({
        name: "Office",
        slug: "office",
      });

      // Create products in different categories
      gamingLaptop = await productModel.create({
        name: "Gaming Laptop",
        slug: "gaming-laptop",
        description: "RTX 4090 laptop",
        price: 2500,
        category: gamingCategory._id,
        quantity: 10,
      });

      await productModel.create([
        {
          name: "Gaming Mouse",
          slug: "gaming-mouse",
          description: "RGB gaming mouse",
          price: 80,
          category: gamingCategory._id,
          quantity: 50,
        },
        {
          name: "Gaming Keyboard",
          slug: "gaming-keyboard",
          description: "Mechanical keyboard",
          price: 150,
          category: gamingCategory._id,
          quantity: 30,
        },
        {
          name: "Office Desk",
          slug: "office-desk",
          description: "Ergonomic desk",
          price: 300,
          category: officeCategory._id,
          quantity: 10,
        },
      ]);
    });

    it("should fetch products by category slug", async () => {
      const response = await request(app).get(
        "/api/v1/product/product-category/gaming"
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.products).toHaveLength(3);
      expect(response.body.category.name).toBe("Gaming");
    });

    it("should fetch related products excluding the current product", async () => {
      const response = await request(app).get(
        `/api/v1/product/related-product/${gamingLaptop._id}/${gamingCategory._id}`
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.products).toHaveLength(2);
      
      // Verify gaming laptop is excluded
      const productNames = response.body.products.map((p) => p.name);
      expect(productNames).not.toContain("Gaming Laptop");
      expect(productNames).toContain("Gaming Mouse");
      expect(productNames).toContain("Gaming Keyboard");
    });

    it("should limit related products to 3 items", async () => {
      // Create 5 more gaming products
      await productModel.create([
        {
          name: "Gaming Headset",
          slug: "gaming-headset",
          description: "High-quality headset",
          price: 200,
          category: gamingCategory._id,
          quantity: 20,
        },
        {
          name: "Gaming Monitor",
          slug: "gaming-monitor",
          description: "4K gaming monitor",
          price: 500,
          category: gamingCategory._id,
          quantity: 15,
        },
        {
          name: "Gaming Chair",
          slug: "gaming-chair",
          description: "Ergonomic gaming chair",
          price: 400,
          category: gamingCategory._id,
          quantity: 10,
        },
      ]);

      const response = await request(app).get(
        `/api/v1/product/related-product/${gamingLaptop._id}/${gamingCategory._id}`
      );

      expect(response.status).toBe(200);
      expect(response.body.products).toHaveLength(3); // Limited to 3
    });

    it("should return empty array when no related products exist", async () => {
      // Delete all gaming products except the laptop
      await productModel.deleteMany({
        category: gamingCategory._id,
        _id: { $ne: gamingLaptop._id },
      });

      const response = await request(app).get(
        `/api/v1/product/related-product/${gamingLaptop._id}/${gamingCategory._id}`
      );

      expect(response.status).toBe(200);
      expect(response.body.products).toHaveLength(0);
    });

    it("should return empty array for non-existent category slug", async () => {
      const response = await request(app).get(
        "/api/v1/product/product-category/nonexistent"
    );

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.products).toEqual([]);
    expect(response.body.category).toBeNull();
    });
  });

  // ==========================================================================
  // END-TO-END WORKFLOW - Complete Product Lifecycle
  // ==========================================================================
  describe("End-to-End Workflow - Product Lifecycle", () => {
    it("should complete full workflow: create → read → update → delete", async () => {
      // Step 1: Create product
      const createResponse = await request(app)
        .post("/api/v1/product/create-product")
        .field("name", "Workflow Laptop")
        .field("description", "Testing full workflow")
        .field("price", "1000")
        .field("category", testCategory._id.toString())
        .field("quantity", "5")
        .attach("photo", Buffer.from("photo-data"), {
          filename: "laptop.jpg",
          contentType: "image/jpeg",
        });

      expect(createResponse.status).toBe(201);
      const productId = createResponse.body.products._id;
      const createdSlug = createResponse.body.products.slug;

      // Step 2: Read product by slug
      const readResponse = await request(app).get(
        `/api/v1/product/get-product/${createdSlug}`
      );
      expect(readResponse.status).toBe(200);
      expect(readResponse.body.product).toBeTruthy();
      expect(readResponse.body.product.name).toBe("Workflow Laptop");

      // Step 3: Update product
      const updateResponse = await request(app)
        .put(`/api/v1/product/update-product/${productId}`)
        .field("name", "Updated Workflow Laptop")
        .field("description", "Updated description")
        .field("price", "1200")
        .field("category", testCategory._id.toString())
        .field("quantity", "10");

      expect(updateResponse.status).toBe(201);
      expect(updateResponse.body.products.name).toBe("Updated Workflow Laptop");
      const updatedSlug = updateResponse.body.products.slug;

      // Step 4: Verify update persisted
      const verifyResponse = await request(app).get(
        `/api/v1/product/get-product/${updatedSlug}`
      );
      expect(verifyResponse.status).toBe(200);
      expect(verifyResponse.body.product).toBeTruthy();
      expect(verifyResponse.body.product.price).toBe(1200);

      // Step 5: Delete product
      const deleteResponse = await request(app).delete(
        `/api/v1/product/delete-product/${productId}`
      );
      expect(deleteResponse.status).toBe(200);

      // Step 6: Verify deletion
      const verifyDeletionResponse = await request(app).get(
        `/api/v1/product/get-product/${updatedSlug}`
      );
      expect(verifyDeletionResponse.body.product).toBeNull();
    });

    it("should handle cascade: create product → search → filter → relate", async () => {
      // Create multiple related products
      const laptop1 = await request(app)
        .post("/api/v1/product/create-product")
        .field("name", "Gaming Laptop Pro")
        .field("description", "High-end gaming laptop with RTX 4090")
        .field("price", "2500")
        .field("category", testCategory._id.toString())
        .field("quantity", "10")
        .attach("photo", Buffer.from("photo1"), {
          filename: "laptop1.jpg",
          contentType: "image/jpeg",
        });

      await request(app)
        .post("/api/v1/product/create-product")
        .field("name", "Gaming Laptop Budget")
        .field("description", "Budget gaming laptop with GTX 1660")
        .field("price", "1200")
        .field("category", testCategory._id.toString())
        .field("quantity", "20")
        .attach("photo", Buffer.from("photo2"), {
          filename: "laptop2.jpg",
          contentType: "image/jpeg",
        });

      const productId = laptop1.body.products._id;

      // Search for "gaming"
      const searchResponse = await request(app).get(
        "/api/v1/product/search/gaming"
      );
      expect(searchResponse.body).toHaveLength(2);

      // Filter by price range
      const filterResponse = await request(app)
        .post("/api/v1/product/product-filters")
        .send({
          checked: [],
          radio: [2000, 3000],
        });
      expect(filterResponse.body.products).toHaveLength(1);
      expect(filterResponse.body.products[0].name).toBe("Gaming Laptop Pro");

      // Get related products
      const relatedResponse = await request(app).get(
        `/api/v1/product/related-product/${productId}/${testCategory._id}`
      );
      expect(relatedResponse.body.products).toHaveLength(1);
      expect(relatedResponse.body.products[0].name).toBe("Gaming Laptop Budget");
    });
  });

  // ==========================================================================
  // ERROR HANDLING INTEGRATION - Database Errors & Edge Cases
  // ==========================================================================
  describe("Error Handling Integration - Database Failures", () => {
    it("should handle non-existent product ID gracefully", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app).get(
        `/api/v1/product/product-photo/${fakeId}`
      );

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it("should handle non-existent slug gracefully", async () => {
      const response = await request(app).get(
        "/api/v1/product/get-product/non-existent-slug"
      );

      expect(response.status).toBe(200);
      expect(response.body.product).toBeNull();
    });

    it("should handle invalid category ID during product creation", async () => {
      const response = await request(app)
        .post("/api/v1/product/create-product")
        .field("name", "Test Product")
        .field("description", "Test description")
        .field("price", "1000")
        .field("category", "invalid-category-id")
        .field("quantity", "10")
        .attach("photo", Buffer.from("photo-data"), {
          filename: "test.jpg",
          contentType: "image/jpeg",
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });

    it("should handle invalid product ID format for deletion", async () => {
      const response = await request(app).delete(
        "/api/v1/product/delete-product/invalid-id"
      );

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });

    it("should handle missing photo in product without existing photo", async () => {
      const product = await productModel.create({
        name: "No Photo Product",
        slug: "no-photo",
        description: "Product without photo",
        price: 500,
        category: testCategory._id,
        quantity: 10,
      });

      const response = await request(app).get(
        `/api/v1/product/product-photo/${product._id}`
      );

      expect(response.status).toBe(404);
    });
  });
});