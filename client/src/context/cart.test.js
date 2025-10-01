import React from "react";
import { renderHook, act } from "@testing-library/react";
import { CartProvider, useCart } from "./cart";
import "@testing-library/jest-dom/extend-expect";

// Mock useAuth
const mockSetAuth = jest.fn();
let mockAuthValue = [null, mockSetAuth];

jest.mock("../context/auth", () => ({
  useAuth: jest.fn(() => mockAuthValue),
}));

// Mock localStorage
const localStorageMock = (() => {
  let store = {};

  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
  writable: true,
});

describe("Cart Context - Systematic Testing", () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
    // Reset to guest user by default
    mockAuthValue = [null, mockSetAuth];
  });

  // ========================================
  // BOUNDARY VALUE ANALYSIS (BVA) TESTS
  // ========================================
  describe("BVA: Cart Size Boundaries", () => {
    it("should handle empty cart (boundary: 0 items)", () => {
      const { result } = renderHook(() => useCart(), {
        wrapper: CartProvider,
      });

      const [cart] = result.current;
      expect(cart).toEqual([]);
      expect(cart.length).toBe(0);
    });

    it("should handle single item cart (boundary: 1 item)", () => {
      const { result } = renderHook(() => useCart(), {
        wrapper: CartProvider,
      });

      const product = { _id: "1", name: "Product 1", price: 100 };

      act(() => {
        const [, setCart] = result.current;
        setCart([product]);
      });

      const [cart] = result.current;
      expect(cart.length).toBe(1);
      expect(cart).toEqual([product]);
    });

    it("should handle two items cart (boundary: 2 items)", () => {
      const { result } = renderHook(() => useCart(), {
        wrapper: CartProvider,
      });

      const product1 = { _id: "1", name: "Product 1", price: 100 };
      const product2 = { _id: "2", name: "Product 2", price: 200 };

      act(() => {
        const [, setCart] = result.current;
        setCart([product1, product2]);
      });

      const [cart] = result.current;
      expect(cart.length).toBe(2);
    });

    it("should handle many items cart (boundary: large N)", () => {
      const { result } = renderHook(() => useCart(), {
        wrapper: CartProvider,
      });

      const manyProducts = Array.from({ length: 100 }, (_, i) => ({
        _id: `${i}`,
        name: `Product ${i}`,
        price: (i + 1) * 10,
      }));

      act(() => {
        const [, setCart] = result.current;
        setCart(manyProducts);
      });

      const [cart] = result.current;
      expect(cart.length).toBe(100);
    });
  });

  describe("BVA: Item Addition/Removal Boundaries", () => {
    it("should add first item to empty cart (boundary: 0 → 1)", () => {
      const { result } = renderHook(() => useCart(), {
        wrapper: CartProvider,
      });

      const product = { _id: "1", name: "Product 1", price: 100 };

      act(() => {
        const [cart, setCart] = result.current;
        setCart([...cart, product]);
      });

      const [cart] = result.current;
      expect(cart.length).toBe(1);
    });

    it("should remove last item from single-item cart (boundary: 1 → 0)", () => {
      const mockCart = [{ _id: "1", name: "Product 1", price: 100 }];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockCart));

      const { result } = renderHook(() => useCart(), {
        wrapper: CartProvider,
      });

      act(() => {
        const [, setCart] = result.current;
        setCart([]);
      });

      const [cart] = result.current;
      expect(cart.length).toBe(0);
    });

    it("should remove one item from two-item cart (boundary: 2 → 1)", () => {
      const mockCart = [
        { _id: "1", name: "Product 1", price: 100 },
        { _id: "2", name: "Product 2", price: 200 },
      ];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockCart));

      const { result } = renderHook(() => useCart(), {
        wrapper: CartProvider,
      });

      act(() => {
        const [cart, setCart] = result.current;
        setCart(cart.filter((item) => item._id !== "1"));
      });

      const [cart] = result.current;
      expect(cart.length).toBe(1);
      expect(cart[0]._id).toBe("2");
    });
  });

  describe("BVA: Price Boundaries", () => {
    it("should handle zero price (boundary: minimum)", () => {
      const { result } = renderHook(() => useCart(), {
        wrapper: CartProvider,
      });

      const product = { _id: "1", name: "Free Item", price: 0 };

      act(() => {
        const [, setCart] = result.current;
        setCart([product]);
      });

      const [cart] = result.current;
      expect(cart[0].price).toBe(0);
    });

    it("should handle very high price (boundary: large value)", () => {
      const { result } = renderHook(() => useCart(), {
        wrapper: CartProvider,
      });

      const product = { _id: "1", name: "Expensive Item", price: 999999.99 };

      act(() => {
        const [, setCart] = result.current;
        setCart([product]);
      });

      const [cart] = result.current;
      expect(cart[0].price).toBe(999999.99);
    });
  });

  // ========================================
  // EQUIVALENCE PARTITIONING TESTS
  // ========================================
  describe("EP: LocalStorage State Partitions", () => {
    it("should handle null localStorage for guest (partition: empty/null)", () => {
      localStorageMock.getItem.mockReturnValue(null);

      const { result } = renderHook(() => useCart(), {
        wrapper: CartProvider,
      });

      const [cart] = result.current;
      expect(localStorage.getItem).toHaveBeenCalledWith("cart_guest");
      expect(cart).toEqual([]);
    });

    it("should handle valid JSON in localStorage for guest (partition: valid data)", () => {
      const mockCart = [
        { _id: "1", name: "Product 1", price: 100 },
        { _id: "2", name: "Product 2", price: 200 },
      ];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockCart));

      const { result } = renderHook(() => useCart(), {
        wrapper: CartProvider,
      });

      const [cart] = result.current;
      expect(localStorage.getItem).toHaveBeenCalledWith("cart_guest");
      expect(cart).toEqual(mockCart);
    });

    it("should handle invalid JSON in localStorage (partition: corrupted data)", () => {
      localStorageMock.getItem.mockReturnValue("invalid json");

      expect(() => {
        renderHook(() => useCart(), {
          wrapper: CartProvider,
        });
      }).toThrow();
    });

    it("should handle empty string in localStorage (partition: empty string)", () => {
      localStorageMock.getItem.mockReturnValue("");

      const { result } = renderHook(() => useCart(), {
        wrapper: CartProvider,
      });
      const [cart] = result.current;
      expect(cart).toEqual([]);
    });

    it("should handle empty array in localStorage (partition: valid empty)", () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify([]));

      const { result } = renderHook(() => useCart(), {
        wrapper: CartProvider,
      });

      const [cart] = result.current;
      expect(cart).toEqual([]);
    });
  });

  describe("EP: User Authentication State Partitions", () => {
    it("should load cart for guest user (partition: unauthenticated)", () => {
      mockAuthValue = [null, mockSetAuth];
      const mockCart = [{ _id: "1", name: "Guest Product", price: 50 }];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockCart));

      const { result } = renderHook(() => useCart(), {
        wrapper: CartProvider,
      });

      const [cart] = result.current;
      expect(localStorage.getItem).toHaveBeenCalledWith("cart_guest");
      expect(cart).toEqual(mockCart);
    });

    it("should load cart for authenticated user (partition: authenticated)", () => {
      mockAuthValue = [
        { user: { _id: "user123", name: "John" }, token: "token123" },
        mockSetAuth,
      ];
      const mockCart = [{ _id: "2", name: "User Product", price: 100 }];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockCart));

      const { result } = renderHook(() => useCart(), {
        wrapper: CartProvider,
      });

      const [cart] = result.current;
      expect(localStorage.getItem).toHaveBeenCalledWith("cart_user123");
      expect(cart).toEqual(mockCart);
    });

    it("should switch cart when user logs in", () => {
      // Start as guest
      mockAuthValue = [null, mockSetAuth];
      const guestCart = [{ _id: "1", name: "Guest Product", price: 50 }];
      const userCart = [{ _id: "2", name: "User Product", price: 100 }];

      localStorageMock.getItem.mockImplementation((key) => {
        if (key === "cart_guest") return JSON.stringify(guestCart);
        if (key === "cart_user123") return JSON.stringify(userCart);
        return null;
      });

      const { result, rerender } = renderHook(() => useCart(), {
        wrapper: CartProvider,
      });

      expect(result.current[0]).toEqual(guestCart);

      // Simulate login
      mockAuthValue = [
        { user: { _id: "user123", name: "John" }, token: "token123" },
        mockSetAuth,
      ];

      rerender();

      expect(result.current[0]).toEqual(userCart);
    });
  });

  describe("EP: Cart Operations Partitions", () => {
    it("should handle adding items (partition: add operation)", () => {
      const { result } = renderHook(() => useCart(), {
        wrapper: CartProvider,
      });

      const product = { _id: "1", name: "Test Product", price: 50 };

      act(() => {
        const [, setCart] = result.current;
        setCart([product]);
      });

      const [cart] = result.current;
      expect(cart).toEqual([product]);
    });

    it("should handle removing items (partition: remove operation)", () => {
      const mockCart = [
        { _id: "1", name: "Product 1", price: 100 },
        { _id: "2", name: "Product 2", price: 200 },
      ];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockCart));

      const { result } = renderHook(() => useCart(), {
        wrapper: CartProvider,
      });

      act(() => {
        const [cart, setCart] = result.current;
        setCart(cart.filter((item) => item._id !== "1"));
      });

      const [cart] = result.current;
      expect(cart.length).toBe(1);
      expect(cart[0]._id).toBe("2");
    });

    it("should handle clearing cart (partition: clear operation)", () => {
      const mockCart = [
        { _id: "1", name: "Product 1", price: 100 },
        { _id: "2", name: "Product 2", price: 200 },
      ];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockCart));

      const { result } = renderHook(() => useCart(), {
        wrapper: CartProvider,
      });

      act(() => {
        const [, setCart] = result.current;
        setCart([]);
      });

      const [cart] = result.current;
      expect(cart).toEqual([]);
    });
  });

  // ========================================
  // PAIRWISE TESTING
  // ========================================
  describe("Pairwise: Cart State × Operation Combinations", () => {
    const testCases = [
      {
        initialState: "empty",
        operation: "add",
        desc: "empty cart + add operation",
        setup: () => null,
        execute: (result) => {
          act(() => {
            const [, setCart] = result.current;
            setCart([{ _id: "1", name: "Product", price: 100 }]);
          });
        },
        verify: (result) => {
          const [cart] = result.current;
          expect(cart.length).toBe(1);
        },
      },
      {
        initialState: "empty",
        operation: "remove",
        desc: "empty cart + remove operation",
        setup: () => JSON.stringify([]),
        execute: (result) => {
          act(() => {
            const [cart, setCart] = result.current;
            setCart(cart.filter((item) => item._id !== "999"));
          });
        },
        verify: (result) => {
          const [cart] = result.current;
          expect(cart.length).toBe(0);
        },
      },
      {
        initialState: "single",
        operation: "add",
        desc: "single item cart + add operation",
        setup: () =>
          JSON.stringify([{ _id: "1", name: "Product 1", price: 100 }]),
        execute: (result) => {
          act(() => {
            const [cart, setCart] = result.current;
            setCart([...cart, { _id: "2", name: "Product 2", price: 200 }]);
          });
        },
        verify: (result) => {
          const [cart] = result.current;
          expect(cart.length).toBe(2);
        },
      },
      {
        initialState: "single",
        operation: "remove",
        desc: "single item cart + remove operation",
        setup: () =>
          JSON.stringify([{ _id: "1", name: "Product 1", price: 100 }]),
        execute: (result) => {
          act(() => {
            const [cart, setCart] = result.current;
            setCart(cart.filter((item) => item._id !== "1"));
          });
        },
        verify: (result) => {
          const [cart] = result.current;
          expect(cart.length).toBe(0);
        },
      },
      {
        initialState: "multiple",
        operation: "add",
        desc: "multiple items cart + add operation",
        setup: () =>
          JSON.stringify([
            { _id: "1", name: "Product 1", price: 100 },
            { _id: "2", name: "Product 2", price: 200 },
          ]),
        execute: (result) => {
          act(() => {
            const [cart, setCart] = result.current;
            setCart([...cart, { _id: "3", name: "Product 3", price: 300 }]);
          });
        },
        verify: (result) => {
          const [cart] = result.current;
          expect(cart.length).toBe(3);
        },
      },
      {
        initialState: "multiple",
        operation: "clear",
        desc: "multiple items cart + clear operation",
        setup: () =>
          JSON.stringify([
            { _id: "1", name: "Product 1", price: 100 },
            { _id: "2", name: "Product 2", price: 200 },
          ]),
        execute: (result) => {
          act(() => {
            const [, setCart] = result.current;
            setCart([]);
          });
        },
        verify: (result) => {
          const [cart] = result.current;
          expect(cart.length).toBe(0);
        },
      },
    ];

    testCases.forEach(
      ({ initialState, operation, desc, setup, execute, verify }) => {
        it(`should handle ${desc}`, () => {
          const mockData = setup();
          if (mockData) {
            localStorageMock.getItem.mockReturnValue(mockData);
          }

          const { result } = renderHook(() => useCart(), {
            wrapper: CartProvider,
          });

          execute(result);
          verify(result);
        });
      }
    );
  });

  describe("Pairwise: User State × Cart State Combinations", () => {
    it("should handle guest + empty cart", () => {
      mockAuthValue = [null, mockSetAuth];
      localStorageMock.getItem.mockReturnValue(null);

      const { result } = renderHook(() => useCart(), {
        wrapper: CartProvider,
      });

      expect(localStorage.getItem).toHaveBeenCalledWith("cart_guest");
      expect(result.current[0]).toEqual([]);
    });

    it("should handle guest + populated cart", () => {
      mockAuthValue = [null, mockSetAuth];
      const guestCart = [{ _id: "1", name: "Guest Item", price: 50 }];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(guestCart));

      const { result } = renderHook(() => useCart(), {
        wrapper: CartProvider,
      });

      expect(localStorage.getItem).toHaveBeenCalledWith("cart_guest");
      expect(result.current[0]).toEqual(guestCart);
    });

    it("should handle authenticated + empty cart", () => {
      mockAuthValue = [
        { user: { _id: "user123" }, token: "token" },
        mockSetAuth,
      ];
      localStorageMock.getItem.mockReturnValue(null);

      const { result } = renderHook(() => useCart(), {
        wrapper: CartProvider,
      });

      expect(localStorage.getItem).toHaveBeenCalledWith("cart_user123");
      expect(result.current[0]).toEqual([]);
    });

    it("should handle authenticated + populated cart", () => {
      mockAuthValue = [
        { user: { _id: "user123" }, token: "token" },
        mockSetAuth,
      ];
      const userCart = [{ _id: "2", name: "User Item", price: 100 }];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(userCart));

      const { result } = renderHook(() => useCart(), {
        wrapper: CartProvider,
      });

      expect(localStorage.getItem).toHaveBeenCalledWith("cart_user123");
      expect(result.current[0]).toEqual(userCart);
    });
  });

  // ========================================
  // INTEGRATION TESTS
  // ========================================
  describe("Integration: User Session Workflows", () => {
    it("should isolate guest cart from authenticated user cart", () => {
      const guestCart = [{ _id: "1", name: "Guest Item", price: 50 }];
      const userCart = [{ _id: "2", name: "User Item", price: 100 }];

      localStorageMock.getItem.mockImplementation((key) => {
        if (key === "cart_guest") return JSON.stringify(guestCart);
        if (key === "cart_user456") return JSON.stringify(userCart);
        return null;
      });

      // Start as guest
      mockAuthValue = [null, mockSetAuth];
      const { result, rerender } = renderHook(() => useCart(), {
        wrapper: CartProvider,
      });

      expect(result.current[0]).toEqual(guestCart);

      // Login as user
      mockAuthValue = [
        { user: { _id: "user456" }, token: "token" },
        mockSetAuth,
      ];
      rerender();

      expect(result.current[0]).toEqual(userCart);

      // Logout back to guest
      mockAuthValue = [null, mockSetAuth];
      rerender();

      expect(result.current[0]).toEqual(guestCart);
    });

    it("should complete add-update-remove workflow", () => {
      const { result } = renderHook(() => useCart(), {
        wrapper: CartProvider,
      });

      // Add item
      act(() => {
        const [, setCart] = result.current;
        setCart([{ _id: "1", name: "Product 1", price: 100 }]);
      });

      expect(result.current[0].length).toBe(1);

      // Update item
      act(() => {
        const [, setCart] = result.current;
        setCart([{ _id: "1", name: "Updated Product", price: 150 }]);
      });

      expect(result.current[0][0].price).toBe(150);

      // Remove item
      act(() => {
        const [, setCart] = result.current;
        setCart([]);
      });

      expect(result.current[0].length).toBe(0);
    });
  });

  describe("Edge Cases", () => {
    it("should return undefined when used without provider", () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      const { result } = renderHook(() => useCart());

      expect(result.current).toBeUndefined();

      consoleSpy.mockRestore();
    });

    it("should maintain separate carts for different provider instances", () => {
      localStorageMock.getItem.mockReturnValue(null);

      const { result: result1 } = renderHook(() => useCart(), {
        wrapper: CartProvider,
      });

      const { result: result2 } = renderHook(() => useCart(), {
        wrapper: CartProvider,
      });

      act(() => {
        const [, setCart] = result1.current;
        setCart([{ _id: "1", name: "Product", price: 150 }]);
      });

      expect(result1.current[0].length).toBe(1);
      expect(result2.current[0].length).toBe(0);
    });
  });
});
