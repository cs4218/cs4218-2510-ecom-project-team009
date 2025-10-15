import React from "react";
import { screen, waitFor } from "@testing-library/react";
import { Route } from "react-router-dom";
import axios from "axios";
import { cleanupAuth } from "../../test-utils/renderWithProviders";
import { renderTopDown } from "../../test-utils/renderTopDown";
import PublicRoute from "./Public";
import Login from "../../pages/Auth/Login";
import Register from "../../pages/Auth/Register";
import ForgotPassword from "../../pages/Auth/ForgotPassword";

jest.mock("axios");
jest.mock("../../hooks/useCategory", () => ({
  __esModule: true,
  default: jest.fn(() => []),
}));

const Home = () => <div>Home Page</div>;

const renderPublicRoutes = (options) =>
  renderTopDown(
    <>
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
      </Route>
      <Route path="/" element={<Home />} />
    </>,
    options
  );

describe("PublicRoute Integration (guard behaviour)", () => {
  const authenticatedState = {
    user: {
      _id: "user123",
      name: "Regular User",
      email: "user@example.com",
      role: 0,
    },
    token: "user-token",
  };

  beforeEach(() => {
    cleanupAuth();
    localStorage.clear();
    axios.get.mockResolvedValue({ data: { category: [] } });
  });

  afterEach(() => {
    cleanupAuth();
    localStorage.clear();
    jest.clearAllMocks();
  });

  it("redirects authenticated users away from public pages", async () => {
    renderPublicRoutes({
      initialAuthState: authenticatedState,
      route: "/login",
    });

    await waitFor(() => {
      expect(screen.getByText("Home Page")).toBeInTheDocument();
    });
    expect(
      screen.queryByRole("heading", { name: /login form/i })
    ).not.toBeInTheDocument();
  });

  it("allows anonymous users to access public pages", async () => {
    renderPublicRoutes({
      initialAuthState: { user: null, token: "" },
      route: "/login",
    });

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /login form/i })
      ).toBeInTheDocument();
    });
  });
});
