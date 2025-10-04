import { jest } from "@jest/globals";

// Mock all dependencies before importing the controller
await jest.unstable_mockModule("../models/productModel.js", () => {
  const productModel = {
    find: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    findByIdAndDelete: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    estimatedDocumentCount: jest.fn(),
  };
  
  // Constructor for new productModel()
  const constructor = jest.fn(function (doc) {
    Object.assign(this, doc);
    this.save = jest.fn();
    this.photo = { data: null, contentType: null };
  });
  
  Object.assign(constructor, productModel);
  return { default: constructor };
});

await jest.unstable_mockModule("../models/categoryModel.js", () => ({
  default: {
    findOne: jest.fn(),
  },
}));

await jest.unstable_mockModule("../models/orderModel.js", () => {
  const constructor = jest.fn(function (doc) {
    Object.assign(this, doc);
    this.save = jest.fn();
  });
  return { default: constructor };
});

await jest.unstable_mockModule("fs", () => ({
  default: {
    readFileSync: jest.fn(() => Buffer.from("photo-data")),
  },
}));

await jest.unstable_mockModule("slugify", () => ({
  default: jest.fn((str) => str.toLowerCase().replace(/\s+/g, "-")),
}));

await jest.unstable_mockModule("braintree", () => ({
  default: {
    BraintreeGateway: jest.fn(function () {
      this.clientToken = {
        generate: jest.fn(),
      };
      this.transaction = {
        sale: jest.fn(),
      };
    }),
    Environment: {
      Sandbox: "sandbox",
    },
  },
}));

// Import mocked dependencies
const { default: productModel } = await import("../models/productModel.js");
const { default: categoryModel } = await import("../models/categoryModel.js");
const { default: orderModel } = await import("../models/orderModel.js");
const { default: fs } = await import("fs");
const { default: slugify } = await import("slugify");

// Import controllers
const {
  createProductController,
  getProductController,
} = await import("./productController.js");

describe("Product Controller", () => {
  let mockReq, mockRes;

  const originalImpl = productModel.getMockImplementation();

  beforeEach(() => {
    jest.clearAllMocks();

    // Restore the default constructor
    productModel.mockImplementation(originalImpl);

    // Common mock setup
    mockReq = {
      fields: {},
      files: {},
      params: {},
      body: {},
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
      set: jest.fn(),
      json: jest.fn(),
    };
  });

  // ============================================================================
  // CREATE PRODUCT CONTROLLER TESTS
  // ============================================================================
  describe("Create Product Controller", () => {
    describe("Input Validations", () => {
      // Concept: Decision table / Equivalence Partitioning
      const validationTests = [
        {
          missingField: "name",
          expectedMessage: "Name is Required",
        },
        {
          missingField: "description",
          expectedMessage: "Description is Required",
        },
        {
          missingField: "price",
          expectedMessage: "Price is Required",
        },
        {
          missingField: "category",
          expectedMessage: "Category is Required",
        },
        {
          missingField: "quantity",
          expectedMessage: "Quantity is Required",
        },
      ];

      test.each(validationTests)(
        "should return 500 and error when $missingField is missing",
        async ({ missingField, expectedMessage }) => {
          // Arrange
          mockReq.fields = {
            name: "Test Product",
            description: "Test Description",
            price: 100,
            category: "cat-1",
            quantity: 10,
            shipping: false,
            [missingField]: undefined,
          };

          // Act
          await createProductController(mockReq, mockRes);

          // Assert
          expect(mockRes.status).toHaveBeenCalledWith(500);
          expect(mockRes.send).toHaveBeenCalledWith({
            error: expectedMessage,
          });
        }
      );

      it("should return error when photo size exceeds 1MB", async () => {
        // Arrange
        mockReq.fields = {
          name: "Test Product",
          description: "Test Description",
          price: 100,
          category: "cat-1",
          quantity: 10,
          shipping: false,
        };
        mockReq.files = {
          photo: {
            size: 1500000, // 1.5MB
            path: "/tmp/photo.jpg",
            type: "image/jpeg",
          },
        };

        // Act
        await createProductController(mockReq, mockRes);

        // Assert
        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.send).toHaveBeenCalledWith({
          error: "photo is Required and should be less then 1mb",
        });
      });
    });

    describe("Boundary Value Analysis - Photo Size", () => {
      const photoSizeTests = [
        {
          size: 0,
          description: "boundary: 0 bytes (minimum)",
          shouldPass: true,
        },
        {
          size: 500000,
          description: "boundary: 500KB (middle)",
          shouldPass: true,
        },
        {
          size: 999999,
          description: "boundary: 999,999 bytes (just below 1MB)",
          shouldPass: true,
        },
        {
          size: 1000000,
          description: "boundary: exactly 1MB",
          shouldPass: true,
        },
        {
          size: 1000001,
          description: "boundary: 1,000,001 bytes (just above 1MB)",
          shouldPass: false,
        },
      ];

      test.each(photoSizeTests)(
        "$description → shouldPass: $shouldPass",
        async ({ size, shouldPass }) => {
          // Arrange
          mockReq.fields = {
            name: "Test Product",
            description: "Test Description",
            price: 100,
            category: "cat-1",
            quantity: 10,
            shipping: false,
          };
          mockReq.files = {
            photo: {
              size,
              path: "/tmp/photo.jpg",
              type: "image/jpeg",
            },
          };

          if (shouldPass) {
            productModel.mockImplementation(function (doc) {
              Object.assign(this, doc);
              this.photo = { data: null, contentType: null };
              this.save = jest.fn().mockResolvedValue({ _id: "p1", ...doc });
            });
          }

          // Act
          await createProductController(mockReq, mockRes);

          // Assert
          if (shouldPass) {
            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.send).toHaveBeenCalledWith(
              expect.objectContaining({
                success: true,
                message: "Product Created Successfully",
              })
            );
          } else {
            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.send).toHaveBeenCalledWith({
              error: "photo is Required and should be less then 1mb",
            });
          }
        }
      );
    });

    describe("Successful Product Creation", () => {
      it("should create product with photo and return 201", async () => {
        // Arrange
        mockReq.fields = {
          name: "Test Product",
          description: "Test Description",
          price: 100,
          category: "cat-1",
          quantity: 10,
          shipping: false,
        };
        mockReq.files = {
          photo: {
            size: 500000,
            path: "/tmp/photo.jpg",
            type: "image/jpeg",
          },
        };

        const savedProduct = {
          _id: "p1",
          name: "Test Product",
          slug: "test-product",
          description: "Test Description",
          price: 100,
          category: "cat-1",
          quantity: 10,
          shipping: false,
          photo: {
            data: Buffer.from("photo-data"),
            contentType: "image/jpeg",
          },
        };

        productModel.mockImplementation(function (doc) {
          Object.assign(this, doc);
          this.photo = { data: null, contentType: null };
          this.save = jest.fn().mockResolvedValue(savedProduct);
        });

        // Act
        await createProductController(mockReq, mockRes);

        // Assert
        expect(slugify).toHaveBeenCalledWith("Test Product");
        expect(fs.readFileSync).toHaveBeenCalledWith("/tmp/photo.jpg");
        expect(mockRes.status).toHaveBeenCalledWith(201);
        expect(mockRes.send).toHaveBeenCalledWith({
          success: true,
          message: "Product Created Successfully",
          products: savedProduct,
        });
      });

      it("should create product without photo and return 201", async () => {
        // Arrange
        mockReq.fields = {
          name: "Test Product",
          description: "Test Description",
          price: 100,
          category: "cat-1",
          quantity: 10,
          shipping: false,
        };
        mockReq.files = {}; // No photo

        const savedProduct = {
          _id: "p1",
          name: "Test Product",
          slug: "test-product",
          description: "Test Description",
          price: 100,
          category: "cat-1",
          quantity: 10,
          shipping: false,
        };

        productModel.mockImplementation(function (doc) {
          Object.assign(this, doc);
          this.photo = { data: null, contentType: null };
          this.save = jest.fn().mockResolvedValue(savedProduct);
        });

        // Act
        await createProductController(mockReq, mockRes);

        // Assert
        expect(fs.readFileSync).not.toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(201);
        expect(mockRes.send).toHaveBeenCalledWith({
          success: true,
          message: "Product Created Successfully",
          products: savedProduct,
        });
      });
    });

    describe("Error Handling", () => {
      it("should return 500 when saving product fails", async () => {
        // Arrange
        mockReq.fields = {
          name: "Test Product",
          description: "Test Description",
          price: 100,
          category: "cat-1",
          quantity: 10,
          shipping: false,
        };

        productModel.mockImplementation(function (doc) {
          Object.assign(this, doc);
          this.photo = { data: null, contentType: null };
          this.save = jest.fn().mockRejectedValue(new Error("db down"));
        });

        // Act
        await createProductController(mockReq, mockRes);

        // Assert
        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.send).toHaveBeenCalledWith({
          success: false,
          error: expect.anything(),
          message: "Error in crearing product",
        });
      });

      it("should handle file system errors when reading photo", async () => {
        // Arrange
        mockReq.fields = {
          name: "Test Product",
          description: "Test Description",
          price: 100,
          category: "cat-1",
          quantity: 10,
          shipping: false,
        };
        mockReq.files = {
          photo: {
            size: 500000,
            path: "/tmp/photo.jpg",
            type: "image/jpeg",
          },
        };

        fs.readFileSync.mockImplementation(() => {
          throw new Error("File not found");
        });

        // Act
        await createProductController(mockReq, mockRes);

        // Assert
        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.send).toHaveBeenCalledWith({
          success: false,
          error: expect.anything(),
          message: "Error in crearing product",
        });
      });
    });
  });

  // ============================================================================
  // GET PRODUCT CONTROLLER TESTS
  // ============================================================================
  describe("Get Product Controller", () => {
    describe("Successful Retrieval", () => {
      it("should return all products with category populated and photo excluded", async () => {
        // Arrange
        const products = [
          {
            _id: "p1",
            name: "Product 1",
            price: 100,
            category: { _id: "c1", name: "Category 1" },
          },
          {
            _id: "p2",
            name: "Product 2",
            price: 200,
            category: { _id: "c2", name: "Category 2" },
          },
        ];

        const sort = jest.fn().mockResolvedValue(products);
        const limit = jest.fn().mockReturnValue({ sort });
        const select = jest.fn().mockReturnValue({ limit });
        const populate = jest.fn().mockReturnValue({ select });
        productModel.find.mockReturnValue({ populate });

        // Act
        await getProductController(mockReq, mockRes);

        // Assert
        expect(productModel.find).toHaveBeenCalledWith({});
        expect(populate).toHaveBeenCalledWith("category");
        expect(select).toHaveBeenCalledWith("-photo");
        expect(limit).toHaveBeenCalledWith(12);
        expect(sort).toHaveBeenCalledWith({ createdAt: -1 });
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.send).toHaveBeenCalledWith({
          success: true,
          counTotal: 2,
          message: "ALlProducts ",
          products,
        });
      });
    });

    describe("Boundary Value Analysis - Product Count", () => {
      const countTests = [
        {
          count: 0,
          description: "boundary: 0 products (empty database)",
        },
        {
          count: 1,
          description: "boundary: 1 product (minimum)",
        },
        {
          count: 12,
          description: "boundary: exactly 12 products (limit)",
        },
        {
          count: 100,
          description: "boundary: 100 products (above limit, should only return 12)",
        },
      ];

      test.each(countTests)(
        "$description → returns limited results",
        async ({ count }) => {
          // Arrange
          const products = Array.from({ length: Math.min(count, 12) }, (_, i) => ({
            _id: `p${i + 1}`,
            name: `Product ${i + 1}`,
            price: 100 * (i + 1),
          }));

          const sort = jest.fn().mockResolvedValue(products);
          const limit = jest.fn().mockReturnValue({ sort });
          const select = jest.fn().mockReturnValue({ limit });
          const populate = jest.fn().mockReturnValue({ select });
          productModel.find.mockReturnValue({ populate });

          // Act
          await getProductController(mockReq, mockRes);

          // Assert
          expect(mockRes.status).toHaveBeenCalledWith(200);
          expect(mockRes.send).toHaveBeenCalledWith({
            success: true,
            counTotal: products.length,
            message: "ALlProducts ",
            products,
          });
        }
      );
    });

    describe("Error Handling", () => {
      it("should return 500 when database query fails", async () => {
        // Arrange
        productModel.find.mockImplementation(() => {
          throw new Error("db down");
        });

        // Act
        await getProductController(mockReq, mockRes);

        // Assert
        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.send).toHaveBeenCalledWith({
          success: false,
          message: "Erorr in getting products",
          error: "db down",
        });
      });

      it("should handle null/undefined category gracefully", async () => {
        // Arrange
        const products = [
          {
            _id: "p1",
            name: "Product 1",
            price: 100,
            category: null, // Orphaned product
          },
        ];

        const sort = jest.fn().mockResolvedValue(products);
        const limit = jest.fn().mockReturnValue({ sort });
        const select = jest.fn().mockReturnValue({ limit });
        const populate = jest.fn().mockReturnValue({ select });
        productModel.find.mockReturnValue({ populate });

        // Act
        await getProductController(mockReq, mockRes);

        // Assert
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.send).toHaveBeenCalledWith({
          success: true,
          counTotal: 1,
          message: "ALlProducts ",
          products,
        });
      });
    });

    describe("Sorting Behavior", () => {
      it("should return products sorted by creation date (newest first)", async () => {
        // Arrange
        const products = [
          {
            _id: "p3",
            name: "Newest Product",
            createdAt: new Date("2025-01-03"),
          },
          {
            _id: "p2",
            name: "Middle Product",
            createdAt: new Date("2025-01-02"),
          },
          {
            _id: "p1",
            name: "Oldest Product",
            createdAt: new Date("2025-01-01"),
          },
        ];

        const sort = jest.fn().mockResolvedValue(products);
        const limit = jest.fn().mockReturnValue({ sort });
        const select = jest.fn().mockReturnValue({ limit });
        const populate = jest.fn().mockReturnValue({ select });
        productModel.find.mockReturnValue({ populate });

        // Act
        await getProductController(mockReq, mockRes);

        // Assert
        expect(sort).toHaveBeenCalledWith({ createdAt: -1 });
        expect(mockRes.send).toHaveBeenCalledWith(
          expect.objectContaining({
            products: expect.arrayContaining([
              expect.objectContaining({ name: "Newest Product" }),
            ]),
          })
        );
      });
    });
  });
});