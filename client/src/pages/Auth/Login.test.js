import React from "react";
import { render, fireEvent, waitFor, screen } from "@testing-library/react";
import axios from "axios";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import "@testing-library/jest-dom/extend-expect";
import toast from "react-hot-toast";
import Login from "./Login";

const mockNavigate = jest.fn();

jest.mock("axios");
jest.mock("react-hot-toast");

jest.mock("../../context/auth", () => ({
  useAuth: jest.fn(() => [null, jest.fn()]),
}));

jest.mock("../../context/cart", () => ({
  useCart: jest.fn(() => [null, jest.fn()]),
}));

jest.mock("../../context/search", () => ({
  useSearch: jest.fn(() => [{ keyword: "" }, jest.fn()]),
}));

jest.mock("../../hooks/useCategory", () => jest.fn(() => []));

jest.mock("react-router-dom", () => {
  const actual = jest.requireActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

Object.defineProperty(window, "localStorage", {
  value: {
    setItem: jest.fn(),
    getItem: jest.fn(),
    removeItem: jest.fn(),
  },
  writable: true,
});

window.matchMedia =
  window.matchMedia ||
  function () {
    return {
      matches: false,
      addListener: function () {},
      removeListener: function () {},
    };
  };

const renderLogin = () => {
  return render(
    <MemoryRouter initialEntries={["/login"]}>
      <Routes>
        <Route path="/login" element={<Login />} />
      </Routes>
    </MemoryRouter>
  );
};

const fillValidForm = () => {
  fireEvent.change(screen.getByPlaceholderText(/Enter Your Email/i), {
    target: { value: "test@example.com" },
  });
  fireEvent.change(screen.getByPlaceholderText("Enter your password"), {
    target: { value: "password123" },
  });
};

describe("Login Component", () => {
  beforeEach(() => {
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.clearAllMocks();
    mockNavigate.mockReset();
    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    console.log.mockRestore();
  });

  describe("Rendering", () => {
    it("renders login form with all elements", () => {
      renderLogin();

      expect(screen.getByText("LOGIN FORM")).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText(/Enter your email/i)
      ).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText("Enter your password")
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /login/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /forgot password/i })
      ).toBeInTheDocument();
    });

    it("inputs should be initially empty", () => {
      renderLogin();

      expect(screen.getByPlaceholderText(/Enter your email/i).value).toBe("");
      expect(screen.getByPlaceholderText("Enter your password").value).toBe("");
    });
  });

  describe("User Input", () => {
    it("should allow typing email and password", () => {
      renderLogin();

      fireEvent.change(screen.getByPlaceholderText(/Enter your email/i), {
        target: { value: "test@example.com" },
      });
      fireEvent.change(screen.getByPlaceholderText("Enter your password"), {
        target: { value: "password123" },
      });

      expect(screen.getByPlaceholderText(/Enter your email/i).value).toBe(
        "test@example.com"
      );
      expect(screen.getByPlaceholderText("Enter your password").value).toBe(
        "password123"
      );
    });
  });

  describe("Successful Login", () => {
    it("logs in user and navigates to home on success", async () => {
      axios.post.mockResolvedValueOnce({
        data: {
          success: true,
          message: "Login successfully",
          user: { id: 1, name: "Jm Sandiego", email: "test@example.com" },
          token: "mockToken",
        },
      });

      renderLogin();
      fillValidForm();
      fireEvent.click(screen.getByRole("button", { name: /login/i }));

      await waitFor(() =>
        expect(axios.post).toHaveBeenCalledWith("/api/v1/auth/login", {
          email: "test@example.com",
          password: "password123",
        })
      );
      expect(toast.success).toHaveBeenCalledWith("Login successfully", {
        duration: 5000,
        icon: "🙏",
        style: {
          background: "green",
          color: "white",
        },
      });
      expect(window.localStorage.setItem).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });

    it("shows default success message when no message from backend", async () => {
      axios.post.mockResolvedValueOnce({
        data: {
          success: true,
          user: { id: 1, name: "Jm Sandiego", email: "test@example.com" },
          token: "mockToken",
        },
      });

      renderLogin();
      fillValidForm();
      fireEvent.click(screen.getByRole("button", { name: /login/i }));

      await waitFor(() => expect(axios.post).toHaveBeenCalled());
      expect(toast.success).toHaveBeenCalledWith("Login successful", {
        duration: 5000,
        icon: "🙏",
        style: {
          background: "green",
          color: "white",
        },
      });
    });
  });

  describe("API Error Handling", () => {
    it("shows API error message when login fails", async () => {
      axios.post.mockResolvedValueOnce({
        data: { success: false, message: "Invalid credentials" },
      });

      renderLogin();
      fillValidForm();
      fireEvent.click(screen.getByRole("button", { name: /login/i }));

      await waitFor(() => expect(axios.post).toHaveBeenCalled());
      expect(toast.error).toHaveBeenCalledWith("Invalid credentials");
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it("handles network errors gracefully", async () => {
      axios.post.mockRejectedValueOnce(new Error("Network error"));

      renderLogin();
      fillValidForm();
      fireEvent.click(screen.getByRole("button", { name: /login/i }));

      await waitFor(() => expect(axios.post).toHaveBeenCalled());
      expect(toast.error).toHaveBeenCalledWith("Something went wrong");
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe("Email Validation", () => {
    it("shows error when email is empty", async () => {
      renderLogin();

      const submitButton = screen.getByRole("button", { name: /login/i });
      // eslint-disable-next-line testing-library/no-node-access
      submitButton.closest("form").noValidate = true;

      fireEvent.click(submitButton);

      await screen.findByText("Email is required");
      expect(axios.post).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it("shows error when email is invalid", async () => {
      renderLogin();
      fillValidForm();
      fireEvent.change(screen.getByPlaceholderText(/Enter your email/i), {
        target: { value: "invalid-email" },
      });

      const submitButton = screen.getByRole("button", { name: /login/i });
      // eslint-disable-next-line testing-library/no-node-access
      submitButton.closest("form").noValidate = true;
      fireEvent.click(submitButton);

      await screen.findByText("Enter a valid email address");
      expect(axios.post).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it("shows error when email is missing @ symbol", async () => {
      renderLogin();
      fillValidForm();
      fireEvent.change(screen.getByPlaceholderText(/Enter your email/i), {
        target: { value: "testexample.com" },
      });

      const submitButton = screen.getByRole("button", { name: /login/i });
      // eslint-disable-next-line testing-library/no-node-access
      submitButton.closest("form").noValidate = true;
      fireEvent.click(submitButton);

      await screen.findByText("Enter a valid email address");
      expect(axios.post).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it("trims whitespace from email", async () => {
      renderLogin();
      fillValidForm();
      fireEvent.change(screen.getByPlaceholderText(/Enter your email/i), {
        target: { value: "  " },
      });

      const submitButton = screen.getByRole("button", { name: /login/i });
      // eslint-disable-next-line testing-library/no-node-access
      submitButton.closest("form").noValidate = true;
      fireEvent.click(submitButton);

      await screen.findByText("Email is required");
      expect(axios.post).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe("Password Validation", () => {
    it("shows error when password is empty", async () => {
      renderLogin();
      fillValidForm();
      fireEvent.change(screen.getByPlaceholderText("Enter your password"), {
        target: { value: "" },
      });
      const submitButton = screen.getByRole("button", { name: /login/i });
      // eslint-disable-next-line testing-library/no-node-access
      submitButton.closest("form").noValidate = true;
      fireEvent.click(submitButton);

      await screen.findByText("Password is required");
      expect(axios.post).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe("Error Clearing", () => {
    it("clears email error when user starts typing", async () => {
      renderLogin();

      const submitButton = screen.getByRole("button", { name: /login/i });
      // eslint-disable-next-line testing-library/no-node-access
      submitButton.closest("form").noValidate = true;
      fireEvent.click(submitButton);

      await screen.findByText("Email is required");

      fireEvent.change(screen.getByPlaceholderText(/Enter your email/i), {
        target: { value: "t" },
      });

      expect(screen.queryByText("Email is required")).not.toBeInTheDocument();
    });

    it("clears password error when user starts typing", async () => {
      renderLogin();

      fireEvent.change(screen.getByPlaceholderText(/Enter your email/i), {
        target: { value: "test@example.com" },
      });

      const submitButton = screen.getByRole("button", { name: /login/i });
      // eslint-disable-next-line testing-library/no-node-access
      submitButton.closest("form").noValidate = true;
      fireEvent.click(submitButton);

      await screen.findByText("Password is required");

      fireEvent.change(screen.getByPlaceholderText("Enter your password"), {
        target: { value: "p" },
      });

      expect(
        screen.queryByText("Password is required")
      ).not.toBeInTheDocument();
    });
  });

  describe("Navigation", () => {
    it("navigates to forgot password page when button is clicked", () => {
      renderLogin();

      fireEvent.click(screen.getByText("Forgot Password"));

      expect(mockNavigate).toHaveBeenCalledWith("/forgot-password");
    });
  });
});
