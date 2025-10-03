import React from "react";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import AdminMenu from "./AdminMenu";

// Helper function to render component with Router
const renderWithRouter = (component) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe("AdminMenu Component", () => {
  it("displays the Admin Panel heading", () => {
    renderWithRouter(<AdminMenu />);
    const heading = screen.getByRole("heading", { name: /admin panel/i });
    expect(heading).toBeInTheDocument();
    expect(heading.tagName).toBe("H4");
  });

  it("renders all navigation links", () => {
    renderWithRouter(<AdminMenu />);

    expect(screen.getByText("Create Category")).toBeInTheDocument();
    expect(screen.getByText("Create Product")).toBeInTheDocument();
    expect(screen.getByText("Products")).toBeInTheDocument();
    expect(screen.getByText("Orders")).toBeInTheDocument();
  });

  it("has correct href for Create Category link", () => {
    renderWithRouter(<AdminMenu />);
    const createCategoryLink = screen.getByText("Create Category");
    expect(createCategoryLink).toHaveAttribute(
      "href",
      "/dashboard/admin/create-category"
    );
  });

  it("has correct href for Create Product link", () => {
    renderWithRouter(<AdminMenu />);
    const createProductLink = screen.getByText("Create Product");
    expect(createProductLink).toHaveAttribute(
      "href",
      "/dashboard/admin/create-product"
    );
  });

  it("has correct href for Products link", () => {
    renderWithRouter(<AdminMenu />);
    const productsLink = screen.getByText("Products");
    expect(productsLink).toHaveAttribute("href", "/dashboard/admin/products");
  });

  it("has correct href for Orders link", () => {
    renderWithRouter(<AdminMenu />);
    const ordersLink = screen.getByText("Orders");
    expect(ordersLink).toHaveAttribute("href", "/dashboard/admin/orders");
  });

  it("applies correct CSS classes to navigation links", () => {
    renderWithRouter(<AdminMenu />);
    const createCategoryLink = screen.getByText("Create Category");
    expect(createCategoryLink).toHaveClass(
      "list-group-item",
      "list-group-item-action"
    );
  });

  it("renders all required navigation elements", () => {
    renderWithRouter(<AdminMenu />);
    const links = screen.getAllByRole("link");

    // Verify we have all 4 admin links
    expect(links).toHaveLength(4);

    // Verify each link has the correct class
    links.forEach((link) => {
      expect(link).toHaveClass("list-group-item", "list-group-item-action");
    });
  });
});
