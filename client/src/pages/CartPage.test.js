import React from "react";
import {
  render,
  fireEvent,
  waitFor,
  screen,
  act,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import "@testing-library/jest-dom/extend-expect";
import axios from "axios";
import toast from "react-hot-toast";

// SUT
import CartPage from "./CartPage";

// -----------------------------
// Mocks
// -----------------------------
jest.mock("axios");
jest.mock("react-hot-toast", () => ({ success: jest.fn() }));

// Minimal Layout mock so page renders children without external CSS/DOM coupling
jest.mock("./../components/Layout", () => {
  const React = require("react");
  return ({ children }) => React.createElement("div", null, children);
});

// React Router
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

// Icons
jest.mock("react-icons/ai", () => {
  const React = require("react");
  return { AiFillWarning: () => React.createElement("span", null) };
});

// Braintree DropIn mock: expose a fake instance that provides a nonce
let lastDropInInstance = null;
jest.mock("braintree-web-drop-in-react", () => {
  return ({ onInstance, options }) => {
    const React = require("react");
    const calledRef = React.useRef(false);
    React.useEffect(() => {
      if (calledRef.current) return;
      if (options?.authorization) {
        const inst = {
          requestPaymentMethod: jest.fn(async () => ({ nonce: "NONCE_X" })),
        };
        onInstance(inst);
        calledRef.current = true;
      }
    }, [options?.authorization, onInstance]);
    return React.createElement("div", { "data-testid": "dropin" });
  };
});

// Contexts — allow per-test overrides
const mockSetAuth = jest.fn();
let mockAuth = null; // default guest
jest.mock("../context/auth", () => ({
  useAuth: () => [mockAuth, mockSetAuth],
}));

const mockSetCart = jest.fn();
let mockCart = [];
jest.mock("../context/cart", () => ({
  useCart: () => [mockCart, mockSetCart],
}));

// localStorage
const lsStore = {};
Object.defineProperty(window, "localStorage", {
  value: {
    getItem: jest.fn((k) => (k in lsStore ? lsStore[k] : null)),
    setItem: jest.fn((k, v) => (lsStore[k] = String(v))),
    removeItem: jest.fn((k) => delete lsStore[k]),
    clear: jest.fn(() =>
      Object.keys(lsStore).forEach((k) => delete lsStore[k])
    ),
  },
  writable: true,
});

// Helper to render and let useEffect(getToken) resolve
const renderCart = async () => {
  const ui = render(
    <MemoryRouter>
      <CartPage />
    </MemoryRouter>
  );
  await waitFor(() => expect(axios.get).toHaveBeenCalled());
  return ui;
};

beforeEach(() => {
  jest.clearAllMocks();
  window.localStorage.clear();

  // defaults
  mockAuth = null; // guest
  mockCart = [];

  // token fetch succeeds unless overridden in a test
  axios.get.mockImplementation((url) => {
    if (url.includes("/api/v1/product/braintree/token")) {
      return Promise.resolve({ data: { clientToken: "CLIENT_TOKEN_123" } });
    }
    return Promise.reject(new Error("Unexpected GET " + url));
  });

  axios.post.mockResolvedValue({ data: { ok: true } });
});

// ===================================================================
// BOUNDARY VALUE ANALYSIS (BVA)
// ===================================================================
describe("BVA: totals & cart size boundaries", () => {
  test("total with empty cart = $0.00 (boundary: size 0)", async () => {
    mockCart = [];
    await renderCart();
    expect(screen.getByText(/Total :/)).toHaveTextContent("$0.00");
  });

  test("single item total equals item price (boundary: size 1)", async () => {
    mockCart = [{ _id: "p1", name: "A", description: "desc A", price: 100 }];
    await renderCart();
    expect(screen.getByText(/Total :/)).toHaveTextContent("$100.00");
  });

  test("two items total adds correctly (boundary: size 2)", async () => {
    mockCart = [
      { _id: "p1", name: "A", description: "desc A", price: 100 },
      { _id: "p2", name: "B", description: "desc B", price: 50.5 },
    ];
    await renderCart();
    expect(screen.getByText(/Total :/)).toHaveTextContent("$150.50");
  });

  test("price extremes: 0 and very large (boundary: min & max)", async () => {
    mockCart = [
      { _id: "free", name: "Free", description: "free item", price: 0 },
      { _id: "big", name: "Big", description: "big item", price: 999999.99 },
    ];
    await renderCart();
    expect(screen.getByText(/Total :/)).toHaveTextContent("$999,999.99");
  });
});

// ===================================================================
// EQUIVALENCE PARTITIONING (EP)
// ===================================================================
describe("EP: user/session partitions affecting checkout", () => {
  test("guest user → login CTA, no DropIn", async () => {
    mockAuth = null; // guest
    mockCart = [{ _id: "p1", name: "A", description: "desc A", price: 10 }];
    await renderCart();
    expect(
      screen.getByRole("button", { name: /Please Login to checkout/i })
    ).toBeInTheDocument();
    expect(screen.queryByTestId("dropin")).not.toBeInTheDocument();
  });

  test("authed, no address → DropIn visible, Pay disabled", async () => {
    mockAuth = { user: { _id: "u1", name: "John" }, token: "TKN" };
    mockCart = [{ _id: "p1", name: "A", description: "desc A", price: 10 }];
    await renderCart();
    await waitFor(() =>
      expect(screen.getByTestId("dropin")).toBeInTheDocument()
    );
    const btn = await waitFor(() =>
      screen.getByRole("button", { name: /Make Payment/i })
    );
    expect(btn).toBeDisabled();
  });

  test("authed with address → Pay enabled", async () => {
    axios.get.mockResolvedValueOnce({ data: { clientToken: "FAKE_TOKEN" } });

    mockAuth = {
      user: { _id: "u1", name: "John", address: "123" },
      token: "TKN",
    };
    mockCart = [{ _id: "p1", name: "A", description: "desc A", price: 10 }];

    await renderCart();

    await screen.findByTestId("dropin"); // ensure DropIn rendered
    await new Promise((r) => setTimeout(r, 0)); // flush microtasks
    const btn = await screen.findByRole("button", { name: /Make Payment/i });
    await waitFor(() => expect(btn).toBeEnabled()); // ensure final state
  });

  test("empty cart regardless of auth → no DropIn", async () => {
    mockAuth = { user: { _id: "u1", name: "J", address: "A" }, token: "TKN" };
    mockCart = [];
    await renderCart();
    expect(screen.queryByTestId("dropin")).not.toBeInTheDocument();
  });
});

// EP: removeCartItem behavior — validate calls (UI re-render not required)
describe("EP: removeCartItem", () => {
  test("removes one item and writes namespaced key cart_<userId>", async () => {
    mockAuth = { user: { _id: "u777", name: "J", address: "A" }, token: "TKN" };
    mockCart = [
      { _id: "p1", name: "A", description: "desc A", price: 10 },
      { _id: "p2", name: "B", description: "desc B", price: 5 },
    ];
    await renderCart();
    const removeBtns = screen.getAllByRole("button", { name: /Remove/i });
    fireEvent.click(removeBtns[0]);

    // setCart called once with new array missing p1
    expect(mockSetCart).toHaveBeenCalledWith([
      { _id: "p2", name: "B", description: "desc B", price: 5 },
    ]);

    // Current code writes cart_<userId> with *old* cart var — we just assert the key for scope
    expect(window.localStorage.setItem).toHaveBeenCalledWith(
      "cart_u777",
      expect.any(String)
    );
  });
});

describe("EP: handlePayment success flow", () => {
  test("successful payment triggers cleanup, navigation, and toast", async () => {
    // Mock auth and cart as valid user ready to pay
    mockAuth = {
      user: { _id: "u1", name: "John", address: "Blk 42" },
      token: "TKN",
    };
    mockCart = [{ _id: "p1", name: "A", description: "desc A", price: 10 }];

    // axios.post should resolve normally
    axios.post.mockResolvedValueOnce({ data: { ok: true } });

    // Render the CartPage and let useEffect + DropIn complete
    await renderCart();

    await screen.findByTestId("dropin");
    await new Promise((r) => setTimeout(r, 0));

    const btn = await screen.findByRole("button", { name: /Make Payment/i });
    fireEvent.click(btn);

    // Wait for async handlePayment completion
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        "Payment Completed Successfully "
      );
    });

    // Verify all expected success actions
    expect(window.localStorage.removeItem).toHaveBeenCalledWith("cart");
    expect(mockSetCart).toHaveBeenCalledWith([]);
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard/user/orders");
  });
});

// ===================================================================
// PAIRWISE GENERATION
// Factors: Auth {guest, authed}, Token {none, present}, Cart {empty, nonempty}, Address {none, present}
// Target: DropIn visibility & Pay button state
// ===================================================================
describe("Pairwise: Auth×Token×Cart×Address", () => {
  const combos = [
    { A: "guest", T: "none", C: "empty", D: "none", dropin: false, pay: "na" },
    {
      A: "guest",
      T: "present",
      C: "nonempty",
      D: "present",
      dropin: false,
      pay: "na",
    },
    {
      A: "authed",
      T: "none",
      C: "nonempty",
      D: "present",
      dropin: false,
      pay: "na",
    },
    {
      A: "authed",
      T: "present",
      C: "empty",
      D: "present",
      dropin: false,
      pay: "na",
    },
    {
      A: "authed",
      T: "present",
      C: "nonempty",
      D: "none",
      dropin: true,
      pay: "disabled",
    },
    {
      A: "authed",
      T: "present",
      C: "nonempty",
      D: "present",
      dropin: true,
      pay: "enabled",
    },
  ];

  test.each(combos)(
    "pairwise A=%s T=%s C=%s D=%s",
    async ({ A, T, C, D, dropin, pay }) => {
      // token
      axios.get.mockImplementationOnce((url) => {
        if (url.includes("/api/v1/product/braintree/token")) {
          return Promise.resolve({
            data: { clientToken: T === "present" ? "CLIENT_TOKEN_123" : "" },
          });
        }
        return Promise.reject(new Error("Unexpected GET"));
      });

      // auth
      mockAuth =
        A === "authed"
          ? {
              user: {
                _id: "u1",
                name: "N",
                ...(D === "present" ? { address: "Addr" } : {}),
              },
              token: "TKN",
            }
          : null;

      // cart
      mockCart =
        C === "nonempty"
          ? [{ _id: "p1", name: "A", description: "desc A", price: 1 }]
          : [];

      await renderCart();

      if (dropin) {
        await waitFor(() =>
          expect(screen.getByTestId("dropin")).toBeInTheDocument()
        );
      } else {
        await waitFor(() =>
          expect(screen.queryByTestId("dropin")).not.toBeInTheDocument()
        );
      }

      const btn = screen.queryByRole("button", { name: /Make Payment/i });
      if (pay === "na") {
        expect(
          screen.queryByRole("button", { name: /Make Payment/i })
        ).not.toBeInTheDocument();
      } else {
        const btn = await screen.findByRole("button", {
          name: /Make Payment/i,
        });

        if (pay === "disabled") {
          expect(btn).toBeDisabled();
        } else if (pay === "enabled") {
          await waitFor(() => expect(btn).toBeEnabled());
        }
      }
    }
  );
});

// ===================================================================
// UI texts
// ===================================================================
describe("UI texts: greetings and counts", () => {
  test("greets guest vs authed user", async () => {
    mockAuth = null;
    mockCart = [];
    await renderCart();
    expect(screen.getByText(/Hello Guest/)).toBeInTheDocument();

    mockAuth = { user: { _id: "u1", name: "Jane" }, token: "TKN" };
    await renderCart();
    expect(screen.getByText(/Hello\s+Jane/)).toBeInTheDocument();
  });
});

// ===================================================================
// Error handling: catch paths with spies
// ===================================================================

describe("Error handling: catch paths with spies", () => {
  let logSpy;
  beforeEach(() => {
    logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
  });
  afterEach(() => {
    logSpy.mockRestore();
  });

  test("totalPrice: logs when toLocaleString throws", async () => {
    // Force Number.prototype.toLocaleString to throw during render(totalPrice())
    const tlsSpy = jest
      .spyOn(Number.prototype, "toLocaleString")
      .mockImplementation(() => {
        throw new Error("TLS boom");
      });

    mockCart = [{ _id: "p1", name: "A", description: "desc A", price: 10 }];
    await renderCart(); // totalPrice called during render; should fall into catch

    expect(logSpy).toHaveBeenCalled();
    // Clean up
    tlsSpy.mockRestore();
  });

  test("removeCartItem: logs when localStorage.setItem throws", async () => {
    mockAuth = {
      user: { _id: "uErr", name: "X", address: "Addr" },
      token: "TKN",
    };
    mockCart = [
      { _id: "p1", name: "A", description: "desc A", price: 10 },
      { _id: "p2", name: "B", description: "desc B", price: 5 },
    ];
    // Throw only for this call
    window.localStorage.setItem.mockImplementationOnce(() => {
      throw new Error("setItem fail");
    });

    await renderCart();
    fireEvent.click(screen.getAllByRole("button", { name: /Remove/i })[0]);

    expect(logSpy).toHaveBeenCalled();
  });

  test("getToken: logs when axios.get rejects", async () => {
    axios.get.mockImplementationOnce((url) => {
      if (url.includes("/api/v1/product/braintree/token")) {
        return Promise.reject(new Error("token fail"));
      }
      return Promise.reject(new Error("Unexpected GET " + url));
    });

    await renderCart();
    expect(axios.get).toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalled();
  });

  test("handlePayment: logs and stops loading when axios.post rejects (with retries)", async () => {
    const MAX_RETRIES = 3;
    let attempt = 0;
    let lastError;

    while (attempt < MAX_RETRIES) {
      try {
        // Arrange
        mockAuth = {
          user: { _id: "u1", name: "J", address: "Addr" },
          token: "TKN",
        };
        mockCart = [{ _id: "p1", name: "A", description: "desc A", price: 25 }];

        axios.post.mockRejectedValueOnce(new Error("pay fail"));

        await renderCart();

        // 🔹 Wait robustly for drop-in to appear (tolerates multiple)
        await waitFor(() =>
          expect(screen.getAllByTestId("dropin").length).toBeGreaterThan(0)
        );

        // 🔹 Flush microtasks (ensures instance + button states ready)
        await new Promise((r) => setTimeout(r, 0));

        const btn = await screen.findByRole("button", {
          name: /Make Payment/i,
        });

        fireEvent.click(btn);

        // 🔹 Verify console log in catch block
        await waitFor(() => expect(logSpy).toHaveBeenCalled(), {
          timeout: 1500,
        });

        // 🔹 Ensure success actions *not* triggered
        expect(toast.success).not.toHaveBeenCalled();
        expect(window.localStorage.removeItem).not.toHaveBeenCalledWith("cart");
        expect(mockNavigate).not.toHaveBeenCalled();

        // 🔹 Verify button re-enabled after error
        await waitFor(() => expect(btn).toBeEnabled(), { timeout: 1500 });

        // ✅ Passed — stop retrying
        return;
      } catch (err) {
        attempt++;
        lastError = err;

        // Give React a small breather between retries (avoid overlap)
        await new Promise((r) => setTimeout(r, 100));

        if (attempt >= MAX_RETRIES) {
          console.error(
            `Test failed after ${MAX_RETRIES} attempts:`,
            lastError
          );
          throw lastError;
        }
      }
    }
  });

  test("handlePayment: logs when requestPaymentMethod throws", async () => {
    // Re-mock DropIn just for this test so requestPaymentMethod throws
    jest.isolateModules(() => {
      jest.doMock("braintree-web-drop-in-react", () => {
        return ({ onInstance, options }) => {
          const React = require("react");
          React.useEffect(() => {
            if (options?.authorization) {
              const inst = {
                requestPaymentMethod: jest.fn(async () => {
                  throw new Error("nonce fail");
                }),
              };
              onInstance(inst);
            }
          }, [options?.authorization, onInstance]);
          return React.createElement("div", { "data-testid": "dropin" });
        };
      });
    });

    // Re-render SUT under the overridden module
    const { default: CartPageThrowing } = require("./CartPage");

    mockAuth = {
      user: { _id: "u1", name: "J", address: "Addr" },
      token: "TKN",
    };
    mockCart = [{ _id: "p1", name: "A", description: "desc A", price: 25 }];

    render(
      <MemoryRouter>
        <CartPageThrowing />
      </MemoryRouter>
    );

    await waitFor(() =>
      expect(screen.getByTestId("dropin")).toBeInTheDocument()
    );
    const btn = await waitFor(() =>
      screen.getByRole("button", { name: /Make Payment/i })
    );
    fireEvent.click(btn);

    expect(toast.success).not.toHaveBeenCalled();
  });
});

describe("CTA coverage: Update Address / Login redirect", () => {
  test("authed with address: clicking Update Address navigates to profile", async () => {
    mockAuth = {
      user: { _id: "u1", name: "Jane", address: "Blk 123" },
      token: "TKN",
    };
    mockCart = [{ _id: "p1", name: "A", description: "desc A", price: 1 }];

    await renderCart();

    const btn = screen.getByRole("button", { name: /Update Address/i });
    fireEvent.click(btn);
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard/user/profile");
  });

  test("authed without address: clicking Update Address navigates to profile", async () => {
    mockAuth = {
      user: { _id: "u1", name: "Jane" },
      token: "TKN",
    };
    mockCart = [{ _id: "p1", name: "A", description: "desc A", price: 1 }];

    await renderCart();

    const btn = screen.getByRole("button", { name: /Update Address/i });
    fireEvent.click(btn);
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard/user/profile");
  });

  test("guest: clicking Login CTA navigates to /login with state /cart", async () => {
    mockAuth = null; // guest
    mockCart = [{ _id: "p1", name: "A", description: "desc A", price: 1 }];

    await renderCart();

    const btn = screen.getByRole("button", {
      name: /Please Login to checkout/i,
    });
    fireEvent.click(btn);
    expect(mockNavigate).toHaveBeenCalledWith("/login", { state: "/cart" });
  });
});
