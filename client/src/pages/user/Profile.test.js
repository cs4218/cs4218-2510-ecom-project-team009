import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react";
import Profile from "./Profile";
import axios from 'axios';
import toast from "react-hot-toast";
import { MemoryRouter } from "react-router-dom";
import { setAuth } from "../../context/auth";

// Mock dependencies
jest.mock("axios");
jest.mock("react-hot-toast");
jest.mock("../../components/UserMenu", () => () => <div>UserMenu</div>);
jest.mock("./../../components/Layout", () => ({ children }) => <div>{children}</div>);

const mockUser = {
  name: "Test User",
  email: "test@example.com",
  phone: "1234567890",
  address: "123 Test St",
};

jest.mock("../../context/auth", () => {
  const setAuth = jest.fn();
  return {
    useAuth: () => [
      { user: mockUser },
      setAuth,
    ],
    __esModule: true,
    setAuth,
  };
});

const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value;
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();
Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

describe("Profile Page", () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.clearAllMocks();
    localStorageMock.getItem.mockImplementation(() =>
      JSON.stringify({ user: mockUser })
    );
  });

  it("renders profile form with user data", () => {
    const { getByPlaceholderText, getByText } = render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>
    );
    expect(getByText("USER PROFILE")).toBeInTheDocument();
    expect(getByPlaceholderText("Enter Your Name").value).toBe("Test User");
    expect(getByPlaceholderText("Enter Your Email").value).toBe("test@example.com");
    expect(getByPlaceholderText("Enter Your Email")).toBeDisabled();
    expect(getByPlaceholderText("Enter Your Phone").value).toBe("1234567890");
    expect(getByPlaceholderText("Enter Your Address").value).toBe("123 Test St");
  });

  it("allows typing in editable fields", () => {
    const { getByPlaceholderText } = render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>
    );
    fireEvent.change(getByPlaceholderText("Enter Your Name"), { target: { value: "New Name" } });
    expect(getByPlaceholderText("Enter Your Name").value).toBe("New Name");
    fireEvent.change(getByPlaceholderText("Enter Your Password"), { target: { value: "newpass" } });
    expect(getByPlaceholderText("Enter Your Password").value).toBe("newpass");
    fireEvent.change(getByPlaceholderText("Enter Your Phone"), { target: { value: "9876543210" } });
    expect(getByPlaceholderText("Enter Your Phone").value).toBe("9876543210");
    fireEvent.change(getByPlaceholderText("Enter Your Address"), { target: { value: "New Address" } });
    expect(getByPlaceholderText("Enter Your Address").value).toBe("New Address");
  });

  it("submits the form and updates profile successfully", async () => {
    axios.put.mockResolvedValueOnce({
      data: { updatedUser: { ...mockUser, name: "Updated Name" } },
    });

    const { getByPlaceholderText, getByText } = render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>
    );

    fireEvent.change(getByPlaceholderText("Enter Your Name"), { target: { value: "Updated Name" } });
    fireEvent.click(getByText("UPDATE"));

    await waitFor(() => {
      expect(axios.put).toHaveBeenCalledWith("/api/v1/auth/profile", expect.objectContaining({
        name: "Updated Name",
        email: "test@example.com",
        phone: "1234567890",
        address: "123 Test St",
      }));

      expect(setAuth).toHaveBeenCalled();
      expect(localStorage.setItem).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith("Profile Updated Successfully");
    });
  });

  it("shows error toast on API error", async () => {
    axios.put.mockRejectedValueOnce(new Error("API Error"));

    const { getByText } = render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>
    );

    fireEvent.click(getByText("UPDATE"));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Something went wrong");
    });
  });
});