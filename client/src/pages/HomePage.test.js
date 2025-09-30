import React from "react";
import { render, fireEvent, waitFor, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import HomePage from "./HomePage";
import "@testing-library/jest-dom/extend-expect";

// Mock dependencies
jest.mock("axios");
jest.mock("react-hot-toast");

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

//Mock useAuth
jest.mock("../context/auth", () => ({
  useAuth: jest.fn(() => [null, jest.fn()]),
}));

// Mock search context
jest.mock("../context/search", () => ({
  useSearch: jest.fn(() => [{ keyword: "", results: [] }, jest.fn()]),
}));

// Mock cart context
const mockSetCart = jest.fn();
jest.mock("../context/cart", () => ({
  useCart: jest.fn(() => [[], mockSetCart]),
}));

// Mock localStorage
Object.defineProperty(window, "localStorage", {
  value: {
    setItem: jest.fn(),
    getItem: jest.fn(),
    removeItem: jest.fn(),
  },
  writable: true,
});

// Mock window.location.reload
delete window.location;
window.location = { reload: jest.fn() };

// Mock matchMedia
window.matchMedia =
  window.matchMedia ||
  function () {
    return {
      matches: false,
      addListener: function () {},
      removeListener: function () {},
    };
  };

describe("HomePage Component", () => {
  const mockCategories = [
    { _id: "1", name: "Electronics" },
    { _id: "2", name: "Clothing" },
    { _id: "3", name: "Books" },
  ];

  const mockProducts = [
    {
      _id: "p1",
      name: "Laptop",
      price: 999.99,
      description: "High performance laptop with great battery life",
      slug: "laptop",
    },
    {
      _id: "p2",
      name: "T-Shirt",
      price: 19.99,
      description: "Comfortable cotton t-shirt in multiple colors",
      slug: "t-shirt",
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    axios.get.mockImplementation((url) => {
      if (url.includes("/api/v1/category/get-category")) {
        return Promise.resolve({
          data: { success: true, category: mockCategories },
        });
      }
      if (url.includes("/api/v1/product/product-list")) {
        return Promise.resolve({
          data: { products: mockProducts },
        });
      }
      if (url.includes("/api/v1/product/product-count")) {
        return Promise.resolve({
          data: { total: 10 },
        });
      }
      return Promise.reject(new Error("Not found"));
    });
  });

  // Test 1: Component renders successfully
  it("renders homepage with layout and banner", async () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("All Products")).toBeInTheDocument();
      expect(screen.getByText("Filter By Category")).toBeInTheDocument();
      expect(screen.getByText("Filter By Price")).toBeInTheDocument();
    });
  });
});
