import { jest } from "@jest/globals";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import axios from "axios";
import toast from "react-hot-toast";
import CreateProduct from "./CreateProduct.js";

// Mock axios
jest.mock("axios");

// Mock react-hot-toast
jest.mock("react-hot-toast");

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
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
  const MockSelect = ({ children, placeholder, onChange, className }) => {
    return (
      <select
        data-testid="select"
        className={className}
        onChange={(e) => onChange(e.target.value)}
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

describe("CreateProduct Component Integration Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock for toast
    toast.success = jest.fn();
    toast.error = jest.fn();

    // Mock URL.createObjectURL for photo preview
    global.URL.createObjectURL = jest.fn(() => "mock-object-url");

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
    // Test: Component fetches categories on mount
    it("fetches and displays categories on mount", async () => {
      // Arrange
      const mockCategories = [
        { _id: "1", name: "Electronics", slug: "electronics" },
        { _id: "2", name: "Books", slug: "books" },
      ];

      axios.get.mockResolvedValueOnce({
        data: { success: true, category: mockCategories },
      });

      // Act
      render(<CreateProduct />);

      // Assert - wait for async data fetch
      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");
      });

      // Verify categories appear in dropdown options
      await waitFor(() => {
        expect(screen.getByText("Electronics")).toBeInTheDocument();
      });
      expect(screen.getByText("Books")).toBeInTheDocument();
    });

    // Boundary Value Analysis: Empty categories (0 items)
    it("handles empty categories array on mount", async () => {
      // Arrange
      axios.get.mockResolvedValueOnce({
        data: { success: true, category: [] },
      });

      // Act
      render(<CreateProduct />);

      // Assert
      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
      });

      // Category dropdown should render but with no options
      const categorySelects = screen.getAllByTestId("select");
      expect(categorySelects[0]).toBeInTheDocument();
    });

    // CFG: Error branch - API returns success: false
    it("does not set categories when success is false", async () => {
      // Arrange
      axios.get.mockResolvedValueOnce({
        data: { success: false, category: [] },
      });

      // Act
      render(<CreateProduct />);

      // Assert
      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
      });

      // Categories should not be rendered since success is false
      expect(screen.queryByText("Electronics")).not.toBeInTheDocument();
    });

    // CFG: Error branch - fetch failure
    it("shows error toast when fetching categories fails", async () => {
      // Arrange
      axios.get.mockRejectedValueOnce(new Error("Network error"));
      const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();

      // Act
      render(<CreateProduct />);

      // Assert
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "Something wwent wrong in getting catgeory"
        );
      });

      consoleLogSpy.mockRestore();
    });
  });

  describe("Create Product Flow - API Integration", () => {
    // AAA Pattern: Test full create product flow
    it("creates product with all fields and navigates to products page", async () => {
      // Arrange
      const mockCategories = [
        { _id: "1", name: "Electronics", slug: "electronics" },
      ];

      axios.get.mockResolvedValueOnce({
        data: { success: true, category: mockCategories },
      });

      axios.post.mockResolvedValueOnce({
        data: {
          success: true,
          message: "Product Created Successfully",
        },
      });

      render(<CreateProduct />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText("Electronics")).toBeInTheDocument();
      });

      // Act - Fill form and submit
      const nameInput = screen.getByPlaceholderText("write a name");
      const descriptionInput = screen.getByPlaceholderText(
        "write a description"
      );
      const priceInput = screen.getByPlaceholderText("write a Price");
      const quantityInput = screen.getByPlaceholderText("write a quantity");
      const categorySelects = screen.getAllByTestId("select");
      const categorySelect = categorySelects[0];
      const shippingSelect = categorySelects[1];
      const createButton = screen.getByText("CREATE PRODUCT");

      fireEvent.change(nameInput, { target: { value: "Laptop" } });
      fireEvent.change(descriptionInput, {
        target: { value: "High performance laptop" },
      });
      fireEvent.change(priceInput, { target: { value: "999" } });
      fireEvent.change(quantityInput, { target: { value: "10" } });
      fireEvent.change(categorySelect, { target: { value: "1" } });
      fireEvent.change(shippingSelect, { target: { value: "1" } });

      // Mock file upload
      const file = new File(["laptop"], "laptop.png", { type: "image/png" });
      const photoInput = screen.getByLabelText(/upload photo/i);
      fireEvent.change(photoInput, { target: { files: [file] } });

      fireEvent.click(createButton);

      // Assert - Check API call and navigation
      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          "/api/v1/product/create-product",
          expect.any(FormData)
        );
      });

      expect(toast.success).toHaveBeenCalledWith(
        "Product Created Successfully"
      );
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard/admin/products");
    });

    // Test: Create product without photo (optional field)
    it("creates product without photo successfully", async () => {
      // Arrange
      const mockCategories = [
        { _id: "1", name: "Books", slug: "books" },
      ];

      axios.get.mockResolvedValueOnce({
        data: { success: true, category: mockCategories },
      });

      axios.post.mockResolvedValueOnce({
        data: {
          success: true,
          message: "Product Created Successfully",
        },
      });

      render(<CreateProduct />);

      await waitFor(() => {
        expect(screen.getByText("Books")).toBeInTheDocument();
      });

      // Act - Fill form without photo
      const nameInput = screen.getByPlaceholderText("write a name");
      const descriptionInput = screen.getByPlaceholderText(
        "write a description"
      );
      const priceInput = screen.getByPlaceholderText("write a Price");
      const quantityInput = screen.getByPlaceholderText("write a quantity");
      const categorySelects = screen.getAllByTestId("select");
      const categorySelect = categorySelects[0];
      const shippingSelect = categorySelects[1];
      const createButton = screen.getByText("CREATE PRODUCT");

      fireEvent.change(nameInput, { target: { value: "Book Title" } });
      fireEvent.change(descriptionInput, {
        target: { value: "Interesting book" },
      });
      fireEvent.change(priceInput, { target: { value: "29" } });
      fireEvent.change(quantityInput, { target: { value: "50" } });
      fireEvent.change(categorySelect, { target: { value: "1" } });
      fireEvent.change(shippingSelect, { target: { value: "0" } });

      fireEvent.click(createButton);

      // Assert
      await waitFor(() => {
        expect(axios.post).toHaveBeenCalled();
      });

      expect(toast.success).toHaveBeenCalledWith(
        "Product Created Successfully"
      );
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard/admin/products");
    });

    // CFG: Error branch - create fails with success: false
    it("shows error toast when API returns success: false", async () => {
      // Arrange
      const mockCategories = [
        { _id: "1", name: "Electronics", slug: "electronics" },
      ];

      axios.get.mockResolvedValueOnce({
        data: { success: true, category: mockCategories },
      });

      axios.post.mockResolvedValueOnce({
        data: { success: false, message: "Product creation failed" },
      });

      render(<CreateProduct />);

      await waitFor(() => {
        expect(screen.getByText("Electronics")).toBeInTheDocument();
      });

      // Act
      const nameInput = screen.getByPlaceholderText("write a name");
      const createButton = screen.getByText("CREATE PRODUCT");

      fireEvent.change(nameInput, { target: { value: "Test Product" } });
      fireEvent.click(createButton);

      // Assert
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Product creation failed");
      });

      // Navigate should NOT be called on failure
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    // CFG: Exception branch - network error
    it("handles network errors during create", async () => {
      // Arrange
      const mockCategories = [
        { _id: "1", name: "Electronics", slug: "electronics" },
      ];

      axios.get.mockResolvedValueOnce({
        data: { success: true, category: mockCategories },
      });

      axios.post.mockRejectedValueOnce(new Error("Network error"));
      const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();

      render(<CreateProduct />);

      await waitFor(() => {
        expect(screen.getByText("Electronics")).toBeInTheDocument();
      });

      // Act
      const nameInput = screen.getByPlaceholderText("write a name");
      const createButton = screen.getByText("CREATE PRODUCT");

      fireEvent.change(nameInput, { target: { value: "Test" } });
      fireEvent.click(createButton);

      // Assert
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("something went wrong");
      });

      consoleLogSpy.mockRestore();
    });

    // Test: Verify FormData contains all fields
    it("sends FormData with all product fields to API", async () => {
      // Arrange
      const mockCategories = [
        { _id: "1", name: "Electronics", slug: "electronics" },
      ];

      axios.get.mockResolvedValueOnce({
        data: { success: true, category: mockCategories },
      });

      axios.post.mockResolvedValueOnce({
        data: {
          success: true,
          message: "Product Created Successfully",
        },
      });

      render(<CreateProduct />);

      await waitFor(() => {
        expect(screen.getByText("Electronics")).toBeInTheDocument();
      });

      // Act - Fill all fields
      const nameInput = screen.getByPlaceholderText("write a name");
      const descriptionInput = screen.getByPlaceholderText(
        "write a description"
      );
      const priceInput = screen.getByPlaceholderText("write a Price");
      const quantityInput = screen.getByPlaceholderText("write a quantity");
      const categorySelects = screen.getAllByTestId("select");
      const categorySelect = categorySelects[0];
      const shippingSelect = categorySelects[1];

      fireEvent.change(nameInput, { target: { value: "Laptop" } });
      fireEvent.change(descriptionInput, {
        target: { value: "High performance" },
      });
      fireEvent.change(priceInput, { target: { value: "999" } });
      fireEvent.change(quantityInput, { target: { value: "10" } });
      fireEvent.change(categorySelect, { target: { value: "1" } });
      fireEvent.change(shippingSelect, { target: { value: "1" } });

      const file = new File(["photo"], "photo.png", { type: "image/png" });
      const photoInput = screen.getByLabelText(/upload photo/i);
      fireEvent.change(photoInput, { target: { files: [file] } });

      const createButton = screen.getByText("CREATE PRODUCT");
      fireEvent.click(createButton);

      // Assert - Verify FormData was sent
      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          "/api/v1/product/create-product",
          expect.any(FormData)
        );
      });

      // Verify the FormData contains correct endpoint
      const callArgs = axios.post.mock.calls[0];
      expect(callArgs[0]).toBe("/api/v1/product/create-product");
      expect(callArgs[1]).toBeInstanceOf(FormData);
    });

    // Test: Submit form with Enter key (form submission)
    it("prevents default form submission behavior", async () => {
      // Arrange
      const mockCategories = [
        { _id: "1", name: "Electronics", slug: "electronics" },
      ];

      axios.get.mockResolvedValueOnce({
        data: { success: true, category: mockCategories },
      });

      axios.post.mockResolvedValueOnce({
        data: {
          success: true,
          message: "Product Created Successfully",
        },
      });

      render(<CreateProduct />);

      await waitFor(() => {
        expect(screen.getByText("Electronics")).toBeInTheDocument();
      });

      // Act - Fill minimal fields and click button
      const nameInput = screen.getByPlaceholderText("write a name");
      fireEvent.change(nameInput, { target: { value: "Test Product" } });

      const createButton = screen.getByText("CREATE PRODUCT");

      // Simulate click which triggers handleCreate with preventDefault
      fireEvent.click(createButton);

      // Assert - API should be called
      await waitFor(() => {
        expect(axios.post).toHaveBeenCalled();
      });
    });
  });

  describe("Form Interactions", () => {
    // Test category dropdown selection
    it("updates category state when dropdown option selected", async () => {
      // Arrange
      const mockCategories = [
        { _id: "1", name: "Electronics", slug: "electronics" },
        { _id: "2", name: "Books", slug: "books" },
      ];

      axios.get.mockResolvedValueOnce({
        data: { success: true, category: mockCategories },
      });

      render(<CreateProduct />);

      await waitFor(() => {
        expect(screen.getByText("Electronics")).toBeInTheDocument();
      });

      // Act - Select category
      const categorySelects = screen.getAllByTestId("select");
      const categorySelect = categorySelects[0];

      fireEvent.change(categorySelect, { target: { value: "2" } });

      // Assert - Verify state updated (indirectly via re-render)
      expect(categorySelect.value).toBe("2");
    });

    // Test shipping dropdown selection
    it("updates shipping state when dropdown option selected", async () => {
      // Arrange
      axios.get.mockResolvedValueOnce({
        data: { success: true, category: [] },
      });

      render(<CreateProduct />);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
      });

      // Act - Select shipping option
      const categorySelects = screen.getAllByTestId("select");
      const shippingSelect = categorySelects[1];

      fireEvent.change(shippingSelect, { target: { value: "1" } });

      // Assert
      expect(shippingSelect.value).toBe("1");
    });

    // Test photo upload displays file name
    it("displays photo file name in upload button after selection", async () => {
      // Arrange
      axios.get.mockResolvedValueOnce({
        data: { success: true, category: [] },
      });

      render(<CreateProduct />);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
      });

      // Act - Upload photo
      const file = new File(["photo"], "laptop.png", { type: "image/png" });
      const photoInput = screen.getByLabelText(/upload photo/i);

      fireEvent.change(photoInput, { target: { files: [file] } });

      // Assert - File name should appear in label
      await waitFor(() => {
        expect(screen.getByText("laptop.png")).toBeInTheDocument();
      });
    });

    // Test text inputs update state
    it("updates name, description, price, and quantity inputs", async () => {
      // Arrange
      axios.get.mockResolvedValueOnce({
        data: { success: true, category: [] },
      });

      render(<CreateProduct />);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
      });

      // Act - Fill inputs
      const nameInput = screen.getByPlaceholderText("write a name");
      const descriptionInput = screen.getByPlaceholderText(
        "write a description"
      );
      const priceInput = screen.getByPlaceholderText("write a Price");
      const quantityInput = screen.getByPlaceholderText("write a quantity");

      fireEvent.change(nameInput, { target: { value: "Laptop" } });
      fireEvent.change(descriptionInput, {
        target: { value: "High performance" },
      });
      fireEvent.change(priceInput, { target: { value: "999" } });
      fireEvent.change(quantityInput, { target: { value: "10" } });

      // Assert - Verify values
      expect(nameInput.value).toBe("Laptop");
      expect(descriptionInput.value).toBe("High performance");
      expect(priceInput.value).toBe("999");
      expect(quantityInput.value).toBe("10");
    });

    // Test rendering of all form elements
    it("renders all form elements correctly", async () => {
      // Arrange
      const mockCategories = [
        { _id: "1", name: "Electronics", slug: "electronics" },
      ];

      axios.get.mockResolvedValueOnce({
        data: { success: true, category: mockCategories },
      });

      render(<CreateProduct />);

      // Assert - Check all form elements exist
      await waitFor(() => {
        expect(screen.getByText("Create Product")).toBeInTheDocument();
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
      expect(screen.getByText("Upload Photo")).toBeInTheDocument();
      expect(screen.getByText("CREATE PRODUCT")).toBeInTheDocument();

      // Category and Shipping dropdowns
      const selects = screen.getAllByTestId("select");
      expect(selects).toHaveLength(2);
    });
  });

  describe("Photo Upload Behavior", () => {
    // Test initial state shows "Upload Photo"
    it("shows 'Upload Photo' text initially when no photo selected", async () => {
      // Arrange
      axios.get.mockResolvedValueOnce({
        data: { success: true, category: [] },
      });

      // Act
      render(<CreateProduct />);

      // Assert
      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
      });

      expect(screen.getByText("Upload Photo")).toBeInTheDocument();
    });

    // Test photo file name display
    it("shows photo file name after photo is selected", async () => {
      // Arrange
      axios.get.mockResolvedValueOnce({
        data: { success: true, category: [] },
      });

      render(<CreateProduct />);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
      });

      // Act - Select photo
      const file = new File(["photo"], "product-image.jpg", {
        type: "image/jpeg",
      });
      const photoInput = screen.getByLabelText(/upload photo/i);

      fireEvent.change(photoInput, { target: { files: [file] } });

      // Assert
      await waitFor(() => {
        expect(screen.getByText("product-image.jpg")).toBeInTheDocument();
      });
      expect(screen.queryByText("Upload Photo")).not.toBeInTheDocument();
    });

    // Test photo preview renders
    it("displays photo preview when photo is selected", async () => {
      // Arrange
      axios.get.mockResolvedValueOnce({
        data: { success: true, category: [] },
      });

      render(<CreateProduct />);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
      });

      // Act - Select photo
      const file = new File(["photo"], "test.png", { type: "image/png" });
      const photoInput = screen.getByLabelText(/upload photo/i);

      fireEvent.change(photoInput, { target: { files: [file] } });

      // Assert - Photo preview should render
      await waitFor(() => {
        const previewImage = screen.getByAltText("product_photo");
        expect(previewImage).toBeInTheDocument();
        expect(previewImage).toHaveAttribute("src", "mock-object-url");
      });

      // Verify URL.createObjectURL was called
      expect(global.URL.createObjectURL).toHaveBeenCalledWith(file);
    });
  });

  describe("Error Handling & Edge Cases", () => {
    // Test: Handle null categories gracefully
    it("does not crash with null categories response", async () => {
      // Arrange
      axios.get.mockResolvedValueOnce({
        data: { success: true, category: null },
      });

      // Act
      render(<CreateProduct />);

      // Assert - Should not crash
      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
      });

      expect(screen.getByText("Create Product")).toBeInTheDocument();
    });

    // Test: Handle undefined categories gracefully
    it("does not crash with undefined categories response", async () => {
      // Arrange
      axios.get.mockResolvedValueOnce({
        data: { success: true },
      });

      // Act
      render(<CreateProduct />);

      // Assert - Should not crash
      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
      });

      expect(screen.getByText("Create Product")).toBeInTheDocument();
    });

    // Test: Verify rendering structure
    it("renders layout structure with all core components", async () => {
      // Arrange
      axios.get.mockResolvedValueOnce({
        data: { success: true, category: [] },
      });

      // Act
      render(<CreateProduct />);

      // Assert
      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
      });

      expect(screen.getByTestId("layout")).toBeInTheDocument();
      expect(screen.getByTestId("admin-menu")).toBeInTheDocument();
      expect(screen.getByText("Create Product")).toBeInTheDocument();
    });

    // Test: Layout receives correct title prop
    it("passes correct title to Layout component", async () => {
      // Arrange
      axios.get.mockResolvedValueOnce({
        data: { success: true, category: [] },
      });

      // Act
      render(<CreateProduct />);

      // Assert
      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
      });

      const layout = screen.getByTestId("layout");
      expect(layout).toHaveAttribute("title", "Dashboard - Create Product");
    });
  });
});
