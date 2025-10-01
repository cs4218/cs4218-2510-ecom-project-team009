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

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

jest.mock("../context/auth", () => ({
  useAuth: jest.fn(() => [null, jest.fn()]),
}));

jest.mock("../context/search", () => ({
  useSearch: jest.fn(() => [{ keyword: "", results: [] }, jest.fn()]),
}));

const mockSetCart = jest.fn();
jest.mock("../context/cart", () => ({
  useCart: jest.fn(() => [[], mockSetCart]),
}));

jest.mock("react-icons/ai", () => ({
  AiOutlineReload: () => <span>↻</span>,
}));

Object.defineProperty(window, "localStorage", {
  value: {
    setItem: jest.fn(),
    getItem: jest.fn(),
    removeItem: jest.fn(),
  },
  writable: true,
});

delete window.location;
window.location = { reload: jest.fn() };

window.matchMedia =
  window.matchMedia ||
  function () {
    return {
      matches: false,
      addListener: function () {},
      removeListener: function () {},
    };
  };

describe("HomePage Component - Systematic Testing", () => {
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

  // ========================================
  // BOUNDARY VALUE ANALYSIS (BVA) TESTS
  // ========================================
  describe("BVA: Product Count Boundaries", () => {
    it("should hide load more when products.length = total (boundary: equal)", async () => {
      axios.get.mockImplementation((url) => {
        if (url.includes("/api/v1/product/product-count")) {
          return Promise.resolve({ data: { total: 2 } });
        }
        if (url.includes("/api/v1/product/product-list")) {
          return Promise.resolve({ data: { products: mockProducts } });
        }
        if (url.includes("/api/v1/category/get-category")) {
          return Promise.resolve({
            data: { success: true, category: mockCategories },
          });
        }
        return Promise.reject(new Error("Not found"));
      });

      render(
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("All Products")).toBeInTheDocument();
      });

      expect(screen.queryByText("Loadmore")).not.toBeInTheDocument();
    });

    it("should hide load more when products.length > total (boundary: exceeds)", async () => {
      axios.get.mockImplementation((url) => {
        if (url.includes("/api/v1/product/product-count")) {
          return Promise.resolve({ data: { total: 1 } });
        }
        if (url.includes("/api/v1/product/product-list")) {
          return Promise.resolve({ data: { products: mockProducts } });
        }
        if (url.includes("/api/v1/category/get-category")) {
          return Promise.resolve({
            data: { success: true, category: mockCategories },
          });
        }
        return Promise.reject(new Error("Not found"));
      });

      render(
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("All Products")).toBeInTheDocument();
      });

      expect(screen.queryByText("Loadmore")).not.toBeInTheDocument();
    });

    it("should show load more when products.length < total (boundary: one less)", async () => {
      axios.get.mockImplementation((url) => {
        if (url.includes("/api/v1/product/product-count")) {
          return Promise.resolve({ data: { total: 3 } });
        }
        if (url.includes("/api/v1/product/product-list")) {
          return Promise.resolve({ data: { products: mockProducts } });
        }
        if (url.includes("/api/v1/category/get-category")) {
          return Promise.resolve({
            data: { success: true, category: mockCategories },
          });
        }
        return Promise.reject(new Error("Not found"));
      });

      render(
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("Loadmore")).toBeInTheDocument();
      });
    });
  });

  describe("BVA: Empty Data Boundaries", () => {
    it("should handle zero categories (boundary: minimum)", async () => {
      axios.get.mockImplementation((url) => {
        if (url.includes("/api/v1/category/get-category")) {
          return Promise.resolve({
            data: { success: true, category: [] },
          });
        }
        if (url.includes("/api/v1/product/product-list")) {
          return Promise.resolve({ data: { products: mockProducts } });
        }
        if (url.includes("/api/v1/product/product-count")) {
          return Promise.resolve({ data: { total: 2 } });
        }
        return Promise.reject(new Error("Not found"));
      });

      render(
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("Filter By Category")).toBeInTheDocument();
      });

      const checkboxes = screen.queryAllByRole("checkbox");
      expect(checkboxes.length).toBe(0);
    });

    it("should handle zero products (boundary: minimum)", async () => {
      axios.get.mockImplementation((url) => {
        if (url.includes("/api/v1/category/get-category")) {
          return Promise.resolve({
            data: { success: true, category: mockCategories },
          });
        }
        if (url.includes("/api/v1/product/product-list")) {
          return Promise.resolve({ data: { products: [] } });
        }
        if (url.includes("/api/v1/product/product-count")) {
          return Promise.resolve({ data: { total: 0 } });
        }
        return Promise.reject(new Error("Not found"));
      });

      render(
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("All Products")).toBeInTheDocument();
      });

      const productCards = screen.queryAllByText("More Details");
      expect(productCards.length).toBe(0);
    });

    it("should handle single product (boundary: minimum valid)", async () => {
      axios.get.mockImplementation((url) => {
        if (url.includes("/api/v1/category/get-category")) {
          return Promise.resolve({
            data: { success: true, category: mockCategories },
          });
        }
        if (url.includes("/api/v1/product/product-list")) {
          return Promise.resolve({ data: { products: [mockProducts[0]] } });
        }
        if (url.includes("/api/v1/product/product-count")) {
          return Promise.resolve({ data: { total: 1 } });
        }
        return Promise.reject(new Error("Not found"));
      });

      render(
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("Laptop")).toBeInTheDocument();
      });

      const productCards = screen.getAllByText("More Details");
      expect(productCards.length).toBe(1);
    });
  });

  describe("BVA: Pagination Boundaries", () => {
    it("should start at page 1 (boundary: initial)", async () => {
      render(
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith(
          "/api/v1/product/product-list/1"
        );
      });
    });

    it("should increment to page 2 when load more clicked (boundary: next page)", async () => {
      axios.get.mockImplementation((url) => {
        if (url.includes("/api/v1/product/product-list/2")) {
          return Promise.resolve({ data: { products: [mockProducts[0]] } });
        }
        if (url.includes("/api/v1/product/product-list/1")) {
          return Promise.resolve({ data: { products: mockProducts } });
        }
        if (url.includes("/api/v1/product/product-count")) {
          return Promise.resolve({ data: { total: 10 } });
        }
        if (url.includes("/api/v1/category/get-category")) {
          return Promise.resolve({
            data: { success: true, category: mockCategories },
          });
        }
        return Promise.reject(new Error("Not found"));
      });

      render(
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("Loadmore")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Loadmore"));

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith(
          "/api/v1/product/product-list/2"
        );
      });
    });
  });

  // ========================================
  // EQUIVALENCE PARTITIONING TESTS
  // ========================================
  describe("EP: API Response Success States", () => {
    it("should handle successful category fetch (valid partition)", async () => {
      render(
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getAllByText("Electronics").length).toBeGreaterThan(0);
      });
    });

    it("should handle category fetch with success=false (invalid partition)", async () => {
      axios.get.mockImplementation((url) => {
        if (url.includes("/api/v1/category/get-category")) {
          return Promise.resolve({
            data: { success: false, category: [] },
          });
        }
        if (url.includes("/api/v1/product/product-list")) {
          return Promise.resolve({ data: { products: mockProducts } });
        }
        if (url.includes("/api/v1/product/product-count")) {
          return Promise.resolve({ data: { total: 2 } });
        }
        return Promise.reject(new Error("Not found"));
      });

      render(
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");
      });

      // Categories should not be displayed
      const checkboxes = screen.queryAllByRole("checkbox");
      expect(checkboxes.length).toBe(0);
    });

    it("should handle category API error (error partition)", async () => {
      const consoleSpy = jest
        .spyOn(console, "log")
        .mockImplementation(() => {});

      axios.get.mockImplementation((url) => {
        if (url.includes("/api/v1/category/get-category")) {
          return Promise.reject(new Error("Network error"));
        }
        if (url.includes("/api/v1/product/product-list")) {
          return Promise.resolve({ data: { products: mockProducts } });
        }
        if (url.includes("/api/v1/product/product-count")) {
          return Promise.resolve({ data: { total: 2 } });
        }
        return Promise.reject(new Error("Not found"));
      });

      render(
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
      });

      consoleSpy.mockRestore();
    });
  });

  describe("EP: Filter State Partitions", () => {
    it("should handle no filters active (partition: empty state)", async () => {
      render(
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith(
          "/api/v1/product/product-list/1"
        );
      });

      // Should NOT call filter endpoint
      expect(axios.post).not.toHaveBeenCalled();
    });

    it("should handle only category filter active (partition: single filter type)", async () => {
      axios.post.mockResolvedValueOnce({
        data: { products: [mockProducts[0]] },
      });

      render(
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(
          screen.getByRole("checkbox", { name: /electronics/i })
        ).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("checkbox", { name: /electronics/i }));

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          "/api/v1/product/product-filters",
          { checked: ["1"], radio: [] }
        );
      });
    });

    it("should handle only price filter active (partition: single filter type)", async () => {
      axios.post.mockResolvedValueOnce({
        data: { products: [mockProducts[1]] },
      });

      render(
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      );

      const radio = await screen.findByRole("radio", { name: /\$0 to 19/i });
      fireEvent.click(radio);

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          "/api/v1/product/product-filters",
          { checked: [], radio: [0, 19] }
        );
      });
    });

    it("should handle both filters active (partition: combined filters)", async () => {
      axios.post.mockResolvedValue({
        data: { products: [mockProducts[0]] },
      });

      render(
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      );

      const checkbox = await screen.findByRole("checkbox", {
        name: /electronics/i,
      });
      const radio = await screen.findByRole("radio", { name: /\$0 to 19/i });

      fireEvent.click(checkbox);

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalled();
      });

      fireEvent.click(radio);

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          "/api/v1/product/product-filters",
          { checked: ["1"], radio: [0, 19] }
        );
      });
    });
  });

  // ========================================
  // PAIRWISE TESTING
  // ========================================
  describe("Pairwise: Filter Combinations", () => {
    const testCases = [
      // [categoryChecked, priceSelected, expectedBehavior]
      {
        category: false,
        price: false,
        desc: "no filters",
        expectPost: false,
      },
      {
        category: true,
        price: false,
        desc: "category only",
        expectPost: true,
        expectedPayload: { checked: ["1"], radio: [] },
      },
      {
        category: false,
        price: true,
        desc: "price only",
        expectPost: true,
        expectedPayload: { checked: [], radio: [0, 19] },
      },
      {
        category: true,
        price: true,
        desc: "both filters",
        expectPost: true,
        expectedPayload: { checked: ["1"], radio: [0, 19] },
      },
    ];

    testCases.forEach(
      ({ category, price, desc, expectPost, expectedPayload }) => {
        it(`should handle pairwise combination: ${desc}`, async () => {
          axios.post.mockResolvedValue({
            data: { products: [mockProducts[0]] },
          });

          render(
            <MemoryRouter>
              <HomePage />
            </MemoryRouter>
          );

          await waitFor(() => {
            expect(screen.getByText("All Products")).toBeInTheDocument();
          });

          if (category) {
            const checkbox = await screen.findByRole("checkbox", {
              name: /electronics/i,
            });
            fireEvent.click(checkbox);
          }

          if (price) {
            const radio = await screen.findByRole("radio", {
              name: /\$0 to 19/i,
            });
            fireEvent.click(radio);
          }

          if (expectPost) {
            await waitFor(() => {
              expect(axios.post).toHaveBeenCalledWith(
                "/api/v1/product/product-filters",
                expectedPayload
              );
            });
          } else {
            // Small delay to ensure no POST call
            await new Promise((resolve) => setTimeout(resolve, 100));
            expect(axios.post).not.toHaveBeenCalled();
          }
        });
      }
    );
  });

  describe("Pairwise: Loading State Combinations", () => {
    it("should show 'Loading...' text when loading=true and load more visible", async () => {
      axios.get.mockImplementation((url) => {
        if (url.includes("/api/v1/product/product-count")) {
          return Promise.resolve({ data: { total: 10 } });
        }
        if (url.includes("/api/v1/product/product-list/1")) {
          return Promise.resolve({ data: { products: mockProducts } });
        }
        if (url.includes("/api/v1/product/product-list/2")) {
          // Delay to keep loading state
          return new Promise((resolve) =>
            setTimeout(
              () => resolve({ data: { products: [mockProducts[0]] } }),
              1000
            )
          );
        }
        if (url.includes("/api/v1/category/get-category")) {
          return Promise.resolve({
            data: { success: true, category: mockCategories },
          });
        }
        return Promise.reject(new Error("Not found"));
      });

      render(
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("Loadmore")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Loadmore"));

      // Should show loading state
      expect(screen.getByText("Loading ...")).toBeInTheDocument();
    });
  });

  // ========================================
  // CODE COVERAGE: Uncovered Branches
  // ========================================
  describe("Coverage: handleFilter else block", () => {
    it("should remove category from checked when checkbox is unchecked", async () => {
      axios.post.mockResolvedValue({
        data: { products: [mockProducts[0]] },
      });

      render(
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      );

      const checkbox = await screen.findByRole("checkbox", {
        name: /electronics/i,
      });

      // First click - adds to checked (if block)
      fireEvent.click(checkbox);

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          "/api/v1/product/product-filters",
          { checked: ["1"], radio: [] }
        );
      });

      axios.post.mockClear();

      // Second click - removes from checked (else block)
      fireEvent.click(checkbox);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith(
          "/api/v1/product/product-list/1"
        );
      });
    });
  });

  describe("Coverage: getAllProducts catch block", () => {
    it("should handle error in getAllProducts and log it", async () => {
      const consoleSpy = jest
        .spyOn(console, "log")
        .mockImplementation(() => {});

      axios.get.mockImplementation((url) => {
        if (url.includes("/api/v1/product/product-list")) {
          return Promise.reject(new Error("Failed to fetch products"));
        }
        if (url.includes("/api/v1/category/get-category")) {
          return Promise.resolve({
            data: { success: true, category: mockCategories },
          });
        }
        if (url.includes("/api/v1/product/product-count")) {
          return Promise.resolve({ data: { total: 10 } });
        }
        return Promise.reject(new Error("Not found"));
      });

      render(
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
      });

      consoleSpy.mockRestore();
    });
  });

  describe("Coverage: getTotal catch block", () => {
    it("should handle error in getTotal and log it", async () => {
      const consoleSpy = jest
        .spyOn(console, "log")
        .mockImplementation(() => {});

      axios.get.mockImplementation((url) => {
        if (url.includes("/api/v1/product/product-count")) {
          return Promise.reject(new Error("Failed to get count"));
        }
        if (url.includes("/api/v1/category/get-category")) {
          return Promise.resolve({
            data: { success: true, category: mockCategories },
          });
        }
        if (url.includes("/api/v1/product/product-list")) {
          return Promise.resolve({ data: { products: mockProducts } });
        }
        return Promise.reject(new Error("Not found"));
      });

      render(
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
      });

      consoleSpy.mockRestore();
    });
  });

  describe("Coverage: loadMore catch block", () => {
    it("should handle error in loadMore and log it", async () => {
      const consoleSpy = jest
        .spyOn(console, "log")
        .mockImplementation(() => {});

      axios.get.mockImplementation((url) => {
        if (url.includes("/api/v1/product/product-list/2")) {
          return Promise.reject(new Error("Failed to load more"));
        }
        if (url.includes("/api/v1/product/product-list/1")) {
          return Promise.resolve({ data: { products: mockProducts } });
        }
        if (url.includes("/api/v1/category/get-category")) {
          return Promise.resolve({
            data: { success: true, category: mockCategories },
          });
        }
        if (url.includes("/api/v1/product/product-count")) {
          return Promise.resolve({ data: { total: 10 } });
        }
        return Promise.reject(new Error("Not found"));
      });

      render(
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("Loadmore")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Loadmore"));

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
      });

      consoleSpy.mockRestore();
    });
  });

  describe("Coverage: filterProduct catch block", () => {
    it("should handle error in filterProduct and log it", async () => {
      const consoleSpy = jest
        .spyOn(console, "log")
        .mockImplementation(() => {});

      axios.post.mockRejectedValue(new Error("Filter API failed"));

      render(
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      );

      const checkbox = await screen.findByRole("checkbox", {
        name: /electronics/i,
      });
      fireEvent.click(checkbox);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
      });

      consoleSpy.mockRestore();
    });
  });

  // ========================================
  // Multiple Step User Workflows
  // ========================================
  describe("User workflows with multiple steps", () => {
    it("should complete filter-reset-load more workflow", async () => {
      axios.post.mockResolvedValue({
        data: { products: [mockProducts[0]] },
      });

      render(
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      );

      // Step 1: Apply filter
      const checkbox = await screen.findByRole("checkbox", {
        name: /electronics/i,
      });
      fireEvent.click(checkbox);

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalled();
      });

      // Step 2: Reset filters
      fireEvent.click(screen.getByText("RESET FILTERS"));
      expect(window.location.reload).toHaveBeenCalled();
    });

    it("should navigate to product and add to cart workflow", async () => {
      const mockCart = [];
      const mockSetCart = jest.fn();
      require("../context/cart").useCart.mockReturnValue([
        mockCart,
        mockSetCart,
      ]);

      render(
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("Laptop")).toBeInTheDocument();
      });

      // Step 1: Click More Details
      fireEvent.click(screen.getAllByText("More Details")[0]);
      expect(mockNavigate).toHaveBeenCalledWith("/product/laptop");

      // Step 2: Add to cart
      fireEvent.click(screen.getAllByText("ADD TO CART")[0]);
      expect(mockSetCart).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith("Item Added to cart");
    });
  });
});
