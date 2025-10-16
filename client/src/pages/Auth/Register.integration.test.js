import React from "react";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axios from "axios";
import { Route } from "react-router-dom";
import { renderTopDown } from "../../test-utils/renderTopDown";
import { cleanupAuth } from "../../test-utils/renderWithProviders";
import PublicRoute from "../../components/Routes/Public";
import Register from "./Register";
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

const Home = () => <div>Home Page</div>;

const validRegistration = {
  name: "Test User",
  email: "test@example.com",
  password: "password123",
  phone: "1234567890",
  address: "123 Test St",
  DOB: "1995-05-05",
  answer: "test answer",
};

const renderRegisterRoutes = (options) =>
  renderTopDown(
    <>
      <Route path="/" element={<Home />} />
      <Route element={<PublicRoute />}>
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
      </Route>
    </>,
    options
  );

const createUser = () =>
  typeof userEvent.setup === "function" ? userEvent.setup() : userEvent;

describe("Register Integration (top-down)", () => {
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

  const fillForm = async (user, overrides = {}) => {
    const data = { ...validRegistration, ...overrides };
    await user.type(screen.getByPlaceholderText(/enter your name/i), data.name);
    await user.type(
      screen.getByPlaceholderText(/enter your email/i),
      data.email
    );
    await user.type(
      screen.getByPlaceholderText(/enter your password/i),
      data.password
    );
    await user.type(
      screen.getByPlaceholderText(/enter your phone/i),
      data.phone
    );
    await user.type(
      screen.getByPlaceholderText(/enter your address/i),
      data.address
    );
    await user.type(screen.getByPlaceholderText(/enter your dob/i), data.DOB);
    await user.type(
      screen.getByPlaceholderText(/what is your favorite sport/i),
      data.answer
    );
  };

  it("registers a new user and navigates to login", async () => {
    axios.post.mockResolvedValueOnce({
      data: { success: true, message: "User Register Successfully" },
    });

    renderRegisterRoutes({
      initialAuthState: { user: null, token: "" },
      route: "/register",
    });

    const user = createUser();

    const submitButton = screen.getByRole("button", { name: /register/i });
    await fillForm(user);
    await user.click(submitButton);

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith("/api/v1/auth/register", {
        name: validRegistration.name,
        email: validRegistration.email,
        password: validRegistration.password,
        phone: validRegistration.phone,
        address: validRegistration.address,
        DOB: validRegistration.DOB,
        answer: validRegistration.answer,
      });
    });

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /login form/i })
      ).toBeInTheDocument();
    });
    expect(toast.success).toHaveBeenCalledWith(
      "Register successful, please login"
    );
  });

  it("shows backend error message when registration fails", async () => {
    axios.post.mockRejectedValueOnce({
      response: { data: { message: "Email already registered" } },
    });

    renderRegisterRoutes({
      initialAuthState: { user: null, token: "" },
      route: "/register",
    });

    const user = createUser();

    const submitButton = screen.getByRole("button", { name: /register/i });
    await fillForm(user);
    await user.click(submitButton);

    expect(toast.error).toHaveBeenCalledWith("Something went wrong");
  });

  it("surfaces backend validation errors when API returns failure", async () => {
    axios.post.mockResolvedValueOnce({
      data: { success: false, message: "Already existing user please login" },
    });

    renderRegisterRoutes({
      initialAuthState: { user: null, token: "" },
      route: "/register",
    });

    const user = createUser();

    const submitButton = screen.getByRole("button", { name: /register/i });
    await fillForm(user);
    await user.click(submitButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Already existing user please login"
      );
    });
  });
});
