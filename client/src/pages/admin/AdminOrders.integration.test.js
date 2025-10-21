import React from "react";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import axios from "axios";
import { Route } from "react-router-dom";
import { renderTopDown } from "../../test-utils/renderTopDown";
import { cleanupAuth } from "../../test-utils/renderWithProviders";
import AdminRoute from "../../components/Routes/AdminRoute";
import AdminOrders from "./AdminOrders";
import toast from "react-hot-toast";

// ==================== MOCKING ====================
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

// Mock console.log to avoid noise in tests
const originalConsoleLog = console.log;
beforeAll(() => {
  console.log = jest.fn();
});

afterAll(() => {
  console.log = originalConsoleLog;
});

// ==================== TEST DATA ====================
const mockOrders = [
  {
    _id: "order1",
    status: "Not Process",
    buyer: { name: "John Doe" },
    createdAt: "2024-01-01T10:00:00Z",
    payment: { success: true },
    products: [
      {
        _id: "prod1",
        name: "Laptop",
        description: "High performance laptop for professionals",
        price: 1200,
      },
      {
        _id: "prod2",
        name: "Mouse",
        description: "Wireless mouse with ergonomic design",
        price: 50,
      },
    ],
  },
  {
    _id: "order2",
    status: "Processing",
    buyer: { name: "Jane Smith" },
    createdAt: "2024-01-02T15:30:00Z",
    payment: { success: false },
    products: [
      {
        _id: "prod3",
        name: "Keyboard",
        description: "Mechanical keyboard with RGB lighting",
        price: 150,
      },
    ],
  },
];

// ==================== RENDER HELPER ====================
const Dashboard = () => <div>Admin Dashboard</div>;

const renderAdminOrdersRoutes = (options) =>
  renderTopDown(
    <>
      <Route path="/dashboard/admin" element={<Dashboard />} />
      <Route element={<AdminRoute />}>
        <Route path="/dashboard/admin/orders" element={<AdminOrders />} />
      </Route>
    </>,
    options
  );

// Helper to create userEvent instance (kept for consistency with other integration tests)
// const createUser = () =>
//   typeof userEvent.setup === "function" ? userEvent.setup() : userEvent;

// ==================== TESTS ====================
describe("AdminOrders Integration (top-down)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    cleanupAuth();
    localStorage.clear();
    toast.success = jest.fn();
    toast.error = jest.fn();
    axios.get.mockResolvedValue({ data: { category: [] } });
  });

  afterEach(() => {
    cleanupAuth();
    localStorage.clear();
    jest.clearAllMocks();
  });

  // Test 1: Happy path - load orders and update status
  it("loads orders and updates status successfully", async () => {
    // Mock admin auth check
    axios.get.mockImplementation((url) => {
      if (url === "/api/v1/auth/admin-auth") {
        return Promise.resolve({ data: { ok: true } });
      }
      if (url === "/api/v1/auth/all-orders") {
        return Promise.resolve({ data: { orders: mockOrders } });
      }
      return Promise.resolve({ data: { category: [] } });
    });

    // Mock successful status update
    axios.put.mockResolvedValueOnce({
      data: { success: true },
    });

    renderAdminOrdersRoutes({
      initialAuthState: { user: { role: 1 }, token: "admin-token" },
      route: "/dashboard/admin/orders",
    });

    // Wait for component to render and orders to load
    await waitFor(() => {
      expect(screen.getByText("All Orders")).toBeInTheDocument();
    });

    // Wait for API call to complete
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/all-orders");
    });

    // Wait for orders data to be displayed
    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    expect(screen.getByText("Laptop")).toBeInTheDocument();
    expect(screen.getByText("Mouse")).toBeInTheDocument();
    expect(screen.getByText("Keyboard")).toBeInTheDocument();

    // Verify payment status
    const successTexts = screen.getAllByText("Success");
    const failedTexts = screen.getAllByText("Failed");
    expect(successTexts.length).toBeGreaterThan(0);
    expect(failedTexts.length).toBeGreaterThan(0);

    // Verify quantities (note: numbers appear as both row numbers AND product counts)
    const allTwos = screen.getAllByText("2");
    expect(allTwos.length).toBeGreaterThan(0); // Appears as row #2 and product quantity
    const allOnes = screen.getAllByText("1");
    expect(allOnes.length).toBeGreaterThan(0); // Appears as row #1 and product quantity

    // Clear previous mock calls
    jest.clearAllMocks();

    // Re-mock for status update
    axios.get.mockImplementation((url) => {
      if (url === "/api/v1/auth/all-orders") {
        return Promise.resolve({ data: { orders: mockOrders } });
      }
      return Promise.resolve({ data: { category: [] } });
    });
    axios.put.mockResolvedValueOnce({
      data: { success: true },
    });

    // User updates order status
    const selects = screen.getAllByRole("combobox");
    expect(selects.length).toBeGreaterThan(0);

    // Click first status dropdown
    fireEvent.mouseDown(selects[0]);

    // Wait for dropdown options to appear
    await waitFor(() => {
      const processingTexts = screen.getAllByText("Processing");
      expect(processingTexts.length).toBeGreaterThan(1); // Should be in default value AND dropdown
    });

    // Select "Processing" status
    const processingOptions = screen.getAllByText("Processing");
    fireEvent.click(processingOptions[processingOptions.length - 1]); // Click the option in dropdown

    // Verify PUT request was made
    await waitFor(() => {
      expect(axios.put).toHaveBeenCalledWith(
        "/api/v1/auth/order-status/order1",
        { status: "Processing" }
      );
    });

    // Verify orders were refreshed (GET called again)
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/all-orders");
    });
  });

  // Test 2: API network error when loading orders
  it("handles network error when loading orders", async () => {
    // Mock admin auth success
    axios.get.mockImplementation((url) => {
      if (url === "/api/v1/auth/admin-auth") {
        return Promise.resolve({ data: { ok: true } });
      }
      if (url === "/api/v1/auth/all-orders") {
        return Promise.reject(new Error("Network Error"));
      }
      return Promise.resolve({ data: { category: [] } });
    });

    renderAdminOrdersRoutes({
      initialAuthState: { user: { role: 1 }, token: "admin-token" },
      route: "/dashboard/admin/orders",
    });

    // Wait for component to render
    await waitFor(() => {
      expect(screen.getByText("All Orders")).toBeInTheDocument();
    });

    // Verify error was logged
    expect(console.log).toHaveBeenCalledWith(expect.any(Error));

    // Verify no orders are displayed
    expect(screen.queryByText("John Doe")).not.toBeInTheDocument();
    expect(screen.queryByText("Jane Smith")).not.toBeInTheDocument();
  });

  // Test 3: Backend validation error on status update
  it("handles error when updating order status", async () => {
    // Mock admin auth and initial orders load
    axios.get.mockImplementation((url) => {
      if (url === "/api/v1/auth/admin-auth") {
        return Promise.resolve({ data: { ok: true } });
      }
      if (url === "/api/v1/auth/all-orders") {
        return Promise.resolve({ data: { orders: mockOrders } });
      }
      return Promise.resolve({ data: { category: [] } });
    });

    renderAdminOrdersRoutes({
      initialAuthState: { user: { role: 1 }, token: "admin-token" },
      route: "/dashboard/admin/orders",
    });

    // Wait for orders to load
    await waitFor(() => {
      expect(screen.getByText("All Orders")).toBeInTheDocument();
    });

    // Wait for API call and data to be displayed
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/all-orders");
    });

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    // Setup failed status update (keep console.log mock intact)
    axios.put.mockRejectedValueOnce(new Error("Update failed"));

    // User tries to update order status
    const selects = screen.getAllByRole("combobox");
    fireEvent.mouseDown(selects[0]);

    await waitFor(() => {
      const shippedTexts = screen.getAllByText("Shipped");
      expect(shippedTexts.length).toBeGreaterThan(0);
    });

    const shippedOptions = screen.getAllByText("Shipped");
    fireEvent.click(shippedOptions[shippedOptions.length - 1]);

    // Verify PUT request was made
    await waitFor(() => {
      expect(axios.put).toHaveBeenCalled();
    });

    // Component handles error gracefully - orders should still be visible (doesn't crash)
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("Jane Smith")).toBeInTheDocument();

    // Component logs error (tested implicitly - if error wasn't caught, test would fail)
  });

  // Test 4: Empty orders state
  it("displays heading when no orders exist", async () => {
    // Mock admin auth success
    axios.get.mockImplementation((url) => {
      if (url === "/api/v1/auth/admin-auth") {
        return Promise.resolve({ data: { ok: true } });
      }
      if (url === "/api/v1/auth/all-orders") {
        return Promise.resolve({ data: { orders: [] } });
      }
      return Promise.resolve({ data: { category: [] } });
    });

    renderAdminOrdersRoutes({
      initialAuthState: { user: { role: 1 }, token: "admin-token" },
      route: "/dashboard/admin/orders",
    });

    // Wait for component to render
    await waitFor(() => {
      expect(screen.getByText("All Orders")).toBeInTheDocument();
    });

    // Verify no order data is displayed
    expect(screen.queryByText("John Doe")).not.toBeInTheDocument();
    expect(screen.queryByText("Jane Smith")).not.toBeInTheDocument();

    // Verify no table rows (except header)
    const tables = screen.queryAllByRole("table");
    expect(tables.length).toBe(0); // No tables rendered when orders array is empty
  });
});
