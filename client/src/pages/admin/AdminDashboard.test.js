import React from "react";
import { render, screen } from "@testing-library/react";
import AdminDashboard from "./AdminDashboard";
import { useAuth } from "../../context/auth";

jest.mock("../../components/AdminMenu", () => {
  return function MockAdminMenu() {
    return <div data-testid="admin-menu">Admin Menu</div>;
  };
});

jest.mock("../../components/Layout", () => {
  return function MockLayout({ children }) {
    return <div data-testid="layout">{children}</div>;
  };
});

jest.mock("../../context/auth", () => ({
  useAuth: jest.fn(),
}));

describe("AdminDashboard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders with admin user data", () => {
    useAuth.mockReturnValue([
      {
        user: {
          name: "Test Admin",
          email: "admin@test.com",
          phone: "1234567890",
        },
        token: "test-token",
      },
    ]);

    render(<AdminDashboard />);

    expect(screen.getByTestId("layout")).toBeInTheDocument();
    expect(screen.getByTestId("admin-menu")).toBeInTheDocument();
    expect(screen.getByText(/Admin Name : Test Admin/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Admin Email : admin@test.com/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Admin Contact : 1234567890/i)).toBeInTheDocument();
  });

  it("renders without user data", () => {
    useAuth.mockReturnValue([{ user: null, token: null }]);

    render(<AdminDashboard />);

    expect(screen.getByTestId("layout")).toBeInTheDocument();
    expect(screen.getByTestId("admin-menu")).toBeInTheDocument();
  });
});
