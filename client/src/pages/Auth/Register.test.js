import React from "react";
import { render, fireEvent, waitFor, screen } from "@testing-library/react";
import axios from "axios";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import "@testing-library/jest-dom/extend-expect";
import toast from "react-hot-toast";
import Register from "./Register";

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

const renderRegister = () => {
  return render(
    <MemoryRouter initialEntries={["/register"]}>
      <Routes>
        <Route path="/register" element={<Register />} />
      </Routes>
    </MemoryRouter>
  );
};

const fillValidForm = () => {
  fireEvent.change(screen.getByPlaceholderText("Enter your name"), {
    target: { value: "Jm Sandiego" },
  });
  fireEvent.change(screen.getByPlaceholderText("Enter your email"), {
    target: { value: "jmsandiego@example.com" },
  });
  fireEvent.change(screen.getByPlaceholderText("Enter your password"), {
    target: { value: "password123" },
  });
  fireEvent.change(screen.getByPlaceholderText("Enter your phone"), {
    target: { value: "1234567890" },
  });
  fireEvent.change(screen.getByPlaceholderText("Enter your address"), {
    target: { value: "123 Main Street" },
  });
  fireEvent.change(screen.getByPlaceholderText("Enter your DOB"), {
    target: { value: "2000-01-01" },
  });
  fireEvent.change(screen.getByPlaceholderText("What is your favorite sport"), {
    target: { value: "Football" },
  });
};

describe("Register Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockReset();
    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    console.log.mockRestore();
  });

  describe("Rendering", () => {
    it("renders register form with all elements", () => {
      renderRegister();

      expect(screen.getByText("REGISTER FORM")).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText("Enter your name")
      ).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText("Enter your email")
      ).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText("Enter your password")
      ).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText("Enter your phone")
      ).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText("Enter your address")
      ).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Enter your DOB")).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText("What is your favorite sport")
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /register/i })
      ).toBeInTheDocument();
    });

    it("inputs should be initially empty", () => {
      renderRegister();

      expect(screen.getByPlaceholderText("Enter your name").value).toBe("");
      expect(screen.getByPlaceholderText("Enter your email").value).toBe("");
      expect(screen.getByPlaceholderText("Enter your password").value).toBe("");
      expect(screen.getByPlaceholderText("Enter your phone").value).toBe("");
      expect(screen.getByPlaceholderText("Enter your address").value).toBe("");
      expect(screen.getByPlaceholderText("Enter your DOB").value).toBe("");
      expect(
        screen.getByPlaceholderText("What is your favorite sport").value
      ).toBe("");
    });
  });

  describe("User Input", () => {
    it("should allow typing in all input fields", () => {
      renderRegister();

      fireEvent.change(screen.getByPlaceholderText("Enter your name"), {
        target: { value: "John Doe" },
      });
      fireEvent.change(screen.getByPlaceholderText("Enter your email"), {
        target: { value: "john@example.com" },
      });
      fireEvent.change(screen.getByPlaceholderText("Enter your password"), {
        target: { value: "password123" },
      });
      fireEvent.change(screen.getByPlaceholderText("Enter your phone"), {
        target: { value: "1234567890" },
      });
      fireEvent.change(screen.getByPlaceholderText("Enter your address"), {
        target: { value: "123 Main St" },
      });
      fireEvent.change(screen.getByPlaceholderText("Enter your DOB"), {
        target: { value: "2000-01-01" },
      });
      fireEvent.change(
        screen.getByPlaceholderText("What is your favorite sport"),
        {
          target: { value: "Soccer" },
        }
      );

      expect(screen.getByPlaceholderText("Enter your name").value).toBe(
        "John Doe"
      );
      expect(screen.getByPlaceholderText("Enter your email").value).toBe(
        "john@example.com"
      );
      expect(screen.getByPlaceholderText("Enter your password").value).toBe(
        "password123"
      );
      expect(screen.getByPlaceholderText("Enter your phone").value).toBe(
        "1234567890"
      );
      expect(screen.getByPlaceholderText("Enter your address").value).toBe(
        "123 Main St"
      );
      expect(screen.getByPlaceholderText("Enter your DOB").value).toBe(
        "2000-01-01"
      );
      expect(
        screen.getByPlaceholderText("What is your favorite sport").value
      ).toBe("Soccer");
    });
  });

  describe("Successful Registration", () => {
    it("registers user and navigates to login on success", async () => {
      axios.post.mockResolvedValueOnce({ data: { success: true } });

      renderRegister();
      fillValidForm();
      fireEvent.click(screen.getByRole("button", { name: /register/i }));

      await waitFor(() =>
        expect(axios.post).toHaveBeenCalledWith(
          "/api/v1/auth/register",
          expect.objectContaining({
            email: "jmsandiego@example.com",
            name: "Jm Sandiego",
          })
        )
      );
      expect(toast.success).toHaveBeenCalledWith(
        "Register successful, please login"
      );
      expect(mockNavigate).toHaveBeenCalledWith("/login");
    });
  });

  describe("API Error Handling", () => {
    it("shows API error message when registration fails", async () => {
      axios.post.mockResolvedValueOnce({
        data: { success: false, message: "User already exists" },
      });

      renderRegister();
      fillValidForm();
      fireEvent.click(screen.getByRole("button", { name: /register/i }));

      await waitFor(() => expect(axios.post).toHaveBeenCalled());
      expect(toast.error).toHaveBeenCalledWith("User already exists");
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it("handles request errors gracefully", async () => {
      axios.post.mockRejectedValueOnce(new Error("Network error"));

      renderRegister();
      fillValidForm();
      fireEvent.click(screen.getByRole("button", { name: /register/i }));

      await waitFor(() => expect(axios.post).toHaveBeenCalled());
      expect(toast.error).toHaveBeenCalledWith("Something went wrong");
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe("Name Validation", () => {
    it("shows error when name is empty", async () => {
      renderRegister();

      const submitButton = screen.getByRole("button", { name: /register/i });
      // eslint-disable-next-line testing-library/no-node-access
      submitButton.closest("form").noValidate = true;

      fireEvent.click(submitButton);

      await screen.findByText("Name is required");
      expect(axios.post).not.toHaveBeenCalled();
    });

    it("shows error when name is less than 2 characters", async () => {
      renderRegister();

      fillValidForm();

      fireEvent.change(screen.getByPlaceholderText("Enter your name"), {
        target: { value: "A" },
      });

      fireEvent.click(screen.getByRole("button", { name: /register/i }));

      await screen.findByText("Name must be at least 2 characters");

      expect(axios.post).not.toHaveBeenCalled();
    });
  });

  describe("Email Validation", () => {
    it("shows error when email is invalid", async () => {
      renderRegister();

      fillValidForm();
      fireEvent.change(screen.getByPlaceholderText("Enter your email"), {
        target: { value: "invalid-email" },
      });

      const submitButton = screen.getByRole("button", { name: /register/i });
      // eslint-disable-next-line testing-library/no-node-access
      submitButton.closest("form").noValidate = true;
      fireEvent.click(submitButton);

      await screen.findByText("Enter a valid email address");
      expect(axios.post).not.toHaveBeenCalled();
    });

    it("shows error when email is missing @ symbol", async () => {
      renderRegister();

      fillValidForm();

      fireEvent.change(screen.getByPlaceholderText("Enter your email"), {
        target: { value: "testexample.com" },
      });

      const submitButton = screen.getByRole("button", { name: /register/i });
      // eslint-disable-next-line testing-library/no-node-access
      submitButton.closest("form").noValidate = true;
      fireEvent.click(submitButton);

      await screen.findByText("Enter a valid email address");
      expect(axios.post).not.toHaveBeenCalled();
    });
  });

  describe("Password Validation", () => {
    it("shows error when password is less than 8 characters", async () => {
      renderRegister();

      fillValidForm();

      fireEvent.change(screen.getByPlaceholderText("Enter your password"), {
        target: { value: "pass" },
      });
      fireEvent.click(screen.getByRole("button", { name: /register/i }));

      await screen.findByText("Password must be at least 8 characters");
      expect(axios.post).not.toHaveBeenCalled();
    });
  });

  describe("Phone Validation", () => {
    it("shows error when phone has less than 10 digits", async () => {
      renderRegister();

      fillValidForm();

      fireEvent.change(screen.getByPlaceholderText("Enter your phone"), {
        target: { value: "123" },
      });
      fireEvent.click(screen.getByRole("button", { name: /register/i }));

      await screen.findByText("Enter a valid phone number (10-15 digits)");
      expect(axios.post).not.toHaveBeenCalled();
    });

    it("accepts phone with formatting characters", async () => {
      axios.post.mockResolvedValueOnce({ data: { success: true } });

      renderRegister();
      fillValidForm();

      fireEvent.change(screen.getByPlaceholderText("Enter your phone"), {
        target: { value: "(123) 456-7890" },
      });
      fireEvent.click(screen.getByRole("button", { name: /register/i }));

      await waitFor(() => expect(axios.post).toHaveBeenCalled());
    });
  });

  describe("Address Validation", () => {
    it("shows error when address is empty", async () => {
      renderRegister();
      fillValidForm();

      const submitButton = screen.getByRole("button", { name: /register/i });
      // eslint-disable-next-line testing-library/no-node-access
      submitButton.closest("form").noValidate = true;

      fireEvent.change(screen.getByPlaceholderText("Enter your address"), {
        target: { value: "" },
      });

      fireEvent.click(submitButton);

      await screen.findByText("Address is required");
      expect(axios.post).not.toHaveBeenCalled();
    });

    it("shows error when address is less than 5 characters", async () => {
      renderRegister();

      fillValidForm();

      fireEvent.change(screen.getByPlaceholderText("Enter your address"), {
        target: { value: "abc" },
      });

      fireEvent.click(screen.getByRole("button", { name: /register/i }));

      await screen.findByText("Address must be at least 5 characters");
      expect(axios.post).not.toHaveBeenCalled();
    });
  });

  describe("Date of Birth Validation", () => {
    it("shows error when DOB is empty", async () => {
      renderRegister();

      fillValidForm();
      fireEvent.change(screen.getByPlaceholderText("Enter your DOB"), {
        target: { value: "" },
      });

      const submitButton = screen.getByRole("button", { name: /register/i });
      // eslint-disable-next-line testing-library/no-node-access
      submitButton.closest("form").noValidate = true;
      fireEvent.click(submitButton);

      await screen.findByText("Date of birth is required");
      expect(axios.post).not.toHaveBeenCalled();
    });

    it("shows error when DOB is in the future", async () => {
      renderRegister();

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const futureDate = tomorrow.toISOString().slice(0, 10);

      fillValidForm();
      fireEvent.change(screen.getByPlaceholderText("Enter your DOB"), {
        target: { value: futureDate },
      });
      fireEvent.click(screen.getByRole("button", { name: /register/i }));

      await screen.findByText("Date of birth cannot be in the future");
      expect(axios.post).not.toHaveBeenCalled();
    });
  });

  describe("Security Answer Validation", () => {
    it("shows error when answer is empty", async () => {
      renderRegister();

      fillValidForm();
      fireEvent.change(
        screen.getByPlaceholderText("What is your favorite sport"),
        { target: { value: "" } }
      );

      const submitButton = screen.getByRole("button", { name: /register/i });
      // eslint-disable-next-line testing-library/no-node-access
      submitButton.closest("form").noValidate = true;
      fireEvent.click(submitButton);

      await screen.findByText("Security answer is required");
      expect(axios.post).not.toHaveBeenCalled();
    });

    it("shows error when answer is less than 3 characters", async () => {
      renderRegister();

      fillValidForm();
      fireEvent.change(
        screen.getByPlaceholderText("What is your favorite sport"),
        { target: { value: "ab" } }
      );
      fireEvent.click(screen.getByRole("button", { name: /register/i }));

      await screen.findByText("Security answer must be at least 3 characters");
      expect(axios.post).not.toHaveBeenCalled();
    });
  });

  describe("Error Clearing", () => {
    it("clears error when user starts typing in name field", async () => {
      renderRegister();

      const submitButton = screen.getByRole("button", { name: /register/i });
      // eslint-disable-next-line testing-library/no-node-access
      submitButton.closest("form").noValidate = true;
      fireEvent.click(submitButton);

      await screen.findByText("Name is required");

      fireEvent.change(screen.getByPlaceholderText("Enter your name"), {
        target: { value: "J" },
      });

      expect(screen.queryByText("Name is required")).not.toBeInTheDocument();
    });
  });
});
