import React from "react";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axios from "axios";
import { Route } from "react-router-dom";
import { renderTopDown } from "../../test-utils/renderTopDown";
import { cleanupAuth } from "../../test-utils/renderWithProviders";
import PublicRoute from "../../components/Routes/Public";
import ForgotPassword from "./ForgotPassword";
import Login from "./Login";
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

const renderForgotRoutes = (options) =>
  renderTopDown(
    <>
      <Route element={<PublicRoute />}>
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/login" element={<Login />} />
      </Route>
    </>,
    options
  );

const createUser = () =>
  typeof userEvent.setup === "function" ? userEvent.setup() : userEvent;

describe("ForgotPassword Integration (top-down)", () => {
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

  const fillForm = async (user) => {
    await user.type(
      screen.getByPlaceholderText(/enter your email/i),
      "test@example.com"
    );
    await user.type(
      screen.getByPlaceholderText(/enter your answer/i),
      "test answer"
    );
    await user.type(
      screen.getByPlaceholderText(/enter your new password/i),
      "newPassword123"
    );
  };

  it("resets password and navigates to login on success", async () => {
    axios.post.mockResolvedValueOnce({ data: { success: true } });

    renderForgotRoutes({
      initialAuthState: { user: null, token: "" },
      route: "/forgot-password",
    });

    const user = createUser();

    await fillForm(user);
    await user.click(screen.getByRole("button", { name: /reset password/i }));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith("/api/v1/auth/forgot-password", {
        email: "test@example.com",
        answer: "test answer",
        newPassword: "newPassword123",
      });
    });

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /login form/i })
      ).toBeInTheDocument();
    });
    expect(toast.success).toHaveBeenCalledWith("Password reset successfully");
  });

  it("shows error toast when reset fails", async () => {
    axios.post.mockRejectedValueOnce(new Error("Network Error"));

    renderForgotRoutes({
      initialAuthState: { user: null, token: "" },
      route: "/forgot-password",
    });

    const user = createUser();

    await fillForm(user);
    await user.click(screen.getByRole("button", { name: /reset password/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Network Error");
    });
  });

  it("surfaces backend validation errors", async () => {
    axios.post.mockResolvedValueOnce({
      data: { success: false, message: "Wrong email or answer" },
    });

    renderForgotRoutes({
      initialAuthState: { user: null, token: "" },
      route: "/forgot-password",
    });

    const user = createUser();

    await fillForm(user);
    await user.click(screen.getByRole("button", { name: /reset password/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Wrong email or answer");
    });
  });
});
