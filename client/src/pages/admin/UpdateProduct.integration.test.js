import React from "react";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axios from "axios";
import { Route } from "react-router-dom";
import { renderTopDown } from "../../test-utils/renderTopDown";
import { cleanupAuth } from "../../test-utils/renderWithProviders";
import UpdateProduct from "./UpdateProduct";
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
// Use renderTopDown with REAL providers and routing with params
const renderUpdateProductRoutes = (options) =>
  renderTopDown(
    <>
      <Route path="/dashboard/admin/products" element={<ProductsPage />} />
      <Route path="/admin/update-product/:slug" element={<UpdateProduct />} />
    </>,
    options
  );

const createUser = () =>
  typeof userEvent.setup === "function" ? userEvent.setup() : userEvent;

// ==================== INTEGRATION TESTS ====================
describe("UpdateProduct Integration (top-down)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    cleanupAuth();
    localStorage.clear();
    toast.success = jest.fn();
    toast.error = jest.fn();

    // Mock URL.createObjectURL for photo preview
    global.URL.createObjectURL = jest.fn(() => "mock-object-url");

    // Mock window.prompt for delete confirmation
    global.window.prompt = jest.fn();
  });

  afterEach(() => {
    cleanupAuth();
    localStorage.clear();
    jest.clearAllMocks();
  });

  // ==================== TEST 1: HAPPY PATH - LOAD → UPDATE → NAVIGATE ====================
  it("loads product, updates fields, and navigates to products page", async () => {
    // Arrange: Mock existing product and successful update
    const mockProduct = {
      _id: "product123",
      name: "Laptop",
      description: "Old description",
      price: 999,
      quantity: 10,
      shipping: false,
      category: { _id: "cat1", name: "Electronics" },
    };

    const mockCategories = [
      { _id: "cat1", name: "Electronics", slug: "electronics" },
      { _id: "cat2", name: "Books", slug: "books" },
    ];

    axios.get
      .mockResolvedValueOnce({
        // getSingleProduct
        data: { product: mockProduct },
      })
      .mockResolvedValueOnce({
        // getAllCategory
        data: { success: true, category: mockCategories },
      });

    axios.put.mockResolvedValueOnce({
      data: {
        success: true,
        message: "Product Updated Successfully",
      },
    });

    // Act: Render as admin user with product slug in URL
    renderUpdateProductRoutes({
      initialAuthState: { user: { role: 1, name: "Admin" }, token: "admin-token" },
      route: "/admin/update-product/laptop-slug",
    });

    const user = createUser();

    // Wait for product data to load and pre-fill form
    await waitFor(() => {
      expect(screen.getByDisplayValue("Laptop")).toBeInTheDocument();
    });

    // User updates product fields
    const nameInput = screen.getByPlaceholderText(/write a name/i);
    const descriptionInput = screen.getByPlaceholderText(/write a description/i);
    const priceInput = screen.getByPlaceholderText(/write a price/i);
    const updateButton = screen.getByRole("button", { name: /update product/i });

    await user.clear(nameInput);
    await user.type(nameInput, "Gaming Laptop");
    await user.clear(descriptionInput);
    await user.type(descriptionInput, "Updated high performance gaming laptop");
    await user.clear(priceInput);
    await user.type(priceInput, "1299");

    await user.click(updateButton);

    // Assert: API called correctly
    await waitFor(() => {
      expect(axios.put).toHaveBeenCalledWith(
        "/api/v1/product/update-product/product123",
        expect.any(FormData)
      );
    });

    // Assert: Success toast shown
    expect(toast.success).toHaveBeenCalledWith("Product Updated Successfully");

    // Assert: Navigate to products page (routing integration!)
    await waitFor(() => {
      expect(screen.getByText("Products Page")).toBeInTheDocument();
    });
  });

  // ==================== TEST 2: API NETWORK ERROR ====================
  it("shows error toast when API request fails", async () => {
    // Arrange: Mock initial data and network error during update
    const mockProduct = {
      _id: "product456",
      name: "Book",
      description: "Test book",
      price: 29,
      quantity: 50,
      shipping: true,
      category: { _id: "cat2", name: "Books" },
    };

    const mockCategories = [
      { _id: "cat2", name: "Books", slug: "books" },
    ];

    axios.get
      .mockResolvedValueOnce({
        data: { product: mockProduct },
      })
      .mockResolvedValueOnce({
        data: { success: true, category: mockCategories },
      });

    axios.put.mockRejectedValueOnce(new Error("Network Error"));

    // Act: Render as admin
    renderUpdateProductRoutes({
      initialAuthState: { user: { role: 1 }, token: "admin-token" },
      route: "/admin/update-product/book-slug",
    });

    const user = createUser();

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByDisplayValue("Book")).toBeInTheDocument();
    });

    // User attempts to update product
    const updateButton = screen.getByRole("button", { name: /update product/i });
    await user.click(updateButton);

    // Assert: Error toast shown
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("something went wrong");
    });

    // Assert: User stays on same page (no navigation)
    expect(screen.getByDisplayValue("Book")).toBeInTheDocument();
    expect(screen.queryByText("Products Page")).not.toBeInTheDocument();
  });

  // ==================== TEST 3: BACKEND VALIDATION ERROR ====================
  it("surfaces backend validation errors when API returns failure", async () => {
    // Arrange: Mock product data and backend validation error
    const mockProduct = {
      _id: "product789",
      name: "Gadget",
      description: "Test gadget",
      price: 49,
      quantity: 5,
      shipping: false,
      category: { _id: "cat1", name: "Electronics" },
    };

    const mockCategories = [
      { _id: "cat1", name: "Electronics", slug: "electronics" },
    ];

    axios.get
      .mockResolvedValueOnce({
        data: { product: mockProduct },
      })
      .mockResolvedValueOnce({
        data: { success: true, category: mockCategories },
      });

    axios.put.mockResolvedValueOnce({
      data: {
        success: false,
        message: "Product name already exists",
      },
    });

    // Act: Render as admin
    renderUpdateProductRoutes({
      initialAuthState: { user: { role: 1 }, token: "admin-token" },
      route: "/admin/update-product/gadget-slug",
    });

    const user = createUser();

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByDisplayValue("Gadget")).toBeInTheDocument();
    });

    // User attempts to update product
    const updateButton = screen.getByRole("button", { name: /update product/i });
    await user.click(updateButton);

    // Assert: Backend error message surfaced
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Product name already exists");
    });

    // Assert: Form still visible (no navigation)
    expect(screen.getByDisplayValue("Gadget")).toBeInTheDocument();
    expect(screen.queryByText("Products Page")).not.toBeInTheDocument();
  });

  // ==================== TEST 4: DELETE PRODUCT FLOW ====================
  it("deletes product on confirmation and navigates to products page", async () => {
    // Arrange: Mock product data and successful delete
    const mockProduct = {
      _id: "product999",
      name: "Old Product",
      description: "To be deleted",
      price: 99,
      quantity: 1,
      shipping: false,
      category: { _id: "cat1", name: "Electronics" },
    };

    const mockCategories = [
      { _id: "cat1", name: "Electronics", slug: "electronics" },
    ];

    axios.get
      .mockResolvedValueOnce({
        data: { product: mockProduct },
      })
      .mockResolvedValueOnce({
        data: { success: true, category: mockCategories },
      });

    axios.delete.mockResolvedValueOnce({
      data: { success: true },
    });

    // Mock window.prompt to simulate user confirmation
    window.prompt.mockReturnValueOnce("yes");

    // Act: Render as admin
    renderUpdateProductRoutes({
      initialAuthState: { user: { role: 1 }, token: "admin-token" },
      route: "/admin/update-product/old-product-slug",
    });

    const user = createUser();

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByDisplayValue("Old Product")).toBeInTheDocument();
    });

    // User clicks Delete button
    const deleteButton = screen.getByRole("button", { name: /delete product/i });
    await user.click(deleteButton);

    // Assert: Confirmation prompt shown
    await waitFor(() => {
      expect(window.prompt).toHaveBeenCalledWith(
        "Are You Sure want to delete this product ? "
      );
    });

    // Assert: Delete API called
    expect(axios.delete).toHaveBeenCalledWith(
      "/api/v1/product/delete-product/product999"
    );

    // Assert: Success toast shown
    expect(toast.success).toHaveBeenCalledWith("Product Deleted Successfully");

    // Assert: Navigate to products page
    await waitFor(() => {
      expect(screen.getByText("Products Page")).toBeInTheDocument();
    });
  });
});
