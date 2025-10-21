import React from "react";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route } from "react-router-dom";
import { renderTopDown } from "../test-utils/renderTopDown";
import { cleanupAuth } from "../test-utils/renderWithProviders";
import UserMenu from "./UserMenu";

// ==================== MOCKING STRATEGY ====================
// Mock ONLY useCategory hook (UserMenu has no API calls)
jest.mock("../hooks/useCategory", () => ({
  __esModule: true,
  default: jest.fn(() => []),
}));

// ==================== MOCK PAGES FOR ROUTING ====================
const UserProfilePage = () => <div>User Profile Page</div>;
const UserOrdersPage = () => <div>User Orders Page</div>;
const UserDashboardPage = () => (
  <div>
    <h1>User Dashboard</h1>
    <UserMenu />
  </div>
);

// ==================== RENDER HELPER ====================
// Use renderTopDown with REAL providers and routing
const renderUserMenuRoutes = (options) =>
  renderTopDown(
    <>
      <Route path="/dashboard/user" element={<UserDashboardPage />} />
      <Route path="/dashboard/user/profile" element={<UserProfilePage />} />
      <Route path="/dashboard/user/orders" element={<UserOrdersPage />} />
    </>,
    options
  );

const createUser = () =>
  typeof userEvent.setup === "function" ? userEvent.setup() : userEvent;

// ==================== INTEGRATION TESTS ====================
describe("UserMenu Integration (top-down)", () => {
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

  // ==================== TEST 1: RENDER MENU ====================
  it("renders menu with all navigation links", () => {
    // Arrange & Act: Render UserMenu as authenticated user
    renderUserMenuRoutes({
      initialAuthState: {
        user: { name: "Test User", email: "test@example.com" },
        token: "test-token",
      },
      route: "/dashboard/user",
    });

    // Assert: Menu displays all navigation elements
    expect(screen.getByText("User Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Profile")).toBeInTheDocument();
    expect(screen.getByText("Orders")).toBeInTheDocument();
  });

  // ==================== TEST 2: NAVIGATE TO PROFILE ====================
  it("navigates to profile page when profile link is clicked", async () => {
    // Arrange: Render UserMenu with routing
    renderUserMenuRoutes({
      initialAuthState: {
        user: { name: "Test User", email: "test@example.com" },
        token: "test-token",
      },
      route: "/dashboard/user",
    });

    const user = createUser();

    // Act: User clicks "Profile" link
    const profileLink = screen.getByText("Profile");
    await user.click(profileLink);

    // Assert: User navigates to profile page
    await waitFor(() => {
      expect(screen.getByText("User Profile Page")).toBeInTheDocument();
    });
  });

  // ==================== TEST 3: NAVIGATE TO ORDERS ====================
  it("navigates to orders page when orders link is clicked", async () => {
    // Arrange: Render UserMenu with routing
    renderUserMenuRoutes({
      initialAuthState: {
        user: { name: "Test User", email: "test@example.com" },
        token: "test-token",
      },
      route: "/dashboard/user",
    });

    const user = createUser();

    // Act: User clicks "Orders" link
    const ordersLink = screen.getByText("Orders");
    await user.click(ordersLink);

    // Assert: User navigates to orders page
    await waitFor(() => {
      expect(screen.getByText("User Orders Page")).toBeInTheDocument();
    });
  });
});
