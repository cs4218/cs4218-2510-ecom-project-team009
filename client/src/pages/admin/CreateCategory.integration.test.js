import { jest } from "@jest/globals";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import axios from "axios";
import toast from "react-hot-toast";
import CreateCategory from "./../../pages/admin/CreateCategory.js";

// Mock axios
jest.mock("axios");

// Mock react-hot-toast
jest.mock("react-hot-toast");

// Mock Layout component
jest.mock("./../../components/Layout", () => {
  return function Layout({ children, title }) {
    return (
      <div data-testid="layout" title={title}>
        {children}
      </div>
    );
  };
});

// Mock AdminMenu component
jest.mock("./../../components/AdminMenu", () => {
  return function AdminMenu() {
    return <div data-testid="admin-menu">Admin Menu</div>;
  };
});

// Mock CategoryForm component
jest.mock("../../components/Form/CategoryForm", () => {
  return function CategoryForm({ handleSubmit, value, setValue }) {
    return (
      <form onSubmit={handleSubmit} data-testid="category-form">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          data-testid="category-input"
        />
        <button type="submit" data-testid="submit-button">
          Submit
        </button>
      </form>
    );
  };
});

// Mock Ant Design Modal
jest.mock("antd", () => ({
  Modal: ({ children, open, onCancel }) => {
    return open ? (
      <div data-testid="modal">
        <button onClick={onCancel} data-testid="modal-close">
          Close
        </button>
        {children}
      </div>
    ) : null;
  },
}));

describe("CreateCategory Component Integration Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock for toast
    toast.success = jest.fn();
    toast.error = jest.fn();

    // Mock localStorage
    Object.defineProperty(window, "localStorage", {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
      },
      writable: true,
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
      render(<CreateCategory />);

      // Assert - wait for async data fetch
      await waitFor(() => {
        expect(screen.getByText("Electronics")).toBeInTheDocument();
      });

      expect(screen.getByText("Books")).toBeInTheDocument();
      expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");
    });

    // Boundary Value Analysis: Empty categories (0 items)
    it("handles empty categories array on mount", async () => {
      // Arrange
      axios.get.mockResolvedValueOnce({
        data: { success: true, category: [] },
      });

      // Act
      render(<CreateCategory />);

      // Assert
      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
      });

      // Table should render but with no rows
      expect(screen.getByText("Name")).toBeInTheDocument();
      expect(screen.getByText("Actions")).toBeInTheDocument();
    });

    // CFG: Error branch - fetch failure
    it("shows error toast when fetching categories fails", async () => {
      // Arrange
      axios.get.mockRejectedValueOnce(new Error("Network error"));
      const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();

      // Act
      render(<CreateCategory />);

      // Assert
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "Something wwent wrong in getting catgeory"
        );
      });

      consoleLogSpy.mockRestore();
    });

    // Test: success: false branch
    it("does not set categories when success is false", async () => {
      // Arrange
      axios.get.mockResolvedValueOnce({
        data: { success: false, category: [] },
      });

      // Act
      render(<CreateCategory />);

      // Assert
      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
      });

      // Categories should not be rendered since success is false
      expect(screen.queryByText("Electronics")).not.toBeInTheDocument();
    });
  });

  describe("Create Category Flow - API Integration", () => {
    // AAA Pattern: Test full create category flow
    it("creates category via API and refreshes list", async () => {
      // Arrange - Mock initial fetch
      const mockCategories = [
        { _id: "1", name: "Electronics", slug: "electronics" },
      ];

      axios.get
        .mockResolvedValueOnce({
          data: { success: true, category: mockCategories },
        })
        .mockResolvedValueOnce({
          // Second call after create
          data: {
            success: true,
            category: [
              ...mockCategories,
              { _id: "2", name: "Books", slug: "books" },
            ],
          },
        });

      axios.post.mockResolvedValueOnce({
        data: {
          success: true,
          message: "New category created",
          category: { _id: "2", name: "Books", slug: "books" },
        },
      });

      render(<CreateCategory />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText("Electronics")).toBeInTheDocument();
      });

      // Act - Fill form and submit
      const input = screen.getAllByTestId("category-input")[0]; // First form (create)
      const submitButton = screen.getAllByTestId("submit-button")[0];

      fireEvent.change(input, { target: { value: "Books" } });
      fireEvent.click(submitButton);

      // Assert - Check API calls and UI updates
      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          "/api/v1/category/create-category",
          { name: "Books" }
        );
      });

      expect(toast.success).toHaveBeenCalledWith("Books is created");

      // Check that getAllCategory was called again (refresh)
      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledTimes(2);
      });
    });

    // CFG: Error branch - create fails with success: false
    it("shows error toast when API returns success: false", async () => {
      // Arrange
      axios.get.mockResolvedValueOnce({
        data: { success: true, category: [] },
      });

      axios.post.mockResolvedValueOnce({
        data: { success: false, message: "Category Already Exists" },
      });

      render(<CreateCategory />);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
      });

      // Act
      const input = screen.getAllByTestId("category-input")[0];
      const submitButton = screen.getAllByTestId("submit-button")[0];

      fireEvent.change(input, { target: { value: "Duplicate" } });
      fireEvent.click(submitButton);

      // Assert
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Category Already Exists");
      });
    });

    // CFG: Exception branch - network error
    it("handles network errors during create", async () => {
      // Arrange
      axios.get.mockResolvedValueOnce({
        data: { success: true, category: [] },
      });

      axios.post.mockRejectedValueOnce(new Error("Network error"));
      const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();

      render(<CreateCategory />);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
      });

      // Act
      const input = screen.getAllByTestId("category-input")[0];
      const submitButton = screen.getAllByTestId("submit-button")[0];

      fireEvent.change(input, { target: { value: "Test" } });
      fireEvent.click(submitButton);

      // Assert
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "somthing went wrong in input form"
        );
      });

      consoleLogSpy.mockRestore();
    });
  });

  describe("Update Category Flow - API Integration", () => {
    // Test full update flow
    it("updates category via API and refreshes list", async () => {
      // Arrange
      const mockCategories = [
        { _id: "1", name: "Electronics", slug: "electronics" },
      ];

      axios.get
        .mockResolvedValueOnce({
          data: { success: true, category: mockCategories },
        })
        .mockResolvedValueOnce({
          // After update
          data: {
            success: true,
            category: [{ _id: "1", name: "Tech", slug: "tech" }],
          },
        });

      axios.put.mockResolvedValueOnce({
        data: {
          success: true,
          message: "Category updated successfully",
          category: { _id: "1", name: "Tech", slug: "tech" },
        },
      });

      render(<CreateCategory />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText("Electronics")).toBeInTheDocument();
      });

      // Act - Click Edit button
      const editButton = screen.getByText("Edit");
      fireEvent.click(editButton);

      // Modal should open
      await waitFor(() => {
        expect(screen.getByTestId("modal")).toBeInTheDocument();
      });

      // Update category name in modal
      const modalInput = screen.getAllByTestId("category-input")[1]; // Modal form
      const modalSubmit = screen.getAllByTestId("submit-button")[1];

      fireEvent.change(modalInput, { target: { value: "Tech" } });
      fireEvent.click(modalSubmit);

      // Assert
      await waitFor(() => {
        expect(axios.put).toHaveBeenCalledWith(
          "/api/v1/category/update-category/1",
          { name: "Tech" }
        );
      });

      expect(toast.success).toHaveBeenCalledWith("Tech is updated");

      // Modal should close and data refreshed
      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledTimes(2);
      });
    });

    // CFG: Error branch - update fails
    it("shows error toast when update API returns success: false", async () => {
      // Arrange
      const mockCategories = [
        { _id: "1", name: "Electronics", slug: "electronics" },
      ];

      axios.get.mockResolvedValue({
        data: { success: true, category: mockCategories },
      });

      axios.put.mockResolvedValueOnce({
        data: { success: false, message: "Update failed" },
      });

      render(<CreateCategory />);

      await waitFor(() => {
        expect(screen.getByText("Electronics")).toBeInTheDocument();
      });

      // Act
      fireEvent.click(screen.getByText("Edit"));

      await waitFor(() => {
        expect(screen.getByTestId("modal")).toBeInTheDocument();
      });

      const modalInput = screen.getAllByTestId("category-input")[1];
      const modalSubmit = screen.getAllByTestId("submit-button")[1];

      fireEvent.change(modalInput, { target: { value: "Failed" } });
      fireEvent.click(modalSubmit);

      // Assert
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Update failed");
      });
    });

    // CFG: Exception branch
    it("handles network errors during update", async () => {
      // Arrange
      const mockCategories = [
        { _id: "1", name: "Electronics", slug: "electronics" },
      ];

      axios.get.mockResolvedValue({
        data: { success: true, category: mockCategories },
      });

      axios.put.mockRejectedValueOnce(new Error("Network error"));

      render(<CreateCategory />);

      await waitFor(() => {
        expect(screen.getByText("Electronics")).toBeInTheDocument();
      });

      // Act
      fireEvent.click(screen.getByText("Edit"));

      await waitFor(() => {
        expect(screen.getByTestId("modal")).toBeInTheDocument();
      });

      const modalInput = screen.getAllByTestId("category-input")[1];
      const modalSubmit = screen.getAllByTestId("submit-button")[1];

      fireEvent.change(modalInput, { target: { value: "Error" } });
      fireEvent.click(modalSubmit);

      // Assert
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Somtihing went wrong");
      });
    });
  });

  describe("Delete Category Flow - API Integration", () => {
    // Test full delete flow
    it("deletes category via API and refreshes list", async () => {
      // Arrange
      const mockCategories = [
        { _id: "1", name: "Electronics", slug: "electronics" },
        { _id: "2", name: "Books", slug: "books" },
      ];

      axios.get
        .mockResolvedValueOnce({
          data: { success: true, category: mockCategories },
        })
        .mockResolvedValueOnce({
          // After delete
          data: {
            success: true,
            category: [{ _id: "2", name: "Books", slug: "books" }],
          },
        });

      axios.delete.mockResolvedValueOnce({
        data: { success: true, message: "Category Deleted Successfully" },
      });

      render(<CreateCategory />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText("Electronics")).toBeInTheDocument();
      });

      // Act - Click Delete button
      const deleteButtons = screen.getAllByText("Delete");
      fireEvent.click(deleteButtons[0]); // Delete first category

      // Assert
      await waitFor(() => {
        expect(axios.delete).toHaveBeenCalledWith(
          "/api/v1/category/delete-category/1"
        );
      });

      expect(toast.success).toHaveBeenCalledWith("category is deleted");

      // Data should be refreshed
      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledTimes(2);
      });
    });

    // CFG: Error branch - delete fails
    it("shows error toast when delete API returns success: false", async () => {
      // Arrange
      const mockCategories = [
        { _id: "1", name: "Electronics", slug: "electronics" },
      ];

      axios.get.mockResolvedValue({
        data: { success: true, category: mockCategories },
      });

      axios.delete.mockResolvedValueOnce({
        data: { success: false, message: "Cannot delete category" },
      });

      render(<CreateCategory />);

      await waitFor(() => {
        expect(screen.getByText("Electronics")).toBeInTheDocument();
      });

      // Act
      fireEvent.click(screen.getByText("Delete"));

      // Assert
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Cannot delete category");
      });
    });

    // CFG: Exception branch
    it("handles network errors during delete", async () => {
      // Arrange
      const mockCategories = [
        { _id: "1", name: "Electronics", slug: "electronics" },
      ];

      axios.get.mockResolvedValue({
        data: { success: true, category: mockCategories },
      });

      axios.delete.mockRejectedValueOnce(new Error("Network error"));

      render(<CreateCategory />);

      await waitFor(() => {
        expect(screen.getByText("Electronics")).toBeInTheDocument();
      });

      // Act
      fireEvent.click(screen.getByText("Delete"));

      // Assert
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Somtihing went wrong");
      });
    });
  });

  describe("Modal Behavior", () => {
    // Test modal open/close
    it("opens modal when Edit is clicked and closes on cancel", async () => {
      // Arrange
      const mockCategories = [
        { _id: "1", name: "Electronics", slug: "electronics" },
      ];

      axios.get.mockResolvedValue({
        data: { success: true, category: mockCategories },
      });

      render(<CreateCategory />);

      await waitFor(() => {
        expect(screen.getByText("Electronics")).toBeInTheDocument();
      });

      // Act - Open modal
      fireEvent.click(screen.getByText("Edit"));

      // Assert - Modal should be visible
      await waitFor(() => {
        expect(screen.getByTestId("modal")).toBeInTheDocument();
      });

      // Act - Close modal
      fireEvent.click(screen.getByTestId("modal-close"));

      // Assert - Modal should close
      await waitFor(() => {
        expect(screen.queryByTestId("modal")).not.toBeInTheDocument();
      });
    });
  });
});
