import React from "react";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axios from "axios";
import { Route } from "react-router-dom";
import { renderTopDown } from "../../test-utils/renderTopDown";
import { cleanupAuth } from "../../test-utils/renderWithProviders";
import CreateCategory from "./CreateCategory";
import toast from "react-hot-toast";

// ==================== MOCKING STRATEGY ====================
// Mock ONLY external APIs and toast (NOT child components!)
jest.mock("axios");
jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
  Toaster: () => <div data-testid="toaster" />,
}));
jest.mock("../../hooks/useCategory", () => ({
  __esModule: true,
  default: jest.fn(() => []),
}));

// ==================== MOCK PAGES FOR ROUTING ====================
const AdminDashboard = () => <div>Admin Dashboard</div>;

// ==================== RENDER HELPER ====================
// Use renderTopDown with REAL providers and routing
const renderCreateCategoryRoutes = (options) =>
  renderTopDown(
    <>
      <Route path="/admin/dashboard" element={<AdminDashboard />} />
      <Route path="/admin/create-category" element={<CreateCategory />} />
    </>,
    options
  );

const createUser = () =>
  typeof userEvent.setup === "function" ? userEvent.setup() : userEvent;

// ==================== INTEGRATION TESTS ====================
describe("CreateCategory Integration (top-down)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    cleanupAuth();
    localStorage.clear();
    toast.success = jest.fn();
    toast.error = jest.fn();

    // Default mock for initial category fetch
    axios.get.mockResolvedValue({
      data: { success: true, category: [] },
    });
  });

  afterEach(() => {
    cleanupAuth();
    localStorage.clear();
    jest.clearAllMocks();
  });

  // ==================== TEST 1: HAPPY PATH ====================
  it("creates category successfully and refreshes list", async () => {
    // Arrange: Mock existing categories and successful create
    const existingCategories = [
      { _id: "1", name: "Electronics", slug: "electronics" },
    ];
    const newCategory = { _id: "2", name: "Books", slug: "books" };

    axios.get
      .mockResolvedValueOnce({
        // Initial fetch on mount
        data: { success: true, category: existingCategories },
      })
      .mockResolvedValueOnce({
        // Refetch after create
        data: {
          success: true,
          category: [...existingCategories, newCategory],
        },
      });

    axios.post.mockResolvedValueOnce({
      data: {
        success: true,
        message: "Category created successfully",
        category: newCategory,
      },
    });

    // Act: Render as admin user
    renderCreateCategoryRoutes({
      initialAuthState: { user: { role: 1, name: "Admin" }, token: "admin-token" },
      route: "/admin/create-category",
    });

    const user = createUser();

    // Wait for initial data load
    await waitFor(() => {
      expect(screen.getByText("Electronics")).toBeInTheDocument();
    });

    // User creates new category
    const categoryInput = screen.getByPlaceholderText(/enter new category/i);
    const submitButton = screen.getByRole("button", { name: /submit/i });

    await user.type(categoryInput, "Books");
    await user.click(submitButton);

    // Assert: API called correctly
    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        "/api/v1/category/create-category",
        { name: "Books" }
      );
    });

    // Assert: Success toast shown
    expect(toast.success).toHaveBeenCalledWith("Books is created");

    // Assert: List refreshed (second axios.get call)
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledTimes(2);
    });

    // Assert: New category appears in list
    await waitFor(() => {
      expect(screen.getByText("Books")).toBeInTheDocument();
    });
  });

  // ==================== TEST 2: API NETWORK ERROR ====================
  it("shows error toast when API request fails", async () => {
    // Arrange: Mock initial data and network error
    axios.get.mockResolvedValueOnce({
      data: { success: true, category: [] },
    });

    axios.post.mockRejectedValueOnce(new Error("Network Error"));

    // Act: Render as admin
    renderCreateCategoryRoutes({
      initialAuthState: { user: { role: 1 }, token: "admin-token" },
      route: "/admin/create-category",
    });

    const user = createUser();

    // Wait for initial load
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalled();
    });

    // User attempts to create category
    const categoryInput = screen.getByPlaceholderText(/enter new category/i);
    const submitButton = screen.getByRole("button", { name: /submit/i });

    await user.type(categoryInput, "Test Category");
    await user.click(submitButton);

    // Assert: Error toast shown
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("somthing went wrong in input form");
    });

    // Assert: User stays on same page (no navigation)
    expect(screen.getByPlaceholderText(/enter new category/i)).toBeInTheDocument();
  });

  // ==================== TEST 3: BACKEND VALIDATION ERROR ====================
  it("surfaces backend validation errors when category already exists", async () => {
    // Arrange: Mock duplicate category error from backend
    axios.get.mockResolvedValueOnce({
      data: {
        success: true,
        category: [{ _id: "1", name: "Electronics", slug: "electronics" }],
      },
    });

    axios.post.mockResolvedValueOnce({
      data: {
        success: false,
        message: "Category Already Exists",
      },
    });

    // Act: Render as admin
    renderCreateCategoryRoutes({
      initialAuthState: { user: { role: 1 }, token: "admin-token" },
      route: "/admin/create-category",
    });

    const user = createUser();

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText("Electronics")).toBeInTheDocument();
    });

    // User attempts to create duplicate category
    const categoryInput = screen.getByPlaceholderText(/enter new category/i);
    const submitButton = screen.getByRole("button", { name: /submit/i });

    await user.type(categoryInput, "Electronics");
    await user.click(submitButton);

    // Assert: Backend error message shown
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Category Already Exists");
    });

    // Assert: Form still visible (no navigation)
    expect(screen.getByPlaceholderText(/enter new category/i)).toBeInTheDocument();
  });

  // ==================== TEST 4: UPDATE CATEGORY FLOW ====================
  it("updates existing category and refreshes list", async () => {
    // Arrange: Mock existing category and successful update
    const existingCategory = { _id: "1", name: "Electronics", slug: "electronics" };
    const updatedCategory = { _id: "1", name: "Tech", slug: "tech" };

    axios.get
      .mockResolvedValueOnce({
        // Initial fetch
        data: { success: true, category: [existingCategory] },
      })
      .mockResolvedValueOnce({
        // Refetch after update
        data: { success: true, category: [updatedCategory] },
      });

    axios.put.mockResolvedValueOnce({
      data: {
        success: true,
        message: "Category updated successfully",
        category: updatedCategory,
      },
    });

    // Act: Render as admin
    renderCreateCategoryRoutes({
      initialAuthState: { user: { role: 1 }, token: "admin-token" },
      route: "/admin/create-category",
    });

    const user = createUser();

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText("Electronics")).toBeInTheDocument();
    });

    // User clicks Edit button
    const editButton = screen.getByText("Edit");
    await user.click(editButton);

    // Wait for modal to open (Ant Design Modal renders in document.body)
    await waitFor(() => {
      expect(screen.getByDisplayValue("Electronics")).toBeInTheDocument();
    });

    // User updates category name in modal
    const modalInput = screen.getByDisplayValue("Electronics");
    const modalSubmitButton = screen.getAllByRole("button", { name: /submit/i })[1]; // Second submit is in modal

    await user.clear(modalInput);
    await user.type(modalInput, "Tech");
    await user.click(modalSubmitButton);

    // Assert: API called correctly
    await waitFor(() => {
      expect(axios.put).toHaveBeenCalledWith(
        "/api/v1/category/update-category/1",
        { name: "Tech" }
      );
    });

    // Assert: Success toast shown
    expect(toast.success).toHaveBeenCalledWith("Tech is updated");

    // Assert: List refreshed
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledTimes(2);
    });

    // Assert: Updated category appears
    await waitFor(() => {
      expect(screen.getByText("Tech")).toBeInTheDocument();
    });
  });
});
