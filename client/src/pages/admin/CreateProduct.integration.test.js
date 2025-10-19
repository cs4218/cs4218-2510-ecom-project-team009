import React from "react";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axios from "axios";
import { Route } from "react-router-dom";
import { renderTopDown } from "../../test-utils/renderTopDown";
import { cleanupAuth } from "../../test-utils/renderWithProviders";
import CreateProduct from "./CreateProduct";
import toast from "react-hot-toast";

// ==================== MOCKING STRATEGY ====================
// Mock ONLY external APIs and toast (NOT child components, NOT Ant Design, NOT routing!)
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
const ProductsPage = () => <div>Products Page</div>;

// ==================== RENDER HELPER ====================
// Use renderTopDown with REAL providers and routing
const renderCreateProductRoutes = (options) =>
  renderTopDown(
    <>
      <Route path="/dashboard/admin/products" element={<ProductsPage />} />
      <Route path="/admin/create-product" element={<CreateProduct />} />
    </>,
    options
  );

const createUser = () =>
  typeof userEvent.setup === "function" ? userEvent.setup() : userEvent;

// ==================== INTEGRATION TESTS ====================
describe("CreateProduct Integration (top-down)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    cleanupAuth();
    localStorage.clear();
    toast.success = jest.fn();
    toast.error = jest.fn();

    // Mock URL.createObjectURL for photo preview
    global.URL.createObjectURL = jest.fn(() => "mock-object-url");
  });

  afterEach(() => {
    cleanupAuth();
    localStorage.clear();
    jest.clearAllMocks();
  });

  // ==================== TEST 1: HAPPY PATH - FILL FORM → CREATE → NAVIGATE ====================
  it("creates product with all fields and navigates to products page", async () => {
    // Arrange: Mock categories and successful product creation
    const mockCategories = [
      { _id: "cat1", name: "Electronics", slug: "electronics" },
      { _id: "cat2", name: "Books", slug: "books" },
    ];

    axios.get.mockResolvedValueOnce({
      // getAllCategory
      data: { success: true, category: mockCategories },
    });

    axios.post.mockResolvedValueOnce({
      data: {
        success: true,
        message: "Product Created Successfully",
      },
    });

    // Act: Render as admin user
    renderCreateProductRoutes({
      initialAuthState: { user: { role: 1, name: "Admin" }, token: "admin-token" },
      route: "/admin/create-product",
    });

    const user = createUser();

    // Wait for initial load - check heading appears
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /create product/i })).toBeInTheDocument();
    });

    // Wait for API call to complete
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");
    });

    // User fills in product form
    const nameInput = screen.getByPlaceholderText(/write a name/i);
    const descriptionInput = screen.getByPlaceholderText(/write a description/i);
    const priceInput = screen.getByPlaceholderText(/write a price/i);
    const quantityInput = screen.getByPlaceholderText(/write a quantity/i);
    const createButton = screen.getByRole("button", { name: /create product/i });

    // Fill text inputs
    await user.type(nameInput, "Gaming Laptop");
    await user.type(descriptionInput, "High performance gaming laptop");
    await user.type(priceInput, "1299");
    await user.type(quantityInput, "15");

    // Submit form (category and shipping will use default values)
    await user.click(createButton);

    // Assert: API called correctly
    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        "/api/v1/product/create-product",
        expect.any(FormData)
      );
    });

    // Assert: Success toast shown
    expect(toast.success).toHaveBeenCalledWith("Product Created Successfully");

    // Assert: Navigate to products page (routing integration!)
    await waitFor(() => {
      expect(screen.getByText("Products Page")).toBeInTheDocument();
    });
  });

  // ==================== TEST 2: API NETWORK ERROR ====================
  it("shows error toast when API request fails", async () => {
    // Arrange: Mock categories and network error during create
    const mockCategories = [
      { _id: "cat1", name: "Electronics", slug: "electronics" },
    ];

    axios.get.mockResolvedValueOnce({
      data: { success: true, category: mockCategories },
    });

    axios.post.mockRejectedValueOnce(new Error("Network Error"));

    // Act: Render as admin
    renderCreateProductRoutes({
      initialAuthState: { user: { role: 1 }, token: "admin-token" },
      route: "/admin/create-product",
    });

    const user = createUser();

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /create product/i })).toBeInTheDocument();
    });

    // User attempts to create product (minimal fields)
    const nameInput = screen.getByPlaceholderText(/write a name/i);
    const createButton = screen.getByRole("button", { name: /create product/i });

    await user.type(nameInput, "Test Product");
    await user.click(createButton);

    // Assert: Error toast shown
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("something went wrong");
    });

    // Assert: User stays on same page (no navigation)
    expect(screen.getByPlaceholderText(/write a name/i)).toBeInTheDocument();
    expect(screen.queryByText("Products Page")).not.toBeInTheDocument();
  });

  // ==================== TEST 3: BACKEND VALIDATION ERROR ====================
  it("surfaces backend validation errors when API returns failure", async () => {
    // Arrange: Mock categories and backend validation error
    const mockCategories = [
      { _id: "cat1", name: "Electronics", slug: "electronics" },
    ];

    axios.get.mockResolvedValueOnce({
      data: { success: true, category: mockCategories },
    });

    axios.post.mockResolvedValueOnce({
      data: {
        success: false,
        message: "Product name already exists",
      },
    });

    // Act: Render as admin
    renderCreateProductRoutes({
      initialAuthState: { user: { role: 1 }, token: "admin-token" },
      route: "/admin/create-product",
    });

    const user = createUser();

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /create product/i })).toBeInTheDocument();
    });

    // User attempts to create product
    const nameInput = screen.getByPlaceholderText(/write a name/i);
    const createButton = screen.getByRole("button", { name: /create product/i });

    await user.type(nameInput, "Existing Product");
    await user.click(createButton);

    // Assert: Backend error message surfaced
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Product name already exists");
    });

    // Assert: Form still visible (no navigation)
    expect(screen.getByPlaceholderText(/write a name/i)).toBeInTheDocument();
    expect(screen.queryByText("Products Page")).not.toBeInTheDocument();
  });
});
