// client/src/context/auth.test.js
import React from "react";
import { render, fireEvent, waitFor, screen } from "@testing-library/react";
import { AuthProvider, useAuth } from "./auth";
import axios from "axios";

jest.mock("axios", () => ({
  defaults: { headers: { common: { Authorization: undefined } } },
}));

const TestConsumer = () => {
  const [auth, setAuth] = useAuth();

  return (
    <div>
      <span data-testid="user">{auth.user ? auth.user.name : "guest"}</span>
      <span data-testid="token">{auth.token}</span>
      <button
        onClick={() =>
          setAuth((prev) => ({
            ...prev,
            user: { name: "Jm San Diego" },
            token: "mockToken",
          }))
        }
      >
        update
      </button>
    </div>
  );
};

describe("AuthProvider", () => {
  beforeEach(() => {
    window.localStorage.clear();
    axios.defaults.headers.common.Authorization = undefined;
    jest.clearAllMocks();
  });

  it("provides the default auth state", () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    expect(screen.getByTestId("user").textContent).toBe("guest");
    expect(screen.getByTestId("token").textContent).toBe("");
    expect(axios.defaults.headers.common.Authorization).toBe("");
  });

  it("hydrates state from localStorage", async () => {
    const storedAuth = {
      user: { name: "Jamie" },
      token: "stored-token",
    };
    window.localStorage.setItem("auth", JSON.stringify(storedAuth));

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() =>
      expect(screen.getByTestId("user").textContent).toBe("Jamie")
    );
    expect(screen.getByTestId("token").textContent).toBe("stored-token");
    expect(axios.defaults.headers.common.Authorization).toBe("stored-token");
  });

  it("updates auth state through the setter", () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    fireEvent.click(screen.getByText("update"));

    expect(screen.getByTestId("user").textContent).toBe("Jm San Diego");
    expect(screen.getByTestId("token").textContent).toBe("mockToken");
    expect(axios.defaults.headers.common.Authorization).toBe("mockToken");
  });
});
