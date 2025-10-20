import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";
import Categories from "./Categories";
import axios from "axios";
import { AuthProvider } from "../context/auth";
import { CartProvider } from "../context/cart";
import { SearchProvider } from "../context/search";

// ✅ Only mock network layer
jest.mock("axios");

jest.mock("./../components/Layout", () => ({ children }) => (
  <div data-testid="layout">{children}</div>
));

describe("Integration: Categories Page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    document.title = "";
    localStorage.clear();
  });

  // ✅ Real providers
  const AppProviders = ({ children }) => (
    <MemoryRouter>
      <AuthProvider>
        <CartProvider>
          <SearchProvider>{children}</SearchProvider>
        </CartProvider>
      </AuthProvider>
    </MemoryRouter>
  );

  test("renders categories fetched from API through useCategory", async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        success: true,
        category: [
          { _id: "1", name: "Books", slug: "books" },
          { _id: "2", name: "Electronics", slug: "electronics" },
        ],
      },
    });

    render(
      <AppProviders>
        <Categories />
      </AppProviders>
    );

    // ✅ Wait for axios + rerender
    await waitFor(() =>
      expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category")
    );

    // ✅ Wait for re-render after state update
    await waitFor(() => {
      const categoryLinks = screen
        .getAllByRole("link")
        .filter((link) => link.classList.contains("btn-primary"));
      expect(categoryLinks).toHaveLength(2);
      expect(categoryLinks[0]).toHaveTextContent("Books");
      expect(categoryLinks[1]).toHaveTextContent("Electronics");
    });
  });

  test("renders gracefully when API returns an empty list", async () => {
    axios.get.mockResolvedValueOnce({
      data: { success: true, category: [] },
    });

    render(
      <AppProviders>
        <Categories />
      </AppProviders>
    );

    await waitFor(() =>
      expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category")
    );

    // ✅ There should be no category buttons
    await waitFor(() => {
      const categoryLinks = screen
        .queryAllByRole("link")
        .filter((link) => link.classList.contains("btn-primary"));
      expect(categoryLinks).toHaveLength(0);
    });
  });

  test("handles API error gracefully (catch block in useCategory)", async () => {
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    axios.get.mockRejectedValueOnce(new Error("Network Failure"));

    render(
      <AppProviders>
        <Categories />
      </AppProviders>
    );

    await waitFor(() =>
      expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category")
    );

    expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));

    const categoryLinks = screen
      .queryAllByRole("link")
      .filter((link) => link.classList.contains("btn-primary"));
    expect(categoryLinks).toHaveLength(0);

    consoleSpy.mockRestore();
  });
});
