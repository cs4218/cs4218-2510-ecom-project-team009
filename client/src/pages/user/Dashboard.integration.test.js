import React from "react";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route } from "react-router-dom";
import { renderTopDown } from "../../test-utils/renderTopDown";
import { cleanupAuth } from "../../test-utils/renderWithProviders";
import Dashboard from "./Dashboard";

// ==================== MOCKING ====================
// Mock ONLY external dependencies (useCategory hook)
jest.mock("../../hooks/useCategory", () => ({
  __esModule: true,
  default: jest.fn(() => []),
}));

// ==================== MOCK ROUTES ====================
const Profile = () => <div>User Profile Page</div>;
const Orders = () => <div>User Orders Page</div>;

// ==================== RENDER HELPER ====================
const renderDashboardRoutes = (options) =>
  renderTopDown(
    <>
      <Route path="/dashboard/user" element={<Dashboard />} />
      <Route path="/dashboard/user/profile" element={<Profile />} />
      <Route path="/dashboard/user/orders" element={<Orders />} />
    </>,
    options
  );

const createUser = () =>
  typeof userEvent.setup === "function" ? userEvent.setup() : userEvent;

// ==================== TESTS ====================
describe("Dashboard Integration (top-down)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    cleanupAuth();
    localStorage.clear();
  });

  afterEach(() => {
    cleanupAuth();
    localStorage.clear();
    jest.clearAllMocks();
  });

  // Test 1: Happy path - User dashboard displays with auth context integration
  it("displays user dashboard with data from real auth context", async () => {
    // Arrange: Mock user data in auth context
    const mockUser = {
      name: "John Doe",
      email: "john@example.com",
      address: "123 Main St, City, Country",
    };

    // Act: Render Dashboard with REAL providers (AuthProvider, Layout, UserMenu)
    renderDashboardRoutes({
      initialAuthState: { user: mockUser, token: "user-token" },
      route: "/dashboard/user",
    });

    // Assert: User data from REAL auth context is displayed
    // Name appears in both Header dropdown and Dashboard content
    await waitFor(() => {
      expect(screen.getAllByText("John Doe").length).toBeGreaterThan(0);
    });
    expect(screen.getByText("john@example.com")).toBeInTheDocument();
    expect(screen.getByText("123 Main St, City, Country")).toBeInTheDocument();

    // Assert: REAL UserMenu component renders (not mocked)
    // "Dashboard" appears in both Header dropdown and UserMenu
    expect(screen.getAllByText("Dashboard").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /profile/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /orders/i })).toBeInTheDocument();

    // Assert: REAL Layout component renders (verify Header is present)
    expect(screen.getByText("🛒 Virtual Vault")).toBeInTheDocument();
  });

  // Test 2: Handles unauthenticated user gracefully
  it("handles unauthenticated user with null auth state", async () => {
    // Arrange: No user data (unauthenticated)
    renderDashboardRoutes({
      initialAuthState: { user: null, token: "" },
      route: "/dashboard/user",
    });

    // Assert: UserMenu still renders (component structure)
    await waitFor(() => {
      expect(screen.getAllByText("Dashboard").length).toBeGreaterThan(0);
    });

    // Assert: UserMenu navigation links are present
    expect(screen.getByRole("link", { name: /profile/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /orders/i })).toBeInTheDocument();

    // Assert: No user data is displayed (gracefully handles null)
    expect(screen.queryByText("john@example.com")).not.toBeInTheDocument();
    expect(screen.queryByText("123 Main St")).not.toBeInTheDocument();
  });

  // Test 3: UserMenu navigation links work correctly (routing integration)
  it("navigates to profile page when clicking profile link", async () => {
    // Arrange: Mock user data
    const mockUser = {
      name: "Jane Smith",
      email: "jane@example.com",
      address: "456 Oak Ave",
    };

    renderDashboardRoutes({
      initialAuthState: { user: mockUser, token: "user-token" },
      route: "/dashboard/user",
    });

    const user = createUser();

    // Act: Click on Profile link in UserMenu
    const profileLink = screen.getByRole("link", { name: /profile/i });
    await user.click(profileLink);

    // Assert: Navigation to profile page works (routing integration)
    await waitFor(() => {
      expect(screen.getByText("User Profile Page")).toBeInTheDocument();
    });
  });
});
