import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import Products from "./Products";

// Mock dependencies
jest.mock("axios");
jest.mock("react-hot-toast");

// Mock child components
jest.mock("../../components/Layout", () => ({ children }) => (
  <div data-testid="layout">{children}</div>
));

jest.mock("../../components/AdminMenu", () => () => (
  <div data-testid="admin-menu">AdminMenu</div>
));

describe("Products Component", () => {
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
    {
      _id: "3",
      name: "Tablet",
      description: "Portable tablet device",
      slug: "tablet",
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("Rendering", () => {
    it("renders layout structure with all core components", async () => {
      // Arrange
      axios.get.mockResolvedValue({ data: { products: [] } });

      // Act
      render(
        <MemoryRouter>
          <Products />
        </MemoryRouter>
      );

      // Assert
      expect(screen.getByTestId("layout")).toBeInTheDocument();
      expect(screen.getByTestId("admin-menu")).toBeInTheDocument();
      expect(screen.getByText("All Products List")).toBeInTheDocument();
    });

    it("renders heading with correct styling", async () => {
      // Arrange
      axios.get.mockResolvedValue({ data: { products: [] } });

      // Act
      render(
        <MemoryRouter>
          <Products />
        </MemoryRouter>
      );

      // Assert
      const heading = screen.getByText("All Products List");
      expect(heading.tagName).toBe("H1");
    });
  });

  describe("Data Fetching", () => {
    it("fetches products from API on component mount", async () => {
      // Arrange
      axios.get.mockResolvedValue({ data: { products: [] } });

      // Act
      render(
        <MemoryRouter>
          <Products />
        </MemoryRouter>
      );

      // Assert
      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith("/api/v1/product/get-product");
      });
      expect(axios.get).toHaveBeenCalledTimes(1);
    });

    it("updates state with fetched products on success", async () => {
      // Arrange
      axios.get.mockResolvedValue({ data: { products: mockProducts } });

      // Act
      render(
        <MemoryRouter>
          <Products />
        </MemoryRouter>
      );

      // Assert
      await waitFor(() => {
        expect(screen.getByText("Laptop")).toBeInTheDocument();
      });
      expect(screen.getByText("Phone")).toBeInTheDocument();
      expect(screen.getByText("Tablet")).toBeInTheDocument();
    });

    it("logs error and shows toast on fetch failure", async () => {
      // Arrange
      const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();
      const mockError = new Error("Network error");
      axios.get.mockRejectedValue(mockError);

      // Act
      render(
        <MemoryRouter>
          <Products />
        </MemoryRouter>
      );

      // Assert
      await waitFor(() => {
        expect(consoleLogSpy).toHaveBeenCalledWith(mockError);
      });
      expect(toast.error).toHaveBeenCalledWith("Someething Went Wrong");
      consoleLogSpy.mockRestore();
    });
  });

  describe("Product Display - Boundary Value Analysis", () => {
    it("handles empty products array (0 products)", async () => {
      // Arrange
      axios.get.mockResolvedValue({ data: { products: [] } });

      // Act
      render(
        <MemoryRouter>
          <Products />
        </MemoryRouter>
      );

      // Assert
      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
      });
      expect(screen.queryByText("Laptop")).not.toBeInTheDocument();
    });

    it("renders single product correctly (1 product boundary)", async () => {
      // Arrange
      const singleProduct = [mockProducts[0]];
      axios.get.mockResolvedValue({ data: { products: singleProduct } });

      // Act
      render(
        <MemoryRouter>
          <Products />
        </MemoryRouter>
      );

      // Assert
      await waitFor(() => {
        expect(screen.getByText("Laptop")).toBeInTheDocument();
      });
      expect(screen.getByText("High performance laptop")).toBeInTheDocument();
    });

    it("renders multiple products correctly (3 products)", async () => {
      // Arrange
      axios.get.mockResolvedValue({ data: { products: mockProducts } });

      // Act
      render(
        <MemoryRouter>
          <Products />
        </MemoryRouter>
      );

      // Assert
      await waitFor(() => {
        expect(screen.getByText("Laptop")).toBeInTheDocument();
      });
      expect(screen.getByText("Phone")).toBeInTheDocument();
      expect(screen.getByText("Tablet")).toBeInTheDocument();
    });

    it("handles null products gracefully", async () => {
      // Arrange
      axios.get.mockResolvedValue({ data: { products: null } });

      // Act
      render(
        <MemoryRouter>
          <Products />
        </MemoryRouter>
      );

      // Assert
      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
      });
      expect(screen.queryByText("Laptop")).not.toBeInTheDocument();
    });

    it("handles undefined products gracefully", async () => {
      // Arrange
      axios.get.mockResolvedValue({ data: {} });

      // Act
      render(
        <MemoryRouter>
          <Products />
        </MemoryRouter>
      );

      // Assert
      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
      });
      expect(screen.queryByText("Laptop")).not.toBeInTheDocument();
    });
  });

  describe("Product Card Structure - Pairwise Testing", () => {
    // Using pairwise testing: test critical element-property combinations
    // Factors: {element type, property, product count}
    // This reduces redundant tests while maintaining coverage

    it("renders product cards with correct structure and styling", async () => {
      // Arrange
      const singleProduct = [mockProducts[0]];
      axios.get.mockResolvedValue({ data: { products: singleProduct } });

      // Act
      render(
        <MemoryRouter>
          <Products />
        </MemoryRouter>
      );

      // Assert
      await waitFor(() => {
        expect(screen.getByText("Laptop")).toBeInTheDocument();
      });

      // Test image element
      const image = screen.getByAltText("Laptop");
      expect(image).toHaveAttribute("src", "/api/v1/product/product-photo/1");

      // Test text elements
      const title = screen.getByText("Laptop");
      expect(title.tagName).toBe("H5");

      const description = screen.getByText("High performance laptop");
      expect(description.tagName).toBe("P");
    });

    it("renders product links with correct attributes", async () => {
      // Arrange
      axios.get.mockResolvedValue({ data: { products: mockProducts } });

      // Act
      render(
        <MemoryRouter>
          <Products />
        </MemoryRouter>
      );

      // Assert
      await waitFor(() => {
        expect(screen.getByText("Laptop")).toBeInTheDocument();
      });

      const links = screen.getAllByRole("link");
      const laptopLink = links.find(
        (link) =>
          link.getAttribute("href") === "/dashboard/admin/product/laptop"
      );
      expect(laptopLink).toHaveAttribute(
        "href",
        "/dashboard/admin/product/laptop"
      );

      const phoneLink = links.find(
        (link) => link.getAttribute("href") === "/dashboard/admin/product/phone"
      );
      expect(phoneLink).toHaveAttribute(
        "href",
        "/dashboard/admin/product/phone"
      );
    });

  });

  describe("Integration - Complete Workflow", () => {
    it("successfully fetches and renders complete product list", async () => {
      // Arrange
      axios.get.mockResolvedValue({ data: { products: mockProducts } });

      // Act
      render(
        <MemoryRouter>
          <Products />
        </MemoryRouter>
      );

      // Assert - verify complete integration
      await waitFor(() => {
        expect(screen.getByText("Laptop")).toBeInTheDocument();
      });

      expect(axios.get).toHaveBeenCalledWith("/api/v1/product/get-product");
      expect(screen.getByTestId("layout")).toBeInTheDocument();
      expect(screen.getByTestId("admin-menu")).toBeInTheDocument();
      expect(screen.getByText("All Products List")).toBeInTheDocument();

      // Verify all products rendered
      expect(screen.getByText("Phone")).toBeInTheDocument();
      expect(screen.getByText("Tablet")).toBeInTheDocument();

      // Verify all descriptions rendered
      expect(screen.getByText("High performance laptop")).toBeInTheDocument();
      expect(screen.getByText("Latest smartphone")).toBeInTheDocument();
      expect(screen.getByText("Portable tablet device")).toBeInTheDocument();
    });
  });
});
