import { jest } from "@jest/globals";

// Mock categoryModel
await jest.unstable_mockModule("../models/categoryModel.js", () => {
  const constructor = jest.fn(function (doc) {
    Object.assign(this, doc);
    this.save = jest.fn();
  });

  constructor.find = jest.fn();
  constructor.findOne = jest.fn();
  constructor.findById = jest.fn();
  constructor.findByIdAndUpdate = jest.fn();
  constructor.findByIdAndDelete = jest.fn();

  return { default: constructor };
});

// Mock slugify
await jest.unstable_mockModule("slugify", () => ({
  default: jest.fn((str) => str.toLowerCase().replace(/\s+/g, "-")),
}));

const { default: categoryModel } = await import("../models/categoryModel.js");
const { default: slugify } = await import("slugify");
const {
  createCategoryController,
  updateCategoryController,
  categoryControlller,
  singleCategoryController,
  deleteCategoryController,
} = await import("../controllers/categoryController.js");

describe("Category Controller - Systematic Testing", () => {
  let req, res;
  const originalModelImpl = categoryModel.getMockImplementation();

  beforeEach(() => {
    jest.clearAllMocks();
    categoryModel.mockImplementation(originalModelImpl);

    req = {
      body: {},
      params: {},
    };

    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };

    // Suppress console.log
    jest.spyOn(console, "log").mockImplementation(() => {});
  });
  let logSpy;

  afterEach(() => {
    console.log.mockRestore();
  });

  // ========================================
  // CREATE CATEGORY TESTS
  // ========================================
  describe("createCategoryController", () => {
    // BVA: Input Validation Boundaries
    describe("BVA: Name Input Boundaries", () => {
      it("should reject empty name (boundary: null)", async () => {
        req.body = {};

        await createCategoryController(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({
          message: "Name is required",
        });
      });

      it("should reject undefined name (boundary: undefined)", async () => {
        req.body = { name: undefined };

        await createCategoryController(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({
          message: "Name is required",
        });
      });

      it("should accept single character name (boundary: 1 char)", async () => {
        req.body = { name: "A" };
        categoryModel.findOne.mockResolvedValue(null);
        slugify.mockReturnValue("a");

        const mockSave = jest.fn().mockResolvedValue({
          _id: "123",
          name: "A",
          slug: "a",
        });
        categoryModel.mockImplementation(() => ({
          save: mockSave,
        }));

        await createCategoryController(req, res);

        expect(res.status).toHaveBeenCalledWith(201);
      });

      it("should accept very long name (boundary: large string)", async () => {
        const longName = "A".repeat(1000);
        req.body = { name: longName };
        categoryModel.findOne.mockResolvedValue(null);
        slugify.mockReturnValue(longName.toLowerCase());

        const mockSave = jest.fn().mockResolvedValue({
          _id: "123",
          name: longName,
          slug: longName.toLowerCase(),
        });
        categoryModel.mockImplementation(() => ({
          save: mockSave,
        }));

        await createCategoryController(req, res);

        expect(res.status).toHaveBeenCalledWith(201);
      });
    });

    // EP: Input Partitions
    describe("EP: Name Input Partitions", () => {
      it("should handle valid alphanumeric name (partition: valid)", async () => {
        req.body = { name: "Electronics" };
        categoryModel.findOne.mockResolvedValue(null);
        slugify.mockReturnValue("electronics");

        const mockSave = jest.fn().mockResolvedValue({
          _id: "cat123",
          name: "Electronics",
          slug: "electronics",
        });
        categoryModel.mockImplementation(() => ({
          save: mockSave,
        }));

        await createCategoryController(req, res);

        expect(categoryModel.findOne).toHaveBeenCalledWith({
          name: "Electronics",
        });
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.send).toHaveBeenCalledWith({
          success: true,
          message: "New category created",
          category: expect.objectContaining({
            name: "Electronics",
            slug: "electronics",
          }),
        });
      });

      it("should handle name with spaces (partition: whitespace)", async () => {
        req.body = { name: "Home Appliances" };
        categoryModel.findOne.mockResolvedValue(null);
        slugify.mockReturnValue("home-appliances");

        const mockSave = jest.fn().mockResolvedValue({
          _id: "cat456",
          name: "Home Appliances",
          slug: "home-appliances",
        });
        categoryModel.mockImplementation(() => ({
          save: mockSave,
        }));

        await createCategoryController(req, res);

        expect(res.status).toHaveBeenCalledWith(201);
      });

      it("should handle name with special characters (partition: special chars)", async () => {
        req.body = { name: "Books & Magazines" };
        categoryModel.findOne.mockResolvedValue(null);
        slugify.mockReturnValue("books-magazines");

        const mockSave = jest.fn().mockResolvedValue({
          _id: "cat789",
          name: "Books & Magazines",
          slug: "books-magazines",
        });
        categoryModel.mockImplementation(() => ({
          save: mockSave,
        }));

        await createCategoryController(req, res);

        expect(res.status).toHaveBeenCalledWith(201);
      });

      it("should handle empty string name (partition: invalid empty)", async () => {
        req.body = { name: "" };

        await createCategoryController(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
      });

      it("should handle whitespace-only name (partition: invalid whitespace)", async () => {
        req.body = { name: "   " };
        categoryModel.findOne.mockResolvedValue(null);
        slugify.mockReturnValue("");

        const mockSave = jest.fn().mockResolvedValue({
          _id: "cat999",
          name: "   ",
          slug: "",
        });
        categoryModel.mockImplementation(() => ({
          save: mockSave,
        }));

        await createCategoryController(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
      });
    });

    // EP: Duplicate Check Partitions
    describe("EP: Duplicate Category Partitions", () => {
      it("should handle new category (partition: non-existent)", async () => {
        req.body = { name: "New Category" };
        categoryModel.findOne.mockResolvedValue(null);
        slugify.mockReturnValue("new-category");

        const mockSave = jest.fn().mockResolvedValue({
          _id: "new123",
          name: "New Category",
          slug: "new-category",
        });
        categoryModel.mockImplementation(() => ({
          save: mockSave,
        }));

        await createCategoryController(req, res);

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.send).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            message: "New category created",
          })
        );
      });

      it("should handle duplicate category (partition: existing)", async () => {
        req.body = { name: "Electronics" };
        categoryModel.findOne.mockResolvedValue({
          _id: "existing123",
          name: "Electronics",
          slug: "electronics",
        });

        await createCategoryController(req, res);

        expect(res.status).toHaveBeenCalledWith(409);
        expect(res.send).toHaveBeenCalledWith({
          success: false,
          message: "Category Already Exists",
        });
      });
    });

    // EP: Error Handling Partitions
    describe("EP: Database Error Partitions", () => {
      it("should handle database error during findOne", async () => {
        req.body = { name: "Test" };
        categoryModel.findOne.mockRejectedValue(
          new Error("DB Connection failed")
        );

        await createCategoryController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            message: "Error in Category",
          })
        );
      });

      it("should handle database error during save", async () => {
        req.body = { name: "Test" };
        categoryModel.findOne.mockResolvedValue(null);
        slugify.mockReturnValue("test");

        const mockSave = jest.fn().mockRejectedValue(new Error("Save failed"));
        categoryModel.mockImplementation(() => ({
          save: mockSave,
        }));

        await createCategoryController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            message: "Error in Category",
          })
        );
      });
    });

    // Pairwise: Input Validity × Database State
    describe("Pairwise: Input × Database State", () => {
      const testCases = [
        {
          input: "valid",
          dbState: "empty",
          name: "Electronics",
          existingCategory: null,
          expectedStatus: 201,
        },
        {
          input: "valid",
          dbState: "duplicate",
          name: "Electronics",
          existingCategory: { _id: "123", name: "Electronics" },
          expectedStatus: 409,
        },
        {
          input: "empty",
          dbState: "empty",
          name: "",
          existingCategory: null,
          expectedStatus: 400,
        },
        {
          input: "missing",
          dbState: "empty",
          name: undefined,
          existingCategory: null,
          expectedStatus: 400,
        },
      ];

      testCases.forEach(
        ({ input, dbState, name, existingCategory, expectedStatus }) => {
          it(`should handle ${input} input with ${dbState} database`, async () => {
            req.body = { name };
            categoryModel.findOne.mockResolvedValue(existingCategory);

            if (name && existingCategory === null) {
              slugify.mockReturnValue(name.toLowerCase());
              const mockSave = jest.fn().mockResolvedValue({
                _id: "test123",
                name,
                slug: name.toLowerCase(),
              });
              categoryModel.mockImplementation(() => ({
                save: mockSave,
              }));
            }

            await createCategoryController(req, res);

            expect(res.status).toHaveBeenCalledWith(expectedStatus);
          });
        }
      );
    });
  });

  // ========================================
  // UPDATE CATEGORY TESTS
  // ========================================
  describe("updateCategoryController", () => {
    // BVA: ID Boundaries
    describe("BVA: Category ID Boundaries", () => {
      it("should handle valid MongoDB ObjectId (boundary: valid format)", async () => {
        req.body = { name: "Updated Name" };
        req.params = { id: "507f1f77bcf86cd799439011" };
        slugify.mockReturnValue("updated-name");
        categoryModel.findByIdAndUpdate.mockResolvedValue({
          _id: "507f1f77bcf86cd799439011",
          name: "Updated Name",
          slug: "updated-name",
        });

        await updateCategoryController(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
      });

      it("should handle invalid ObjectId (boundary: invalid format)", async () => {
        req.body = { name: "Updated Name" };
        req.params = { id: "invalid-id" };
        slugify.mockReturnValue("updated-name");
        categoryModel.findByIdAndUpdate.mockRejectedValue(
          new Error("Cast to ObjectId failed")
        );

        await updateCategoryController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
      });

      it("should handle non-existent ID (boundary: valid but not found)", async () => {
        req.body = { name: "Updated Name" };
        req.params = { id: "507f1f77bcf86cd799439099" };
        slugify.mockReturnValue("updated-name");
        categoryModel.findByIdAndUpdate.mockResolvedValue(null);

        await updateCategoryController(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.send).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            message: "Category not found",
          })
        );
      });
    });

    // EP: Name Update Partitions
    describe("EP: Name Update Partitions", () => {
      it("should update with valid name (partition: valid)", async () => {
        req.body = { name: "Updated Electronics" };
        req.params = { id: "507f1f77bcf86cd799439011" };
        slugify.mockReturnValue("updated-electronics");
        categoryModel.findByIdAndUpdate.mockResolvedValue({
          _id: "507f1f77bcf86cd799439011",
          name: "Updated Electronics",
          slug: "updated-electronics",
        });

        await updateCategoryController(req, res);

        expect(categoryModel.findByIdAndUpdate).toHaveBeenCalledWith(
          "507f1f77bcf86cd799439011",
          { name: "Updated Electronics", slug: "updated-electronics" },
          { new: true }
        );
        expect(res.status).toHaveBeenCalledWith(200);
      });

      it("should handle missing name (partition: invalid)", async () => {
        req.body = {};
        req.params = { id: "507f1f77bcf86cd799439011" };
        slugify.mockReturnValue(undefined);
        categoryModel.findByIdAndUpdate.mockResolvedValue({
          _id: "507f1f77bcf86cd799439011",
          name: undefined,
          slug: undefined,
        });

        await updateCategoryController(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
      });

      it("should handle empty string name (partition: invalid empty)", async () => {
        req.body = { name: "" };
        req.params = { id: "507f1f77bcf86cd799439011" };
        slugify.mockReturnValue("");
        categoryModel.findByIdAndUpdate.mockResolvedValue({
          _id: "507f1f77bcf86cd799439011",
          name: "",
          slug: "",
        });

        await updateCategoryController(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
      });
    });

    // Pairwise: ID Validity × Name Validity
    describe("Pairwise: ID × Name Combinations", () => {
      const testCases = [
        {
          idValid: true,
          nameValid: true,
          id: "507f1f77bcf86cd799439011",
          name: "Valid Name",
          shouldSucceed: true,
        },
        {
          idValid: true,
          nameValid: false,
          id: "507f1f77bcf86cd799439011",
          name: "",
          shouldSucceed: false,
        },
        {
          idValid: false,
          nameValid: true,
          id: "invalid",
          name: "Valid Name",
          shouldSucceed: false,
        },
        {
          idValid: false,
          nameValid: false,
          id: "invalid",
          name: "",
          shouldSucceed: false,
        },
      ];

      testCases.forEach(({ idValid, nameValid, id, name, shouldSucceed }) => {
        it(`should handle ${idValid ? "valid" : "invalid"} ID with ${
          nameValid ? "valid" : "invalid"
        } name`, async () => {
          req.body = { name };
          req.params = { id };
          slugify.mockReturnValue(name.toLowerCase());

          if (idValid) {
            categoryModel.findByIdAndUpdate.mockResolvedValue({
              _id: id,
              name,
              slug: name.toLowerCase(),
            });
          } else {
            categoryModel.findByIdAndUpdate.mockRejectedValue(
              new Error("Cast error")
            );
          }

          await updateCategoryController(req, res);

          if (shouldSucceed) {
            expect(res.status).toHaveBeenCalledWith(200);
          } else {
            if (!nameValid) {
              expect(res.status).toHaveBeenCalledWith(400);
            } else {
              expect(res.status).toHaveBeenCalledWith(500);
            }
          }
        });
      });
    });
  });

  // ========================================
  // GET ALL CATEGORIES TESTS
  // ========================================
  describe("categoryControlller", () => {
    // BVA: Result Count Boundaries
    describe("BVA: Category Count Boundaries", () => {
      it("should handle zero categories (boundary: empty)", async () => {
        categoryModel.find.mockResolvedValue([]);

        await categoryControlller(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
          success: true,
          message: "All Categories List",
          category: [],
        });
      });

      it("should handle single category (boundary: 1)", async () => {
        const categories = [
          { _id: "1", name: "Electronics", slug: "electronics" },
        ];
        categoryModel.find.mockResolvedValue(categories);

        await categoryControlller(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith(
          expect.objectContaining({
            category: categories,
          })
        );
      });

      it("should handle many categories (boundary: large N)", async () => {
        const categories = Array.from({ length: 100 }, (_, i) => ({
          _id: `${i}`,
          name: `Category ${i}`,
          slug: `category-${i}`,
        }));
        categoryModel.find.mockResolvedValue(categories);

        await categoryControlller(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith(
          expect.objectContaining({
            category: categories,
          })
        );
      });
    });

    // EP: Database State Partitions
    describe("EP: Database State", () => {
      it("should handle successful fetch (partition: success)", async () => {
        const categories = [
          { _id: "1", name: "Electronics", slug: "electronics" },
          { _id: "2", name: "Clothing", slug: "clothing" },
        ];
        categoryModel.find.mockResolvedValue(categories);

        await categoryControlller(req, res);

        expect(categoryModel.find).toHaveBeenCalledWith({});
        expect(res.status).toHaveBeenCalledWith(200);
      });

      it("should handle database error (partition: error)", async () => {
        categoryModel.find.mockRejectedValue(new Error("Database error"));

        await categoryControlller(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            message: "Error while getting all categories",
          })
        );
      });
    });
  });

  // ========================================
  // GET SINGLE CATEGORY TESTS
  // ========================================
  describe("singleCategoryController", () => {
    // BVA: Slug Boundaries
    describe("BVA: Slug Input Boundaries", () => {
      it("should handle single character slug (boundary: min)", async () => {
        req.params = { slug: "a" };
        categoryModel.findOne.mockResolvedValue({
          _id: "1",
          name: "A",
          slug: "a",
        });

        await singleCategoryController(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
      });

      it("should handle long slug (boundary: large)", async () => {
        const longSlug = "a".repeat(200);
        req.params = { slug: longSlug };
        categoryModel.findOne.mockResolvedValue({
          _id: "1",
          name: "Long Name",
          slug: longSlug,
        });

        await singleCategoryController(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
      });
    });

    // EP: Category Existence Partitions
    describe("EP: Category Existence", () => {
      it("should handle existing category (partition: found)", async () => {
        req.params = { slug: "electronics" };
        categoryModel.findOne.mockResolvedValue({
          _id: "cat123",
          name: "Electronics",
          slug: "electronics",
        });

        await singleCategoryController(req, res);

        expect(categoryModel.findOne).toHaveBeenCalledWith({
          slug: "electronics",
        });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
          success: true,
          message: "Get Single Category Successfully",
          category: expect.objectContaining({
            name: "Electronics",
          }),
        });
      });

      it("should handle non-existent category (partition: not found)", async () => {
        req.params = { slug: "non-existent" };
        categoryModel.findOne.mockResolvedValue(null);

        await singleCategoryController(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.send).toHaveBeenCalledWith({
          success: false,
          message: "Category not found",
        });
      });

      it("should handle unexpected error (partition: DB throws)", async () => {
        const fakeError = new Error("DB is down");
        categoryModel.findOne.mockRejectedValue(fakeError);

        req.params = { slug: "any-slug" };
        const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
        await singleCategoryController(req, res);

        expect(logSpy).toHaveBeenCalledWith(fakeError);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({
          success: false,
          error: fakeError,
          message: "Error While getting Single Category",
        });
      });
    });
  });

  // ========================================
  // DELETE CATEGORY TESTS
  // ========================================
  describe("deleteCategoryController", () => {
    // BVA: ID Boundaries
    describe("BVA: Delete ID Boundaries", () => {
      it("should handle valid ID (boundary: valid)", async () => {
        req.params = { id: "507f1f77bcf86cd799439011" };
        categoryModel.findByIdAndDelete.mockResolvedValue({
          _id: "507f1f77bcf86cd799439011",
          name: "Deleted",
        });

        await deleteCategoryController(req, res);

        expect(categoryModel.findByIdAndDelete).toHaveBeenCalledWith(
          "507f1f77bcf86cd799439011"
        );
        expect(res.status).toHaveBeenCalledWith(200);
      });

      it("should handle invalid ID format (boundary: invalid)", async () => {
        req.params = { id: "invalid-id-123" };
        categoryModel.findByIdAndDelete.mockRejectedValue(
          new Error("Cast to ObjectId failed")
        );

        await deleteCategoryController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
      });

      it("should handle non-existent ID (boundary: valid but not found)", async () => {
        req.params = { id: "507f1f77bcf86cd799439099" };
        categoryModel.findByIdAndDelete.mockResolvedValue(null);

        await deleteCategoryController(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.send).toHaveBeenCalledWith({
          success: false,
          message: "Category not found",
        });
      });
    });

    // EP: Delete Operation Partitions
    describe("EP: Delete Operation States", () => {
      it("should delete existing category (partition: success)", async () => {
        req.params = { id: "507f1f77bcf86cd799439011" };
        categoryModel.findByIdAndDelete.mockResolvedValue({
          _id: "507f1f77bcf86cd799439011",
          name: "Electronics",
        });

        await deleteCategoryController(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
          success: true,
          message: "Category Deleted Successfully",
        });
      });

      it("should handle database error (partition: error)", async () => {
        req.params = { id: "507f1f77bcf86cd799439011" };
        categoryModel.findByIdAndDelete.mockRejectedValue(
          new Error("Database error")
        );

        await deleteCategoryController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            message: "Error while deleting category",
          })
        );
      });
    });
  });
});
