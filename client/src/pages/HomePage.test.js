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

jest.mock("react-icons/ai", () => ({
  AiOutlineReload: () => <span>↻</span>,
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

  // Component renders successfully
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

  // Fetches and displays categories
  it("fetches and displays categories on mount", async () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");
      expect(screen.getAllByText("Electronics").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Clothing").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Books").length).toBeGreaterThan(0);
    });
  });

  it("handles failure when fetching categories", async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes("/api/v1/category/get-category")) {
        return Promise.reject(new Error("Failed to fetch categories"));
      }
      return Promise.reject(new Error("Not found"));
    });

    // Spy on console.log to verify catch was triggered
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");
      expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
    });

    consoleSpy.mockRestore();
  });

  it("handles failure when fetching categories through success false", async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes("/api/v1/category/get-category")) {
        return Promise.resolve({
          data: { success: false, category: mockCategories },
        });
      }
    });
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");
    });
  });

  // Fetches and displays products
  it("fetches and displays products on mount", async () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/v1/product/product-list/1");
      expect(screen.getByText("Laptop")).toBeInTheDocument();
      expect(screen.getByText("T-Shirt")).toBeInTheDocument();
    });
  });

  it("handles failure when fetching products", async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes("/api/v1/product/product-list/1")) {
        return Promise.reject(new Error("Failed to fetch products"));
      }
      return Promise.reject(new Error("Not found"));
    });

    // Spy on console.log to verify catch was triggered
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/v1/product/product-list/1");
      expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
    });

    consoleSpy.mockRestore();
  });

  // Displays product details correctly
  it("displays product prices and descriptions", async () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("$999.99")).toBeInTheDocument();
      expect(screen.getByText("$19.99")).toBeInTheDocument();
      expect(
        screen.getByText("High performance laptop with great battery life...")
      ).toBeInTheDocument();
    });
  });

  // Navigate to product details
  it("navigates to product details when 'More Details' is clicked", async () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Laptop")).toBeInTheDocument();
    });

    const moreDetailsButtons = screen.getAllByText("More Details");
    fireEvent.click(moreDetailsButtons[0]);

    expect(mockNavigate).toHaveBeenCalledWith("/product/laptop");
  });

  //Add product to cart
  it("adds product to cart when 'ADD TO CART' is clicked", async () => {
    const mockCart = [];
    const mockSetCart = jest.fn();

    require("../context/cart").useCart.mockReturnValue([mockCart, mockSetCart]);

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Laptop")).toBeInTheDocument();
    });

    const addToCartButtons = screen.getAllByText("ADD TO CART");
    fireEvent.click(addToCartButtons[0]);

    expect(mockSetCart).toHaveBeenCalled();
    expect(localStorage.setItem).toHaveBeenCalledWith(
      "cart",
      expect.any(String)
    );
    expect(toast.success).toHaveBeenCalledWith("Item Added to cart");
  });

  // Filter by category
  it("filters products when category checkbox is selected", async () => {
    axios.post.mockResolvedValueOnce({
      data: { products: [mockProducts[0]] },
    });

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    // wait until categories have rendered
    await waitFor(() => {
      expect(
        screen.getByRole("checkbox", { name: /electronics/i })
      ).toBeInTheDocument();

      expect(
        screen.getByRole("checkbox", { name: /clothing/i })
      ).toBeInTheDocument();

      expect(
        screen.getByRole("checkbox", { name: /book/i })
      ).toBeInTheDocument();
    });

    // find the checkbox by its role + accessible name
    const electronicsCheckbox = screen.getByRole("checkbox", {
      name: /electronics/i,
    });
    fireEvent.click(electronicsCheckbox);

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        "/api/v1/product/product-filters",
        {
          checked: ["1"],
          radio: [],
        }
      );
    });
  });

  // Reset filters
  it("resets filters when RESET FILTERS button is clicked", async () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("RESET FILTERS")).toBeInTheDocument();
    });

    const resetButton = screen.getByText("RESET FILTERS");
    fireEvent.click(resetButton);

    expect(window.location.reload).toHaveBeenCalled();
  });

  // Load more products
  it("loads more products when 'Loadmore' button is clicked", async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes("/api/v1/category/get-category")) {
        return Promise.resolve({
          data: { success: true, category: mockCategories },
        });
      }
      if (url.includes("/api/v1/product/product-count")) {
        return Promise.resolve({
          data: { total: 10 },
        });
      }
      if (url.includes("/api/v1/product/product-list/1")) {
        return Promise.resolve({
          data: { products: mockProducts },
        });
      }
      if (url.includes("/api/v1/product/product-list/2")) {
        return Promise.resolve({
          data: { products: [mockProducts[0]] },
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

    const loadMoreButton = screen.getByText("Loadmore");
    fireEvent.click(loadMoreButton);

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/v1/product/product-list/2");
    });
  });

  //load more API failure
  it("handles error when Loadmore API call fails", async () => {
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    // Mock axios responses
    axios.get.mockImplementation((url) => {
      if (url.includes("/api/v1/category/get-category")) {
        return Promise.resolve({ data: { success: true, category: [] } });
      }
      if (url.includes("/api/v1/product/product-count")) {
        return Promise.resolve({ data: { total: 5 } });
      }
      if (url.includes("/api/v1/product/product-list/1")) {
        return Promise.resolve({
          data: { products: [mockProducts[0]] }, // initial page
        });
      }
      if (url.includes("/api/v1/product/product-list/2")) {
        // Fail on second page
        return Promise.reject(new Error("Loadmore failed"));
      }
      return Promise.reject(new Error("Not found"));
    });

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(mockProducts[0].name)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/loadmore/i));

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
    });

    consoleSpy.mockRestore();
  });

  // Hides load more button when all products loaded
  it("hides load more button when all products are displayed", async () => {
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
          data: { total: 2 }, // Same as number of products loaded
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

  it("falls back to getAllProducts when category checkbox is unchecked", async () => {
    // Mock axios
    axios.get.mockImplementation((url) => {
      if (url.includes("/api/v1/category/get-category")) {
        return Promise.resolve({
          data: {
            success: true,
            category: [{ _id: "1", name: "Electronics", slug: "electronics" }],
          },
        });
      }
      if (url.includes("/api/v1/product/product-count")) {
        return Promise.resolve({ data: { total: 1 } });
      }
      if (url.includes("/api/v1/product/product-list/1")) {
        return Promise.resolve({ data: { products: [mockProducts[0]] } });
      }
      return Promise.reject(new Error("Not found"));
    });

    axios.post.mockResolvedValue({
      data: { products: [mockProducts[0]] },
    });

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    // Wait for category checkbox to show
    await waitFor(() => {
      expect(
        screen.getByRole("checkbox", { name: /electronics/i })
      ).toBeInTheDocument();
    });

    const electronicsCheckbox = screen.getByRole("checkbox", {
      name: /electronics/i,
    });

    // First click → filter with POST
    fireEvent.click(electronicsCheckbox);

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        "/api/v1/product/product-filters",
        { checked: ["1"], radio: [] }
      );
    });

    fireEvent.click(electronicsCheckbox);

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/v1/product/product-list/1");
    });
  });

  it("logs error when filterProduct API call fails", async () => {
    // Spy on console.log to confirm the catch block runs
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    // Mock axios: reject on filter request
    axios.post.mockRejectedValueOnce(new Error("Filter API failed"));

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    // Wait until category checkbox is in DOM
    await waitFor(() => {
      expect(
        screen.getByRole("checkbox", { name: /electronics/i })
      ).toBeInTheDocument();
    });

    const electronicsCheckbox = screen.getByRole("checkbox", {
      name: /electronics/i,
    });

    // Click to trigger filterProduct
    fireEvent.click(electronicsCheckbox);

    // Expect error to have been logged
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
    });

    consoleSpy.mockRestore();
  });

  it("filters products when a price radio option is selected", async () => {
    axios.post.mockResolvedValueOnce({ data: { products: [mockProducts[1]] } });

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    // Wait for the first radio option to appear
    const radio = await screen.findByRole("radio", { name: /\$0 to 19/i });

    // Click it
    fireEvent.click(radio);

    // Expect axios.post called with radio value
    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        "/api/v1/product/product-filters",
        {
          checked: [],
          radio: [0, 19],
        }
      );
    });
  });

  it("calls getAllProducts or filterProduct correctly for all combinations of checked and radio lengths", async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes("/api/v1/category/get-category")) {
        return Promise.resolve({
          data: { success: true, category: mockCategories },
        });
      }
      if (url.includes("/api/v1/product/product-count")) {
        return Promise.resolve({ data: { total: 10 } });
      }
      if (url.includes("/api/v1/product/product-list/1")) {
        return Promise.resolve({ data: { products: mockProducts } });
      }
      return Promise.resolve({ data: {} });
    });

    axios.post.mockResolvedValue({ data: { products: [mockProducts[0]] } });

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/v1/product/product-list/1");
    });

    const electronicsCheckbox = await screen.findByRole("checkbox", {
      name: /electronics/i,
    });
    const firstRadio = await screen.findByRole("radio", { name: /\$0 to 19/i });

    axios.get.mockClear();
    axios.post.mockClear();

    fireEvent.click(electronicsCheckbox);

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalled();
      expect(axios.post).toHaveBeenCalledWith(
        "/api/v1/product/product-filters",
        { checked: ["1"], radio: [] }
      );
    });

    const getCallsAfterCheck = axios.get.mock.calls.length;
    const postCallsAfterCheck = axios.post.mock.calls.length;

    fireEvent.click(firstRadio);

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalled();
    });

    expect(axios.get.mock.calls.length).toBe(getCallsAfterCheck); // no new GET
    expect(axios.post.mock.calls.length).toBeGreaterThanOrEqual(
      postCallsAfterCheck + 1
    );

    fireEvent.click(electronicsCheckbox);

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalled();
      expect(axios.post).toHaveBeenCalled();
    });
  });
});
