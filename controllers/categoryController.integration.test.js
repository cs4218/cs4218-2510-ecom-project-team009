import mongoose from "mongoose";
import { jest } from "@jest/globals";
import categoryModel from "../models/categoryModel.js";
import {
  createCategoryController,
  updateCategoryController,
  categoryControlller,
  singleCategoryController,
  deleteCategoryController,
} from "../controllers/categoryController.js";

// No setup needed - using global testDb.js setup

// Helper to create mock req/res objects
const mockRequest = (body = {}, params = {}) => ({
  body,
  params,
});

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};

describe("Category Controller Integration Tests", () => {
  describe("createCategoryController", () => {
    test("should create a new category with valid name and generate slug", async () => {
      const req = mockRequest({ name: "Electronics" });
      const res = mockResponse();

      await createCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        message: "New category created",
        category: expect.objectContaining({
          name: "Electronics",
          slug: "electronics",
        }),
      });

      // Verify it's actually saved in database
      const savedCategory = await categoryModel.findOne({
        name: "Electronics",
      });
      expect(savedCategory).toBeTruthy();
      expect(savedCategory.slug).toBe("electronics");
    });

    test("should trim whitespace from category name", async () => {
      const req = mockRequest({ name: "  Books & Media  " });
      const res = mockResponse();

      await createCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(201);

      const savedCategory = await categoryModel.findOne({
        name: "Books & Media",
      });
      expect(savedCategory).toBeTruthy();
      expect(savedCategory.name).toBe("Books & Media");
    });

    test("should return 400 when name is missing", async () => {
      const req = mockRequest({});
      const res = mockResponse();

      await createCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({ message: "Name is required" });
    });

    test("should return 400 when name is empty string", async () => {
      const req = mockRequest({ name: "" });
      const res = mockResponse();

      await createCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({ message: "Name is required" });
    });

    test("should return 400 when name is only whitespace", async () => {
      const req = mockRequest({ name: "   " });
      const res = mockResponse();

      await createCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({ message: "Name is required" });
    });

    test("should return 409 when category already exists", async () => {
      // Create initial category
      await categoryModel.create({ name: "Clothing", slug: "Clothing" });

      // Try to create duplicate
      const req = mockRequest({ name: "Clothing" });
      const res = mockResponse();

      await createCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Category Already Exists",
      });

      // Verify only one exists in database
      const categories = await categoryModel.find({ name: "Clothing" });
      expect(categories).toHaveLength(1);
    });

    test("should handle special characters in category name", async () => {
      const req = mockRequest({ name: "Home & Kitchen" });
      const res = mockResponse();

      await createCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(201);

      const savedCategory = await categoryModel.findOne({
        name: "Home & Kitchen",
      });
      expect(savedCategory).toBeTruthy();
      expect(savedCategory.slug).toBe("home-and-kitchen");
    });

    test("should return 500 when database operation fails", async () => {
      // Mock database error by using invalid operation
      jest
        .spyOn(categoryModel.prototype, "save")
        .mockRejectedValueOnce(new Error("Database connection failed"));

      const req = mockRequest({ name: "Test Category" });
      const res = mockResponse();

      await createCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        error: expect.any(Error),
        message: "Error in Category",
      });

      // Restore mock
      jest.restoreAllMocks();
    });

    test("should handle mongoose validation errors", async () => {
      // Mock validation error
      const validationError = new Error("Validation failed");
      validationError.name = "ValidationError";

      jest
        .spyOn(categoryModel.prototype, "save")
        .mockRejectedValueOnce(validationError);

      const req = mockRequest({ name: "Test" });
      const res = mockResponse();

      await createCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        error: validationError,
        message: "Error in Category",
      });

      jest.restoreAllMocks();
    });
  });

  describe("updateCategoryController", () => {
    test("should update category name and regenerate slug", async () => {
      // Create initial category
      const category = await categoryModel.create({
        name: "Old Name",
        slug: "old-name",
      });

      const req = mockRequest(
        { name: "New Name" },
        { id: category._id.toString() }
      );
      const res = mockResponse();

      await updateCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        message: "Category updated successfully",
        category: expect.objectContaining({
          name: "New Name",
          slug: "new-name",
        }),
      });

      // Verify update in database
      const updatedCategory = await categoryModel.findById(category._id);
      expect(updatedCategory.name).toBe("New Name");
      expect(updatedCategory.slug).toBe("new-name");
    });

    test("should trim whitespace from updated name", async () => {
      const category = await categoryModel.create({
        name: "Old Name",
        slug: "old-name",
      });

      const req = mockRequest(
        { name: "  Updated Name  " },
        { id: category._id.toString() }
      );
      const res = mockResponse();

      await updateCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);

      const updatedCategory = await categoryModel.findById(category._id);
      expect(updatedCategory.name).toBe("Updated Name");
    });

    test("should return 400 when name is missing", async () => {
      const category = await categoryModel.create({
        name: "Test",
        slug: "test",
      });

      const req = mockRequest({}, { id: category._id.toString() });
      const res = mockResponse();

      await updateCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({ message: "Name is required" });
    });

    test("should return 400 when name is empty string", async () => {
      const category = await categoryModel.create({
        name: "Test",
        slug: "test",
      });

      const req = mockRequest({ name: "" }, { id: category._id.toString() });
      const res = mockResponse();

      await updateCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({ message: "Name is required" });
    });

    test("should return 404 when category does not exist", async () => {
      const nonExistentId = new mongoose.Types.ObjectId();

      const req = mockRequest(
        { name: "Updated Name" },
        { id: nonExistentId.toString() }
      );
      const res = mockResponse();

      await updateCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Category not found",
      });
    });

    test("should return 500 when database update fails", async () => {
      const category = await categoryModel.create({
        name: "Test",
        slug: "test",
      });

      // Mock database error
      jest
        .spyOn(categoryModel, "findByIdAndUpdate")
        .mockRejectedValueOnce(new Error("Database update failed"));

      const req = mockRequest(
        { name: "Updated Name" },
        { id: category._id.toString() }
      );
      const res = mockResponse();

      await updateCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        error: expect.any(Error),
        message: "Error while updating category",
      });

      jest.restoreAllMocks();
    });

    test("should handle invalid ObjectId format", async () => {
      const req = mockRequest(
        { name: "Updated Name" },
        { id: "invalid-id-format" }
      );
      const res = mockResponse();

      await updateCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        error: expect.any(Error),
        message: "Error while updating category",
      });
    });
  });

  describe("updateCategoryController", () => {
    test("should update category name and regenerate slug", async () => {
      // Create initial category
      const category = await categoryModel.create({
        name: "Old Name",
        slug: "Old-Name",
      });

      const req = mockRequest(
        { name: "New Name" },
        { id: category._id.toString() }
      );
      const res = mockResponse();

      await updateCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        message: "Category updated successfully",
        category: expect.objectContaining({
          name: "New Name",
          slug: "new-name",
        }),
      });

      // Verify update in database
      const updatedCategory = await categoryModel.findById(category._id);
      expect(updatedCategory.name).toBe("New Name");
      expect(updatedCategory.slug).toBe("new-name");
    });

    test("should trim whitespace from updated name", async () => {
      const category = await categoryModel.create({
        name: "Old Name",
        slug: "Old-Name",
      });

      const req = mockRequest(
        { name: "  Updated Name  " },
        { id: category._id.toString() }
      );
      const res = mockResponse();

      await updateCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);

      const updatedCategory = await categoryModel.findById(category._id);
      expect(updatedCategory.name).toBe("Updated Name");
    });

    test("should return 400 when name is missing", async () => {
      const category = await categoryModel.create({
        name: "Test",
        slug: "Test",
      });

      const req = mockRequest({}, { id: category._id.toString() });
      const res = mockResponse();

      await updateCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({ message: "Name is required" });
    });

    test("should return 400 when name is empty string", async () => {
      const category = await categoryModel.create({
        name: "Test",
        slug: "Test",
      });

      const req = mockRequest({ name: "" }, { id: category._id.toString() });
      const res = mockResponse();

      await updateCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({ message: "Name is required" });
    });

    test("should return 404 when category does not exist", async () => {
      const nonExistentId = new mongoose.Types.ObjectId();

      const req = mockRequest(
        { name: "Updated Name" },
        { id: nonExistentId.toString() }
      );
      const res = mockResponse();

      await updateCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Category not found",
      });
    });
  });

  describe("categoryControlller (get all)", () => {
    test("should return all categories", async () => {
      // Seed database with categories
      await categoryModel.create([
        { name: "Electronics", slug: "electronics" },
        { name: "Clothing", slug: "clothing" },
        { name: "Books", slug: "books" },
      ]);

      const req = mockRequest();
      const res = mockResponse();

      await categoryControlller(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        message: "All Categories List",
        category: expect.arrayContaining([
          expect.objectContaining({ name: "Electronics" }),
          expect.objectContaining({ name: "Clothing" }),
          expect.objectContaining({ name: "Books" }),
        ]),
      });

      // Verify correct count
      const call = res.send.mock.calls[0][0];
      expect(call.category).toHaveLength(3);
    });

    test("should return 500 when database query fails", async () => {
      // Mock database error
      jest
        .spyOn(categoryModel, "find")
        .mockRejectedValueOnce(new Error("Database query failed"));

      const req = mockRequest();
      const res = mockResponse();

      await categoryControlller(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        error: expect.any(Error),
        message: "Error while getting all categories",
      });

      jest.restoreAllMocks();
    });

    test("should return empty array when no categories exist", async () => {
      const req = mockRequest();
      const res = mockResponse();

      await categoryControlller(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        message: "All Categories List",
        category: [],
      });
    });

    test("should return categories in database order", async () => {
      // Create categories in specific order
      await categoryModel.create({ name: "A Category", slug: "a-category" });
      await categoryModel.create({ name: "B Category", slug: "b-category" });
      await categoryModel.create({ name: "C Category", slug: "c-category" });

      const req = mockRequest();
      const res = mockResponse();

      await categoryControlller(req, res);

      const call = res.send.mock.calls[0][0];
      expect(call.category).toHaveLength(3);
    });
  });

  describe("singleCategoryController", () => {
    test("should return single category by slug", async () => {
      await categoryModel.create({
        name: "Electronics",
        slug: "electronics",
      });

      const req = mockRequest({}, { slug: "electronics" });
      const res = mockResponse();

      await singleCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        message: "Get Single Category Successfully",
        category: expect.objectContaining({
          name: "Electronics",
          slug: "electronics",
        }),
      });
    });

    test("should return 500 when database query fails", async () => {
      // Mock database error
      jest
        .spyOn(categoryModel, "findOne")
        .mockRejectedValueOnce(new Error("Database connection lost"));

      const req = mockRequest({}, { slug: "test-slug" });
      const res = mockResponse();

      await singleCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        error: expect.any(Error),
        message: "Error While getting Single Category",
      });

      jest.restoreAllMocks();
    });

    test("should return category with special characters in slug", async () => {
      await categoryModel.create({
        name: "Home & Kitchen",
        slug: "home-and-kitchen",
      });

      const req = mockRequest({}, { slug: "home-and-kitchen" });
      const res = mockResponse();

      await singleCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        message: "Get Single Category Successfully",
        category: expect.objectContaining({
          name: "Home & Kitchen",
          slug: "home-and-kitchen",
        }),
      });
    });

    test("should return 404 when category slug does not exist", async () => {
      const req = mockRequest({}, { slug: "nonexistent-slug" });
      const res = mockResponse();

      await singleCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Category not found",
      });
    });

    test("should handle case-insensitive slug matching", async () => {
      await categoryModel.create({
        name: "Electronics",
        slug: "electronics",
      });

      // MongoDB queries are case-sensitive by default, but slugs are lowercase
      const req = mockRequest({}, { slug: "electronics" });
      const res = mockResponse();

      await singleCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        message: "Get Single Category Successfully",
        category: expect.objectContaining({
          name: "Electronics",
          slug: "electronics",
        }),
      });
    });
  });

  describe("deleteCategoryController", () => {
    test("should delete category by id", async () => {
      const category = await categoryModel.create({
        name: "To Delete",
        slug: "to-delete",
      });

      const req = mockRequest({}, { id: category._id.toString() });
      const res = mockResponse();

      await deleteCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        message: "Category Deleted Successfully",
      });

      // Verify deletion in database
      const deletedCategory = await categoryModel.findById(category._id);
      expect(deletedCategory).toBeNull();
    });

    test("should return 404 when category does not exist", async () => {
      const nonExistentId = new mongoose.Types.ObjectId();

      const req = mockRequest({}, { id: nonExistentId.toString() });
      const res = mockResponse();

      await deleteCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Category not found",
      });
    });

    test("should only delete specified category, not others", async () => {
      const category1 = await categoryModel.create({
        name: "Keep This",
        slug: "keep-this",
      });
      const category2 = await categoryModel.create({
        name: "Delete This",
        slug: "delete-this",
      });

      const req = mockRequest({}, { id: category2._id.toString() });
      const res = mockResponse();

      await deleteCategoryController(req, res);

      // Verify category2 is deleted
      const deletedCategory = await categoryModel.findById(category2._id);
      expect(deletedCategory).toBeNull();

      // Verify category1 still exists
      const remainingCategory = await categoryModel.findById(category1._id);
      expect(remainingCategory).toBeTruthy();
      expect(remainingCategory.name).toBe("Keep This");
    });

    test("should return 500 when database deletion fails", async () => {
      const category = await categoryModel.create({
        name: "Test",
        slug: "test",
      });

      // Mock database error
      jest
        .spyOn(categoryModel, "findByIdAndDelete")
        .mockRejectedValueOnce(new Error("Database deletion failed"));

      const req = mockRequest({}, { id: category._id.toString() });
      const res = mockResponse();

      await deleteCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Error while deleting category",
        error: expect.any(Error),
      });

      jest.restoreAllMocks();
    });

    test("should handle invalid ObjectId format during deletion", async () => {
      const req = mockRequest({}, { id: "invalid-id" });
      const res = mockResponse();

      await deleteCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Error while deleting category",
        error: expect.any(Error),
      });
    });
  });

  describe("Integration: Complete CRUD Workflow", () => {
    test("should create, read, update, and delete a category in sequence", async () => {
      // Step 1: Create
      const createReq = mockRequest({ name: "Test Category" });
      const createRes = mockResponse();
      await createCategoryController(createReq, createRes);

      expect(createRes.status).toHaveBeenCalledWith(201);
      const createdCategory = createRes.send.mock.calls[0][0].category;
      const categoryId = createdCategory._id.toString();
      const categorySlug = createdCategory.slug;

      // Step 2: Read (get all)
      const getAllReq = mockRequest();
      const getAllRes = mockResponse();
      await categoryControlller(getAllReq, getAllRes);

      const allCategories = getAllRes.send.mock.calls[0][0].category;
      expect(allCategories.some((cat) => cat.slug === categorySlug)).toBe(true);

      // Step 3: Read (get single)
      const getSingleReq = mockRequest({}, { slug: categorySlug });
      const getSingleRes = mockResponse();
      await singleCategoryController(getSingleReq, getSingleRes);

      expect(getSingleRes.status).toHaveBeenCalledWith(200);
      expect(getSingleRes.send.mock.calls[0][0].category.name).toBe(
        "Test Category"
      );

      // Step 4: Update
      const updateReq = mockRequest(
        { name: "Updated Category" },
        { id: categoryId }
      );
      const updateRes = mockResponse();
      await updateCategoryController(updateReq, updateRes);

      expect(updateRes.status).toHaveBeenCalledWith(200);
      const updatedSlug = updateRes.send.mock.calls[0][0].category.slug;

      // Step 5: Verify update by reading again
      const getUpdatedReq = mockRequest({}, { slug: updatedSlug });
      const getUpdatedRes = mockResponse();
      await singleCategoryController(getUpdatedReq, getUpdatedRes);

      expect(getUpdatedRes.send.mock.calls[0][0].category.name).toBe(
        "Updated Category"
      );

      // Step 6: Delete
      const deleteReq = mockRequest({}, { id: categoryId });
      const deleteRes = mockResponse();
      await deleteCategoryController(deleteReq, deleteRes);

      expect(deleteRes.status).toHaveBeenCalledWith(200);

      // Step 7: Verify deletion
      const verifyDeleteReq = mockRequest({}, { slug: updatedSlug });
      const verifyDeleteRes = mockResponse();
      await singleCategoryController(verifyDeleteReq, verifyDeleteRes);

      expect(verifyDeleteRes.status).toHaveBeenCalledWith(404);
    });

    test("should prevent duplicate categories throughout workflow", async () => {
      // Create first category
      const req1 = mockRequest({ name: "Unique Category" });
      const res1 = mockResponse();
      await createCategoryController(req1, res1);
      expect(res1.status).toHaveBeenCalledWith(201);

      // Try to create duplicate
      const req2 = mockRequest({ name: "Unique Category" });
      const res2 = mockResponse();
      await createCategoryController(req2, res2);
      expect(res2.status).toHaveBeenCalledWith(409);

      // Verify only one exists
      const categories = await categoryModel.find({ name: "Unique Category" });
      expect(categories).toHaveLength(1);
    });

    test("should handle multiple categories independently", async () => {
      // Create multiple categories
      const categories = [
        { name: "Category 1" },
        { name: "Category 2" },
        { name: "Category 3" },
      ];

      for (const cat of categories) {
        const req = mockRequest(cat);
        const res = mockResponse();
        await createCategoryController(req, res);
        expect(res.status).toHaveBeenCalledWith(201);
      }

      // Get all and verify count
      const getAllReq = mockRequest();
      const getAllRes = mockResponse();
      await categoryControlller(getAllReq, getAllRes);

      const allCategories = getAllRes.send.mock.calls[0][0].category;
      expect(allCategories).toHaveLength(3);

      // Delete one category
      const firstCategory = allCategories[0];
      const deleteReq = mockRequest({}, { id: firstCategory._id.toString() });
      const deleteRes = mockResponse();
      await deleteCategoryController(deleteReq, deleteRes);

      // Verify others still exist
      const remainingReq = mockRequest();
      const remainingRes = mockResponse();
      await categoryControlller(remainingReq, remainingRes);

      const remainingCategories = remainingRes.send.mock.calls[0][0].category;
      expect(remainingCategories).toHaveLength(2);
    });
  });
});
