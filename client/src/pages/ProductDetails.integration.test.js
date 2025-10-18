import React from "react";
import { screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axios from "axios";
import { Route } from "react-router-dom";
import { renderTopDown } from "../test-utils/renderTopDown";
import { cleanupAuth } from "../test-utils/renderWithProviders";
import ProductDetails from "./ProductDetails";
import toast from "react-hot-toast";

jest.mock("axios");
jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
  Toaster: () => <div data-testid="toaster" />,
}));
jest.mock("../hooks/useCategory", () => ({
  __esModule: true,
  default: jest.fn(() => []),
}));

const mockProduct = {
  _id: "prod1",
  name: "Laptop",
  slug: "laptop",
  description: "High performance laptop with great battery life and amazing features",
  price: 999.99,
  quantity: 10,
  category: {
    _id: "cat1",
    name: "Electronics",
    slug: "electronics",
  },
};

const mockRelatedProducts = [
  {
    _id: "prod2",
    name: "Mouse",
    slug: "mouse",
    description: "Wireless mouse with ergonomic design and long battery life",
    price: 29.99,
    quantity: 50,
    category: {
      _id: "cat1",
      name: "Electronics",
      slug: "electronics",
    },
  },
  {
    _id: "prod3",
    name: "Keyboard",
    slug: "keyboard",
    description: "Mechanical keyboard with RGB lighting and premium switches",
    price: 79.99,
    quantity: 30,
    category: {
      _id: "cat1",
      name: "Electronics",
      slug: "electronics",
    },
  },
];

const HomePage = () => <div>Home Page</div>;

const renderProductDetailsRoutes = (options) =>
  renderTopDown(
    <>
      <Route path="/" element={<HomePage />} />
      <Route path="/product/:slug" element={<ProductDetails />} />
    </>,
    options
  );

const createUser = () =>
  typeof userEvent.setup === "function" ? userEvent.setup() : userEvent;

describe("ProductDetails Integration - Cart Context + Router Navigation", () => {
  let localStorageMock;

  beforeEach(() => {
    jest.clearAllMocks();
    cleanupAuth();
    
    // Setup localStorage mock
    localStorageMock = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      clear: jest.fn(),
      removeItem: jest.fn(),
    };
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });

    // Reset localStorage cart
    localStorageMock.getItem.mockReturnValue(JSON.stringify([]));
    
    toast.success = jest.fn();
    toast.error = jest.fn();

    // Mock API responses
    axios.get.mockImplementation((url) => {
      if (url.includes("/api/v1/product/get-product/laptop")) {
        return Promise.resolve({ data: { product: mockProduct } });
      }
      if (url.includes("/api/v1/product/related-product/")) {
        return Promise.resolve({ data: { products: mockRelatedProducts } });
      }
      if (url.includes("/api/v1/category/get-category")) {
        return Promise.resolve({ data: { category: [] } });
      }
      return Promise.reject(new Error("Not found"));
    });
  });

  afterEach(() => {
    cleanupAuth();
    jest.clearAllMocks();
  });

  describe("API Layer Integration - Axios HTTP Requests", () => {
    it("fetches product data from backend endpoint and displays it", async () => {
      await act(async () => {
        renderProductDetailsRoutes({
          initialAuthState: { user: null, token: "" },
          route: "/product/laptop",
        });
      });

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith(
          "/api/v1/product/get-product/laptop"
        );
      });

      await waitFor(() => {
        expect(screen.getByText(/Name : Laptop/i)).toBeInTheDocument();
        expect(screen.getByText(/Electronics/i)).toBeInTheDocument();
        expect(screen.getByText(/\$999.99/i)).toBeInTheDocument();
      });
    });

    it("fetches related products from backend endpoint", async () => {
      await act(async () => {
        renderProductDetailsRoutes({
          initialAuthState: { user: null, token: "" },
          route: "/product/laptop",
        });
      });

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith(
          expect.stringContaining("/api/v1/product/related-product/")
        );
      });

      await waitFor(() => {
        expect(screen.getByText("Mouse")).toBeInTheDocument();
        expect(screen.getByText("Keyboard")).toBeInTheDocument();
      });
    });

    it("handles API error gracefully when product fetch fails", async () => {
      axios.get.mockImplementation((url) => {
        if (url.includes("/api/v1/product/get-product/laptop")) {
          return Promise.reject(new Error("Network error"));
        }
        if (url.includes("/api/v1/category/get-category")) {
          return Promise.resolve({ data: { category: [] } });
        }
        return Promise.reject(new Error("Not found"));
      });

      await act(async () => {
        renderProductDetailsRoutes({
          initialAuthState: { user: null, token: "" },
          route: "/product/laptop",
        });
      });

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith(
          "/api/v1/product/get-product/laptop"
        );
      });

      // Product details should not render
      expect(screen.queryByText(/Name : Laptop/i)).not.toBeInTheDocument();
    });

    it("handles API error when related products fetch fails", async () => {
      axios.get.mockImplementation((url) => {
        if (url.includes("/api/v1/product/get-product/laptop")) {
          return Promise.resolve({ data: { product: mockProduct } });
        }
        if (url.includes("/api/v1/product/related-product/")) {
          return Promise.reject(new Error("Failed to fetch related products"));
        }
        if (url.includes("/api/v1/category/get-category")) {
          return Promise.resolve({ data: { category: [] } });
        }
        return Promise.reject(new Error("Not found"));
      });

      await act(async () => {
        renderProductDetailsRoutes({
          initialAuthState: { user: null, token: "" },
          route: "/product/laptop",
        });
      });

      await waitFor(() => {
        expect(screen.getByText(/Name : Laptop/i)).toBeInTheDocument();
      });

      // Main product renders but related products don't
      expect(screen.queryByText("Mouse")).not.toBeInTheDocument();
      expect(screen.getByText(/No Similar Products found/i)).toBeInTheDocument();
    });
  });

  describe("State Layer Integration - Cart Context + localStorage", () => {
    it("adds main product to cart and persists to localStorage", async () => {
      await act(async () => {
        renderProductDetailsRoutes({
          initialAuthState: { user: null, token: "" },
          route: "/product/laptop",
        });
      });

      await waitFor(() => {
        expect(screen.getByText(/Name : Laptop/i)).toBeInTheDocument();
      });

      const user = createUser();
      const addToCartButtons = screen.getAllByText("ADD TO CART");
      
      await act(async () => {
        await user.click(addToCartButtons[0]);
      });

      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          "cart_guest",
          expect.stringContaining(mockProduct._id)
        );
      });

      expect(toast.success).toHaveBeenCalledWith("Item Added to cart");
    });

    it("adds related product to cart and persists to localStorage", async () => {
      await act(async () => {
        renderProductDetailsRoutes({
          initialAuthState: { user: null, token: "" },
          route: "/product/laptop",
        });
      });

      await waitFor(() => {
        expect(screen.getByText("Mouse")).toBeInTheDocument();
      });

      const user = createUser();
      const addToCartButtons = screen.getAllByText("ADD TO CART");
      
      await act(async () => {
        await user.click(addToCartButtons[1]);
      });

      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          "cart_guest",
          expect.stringContaining(mockRelatedProducts[0]._id)
        );
      });

      expect(toast.success).toHaveBeenCalledWith("Item Added to cart");
    });

    it("maintains cart state across multiple additions", async () => {
      await act(async () => {
        renderProductDetailsRoutes({
          initialAuthState: { user: null, token: "" },
          route: "/product/laptop",
        });
      });

      await waitFor(() => {
        expect(screen.getByText(/Name : Laptop/i)).toBeInTheDocument();
        expect(screen.getByText("Mouse")).toBeInTheDocument();
      });

      const user = createUser();
      const addToCartButtons = screen.getAllByText("ADD TO CART");

      // Add main product
      await act(async () => {
        await user.click(addToCartButtons[0]);
      });

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("Item Added to cart");
      });

      // Add related product
      await act(async () => {
        await user.click(addToCartButtons[1]);
      });

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledTimes(2);
      });

      // Verify both items persisted
      expect(localStorageMock.setItem).toHaveBeenCalledTimes(2);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "cart_guest",
        expect.any(String)
      );
    });

    it("updates cart context state on ADD TO CART click", async () => {
      await act(async () => {
        renderProductDetailsRoutes({
          initialAuthState: { user: null, token: "" },
          route: "/product/laptop",
        });
      });

      await waitFor(() => {
        expect(screen.getByText(/Name : Laptop/i)).toBeInTheDocument();
      });

      const user = createUser();
      const addToCartButtons = screen.getAllByText("ADD TO CART");
      
      await act(async () => {
        await user.click(addToCartButtons[0]);
      });

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("Item Added to cart");
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          "cart_guest",
          expect.any(String)
        );
      });
    });
  });

  describe("Router Navigation Integration - useNavigate", () => {
    it("navigates to related product when More Details is clicked", async () => {
      axios.get.mockImplementation((url) => {
        if (url.includes("/api/v1/product/get-product/laptop")) {
          return Promise.resolve({ data: { product: mockProduct } });
        }
        if (url.includes("/api/v1/product/get-product/mouse")) {
          return Promise.resolve({ data: { product: mockRelatedProducts[0] } });
        }
        if (url.includes("/api/v1/product/related-product/")) {
          return Promise.resolve({ data: { products: mockRelatedProducts } });
        }
        if (url.includes("/api/v1/category/get-category")) {
          return Promise.resolve({ data: { category: [] } });
        }
        return Promise.reject(new Error("Not found"));
      });

      await act(async () => {
        renderProductDetailsRoutes({
          initialAuthState: { user: null, token: "" },
          route: "/product/laptop",
        });
      });

      await waitFor(() => {
        expect(screen.getByText("Mouse")).toBeInTheDocument();
      });

      const user = createUser();
      const moreDetailsButtons = screen.getAllByText("More Details");
      
      await act(async () => {
        await user.click(moreDetailsButtons[0]);
      });

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith(
          "/api/v1/product/get-product/mouse"
        );
      });

      await waitFor(() => {
        expect(screen.getByText(/Name : Mouse/i)).toBeInTheDocument();
      });
    });

    it("navigates to second related product when its More Details is clicked", async () => {
      axios.get.mockImplementation((url) => {
        if (url.includes("/api/v1/product/get-product/laptop")) {
          return Promise.resolve({ data: { product: mockProduct } });
        }
        if (url.includes("/api/v1/product/get-product/keyboard")) {
          return Promise.resolve({ data: { product: mockRelatedProducts[1] } });
        }
        if (url.includes("/api/v1/product/related-product/")) {
          return Promise.resolve({ data: { products: mockRelatedProducts } });
        }
        if (url.includes("/api/v1/category/get-category")) {
          return Promise.resolve({ data: { category: [] } });
        }
        return Promise.reject(new Error("Not found"));
      });

      await act(async () => {
        renderProductDetailsRoutes({
          initialAuthState: { user: null, token: "" },
          route: "/product/laptop",
        });
      });

      await waitFor(() => {
        expect(screen.getByText("Keyboard")).toBeInTheDocument();
      });

      const user = createUser();
      const moreDetailsButtons = screen.getAllByText("More Details");
      
      await act(async () => {
        await user.click(moreDetailsButtons[1]);
      });

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith(
          "/api/v1/product/get-product/keyboard"
        );
      });

      await waitFor(() => {
        expect(screen.getByText(/Name : Keyboard/i)).toBeInTheDocument();
      });
    });
  });
});