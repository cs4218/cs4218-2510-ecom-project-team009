import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import "@testing-library/jest-dom/extend-expect";
import AdminRoute from "./AdminRoute";
import { useAuth } from "../../context/auth";
import axios from "axios";

jest.mock("axios");
jest.mock("../../context/auth");

jest.mock("../Spinner", () => () => (
  <div data-testid="spinner">Loading...</div>
));

describe("AdminRoute Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("No Token", () => {
    it("shows spinner when user has no token", async () => {
      useAuth.mockReturnValue([{ user: null, token: "" }]);

      render(
        <MemoryRouter initialEntries={["/dashboard/admin"]}>
          <Routes>
            <Route element={<AdminRoute />}>
              <Route path="/dashboard/admin" element={<div>Admin Page</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByTestId("spinner")).toBeInTheDocument();
      expect(screen.queryByText("Admin Page")).not.toBeInTheDocument();
      expect(axios.get).not.toHaveBeenCalled();
    });

    it("shows spinner when token is null", async () => {
      useAuth.mockReturnValue([{ user: null, token: null }]);

      render(
        <MemoryRouter initialEntries={["/dashboard/admin"]}>
          <Routes>
            <Route element={<AdminRoute />}>
              <Route path="/dashboard/admin" element={<div>Admin Page</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByTestId("spinner")).toBeInTheDocument();
      expect(axios.get).not.toHaveBeenCalled();
    });
  });

  describe("Authenticated Admin User", () => {
    it("allows access to admin page when user is authenticated admin", async () => {
      useAuth.mockReturnValue([
        { user: { name: "Admin User", role: 1 }, token: "mockAdminToken" },
      ]);
      axios.get.mockResolvedValue({ data: { ok: true } });

      render(
        <MemoryRouter initialEntries={["/dashboard/admin"]}>
          <Routes>
            <Route element={<AdminRoute />}>
              <Route path="/dashboard/admin" element={<div>Admin Page</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("Admin Page")).toBeInTheDocument();
      });
      expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/admin-auth");
    });

    it("calls admin-auth API with token", async () => {
      useAuth.mockReturnValue([
        { user: { name: "Admin User" }, token: "mockAdminToken" },
      ]);
      axios.get.mockResolvedValue({ data: { ok: true } });

      render(
        <MemoryRouter initialEntries={["/dashboard/admin"]}>
          <Routes>
            <Route element={<AdminRoute />}>
              <Route path="/dashboard/admin" element={<div>Admin Page</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("Admin Page")).toBeInTheDocument();
      });
      expect(axios.get).toHaveBeenCalledTimes(1);
    });
  });

  describe("Unauthorized User", () => {
    it("shows spinner when admin auth check fails", async () => {
      useAuth.mockReturnValue([
        { user: { name: "Regular User", role: 0 }, token: "mockUserToken" },
      ]);
      axios.get.mockResolvedValue({ data: { ok: false } });

      render(
        <MemoryRouter initialEntries={["/dashboard/admin"]}>
          <Routes>
            <Route element={<AdminRoute />}>
              <Route path="/dashboard/admin" element={<div>Admin Page</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/admin-auth");
      });
      expect(screen.getByTestId("spinner")).toBeInTheDocument();
      expect(screen.queryByText("Admin Page")).not.toBeInTheDocument();
    });

    it("shows spinner when API returns error", async () => {
      useAuth.mockReturnValue([
        { user: { name: "Test User" }, token: "mockToken" },
      ]);
      axios.get.mockRejectedValue(new Error("Network error"));

      render(
        <MemoryRouter initialEntries={["/dashboard/admin"]}>
          <Routes>
            <Route element={<AdminRoute />}>
              <Route path="/dashboard/admin" element={<div>Admin Page</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/admin-auth");
      });
      expect(screen.getByTestId("spinner")).toBeInTheDocument();
      expect(screen.queryByText("Admin Page")).not.toBeInTheDocument();
    });
  });
});
