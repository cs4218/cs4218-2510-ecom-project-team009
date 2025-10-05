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

await jest.unstable_mockModule("braintree", () => {
  const mockGenerate = jest.fn();
  const mockSale = jest.fn();
  
  return {
    default: {
      BraintreeGateway: jest.fn(function () {
        this.clientToken = {
          generate: mockGenerate,
        };
        this.transaction = {
          sale: mockSale,
        };
      }),
      Environment: {
        Sandbox: "sandbox",
      },
    },
  };
});

// Import mocked dependencies
const { default: productModel } = await import("../models/productModel.js");
const { default: categoryModel } = await import("../models/categoryModel.js");
const { default: orderModel } = await import("../models/orderModel.js");
const { default: fs } = await import("fs");
const { default: slugify } = await import("slugify");
const { default: braintree } = await import("braintree");

// Helper to get the gateway instance's mocks
const getMockGateway = () => {
  const GatewayConstructor = braintree.BraintreeGateway;
  const instance = GatewayConstructor.mock.results[0]?.value || new GatewayConstructor();
  return instance;
};

// Import controllers
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

describe("Product Controller", () => {
  let mockReq, mockRes;

  const originalImpl = productModel.getMockImplementation();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset gateway mocks
    const gateway = getMockGateway();
    gateway.clientToken.generate.mockReset();
    gateway.transaction.sale.mockReset();

    // Restore the default constructor
    productModel.mockImplementation(originalImpl);

    // Reset fs.readFileSync to default behavior
    fs.readFileSync.mockReturnValue(Buffer.from("photo-data"));

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

      validationTests.forEach(({ missingField, expectedMessage }) => {
        it(`should return 500 and error when ${missingField} is missing`, async () => {
          // Arrange
          mockReq.fields = {
            name: "Test Product",
            description: "Test Description",
            price: 100,
            category: "cat-1",
            quantity: 10,
            shipping: false,
          };
          
          // Remove the field we're testing
          delete mockReq.fields[missingField];

          // Act
          await createProductController(mockReq, mockRes);

          // Assert
          expect(mockRes.status).toHaveBeenCalledWith(400); // Changed from 500
          expect(mockRes.send).toHaveBeenCalledWith({
            error: expectedMessage,
          });
        });
      });

      it("should return 400 and error when photo is missing", async () => {
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

        // Act
        await createProductController(mockReq, mockRes);

        // Assert
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.send).toHaveBeenCalledWith({
          message: "Photo is required",
        });
      });

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
          error: "Photo size must be <= 1mb", // Changed from "photo is Required and should be less then 1mb"
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
              this.save = jest.fn().mockResolvedValue(this);
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
              error: "Photo size must be <= 1mb", // Changed from "photo is Required and should be less then 1mb"
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

        let capturedProduct;
        productModel.mockImplementation(function (doc) {
          Object.assign(this, doc);
          this.photo = {
            data: null,
            contentType: null,
          };
          this.save = jest.fn().mockResolvedValue(this);
          capturedProduct = this;
        });

        // Act
        await createProductController(mockReq, mockRes);

        // Assert
        expect(slugify).toHaveBeenCalledWith("Test Product");
        expect(fs.readFileSync).toHaveBeenCalledWith("/tmp/photo.jpg");
        
        expect(capturedProduct.photo.contentType).toBe("image/jpeg");
        expect(capturedProduct.photo.data).toEqual(Buffer.from("photo-data"));
        expect(mockRes.status).toHaveBeenCalledWith(201);
        expect(mockRes.send).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            message: "Product Created Successfully",
            products: expect.objectContaining({
              name: "Test Product",
              slug: "test-product",
              photo: expect.objectContaining({
                contentType: "image/jpeg",
                data: Buffer.from("photo-data"),
              }),
            }),
          })
        );
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

        productModel.mockImplementation(function (doc) {
          Object.assign(this, doc);
          this.photo = { data: null, contentType: null };
          this.save = jest.fn().mockResolvedValue(this);
        });

        // Act
        await createProductController(mockReq, mockRes);

        // Assert
        expect(fs.readFileSync).not.toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(400); // Changed from 201 - photo is now required
        expect(mockRes.send).toHaveBeenCalledWith({
          message: "Photo is required", // Changed to match new validation
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
        mockReq.files = {
          photo: {
            size: 500000,
            path: "/tmp/photo.jpg",
            type: "image/jpeg",
          },
        };

        productModel.mockImplementation(function () {
          this.save = jest.fn().mockRejectedValue(new Error("Save failed"));
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

        // Mock readFileSync to throw ONLY for this test
        fs.readFileSync.mockImplementationOnce(() => {
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
        
        // Reset mock back to default for subsequent tests
        fs.readFileSync.mockReturnValue(Buffer.from("photo-data"));
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
          message: "Error in getting products",
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

  // ============================================================================
  // GET SINGLE PRODUCT CONTROLLER TESTS
  // ============================================================================
  describe("Get Single Product Controller", () => {
    it("should return single product by slug", async () => {
      const product = {
        _id: "p1",
        slug: "test-product",
        name: "Test Product",
        price: 100,
        category: { _id: "c1", name: "Category 1" },
      };

      const populate = jest.fn().mockResolvedValue(product);
      const select = jest.fn().mockReturnValue({ populate });
      productModel.findOne.mockReturnValue({ select });

      mockReq.params = { slug: "test-product" };

      await getSingleProductController(mockReq, mockRes);

      expect(productModel.findOne).toHaveBeenCalledWith({ slug: "test-product" });
      expect(select).toHaveBeenCalledWith("-photo");
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: true,
        message: "Single Product Fetched",
        product,
      });
    });

    it("should handle errors when fetching single product", async () => {
      productModel.findOne.mockImplementation(() => {
        throw new Error("Database error");
      });

      mockReq.params = { slug: "test-product" };

      await getSingleProductController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Eror while getitng single product",
        error: expect.any(Error),
      });
    });
  });

  // ============================================================================
  // PRODUCT PHOTO CONTROLLER TESTS
  // ============================================================================
  describe("Product Photo Controller", () => {
    it("should return product photo", async () => {
      const product = {
        photo: {
          data: Buffer.from("photo-data"),
          contentType: "image/jpeg",
        },
      };

      const select = jest.fn().mockResolvedValue(product);
      productModel.findById.mockReturnValue({ select });

      mockReq.params = { pid: "p1" };

      await productPhotoController(mockReq, mockRes);

      expect(productModel.findById).toHaveBeenCalledWith("p1");
      expect(select).toHaveBeenCalledWith("photo");
      expect(mockRes.set).toHaveBeenCalledWith("Content-type", "image/jpeg");
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.send).toHaveBeenCalledWith(Buffer.from("photo-data"));
    });

    it("should handle missing photo data", async () => {
      const product = {
        photo: { data: null, contentType: null },
      };

      const select = jest.fn().mockResolvedValue(product);
      productModel.findById.mockReturnValue({ select });

      mockReq.params = { pid: "p1" };

      await productPhotoController(mockReq, mockRes);

      expect(mockRes.send).not.toHaveBeenCalledWith(expect.any(Buffer));
    });

    it("should handle errors when fetching photo", async () => {
      productModel.findById.mockImplementation(() => {
        throw new Error("Database error");
      });

      mockReq.params = { pid: "p1" };

      await productPhotoController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Error while getting photo",
        error: expect.any(Error),
      });
    });
  });

  // ============================================================================
  // DELETE PRODUCT CONTROLLER TESTS
  // ============================================================================
  describe("Delete Product Controller", () => {
    it("should delete product successfully", async () => {
      const select = jest.fn().mockResolvedValue({ _id: "p1" });
      productModel.findByIdAndDelete.mockReturnValue({ select });

      mockReq.params = { pid: "p1" };

      await deleteProductController(mockReq, mockRes);

      expect(productModel.findByIdAndDelete).toHaveBeenCalledWith("p1");
      expect(select).toHaveBeenCalledWith("-photo");
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: true,
        message: "Product Deleted successfully",
      });
    });

    it("should handle errors when deleting product", async () => {
      productModel.findByIdAndDelete.mockImplementation(() => {
        throw new Error("Database error");
      });

      mockReq.params = { pid: "p1" };

      await deleteProductController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Error while deleting product",
        error: expect.any(Error),
      });
    });
  });

  // ============================================================================
  // UPDATE PRODUCT CONTROLLER TESTS
  // ============================================================================
  describe("Update Product Controller", () => {
    it("should update product with photo", async () => {
      mockReq.fields = {
        name: "Updated Product",
        description: "Updated Description",
        price: 200,
        category: "cat-1",
        quantity: 20,
        shipping: true,
      };
      mockReq.files = {
        photo: {
          size: 500000,
          path: "/tmp/photo.jpg",
          type: "image/jpeg",
        },
      };
      mockReq.params = { pid: "p1" };

      // Create product with EMPTY photo that can be mutated
      const updatedProduct = {
        _id: "p1",
        name: "Updated Product",
        slug: "updated-product",
        description: "Updated Description",
        price: 200,
        category: "cat-1",
        quantity: 20,
        shipping: true,
        photo: {
          data: null,  // ← Empty, will be set by controller
          contentType: null,  // ← Empty, will be set by controller
        },
        save: jest.fn().mockResolvedValue(true),
      };

      productModel.findByIdAndUpdate.mockResolvedValue(updatedProduct);

      await updateProductController(mockReq, mockRes);

      // Verify the controller mutated the photo object
      expect(updatedProduct.photo.data).toEqual(Buffer.from("photo-data"));
      expect(updatedProduct.photo.contentType).toBe("image/jpeg");
      
      expect(productModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "p1",
        expect.objectContaining({ slug: "updated-product" }),
        { new: true }
      );
      expect(updatedProduct.save).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Product Updated Successfully",
        })
      );
    });

    it("should update product without photo", async () => {
      mockReq.fields = {
        name: "Updated Product",
        description: "Updated Description",
        price: 200,
        category: "cat-1",
        quantity: 20,
        shipping: true,
      };
      mockReq.files = {}; // No photo
      mockReq.params = { pid: "p1" };

      const updatedProduct = {
        _id: "p1",
        name: "Updated Product",
        slug: "updated-product",
        photo: { data: null, contentType: null },
        save: jest.fn().mockResolvedValue(true),
      };

      productModel.findByIdAndUpdate.mockResolvedValue(updatedProduct);

      await updateProductController(mockReq, mockRes);

      expect(fs.readFileSync).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    it("should validate required fields on update", async () => {
      mockReq.fields = {
        description: "Updated Description",
        price: 200,
        category: "cat-1",
        quantity: 20,
      };
      mockReq.params = { pid: "p1" };

      await updateProductController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.send).toHaveBeenCalledWith({
        error: "Name is Required",
      });
    });

    const updateValidationTests = [
      { missingField: "description", expectedMessage: "Description is Required" },
      { missingField: "price", expectedMessage: "Price is Required" },
      { missingField: "category", expectedMessage: "Category is Required" },
      { missingField: "quantity", expectedMessage: "Quantity is Required" },
    ];

    updateValidationTests.forEach(({ missingField, expectedMessage }) => {
      it(`should return 500 when ${missingField} is missing on update`, async () => {
        mockReq.fields = {
          name: "Updated Product",
          description: "Updated Description",
          price: 200,
          category: "cat-1",
          quantity: 20,
        };
        delete mockReq.fields[missingField];
        mockReq.params = { pid: "p1" };

        await updateProductController(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.send).toHaveBeenCalledWith({
          error: expectedMessage,
        });
      });
    });

    it("should validate photo size on update", async () => {
      mockReq.fields = {
        name: "Updated Product",
        description: "Updated Description",
        price: 200,
        category: "cat-1",
        quantity: 20,
        shipping: true,
      };
      mockReq.files = {
        photo: {
          size: 1500000, // 1.5MB
          path: "/tmp/photo.jpg",
          type: "image/jpeg",
        },
      };
      mockReq.params = { pid: "p1" };

      await updateProductController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.send).toHaveBeenCalledWith({
        error: "Photo size must be <= 1mb",
      });
    });

    it("should handle errors when updating product", async () => {
      mockReq.fields = {
        name: "Updated Product",
        description: "Updated Description",
        price: 200,
        category: "cat-1",
        quantity: 20,
        shipping: true,
      };
      mockReq.params = { pid: "p1" };

      productModel.findByIdAndUpdate.mockImplementation(() => {
        throw new Error("Database error");
      });

      await updateProductController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: false,
        error: expect.any(Error),
        message: "Error in Update product",
      });
    });

    it("should set photo contentType when updating with photo", async () => {
      mockReq.fields = {
        name: "Updated Product",
        description: "Updated Description",
        price: 200,
        category: "cat-1",
        quantity: 20,
        shipping: true,
      };
      mockReq.files = {
        photo: {
          size: 500000,
          path: "/tmp/photo.jpg",
          type: "image/png",
        },
      };
      mockReq.params = { pid: "p1" };

      // Create a mutable product object with empty photo
      const productInstance = {
        _id: "p1",
        name: "Updated Product",
        slug: "updated-product",
        photo: {
          data: null, 
          contentType: null, 
        },
        save: jest.fn().mockResolvedValue(true),
      };
      
      productModel.findByIdAndUpdate.mockResolvedValue(productInstance);

      await updateProductController(mockReq, mockRes);

      expect(productInstance.photo.data).toEqual(Buffer.from("photo-data"));
      expect(productInstance.photo.contentType).toBe("image/png");
      expect(productInstance.save).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });
  });

  // ============================================================================
  // PRODUCT FILTERS CONTROLLER TESTS
  // ============================================================================
  describe("Product Filters Controller", () => {
    it("should filter products by category and price range", async () => {
      mockReq.body = {
        checked: ["cat-1", "cat-2"],
        radio: [100, 500],
      };

      const products = [{ _id: "p1", name: "Product 1", price: 150 }];
      productModel.find.mockResolvedValue(products);

      await productFiltersController(mockReq, mockRes);

      expect(productModel.find).toHaveBeenCalledWith({
        category: ["cat-1", "cat-2"],
        price: { $gte: 100, $lte: 500 },
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: true,
        products,
      });
    });

    it("should filter by category only", async () => {
      mockReq.body = {
        checked: ["cat-1"],
        radio: [],
      };

      productModel.find.mockResolvedValue([]);

      await productFiltersController(mockReq, mockRes);

      expect(productModel.find).toHaveBeenCalledWith({
        category: ["cat-1"],
      });
    });

    it("should filter by price range only", async () => {
      mockReq.body = {
        checked: [],
        radio: [100, 500],
      };

      const products = [{ _id: "p1", name: "Product 1", price: 150 }];
      productModel.find.mockResolvedValue(products);

      await productFiltersController(mockReq, mockRes);

      expect(productModel.find).toHaveBeenCalledWith({
        price: { $gte: 100, $lte: 500 },
      });
    });

    it("should handle empty filters", async () => {
      mockReq.body = {
        checked: [],
        radio: [],
      };

      const products = [];
      productModel.find.mockResolvedValue(products);

      await productFiltersController(mockReq, mockRes);

      expect(productModel.find).toHaveBeenCalledWith({});
    });

    it("should handle errors when filtering products", async () => {
      mockReq.body = {
        checked: ["cat-1"],
        radio: [100, 500],
      };

      productModel.find.mockImplementation(() => {
        throw new Error("Database error");
      });

      await productFiltersController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Error WHile Filtering Products",
        error: expect.any(Error),
      });
    });
  });

  // ============================================================================
  // PRODUCT COUNT CONTROLLER TESTS
  // ============================================================================
  describe("Product Count Controller", () => {
    it("should return total product count", async () => {
      const estimatedDocumentCount = jest.fn().mockResolvedValue(42);
      productModel.find.mockReturnValue({ estimatedDocumentCount });

      await productCountController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: true,
        total: 42,
      });
    });

    it("should handle errors when counting products", async () => {
      productModel.find.mockImplementation(() => {
        throw new Error("Database error");
      });

      await productCountController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.send).toHaveBeenCalledWith({
        message: "Error in product count",
        error: expect.any(Error),
        success: false,
      });
    });
  });

  // ============================================================================
  // PRODUCT LIST CONTROLLER TESTS
  // ============================================================================
  describe("Product List Controller", () => {
    it("should return paginated products", async () => {
      mockReq.params = { page: "2" };

      const products = [{ _id: "p1", name: "Product 1" }];
      const sort = jest.fn().mockResolvedValue(products);
      const limit = jest.fn().mockReturnValue({ sort });
      const skip = jest.fn().mockReturnValue({ limit });
      const select = jest.fn().mockReturnValue({ skip });
      productModel.find.mockReturnValue({ select });

      await productListController(mockReq, mockRes);

      expect(skip).toHaveBeenCalledWith(6);
      expect(limit).toHaveBeenCalledWith(6);
      expect(sort).toHaveBeenCalledWith({ createdAt: -1 });
    });

    it("should default to page 1 when no page parameter", async () => {
      mockReq.params = {}; // No page parameter

      const products = [{ _id: "p1", name: "Product 1" }];
      const sort = jest.fn().mockResolvedValue(products);
      const limit = jest.fn().mockReturnValue({ sort });
      const skip = jest.fn().mockReturnValue({ limit });
      const select = jest.fn().mockReturnValue({ skip });
      productModel.find.mockReturnValue({ select });

      await productListController(mockReq, mockRes);

      expect(skip).toHaveBeenCalledWith(0);
      expect(limit).toHaveBeenCalledWith(6);
    });

    it("should handle errors when listing products", async () => {
      mockReq.params = { page: "1" };

      productModel.find.mockImplementation(() => {
        throw new Error("Database error");
      });

      await productListController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: false,
        message: "error in per page ctrl",
        error: expect.any(Error),
      });
    });
  });

  // ============================================================================
  // SEARCH PRODUCT CONTROLLER TESTS
  // ============================================================================
  describe("Search Product Controller", () => {
    it("should search products by keyword", async () => {
      mockReq.params = { keyword: "laptop" };

      const products = [{ _id: "p1", name: "Laptop Pro" }];
      const select = jest.fn().mockResolvedValue(products);
      productModel.find.mockReturnValue({ select });

      await searchProductController(mockReq, mockRes);

      expect(productModel.find).toHaveBeenCalledWith({
        $or: [
          { name: { $regex: "laptop", $options: "i" } },
          { description: { $regex: "laptop", $options: "i" } },
        ],
      });
      expect(mockRes.json).toHaveBeenCalledWith(products);
    });

    it("should handle errors when searching products", async () => {
      mockReq.params = { keyword: "laptop" };

      productModel.find.mockImplementation(() => {
        throw new Error("Database error");
      });

      await searchProductController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Error In Search Product API",
        error: expect.any(Error),
      });
    });
  });

  // ============================================================================
  // RELATED PRODUCT CONTROLLER TESTS
  // ============================================================================
  describe("Related Product Controller", () => {
    it("should return related products", async () => {
      mockReq.params = { pid: "p1", cid: "cat-1" };

      const products = [{ _id: "p2", name: "Related Product" }];
      const populate = jest.fn().mockResolvedValue(products);
      const limit = jest.fn().mockReturnValue({ populate });
      const select = jest.fn().mockReturnValue({ limit });
      productModel.find.mockReturnValue({ select });

      await relatedProductController(mockReq, mockRes);

      expect(productModel.find).toHaveBeenCalledWith({
        category: "cat-1",
        _id: { $ne: "p1" },
      });
      expect(limit).toHaveBeenCalledWith(3);
    });

    it("should handle errors when fetching related products", async () => {
      mockReq.params = { pid: "p1", cid: "cat-1" };

      productModel.find.mockImplementation(() => {
        throw new Error("Database error");
      });

      await relatedProductController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: false,
        message: "error while geting related product",
        error: expect.any(Error),
      });
    });
  });

  // ============================================================================
  // PRODUCT CATEGORY CONTROLLER TESTS
  // ============================================================================
  describe("Product Category Controller", () => {
    it("should return products by category", async () => {
      mockReq.params = { slug: "electronics" };

      const category = { _id: "cat-1", slug: "electronics" };
      categoryModel.findOne.mockResolvedValue(category);

      const products = [{ _id: "p1", name: "Product 1" }];
      const populate = jest.fn().mockResolvedValue(products);
      productModel.find.mockReturnValue({ populate });

      await productCategoryController(mockReq, mockRes);

      expect(categoryModel.findOne).toHaveBeenCalledWith({ slug: "electronics" });
      expect(productModel.find).toHaveBeenCalledWith({ category });
    });

    it("should handle errors when fetching products by category", async () => {
      mockReq.params = { slug: "electronics" };

      categoryModel.findOne.mockImplementation(() => {
        throw new Error("Database error");
      });

      await productCategoryController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: false,
        error: expect.any(Error),
        message: "Error While Getting products",
      });
    });
  });

  // ============================================================================
  // BRAINTREE TOKEN CONTROLLER TESTS
  // ============================================================================
  describe("Braintree Token Controller", () => {
    it("should generate client token", async () => {
      const mockResponse = { clientToken: "token123" };
      const gateway = getMockGateway();
      
      gateway.clientToken.generate.mockImplementation((opts, callback) => {
        callback(null, mockResponse);
      });

      await braintreeTokenController(mockReq, mockRes);

      expect(mockRes.send).toHaveBeenCalledWith(mockResponse);
    });

    it("should send 500 when Braintree API returns error in callback", async () => {
      const mockError = new Error("Braintree API error");
      const gateway = getMockGateway();
      
      gateway.clientToken.generate.mockImplementation((opts, callback) => {
        callback(mockError, null);
      });

      await braintreeTokenController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.send).toHaveBeenCalledWith(mockError);
    });

    it("should log error when gateway.clientToken.generate throws synchronously", async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      const gateway = getMockGateway();
      
      gateway.clientToken.generate.mockImplementation(() => {
        throw new Error("Gateway not initialized");
      });

      await braintreeTokenController(mockReq, mockRes);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.any(Error));
      consoleLogSpy.mockRestore();
    });
  });

  // ============================================================================
  // BRAINTREE PAYMENT CONTROLLER TESTS
  // ============================================================================
  describe("Braintree Payment Controller", () => {
    it("should process payment successfully", async () => {
      mockReq.body = {
        nonce: "nonce123",
        cart: [{ price: 100 }, { price: 200 }],
      };
      mockReq.user = { _id: "user1" };

      const gateway = getMockGateway();
      gateway.transaction.sale.mockImplementation((opts, callback) => {
        callback(null, { success: true, transaction: { id: "txn123" } });
      });

      const mockOrder = new orderModel({});
      mockOrder.save.mockResolvedValue(true);

      await brainTreePaymentController(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({ ok: true });
    });

    it("should send 500 when payment transaction fails in callback", async () => {
      mockReq.body = {
        nonce: "nonce123",
        cart: [{ price: 100 }],
      };
      mockReq.user = { _id: "user1" };

      const mockError = new Error("Payment declined");
      const gateway = getMockGateway();
      
      gateway.transaction.sale.mockImplementation((opts, callback) => {
        callback(mockError, null);
      });

      await brainTreePaymentController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.send).toHaveBeenCalledWith(mockError);
    });

    it("should log error when transaction.sale throws synchronously", async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      
      mockReq.body = {
        nonce: "nonce123",
        cart: [{ price: 100 }],
      };
      mockReq.user = { _id: "user1" };

      const gateway = getMockGateway();
      gateway.transaction.sale.mockImplementation(() => {
        throw new Error("Transaction service unavailable");
      });

      await brainTreePaymentController(mockReq, mockRes);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.any(Error));
      consoleLogSpy.mockRestore();
    });

    it("should calculate total correctly with multiple items", async () => {
      mockReq.body = {
        nonce: "nonce123",
        cart: [
          { price: 100 },
          { price: 200 },
          { price: 150 },
        ],
      };
      mockReq.user = { _id: "user1" };

      const gateway = getMockGateway();
      gateway.transaction.sale.mockImplementation((opts, callback) => {
        expect(opts.amount).toBe(450);
        callback(null, { success: true, transaction: { id: "txn123" } });
      });

      const mockOrder = new orderModel({});
      mockOrder.save.mockResolvedValue(true);

      await brainTreePaymentController(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({ ok: true });
    });
  });
});