import React from "react";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";
import CategoryProduct from "./CategoryProduct";
import "@testing-library/jest-dom/extend-expect";

// Mock dependencies
jest.mock("axios");

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
  useParams: jest.fn(),
}));

const { useParams } = require("react-router-dom");

// Mock context providers
jest.mock("../context/auth", () => ({
  useAuth: () => [{ user: null, token: "" }, jest.fn()],
}));

jest.mock("../context/cart", () => ({
  useCart: () => [[], jest.fn()],
}));

jest.mock("../hooks/useCategory", () => ({
  __esModule: true,
  default: () => [],
}));

// Mock Layout component
jest.mock("../components/Layout", () => ({
  __esModule: true,
  default: ({ children }) => <div data-testid="layout">{children}</div>,
}));

describe("CategoryProduct Component - Minimal Coverage", () => {
  const mockCategory = {
    _id: "cat1",
    name: "Electronics",
    slug: "electronics",
  };

  const mockProducts = [
    {
      _id: "prod1",
      name: "Laptop",
      price: 999.99,
      description: "High performance laptop with great battery life and amazing features",
      slug: "laptop",
    },
    {
      _id: "prod2",
      name: "Mouse",
      price: 29.99,
      description: "Wireless mouse with ergonomic design",
      slug: "mouse",
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should fetch and display products when slug is provided", async () => {
    useParams.mockReturnValue({ slug: "electronics" });

    axios.get.mockResolvedValue({
      data: {
        products: mockProducts,
        category: mockCategory,
      },
    });

    await act(async () => {
      render(
        <MemoryRouter>
          <CategoryProduct />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(
        "/api/v1/product/product-category/electronics"
      );
      expect(screen.getByText("Category - Electronics")).toBeInTheDocument();
      expect(screen.getByText("2 result found")).toBeInTheDocument();
      expect(screen.getByText("Laptop")).toBeInTheDocument();
      expect(screen.getByText("Mouse")).toBeInTheDocument();
    });
  });

  it("should not fetch when slug is undefined", async () => {
    useParams.mockReturnValue({ slug: undefined });

    await act(async () => {
      render(
        <MemoryRouter>
          <CategoryProduct />
        </MemoryRouter>
      );
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    expect(axios.get).not.toHaveBeenCalled();
  });

  it("should handle API error gracefully", async () => {
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    useParams.mockReturnValue({ slug: "electronics" });

    axios.get.mockRejectedValue(new Error("Network error"));

    await act(async () => {
      render(
        <MemoryRouter>
          <CategoryProduct />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
    });

    consoleSpy.mockRestore();
  });

  it("should navigate when More Details button is clicked", async () => {
    useParams.mockReturnValue({ slug: "electronics" });

    axios.get.mockResolvedValue({
      data: {
        products: mockProducts,
        category: mockCategory,
      },
    });

    await act(async () => {
      render(
        <MemoryRouter>
          <CategoryProduct />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByText("Laptop")).toBeInTheDocument();
    });

    await act(async () => {
      const moreDetailsButtons = screen.getAllByText("More Details");
      fireEvent.click(moreDetailsButtons[0]);
    });

    expect(mockNavigate).toHaveBeenCalledWith("/product/laptop");
  });

  it("should display products with truncated descriptions", async () => {
    useParams.mockReturnValue({ slug: "electronics" });

    axios.get.mockResolvedValue({
      data: {
        products: mockProducts,
        category: mockCategory,
      },
    });

    await act(async () => {
      render(
        <MemoryRouter>
          <CategoryProduct />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/High performance laptop with great battery life and amazing/)).toBeInTheDocument();
      expect(screen.getByText(/Wireless mouse with ergonomic design/)).toBeInTheDocument();
    });
  });

  it("should display formatted prices", async () => {
    useParams.mockReturnValue({ slug: "electronics" });

    axios.get.mockResolvedValue({
      data: {
        products: mockProducts,
        category: mockCategory,
      },
    });

    await act(async () => {
      render(
        <MemoryRouter>
          <CategoryProduct />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByText("$999.99")).toBeInTheDocument();
      expect(screen.getByText("$29.99")).toBeInTheDocument();
    });
  });

  it("should render product images with correct src", async () => {
    useParams.mockReturnValue({ slug: "electronics" });

    axios.get.mockResolvedValue({
      data: {
        products: mockProducts,
        category: mockCategory,
      },
    });

    await act(async () => {
      render(
        <MemoryRouter>
          <CategoryProduct />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      const images = screen.getAllByRole("img");
      expect(images[0]).toHaveAttribute("src", "/api/v1/product/product-photo/prod1");
      expect(images[0]).toHaveAttribute("alt", "Laptop");
      expect(images[1]).toHaveAttribute("src", "/api/v1/product/product-photo/prod2");
      expect(images[1]).toHaveAttribute("alt", "Mouse");
    });
  });

  it("should refetch products when slug changes", async () => {
    useParams.mockReturnValue({ slug: "electronics" });

    axios.get.mockResolvedValue({
      data: {
        products: mockProducts,
        category: mockCategory,
      },
    });

    let rerender;
    await act(async () => {
      const result = render(
        <MemoryRouter>
          <CategoryProduct />
        </MemoryRouter>
      );
      rerender = result.rerender;
    });

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(
        "/api/v1/product/product-category/electronics"
      );
    });

    jest.clearAllMocks();

    // Change slug
    useParams.mockReturnValue({ slug: "clothing" });
    const clothingCategory = { _id: "cat2", name: "Clothing", slug: "clothing" };

    axios.get.mockResolvedValue({
      data: {
        products: [],
        category: clothingCategory,
      },
    });

    await act(async () => {
      rerender(
        <MemoryRouter>
          <CategoryProduct />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(
        "/api/v1/product/product-category/clothing"
      );
    });
  });

  it("should display 0 results when no products found", async () => {
    useParams.mockReturnValue({ slug: "electronics" });

    axios.get.mockResolvedValue({
      data: {
        products: [],
        category: mockCategory,
      },
    });

    await act(async () => {
      render(
        <MemoryRouter>
          <CategoryProduct />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByText("0 result found")).toBeInTheDocument();
    });
  });
});