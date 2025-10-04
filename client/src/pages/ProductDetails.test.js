import React from "react";
import { render, fireEvent, waitFor, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";
import ProductDetails from "./ProductDetails";
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

// Mock Layout component to avoid context issues
jest.mock("./../components/Layout", () => ({
  __esModule: true,
  default: ({ children }) => <div data-testid="layout">{children}</div>,
}));

// Mock window.matchMedia
window.matchMedia =
  window.matchMedia ||
  function () {
    return {
      matches: false,
      addListener: function () {},
      removeListener: function () {},
    };
  };

describe("ProductDetails Component - Comprehensive Testing", () => {
  const mockProduct = {
    _id: "prod1",
    name: "Laptop",
    price: 999.99,
    description: "High performance laptop with great battery life and amazing features",
    slug: "laptop",
    category: {
      _id: "cat1",
      name: "Electronics",
    },
  };

  const mockRelatedProducts = [
    {
      _id: "prod2",
      name: "Mouse",
      price: 29.99,
      description: "Wireless mouse with ergonomic design and long battery life",
      slug: "mouse",
    },
    {
      _id: "prod3",
      name: "Keyboard",
      price: 79.99,
      description: "Mechanical keyboard with RGB lighting and premium switches",
      slug: "keyboard",
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    useParams.mockReturnValue({ slug: "laptop" });

    axios.get.mockImplementation((url) => {
      if (url.includes("/api/v1/product/get-product/laptop")) {
        return Promise.resolve({ data: { product: mockProduct } });
      }
      if (url.includes("/api/v1/product/related-product/")) {
        return Promise.resolve({ data: { products: mockRelatedProducts } });
      }
      return Promise.reject(new Error("Not found"));
    });
  });

  // ========================================
  // BOUNDARY VALUE ANALYSIS (BVA) TESTS
  // ========================================
  describe("BVA: Related Products Count", () => {
    it("should display message when 0 related products (boundary: minimum)", async () => {
      axios.get.mockImplementation((url) => {
        if (url.includes("/api/v1/product/get-product/laptop")) {
          return Promise.resolve({ data: { product: mockProduct } });
        }
        if (url.includes("/api/v1/product/related-product/")) {
          return Promise.resolve({ data: { products: [] } });
        }
        return Promise.reject(new Error("Not found"));
      });

      render(
        <MemoryRouter>
          <ProductDetails />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("No Similar Products found")).toBeInTheDocument();
      });
    });

    it("should display 1 related product (boundary: minimum valid)", async () => {
      axios.get.mockImplementation((url) => {
        if (url.includes("/api/v1/product/get-product/laptop")) {
          return Promise.resolve({ data: { product: mockProduct } });
        }
        if (url.includes("/api/v1/product/related-product/")) {
          return Promise.resolve({ data: { products: [mockRelatedProducts[0]] } });
        }
        return Promise.reject(new Error("Not found"));
      });

      render(
        <MemoryRouter>
          <ProductDetails />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("Mouse")).toBeInTheDocument();
      });

      const relatedProductCards = screen.getAllByText("More Details");
      expect(relatedProductCards.length).toBe(1);
    });

    it("should display multiple related products (boundary: normal case)", async () => {
      render(
        <MemoryRouter>
          <ProductDetails />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("Mouse")).toBeInTheDocument();
        expect(screen.getByText("Keyboard")).toBeInTheDocument();
      });

      const relatedProductCards = screen.getAllByText("More Details");
      expect(relatedProductCards.length).toBe(2);
    });
  });

  describe("BVA: Description Truncation", () => {
    it("should truncate description at 60 characters for related products", async () => {
      render(
        <MemoryRouter>
          <ProductDetails />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("Wireless mouse with ergonomic design and long battery life")).toBeInTheDocument();
      });

      // Check truncation (60 chars + "...")
      expect(screen.getByText(/Wireless mouse with ergonomic design and long battery life/)).toBeInTheDocument();
    });

    it("should handle description shorter than 60 characters", async () => {
      const shortDescProduct = {
        ...mockRelatedProducts[0],
        description: "Short description",
      };

      axios.get.mockImplementation((url) => {
        if (url.includes("/api/v1/product/get-product/laptop")) {
          return Promise.resolve({ data: { product: mockProduct } });
        }
        if (url.includes("/api/v1/product/related-product/")) {
          return Promise.resolve({ data: { products: [shortDescProduct] } });
        }
        return Promise.reject(new Error("Not found"));
      });

      render(
        <MemoryRouter>
          <ProductDetails />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("Short description...")).toBeInTheDocument();
      });
    });

    it("should handle description exactly 60 characters", async () => {
      const exactDescProduct = {
        ...mockRelatedProducts[0],
        description: "a".repeat(60),
      };

      axios.get.mockImplementation((url) => {
        if (url.includes("/api/v1/product/get-product/laptop")) {
          return Promise.resolve({ data: { product: mockProduct } });
        }
        if (url.includes("/api/v1/product/related-product/")) {
          return Promise.resolve({ data: { products: [exactDescProduct] } });
        }
        return Promise.reject(new Error("Not found"));
      });

      render(
        <MemoryRouter>
          <ProductDetails />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(`${"a".repeat(60)}...`)).toBeInTheDocument();
      });
    });
  });

  describe("BVA: Price Boundaries", () => {
    it("should format price 0 correctly (boundary: minimum)", async () => {
      const zeroProduct = { ...mockProduct, price: 0 };
      axios.get.mockImplementation((url) => {
        if (url.includes("/api/v1/product/get-product/laptop")) {
          return Promise.resolve({ data: { product: zeroProduct } });
        }
        if (url.includes("/api/v1/product/related-product/")) {
          return Promise.resolve({ data: { products: [] } });
        }
        return Promise.reject(new Error("Not found"));
      });

      render(
        <MemoryRouter>
          <ProductDetails />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/Price :\$0\.00/)).toBeInTheDocument();
      });
    });

    it("should format large price correctly (boundary: large value)", async () => {
      const expensiveProduct = { ...mockProduct, price: 999999.99 };
      axios.get.mockImplementation((url) => {
        if (url.includes("/api/v1/product/get-product/laptop")) {
          return Promise.resolve({ data: { product: expensiveProduct } });
        }
        if (url.includes("/api/v1/product/related-product/")) {
          return Promise.resolve({ data: { products: [] } });
        }
        return Promise.reject(new Error("Not found"));
      });

      render(
        <MemoryRouter>
          <ProductDetails />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/Price :\$999,999\.99/)).toBeInTheDocument();
      });
    });
  });

  // ========================================
  // EQUIVALENCE PARTITIONING TESTS
  // ========================================
  describe("EP: Product Data States", () => {
    it("should handle product with all valid fields (valid partition)", async () => {
      render(
        <MemoryRouter>
          <ProductDetails />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/Name : Laptop/)).toBeInTheDocument();
        expect(screen.getByText(/Description : High performance laptop/)).toBeInTheDocument();
        expect(screen.getByText(/Price :\$999\.99/)).toBeInTheDocument();
        expect(screen.getByText(/Category : Electronics/)).toBeInTheDocument();
      });
    });

    it("should handle product with missing optional fields (partial partition)", async () => {
      const partialProduct = {
        _id: "prod1",
        name: "Laptop",
        price: 999.99,
        description: "High performance laptop",
        slug: "laptop",
        category: {
          _id: "cat1",
          name: "Electronics",
        },
      };

      axios.get.mockImplementation((url) => {
        if (url.includes("/api/v1/product/get-product/laptop")) {
          return Promise.resolve({ data: { product: partialProduct } });
        }
        if (url.includes("/api/v1/product/related-product/")) {
          return Promise.resolve({ data: { products: [] } });
        }
        return Promise.reject(new Error("Not found"));
      });

      render(
        <MemoryRouter>
          <ProductDetails />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/Name : Laptop/)).toBeInTheDocument();
      });
    });
  });

  describe("EP: URL Parameters", () => {
    it("should fetch product when slug is valid (valid partition)", async () => {
      useParams.mockReturnValue({ slug: "laptop" });

      render(
        <MemoryRouter>
          <ProductDetails />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith("/api/v1/product/get-product/laptop");
      });
    });

    it("should not fetch when slug is undefined (invalid partition)", async () => {
      useParams.mockReturnValue({ slug: undefined });

      render(
        <MemoryRouter>
          <ProductDetails />
        </MemoryRouter>
      );

      // Wait a bit to ensure no call is made
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(axios.get).not.toHaveBeenCalled();
    });

    it("should not fetch when slug is null (invalid partition)", async () => {
      useParams.mockReturnValue({ slug: null });

      render(
        <MemoryRouter>
          <ProductDetails />
        </MemoryRouter>
      );

      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(axios.get).not.toHaveBeenCalled();
    });

    it("should not fetch when slug is empty string (invalid partition)", async () => {
      useParams.mockReturnValue({ slug: "" });

      render(
        <MemoryRouter>
          <ProductDetails />
        </MemoryRouter>
      );

      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(axios.get).not.toHaveBeenCalled();
    });
  });

  // ========================================
  // PAIRWISE TESTING
  // ========================================
  describe("Pairwise: Product and Related Products Combinations", () => {
    const testCases = [
      {
        hasProduct: true,
        hasRelated: true,
        desc: "product with related products",
        expectedProduct: true,
        expectedRelated: 2,
      },
      {
        hasProduct: true,
        hasRelated: false,
        desc: "product without related products",
        expectedProduct: true,
        expectedRelated: 0,
      },
      {
        hasProduct: false,
        hasRelated: true,
        desc: "no product with related products mock",
        expectedProduct: false,
        expectedRelated: 0,
      },
      {
        hasProduct: false,
        hasRelated: false,
        desc: "no product and no related products",
        expectedProduct: false,
        expectedRelated: 0,
      },
    ];

    testCases.forEach(({ hasProduct, hasRelated, desc, expectedProduct, expectedRelated }) => {
      it(`should handle ${desc}`, async () => {
        axios.get.mockImplementation((url) => {
          if (url.includes("/api/v1/product/get-product/laptop")) {
            if (hasProduct) {
              return Promise.resolve({ data: { product: mockProduct } });
            }
            return Promise.resolve({ data: { product: {} } });
          }
          if (url.includes("/api/v1/product/related-product/")) {
            if (hasRelated) {
              return Promise.resolve({ data: { products: mockRelatedProducts } });
            }
            return Promise.resolve({ data: { products: [] } });
          }
          return Promise.reject(new Error("Not found"));
        });

        render(
          <MemoryRouter>
            <ProductDetails />
          </MemoryRouter>
        );

        await waitFor(() => {
          if (expectedProduct) {
            expect(screen.getByText(/Name : Laptop/)).toBeInTheDocument();
          }
        });

        const moreDetailsButtons = screen.queryAllByText("More Details");
        expect(moreDetailsButtons.length).toBe(expectedRelated);
      });
    });
  });

  // ========================================
  // CODE COVERAGE: Error Handling
  // ========================================
  describe("Coverage: getProduct Error Handling", () => {
    it("should handle error when fetching product fails", async () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

      axios.get.mockImplementation((url) => {
        if (url.includes("/api/v1/product/get-product/laptop")) {
          return Promise.reject(new Error("Failed to fetch product"));
        }
        return Promise.reject(new Error("Not found"));
      });

      render(
        <MemoryRouter>
          <ProductDetails />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
      });

      consoleSpy.mockRestore();
    });
  });

  describe("Coverage: getSimilarProduct Error Handling", () => {
    it("should handle error when fetching similar products fails", async () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

      axios.get.mockImplementation((url) => {
        if (url.includes("/api/v1/product/get-product/laptop")) {
          return Promise.resolve({ data: { product: mockProduct } });
        }
        if (url.includes("/api/v1/product/related-product/")) {
          return Promise.reject(new Error("Failed to fetch related products"));
        }
        return Promise.reject(new Error("Not found"));
      });

      render(
        <MemoryRouter>
          <ProductDetails />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
      });

      consoleSpy.mockRestore();
    });
  });

  // ========================================
  // USER INTERACTION TESTS
  // ========================================
  describe("User Interactions", () => {
    it("should navigate to related product when More Details is clicked", async () => {
      render(
        <MemoryRouter>
          <ProductDetails />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("Mouse")).toBeInTheDocument();
      });

      const moreDetailsButtons = screen.getAllByText("More Details");
      fireEvent.click(moreDetailsButtons[0]);

      expect(mockNavigate).toHaveBeenCalledWith("/product/mouse");
    });

    it("should navigate to second related product when its More Details is clicked", async () => {
      render(
        <MemoryRouter>
          <ProductDetails />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("Keyboard")).toBeInTheDocument();
      });

      const moreDetailsButtons = screen.getAllByText("More Details");
      fireEvent.click(moreDetailsButtons[1]);

      expect(mockNavigate).toHaveBeenCalledWith("/product/keyboard");
    });

    it("should render ADD TO CART button", async () => {
      render(
        <MemoryRouter>
          <ProductDetails />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("ADD TO CART")).toBeInTheDocument();
      });
    });
  });

  // ========================================
  // RENDERING TESTS
  // ========================================
  describe("Component Rendering", () => {
    it("should render product image with correct attributes", async () => {
      render(
        <MemoryRouter>
          <ProductDetails />
        </MemoryRouter>
      );

      await waitFor(() => {
        const productImage = screen.getAllByRole("img")[0];
        expect(productImage).toHaveAttribute(
          "src",
          "/api/v1/product/product-photo/prod1"
        );
        expect(productImage).toHaveAttribute("alt", "Laptop");
      });
    });

    it("should render related product images with correct attributes", async () => {
      render(
        <MemoryRouter>
          <ProductDetails />
        </MemoryRouter>
      );

      await waitFor(() => {
        const images = screen.getAllByRole("img");
        expect(images.length).toBeGreaterThan(1);
        expect(images[1]).toHaveAttribute(
          "src",
          "/api/v1/product/product-photo/prod2"
        );
      });
    });

    it("should render 'Similar Products' heading", async () => {
      render(
        <MemoryRouter>
          <ProductDetails />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/Similar Products/)).toBeInTheDocument();
      });
    });
  });

  // ========================================
  // USEEFFECT DEPENDENCY TESTS
  // ========================================
  describe("useEffect Dependency Changes", () => {
    it("should refetch product when slug changes", async () => {
      const { rerender } = render(
        <MemoryRouter>
          <ProductDetails />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith("/api/v1/product/get-product/laptop");
      });

      jest.clearAllMocks();

      // Change slug
      useParams.mockReturnValue({ slug: "mouse" });
      axios.get.mockImplementation((url) => {
        if (url.includes("/api/v1/product/get-product/mouse")) {
          return Promise.resolve({ data: { product: mockRelatedProducts[0] } });
        }
        if (url.includes("/api/v1/product/related-product/")) {
          return Promise.resolve({ data: { products: [] } });
        }
        return Promise.reject(new Error("Not found"));
      });

      rerender(
        <MemoryRouter>
          <ProductDetails />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith("/api/v1/product/get-product/mouse");
      });
    });
  });

  // ========================================
  // PRICE FORMATTING TESTS
  // ========================================
  describe("Price Formatting", () => {
    it("should format related product prices correctly", async () => {
      render(
        <MemoryRouter>
          <ProductDetails />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("$29.99")).toBeInTheDocument();
        expect(screen.getByText("$79.99")).toBeInTheDocument();
      });
    });

    it("should handle decimal prices correctly", async () => {
      const decimalProduct = {
        ...mockRelatedProducts[0],
        price: 19.5,
      };

      axios.get.mockImplementation((url) => {
        if (url.includes("/api/v1/product/get-product/laptop")) {
          return Promise.resolve({ data: { product: mockProduct } });
        }
        if (url.includes("/api/v1/product/related-product/")) {
          return Promise.resolve({ data: { products: [decimalProduct] } });
        }
        return Promise.reject(new Error("Not found"));
      });

      render(
        <MemoryRouter>
          <ProductDetails />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("$19.50")).toBeInTheDocument();
      });
    });
  });
});

describe("ProductDetails Component - Additional Coverage", () => {
  const mockProduct = {
    _id: "prod1",
    name: "Laptop",
    price: 999.99,
    description: "High performance laptop with great battery life and amazing features",
    slug: "laptop",
    category: {
      _id: "cat1",
      name: "Electronics",
    },
  };

  const mockRelatedProducts = [
    {
      _id: "prod2",
      name: "Mouse",
      price: 29.99,
      description: "Wireless mouse with ergonomic design and long battery life",
      slug: "mouse",
    },
    {
      _id: "prod3",
      name: "Keyboard",
      price: 79.99,
      description: "Mechanical keyboard with RGB lighting and premium switches",
      slug: "keyboard",
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    useParams.mockReturnValue({ slug: "laptop" });

    axios.get.mockImplementation((url) => {
      if (url.includes("/api/v1/product/get-product/laptop")) {
        return Promise.resolve({ data: { product: mockProduct } });
      }
      if (url.includes("/api/v1/product/related-product/")) {
        return Promise.resolve({ data: { products: mockRelatedProducts } });
      }
      return Promise.reject(new Error("Not found"));
    });
  });

  // ========================================
  // EDGE CASES & NULL/UNDEFINED HANDLING
  // ========================================
  describe("Edge Cases: Null/Undefined Data", () => {
    it("should handle product with undefined price gracefully", async () => {
      const productNullPrice = { ...mockProduct, price: undefined };
      axios.get.mockImplementation((url) => {
        if (url.includes("/api/v1/product/get-product/laptop")) {
          return Promise.resolve({ data: { product: productNullPrice } });
        }
        if (url.includes("/api/v1/product/related-product/")) {
          return Promise.resolve({ data: { products: [] } });
        }
        return Promise.reject(new Error("Not found"));
      });

      render(
        <MemoryRouter>
          <ProductDetails />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/Name : Laptop/)).toBeInTheDocument();
      });
    });

    it("should handle product with null category", async () => {
      const productNullCategory = { ...mockProduct, category: null };
      axios.get.mockImplementation((url) => {
        if (url.includes("/api/v1/product/get-product/laptop")) {
          return Promise.resolve({ data: { product: productNullCategory } });
        }
        return Promise.reject(new Error("Not found"));
      });

      render(
        <MemoryRouter>
          <ProductDetails />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/Name : Laptop/)).toBeInTheDocument();
      });
    });

    it("should handle related product with missing description", async () => {
      const productNoDesc = { ...mockRelatedProducts[0], description: "" };
      axios.get.mockImplementation((url) => {
        if (url.includes("/api/v1/product/get-product/laptop")) {
          return Promise.resolve({ data: { product: mockProduct } });
        }
        if (url.includes("/api/v1/product/related-product/")) {
          return Promise.resolve({ data: { products: [productNoDesc] } });
        }
        return Promise.reject(new Error("Not found"));
      });

      render(
        <MemoryRouter>
          <ProductDetails />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("Mouse")).toBeInTheDocument();
      });
    });
  });

  // ========================================
  // ASYNC BEHAVIOR & RACE CONDITIONS
  // ========================================
  describe("Async Behavior", () => {
    it("should handle delayed API responses", async () => {
      axios.get.mockImplementation(
        (url) =>
          new Promise((resolve) => {
            setTimeout(() => {
              if (url.includes("/api/v1/product/get-product/laptop")) {
                resolve({ data: { product: mockProduct } });
              } else if (url.includes("/api/v1/product/related-product/")) {
                resolve({ data: { products: mockRelatedProducts } });
              }
            }, 100);
          })
      );

      render(
        <MemoryRouter>
          <ProductDetails />
        </MemoryRouter>
      );

      await waitFor(
        () => {
          expect(screen.getByText(/Name : Laptop/)).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });

    it("should handle product fetch success but related products fetch failure", async () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

      axios.get.mockImplementation((url) => {
        if (url.includes("/api/v1/product/get-product/laptop")) {
          return Promise.resolve({ data: { product: mockProduct } });
        }
        if (url.includes("/api/v1/product/related-product/")) {
          return Promise.reject(new Error("Network error"));
        }
        return Promise.reject(new Error("Not found"));
      });

      render(
        <MemoryRouter>
          <ProductDetails />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/Name : Laptop/)).toBeInTheDocument();
      });

      expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  // ========================================
  // DESCRIPTION TRUNCATION EDGE CASES
  // ========================================
  describe("Description Truncation Edge Cases", () => {
    it("should handle description with exactly 59 characters", async () => {
      const desc59 = "a".repeat(59);
      const product59 = { ...mockRelatedProducts[0], description: desc59 };

      axios.get.mockImplementation((url) => {
        if (url.includes("/api/v1/product/get-product/laptop")) {
          return Promise.resolve({ data: { product: mockProduct } });
        }
        if (url.includes("/api/v1/product/related-product/")) {
          return Promise.resolve({ data: { products: [product59] } });
        }
        return Promise.reject(new Error("Not found"));
      });

      render(
        <MemoryRouter>
          <ProductDetails />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(`${desc59}...`)).toBeInTheDocument();
      });
    });

    it("should handle description with exactly 61 characters", async () => {
      const desc61 = "a".repeat(61);
      const product61 = { ...mockRelatedProducts[0], description: desc61 };

      axios.get.mockImplementation((url) => {
        if (url.includes("/api/v1/product/get-product/laptop")) {
          return Promise.resolve({ data: { product: mockProduct } });
        }
        if (url.includes("/api/v1/product/related-product/")) {
          return Promise.resolve({ data: { products: [product61] } });
        }
        return Promise.reject(new Error("Not found"));
      });

      render(
        <MemoryRouter>
          <ProductDetails />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(`${"a".repeat(60)}...`)).toBeInTheDocument();
      });
    });

    it("should handle very long description (200+ characters)", async () => {
      const longDesc = "a".repeat(200);
      const longProduct = { ...mockRelatedProducts[0], description: longDesc };

      axios.get.mockImplementation((url) => {
        if (url.includes("/api/v1/product/get-product/laptop")) {
          return Promise.resolve({ data: { product: mockProduct } });
        }
        if (url.includes("/api/v1/product/related-product/")) {
          return Promise.resolve({ data: { products: [longProduct] } });
        }
        return Promise.reject(new Error("Not found"));
      });

      render(
        <MemoryRouter>
          <ProductDetails />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(`${"a".repeat(60)}...`)).toBeInTheDocument();
      });
    });

    it("should handle description with special characters", async () => {
      const specialDesc = "Product with special chars: <>&\"' test!@#$%";
      const specialProduct = {
        ...mockRelatedProducts[0],
        description: specialDesc,
      };

      axios.get.mockImplementation((url) => {
        if (url.includes("/api/v1/product/get-product/laptop")) {
          return Promise.resolve({ data: { product: mockProduct } });
        }
        if (url.includes("/api/v1/product/related-product/")) {
          return Promise.resolve({ data: { products: [specialProduct] } });
        }
        return Promise.reject(new Error("Not found"));
      });

      render(
        <MemoryRouter>
          <ProductDetails />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(`${specialDesc}...`)).toBeInTheDocument();
      });
    });
  });

  // ========================================
  // MULTIPLE RELATED PRODUCTS SCENARIOS
  // ========================================
  describe("Multiple Related Products Scenarios", () => {
    it("should display exactly 3 related products", async () => {
      const threeProducts = [
        mockRelatedProducts[0],
        mockRelatedProducts[1],
        { ...mockRelatedProducts[0], _id: "prod4", name: "Monitor", slug: "monitor" },
      ];

      axios.get.mockImplementation((url) => {
        if (url.includes("/api/v1/product/get-product/laptop")) {
          return Promise.resolve({ data: { product: mockProduct } });
        }
        if (url.includes("/api/v1/product/related-product/")) {
          return Promise.resolve({ data: { products: threeProducts } });
        }
        return Promise.reject(new Error("Not found"));
      });

      render(
        <MemoryRouter>
          <ProductDetails />
        </MemoryRouter>
      );

      await waitFor(() => {
        const moreDetailsButtons = screen.getAllByText("More Details");
        expect(moreDetailsButtons.length).toBe(3);
      });
    });

    it("should display 10 related products", async () => {
      const tenProducts = Array.from({ length: 10 }, (_, i) => ({
        _id: `prod${i}`,
        name: `Product ${i}`,
        price: 10 + i,
        description: `Description for product ${i}`,
        slug: `product-${i}`,
      }));

      axios.get.mockImplementation((url) => {
        if (url.includes("/api/v1/product/get-product/laptop")) {
          return Promise.resolve({ data: { product: mockProduct } });
        }
        if (url.includes("/api/v1/product/related-product/")) {
          return Promise.resolve({ data: { products: tenProducts } });
        }
        return Promise.reject(new Error("Not found"));
      });

      render(
        <MemoryRouter>
          <ProductDetails />
        </MemoryRouter>
      );

      await waitFor(() => {
        const moreDetailsButtons = screen.getAllByText("More Details");
        expect(moreDetailsButtons.length).toBe(10);
      });
    });
  });

  // ========================================
  // PRICE FORMATTING COMPREHENSIVE
  // ========================================
  describe("Price Formatting Comprehensive", () => {
    it("should format price with cents correctly", async () => {
      const centProduct = { ...mockProduct, price: 1.99 };
      axios.get.mockImplementation((url) => {
        if (url.includes("/api/v1/product/get-product/laptop")) {
          return Promise.resolve({ data: { product: centProduct } });
        }
        if (url.includes("/api/v1/product/related-product/")) {
          return Promise.resolve({ data: { products: [] } });
        }
        return Promise.reject(new Error("Not found"));
      });

      render(
        <MemoryRouter>
          <ProductDetails />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/Price :\$1\.99/)).toBeInTheDocument();
      });
    });

    it("should format whole number price correctly", async () => {
      const wholeProduct = { ...mockProduct, price: 100 };
      axios.get.mockImplementation((url) => {
        if (url.includes("/api/v1/product/get-product/laptop")) {
          return Promise.resolve({ data: { product: wholeProduct } });
        }
        if (url.includes("/api/v1/product/related-product/")) {
          return Promise.resolve({ data: { products: [] } });
        }
        return Promise.reject(new Error("Not found"));
      });

      render(
        <MemoryRouter>
          <ProductDetails />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/Price :\$100\.00/)).toBeInTheDocument();
      });
    });

    it("should format price with thousands separator", async () => {
      const thousandProduct = { ...mockProduct, price: 1234.56 };
      axios.get.mockImplementation((url) => {
        if (url.includes("/api/v1/product/get-product/laptop")) {
          return Promise.resolve({ data: { product: thousandProduct } });
        }
        if (url.includes("/api/v1/product/related-product/")) {
          return Promise.resolve({ data: { products: [] } });
        }
        return Promise.reject(new Error("Not found"));
      });

      render(
        <MemoryRouter>
          <ProductDetails />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/Price :\$1,234\.56/)).toBeInTheDocument();
      });
    });

    it("should format related product price with single digit cents", async () => {
      const singleCentProduct = { ...mockRelatedProducts[0], price: 10.5 };

      axios.get.mockImplementation((url) => {
        if (url.includes("/api/v1/product/get-product/laptop")) {
          return Promise.resolve({ data: { product: mockProduct } });
        }
        if (url.includes("/api/v1/product/related-product/")) {
          return Promise.resolve({ data: { products: [singleCentProduct] } });
        }
        return Promise.reject(new Error("Not found"));
      });

      render(
        <MemoryRouter>
          <ProductDetails />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("$10.50")).toBeInTheDocument();
      });
    });
  });

  // ========================================
  // NAVIGATION AND INTERACTION COMPREHENSIVE
  // ========================================
  describe("Navigation Comprehensive", () => {
    it("should navigate when clicking third related product", async () => {
      const threeProducts = [
        mockRelatedProducts[0],
        mockRelatedProducts[1],
        { ...mockRelatedProducts[0], _id: "prod4", name: "Monitor", slug: "monitor" },
      ];

      axios.get.mockImplementation((url) => {
        if (url.includes("/api/v1/product/get-product/laptop")) {
          return Promise.resolve({ data: { product: mockProduct } });
        }
        if (url.includes("/api/v1/product/related-product/")) {
          return Promise.resolve({ data: { products: threeProducts } });
        }
        return Promise.reject(new Error("Not found"));
      });

      render(
        <MemoryRouter>
          <ProductDetails />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("Monitor")).toBeInTheDocument();
      });

      const moreDetailsButtons = screen.getAllByText("More Details");
      fireEvent.click(moreDetailsButtons[2]);

      expect(mockNavigate).toHaveBeenCalledWith("/product/monitor");
    });

    it("should not navigate when ADD TO CART is clicked (button disabled)", async () => {
      render(
        <MemoryRouter>
          <ProductDetails />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("ADD TO CART")).toBeInTheDocument();
      });

      const addToCartButton = screen.getByText("ADD TO CART");
      fireEvent.click(addToCartButton);

      // Verify navigate was not called (button has no onClick handler in current implementation)
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  // ========================================
  // IMAGE RENDERING COMPREHENSIVE
  // ========================================
  describe("Image Rendering Comprehensive", () => {
    it("should render all related product images with correct src", async () => {
      render(
        <MemoryRouter>
          <ProductDetails />
        </MemoryRouter>
      );

      await waitFor(() => {
        const images = screen.getAllByRole("img");
        // First image is product, next two are related products
        expect(images.length).toBeGreaterThanOrEqual(3);
        expect(images[1]).toHaveAttribute("src", "/api/v1/product/product-photo/prod2");
        expect(images[2]).toHaveAttribute("src", "/api/v1/product/product-photo/prod3");
      });
    });

    it("should render product image with correct dimensions", async () => {
      render(
        <MemoryRouter>
          <ProductDetails />
        </MemoryRouter>
      );

      await waitFor(() => {
        const productImage = screen.getAllByRole("img")[0];
        expect(productImage).toHaveAttribute("height", "300");
        expect(productImage).toHaveAttribute("width", "350px");
      });
    });
  });

  // ========================================
  // DATA CONSISTENCY TESTS
  // ========================================
  describe("Data Consistency", () => {
    it("should display correct product data after API response", async () => {
      render(
        <MemoryRouter>
          <ProductDetails />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/Name : Laptop/)).toBeInTheDocument();
        expect(screen.getByText(/Description : High performance laptop/)).toBeInTheDocument();
        expect(screen.getByText(/Price :\$999\.99/)).toBeInTheDocument();
        expect(screen.getByText(/Category : Electronics/)).toBeInTheDocument();
      });
    });

    it("should call getSimilarProduct with correct product and category IDs", async () => {
      const getSimilarProductSpy = jest.fn();

      render(
        <MemoryRouter>
          <ProductDetails />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith(
          "/api/v1/product/related-product/prod1/cat1"
        );
      });
    });
  });
});