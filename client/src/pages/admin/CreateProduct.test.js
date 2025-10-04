import React from "react";
import { render, fireEvent, waitFor, screen } from "@testing-library/react";
import axios from "axios";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import "@testing-library/jest-dom/extend-expect";
import toast from "react-hot-toast";
import CreateProduct from "./CreateProduct";

// Mocking axios.post
jest.mock("axios");
jest.mock("react-hot-toast");

jest.mock("../../context/auth", () => ({
  useAuth: jest.fn(() => [null, jest.fn()]), // Mock useAuth hook to return null state and a mock function for setAuth
}));

jest.mock("../../context/cart", () => ({
  useCart: jest.fn(() => [null, jest.fn()]), // Mock useCart hook to return null state and a mock function
}));

jest.mock("../../context/search", () => ({
  useSearch: jest.fn(() => [{ keyword: "" }, jest.fn()]), // Mock useSearch hook to return null state and a mock function
}));

jest.mock("../../hooks/useCategory", () => jest.fn(() => []));

Object.defineProperty(window, "localStorage", {
  value: {
    setItem: jest.fn(),
    getItem: jest.fn(),
    removeItem: jest.fn(),
  },
  writable: true,
});

describe("CreateProduct Component", () => {
  it("should create a product successfully", async () => {
    render(
      <MemoryRouter initialEntries={["/admin/create-product"]}>
        <Routes>
          <Route path="/admin/create-product" element={<CreateProduct />} />
        </Routes>
      </MemoryRouter>
    );

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
    fireEvent.change(screen.getByPlaceholderText("Select Shipping"), {
      target: { value: "1" },
    });

    fireEvent.click(screen.getByText("CREATE PRODUCT"));

    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    expect(toast.success).toHaveBeenCalledWith("Product Created Successfully");
  });

  it("should display error message on failed product creation", async () => {
    axios.post.mockRejectedValueOnce({ message: "Product creation failed" });

    render(
      <MemoryRouter initialEntries={["/admin/create-product"]}>
        <Routes>
          <Route path="/admin/create-product" element={<CreateProduct />} />

          <Route path="/admin/create-product" element={<CreateProduct />} />
        </Routes>
      </MemoryRouter>
    );

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

    fireEvent.change(screen.getByPlaceholderText("Select Shipping "), {
      target: { value: "1" },
    });

    fireEvent.click(screen.getByText("CREATE PRODUCT"));

    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    expect(toast.error).toHaveBeenCalledWith("Product creation failed");
  });
});
