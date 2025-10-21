import React from "react";
import { screen, waitFor } from "@testing-library/react";
import axios from "axios";
import { Route } from "react-router-dom";
import { renderTopDown } from "../../test-utils/renderTopDown";
import { cleanupAuth } from "../../test-utils/renderWithProviders";
import PrivateRoute from "./Private.js";
import toast from "react-hot-toast";

// ==================== MOCKING STRATEGY ====================
// Mock ONLY external APIs
jest.mock("axios");
jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
  Toaster: () => <div data-testid="toaster" />,
}));
jest.mock("../../hooks/useCategory", () => ({
  __esModule: true,
  default: jest.fn(() => []),
}));

// ==================== MOCK COMPONENTS ====================
const UserDashboard = () => <div>User Dashboard - Protected Content</div>;
const Login = () => <div>Login Page</div>;

// ==================== RENDER HELPER ====================
// Use renderTopDown with REAL AuthProvider and routing
const renderPrivateRoutes = (options) =>
  renderTopDown(
    <>
      <Route path="/login" element={<Login />} />
      <Route element={<PrivateRoute />}>
        <Route path="/dashboard/user" element={<UserDashboard />} />
      </Route>
    </>,
    options
  );

// ==================== TESTS ====================
describe("PrivateRoute Integration (top-down)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    cleanupAuth();
    localStorage.clear();
    toast.success = jest.fn();
    toast.error = jest.fn();
    axios.get.mockResolvedValue({ data: { category: [] } });
  });

  afterEach(() => {
    cleanupAuth();
    localStorage.clear();
    jest.clearAllMocks();
  });

  // Test 1: Happy path - Authenticated user with valid token
  it("shows protected content when user is authenticated and API returns ok: true", async () => {
    // Arrange: Mock successful auth check
    axios.get.mockResolvedValueOnce({ data: { ok: true } });

    // Act: Render with authenticated user state
    renderPrivateRoutes({
      initialAuthState: {
        user: { name: "Test User", email: "test@example.com" },
        token: "valid-token"
      },
      route: "/dashboard/user",
    });

    // Assert: Spinner shows initially while auth check is in progress
    expect(screen.getByText(/redirecting to you in \d+ second/i)).toBeInTheDocument();

    // Assert: API called with correct endpoint
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/user-auth");
    });

    // Assert: Protected content rendered after successful auth
    await waitFor(() => {
      expect(screen.getByText("User Dashboard - Protected Content")).toBeInTheDocument();
    });

    // Assert: Spinner no longer visible
    expect(screen.queryByText(/redirecting to you in \d+ second/i)).not.toBeInTheDocument();
  });

  // Test 2: No token - User not authenticated
  it("shows spinner when user has no token (no API call made)", async () => {
    // Arrange: No token provided
    renderPrivateRoutes({
      initialAuthState: { user: null, token: "" },
      route: "/dashboard/user",
    });

    // Assert: Spinner shown immediately
    expect(screen.getByText(/redirecting to you in \d+ second/i)).toBeInTheDocument();
    expect(screen.getByText("Loading...")).toBeInTheDocument();

    // Assert: Protected content NOT rendered
    expect(screen.queryByText("User Dashboard - Protected Content")).not.toBeInTheDocument();

    // Assert: No API call made (because no token)
    expect(axios.get).not.toHaveBeenCalled();
  });

  // Test 3: Auth check fails - API returns ok: false
  it("shows spinner when API returns ok: false (unauthorized)", async () => {
    // Arrange: Mock failed auth check
    axios.get.mockResolvedValueOnce({ data: { ok: false } });

    // Act: Render with token but auth check fails
    renderPrivateRoutes({
      initialAuthState: {
        user: { name: "Unauthorized User" },
        token: "invalid-token"
      },
      route: "/dashboard/user",
    });

    // Assert: API called
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/user-auth");
    });

    // Assert: Spinner still showing (access denied)
    expect(screen.getByText(/redirecting to you in \d+ second/i)).toBeInTheDocument();

    // Assert: Protected content NOT rendered
    expect(screen.queryByText("User Dashboard - Protected Content")).not.toBeInTheDocument();
  });

  // Test 4: API error - Network error during auth check
  it("shows spinner when API call fails with network error", async () => {
    // Arrange: Mock API error
    axios.get.mockRejectedValueOnce(new Error("Network error"));

    // Spy on console.log to suppress error logs
    const consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    // Act: Render with token but API fails
    renderPrivateRoutes({
      initialAuthState: {
        user: { name: "Test User" },
        token: "valid-token"
      },
      route: "/dashboard/user",
    });

    // Assert: API attempted
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/user-auth");
    });

    // Assert: Spinner shown (error caught, access denied)
    expect(screen.getByText(/redirecting to you in \d+ second/i)).toBeInTheDocument();

    // Assert: Protected content NOT rendered
    expect(screen.queryByText("User Dashboard - Protected Content")).not.toBeInTheDocument();

    // Cleanup
    consoleLogSpy.mockRestore();
  });
});
