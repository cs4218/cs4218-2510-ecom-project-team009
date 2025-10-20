import React from "react";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axios from "axios";
import { Route } from "react-router-dom";
import { renderTopDown } from "../../test-utils/renderTopDown";
import { cleanupAuth } from "../../test-utils/renderWithProviders";
import Products from "./Products";
import toast from "react-hot-toast";

// ==================== MOCKING STRATEGY ====================
// Mock ONLY external APIs and toast
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

// ==================== MOCK PAGES ====================
const UpdateProduct = () => <div>Update Product Page</div>;
const Dashboard = () => <div>Admin Dashboard</div>;

// ==================== RENDER HELPER ====================
const renderProductsRoutes = (options) =>
  renderTopDown(
    <>
      <Route path="/dashboard/admin" element={<Dashboard />} />
      <Route path="/dashboard/admin/products" element={<Products />} />
      <Route
        path="/dashboard/admin/product/:slug"
        element={<UpdateProduct />}
      />
    </>,
    options
  );

const createUser = () =>
  typeof userEvent.setup === "function" ? userEvent.setup() : userEvent;

// ==================== TESTS ====================
describe("Products Integration (top-down)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    cleanupAuth();
    localStorage.clear();
    toast.success = jest.fn();
    toast.error = jest.fn();
  });

  afterEach(() => {
    cleanupAuth();
    localStorage.clear();
    jest.clearAllMocks();
  });

  // Test 1: Happy path - Fetch products, display, and navigate
  it("fetches products and navigates to product detail on click", async () => {
    // Arrange: Mock successful API response
    const mockProducts = [
      {
        _id: "1",
        name: "Laptop",
        description: "High performance laptop",
        slug: "laptop",
      },
      {
        _id: "2",
        name: "Phone",
        description: "Latest smartphone",
        slug: "phone",
      },
    ];

    axios.get.mockResolvedValueOnce({
      data: { products: mockProducts },
    });

    // Act: Render with admin user
    renderProductsRoutes({
      initialAuthState: { user: { role: 1 }, token: "admin-token" },
      route: "/dashboard/admin/products",
    });

    // Assert: Products are fetched and displayed
    await waitFor(() => {
      expect(screen.getByText("Laptop")).toBeInTheDocument();
    });

    expect(screen.getByText("Phone")).toBeInTheDocument();
    expect(screen.getByText("High performance laptop")).toBeInTheDocument();
    expect(screen.getByText("Latest smartphone")).toBeInTheDocument();

    // Verify API was called
    expect(axios.get).toHaveBeenCalledWith("/api/v1/product/get-product");
    expect(axios.get).toHaveBeenCalledTimes(1);

    // Act: User clicks on a product link
    const user = createUser();
    const laptopLink = screen
      .getAllByRole("link")
      .find(
        (link) =>
          link.getAttribute("href") === "/dashboard/admin/product/laptop"
      );

    expect(laptopLink).toBeInTheDocument();
    await user.click(laptopLink);

    // Assert: User navigated to UpdateProduct page (ROUTING INTEGRATION)
    await waitFor(() => {
      expect(screen.getByText("Update Product Page")).toBeInTheDocument();
    });
  });

  // Test 2: API network error
  it("shows error toast when API fails to fetch products", async () => {
    // Arrange: Mock API failure
    const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();
    axios.get.mockRejectedValueOnce(new Error("Network Error"));

    // Act: Render component
    renderProductsRoutes({
      initialAuthState: { user: { role: 1 }, token: "admin-token" },
      route: "/dashboard/admin/products",
    });

    // Assert: Error toast shown
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Someething Went Wrong");
    });

    // Verify error was logged
    expect(consoleLogSpy).toHaveBeenCalled();
    consoleLogSpy.mockRestore();
  });

  // Test 3: Empty products list
  it("handles empty products list gracefully", async () => {
    // Arrange: Mock empty response
    axios.get.mockResolvedValueOnce({
      data: { products: [] },
    });

    // Act: Render component
    renderProductsRoutes({
      initialAuthState: { user: { role: 1 }, token: "admin-token" },
      route: "/dashboard/admin/products",
    });

    // Assert: Page renders without products
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalled();
    });

    expect(screen.getByText("All Products List")).toBeInTheDocument();
    expect(screen.queryByText("Laptop")).not.toBeInTheDocument();
  });
});
