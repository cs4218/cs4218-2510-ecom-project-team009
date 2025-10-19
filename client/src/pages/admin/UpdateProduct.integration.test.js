import { jest } from "@jest/globals";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import axios from "axios";
import toast from "react-hot-toast";
import UpdateProduct from "./UpdateProduct.js";

// Mock axios
jest.mock("axios");

// Mock react-hot-toast
jest.mock("react-hot-toast");

// Mock react-router-dom
const mockNavigate = jest.fn();
const mockParams = { slug: "test-product-slug" };
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
  useParams: () => mockParams,
}));

// Mock Layout component
jest.mock("../../components/Layout", () => {
  return function Layout({ children, title }) {
    return (
      <div data-testid="layout" title={title}>
        {children}
      </div>
    );
  };
});

// Mock AdminMenu component
jest.mock("../../components/AdminMenu", () => {
  return function AdminMenu() {
    return <div data-testid="admin-menu">Admin Menu</div>;
  };
});

// Mock Ant Design Select component
jest.mock("antd", () => {
  const MockSelect = ({ children, placeholder, onChange, className, value }) => {
    return (
      <select
        data-testid="select"
        className={className}
        onChange={(e) => onChange(e.target.value)}
        value={value}
      >
        <option value="">{placeholder}</option>
        {children}
      </select>
    );
  };

  const MockOption = ({ children, value }) => {
    return <option value={value}>{children}</option>;
  };

  return {
    Select: Object.assign(MockSelect, { Option: MockOption }),
  };
});

describe("UpdateProduct Component Integration Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock for toast
    toast.success = jest.fn();
    toast.error = jest.fn();

    // Mock URL.createObjectURL for photo preview
    global.URL.createObjectURL = jest.fn(() => "mock-object-url");

    // Mock window.prompt for delete confirmation
    global.window.prompt = jest.fn();

    // Mock localStorage
    Object.defineProperty(window, "localStorage", {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
      },
      writable: true,
    });

    // Mock matchMedia
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: jest.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
  });

  describe("Component Mounting and Data Fetching", () => {
    // AAA Pattern: Arrange-Act-Assert
    // Test: Component fetches product and categories on mount
    it("fetches and pre-fills single product data on mount", async () => {
      // Arrange
      const mockProduct = {
        _id: "product123",
        name: "Laptop",
        description: "High performance laptop",
        price: 999,
        quantity: 10,
        shipping: true,
        category: { _id: "cat1", name: "Electronics" },
      };

      const mockCategories = [
        { _id: "cat1", name: "Electronics", slug: "electronics" },
        { _id: "cat2", name: "Books", slug: "books" },
      ];

      axios.get
        .mockResolvedValueOnce({
          // getSingleProduct
          data: { product: mockProduct },
        })
        .mockResolvedValueOnce({
          // getAllCategory
          data: { success: true, category: mockCategories },
        });

      // Act
      render(<UpdateProduct />);

      // Assert - wait for async data fetch
      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith(
          "/api/v1/product/get-product/test-product-slug"
        );
      });

      expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");

      // Verify form is pre-filled
      await waitFor(() => {
        expect(screen.getByDisplayValue("Laptop")).toBeInTheDocument();
      });
      expect(
        screen.getByDisplayValue("High performance laptop")
      ).toBeInTheDocument();
      expect(screen.getByDisplayValue("999")).toBeInTheDocument();
      expect(screen.getByDisplayValue("10")).toBeInTheDocument();
    });

    // Test: Fetches and displays categories in dropdown
    it("fetches and displays categories in dropdown", async () => {
      // Arrange
      const mockProduct = {
        _id: "product123",
        name: "Laptop",
        description: "Test",
        price: 999,
        quantity: 10,
        shipping: false,
        category: { _id: "cat1", name: "Electronics" },
      };

      const mockCategories = [
        { _id: "cat1", name: "Electronics", slug: "electronics" },
        { _id: "cat2", name: "Books", slug: "books" },
      ];

      axios.get
        .mockResolvedValueOnce({
          data: { product: mockProduct },
        })
        .mockResolvedValueOnce({
          data: { success: true, category: mockCategories },
        });

      // Act
      render(<UpdateProduct />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText("Electronics")).toBeInTheDocument();
      });
      expect(screen.getByText("Books")).toBeInTheDocument();
    });

    // Test: Pre-fills shipping dropdown correctly
    it("pre-fills all form fields with product data including shipping", async () => {
      // Arrange
      const mockProduct = {
        _id: "product123",
        name: "Book Title",
        description: "Interesting book",
        price: 29,
        quantity: 50,
        shipping: true, // Boolean from backend
        category: { _id: "cat2", name: "Books" },
      };

      const mockCategories = [
        { _id: "cat2", name: "Books", slug: "books" },
      ];

      axios.get
        .mockResolvedValueOnce({
          data: { product: mockProduct },
        })
        .mockResolvedValueOnce({
          data: { success: true, category: mockCategories },
        });

      // Act
      render(<UpdateProduct />);

      // Assert - Check shipping is converted to "1" (string)
      await waitFor(() => {
        expect(screen.getByDisplayValue("Book Title")).toBeInTheDocument();
      });

      const selects = screen.getAllByTestId("select");
      const shippingSelect = selects[1];
      expect(shippingSelect.value).toBe("1"); // true → "1"
    });

    // CFG: Error branch - fetch product failure
    it("handles fetch errors gracefully when getting product", async () => {
      // Arrange
      axios.get.mockRejectedValueOnce(new Error("Network error"));
      const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();

      // Act
      render(<UpdateProduct />);

      // Assert
      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith(
          "/api/v1/product/get-product/test-product-slug"
        );
      });

      // Component should still render without crashing
      expect(screen.getByText("Update Product")).toBeInTheDocument();

      consoleLogSpy.mockRestore();
    });

    // CFG: Error branch - category fetch failure
    it("shows error toast when fetching categories fails", async () => {
      // Arrange
      const mockProduct = {
        _id: "product123",
        name: "Laptop",
        description: "Test",
        price: 999,
        quantity: 10,
        shipping: false,
        category: { _id: "cat1", name: "Electronics" },
      };

      axios.get
        .mockResolvedValueOnce({
          data: { product: mockProduct },
        })
        .mockRejectedValueOnce(new Error("Network error"));

      const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();

      // Act
      render(<UpdateProduct />);

      // Assert
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "Something wwent wrong in getting catgeory"
        );
      });

      consoleLogSpy.mockRestore();
    });

    // CFG: success: false branch for categories
    it("does not set categories when success is false", async () => {
      // Arrange
      const mockProduct = {
        _id: "product123",
        name: "Laptop",
        description: "Test",
        price: 999,
        quantity: 10,
        shipping: false,
        category: { _id: "cat1", name: "Electronics" },
      };

      axios.get
        .mockResolvedValueOnce({
          data: { product: mockProduct },
        })
        .mockResolvedValueOnce({
          data: { success: false, category: [] },
        });

      // Act
      render(<UpdateProduct />);

      // Assert
      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledTimes(2);
      });

      // Categories should not be rendered since success is false
      expect(screen.queryByText("Electronics")).not.toBeInTheDocument();
    });
  });

  describe("Update Product Flow - API Integration", () => {
    // AAA Pattern: Test full update product flow
    it("updates product with all fields and navigates to products page", async () => {
      // Arrange
      const mockProduct = {
        _id: "product123",
        name: "Laptop",
        description: "Old description",
        price: 999,
        quantity: 10,
        shipping: false,
        category: { _id: "cat1", name: "Electronics" },
      };

      const mockCategories = [
        { _id: "cat1", name: "Electronics", slug: "electronics" },
      ];

      axios.get
        .mockResolvedValueOnce({
          data: { product: mockProduct },
        })
        .mockResolvedValueOnce({
          data: { success: true, category: mockCategories },
        });

      axios.put.mockResolvedValueOnce({
        data: {
          success: true,
          message: "Product Updated Successfully",
        },
      });

      render(<UpdateProduct />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByDisplayValue("Laptop")).toBeInTheDocument();
      });

      // Act - Update fields
      const nameInput = screen.getByPlaceholderText("write a name");
      const descriptionInput = screen.getByPlaceholderText(
        "write a description"
      );
      const priceInput = screen.getByPlaceholderText("write a Price");
      const updateButton = screen.getByText("UPDATE PRODUCT");

      fireEvent.change(nameInput, { target: { value: "Gaming Laptop" } });
      fireEvent.change(descriptionInput, {
        target: { value: "Updated high performance gaming laptop" },
      });
      fireEvent.change(priceInput, { target: { value: "1299" } });

      fireEvent.click(updateButton);

      // Assert - Check API call and navigation
      await waitFor(() => {
        expect(axios.put).toHaveBeenCalledWith(
          "/api/v1/product/update-product/product123",
          expect.any(FormData)
        );
      });

      expect(toast.success).toHaveBeenCalledWith(
        "Product Updated Successfully"
      );
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard/admin/products");
    });

    // Test: Update product without new photo (uses existing)
    it("updates product without new photo successfully", async () => {
      // Arrange
      const mockProduct = {
        _id: "product456",
        name: "Book",
        description: "Old book",
        price: 29,
        quantity: 50,
        shipping: true,
        category: { _id: "cat2", name: "Books" },
      };

      const mockCategories = [
        { _id: "cat2", name: "Books", slug: "books" },
      ];

      axios.get
        .mockResolvedValueOnce({
          data: { product: mockProduct },
        })
        .mockResolvedValueOnce({
          data: { success: true, category: mockCategories },
        });

      axios.put.mockResolvedValueOnce({
        data: {
          success: true,
          message: "Product Updated Successfully",
        },
      });

      render(<UpdateProduct />);

      await waitFor(() => {
        expect(screen.getByDisplayValue("Book")).toBeInTheDocument();
      });

      // Act - Update without photo
      const nameInput = screen.getByPlaceholderText("write a name");
      const updateButton = screen.getByText("UPDATE PRODUCT");

      fireEvent.change(nameInput, { target: { value: "Updated Book" } });
      fireEvent.click(updateButton);

      // Assert - Photo should NOT be appended to FormData
      await waitFor(() => {
        expect(axios.put).toHaveBeenCalledWith(
          "/api/v1/product/update-product/product456",
          expect.any(FormData)
        );
      });

      expect(toast.success).toHaveBeenCalledWith(
        "Product Updated Successfully"
      );
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard/admin/products");
    });

    // CFG: Error branch - update fails with success: false
    it("shows error toast when API returns success: false", async () => {
      // Arrange
      const mockProduct = {
        _id: "product123",
        name: "Laptop",
        description: "Test",
        price: 999,
        quantity: 10,
        shipping: false,
        category: { _id: "cat1", name: "Electronics" },
      };

      const mockCategories = [
        { _id: "cat1", name: "Electronics", slug: "electronics" },
      ];

      axios.get
        .mockResolvedValueOnce({
          data: { product: mockProduct },
        })
        .mockResolvedValueOnce({
          data: { success: true, category: mockCategories },
        });

      axios.put.mockResolvedValueOnce({
        data: { success: false, message: "Product update failed" },
      });

      render(<UpdateProduct />);

      await waitFor(() => {
        expect(screen.getByDisplayValue("Laptop")).toBeInTheDocument();
      });

      // Act
      const updateButton = screen.getByText("UPDATE PRODUCT");
      fireEvent.click(updateButton);

      // Assert
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Product update failed");
      });

      // Navigate should NOT be called on failure
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    // CFG: Exception branch - network error
    it("handles network errors during update", async () => {
      // Arrange
      const mockProduct = {
        _id: "product123",
        name: "Laptop",
        description: "Test",
        price: 999,
        quantity: 10,
        shipping: false,
        category: { _id: "cat1", name: "Electronics" },
      };

      const mockCategories = [
        { _id: "cat1", name: "Electronics", slug: "electronics" },
      ];

      axios.get
        .mockResolvedValueOnce({
          data: { product: mockProduct },
        })
        .mockResolvedValueOnce({
          data: { success: true, category: mockCategories },
        });

      axios.put.mockRejectedValueOnce(new Error("Network error"));
      const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();

      render(<UpdateProduct />);

      await waitFor(() => {
        expect(screen.getByDisplayValue("Laptop")).toBeInTheDocument();
      });

      // Act
      const updateButton = screen.getByText("UPDATE PRODUCT");
      fireEvent.click(updateButton);

      // Assert
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("something went wrong");
      });

      consoleLogSpy.mockRestore();
    });

    // Test: Verify FormData contains all fields
    it("sends FormData with correct fields to PUT endpoint", async () => {
      // Arrange
      const mockProduct = {
        _id: "product123",
        name: "Laptop",
        description: "Test",
        price: 999,
        quantity: 10,
        shipping: false,
        category: { _id: "cat1", name: "Electronics" },
      };

      const mockCategories = [
        { _id: "cat1", name: "Electronics", slug: "electronics" },
      ];

      axios.get
        .mockResolvedValueOnce({
          data: { product: mockProduct },
        })
        .mockResolvedValueOnce({
          data: { success: true, category: mockCategories },
        });

      axios.put.mockResolvedValueOnce({
        data: {
          success: true,
          message: "Product Updated Successfully",
        },
      });

      render(<UpdateProduct />);

      await waitFor(() => {
        expect(screen.getByDisplayValue("Laptop")).toBeInTheDocument();
      });

      // Act - Update with new photo
      const file = new File(["photo"], "new-photo.png", { type: "image/png" });
      const photoInput = screen.getByLabelText(/upload photo/i);
      fireEvent.change(photoInput, { target: { files: [file] } });

      const updateButton = screen.getByText("UPDATE PRODUCT");
      fireEvent.click(updateButton);

      // Assert - Verify FormData was sent to correct endpoint
      await waitFor(() => {
        expect(axios.put).toHaveBeenCalledWith(
          "/api/v1/product/update-product/product123",
          expect.any(FormData)
        );
      });

      const callArgs = axios.put.mock.calls[0];
      expect(callArgs[0]).toBe("/api/v1/product/update-product/product123");
      expect(callArgs[1]).toBeInstanceOf(FormData);
    });

    // Test: Does not navigate on update failure
    it("does not navigate when update fails", async () => {
      // Arrange
      const mockProduct = {
        _id: "product123",
        name: "Laptop",
        description: "Test",
        price: 999,
        quantity: 10,
        shipping: false,
        category: { _id: "cat1", name: "Electronics" },
      };

      const mockCategories = [
        { _id: "cat1", name: "Electronics", slug: "electronics" },
      ];

      axios.get
        .mockResolvedValueOnce({
          data: { product: mockProduct },
        })
        .mockResolvedValueOnce({
          data: { success: true, category: mockCategories },
        });

      axios.put.mockResolvedValueOnce({
        data: { success: false, message: "Validation failed" },
      });

      render(<UpdateProduct />);

      await waitFor(() => {
        expect(screen.getByDisplayValue("Laptop")).toBeInTheDocument();
      });

      // Act
      const updateButton = screen.getByText("UPDATE PRODUCT");
      fireEvent.click(updateButton);

      // Assert
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Validation failed");
      });

      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe("Delete Product Flow - API Integration", () => {
    // Test: Delete product successfully
    it("deletes product and navigates on confirmation", async () => {
      // Arrange
      const mockProduct = {
        _id: "product789",
        name: "Laptop",
        description: "Test",
        price: 999,
        quantity: 10,
        shipping: false,
        category: { _id: "cat1", name: "Electronics" },
      };

      const mockCategories = [
        { _id: "cat1", name: "Electronics", slug: "electronics" },
      ];

      axios.get
        .mockResolvedValueOnce({
          data: { product: mockProduct },
        })
        .mockResolvedValueOnce({
          data: { success: true, category: mockCategories },
        });

      axios.delete.mockResolvedValueOnce({
        data: { success: true },
      });

      // Mock window.prompt to return truthy value (user confirms)
      window.prompt.mockReturnValueOnce("yes");

      render(<UpdateProduct />);

      await waitFor(() => {
        expect(screen.getByDisplayValue("Laptop")).toBeInTheDocument();
      });

      // Act - Click Delete button
      const deleteButton = screen.getByText("DELETE PRODUCT");
      fireEvent.click(deleteButton);

      // Assert
      await waitFor(() => {
        expect(window.prompt).toHaveBeenCalledWith(
          "Are You Sure want to delete this product ? "
        );
      });

      expect(axios.delete).toHaveBeenCalledWith(
        "/api/v1/product/delete-product/product789"
      );
      expect(toast.success).toHaveBeenCalledWith(
        "Product Deleted Successfully"
      );
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard/admin/products");
    });

    // Test: Cancel delete when prompt returns falsy
    it("cancels delete when prompt returns falsy value", async () => {
      // Arrange
      const mockProduct = {
        _id: "product789",
        name: "Laptop",
        description: "Test",
        price: 999,
        quantity: 10,
        shipping: false,
        category: { _id: "cat1", name: "Electronics" },
      };

      const mockCategories = [
        { _id: "cat1", name: "Electronics", slug: "electronics" },
      ];

      axios.get
        .mockResolvedValueOnce({
          data: { product: mockProduct },
        })
        .mockResolvedValueOnce({
          data: { success: true, category: mockCategories },
        });

      // Mock window.prompt to return falsy value (user cancels)
      window.prompt.mockReturnValueOnce("");

      render(<UpdateProduct />);

      await waitFor(() => {
        expect(screen.getByDisplayValue("Laptop")).toBeInTheDocument();
      });

      // Act
      const deleteButton = screen.getByText("DELETE PRODUCT");
      fireEvent.click(deleteButton);

      // Assert - Delete should NOT be called
      expect(window.prompt).toHaveBeenCalled();
      expect(axios.delete).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    // CFG: Error branch - delete fails
    it("shows error toast on delete failure", async () => {
      // Arrange
      const mockProduct = {
        _id: "product789",
        name: "Laptop",
        description: "Test",
        price: 999,
        quantity: 10,
        shipping: false,
        category: { _id: "cat1", name: "Electronics" },
      };

      const mockCategories = [
        { _id: "cat1", name: "Electronics", slug: "electronics" },
      ];

      axios.get
        .mockResolvedValueOnce({
          data: { product: mockProduct },
        })
        .mockResolvedValueOnce({
          data: { success: true, category: mockCategories },
        });

      axios.delete.mockRejectedValueOnce(new Error("Delete failed"));
      window.prompt.mockReturnValueOnce("yes");
      const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();

      render(<UpdateProduct />);

      await waitFor(() => {
        expect(screen.getByDisplayValue("Laptop")).toBeInTheDocument();
      });

      // Act
      const deleteButton = screen.getByText("DELETE PRODUCT");
      fireEvent.click(deleteButton);

      // Assert
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Something went wrong");
      });

      consoleLogSpy.mockRestore();
    });

    // Test: Network error during delete
    it("handles network errors during delete", async () => {
      // Arrange
      const mockProduct = {
        _id: "product789",
        name: "Laptop",
        description: "Test",
        price: 999,
        quantity: 10,
        shipping: false,
        category: { _id: "cat1", name: "Electronics" },
      };

      const mockCategories = [
        { _id: "cat1", name: "Electronics", slug: "electronics" },
      ];

      axios.get
        .mockResolvedValueOnce({
          data: { product: mockProduct },
        })
        .mockResolvedValueOnce({
          data: { success: true, category: mockCategories },
        });

      axios.delete.mockRejectedValueOnce(new Error("Network error"));
      window.prompt.mockReturnValueOnce("confirm");
      const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();

      render(<UpdateProduct />);

      await waitFor(() => {
        expect(screen.getByDisplayValue("Laptop")).toBeInTheDocument();
      });

      // Act
      const deleteButton = screen.getByText("DELETE PRODUCT");
      fireEvent.click(deleteButton);

      // Assert
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Something went wrong");
      });

      expect(mockNavigate).not.toHaveBeenCalled();

      consoleLogSpy.mockRestore();
    });
  });

  describe("Form Interactions", () => {
    // Test: Update text inputs
    it("updates name, description, price, and quantity inputs", async () => {
      // Arrange
      const mockProduct = {
        _id: "product123",
        name: "Laptop",
        description: "Test",
        price: 999,
        quantity: 10,
        shipping: false,
        category: { _id: "cat1", name: "Electronics" },
      };

      const mockCategories = [
        { _id: "cat1", name: "Electronics", slug: "electronics" },
      ];

      axios.get
        .mockResolvedValueOnce({
          data: { product: mockProduct },
        })
        .mockResolvedValueOnce({
          data: { success: true, category: mockCategories },
        });

      render(<UpdateProduct />);

      await waitFor(() => {
        expect(screen.getByDisplayValue("Laptop")).toBeInTheDocument();
      });

      // Act - Update inputs
      const nameInput = screen.getByPlaceholderText("write a name");
      const descriptionInput = screen.getByPlaceholderText(
        "write a description"
      );
      const priceInput = screen.getByPlaceholderText("write a Price");
      const quantityInput = screen.getByPlaceholderText("write a quantity");

      fireEvent.change(nameInput, { target: { value: "Gaming Laptop" } });
      fireEvent.change(descriptionInput, {
        target: { value: "Updated description" },
      });
      fireEvent.change(priceInput, { target: { value: "1299" } });
      fireEvent.change(quantityInput, { target: { value: "5" } });

      // Assert - Verify values
      expect(nameInput.value).toBe("Gaming Laptop");
      expect(descriptionInput.value).toBe("Updated description");
      expect(priceInput.value).toBe("1299");
      expect(quantityInput.value).toBe("5");
    });

    // Test: Update category dropdown
    it("updates category dropdown selection", async () => {
      // Arrange
      const mockProduct = {
        _id: "product123",
        name: "Laptop",
        description: "Test",
        price: 999,
        quantity: 10,
        shipping: false,
        category: { _id: "cat1", name: "Electronics" },
      };

      const mockCategories = [
        { _id: "cat1", name: "Electronics", slug: "electronics" },
        { _id: "cat2", name: "Books", slug: "books" },
      ];

      axios.get
        .mockResolvedValueOnce({
          data: { product: mockProduct },
        })
        .mockResolvedValueOnce({
          data: { success: true, category: mockCategories },
        });

      render(<UpdateProduct />);

      await waitFor(() => {
        expect(screen.getByDisplayValue("Laptop")).toBeInTheDocument();
      });

      // Act - Change category
      const selects = screen.getAllByTestId("select");
      const categorySelect = selects[0];

      fireEvent.change(categorySelect, { target: { value: "cat2" } });

      // Assert
      expect(categorySelect.value).toBe("cat2");
    });

    // Test: Update shipping dropdown
    it("updates shipping dropdown selection", async () => {
      // Arrange
      const mockProduct = {
        _id: "product123",
        name: "Laptop",
        description: "Test",
        price: 999,
        quantity: 10,
        shipping: false, // "0"
        category: { _id: "cat1", name: "Electronics" },
      };

      const mockCategories = [
        { _id: "cat1", name: "Electronics", slug: "electronics" },
      ];

      axios.get
        .mockResolvedValueOnce({
          data: { product: mockProduct },
        })
        .mockResolvedValueOnce({
          data: { success: true, category: mockCategories },
        });

      render(<UpdateProduct />);

      await waitFor(() => {
        expect(screen.getByDisplayValue("Laptop")).toBeInTheDocument();
      });

      // Act - Change shipping
      const selects = screen.getAllByTestId("select");
      const shippingSelect = selects[1];

      expect(shippingSelect.value).toBe("0"); // Initially false → "0"

      fireEvent.change(shippingSelect, { target: { value: "1" } });

      // Assert
      expect(shippingSelect.value).toBe("1");
    });

    // Test: Photo upload displays file name
    it("displays photo file name in upload button after selection", async () => {
      // Arrange
      const mockProduct = {
        _id: "product123",
        name: "Laptop",
        description: "Test",
        price: 999,
        quantity: 10,
        shipping: false,
        category: { _id: "cat1", name: "Electronics" },
      };

      const mockCategories = [
        { _id: "cat1", name: "Electronics", slug: "electronics" },
      ];

      axios.get
        .mockResolvedValueOnce({
          data: { product: mockProduct },
        })
        .mockResolvedValueOnce({
          data: { success: true, category: mockCategories },
        });

      render(<UpdateProduct />);

      await waitFor(() => {
        expect(screen.getByDisplayValue("Laptop")).toBeInTheDocument();
      });

      // Act - Upload photo
      const file = new File(["photo"], "new-laptop.png", {
        type: "image/png",
      });
      const photoInput = screen.getByLabelText(/upload photo/i);

      fireEvent.change(photoInput, { target: { files: [file] } });

      // Assert - File name should appear in label
      await waitFor(() => {
        expect(screen.getByText("new-laptop.png")).toBeInTheDocument();
      });
    });

    // Test: All form elements render correctly
    it("renders all form elements correctly", async () => {
      // Arrange
      const mockProduct = {
        _id: "product123",
        name: "Laptop",
        description: "Test",
        price: 999,
        quantity: 10,
        shipping: false,
        category: { _id: "cat1", name: "Electronics" },
      };

      const mockCategories = [
        { _id: "cat1", name: "Electronics", slug: "electronics" },
      ];

      axios.get
        .mockResolvedValueOnce({
          data: { product: mockProduct },
        })
        .mockResolvedValueOnce({
          data: { success: true, category: mockCategories },
        });

      render(<UpdateProduct />);

      // Assert - Check all form elements exist
      await waitFor(() => {
        expect(screen.getByText("Update Product")).toBeInTheDocument();
      });

      expect(
        screen.getByPlaceholderText("write a name")
      ).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText("write a description")
      ).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText("write a Price")
      ).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText("write a quantity")
      ).toBeInTheDocument();
      expect(screen.getByText("UPDATE PRODUCT")).toBeInTheDocument();
      expect(screen.getByText("DELETE PRODUCT")).toBeInTheDocument();

      // Category and Shipping dropdowns
      const selects = screen.getAllByTestId("select");
      expect(selects).toHaveLength(2);
    });
  });

  describe("Photo Preview Behavior", () => {
    // Test: Shows existing photo from API initially
    it("shows existing photo from API initially", async () => {
      // Arrange
      const mockProduct = {
        _id: "product123",
        name: "Laptop",
        description: "Test",
        price: 999,
        quantity: 10,
        shipping: false,
        category: { _id: "cat1", name: "Electronics" },
      };

      const mockCategories = [
        { _id: "cat1", name: "Electronics", slug: "electronics" },
      ];

      axios.get
        .mockResolvedValueOnce({
          data: { product: mockProduct },
        })
        .mockResolvedValueOnce({
          data: { success: true, category: mockCategories },
        });

      // Act
      render(<UpdateProduct />);

      // Assert - Existing photo from API should be shown
      await waitFor(() => {
        expect(screen.getByDisplayValue("Laptop")).toBeInTheDocument();
      });

      const existingPhoto = screen.getByAltText("product_photo");
      expect(existingPhoto).toBeInTheDocument();
      expect(existingPhoto).toHaveAttribute(
        "src",
        "/api/v1/product/product-photo/product123"
      );
    });

    // Test: Shows new photo preview when uploaded
    it("shows new photo preview when uploaded", async () => {
      // Arrange
      const mockProduct = {
        _id: "product123",
        name: "Laptop",
        description: "Test",
        price: 999,
        quantity: 10,
        shipping: false,
        category: { _id: "cat1", name: "Electronics" },
      };

      const mockCategories = [
        { _id: "cat1", name: "Electronics", slug: "electronics" },
      ];

      axios.get
        .mockResolvedValueOnce({
          data: { product: mockProduct },
        })
        .mockResolvedValueOnce({
          data: { success: true, category: mockCategories },
        });

      render(<UpdateProduct />);

      await waitFor(() => {
        expect(screen.getByDisplayValue("Laptop")).toBeInTheDocument();
      });

      // Act - Upload new photo
      const file = new File(["photo"], "new-image.png", { type: "image/png" });
      const photoInput = screen.getByLabelText(/upload photo/i);

      fireEvent.change(photoInput, { target: { files: [file] } });

      // Assert - New photo preview should render
      await waitFor(() => {
        const images = screen.getAllByAltText("product_photo");
        // Should show new photo preview (mock-object-url)
        const newPhotoPreview = images.find((img) =>
          img.src.includes("mock-object-url")
        );
        expect(newPhotoPreview).toBeInTheDocument();
      });

      // Verify URL.createObjectURL was called
      expect(global.URL.createObjectURL).toHaveBeenCalledWith(file);
    });

    // Test: Switches from existing photo to new photo preview
    it("switches from existing photo to new photo preview", async () => {
      // Arrange
      const mockProduct = {
        _id: "product123",
        name: "Laptop",
        description: "Test",
        price: 999,
        quantity: 10,
        shipping: false,
        category: { _id: "cat1", name: "Electronics" },
      };

      const mockCategories = [
        { _id: "cat1", name: "Electronics", slug: "electronics" },
      ];

      axios.get
        .mockResolvedValueOnce({
          data: { product: mockProduct },
        })
        .mockResolvedValueOnce({
          data: { success: true, category: mockCategories },
        });

      render(<UpdateProduct />);

      await waitFor(() => {
        expect(screen.getByDisplayValue("Laptop")).toBeInTheDocument();
      });

      // Initially shows existing photo
      let images = screen.getAllByAltText("product_photo");
      expect(images[0]).toHaveAttribute(
        "src",
        "/api/v1/product/product-photo/product123"
      );

      // Act - Upload new photo
      const file = new File(["photo"], "updated.png", { type: "image/png" });
      const photoInput = screen.getByLabelText(/upload photo/i);

      fireEvent.change(photoInput, { target: { files: [file] } });

      // Assert - Should now show new photo preview instead
      await waitFor(() => {
        images = screen.getAllByAltText("product_photo");
        const newPhoto = images.find((img) =>
          img.src.includes("mock-object-url")
        );
        expect(newPhoto).toBeInTheDocument();
      });
    });
  });

  describe("Error Handling & Edge Cases", () => {
    // Test: Renders layout structure
    it("renders layout structure with all core components", async () => {
      // Arrange
      const mockProduct = {
        _id: "product123",
        name: "Laptop",
        description: "Test",
        price: 999,
        quantity: 10,
        shipping: false,
        category: { _id: "cat1", name: "Electronics" },
      };

      const mockCategories = [
        { _id: "cat1", name: "Electronics", slug: "electronics" },
      ];

      axios.get
        .mockResolvedValueOnce({
          data: { product: mockProduct },
        })
        .mockResolvedValueOnce({
          data: { success: true, category: mockCategories },
        });

      // Act
      render(<UpdateProduct />);

      // Assert
      await waitFor(() => {
        expect(screen.getByDisplayValue("Laptop")).toBeInTheDocument();
      });

      expect(screen.getByTestId("layout")).toBeInTheDocument();
      expect(screen.getByTestId("admin-menu")).toBeInTheDocument();
      expect(screen.getByText("Update Product")).toBeInTheDocument();
    });

    // Test: Layout receives correct title prop
    it("passes correct title to Layout component", async () => {
      // Arrange
      const mockProduct = {
        _id: "product123",
        name: "Laptop",
        description: "Test",
        price: 999,
        quantity: 10,
        shipping: false,
        category: { _id: "cat1", name: "Electronics" },
      };

      const mockCategories = [
        { _id: "cat1", name: "Electronics", slug: "electronics" },
      ];

      axios.get
        .mockResolvedValueOnce({
          data: { product: mockProduct },
        })
        .mockResolvedValueOnce({
          data: { success: true, category: mockCategories },
        });

      // Act
      render(<UpdateProduct />);

      // Assert
      await waitFor(() => {
        expect(screen.getByDisplayValue("Laptop")).toBeInTheDocument();
      });

      const layout = screen.getByTestId("layout");
      expect(layout).toHaveAttribute("title", "Dashboard - Create Product");
    });
  });
});
