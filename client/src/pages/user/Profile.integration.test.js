import React from "react";
import axios from "axios";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route } from "react-router-dom";
import { renderTopDown } from "../../test-utils/renderTopDown";
import { cleanupAuth } from "../../test-utils/renderWithProviders";
import Profile from "./Profile";

jest.mock("../../hooks/useCategory", () => ({
  __esModule: true,
  default: jest.fn(() => []),
}));

jest.mock("axios");

const Dashboard = () => <div>Dashboard</div>;
const Orders = () => <div>User Orders Page</div>;

const renderProfileRoutes = (options) =>
  renderTopDown(
    <>
      <Route path="/dashboard/user" element={<Dashboard />} />
      <Route path="/dashboard/user/profile" element={<Profile />} />
      <Route path="/dashboard/user/orders" element={<Orders />} />
    </>,
    options
  );

describe("Profile integration tests", () => {
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

  const mockUser = {
    name: "John Doe",
    email: "john@example.com",
    address: "123 Main St, City, Country",
    phone: "123-456-7890",
  };


  it("displays user profile with data from real auth context", async () => {

    renderProfileRoutes({
      initialAuthState: { user: mockUser, token: "valid-user-token" },
      route: "/dashboard/user/profile",
    });

    expect(screen.getByTestId("name-input")).toBeInTheDocument();
    expect(screen.getByTestId("email-input")).toBeInTheDocument();
    expect(screen.getByTestId("phone-input")).toBeInTheDocument();
    expect(screen.getByTestId("address-input")).toBeInTheDocument();

    expect(screen.getByTestId("name-input")).toHaveValue("John Doe");
    expect(screen.getByTestId("email-input")).toHaveValue("john@example.com");
    expect(screen.getByTestId("phone-input")).toHaveValue("123-456-7890");
    expect(screen.getByTestId("address-input")).toHaveValue("123 Main St, City, Country");
  });

  it("profile is updated successfully", async () => {

    axios.put.mockResolvedValueOnce({
      data: {
        updatedUser: {
          name: "Jane Doe",
          email: "john@example.com",
          phone: "987-654-3210",
          address: "456 New St, New City",
        },
      },
    });

    renderProfileRoutes({
      initialAuthState: { user: mockUser, token: "valid-user-token" },
      route: "/dashboard/user/profile",
    });

    // Change name, phone, address
    const nameInput = screen.getByTestId("name-input");
    const phoneInput = screen.getByTestId("phone-input");
    const addressInput = screen.getByTestId("address-input");

    userEvent.clear(nameInput);
    userEvent.type(nameInput, "Jane Doe");

    userEvent.clear(phoneInput);
    userEvent.type(phoneInput, "987-654-3210");

    userEvent.clear(addressInput);
    userEvent.type(addressInput, "456 New St, New City");

    userEvent.click(screen.getByTestId("update-profile-button"));

    await waitFor(() => {
      expect(axios.put).toHaveBeenCalledWith(
        "/api/v1/auth/profile",
        expect.objectContaining({
          name: "Jane Doe",
          phone: "987-654-3210",
          address: "456 New St, New City",
          email: "john@example.com",
        })
      );
    });
  });

  it("shows empty fields if user context is missing", async () => {
    renderProfileRoutes({
      initialAuthState: { user: null, token: "valid-user-token" },
      route: "/dashboard/user/profile",
    });

    expect(screen.getByTestId("name-input")).toHaveValue("");
    expect(screen.getByTestId("email-input")).toHaveValue("");
    expect(screen.getByTestId("phone-input")).toHaveValue("");
    expect(screen.getByTestId("address-input")).toHaveValue("");
  });

});
