import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import "@testing-library/jest-dom/extend-expect";
import PublicRoute from "./Public";
import { useAuth } from "../../context/auth";

jest.mock("../../context/auth");

describe("PublicRoute Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Unauthenticated User", () => {
    it("allows access to login page when user is not authenticated", () => {
      useAuth.mockReturnValue([{ user: null, token: "" }]);

      render(
        <MemoryRouter initialEntries={["/login"]}>
          <Routes>
            <Route element={<PublicRoute />}>
              <Route path="/login" element={<div>Login Page</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText("Login Page")).toBeInTheDocument();
    });
  });

  describe("Authenticated User", () => {
    it("redirects to home page when authenticated user tries to access login", async () => {
      useAuth.mockReturnValue([
        { user: { name: "Test User" }, token: "mockToken123" },
      ]);

      render(
        <MemoryRouter initialEntries={["/login"]}>
          <Routes>
            <Route element={<PublicRoute />}>
              <Route path="/login" element={<div>Login Page</div>} />
            </Route>
            <Route path="/" element={<div>Home Page</div>} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("Home Page")).toBeInTheDocument();
      });
      expect(screen.queryByText("Login Page")).not.toBeInTheDocument();
    });

    it("redirects to home page when authenticated user tries to access register", async () => {
      useAuth.mockReturnValue([
        { user: { name: "Test User" }, token: "mockToken123" },
      ]);

      render(
        <MemoryRouter initialEntries={["/register"]}>
          <Routes>
            <Route element={<PublicRoute />}>
              <Route path="/register" element={<div>Register Page</div>} />
            </Route>
            <Route path="/" element={<div>Home Page</div>} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("Home Page")).toBeInTheDocument();
      });
      expect(screen.queryByText("Register Page")).not.toBeInTheDocument();
    });
  });
});
