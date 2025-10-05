import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import Dashboard from "./Dashboard";
import { useAuth } from "../../context/auth";

// Mock dependencies
jest.mock("../../context/auth");

jest.mock("../../components/Layout", () => ({ children, title }) => (
  <div data-testid="layout" data-title={title}>
    {children}
  </div>
));

jest.mock("../../components/UserMenu", () => () => (
  <div data-testid="user-menu">UserMenu</div>
));

describe("Dashboard Component", () => {
  const mockUser = {
    name: "John Doe",
    email: "john@example.com",
    address: "123 Main St, City",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders layout and user menu", () => {
      // Arrange
      useAuth.mockReturnValue([{ user: mockUser }]);

      // Act
      render(<Dashboard />);

      // Assert
      expect(screen.getByTestId("layout")).toBeInTheDocument();
      expect(screen.getByTestId("user-menu")).toBeInTheDocument();
    });

    it("renders layout with correct title", () => {
      // Arrange
      useAuth.mockReturnValue([{ user: mockUser }]);

      // Act
      render(<Dashboard />);

      // Assert
      const layout = screen.getByTestId("layout");
      expect(layout).toHaveAttribute("data-title", "Dashboard - Ecommerce App");
    });
  });

  describe("User Data Display", () => {
    it("displays user information when user data is available", () => {
      // Arrange
      useAuth.mockReturnValue([{ user: mockUser }]);

      // Act
      render(<Dashboard />);

      // Assert
      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.getByText("john@example.com")).toBeInTheDocument();
      expect(screen.getByText("123 Main St, City")).toBeInTheDocument();
    });

    it("displays all user fields in h3 tags", () => {
      // Arrange
      useAuth.mockReturnValue([{ user: mockUser }]);

      // Act
      render(<Dashboard />);

      // Assert
      const name = screen.getByText("John Doe");
      const email = screen.getByText("john@example.com");
      const address = screen.getByText("123 Main St, City");

      expect(name.tagName).toBe("H3");
      expect(email.tagName).toBe("H3");
      expect(address.tagName).toBe("H3");
    });
  });

  describe("Edge Cases", () => {
    it("handles user with missing name gracefully", () => {
      // Arrange
      useAuth.mockReturnValue([
        {
          user: {
            name: null,
            email: "john@example.com",
            address: "123 Main St",
          },
        },
      ]);

      // Act
      render(<Dashboard />);

      // Assert
      expect(screen.getByText("john@example.com")).toBeInTheDocument();
      expect(screen.getByText("123 Main St")).toBeInTheDocument();
    });

    it("handles user with missing email gracefully", () => {
      // Arrange
      useAuth.mockReturnValue([
        {
          user: {
            name: "John Doe",
            email: null,
            address: "123 Main St",
          },
        },
      ]);

      // Act
      render(<Dashboard />);

      // Assert
      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.getByText("123 Main St")).toBeInTheDocument();
    });

    it("handles user with missing address gracefully", () => {
      // Arrange
      useAuth.mockReturnValue([
        {
          user: {
            name: "John Doe",
            email: "john@example.com",
            address: null,
          },
        },
      ]);

      // Act
      render(<Dashboard />);

      // Assert
      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.getByText("john@example.com")).toBeInTheDocument();
    });

    it("handles completely missing user object gracefully", () => {
      // Arrange
      useAuth.mockReturnValue([{ user: null }]);

      // Act
      render(<Dashboard />);

      // Assert
      expect(screen.getByTestId("layout")).toBeInTheDocument();
      expect(screen.getByTestId("user-menu")).toBeInTheDocument();
    });
  });
});
