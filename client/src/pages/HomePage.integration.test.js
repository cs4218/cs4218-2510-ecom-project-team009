import React from "react";
import {
  render,
  screen,
  waitFor,
  fireEvent,
  within,
} from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import axios from "axios";
import HomePage from "./HomePage";
import { CartProvider } from "../context/cart";
import { AuthProvider } from "../context/auth";

// Mock only axios - the external boundary
jest.mock("axios");

// Mock toast notifications
jest.mock("react-hot-toast", () => ({
  success: jest.fn(),
  error: jest.fn(),
}));

// Mock Layout but keep it functional
jest.mock("./../components/Layout", () => {
  return ({ children }) => <div data-testid="layout">{children}</div>;
});

// Mock icons
jest.mock("react-icons/ai", () => ({
  AiOutlineReload: () => <span data-testid="reload-icon">ReloadIcon</span>,
}));

const mockNavigate = jest.fn();

jest.mock("react-router-dom", () => ({
  // import the actual non-mocked parts first
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

// Real Application Providers - NO MOCKING OF CONTEXTS
const AppProviders = ({ children }) => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>{children}</CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

// Mock data
const mockCategories = [
  { _id: "cat1", name: "Electronics" },
  { _id: "cat2", name: "Clothing" },
  { _id: "cat3", name: "Books" },
];

const mockProductsPage1 = [
  {
    _id: "prod1",
    name: "Gaming Laptop",
    slug: "gaming-laptop",
    description:
      "High-performance gaming laptop with RTX graphics and powerful processor for gaming",
    price: 1299,
    category: "cat1",
  },
  {
    _id: "prod2",
    name: "Cotton T-Shirt",
    slug: "cotton-t-shirt",
    description:
      "Comfortable 100% cotton t-shirt available in various colors and sizes",
    price: 29,
    category: "cat2",
  },
  {
    _id: "prod3",
    name: "JavaScript Book",
    slug: "javascript-book",
    description:
      "Complete guide to modern JavaScript programming with practical examples",
    price: 45,
    category: "cat3",
  },
];

const mockProductsPage2 = [
  {
    _id: "prod4",
    name: "Wireless Mouse",
    slug: "wireless-mouse",
    description:
      "Ergonomic wireless mouse with long battery life and precise tracking",
    price: 35,
    category: "cat1",
  },
  {
    _id: "prod5",
    name: "Jeans",
    slug: "jeans",
    description:
      "Classic blue jeans with comfortable fit and durable denim material",
    price: 59,
    category: "cat2",
  },
];

// Helper to setup default axios responses
const setupAxiosDefaults = () => {
  axios.get.mockImplementation((url) => {
    if (url === "/api/v1/category/get-category") {
      return Promise.resolve({
        data: { success: true, category: mockCategories },
      });
    }
    if (url === "/api/v1/product/product-count") {
      return Promise.resolve({ data: { total: 5 } });
    }
    if (url === "/api/v1/product/product-list/1") {
      return Promise.resolve({ data: { products: mockProductsPage1 } });
    }
    if (url === "/api/v1/product/product-list/2") {
      return Promise.resolve({ data: { products: mockProductsPage2 } });
    }
    return Promise.reject(new Error("Unknown endpoint"));
  });

  axios.post.mockImplementation((url, data) => {
    if (url === "/api/v1/product/product-filters") {
      const { checked, radio } = data;
      let filteredProducts = [...mockProductsPage1, ...mockProductsPage2];

      // Filter by category
      if (checked && checked.length > 0) {
        filteredProducts = filteredProducts.filter((p) =>
          checked.includes(p.category)
        );
      }

      // Filter by price
      if (radio && radio.length === 2) {
        const [min, max] = radio;
        filteredProducts = filteredProducts.filter(
          (p) => p.price >= min && p.price <= max
        );
      }

      return Promise.resolve({ data: { products: filteredProducts } });
    }
    return Promise.reject(new Error("Unknown endpoint"));
  });
};

describe("HomePage Integration Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    setupAxiosDefaults();
  });

  describe("Integration: Complete User Journey - Browse and Filter", () => {
    test("should integrate with API to load categories, products, and count on mount", async () => {
      render(
        <AppProviders>
          <HomePage />
        </AppProviders>
      );

      // Verify multiple API calls are made
      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");
        expect(axios.get).toHaveBeenCalledWith("/api/v1/product/product-count");
        expect(axios.get).toHaveBeenCalledWith(
          "/api/v1/product/product-list/1"
        );
      });

      // Verify data from all endpoints is displayed
      await waitFor(() => {
        // Categories loaded
        expect(screen.getByText("Electronics")).toBeInTheDocument();
        expect(screen.getByText("Clothing")).toBeInTheDocument();
        expect(screen.getByText("Books")).toBeInTheDocument();

        // Products loaded
        expect(screen.getByText("Gaming Laptop")).toBeInTheDocument();
        expect(screen.getByText("Cotton T-Shirt")).toBeInTheDocument();
        expect(screen.getByText("JavaScript Book")).toBeInTheDocument();

        // Load more button appears (total=5, showing=3)
        expect(screen.getByText("Loadmore")).toBeInTheDocument();
      });
    });

    test("should integrate filtering: user selects category and products update", async () => {
      render(
        <AppProviders>
          <HomePage />
        </AppProviders>
      );

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText("Gaming Laptop")).toBeInTheDocument();
        expect(screen.getByText("Cotton T-Shirt")).toBeInTheDocument();
      });

      // User interaction: select Electronics category
      const electronicsCheckbox = screen.getByRole("checkbox", {
        name: "Electronics",
      });
      fireEvent.click(electronicsCheckbox);

      // Verify filter API is called with correct params
      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          "/api/v1/product/product-filters",
          {
            checked: ["cat1"],
            radio: [],
          }
        );
      });

      // Verify filtered products are displayed
      await waitFor(() => {
        expect(screen.getByText("Gaming Laptop")).toBeInTheDocument();
        expect(screen.getByText("Wireless Mouse")).toBeInTheDocument();
      });

      // Non-electronics products should not be visible
      expect(screen.queryByText("Cotton T-Shirt")).not.toBeInTheDocument();
      expect(screen.queryByText("Jeans")).not.toBeInTheDocument();
      expect(screen.queryByText("JavaScript Book")).not.toBeInTheDocument();
    });

    test("should integrate multiple filters: category + price working together", async () => {
      render(
        <AppProviders>
          <HomePage />
        </AppProviders>
      );

      await waitFor(() => {
        expect(screen.getByText("Gaming Laptop")).toBeInTheDocument();
      });

      // Step 1: Select Electronics
      const electronicsCheckbox = screen.getByRole("checkbox", {
        name: "Electronics",
      });
      fireEvent.click(electronicsCheckbox);

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          "/api/v1/product/product-filters",
          {
            checked: ["cat1"],
            radio: [],
          }
        );
      });

      // Step 2: Select price range $20-$39
      const priceRadio = screen.getByRole("radio", { name: "$20 to 39" });
      fireEvent.click(priceRadio);

      // Verify both filters are applied
      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          "/api/v1/product/product-filters",
          {
            checked: ["cat1"],
            radio: [20, 39],
          }
        );
      });

      // Only Wireless Mouse ($35, Electronics) should show
      await waitFor(() => {
        expect(screen.getByText("Wireless Mouse")).toBeInTheDocument();
      });

      // Gaming Laptop (Electronics but $1299) should not show
      expect(screen.queryByText("Gaming Laptop")).not.toBeInTheDocument();
      // Cotton T-Shirt ($29 but Clothing) should not show
      expect(screen.queryByText("Cotton T-Shirt")).not.toBeInTheDocument();
    });

    test("should integrate filter removal: unchecking category reloads all products", async () => {
      render(
        <AppProviders>
          <HomePage />
        </AppProviders>
      );

      await waitFor(() => {
        expect(screen.getByText("Gaming Laptop")).toBeInTheDocument();
      });

      // Apply filter
      const electronicsCheckbox = screen.getByRole("checkbox", {
        name: "Electronics",
      });
      fireEvent.click(electronicsCheckbox);

      await waitFor(() => {
        expect(screen.getByText("Wireless Mouse")).toBeInTheDocument();
      });

      // Remove filter
      fireEvent.click(electronicsCheckbox);

      // Should call getAllProducts again
      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith(
          "/api/v1/product/product-list/1"
        );
      });

      // All products should show again
      await waitFor(() => {
        expect(screen.getByText("Gaming Laptop")).toBeInTheDocument();
        expect(screen.getByText("Cotton T-Shirt")).toBeInTheDocument();
        expect(screen.getByText("JavaScript Book")).toBeInTheDocument();
      });
    });

    test("should integrate reset: clearing all filters reloads page", async () => {
      // Mock window.location.reload
      delete window.location;
      window.location = { reload: jest.fn() };

      render(
        <AppProviders>
          <HomePage />
        </AppProviders>
      );

      await waitFor(() => {
        expect(screen.getByText("RESET FILTERS")).toBeInTheDocument();
      });

      // Apply some filters first
      const electronicsCheckbox = screen.getByRole("checkbox", {
        name: "Electronics",
      });
      fireEvent.click(electronicsCheckbox);

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalled();
      });

      // Click reset
      const resetButton = screen.getByText("RESET FILTERS");
      fireEvent.click(resetButton);

      expect(window.location.reload).toHaveBeenCalled();
    });
  });

  describe("Integration: Cart Context and localStorage", () => {
    test("should integrate HomePage with CartContext: adding products updates shared cart state", async () => {
      render(
        <AppProviders>
          <HomePage />
        </AppProviders>
      );

      await waitFor(() => {
        expect(screen.getByText("Gaming Laptop")).toBeInTheDocument();
      });

      // Add first product
      const addToCartButtons = screen.getAllByText("ADD TO CART");
      fireEvent.click(addToCartButtons[0]); // Gaming Laptop

      // Verify cart context state is updated via localStorage
      await waitFor(() => {
        const cartData = localStorage.getItem("cart_guest");
        expect(cartData).toBeTruthy();
        const cart = JSON.parse(cartData);
        expect(cart).toHaveLength(1);
        expect(cart[0].name).toBe("Gaming Laptop");
        expect(cart[0].price).toBe(1299);
      });

      // Add second product
      fireEvent.click(addToCartButtons[1]); // Cotton T-Shirt

      // Cart should accumulate items
      await waitFor(() => {
        const cart = JSON.parse(localStorage.getItem("cart_guest"));
        expect(cart).toHaveLength(2);
        expect(cart[0].name).toBe("Gaming Laptop");
        expect(cart[1].name).toBe("Cotton T-Shirt");
        expect(cart[1].price).toBe(29);
      });
    });

    test("should integrate Auth and Cart contexts: user ID affects cart storage key", async () => {
      // Setup authenticated user in AuthContext
      localStorage.setItem(
        "auth",
        JSON.stringify({
          user: { _id: "user123", name: "John Doe", email: "john@test.com" },
          token: "jwt-token-abc",
        })
      );

      render(
        <AppProviders>
          <HomePage />
        </AppProviders>
      );

      await waitFor(() => {
        expect(screen.getByText("Gaming Laptop")).toBeInTheDocument();
      });

      // Add product to cart
      const addToCartButtons = screen.getAllByText("ADD TO CART");
      fireEvent.click(addToCartButtons[0]);

      // Cart should use authenticated user ID
      await waitFor(() => {
        const userCart = localStorage.getItem("cart_user123");
        const guestCart = localStorage.getItem("cart_guest");

        expect(userCart).toBeTruthy();
        expect(guestCart).toBeNull();

        const cart = JSON.parse(userCart);
        expect(cart[0].name).toBe("Gaming Laptop");
      });
    });

    test("should integrate CartContext with existing cart: loading persisted cart on mount", async () => {
      // Pre-populate cart in localStorage
      const existingCart = [
        {
          _id: "existing1",
          name: "Existing Product",
          price: 50,
          slug: "existing",
        },
      ];
      localStorage.setItem("cart_guest", JSON.stringify(existingCart));

      render(
        <AppProviders>
          <HomePage />
        </AppProviders>
      );

      await waitFor(() => {
        expect(screen.getByText("Gaming Laptop")).toBeInTheDocument();
      });

      // Add new product
      const addToCartButtons = screen.getAllByText("ADD TO CART");
      fireEvent.click(addToCartButtons[0]);

      // Cart should contain both existing and new items
      await waitFor(() => {
        const cart = JSON.parse(localStorage.getItem("cart_guest"));
        expect(cart).toHaveLength(2);
        expect(cart[0].name).toBe("Existing Product");
        expect(cart[0].price).toBe(50);
        expect(cart[1].name).toBe("Gaming Laptop");
        expect(cart[1].price).toBe(1299);
      });
    });

    test("should integrate cart with filtered products: can add filtered products to cart", async () => {
      render(
        <AppProviders>
          <HomePage />
        </AppProviders>
      );

      await waitFor(() => {
        expect(screen.getByText("Gaming Laptop")).toBeInTheDocument();
      });

      // Apply filter
      const clothingCheckbox = screen.getByRole("checkbox", {
        name: "Clothing",
      });
      fireEvent.click(clothingCheckbox);

      await waitFor(() => {
        expect(screen.getByText("Cotton T-Shirt")).toBeInTheDocument();
        expect(screen.getByText("Jeans")).toBeInTheDocument();
      });

      // Add filtered product to cart
      const addToCartButtons = screen.getAllByText("ADD TO CART");
      fireEvent.click(addToCartButtons[0]); // Cotton T-Shirt

      // Verify cart updated
      await waitFor(() => {
        const cart = JSON.parse(localStorage.getItem("cart_guest"));
        expect(cart).toHaveLength(1);
        expect(cart[0].name).toBe("Cotton T-Shirt");
        expect(cart[0].category).toBe("cat2");
      });
    });
  });

  describe("Integration: Pagination Flow", () => {
    test("should integrate load more: fetching and appending new page of products", async () => {
      render(
        <AppProviders>
          <HomePage />
        </AppProviders>
      );

      // Initial page loads
      await waitFor(() => {
        expect(screen.getByText("Gaming Laptop")).toBeInTheDocument();
        expect(screen.getByText("Cotton T-Shirt")).toBeInTheDocument();
        expect(screen.getByText("JavaScript Book")).toBeInTheDocument();
      });

      // Page 2 products not visible yet
      expect(screen.queryByText("Wireless Mouse")).not.toBeInTheDocument();
      expect(screen.queryByText("Jeans")).not.toBeInTheDocument();

      // User clicks load more
      const loadMoreButton = screen.getByText("Loadmore");
      fireEvent.click(loadMoreButton);

      // Verify page 2 API call
      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith(
          "/api/v1/product/product-list/2"
        );
      });

      // Verify page 2 products appear AND page 1 products remain
      await waitFor(() => {
        expect(screen.getByText("Wireless Mouse")).toBeInTheDocument();
        expect(screen.getByText("Jeans")).toBeInTheDocument();
        expect(screen.getByText("Gaming Laptop")).toBeInTheDocument();
        expect(screen.getByText("Cotton T-Shirt")).toBeInTheDocument();
      });
    });

    test("should integrate load more button visibility: hides when all products loaded", async () => {
      render(
        <AppProviders>
          <HomePage />
        </AppProviders>
      );

      await waitFor(() => {
        expect(screen.getByText("Loadmore")).toBeInTheDocument();
      });

      // Load page 2
      const loadMoreButton = screen.getByText("Loadmore");
      fireEvent.click(loadMoreButton);

      // Wait for all 5 products to load
      await waitFor(() => {
        expect(screen.getByText("Wireless Mouse")).toBeInTheDocument();
      });

      // Button should disappear (5 products loaded, total is 5)
      await waitFor(() => {
        expect(screen.queryByText("Loadmore")).not.toBeInTheDocument();
      });
    });

    test("should integrate loading state during pagination", async () => {
      // Simulate slow API response
      axios.get.mockImplementation((url) => {
        if (url === "/api/v1/category/get-category") {
          return Promise.resolve({
            data: { success: true, category: mockCategories },
          });
        }
        if (url === "/api/v1/product/product-count") {
          return Promise.resolve({ data: { total: 5 } });
        }
        if (url === "/api/v1/product/product-list/1") {
          return Promise.resolve({ data: { products: mockProductsPage1 } });
        }
        if (url === "/api/v1/product/product-list/2") {
          return new Promise((resolve) =>
            setTimeout(
              () => resolve({ data: { products: mockProductsPage2 } }),
              100
            )
          );
        }
        return Promise.reject(new Error("Unknown endpoint"));
      });

      render(
        <AppProviders>
          <HomePage />
        </AppProviders>
      );

      await waitFor(() => {
        expect(screen.getByText("Loadmore")).toBeInTheDocument();
      });

      const loadMoreButton = screen.getByText("Loadmore");
      fireEvent.click(loadMoreButton);

      // Should show loading state
      expect(screen.getByText("Loading ...")).toBeInTheDocument();

      // Wait for products to load
      await waitFor(() => {
        expect(screen.getByText("Wireless Mouse")).toBeInTheDocument();
      });

      // Loading state should be gone
      expect(screen.queryByText("Loading ...")).not.toBeInTheDocument();
    });

    test("should integrate pagination with cart: can add products from page 2 to cart", async () => {
      render(
        <AppProviders>
          <HomePage />
        </AppProviders>
      );

      await waitFor(() => {
        expect(screen.getByText("Loadmore")).toBeInTheDocument();
      });

      // Load page 2
      const loadMoreButton = screen.getByText("Loadmore");
      fireEvent.click(loadMoreButton);

      await waitFor(() => {
        expect(screen.getByText("Wireless Mouse")).toBeInTheDocument();
      });

      // Add product from page 2 to cart
      const allAddButtons = screen.getAllByText("ADD TO CART");
      const mousAddButton = allAddButtons[3]; // Wireless Mouse (4th product)
      fireEvent.click(mousAddButton);

      // Verify cart updated
      await waitFor(() => {
        const cart = JSON.parse(localStorage.getItem("cart_guest"));
        expect(cart).toHaveLength(1);
        expect(cart[0].name).toBe("Wireless Mouse");
      });
    });
  });

  describe("Integration: Navigation", () => {
    test("should integrate with router: navigating to product details", async () => {
      render(
        <BrowserRouter>
          <AuthProvider>
            <CartProvider>
              <HomePage />
            </CartProvider>
          </AuthProvider>
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("Gaming Laptop")).toBeInTheDocument();
      });

      fireEvent.click(screen.getAllByText("More Details")[0]);
      expect(mockNavigate).toHaveBeenCalledWith("/product/gaming-laptop");
    });
  });

  describe("Integration: Error Handling Across Components", () => {
    test("should handle partial failure: categories fail but products succeed", async () => {
      const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();

      axios.get.mockImplementation((url) => {
        if (url === "/api/v1/category/get-category") {
          return Promise.reject(new Error("Category service down"));
        }
        if (url === "/api/v1/product/product-count") {
          return Promise.resolve({ data: { total: 5 } });
        }
        if (url === "/api/v1/product/product-list/1") {
          return Promise.resolve({ data: { products: mockProductsPage1 } });
        }
        return Promise.reject(new Error("Unknown endpoint"));
      });

      render(
        <AppProviders>
          <HomePage />
        </AppProviders>
      );

      // Products should still load
      await waitFor(() => {
        expect(screen.getByText("Gaming Laptop")).toBeInTheDocument();
      });

      // Error should be logged
      expect(consoleLogSpy).toHaveBeenCalled();

      // Filter section should still render (just empty)
      expect(screen.getByText("Filter By Category")).toBeInTheDocument();

      consoleLogSpy.mockRestore();
    });

    test("should handle products fetch failure gracefully", async () => {
      const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();

      axios.get.mockImplementation((url) => {
        if (url === "/api/v1/category/get-category") {
          return Promise.resolve({
            data: { success: true, category: mockCategories },
          });
        }
        if (url === "/api/v1/product/product-count") {
          return Promise.resolve({ data: { total: 5 } });
        }
        if (url.includes("/api/v1/product/product-list")) {
          return Promise.reject(new Error("Products service error"));
        }
        return Promise.reject(new Error("Unknown endpoint"));
      });

      render(
        <AppProviders>
          <HomePage />
        </AppProviders>
      );

      // Categories should still load
      await waitFor(() => {
        expect(screen.getByText("Electronics")).toBeInTheDocument();
      });

      // Error should be logged
      await waitFor(() => {
        expect(consoleLogSpy).toHaveBeenCalled();
      });

      consoleLogSpy.mockRestore();
    });

    test("should handle filter API failure and maintain UI state", async () => {
      const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();

      render(
        <AppProviders>
          <HomePage />
        </AppProviders>
      );

      await waitFor(() => {
        expect(screen.getByText("Gaming Laptop")).toBeInTheDocument();
      });

      // Make filter fail
      axios.post.mockRejectedValue(new Error("Filter service unavailable"));

      // Try to filter
      const electronicsCheckbox = screen.getByRole("checkbox", {
        name: "Electronics",
      });
      fireEvent.click(electronicsCheckbox);

      // Error should be logged
      await waitFor(() => {
        expect(consoleLogSpy).toHaveBeenCalled();
      });

      // UI should still be interactive
      expect(electronicsCheckbox).toBeChecked();

      consoleLogSpy.mockRestore();
    });

    test("should handle product count API failure gracefully in getTotal()", async () => {
      const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();

      // Mock count endpoint to fail
      axios.get.mockImplementation((url) => {
        if (url === "/api/v1/category/get-category") {
          return Promise.resolve({
            data: { success: true, category: mockCategories },
          });
        }
        if (url === "/api/v1/product/product-count") {
          return Promise.reject(new Error("Count service down"));
        }
        if (url === "/api/v1/product/product-list/1") {
          return Promise.resolve({ data: { products: mockProductsPage1 } });
        }
        return Promise.reject(new Error("Unknown endpoint"));
      });

      render(
        <AppProviders>
          <HomePage />
        </AppProviders>
      );

      await waitFor(() => {
        expect(screen.getByText("Gaming Laptop")).toBeInTheDocument();
        expect(screen.getByText("Cotton T-Shirt")).toBeInTheDocument();
      });

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.any(Error));

      expect(screen.queryByText(/Loadmore/i)).not.toBeInTheDocument();

      consoleLogSpy.mockRestore();
    });

    test("should handle loadMore() API failure gracefully and stop loading state", async () => {
      const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();

      // Normal responses for page 1
      axios.get.mockImplementation((url) => {
        if (url === "/api/v1/category/get-category") {
          return Promise.resolve({
            data: { success: true, category: mockCategories },
          });
        }
        if (url === "/api/v1/product/product-count") {
          return Promise.resolve({ data: { total: 5 } });
        }
        if (url === "/api/v1/product/product-list/1") {
          return Promise.resolve({ data: { products: mockProductsPage1 } });
        }
        if (url === "/api/v1/product/product-list/2") {
          return Promise.reject(new Error("Pagination API failed"));
        }
        return Promise.reject(new Error("Unknown endpoint"));
      });

      render(
        <AppProviders>
          <HomePage />
        </AppProviders>
      );

      // Wait for initial products
      await waitFor(() => {
        expect(screen.getByText("Gaming Laptop")).toBeInTheDocument();
      });

      // Click "Loadmore" to trigger page=2 load
      const loadMoreButton = screen.getByText("Loadmore");
      fireEvent.click(loadMoreButton);

      // Expect error to be logged and loading to stop
      await waitFor(() => {
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.any(Error));
      });

      // "Loading ..." text should disappear (loading reset to false)
      await waitFor(() => {
        expect(screen.queryByText("Loading ...")).not.toBeInTheDocument();
      });

      // Original products should remain
      expect(screen.getByText("Gaming Laptop")).toBeInTheDocument();
      expect(screen.getByText("Cotton T-Shirt")).toBeInTheDocument();

      consoleLogSpy.mockRestore();
    });

    test("should handle unsuccessful category response (data.success = false) gracefully", async () => {
      const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();

      // Mock axios: success flag is false
      axios.get.mockImplementation((url) => {
        if (url === "/api/v1/category/get-category") {
          return Promise.resolve({
            data: { success: false, category: mockCategories },
          });
        }
        if (url === "/api/v1/product/product-count") {
          return Promise.resolve({ data: { total: 3 } });
        }
        if (url === "/api/v1/product/product-list/1") {
          return Promise.resolve({ data: { products: mockProductsPage1 } });
        }
        return Promise.reject(new Error("Unknown endpoint"));
      });

      render(
        <AppProviders>
          <HomePage />
        </AppProviders>
      );

      // ✅ Products should still load normally
      await waitFor(() => {
        expect(screen.getByText("Gaming Laptop")).toBeInTheDocument();
      });

      // ✅ Categories should NOT be set since success=false
      expect(screen.queryByText("Electronics")).not.toBeInTheDocument();

      // ✅ No crash — component renders fine
      expect(screen.getByText("Filter By Category")).toBeInTheDocument();

      consoleLogSpy.mockRestore();
    });
  });

  describe("Integration: Complex User Workflows", () => {
    test("should handle complete shopping workflow: browse → filter → paginate → add to cart", async () => {
      render(
        <AppProviders>
          <HomePage />
        </AppProviders>
      );

      // Step 1: Browse initial products
      await waitFor(() => {
        expect(screen.getByText("Gaming Laptop")).toBeInTheDocument();
        expect(screen.getByText("Cotton T-Shirt")).toBeInTheDocument();
      });

      // Step 2: Filter by Clothing
      const clothingCheckbox = screen.getByRole("checkbox", {
        name: "Clothing",
      });
      fireEvent.click(clothingCheckbox);

      await waitFor(() => {
        expect(screen.getByText("Cotton T-Shirt")).toBeInTheDocument();
        expect(screen.getByText("Jeans")).toBeInTheDocument();
      });

      // Step 3: Add first clothing item to cart
      const addToCartButtons = screen.getAllByText("ADD TO CART");
      fireEvent.click(addToCartButtons[0]); // Cotton T-Shirt

      await waitFor(() => {
        const cart = JSON.parse(localStorage.getItem("cart_guest"));
        expect(cart).toHaveLength(1);
        expect(cart[0].name).toBe("Cotton T-Shirt");
      });

      // Step 4: Add second clothing item
      fireEvent.click(addToCartButtons[1]); // Jeans

      await waitFor(() => {
        const cart = JSON.parse(localStorage.getItem("cart_guest"));
        expect(cart).toHaveLength(2);
        expect(cart[1].name).toBe("Jeans");
      });

      // Step 5: Clear filter to see all products again
      fireEvent.click(clothingCheckbox);

      await waitFor(() => {
        expect(screen.getByText("Gaming Laptop")).toBeInTheDocument();
      });

      // Cart should still contain 2 items
      const finalCart = JSON.parse(localStorage.getItem("cart_guest"));
      expect(finalCart).toHaveLength(2);
    });

    test("should handle auth change during session: guest cart → user cart", async () => {
      // Step 1: Render as guest
      const { unmount } = render(
        <AppProviders>
          <HomePage />
        </AppProviders>
      );

      // Wait for initial products
      await waitFor(() => {
        expect(screen.getByText("Gaming Laptop")).toBeInTheDocument();
      });

      // Step 2: Add product as guest
      const addToCartButtons = screen.getAllByText("ADD TO CART");
      fireEvent.click(addToCartButtons[0]);

      // Verify guest cart created
      await waitFor(() => {
        const guestCart = localStorage.getItem("cart_guest");
        expect(guestCart).toBeTruthy();
        const cart = JSON.parse(guestCart);
        expect(cart[0].name).toBe("Gaming Laptop");
      });

      // Step 3: Simulate login (update localStorage)
      localStorage.setItem(
        "auth",
        JSON.stringify({
          user: { _id: "newuser789", name: "Alice" },
          token: "token789",
        })
      );

      // Step 4: Unmount old app (this destroys old AuthProvider)
      unmount();

      // Step 5: Mount again so AuthProvider reloads from localStorage
      render(
        <AppProviders>
          <HomePage />
        </AppProviders>
      );

      // Wait for reloaded product list
      await waitFor(() => {
        expect(screen.getByText("Cotton T-Shirt")).toBeInTheDocument();
      });

      // Step 6: Add new product as logged-in user
      const newAddButtons = screen.getAllByText("ADD TO CART");
      fireEvent.click(newAddButtons[1]); // Cotton T-Shirt

      // Step 7: Verify cart written under user ID
      await waitFor(() => {
        const userCart = localStorage.getItem("cart_newuser789");
        expect(userCart).toBeTruthy(); // ✅ passes now

        const cart = JSON.parse(userCart);
        expect(cart.some((i) => i.name === "Cotton T-Shirt")).toBe(true);
      });

      // Optional sanity: guest cart still contains old item
      const guestCart = JSON.parse(localStorage.getItem("cart_guest"));
      expect(guestCart.some((i) => i.name === "Gaming Laptop")).toBe(true);
    });
  });
});
