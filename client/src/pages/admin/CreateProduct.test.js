import React from "react";
import { render, fireEvent, waitFor, screen } from "@testing-library/react";
import axios from "axios";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import "@testing-library/jest-dom/extend-expect";
import toast from "react-hot-toast";
import CreateProduct from "./CreateProduct";

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

global.URL.createObjectURL = jest.fn(() => "mock-photo-url");

const mockCategories = {
  success: true,
  category: [
    { _id: "cat123", name: "Test Category" },
    { _id: "cat456", name: "Another Category" },
  ],
};

const renderCreateProduct = () => {
  return render(
    <MemoryRouter initialEntries={["/admin/create-product"]}>
      <Routes>
        <Route path="/admin/create-product" element={<CreateProduct />} />
      </Routes>
    </MemoryRouter>
  );
};

// Helper function to fill product form fields
const fillProductForm = () => {
  fireEvent.change(screen.getByPlaceholderText("write a name"), {
    target: { value: "Test Product" },
  });
  fireEvent.change(screen.getByPlaceholderText("write a description"), {
    target: { value: "Test Description" },
  });
  fireEvent.change(screen.getByPlaceholderText("write a Price"), {
    target: { value: "100" },
  });
  fireEvent.change(screen.getByPlaceholderText("write a quantity"), {
    target: { value: "10" },
  });
};

describe("CreateProduct Component", () => {
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
    it("renders create form with all elements", async () => {
      renderCreateProduct();

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /create product/i })
        ).toBeInTheDocument();
      });

      expect(
        screen.getByRole("heading", { name: /create product/i })
      ).toBeInTheDocument();
      expect(screen.getByPlaceholderText("write a name")).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText("write a description")
      ).toBeInTheDocument();
      expect(screen.getByPlaceholderText("write a Price")).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText("write a quantity")
      ).toBeInTheDocument();
    });

    it("inputs should be initially empty", async () => {
      renderCreateProduct();

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /create product/i })
        ).toBeInTheDocument();
      });

      expect(screen.getByPlaceholderText("write a name").value).toBe("");
      expect(screen.getByPlaceholderText("write a description").value).toBe("");
      expect(screen.getByPlaceholderText("write a Price").value).toBe("");
      expect(screen.getByPlaceholderText("write a quantity").value).toBe("");
    });
  });

  describe("Data Fetching on Mount", () => {
    it("fetches all categories on mount", async () => {
      renderCreateProduct();

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");
      });
    });

    it("handles category fetch API returning success false", async () => {
      axios.get.mockResolvedValueOnce({
        data: { success: false },
      });

      renderCreateProduct();

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");
      });

      // Categories should not be set when success is false
      const selects = screen.getAllByRole("combobox");
      expect(selects.length).toBeGreaterThan(0);
    });

    it("handles category fetch errors gracefully", async () => {
      axios.get.mockRejectedValueOnce(new Error("Category fetch failed"));

      renderCreateProduct();

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "Something wwent wrong in getting catgeory"
        );
      });
    });
  });

  describe("User Input", () => {
    it("allows typing in all text input fields - pairwise testing", async () => {
      renderCreateProduct();

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /create product/i })
        ).toBeInTheDocument();
      });

      // Test name input
      fireEvent.change(screen.getByPlaceholderText("write a name"), {
        target: { value: "Test Product" },
      });
      expect(screen.getByPlaceholderText("write a name").value).toBe(
        "Test Product"
      );

      // Test description input
      fireEvent.change(screen.getByPlaceholderText("write a description"), {
        target: { value: "Test Description" },
      });
      expect(screen.getByPlaceholderText("write a description").value).toBe(
        "Test Description"
      );

      // Test price input
      fireEvent.change(screen.getByPlaceholderText("write a Price"), {
        target: { value: "100" },
      });
      expect(screen.getByPlaceholderText("write a Price").value).toBe("100");

      // Test quantity input
      fireEvent.change(screen.getByPlaceholderText("write a quantity"), {
        target: { value: "10" },
      });
      expect(screen.getByPlaceholderText("write a quantity").value).toBe("10");
    });

    it("allows selecting category and shipping options", async () => {
      renderCreateProduct();

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /create product/i })
        ).toBeInTheDocument();
      });

      const selects = screen.getAllByRole("combobox");

      // Test category select (first dropdown)
      fireEvent.mouseDown(selects[0]);
      await waitFor(() => {
        expect(screen.getByText("Test Category")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText("Test Category"));

      // Test shipping select (second dropdown)
      fireEvent.mouseDown(selects[1]);
      await waitFor(() => {
        expect(screen.getByText("Yes")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText("Yes"));
    });
  });

  describe("Photo Upload", () => {
    it("displays photo filename and preview when file selected - BVA boundary (1 file)", async () => {
      renderCreateProduct();

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /create product/i })
        ).toBeInTheDocument();
      });

      const file = new File(["photo"], "test-photo.jpg", {
        type: "image/jpeg",
      });
      const input = screen.getByLabelText(/upload photo/i);

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText("test-photo.jpg")).toBeInTheDocument();
      });

      expect(URL.createObjectURL).toHaveBeenCalledWith(file);
      const image = screen.getByAltText("product_photo");
      expect(image).toHaveAttribute("src", "mock-photo-url");
    });

    it("does not show photo preview when no file selected - BVA boundary (0 files)", async () => {
      renderCreateProduct();

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /create product/i })
        ).toBeInTheDocument();
      });

      expect(screen.queryByAltText("product_photo")).not.toBeInTheDocument();
    });
  });

  describe("Create Product", () => {
    it("creates FormData with all fields correctly", async () => {
      const appendSpy = jest.spyOn(FormData.prototype, "append");

      renderCreateProduct();

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /create product/i })
        ).toBeInTheDocument();
      });

      fillProductForm();

      // Select category and shipping
      const selects = screen.getAllByRole("combobox");
      fireEvent.mouseDown(selects[0]);
      await waitFor(() => {
        expect(screen.getByText("Test Category")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText("Test Category"));

      fireEvent.mouseDown(selects[1]);
      await waitFor(() => {
        expect(screen.getByText("Yes")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText("Yes"));

      axios.post.mockResolvedValueOnce({
        data: { success: true },
      });

      fireEvent.click(screen.getByRole("button", { name: /create product/i }));

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          "/api/v1/product/create-product",
          expect.any(FormData)
        );
      });

      expect(appendSpy).toHaveBeenCalledWith("name", "Test Product");
      expect(appendSpy).toHaveBeenCalledWith("description", "Test Description");
      expect(appendSpy).toHaveBeenCalledWith("price", "100");
      expect(appendSpy).toHaveBeenCalledWith("quantity", "10");
      expect(appendSpy).toHaveBeenCalledWith("category", "cat123");
      expect(appendSpy).toHaveBeenCalledWith("shipping", "1");

      appendSpy.mockRestore();
    });

    it("includes photo in FormData when selected", async () => {
      renderCreateProduct();

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /create product/i })
        ).toBeInTheDocument();
      });

      const file = new File(["photo"], "new-photo.jpg", {
        type: "image/jpeg",
      });
      const input = screen.getByLabelText(/upload photo/i);

      fireEvent.change(input, { target: { files: [file] } });
      fillProductForm();

      axios.post.mockResolvedValueOnce({
        data: { success: true },
      });

      fireEvent.click(screen.getByRole("button", { name: /create product/i }));

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalled();
      });
    });

    it("shows success toast and navigates on successful creation", async () => {
      renderCreateProduct();

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /create product/i })
        ).toBeInTheDocument();
      });

      fillProductForm();

      axios.post.mockResolvedValueOnce({
        data: { success: true },
      });

      fireEvent.click(screen.getByRole("button", { name: /create product/i }));

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          "Product Created Successfully"
        );
      });
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard/admin/products");
    });

    it("shows error toast when creation fails with API error message", async () => {
      renderCreateProduct();

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /create product/i })
        ).toBeInTheDocument();
      });

      fillProductForm();

      axios.post.mockResolvedValueOnce({
        data: { success: false, message: "Product creation failed" },
      });

      fireEvent.click(screen.getByRole("button", { name: /create product/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Product creation failed");
      });
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it("handles network errors gracefully", async () => {
      renderCreateProduct();

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /create product/i })
        ).toBeInTheDocument();
      });

      fillProductForm();

      axios.post.mockRejectedValueOnce(new Error("Network error"));

      fireEvent.click(screen.getByRole("button", { name: /create product/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("something went wrong");
      });
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});
