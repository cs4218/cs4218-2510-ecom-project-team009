import React from "react";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import UserMenu from "./UserMenu";

// Mock react-router-dom
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  NavLink: ({ to, children, className }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}));

describe("UserMenu", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders dashboard heading", () => {
      // Arrange & Act
      render(
        <BrowserRouter>
          <UserMenu />
        </BrowserRouter>
      );

      // Assert
      expect(screen.getByText("Dashboard")).toBeInTheDocument();
    });

    it("renders profile link with correct text and href", () => {
      // Arrange & Act
      render(
        <BrowserRouter>
          <UserMenu />
        </BrowserRouter>
      );

      // Assert
      const profileLink = screen.getByText("Profile");
      expect(profileLink).toBeInTheDocument();
      expect(profileLink).toHaveAttribute("href", "/dashboard/user/profile");
    });

    it("renders orders link with correct text and href", () => {
      // Arrange & Act
      render(
        <BrowserRouter>
          <UserMenu />
        </BrowserRouter>
      );

      // Assert
      const ordersLink = screen.getByText("Orders");
      expect(ordersLink).toBeInTheDocument();
      expect(ordersLink).toHaveAttribute("href", "/dashboard/user/orders");
    });

    it("renders all menu items together", () => {
      // Arrange & Act
      render(
        <BrowserRouter>
          <UserMenu />
        </BrowserRouter>
      );

      // Assert - verify all user-facing content
      expect(screen.getByText("Dashboard")).toBeInTheDocument();
      expect(screen.getByText("Profile")).toBeInTheDocument();
      expect(screen.getByText("Orders")).toBeInTheDocument();
    });
  });

  describe("Navigation Links", () => {
    it("profile and orders links have correct list-group styling classes", () => {
      // Arrange & Act
      render(
        <BrowserRouter>
          <UserMenu />
        </BrowserRouter>
      );

      // Assert
      const profileLink = screen.getByText("Profile");
      const ordersLink = screen.getByText("Orders");

      expect(profileLink).toHaveClass(
        "list-group-item",
        "list-group-item-action"
      );
      expect(ordersLink).toHaveClass(
        "list-group-item",
        "list-group-item-action"
      );
    });
  });
});
