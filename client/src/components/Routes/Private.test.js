import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import "@testing-library/jest-dom/extend-expect";
import PrivateRoute from "./Private";
import { useAuth } from "../../context/auth";
import axios from "axios";

jest.mock("axios");
jest.mock("../../context/auth");

jest.mock("../Spinner", () => () => (
  <div data-testid="spinner">Loading...</div>
));

describe("PrivateRoute Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("No Token", () => {
    it("shows spinner when user has no token", async () => {
      useAuth.mockReturnValue([{ user: null, token: "" }]);

      render(
        <MemoryRouter initialEntries={["/dashboard/user"]}>
          <Routes>
            <Route element={<PrivateRoute />}>
              <Route
                path="/dashboard/user"
                element={<div>User Dashboard</div>}
              />
            </Route>
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByTestId("spinner")).toBeInTheDocument();
      expect(screen.queryByText("User Dashboard")).not.toBeInTheDocument();
      expect(axios.get).not.toHaveBeenCalled();
    });

    it("shows spinner when token is null", async () => {
      useAuth.mockReturnValue([{ user: null, token: null }]);

      render(
        <MemoryRouter initialEntries={["/dashboard/user"]}>
          <Routes>
            <Route element={<PrivateRoute />}>
              <Route
                path="/dashboard/user"
                element={<div>User Dashboard</div>}
              />
            </Route>
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByTestId("spinner")).toBeInTheDocument();
      expect(axios.get).not.toHaveBeenCalled();
    });
  });

  describe("Authenticated User", () => {
    it("allows access to protected page when user is authenticated", async () => {
      useAuth.mockReturnValue([
        { user: { name: "Test User" }, token: "mockUserToken" },
      ]);
      axios.get.mockResolvedValue({ data: { ok: true } });

      render(
        <MemoryRouter initialEntries={["/dashboard/user"]}>
          <Routes>
            <Route element={<PrivateRoute />}>
              <Route
                path="/dashboard/user"
                element={<div>User Dashboard</div>}
              />
            </Route>
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("User Dashboard")).toBeInTheDocument();
      });
      expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/user-auth");
    });

    it("calls user-auth API with token", async () => {
      useAuth.mockReturnValue([
        { user: { name: "Test User" }, token: "mockUserToken" },
      ]);
      axios.get.mockResolvedValue({ data: { ok: true } });

      render(
        <MemoryRouter initialEntries={["/dashboard/user"]}>
          <Routes>
            <Route element={<PrivateRoute />}>
              <Route
                path="/dashboard/user"
                element={<div>User Dashboard</div>}
              />
            </Route>
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("User Dashboard")).toBeInTheDocument();
      });
      expect(axios.get).toHaveBeenCalledTimes(1);
    });
  });

  describe("Unauthorized User", () => {
    it("shows spinner when user auth check fails", async () => {
      useAuth.mockReturnValue([
        { user: { name: "Test User" }, token: "invalidToken" },
      ]);
      axios.get.mockResolvedValue({ data: { ok: false } });

      render(
        <MemoryRouter initialEntries={["/dashboard/user"]}>
          <Routes>
            <Route element={<PrivateRoute />}>
              <Route
                path="/dashboard/user"
                element={<div>User Dashboard</div>}
              />
            </Route>
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/user-auth");
      });
      expect(screen.getByTestId("spinner")).toBeInTheDocument();
      expect(screen.queryByText("User Dashboard")).not.toBeInTheDocument();
    });

    it("shows spinner when API returns error", async () => {
      useAuth.mockReturnValue([
        { user: { name: "Test User" }, token: "mockToken" },
      ]);
      axios.get.mockRejectedValue(new Error("Network error"));

      render(
        <MemoryRouter initialEntries={["/dashboard/user"]}>
          <Routes>
            <Route element={<PrivateRoute />}>
              <Route
                path="/dashboard/user"
                element={<div>User Dashboard</div>}
              />
            </Route>
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/user-auth");
      });
      expect(screen.getByTestId("spinner")).toBeInTheDocument();
      expect(screen.queryByText("User Dashboard")).not.toBeInTheDocument();
    });
  });
});
