import React from "react";
import { screen, waitFor } from "@testing-library/react";
import axios from "axios";
import { Route } from "react-router-dom";
import { act } from "react-dom/test-utils";
import { renderTopDown } from "../../test-utils/renderTopDown";
import { cleanupAuth } from "../../test-utils/renderWithProviders";
import AdminRoute from "../../components/Routes/AdminRoute";
import AdminDashboard from "./AdminDashboard";

jest.mock("axios");
jest.mock("../../hooks/useCategory", () => ({
  __esModule: true,
  default: jest.fn(() => []),
}));

const renderAdminRoutes = (options) =>
  renderTopDown(
    <>
      <Route path="/dashboard" element={<AdminRoute />}>
        <Route path="admin" element={<AdminDashboard />} />
      </Route>
    </>,
    options
  );

describe("Admin Dashboard Integration (top-down)", () => {
  const adminState = {
    user: {
      _id: "admin123",
      name: "Admin User",
      email: "admin@example.com",
      phone: "9876543210",
      role: 1,
    },
    token: "admin-token",
  };

  const userState = {
    user: {
      _id: "user123",
      name: "Regular User",
      email: "user@example.com",
      role: 0,
    },
    token: "user-token",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    cleanupAuth();
    localStorage.clear();
    axios.get.mockResolvedValue({ data: { category: [] } });
  });

  afterEach(() => {
    cleanupAuth();
    localStorage.clear();
    jest.clearAllMocks();
  });

  it("renders admin dashboard content when auth succeeds", async () => {
    axios.get.mockImplementation((url) => {
      if (url === "/api/v1/auth/admin-auth") {
        return Promise.resolve({ data: { ok: true } });
      }
      return Promise.resolve({ data: { category: [] } });
    });

    renderAdminRoutes({
      initialAuthState: adminState,
      route: "/dashboard/admin",
    });

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/admin-auth");
    });

    await waitFor(() => {
      expect(screen.getByText(/admin panel/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Admin Name : Admin User/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Admin Email : admin@example.com/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Admin Contact : 9876543210/i)).toBeInTheDocument();

    expect(
      screen.getByRole("link", { name: /create category/i })
    ).toHaveAttribute("href", "/dashboard/admin/create-category");

    expect(screen.getByRole("link", { name: /users/i })).toHaveAttribute(
      "href",
      "/dashboard/admin/users"
    );
  });

  it("shows spinner when auth check fails for non-admin", async () => {
    jest.useFakeTimers();
    axios.get.mockImplementation((url) => {
      if (url === "/api/v1/auth/admin-auth") {
        return Promise.resolve({ data: { ok: false } });
      }
      return Promise.resolve({ data: { category: [] } });
    });

    renderAdminRoutes({
      initialAuthState: userState,
      route: "/dashboard/admin",
    });

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/admin-auth");
    });

    expect(screen.getByText(/redirecting to you in/i)).toBeInTheDocument();
    expect(screen.queryByText(/Admin Panel/)).not.toBeInTheDocument();
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it("does not call admin auth when no token is present", () => {
    jest.useFakeTimers();
    renderAdminRoutes({
      initialAuthState: { user: null, token: "" },
      route: "/dashboard/admin",
    });

    expect(axios.get).not.toHaveBeenCalled();
    expect(screen.getByText(/redirecting to you in/i)).toBeInTheDocument();
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });
});
