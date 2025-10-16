import React from "react";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axios from "axios";
import { Route } from "react-router-dom";
import { renderTopDown } from "../../test-utils/renderTopDown";
import { cleanupAuth } from "../../test-utils/renderWithProviders";
import PublicRoute from "../../components/Routes/Public";
import Login from "./Login";
import ForgotPassword from "./ForgotPassword";
import toast from "react-hot-toast";

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

const Home = () => <div>Home Page</div>;

const renderLoginRoutes = (options) =>
  renderTopDown(
    <>
      <Route path="/" element={<Home />} />
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
      </Route>
    </>,
    options
  );

const createUser = () =>
  typeof userEvent.setup === "function" ? userEvent.setup() : userEvent;

describe("Login Integration (top-down)", () => {
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

  it("signs in successfully and redirects home", async () => {
    const mockResponse = {
      data: {
        success: true,
        message: "Login successfully",
        token: "mock-jwt-token-12345",
        user: {
          _id: "user123",
          name: "Test User",
          email: "test@example.com",
          role: 0,
        },
      },
    };
    axios.post.mockResolvedValueOnce(mockResponse);

    renderLoginRoutes({
      initialAuthState: { user: null, token: "" },
      route: "/login",
    });

    const user = createUser();

    const submitButton = screen.getByRole("button", { name: /login/i });

    await user.type(
      screen.getByPlaceholderText(/enter your email/i),
      "test@example.com"
    );
    await user.type(
      screen.getByPlaceholderText(/enter your password/i),
      "password123"
    );

    await user.click(submitButton);

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith("/api/v1/auth/login", {
        email: "test@example.com",
        password: "password123",
      });
    });

    await waitFor(() => {
      expect(screen.getByText("Home Page")).toBeInTheDocument();
    });

    const savedAuth = JSON.parse(localStorage.getItem("auth"));
    expect(savedAuth).toEqual(mockResponse.data);
    expect(toast.success).toHaveBeenCalledWith(
      "Login successfully",
      expect.any(Object)
    );
  });

  it("shows backend error without mutating auth state", async () => {
    const mockError = {
      response: {
        data: {
          success: false,
          message: "Invalid Password",
        },
      },
    };
    axios.post.mockRejectedValueOnce(mockError);

    renderLoginRoutes({
      initialAuthState: { user: null, token: "" },
      route: "/login",
    });

    const user = createUser();

    const submitButton = screen.getByRole("button", { name: /login/i });

    await user.type(
      screen.getByPlaceholderText(/enter your email/i),
      "test@example.com"
    );
    await user.type(
      screen.getByPlaceholderText(/enter your password/i),
      "wrongpass"
    );

    await user.click(submitButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Invalid Password");
    });
    expect(localStorage.getItem("auth")).toBeNull();
  });

  it("handles backend rejection when credentials are wrong", async () => {
    axios.post.mockResolvedValueOnce({
      data: { success: false, message: "Invalid credentials" },
    });

    renderLoginRoutes({
      initialAuthState: { user: null, token: "" },
      route: "/login",
    });

    const user = createUser();

    const submitButton = screen.getByRole("button", { name: /login/i });

    await user.type(
      screen.getByPlaceholderText(/enter your email/i),
      "test@example.com"
    );
    await user.type(
      screen.getByPlaceholderText(/enter your password/i),
      "password123"
    );

    await user.click(submitButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Invalid credentials");
    });
  });

  it("navigates to forgot password view when button clicked", async () => {
    renderLoginRoutes({
      initialAuthState: { user: null, token: "" },
      route: "/login",
    });

    const user = createUser();

    await user.click(screen.getByRole("button", { name: /forgot password/i }));

    expect(
      await screen.findByRole("heading", { name: /forgot password/i })
    ).toBeInTheDocument();
  });
});
