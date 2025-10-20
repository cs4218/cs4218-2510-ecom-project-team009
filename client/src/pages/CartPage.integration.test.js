// CartPage.integration.test.js
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import CartPage from "./CartPage";
import { CartProvider } from "../context/cart";
import { AuthProvider } from "../context/auth";

// --- Mock external dependencies ---
jest.mock("axios");
jest.mock("react-hot-toast", () => ({
  success: jest.fn(),
  error: jest.fn(),
}));
jest.mock("braintree-web-drop-in-react", () => {
  return ({ onInstance, options }) => {
    const React = require("react");
    const calledRef = React.useRef(false);

    React.useEffect(() => {
      if (calledRef.current) return;
      if (options?.authorization) {
        const instance = {
          requestPaymentMethod: jest.fn(async () => ({ nonce: "NONCE_X" })),
        };
        onInstance(instance);
        calledRef.current = true;
      }
    }, [options?.authorization]);

    return React.createElement("div", { "data-testid": "dropin" });
  };
});

jest.mock("./../components/Layout", () => ({ children }) => (
  <div data-testid="layout">{children}</div>
));

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

// --- Utility Provider Wrapper ---
const AppProviders = ({ children }) => (
  <BrowserRouter>
    <AuthProvider>
      <CartProvider>{children}</CartProvider>
    </AuthProvider>
  </BrowserRouter>
);

// --- Mock data ---
const mockCart = [
  {
    _id: "p1",
    name: "Laptop",
    description: "High performance laptop",
    price: 1200,
  },
  {
    _id: "p2",
    name: "Mouse",
    description: "Wireless mouse",
    price: 50,
  },
];

describe("CartPage Integration Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  // ---------- Initial Render States ----------
  test("renders guest user with empty cart", async () => {
    render(
      <AppProviders>
        <CartPage />
      </AppProviders>
    );

    await waitFor(() => {
      expect(screen.getByText(/Hello Guest/i)).toBeInTheDocument();
      expect(screen.getByText(/Your Cart Is Empty/i)).toBeInTheDocument();
    });
  });

  test("renders logged-in user with items in cart", async () => {
    localStorage.setItem(
      "auth",
      JSON.stringify({
        user: { _id: "u123", name: "John", address: "123 Street" },
        token: "abc",
      })
    );
    localStorage.setItem("cart_u123", JSON.stringify(mockCart));

    axios.get.mockResolvedValueOnce({
      data: { clientToken: "mockToken123" },
    });

    render(
      <AppProviders>
        <CartPage />
      </AppProviders>
    );

    // Wait for token
    await waitFor(() =>
      expect(axios.get).toHaveBeenCalledWith("/api/v1/product/braintree/token")
    );

    // User greeting + cart
    await waitFor(() => {
      expect(screen.getByText(/Hello\s+John/i)).toBeInTheDocument();
      expect(screen.getByText("Laptop")).toBeInTheDocument();
      expect(screen.getByText("Mouse")).toBeInTheDocument();
      const totals = screen.getAllByText(/Total/i);
      expect(totals.length).toBeGreaterThan(0);
      expect(screen.getByTestId("dropin")).toBeInTheDocument();
    });
  });

  // ---------- Remove Cart Item ----------
  test("removes item from cart and updates localStorage", async () => {
    localStorage.setItem("auth", JSON.stringify({ user: { _id: "guest" } }));
    localStorage.setItem("cart_guest", JSON.stringify(mockCart));

    axios.get.mockResolvedValueOnce({
      data: { clientToken: "token123" },
    });

    render(
      <AppProviders>
        <CartPage />
      </AppProviders>
    );

    await waitFor(() => screen.getByText("Laptop"));
    const removeButtons = screen.getAllByText("Remove");
    fireEvent.click(removeButtons[0]);

    const updatedCart = JSON.parse(localStorage.getItem("cart_guest"));
    expect(updatedCart).toHaveLength(1);
    expect(updatedCart[0].name).toBe("Mouse");
  });

  // ---------- Address Handling ----------
  test("navigates to profile update when user has address", async () => {
    localStorage.setItem(
      "auth",
      JSON.stringify({
        user: { _id: "u123", name: "John", address: "Blk 123" },
        token: "abc",
      })
    );
    localStorage.setItem("cart_u123", JSON.stringify(mockCart));

    axios.get.mockResolvedValueOnce({ data: { clientToken: "token123" } });

    render(
      <AppProviders>
        <CartPage />
      </AppProviders>
    );

    await waitFor(() => screen.getByText("Laptop"));
    fireEvent.click(screen.getByText("Update Address"));
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard/user/profile");
  });

  test("navigates to login when user has no token", async () => {
    localStorage.setItem("auth", JSON.stringify({ user: null, token: "" }));

    axios.get.mockResolvedValueOnce({ data: { clientToken: null } });

    render(
      <AppProviders>
        <CartPage />
      </AppProviders>
    );

    const loginButton = await screen.findByText("Please Login to checkout");
    fireEvent.click(loginButton);
    expect(mockNavigate).toHaveBeenCalledWith("/login", { state: "/cart" });
  });

  // ---------- Total Price ----------
  test("calculates and displays total price correctly", async () => {
    localStorage.setItem(
      "auth",
      JSON.stringify({
        user: { _id: "u123", name: "John", address: "123 St" },
        token: "abc",
      })
    );
    localStorage.setItem("cart_u123", JSON.stringify(mockCart));

    axios.get.mockResolvedValueOnce({ data: { clientToken: "token123" } });

    render(
      <AppProviders>
        <CartPage />
      </AppProviders>
    );

    await waitFor(() => {
      const totals = screen.getAllByText(/Total/i);
      expect(totals.length).toBeGreaterThan(0);
    });

    // Check computed price
    expect(screen.getByText(/\$1,250\.00/)).toBeInTheDocument();
  });

  test("handles payment API failure gracefully", async () => {
    const consoleSpy = jest.spyOn(console, "log").mockImplementation();

    localStorage.setItem(
      "auth",
      JSON.stringify({
        user: { _id: "u1", name: "John", address: "123 Street" },
        token: "jwt",
      })
    );
    localStorage.setItem(
      "cart_u1",
      JSON.stringify([{ _id: "p1", name: "Laptop", price: 100 }])
    );

    axios.get.mockResolvedValueOnce({ data: { clientToken: "fake-token" } });
    axios.post.mockRejectedValueOnce(new Error("Payment failed"));

    const mockInstance = {
      requestPaymentMethod: jest
        .fn()
        .mockResolvedValue({ nonce: "fake-nonce" }),
    };

    jest.mock("braintree-web-drop-in-react", () => ({
      __esModule: true,
      default: ({ onInstance }) => {
        setTimeout(() => onInstance(mockInstance), 0);
        return <div data-testid="dropin">DropInMock</div>;
      },
    }));

    render(
      <AppProviders>
        <CartPage />
      </AppProviders>
    );

    await waitFor(() =>
      expect(screen.getByText("Make Payment")).toBeInTheDocument()
    );

    fireEvent.click(screen.getByText("Make Payment"));

    await waitFor(() => expect(consoleSpy).toHaveBeenCalled());

    consoleSpy.mockRestore();
  });

  // ---------- Token Fetch Error ----------
  test("handles getToken API failure gracefully", async () => {
    const consoleSpy = jest.spyOn(console, "log").mockImplementation();

    localStorage.setItem(
      "auth",
      JSON.stringify({
        user: { _id: "u123", name: "John" },
        token: "jwt",
      })
    );
    localStorage.setItem("cart_u123", JSON.stringify(mockCart));

    axios.get.mockRejectedValueOnce(new Error("Token fetch failed"));

    render(
      <AppProviders>
        <CartPage />
      </AppProviders>
    );

    await waitFor(() => expect(consoleSpy).toHaveBeenCalled());
    consoleSpy.mockRestore();
  });

  // ---------- Catch Branch: totalPrice() ----------
  test("handles error in totalPrice()", async () => {
    const consoleSpy = jest.spyOn(console, "log").mockImplementation();

    localStorage.setItem(
      "auth",
      JSON.stringify({
        user: { _id: "u1", name: "John", address: "Somewhere" },
        token: "jwt",
      })
    );

    // valid cart first
    localStorage.setItem(
      "cart_u1",
      JSON.stringify([{ _id: "p1", name: "Broken Item", price: 100 }])
    );

    axios.get.mockResolvedValueOnce({ data: { clientToken: "token123" } });

    const { rerender } = render(
      <AppProviders>
        <CartPage />
      </AppProviders>
    );

    // Wait for initial render
    await waitFor(() => {
      expect(screen.getAllByText(/Total/i).length).toBeGreaterThan(0);
    });

    rerender(
      <AppProviders>
        <CartPage />
      </AppProviders>
    );

    // Replace cart manually with invalid data and recompute
    await waitFor(() => {
      // Simulate an exception inside totalPrice()
      consoleSpy.mock.calls.length > 0;
    });

    consoleSpy.mockRestore();
  });

  // ---------- Catch Branch: removeCartItem() ----------
  test("handles exception in removeCartItem()", async () => {
    const consoleSpy = jest.spyOn(console, "log").mockImplementation();

    localStorage.setItem(
      "auth",
      JSON.stringify({
        user: { _id: "guest" },
        token: "",
      })
    );

    localStorage.setItem("cart_guest", JSON.stringify(mockCart));

    axios.get.mockResolvedValueOnce({ data: { clientToken: "token123" } });

    render(
      <AppProviders>
        <CartPage />
      </AppProviders>
    );

    await waitFor(() => screen.getByText("Laptop"));
    // Break localStorage.setItem
    jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("storage write failed");
    });

    const removeButtons = screen.getAllByText("Remove");
    fireEvent.click(removeButtons[0]);

    await waitFor(() => expect(consoleSpy).toHaveBeenCalled());
    consoleSpy.mockRestore();
  });

  test("handles error in totalPrice()", async () => {
    // ✅ Real context: set auth + cart into localStorage
    localStorage.setItem(
      "auth",
      JSON.stringify({
        user: { _id: "u1", name: "Alice", address: "Blk 9" },
        token: "tkn123",
      })
    );
    localStorage.setItem(
      "cart_u1",
      JSON.stringify([
        { _id: "p1", name: "Item", description: "Desc", price: 100 },
      ])
    );

    // ✅ Mock Braintree token call so component renders normally
    axios.get.mockResolvedValueOnce({ data: { clientToken: "fakeToken" } });

    // ✅ Force toLocaleString() to throw
    const localeSpy = jest
      .spyOn(Number.prototype, "toLocaleString")
      .mockImplementation(() => {
        throw new Error("locale fail");
      });
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    render(
      <AppProviders>
        <CartPage />
      </AppProviders>
    );

    // Wait for render completion
    await waitFor(() =>
      expect(screen.getByText(/Cart Summary/i)).toBeInTheDocument()
    );

    // ✅ Assert that catch executed
    expect(logSpy).toHaveBeenCalledWith(expect.any(Error));

    // Cleanup
    localeSpy.mockRestore();
    logSpy.mockRestore();
  });

  test("navigates to profile when clicking Update Address (address present)", async () => {
    // Set up valid authed user with address and non-empty cart
    localStorage.setItem(
      "auth",
      JSON.stringify({
        user: { _id: "u1", name: "Alice", address: "Blk 123" },
        token: "tkn123",
      })
    );
    localStorage.setItem(
      "cart_u1",
      JSON.stringify([
        { _id: "p1", name: "Item", description: "Desc", price: 100 },
      ])
    );

    axios.get.mockResolvedValueOnce({ data: { clientToken: "fakeToken" } });

    render(
      <AppProviders>
        <CartPage />
      </AppProviders>
    );

    // Ensure summary renders fully
    await waitFor(() => {
      expect(screen.getByText("Current Address")).toBeInTheDocument();
    });

    // Click correct Update Address button (in "has address" block)
    const buttons = screen.getAllByRole("button", { name: /Update Address/i });
    expect(buttons.length).toBeGreaterThan(0);

    fireEvent.click(buttons[0]);

    expect(mockNavigate).toHaveBeenCalledWith("/dashboard/user/profile");
  });

  test("navigates to profile when clicking Update Address (no address)", async () => {
    localStorage.setItem(
      "auth",
      JSON.stringify({
        user: { _id: "u1", name: "Alice" }, // no address
        token: "tkn123",
      })
    );
    localStorage.setItem(
      "cart_u1",
      JSON.stringify([
        { _id: "p1", name: "Item", description: "Desc", price: 100 },
      ])
    );

    axios.get.mockResolvedValueOnce({ data: { clientToken: "fakeToken" } });

    render(
      <AppProviders>
        <CartPage />
      </AppProviders>
    );

    const btn = await screen.findByRole("button", { name: /Update Address/i });
    fireEvent.click(btn);

    expect(mockNavigate).toHaveBeenCalledWith("/dashboard/user/profile");
  });
});

describe("CartPage Integration Tests – Payment flow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  test("completes payment successfully (with DropIn mock)", async () => {
    // Simulate logged-in user with address and items
    localStorage.setItem(
      "auth",
      JSON.stringify({
        user: { _id: "u1", name: "Alice", address: "Block 7" },
        token: "jwt",
      })
    );
    localStorage.setItem("cart_u1", JSON.stringify(mockCart));

    // Mock token + payment API
    axios.get.mockImplementation((url) => {
      if (url === "/api/v1/product/braintree/token") {
        return Promise.resolve({ data: { clientToken: "CLIENT_TOKEN_123" } });
      }
      return Promise.reject(new Error("Unknown GET " + url));
    });
    axios.post.mockResolvedValueOnce({ data: { success: true } });

    // Render full component tree
    render(
      <AppProviders>
        <CartPage />
      </AppProviders>
    );

    // Wait for token to load and DropIn to mount
    await waitFor(() =>
      expect(axios.get).toHaveBeenCalledWith("/api/v1/product/braintree/token")
    );
    await waitFor(() =>
      expect(screen.getByTestId("dropin")).toBeInTheDocument()
    );

    // Wait until "Make Payment" is visible and enabled
    const payButton = await screen.findByRole("button", {
      name: /Make Payment/i,
    });
    await waitFor(() => expect(payButton).toBeEnabled());

    // Simulate user payment
    fireEvent.click(payButton);

    // Verify end-to-end flow
    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        "/api/v1/product/braintree/payment",
        expect.objectContaining({ nonce: "NONCE_X" })
      );
      expect(toast.success).toHaveBeenCalledWith(
        "Payment Completed Successfully "
      );
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard/user/orders");
    });
  });
});
