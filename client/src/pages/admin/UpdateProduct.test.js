import React from "react";
import { render, fireEvent, waitFor, screen } from "@testing-library/react";
import axios from "axios";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import "@testing-library/jest-dom/extend-expect";
import toast from "react-hot-toast";
import UpdateProduct from "./UpdateProduct";

const mockNavigate = jest.fn();
const mockParams = { slug: "test-product" };

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
    useParams: () => mockParams,
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

const mockProduct = {
  product: {
    _id: "product123",
    name: "Test Product",
    description: "Test Description",
    price: 100,
    quantity: 10,
    shipping: true,
    category: {
      _id: "cat123",
      name: "Test Category",
    },
  },
};

const mockCategories = {
  success: true,
  category: [
    { _id: "cat123", name: "Test Category" },
    { _id: "cat456", name: "Another Category" },
  ],
};

const renderUpdateProduct = () => {
  return render(
    <MemoryRouter initialEntries={["/admin/update-product/test-product"]}>
      <Routes>
        <Route path="/admin/update-product/:slug" element={<UpdateProduct />} />
      </Routes>
    </MemoryRouter>
  );
};

describe("UpdateProduct Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockReset();
    jest.spyOn(console, "log").mockImplementation(() => {});

    // Default successful API responses
    axios.get.mockImplementation((url) => {
      if (url.includes("/api/v1/product/get-product/")) {
        return Promise.resolve({ data: mockProduct });
      }
      if (url === "/api/v1/category/get-category") {
        return Promise.resolve({ data: mockCategories });
      }
      return Promise.reject(new Error("Unknown URL"));
    });
  });

  afterEach(() => {
    console.log.mockRestore();
  });

  describe("Rendering", () => {
    it("renders update form with all elements", async () => {
      renderUpdateProduct();

      await waitFor(() => {
        expect(screen.getByText("Update Product")).toBeInTheDocument();
      });

      expect(screen.getByPlaceholderText("write a name")).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText("write a description")
      ).toBeInTheDocument();
      expect(screen.getByPlaceholderText("write a Price")).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText("write a quantity")
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /update product/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /delete product/i })
      ).toBeInTheDocument();
    });

    it("pre-populates form fields with product data from API", async () => {
      renderUpdateProduct();

      await waitFor(() => {
        expect(screen.getByPlaceholderText("write a name").value).toBe(
          "Test Product"
        );
      });

      expect(screen.getByPlaceholderText("write a description").value).toBe(
        "Test Description"
      );
      expect(screen.getByPlaceholderText("write a Price").value).toBe("100");
      expect(screen.getByPlaceholderText("write a quantity").value).toBe("10");
    });
  });

  describe("Data Fetching on Mount", () => {
    it("fetches single product data using params.slug", async () => {
      renderUpdateProduct();

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith(
          "/api/v1/product/get-product/test-product"
        );
      });
    });

    it("fetches all categories on mount", async () => {
      renderUpdateProduct();

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");
      });
    });

    it("sets form state with fetched product data", async () => {
      renderUpdateProduct();

      await waitFor(() => {
        expect(screen.getByPlaceholderText("write a name").value).toBe(
          "Test Product"
        );
      });

      expect(screen.getByPlaceholderText("write a description").value).toBe(
        "Test Description"
      );
      expect(screen.getByPlaceholderText("write a Price").value).toBe("100");
      expect(screen.getByPlaceholderText("write a quantity").value).toBe("10");
    });

    it("handles product fetch errors gracefully", async () => {
      axios.get.mockImplementation((url) => {
        if (url.includes("/api/v1/product/get-product/")) {
          return Promise.reject(new Error("Product not found"));
        }
        if (url === "/api/v1/category/get-category") {
          return Promise.resolve({ data: mockCategories });
        }
        return Promise.reject(new Error("Unknown URL"));
      });

      renderUpdateProduct();

      await waitFor(() => {
        expect(console.log).toHaveBeenCalled();
      });
    });

    it("handles category fetch errors gracefully", async () => {
      axios.get.mockImplementation((url) => {
        if (url.includes("/api/v1/product/get-product/")) {
          return Promise.resolve({ data: mockProduct });
        }
        if (url === "/api/v1/category/get-category") {
          return Promise.reject(new Error("Category fetch failed"));
        }
        return Promise.reject(new Error("Unknown URL"));
      });

      renderUpdateProduct();

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "Something wwent wrong in getting catgeory"
        );
      });
    });
  });

  describe("User Input", () => {
    it("allows changing product name", async () => {
      renderUpdateProduct();

      await waitFor(() => {
        expect(screen.getByPlaceholderText("write a name").value).toBe(
          "Test Product"
        );
      });

      fireEvent.change(screen.getByPlaceholderText("write a name"), {
        target: { value: "Updated Product Name" },
      });

      expect(screen.getByPlaceholderText("write a name").value).toBe(
        "Updated Product Name"
      );
    });

    it("allows changing product description", async () => {
      renderUpdateProduct();

      await waitFor(() => {
        expect(screen.getByPlaceholderText("write a description").value).toBe(
          "Test Description"
        );
      });

      fireEvent.change(screen.getByPlaceholderText("write a description"), {
        target: { value: "Updated Description" },
      });

      expect(screen.getByPlaceholderText("write a description").value).toBe(
        "Updated Description"
      );
    });

    it("allows changing product price", async () => {
      renderUpdateProduct();

      await waitFor(() => {
        expect(screen.getByPlaceholderText("write a Price").value).toBe("100");
      });

      fireEvent.change(screen.getByPlaceholderText("write a Price"), {
        target: { value: "200" },
      });

      expect(screen.getByPlaceholderText("write a Price").value).toBe("200");
    });

    it("allows changing product quantity", async () => {
      renderUpdateProduct();

      await waitFor(() => {
        expect(screen.getByPlaceholderText("write a quantity").value).toBe(
          "10"
        );
      });

      fireEvent.change(screen.getByPlaceholderText("write a quantity"), {
        target: { value: "20" },
      });

      expect(screen.getByPlaceholderText("write a quantity").value).toBe("20");
    });
  });

  describe("Photo Upload & Preview", () => {
    it("displays photo filename in upload button when file selected", async () => {
      renderUpdateProduct();

      await waitFor(() => {
        expect(screen.getByPlaceholderText("write a name").value).toBe(
          "Test Product"
        );
      });

      const file = new File(["photo"], "test-photo.jpg", {
        type: "image/jpeg",
      });
      const input = screen.getByLabelText(/upload photo/i);

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText("test-photo.jpg")).toBeInTheDocument();
      });
    });

    it("shows new photo preview when file selected", async () => {
      renderUpdateProduct();

      await waitFor(() => {
        expect(screen.getByPlaceholderText("write a name").value).toBe(
          "Test Product"
        );
      });

      const file = new File(["photo"], "test-photo.jpg", {
        type: "image/jpeg",
      });
      const input = screen.getByLabelText(/upload photo/i);

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(URL.createObjectURL).toHaveBeenCalledWith(file);
      });
    });

    it("shows existing photo from API when no new photo selected", async () => {
      renderUpdateProduct();

      await waitFor(() => {
        expect(screen.getByPlaceholderText("write a name").value).toBe(
          "Test Product"
        );
      });

      const images = screen.getAllByAltText("product_photo");
      expect(images).toHaveLength(1);
      expect(images[0]).toHaveAttribute(
        "src",
        "/api/v1/product/product-photo/product123"
      );
    });
  });

  describe("Update Product", () => {
    it("creates FormData with all fields correctly", async () => {
      renderUpdateProduct();

      await waitFor(() => {
        expect(screen.getByPlaceholderText("write a name").value).toBe(
          "Test Product"
        );
      });

      axios.put.mockResolvedValueOnce({
        data: { success: true },
      });

      fireEvent.change(screen.getByPlaceholderText("write a name"), {
        target: { value: "Updated Product" },
      });

      fireEvent.click(screen.getByRole("button", { name: /update product/i }));

      await waitFor(() => {
        expect(axios.put).toHaveBeenCalledWith(
          "/api/v1/product/update-product/product123",
          expect.any(FormData)
        );
      });
    });

    it("includes photo in FormData when new photo selected", async () => {
      renderUpdateProduct();

      await waitFor(() => {
        expect(screen.getByPlaceholderText("write a name").value).toBe(
          "Test Product"
        );
      });

      const file = new File(["photo"], "new-photo.jpg", {
        type: "image/jpeg",
      });
      const input = screen.getByLabelText(/upload photo/i);

      fireEvent.change(input, { target: { files: [file] } });

      axios.put.mockResolvedValueOnce({
        data: { success: true },
      });

      fireEvent.click(screen.getByRole("button", { name: /update product/i }));

      await waitFor(() => {
        expect(axios.put).toHaveBeenCalled();
      });
    });

    it("shows success toast and navigates on successful update", async () => {
      renderUpdateProduct();

      await waitFor(() => {
        expect(screen.getByPlaceholderText("write a name").value).toBe(
          "Test Product"
        );
      });

      axios.put.mockResolvedValueOnce({
        data: { success: true },
      });

      fireEvent.click(screen.getByRole("button", { name: /update product/i }));

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          "Product Updated Successfully"
        );
      });
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard/admin/products");
    });

    it("shows error toast when update fails", async () => {
      renderUpdateProduct();

      await waitFor(() => {
        expect(screen.getByPlaceholderText("write a name").value).toBe(
          "Test Product"
        );
      });

      axios.put.mockResolvedValueOnce({
        data: { success: false, message: "Update failed" },
      });

      fireEvent.click(screen.getByRole("button", { name: /update product/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Update failed");
      });
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it("handles network errors gracefully", async () => {
      renderUpdateProduct();

      await waitFor(() => {
        expect(screen.getByPlaceholderText("write a name").value).toBe(
          "Test Product"
        );
      });

      axios.put.mockRejectedValueOnce(new Error("Network error"));

      fireEvent.click(screen.getByRole("button", { name: /update product/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("something went wrong");
      });
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe("Delete Product", () => {
    it("shows window.prompt for confirmation", async () => {
      window.prompt = jest.fn(() => "yes");

      renderUpdateProduct();

      await waitFor(() => {
        expect(screen.getByPlaceholderText("write a name").value).toBe(
          "Test Product"
        );
      });

      axios.delete.mockResolvedValueOnce({
        data: { success: true },
      });

      fireEvent.click(screen.getByRole("button", { name: /delete product/i }));

      await waitFor(() => {
        expect(window.prompt).toHaveBeenCalledWith(
          "Are You Sure want to delete this product ? "
        );
      });
    });

    it("does not delete if user cancels prompt", async () => {
      window.prompt = jest.fn(() => null);

      renderUpdateProduct();

      await waitFor(() => {
        expect(screen.getByPlaceholderText("write a name").value).toBe(
          "Test Product"
        );
      });

      fireEvent.click(screen.getByRole("button", { name: /delete product/i }));

      expect(window.prompt).toHaveBeenCalled();
      expect(axios.delete).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it("calls DELETE API with correct product ID when confirmed", async () => {
      window.prompt = jest.fn(() => "yes");

      renderUpdateProduct();

      await waitFor(() => {
        expect(screen.getByPlaceholderText("write a name").value).toBe(
          "Test Product"
        );
      });

      axios.delete.mockResolvedValueOnce({
        data: { success: true },
      });

      fireEvent.click(screen.getByRole("button", { name: /delete product/i }));

      await waitFor(() => {
        expect(axios.delete).toHaveBeenCalledWith(
          "/api/v1/product/delete-product/product123"
        );
      });
    });

    it("shows success toast and navigates to products list after delete", async () => {
      window.prompt = jest.fn(() => "yes");

      renderUpdateProduct();

      await waitFor(() => {
        expect(screen.getByPlaceholderText("write a name").value).toBe(
          "Test Product"
        );
      });

      axios.delete.mockResolvedValueOnce({
        data: { success: true },
      });

      fireEvent.click(screen.getByRole("button", { name: /delete product/i }));

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          "Product Deleted Successfully"
        );
      });
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard/admin/products");
    });

    it("handles delete API errors gracefully", async () => {
      window.prompt = jest.fn(() => "yes");

      renderUpdateProduct();

      await waitFor(() => {
        expect(screen.getByPlaceholderText("write a name").value).toBe(
          "Test Product"
        );
      });

      axios.delete.mockRejectedValueOnce(new Error("Delete failed"));

      fireEvent.click(screen.getByRole("button", { name: /delete product/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Something went wrong");
      });
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});
