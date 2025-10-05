import React from "react";
import { render, fireEvent, waitFor, screen } from "@testing-library/react";
import axios from "axios";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import "@testing-library/jest-dom/extend-expect";
import AdminOrders from "./AdminOrders";
import { useAuth } from "../../context/auth";

const mockNavigate = jest.fn();

jest.mock("axios");

jest.mock("../../context/auth");

jest.mock("../../context/cart", () => ({
  useCart: jest.fn(() => [null, jest.fn()]),
}));

jest.mock("../../context/search", () => ({
  useSearch: jest.fn(() => [{ keyword: "" }, jest.fn()]),
}));

jest.mock("../../hooks/useCategory", () => jest.fn(() => []));

jest.mock("react-router-dom", () => {
  const actual = jest.requireActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

Object.defineProperty(window, "localStorage", {
  value: {
    setItem: jest.fn(),
    getItem: jest.fn(),
    removeItem: jest.fn(),
  },
  writable: true,
});

window.matchMedia =
  window.matchMedia ||
  function () {
    return {
      matches: false,
      addListener: function () {},
      removeListener: function () {},
    };
  };

const mockOrders = {
  orders: [
    {
      _id: "order123",
      status: "Processing",
      buyer: { name: "John Doe" },
      createAt: "2025-01-01T10:00:00Z",
      payment: { success: true },
      products: [
        {
          _id: "prod123",
          name: "Laptop",
          description: "High-performance laptop for professionals",
          price: 1200,
        },
        {
          _id: "prod456",
          name: "Mouse",
          description: "Wireless optical mouse",
          price: 25,
        },
      ],
    },
    {
      _id: "order456",
      status: "Shipped",
      buyer: { name: "Jane Smith" },
      createAt: "2025-01-02T12:00:00Z",
      payment: { success: false },
      products: [
        {
          _id: "prod789",
          name: "Keyboard",
          description: "Mechanical keyboard with RGB lighting",
          price: 80,
        },
      ],
    },
  ],
};

const renderAdminOrders = () => {
  return render(
    <MemoryRouter initialEntries={["/admin/orders"]}>
      <Routes>
        <Route path="/admin/orders" element={<AdminOrders />} />
      </Routes>
    </MemoryRouter>
  );
};

describe("AdminOrders Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockReset();
    jest.spyOn(console, "log").mockImplementation(() => {});

    // Default: auth with token
    useAuth.mockReturnValue([{ token: "mock-token" }, jest.fn()]);

    // Default successful API response for orders
    axios.get.mockResolvedValue({ data: mockOrders });
  });

  afterEach(() => {
    console.log.mockRestore();
  });

  describe("Rendering", () => {
    it("renders admin orders page with heading", async () => {
      renderAdminOrders();

      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: /all orders/i })
        ).toBeInTheDocument();
      });
    });

    it("renders empty state when no orders", async () => {
      axios.get.mockResolvedValue({ data: { orders: [] } });

      renderAdminOrders();

      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: /all orders/i })
        ).toBeInTheDocument();
      });

      expect(screen.queryByText("John Doe")).not.toBeInTheDocument();
    });

    it("renders orders table with all columns", async () => {
      renderAdminOrders();

      await waitFor(() => {
        expect(screen.getByText("John Doe")).toBeInTheDocument();
      });

      expect(screen.getAllByText("#").length).toBe(2); // One per order table
      expect(screen.getAllByText("Status").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Buyer").length).toBe(2);
      expect(screen.getAllByText("date").length).toBe(2);
      expect(screen.getAllByText("Payment").length).toBe(2);
      expect(screen.getAllByText("Quantity").length).toBe(2);
    });

    it("renders order details correctly", async () => {
      renderAdminOrders();

      await waitFor(() => {
        expect(screen.getByText("John Doe")).toBeInTheDocument();
      });

      expect(screen.getByText("Jane Smith")).toBeInTheDocument();
      expect(screen.getByText("Success")).toBeInTheDocument();
      expect(screen.getByText("Failed")).toBeInTheDocument();
      expect(screen.getAllByText("2").length).toBeGreaterThan(0); // Quantity for first order + row number for second order
      expect(screen.getAllByText("1").length).toBeGreaterThan(0); // Row number for first order + quantity for second order
    });

    it("renders products within each order", async () => {
      renderAdminOrders();

      await waitFor(() => {
        expect(screen.getByText("Laptop")).toBeInTheDocument();
      });

      expect(screen.getByText("Mouse")).toBeInTheDocument();
      expect(screen.getByText("Keyboard")).toBeInTheDocument();
      expect(screen.getByText(/High-performance laptop/i)).toBeInTheDocument();
      expect(screen.getByText("Price : 1200")).toBeInTheDocument();
      expect(screen.getByText("Price : 25")).toBeInTheDocument();
    });

    it("renders product images with correct src", async () => {
      renderAdminOrders();

      await waitFor(() => {
        expect(screen.getByText("Laptop")).toBeInTheDocument();
      });

      const images = screen.getAllByRole("img");
      expect(images[0]).toHaveAttribute(
        "src",
        "/api/v1/product/product-photo/prod123"
      );
      expect(images[1]).toHaveAttribute(
        "src",
        "/api/v1/product/product-photo/prod456"
      );
      expect(images[2]).toHaveAttribute(
        "src",
        "/api/v1/product/product-photo/prod789"
      );
    });
  });

  describe("Data Fetching on Mount", () => {
    it("fetches orders when auth token exists", async () => {
      renderAdminOrders();

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/all-orders");
      });
    });

    it("does not fetch orders when auth token is null", async () => {
      useAuth.mockReturnValue([{ token: null }, jest.fn()]);

      renderAdminOrders();

      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: /all orders/i })
        ).toBeInTheDocument();
      });

      expect(axios.get).not.toHaveBeenCalled();
    });

    it("does not fetch orders when auth is undefined", async () => {
      useAuth.mockReturnValue([undefined, jest.fn()]);

      renderAdminOrders();

      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: /all orders/i })
        ).toBeInTheDocument();
      });

      expect(axios.get).not.toHaveBeenCalled();
    });

    it("handles fetch errors gracefully", async () => {
      axios.get.mockRejectedValueOnce(new Error("Network error"));

      renderAdminOrders();

      await waitFor(() => {
        expect(console.log).toHaveBeenCalled();
      });
    });

    it("sets orders state correctly after successful fetch", async () => {
      renderAdminOrders();

      await waitFor(() => {
        expect(screen.getByText("John Doe")).toBeInTheDocument();
      });

      expect(screen.getByText("Jane Smith")).toBeInTheDocument();
      expect(screen.getByText("Laptop")).toBeInTheDocument();
      expect(screen.getByText("Keyboard")).toBeInTheDocument();
    });
  });

  describe("Update Order Status", () => {
    it("renders status select dropdowns for each order", async () => {
      renderAdminOrders();

      await waitFor(() => {
        expect(screen.getByText("John Doe")).toBeInTheDocument();
      });

      const selects = screen.getAllByRole("combobox");
      expect(selects.length).toBe(2); // One select per order
    });

    it("calls PUT API with correct orderId and status", async () => {
      axios.put.mockResolvedValueOnce({ data: {} });

      renderAdminOrders();

      await waitFor(() => {
        expect(screen.getByText("John Doe")).toBeInTheDocument();
      });

      const selects = screen.getAllByRole("combobox");
      fireEvent.mouseDown(selects[0]);

      await waitFor(() => {
        expect(screen.getAllByText("Shipped").length).toBeGreaterThan(1);
      });

      const shippedOptions = screen.getAllByText("Shipped");
      // Click the one in the dropdown (not the table cell)
      fireEvent.click(shippedOptions[shippedOptions.length - 1]);

      await waitFor(() => {
        expect(axios.put).toHaveBeenCalledWith(
          "/api/v1/auth/order-status/order123",
          { status: "Shipped" }
        );
      });
    });

    it("refreshes orders list after status update", async () => {
      axios.put.mockResolvedValueOnce({ data: {} });

      renderAdminOrders();

      await waitFor(() => {
        expect(screen.getByText("John Doe")).toBeInTheDocument();
      });

      const selects = screen.getAllByRole("combobox");
      fireEvent.mouseDown(selects[0]);

      await waitFor(() => {
        expect(screen.getAllByText("Shipped").length).toBeGreaterThan(1);
      });

      const shippedOptions = screen.getAllByText("Shipped");
      fireEvent.click(shippedOptions[shippedOptions.length - 1]);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledTimes(2); // Initial mount + after update
      });
    });

    it("handles update errors gracefully", async () => {
      axios.put.mockRejectedValueOnce(new Error("Update failed"));

      renderAdminOrders();

      await waitFor(() => {
        expect(screen.getByText("John Doe")).toBeInTheDocument();
      });

      const selects = screen.getAllByRole("combobox");
      fireEvent.mouseDown(selects[0]);

      await waitFor(() => {
        expect(screen.getAllByText("Shipped").length).toBeGreaterThan(1);
      });

      const shippedOptions = screen.getAllByText("Shipped");
      fireEvent.click(shippedOptions[shippedOptions.length - 1]);

      await waitFor(() => {
        expect(console.log).toHaveBeenCalled();
      });
    });
  });

  describe("Product Display", () => {
    it("renders multiple products per order", async () => {
      renderAdminOrders();

      await waitFor(() => {
        expect(screen.getByText("Laptop")).toBeInTheDocument();
      });

      expect(screen.getByText("Mouse")).toBeInTheDocument();
      expect(screen.getAllByRole("img")).toHaveLength(3);
    });

    it("displays product details correctly", async () => {
      renderAdminOrders();

      await waitFor(() => {
        expect(screen.getByText("Laptop")).toBeInTheDocument();
      });

      expect(screen.getByText(/High-performance laptop/i)).toBeInTheDocument();
      expect(screen.getByText("Price : 1200")).toBeInTheDocument();
      expect(screen.getByText("Wireless optical mouse")).toBeInTheDocument();
      expect(screen.getByText("Price : 25")).toBeInTheDocument();
    });

    it("truncates product description to 30 characters", async () => {
      renderAdminOrders();

      await waitFor(() => {
        expect(screen.getByText("Laptop")).toBeInTheDocument();
      });

      // Original: "High-performance laptop for professionals" (44 chars)
      // Should be truncated (not showing full text)
      expect(screen.getByText(/High-performance laptop/i)).toBeInTheDocument();
      expect(
        screen.queryByText("High-performance laptop for professionals")
      ).not.toBeInTheDocument();
    });
  });
});
