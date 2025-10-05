import React from "react";
import { render, fireEvent, waitFor, screen } from "@testing-library/react";
import axios from "axios";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import "@testing-library/jest-dom/extend-expect";
import toast from "react-hot-toast";
import ForgotPassword from "./ForgotPassword";

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

window.matchMedia =
  window.matchMedia ||
  function () {
    return {
      matches: false,
      addListener: function () {},
      removeListener: function () {},
    };
  };

const renderForgotPassword = () => {
  return render(
    <MemoryRouter initialEntries={["/forgot-password"]}>
      <Routes>
        <Route path="/forgot-password" element={<ForgotPassword />} />
      </Routes>
    </MemoryRouter>
  );
};

const fillValidForm = () => {
  fireEvent.change(screen.getByPlaceholderText(/Enter Your Email/i), {
    target: { value: "test@example.com" },
  });
  fireEvent.change(screen.getByPlaceholderText("Enter your answer"), {
    target: { value: "answer123" },
  });
  fireEvent.change(screen.getByPlaceholderText("Enter your new password"), {
    target: { value: "newpassword123" },
  });
};

describe("Forgot Password Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockReset();
    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    console.log.mockRestore();
  });

  describe("Rendering", () => {
    it("renders forgot password form with all elements", () => {
      renderForgotPassword();

      expect(screen.getByText("FORGOT PASSWORD")).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText(/Enter your email/i)
      ).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText("Enter your answer")
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /reset password/i })
      ).toBeInTheDocument();
    });

    it("inputs should be initially empty", () => {
      renderForgotPassword();

      expect(screen.getByPlaceholderText(/Enter your email/i).value).toBe("");
      expect(screen.getByPlaceholderText("Enter your answer").value).toBe("");
      expect(screen.getByPlaceholderText("Enter your new password").value).toBe(
        ""
      );
    });
  });

  describe("User Input", () => {
    it("should allow typing email, answer and new password", () => {
      renderForgotPassword();

      fireEvent.change(screen.getByPlaceholderText(/Enter your email/i), {
        target: { value: "test@example.com" },
      });
      fireEvent.change(screen.getByPlaceholderText("Enter your answer"), {
        target: { value: "answer123" },
      });
      fireEvent.change(screen.getByPlaceholderText("Enter your new password"), {
        target: { value: "newpassword123" },
      });

      expect(screen.getByPlaceholderText(/Enter your email/i).value).toBe(
        "test@example.com"
      );
      expect(screen.getByPlaceholderText("Enter your answer").value).toBe(
        "answer123"
      );
      expect(screen.getByPlaceholderText("Enter your new password").value).toBe(
        "newpassword123"
      );
    });
  });

  describe("Successful Forgot Password", () => {
    it("resets password and navigates to login on success", async () => {
      axios.post.mockResolvedValueOnce({
        data: {
          success: true,
          message: "Password reset successfully",
        },
      });

      renderForgotPassword();
      fillValidForm();
      fireEvent.click(screen.getByRole("button", { name: /reset password/i }));

      await waitFor(() =>
        expect(axios.post).toHaveBeenCalledWith(
          "/api/v1/auth/forgot-password",
          {
            email: "test@example.com",
            answer: "answer123",
            newPassword: "newpassword123",
          }
        )
      );
      expect(toast.success).toHaveBeenCalledWith("Password reset successfully");
      expect(mockNavigate).toHaveBeenCalledWith("/login");
    });
  });

  describe("API Error Handling", () => {
    it("shows API error message when password reset fails", async () => {
      axios.post.mockResolvedValueOnce({
        data: { success: false, message: "Api success false message" },
      });

      renderForgotPassword();
      fillValidForm();
      fireEvent.click(screen.getByRole("button", { name: /reset password/i }));

      await waitFor(() => expect(axios.post).toHaveBeenCalled());
      expect(toast.error).toHaveBeenCalledWith("Api success false message");
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it("handles network errors gracefully", async () => {
      axios.post.mockRejectedValueOnce(new Error("Network error"));

      renderForgotPassword();
      fillValidForm();
      fireEvent.click(screen.getByRole("button", { name: /reset password/i }));

      await waitFor(() => expect(axios.post).toHaveBeenCalled());
      expect(toast.error).toHaveBeenCalledWith("Network error");
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it("handles api error message when password reset fails", async () => {
      axios.post.mockRejectedValueOnce(new Error("Invalid email or answer"));

      renderForgotPassword();
      fillValidForm();
      fireEvent.click(screen.getByRole("button", { name: /reset password/i }));

      await waitFor(() => expect(axios.post).toHaveBeenCalled());
      expect(toast.error).toHaveBeenCalledWith("Invalid email or answer");
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe("Email Validation", () => {
    it("shows error when email is empty", async () => {
      renderForgotPassword();

      const submitButton = screen.getByRole("button", {
        name: /reset password/i,
      });
      // eslint-disable-next-line testing-library/no-node-access
      submitButton.closest("form").noValidate = true;

      fireEvent.click(submitButton);

      await screen.findByText("Email is required");
      expect(axios.post).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it("shows error when email is invalid", async () => {
      renderForgotPassword();
      fillValidForm();
      fireEvent.change(screen.getByPlaceholderText(/Enter your email/i), {
        target: { value: "invalid-email" },
      });

      const submitButton = screen.getByRole("button", {
        name: /reset password/i,
      });
      // eslint-disable-next-line testing-library/no-node-access
      submitButton.closest("form").noValidate = true;
      fireEvent.click(submitButton);

      await screen.findByText("Enter a valid email address");
      expect(axios.post).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it("shows error when email is missing @ symbol", async () => {
      renderForgotPassword();
      fillValidForm();
      fireEvent.change(screen.getByPlaceholderText(/Enter your email/i), {
        target: { value: "testexample.com" },
      });

      const submitButton = screen.getByRole("button", {
        name: /reset password/i,
      });
      // eslint-disable-next-line testing-library/no-node-access
      submitButton.closest("form").noValidate = true;
      fireEvent.click(submitButton);

      await screen.findByText("Enter a valid email address");
      expect(axios.post).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it("trims whitespace from email", async () => {
      renderForgotPassword();
      fillValidForm();
      fireEvent.change(screen.getByPlaceholderText(/Enter your email/i), {
        target: { value: "  " },
      });

      const submitButton = screen.getByRole("button", {
        name: /reset password/i,
      });
      // eslint-disable-next-line testing-library/no-node-access
      submitButton.closest("form").noValidate = true;
      fireEvent.click(submitButton);

      await screen.findByText("Email is required");
      expect(axios.post).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe("Answer Validation", () => {
    it("shows error when answer is empty", async () => {
      renderForgotPassword();
      fillValidForm();
      fireEvent.change(screen.getByPlaceholderText("Enter your answer"), {
        target: { value: "" },
      });
      const submitButton = screen.getByRole("button", {
        name: /reset password/i,
      });
      // eslint-disable-next-line testing-library/no-node-access
      submitButton.closest("form").noValidate = true;
      fireEvent.click(submitButton);
      await screen.findByText("Security answer is required");
      expect(axios.post).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it("shows error when answer is 2 characters (below minimum)", async () => {
      renderForgotPassword();
      fillValidForm();
      fireEvent.change(screen.getByPlaceholderText("Enter your answer"), {
        target: { value: "12" },
      });
      const submitButton = screen.getByRole("button", {
        name: /reset password/i,
      });
      // eslint-disable-next-line testing-library/no-node-access
      submitButton.closest("form").noValidate = true;
      fireEvent.click(submitButton);
      await screen.findByText("Security answer must be at least 3 characters");
      expect(axios.post).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it("accepts answer with exactly 3 characters (at minimum boundary)", async () => {
      axios.post.mockResolvedValueOnce({
        data: {
          success: true,
          message: "Password reset successfully",
        },
      });
      renderForgotPassword();
      fillValidForm();

      fireEvent.change(screen.getByPlaceholderText("Enter your answer"), {
        target: { value: "ABC" },
      });

      fireEvent.click(screen.getByRole("button", { name: /reset password/i }));

      await waitFor(() => expect(axios.post).toHaveBeenCalled());
      expect(toast.success).toHaveBeenCalledWith("Password reset successfully");
      expect(mockNavigate).toHaveBeenCalledWith("/login");
    });

    it("accepts answer with 4 characters (above minimum)", async () => {
      axios.post.mockResolvedValueOnce({
        data: {
          success: true,
          message: "Password reset successfully",
        },
      });
      renderForgotPassword();
      fillValidForm();

      fireEvent.change(screen.getByPlaceholderText("Enter your answer"), {
        target: { value: "ABCD" },
      });

      fireEvent.click(screen.getByRole("button", { name: /reset password/i }));

      await waitFor(() => expect(axios.post).toHaveBeenCalled());
      expect(toast.success).toHaveBeenCalledWith("Password reset successfully");
      expect(mockNavigate).toHaveBeenCalledWith("/login");
    });
  });

  describe("Password Validation", () => {
    it("shows error when password is empty", async () => {
      renderForgotPassword();
      fillValidForm();
      fireEvent.change(screen.getByPlaceholderText("Enter your new password"), {
        target: { value: "" },
      });
      const submitButton = screen.getByRole("button", {
        name: /reset password/i,
      });
      // eslint-disable-next-line testing-library/no-node-access
      submitButton.closest("form").noValidate = true;
      fireEvent.click(submitButton);

      await screen.findByText("New password is required");
      expect(axios.post).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it("shows error when password is 5 characters (below minimum)", async () => {
      renderForgotPassword();
      fillValidForm();
      fireEvent.change(screen.getByPlaceholderText("Enter your new password"), {
        target: { value: "12345" },
      });
      const submitButton = screen.getByRole("button", {
        name: /reset password/i,
      });
      // eslint-disable-next-line testing-library/no-node-access
      submitButton.closest("form").noValidate = true;
      fireEvent.click(submitButton);
      await screen.findByText("New password must be at least 6 characters");
      expect(axios.post).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it("accepts password with exactly 6 characters (at minimum boundary)", async () => {
      axios.post.mockResolvedValueOnce({
        data: {
          success: true,
          message: "Password reset successfully",
        },
      });
      renderForgotPassword();
      fillValidForm();

      fireEvent.change(screen.getByPlaceholderText("Enter your new password"), {
        target: { value: "Pass12" },
      });

      fireEvent.click(screen.getByRole("button", { name: /reset password/i }));

      await waitFor(() => expect(axios.post).toHaveBeenCalled());
      expect(toast.success).toHaveBeenCalledWith("Password reset successfully");
      expect(mockNavigate).toHaveBeenCalledWith("/login");
    });

    it("accepts password with 7 characters (above minimum)", async () => {
      axios.post.mockResolvedValueOnce({
        data: {
          success: true,
          message: "Password reset successfully",
        },
      });
      renderForgotPassword();
      fillValidForm();

      fireEvent.change(screen.getByPlaceholderText("Enter your new password"), {
        target: { value: "Pass123" },
      });

      fireEvent.click(screen.getByRole("button", { name: /reset password/i }));

      await waitFor(() => expect(axios.post).toHaveBeenCalled());
      expect(toast.success).toHaveBeenCalledWith("Password reset successfully");
      expect(mockNavigate).toHaveBeenCalledWith("/login");
    });
  });

  describe("Error Clearing", () => {
    it("clears email error when user starts typing", async () => {
      renderForgotPassword();

      const submitButton = screen.getByRole("button", {
        name: /reset password/i,
      });
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
      renderForgotPassword();

      fireEvent.change(screen.getByPlaceholderText(/Enter your email/i), {
        target: { value: "test@example.com" },
      });

      const submitButton = screen.getByRole("button", {
        name: /reset password/i,
      });
      // eslint-disable-next-line testing-library/no-node-access
      submitButton.closest("form").noValidate = true;
      fireEvent.click(submitButton);

      await screen.findByText("New password is required");

      fireEvent.change(screen.getByPlaceholderText("Enter your new password"), {
        target: { value: "p" },
      });

      expect(
        screen.queryByText("New password is required")
      ).not.toBeInTheDocument();
    });
  });
});
