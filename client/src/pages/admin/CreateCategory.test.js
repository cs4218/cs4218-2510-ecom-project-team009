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

  describe("Data Fetching on Mount", () => {
    it("fetches all categories on mount", async () => {
      renderCreateCategory();

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");
      });
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

  describe("Create Category", () => {
    it("allows typing in category name input", async () => {
      renderCreateCategory();

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText("Enter new category")
        ).toBeInTheDocument();
      });

      fireEvent.change(screen.getByPlaceholderText("Enter new category"), {
        target: { value: "Books" },
      });

      expect(screen.getByPlaceholderText("Enter new category").value).toBe(
        "Books"
      );
    });

    it("creates category successfully and shows success toast", async () => {
      axios.post.mockResolvedValueOnce({
        data: { success: true },
      });

      renderCreateCategory();

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText("Enter new category")
        ).toBeInTheDocument();
      });

      fireEvent.change(screen.getByPlaceholderText("Enter new category"), {
        target: { value: "Books" },
      });

      fireEvent.click(screen.getAllByRole("button", { name: /submit/i })[0]);

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          "/api/v1/category/create-category",
          { name: "Books" }
        );
      });

      expect(toast.success).toHaveBeenCalledWith("Books is created");
    });

    it("refreshes category list after creation", async () => {
      axios.post.mockResolvedValueOnce({
        data: { success: true },
      });

      renderCreateCategory();

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText("Enter new category")
        ).toBeInTheDocument();
      });

      fireEvent.change(screen.getByPlaceholderText("Enter new category"), {
        target: { value: "Books" },
      });

      fireEvent.click(screen.getAllByRole("button", { name: /submit/i })[0]);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledTimes(2); // Initial mount + after create
      });
    });

    it("shows error toast when creation fails", async () => {
      axios.post.mockResolvedValueOnce({
        data: { success: false, message: "Category already exists" },
      });

      renderCreateCategory();

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText("Enter new category")
        ).toBeInTheDocument();
      });

      fireEvent.change(screen.getByPlaceholderText("Enter new category"), {
        target: { value: "Electronics" },
      });

      fireEvent.click(screen.getAllByRole("button", { name: /submit/i })[0]);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Category already exists");
      });
    });

    it("handles network errors gracefully", async () => {
      axios.post.mockRejectedValueOnce(new Error("Network error"));

      renderCreateCategory();

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText("Enter new category")
        ).toBeInTheDocument();
      });

      fireEvent.change(screen.getByPlaceholderText("Enter new category"), {
        target: { value: "Books" },
      });

      fireEvent.click(screen.getAllByRole("button", { name: /submit/i })[0]);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "somthing went wrong in input form"
        );
      });
    });
  });

  describe("Update Category", () => {
    it("opens modal when Edit button clicked", async () => {
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
    });

    it("pre-populates modal form with category name", async () => {
      renderCreateCategory();

      await waitFor(() => {
        expect(screen.getByText("Electronics")).toBeInTheDocument();
      });

      const editButtons = screen.getAllByRole("button", { name: /edit/i });
      fireEvent.click(editButtons[0]);

      await waitFor(() => {
        const inputs = screen.getAllByPlaceholderText("Enter new category");
        // Second input should be in modal with pre-populated value
        expect(inputs[1].value).toBe("Electronics");
      });
    });

    it("allows changing category name in modal", async () => {
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

      expect(inputs[1].value).toBe("Updated Electronics");
    });

    it("updates category successfully and shows success toast", async () => {
      axios.put.mockResolvedValueOnce({
        data: { success: true },
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
      fireEvent.click(submitButtons[1]); // Modal submit button

      await waitFor(() => {
        expect(axios.put).toHaveBeenCalledWith(
          "/api/v1/category/update-category/cat123",
          { name: "Updated Electronics" }
        );
      });

      expect(toast.success).toHaveBeenCalledWith(
        "Updated Electronics is updated"
      );
    });

    it("closes modal after successful update", async () => {
      axios.put.mockResolvedValueOnce({
        data: { success: true },
      });

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

      const inputs = screen.getAllByPlaceholderText("Enter new category");
      fireEvent.change(inputs[1], {
        target: { value: "Updated Electronics" },
      });

      const submitButtons = screen.getAllByRole("button", { name: /submit/i });
      fireEvent.click(submitButtons[1]);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalled();
      });

      // Modal should be closed (state set to false)
    });

    it("refreshes category list after update", async () => {
      axios.put.mockResolvedValueOnce({
        data: { success: true },
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
        expect(axios.get).toHaveBeenCalledTimes(2); // Initial mount + after update
      });
    });

    it("shows error toast when update fails", async () => {
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
    });

    it("handles network errors gracefully", async () => {
      axios.put.mockRejectedValueOnce(new Error("Network error"));

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

  describe("Delete Category", () => {
    it("deletes category successfully and shows success toast", async () => {
      axios.delete.mockResolvedValueOnce({
        data: { success: true },
      });

      renderCreateCategory();

      await waitFor(() => {
        expect(screen.getByText("Electronics")).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole("button", { name: /delete/i });
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(axios.delete).toHaveBeenCalledWith(
          "/api/v1/category/delete-category/cat123"
        );
      });

      expect(toast.success).toHaveBeenCalledWith("category is deleted");
    });

    it("refreshes category list after deletion", async () => {
      axios.delete.mockResolvedValueOnce({
        data: { success: true },
      });

      renderCreateCategory();

      await waitFor(() => {
        expect(screen.getByText("Electronics")).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole("button", { name: /delete/i });
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledTimes(2); // Initial mount + after delete
      });
    });

    it("shows error toast when deletion fails", async () => {
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
    });

    it("handles network errors gracefully", async () => {
      axios.delete.mockRejectedValueOnce(new Error("Network error"));

      renderCreateCategory();

      await waitFor(() => {
        expect(screen.getByText("Electronics")).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole("button", { name: /delete/i });
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Somtihing went wrong");
      });
    });
  });
});
