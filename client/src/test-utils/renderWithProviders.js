import React from "react";
import { render } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "../context/auth";
import { CartProvider } from "../context/cart";
import { SearchProvider } from "../context/search";

// Helper function to render components with all necessary providers
// Bottom-up strategy: wraps components with real providers to test integration
export const renderWithProviders = (
  ui,
  {
    initialAuthState = { user: null, token: "" },
    route = "/",
    ...renderOptions
  } = {}
) => {
  // Set initial route if provided
  window.history.pushState({}, "Test page", route);

  // Mock localStorage if initial auth state is provided
  if (initialAuthState.token) {
    localStorage.setItem("auth", JSON.stringify(initialAuthState));
  } else {
    localStorage.removeItem("auth");
  }

  const Wrapper = ({ children }) => {
    return (
      <BrowserRouter>
        <AuthProvider>
          <SearchProvider>
            <CartProvider>{children}</CartProvider>
          </SearchProvider>
        </AuthProvider>
      </BrowserRouter>
    );
  };

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

// Helper to clean up after tests
export const cleanupAuth = () => {
  localStorage.removeItem("auth");
};
