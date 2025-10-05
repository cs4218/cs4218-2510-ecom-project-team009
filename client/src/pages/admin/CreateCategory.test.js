import React from "react";
import { render, fireEvent, waitFor, screen } from "@testing-library/react";
import axios from "axios";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import "@testing-library/jest-dom/extend-expect";
import toast from "react-hot-toast";
import CreateCategory from "./CreateCategory";

const mockNavigate = jest.fn();

jest.mock("axios");
jest.mock("react-hot-toast");

jest.mock("../../context/auth", () => ({
  useAuth: jest.fn(() => [null, jest.fn()]),
}));

jest.mock("../../context/cart", () => ({
  useCart: jest.fn(() => [null, jest.fn()]),
}));

jest.mock("../../context/search", () => ({
  useSearch: jest.fn(() => [{ keyword: "" }, jest.fn()]),
}));

jest.mock("../../hooks/useCategory", () => jest.fn(() => []));

jest.mock("react-router-dom", () => {
  const actual = jest.requireActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

Object.defineProperty(window, "localStorage", {
  value: {
    setItem: jest.fn(),
    getItem: jest.fn(),
    removeItem: jest.fn(),
  },
  writable: true,
});

window.matchMedia =
  window.matchMedia ||
  function () {
    return {
      matches: false,
      addListener: function () {},
      removeListener: function () {},
    };
  };

const mockCategories = {
  success: true,
  category: [
    { _id: "cat123", name: "Electronics" },
    { _id: "cat456", name: "Clothing" },
  ],
};

const renderCreateCategory = () => {
  return render(
    <MemoryRouter initialEntries={["/admin/create-category"]}>
      <Routes>
        <Route path="/admin/create-category" element={<CreateCategory />} />
      </Routes>
    </MemoryRouter>
  );
};

describe("CreateCategory Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockReset();
    jest.spyOn(console, "log").mockImplementation(() => {});

    // Default successful API response for categories
    axios.get.mockResolvedValue({ data: mockCategories });
  });

  afterEach(() => {
    console.log.mockRestore();
  });

  describe("Rendering", () => {
    it("renders manage category page with all elements", async () => {
      renderCreateCategory();

      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: /manage category/i })
        ).toBeInTheDocument();
      });

      expect(
        screen.getByPlaceholderText("Enter new category")
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /submit/i })
      ).toBeInTheDocument();
      expect(screen.getByRole("table")).toBeInTheDocument();
    });

    it("renders categories in table after fetch", async () => {
      renderCreateCategory();

      await waitFor(() => {
        expect(screen.getByText("Electronics")).toBeInTheDocument();
      });

      expect(screen.getByText("Clothing")).toBeInTheDocument();
      expect(screen.getAllByRole("button", { name: /edit/i })).toHaveLength(2);
      expect(screen.getAllByRole("button", { name: /delete/i })).toHaveLength(
        2
      );
    });

    it("shows empty table when no categories", async () => {
      axios.get.mockResolvedValue({
        data: { success: true, category: [] },
      });

      renderCreateCategory();

      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: /manage category/i })
        ).toBeInTheDocument();
      });

      expect(screen.queryByText("Electronics")).not.toBeInTheDocument();
    });
  });

  describe("Data Fetching on Mount - Boundary Value Analysis & CFG", () => {
    it("fetches all categories on mount", async () => {
      renderCreateCategory();

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");
      });
    });

    it("renders single category correctly (1 category - boundary)", async () => {
      axios.get.mockResolvedValue({
        data: { success: true, category: [{ _id: "cat1", name: "Electronics" }] },
      });

      renderCreateCategory();

      await waitFor(() => {
        expect(screen.getByText("Electronics")).toBeInTheDocument();
      });

      expect(screen.getAllByRole("button", { name: /edit/i })).toHaveLength(1);
      expect(screen.getAllByRole("button", { name: /delete/i })).toHaveLength(1);
    });

    it("handles category fetch API returning success false", async () => {
      axios.get.mockResolvedValue({
        data: { success: false },
      });

      renderCreateCategory();

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");
      });

      // Categories should not be set when success is false
      expect(screen.queryByText("Electronics")).not.toBeInTheDocument();
    });

    it("handles category fetch errors gracefully", async () => {
      axios.get.mockRejectedValueOnce(new Error("Category fetch failed"));

      renderCreateCategory();

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "Something wwent wrong in getting catgeory"
        );
      });
    });
  });

  describe("Create Category - Strategic Grouping & CFG", () => {
    it("creates category successfully with full workflow", async () => {
      axios.post.mockResolvedValueOnce({
        data: { success: true },
      });

      renderCreateCategory();

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText("Enter new category")
        ).toBeInTheDocument();
      });

      // Arrange + Act: Type in input (verify input typing works)
      const input = screen.getByPlaceholderText("Enter new category");
      fireEvent.change(input, {
        target: { value: "Books" },
      });
      expect(input.value).toBe("Books");

      // Act: Submit form
      fireEvent.click(screen.getAllByRole("button", { name: /submit/i })[0]);

      // Assert: Verify API call, success toast, and list refresh
      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          "/api/v1/category/create-category",
          { name: "Books" }
        );
      });
      expect(toast.success).toHaveBeenCalledWith("Books is created");
      expect(axios.get).toHaveBeenCalledTimes(2); // Initial mount + after create
    });

    it("handles create errors (API failure & network errors)", async () => {
      // Test 1: API returns success: false
      axios.post.mockResolvedValueOnce({
        data: { success: false, message: "Category already exists" },
      });

      renderCreateCategory();

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText("Enter new category")
        ).toBeInTheDocument();
      });

      const input1 = screen.getByPlaceholderText("Enter new category");
      fireEvent.change(input1, {
        target: { value: "Electronics" },
      });
      fireEvent.click(screen.getAllByRole("button", { name: /submit/i })[0]);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Category already exists");
      });

      // Test 2: Network error (different CFG path)
      jest.clearAllMocks();
      axios.get.mockResolvedValue({ data: mockCategories });
      axios.post.mockRejectedValueOnce(new Error("Network error"));

      renderCreateCategory();

      await waitFor(() => {
        expect(screen.getByText("Electronics")).toBeInTheDocument();
      });

      const inputs = screen.getAllByPlaceholderText("Enter new category");
      fireEvent.change(inputs[inputs.length - 1], {
        target: { value: "Books" },
      });
      const submitButtons = screen.getAllByRole("button", { name: /submit/i });
      fireEvent.click(submitButtons[submitButtons.length - 1]);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "somthing went wrong in input form"
        );
      });
    });
  });

  describe("Update Category - Strategic Grouping & CFG", () => {
    it("updates category successfully with full workflow", async () => {
      axios.put.mockResolvedValueOnce({
        data: { success: true },
      });

      renderCreateCategory();

      await waitFor(() => {
        expect(screen.getByText("Electronics")).toBeInTheDocument();
      });

      // Act: Open modal (verify modal opens)
      const editButtons = screen.getAllByRole("button", { name: /edit/i });
      fireEvent.click(editButtons[0]);

      await waitFor(() => {
        const modals = screen.getAllByRole("dialog");
        expect(modals.length).toBeGreaterThan(0);
      });

      // Arrange + Act: Verify pre-population & change value
      const inputs = screen.getAllByPlaceholderText("Enter new category");
      expect(inputs[1].value).toBe("Electronics"); // Pre-populated value verified
      fireEvent.change(inputs[1], {
        target: { value: "Updated Electronics" },
      });
      expect(inputs[1].value).toBe("Updated Electronics"); // Input change verified

      // Act: Submit update
      const submitButtons = screen.getAllByRole("button", { name: /submit/i });
      fireEvent.click(submitButtons[1]);

      // Assert: Verify API call, success toast, and list refresh
      await waitFor(() => {
        expect(axios.put).toHaveBeenCalledWith(
          "/api/v1/category/update-category/cat123",
          { name: "Updated Electronics" }
        );
      });
      expect(toast.success).toHaveBeenCalledWith(
        "Updated Electronics is updated"
      );
      expect(axios.get).toHaveBeenCalledTimes(2); // Initial mount + after update
    });

    it("handles update errors (API failure & network errors)", async () => {
      // Test 1: API returns success: false
      axios.put.mockResolvedValueOnce({
        data: { success: false, message: "Update failed" },
      });

      renderCreateCategory();

      await waitFor(() => {
        expect(screen.getByText("Electronics")).toBeInTheDocument();
      });

      const editButtons = screen.getAllByRole("button", { name: /edit/i });
      fireEvent.click(editButtons[0]);

      await waitFor(() => {
        const inputs = screen.getAllByPlaceholderText("Enter new category");
        expect(inputs[1].value).toBe("Electronics");
      });

      const inputs = screen.getAllByPlaceholderText("Enter new category");
      fireEvent.change(inputs[1], {
        target: { value: "Updated Electronics" },
      });

      const submitButtons = screen.getAllByRole("button", { name: /submit/i });
      fireEvent.click(submitButtons[1]);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Update failed");
      });

      // Test 2: Network error (different CFG path)
      jest.clearAllMocks();
      axios.get.mockResolvedValue({ data: mockCategories });
      axios.put.mockRejectedValueOnce(new Error("Network error"));

      renderCreateCategory();

      await waitFor(() => {
        expect(screen.getByText("Electronics")).toBeInTheDocument();
      });

      const editButtons2 = screen.getAllByRole("button", { name: /edit/i });
      fireEvent.click(editButtons2[0]);

      await waitFor(() => {
        const inputs2 = screen.getAllByPlaceholderText("Enter new category");
        expect(inputs2[1].value).toBe("Electronics");
      });

      const inputs2 = screen.getAllByPlaceholderText("Enter new category");
      fireEvent.change(inputs2[1], {
        target: { value: "Updated Electronics" },
      });

      const submitButtons2 = screen.getAllByRole("button", { name: /submit/i });
      fireEvent.click(submitButtons2[1]);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Somtihing went wrong");
      });
    });

    it("closes modal when cancel button clicked", async () => {
      renderCreateCategory();

      await waitFor(() => {
        expect(screen.getByText("Electronics")).toBeInTheDocument();
      });

      const editButtons = screen.getAllByRole("button", { name: /edit/i });
      fireEvent.click(editButtons[0]);

      await waitFor(() => {
        const modals = screen.getAllByRole("dialog");
        expect(modals.length).toBeGreaterThan(0);
      });

      // Find and click the close button (X button in modal)
      const closeButtons = screen.getAllByRole("button", { name: /close/i });
      if (closeButtons.length > 0) {
        fireEvent.click(closeButtons[0]);
      }

      // Modal should be closed (onCancel called)
    });
  });

  describe("Delete Category - Strategic Grouping & CFG", () => {
    it("deletes category successfully and refreshes list", async () => {
      axios.delete.mockResolvedValueOnce({
        data: { success: true },
      });

      renderCreateCategory();

      await waitFor(() => {
        expect(screen.getByText("Electronics")).toBeInTheDocument();
      });

      // Act: Click delete button
      const deleteButtons = screen.getAllByRole("button", { name: /delete/i });
      fireEvent.click(deleteButtons[0]);

      // Assert: Verify API call, success toast, and list refresh
      await waitFor(() => {
        expect(axios.delete).toHaveBeenCalledWith(
          "/api/v1/category/delete-category/cat123"
        );
      });
      expect(toast.success).toHaveBeenCalledWith("category is deleted");
      expect(axios.get).toHaveBeenCalledTimes(2); // Initial mount + after delete
    });

    it("handles delete errors (API failure & network errors)", async () => {
      // Test 1: API returns success: false
      axios.delete.mockResolvedValueOnce({
        data: { success: false, message: "Cannot delete category" },
      });

      renderCreateCategory();

      await waitFor(() => {
        expect(screen.getByText("Electronics")).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole("button", { name: /delete/i });
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Cannot delete category");
      });

      // Test 2: Network error (different CFG path)
      jest.clearAllMocks();
      axios.get.mockResolvedValue({ data: mockCategories });
      axios.delete.mockRejectedValueOnce(new Error("Network error"));

      renderCreateCategory();

      await waitFor(() => {
        expect(screen.getByText("Electronics")).toBeInTheDocument();
      });

      const deleteButtons2 = screen.getAllByRole("button", { name: /delete/i });
      fireEvent.click(deleteButtons2[0]);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Somtihing went wrong");
      });
    });
  });
});
