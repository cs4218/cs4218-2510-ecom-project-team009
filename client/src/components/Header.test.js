import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import Header from "./Header";
import "@testing-library/jest-dom/extend-expect";
import toast from "react-hot-toast";

// Mock dependencies
jest.mock("react-hot-toast");

jest.mock("./Form/SearchInput", () => ({
  __esModule: true,
  default: () => <div data-testid="search-input">SearchInput</div>,
}));

jest.mock("../hooks/useCategory", () => ({
  __esModule: true,
  default: jest.fn(),
}));

const mockSetAuth = jest.fn();
const mockUseAuth = jest.fn();
const mockUseCart = jest.fn();

jest.mock("../context/auth", () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock("../context/cart", () => ({
  useCart: () => mockUseCart(),
}));

const useCategory = require("../hooks/useCategory").default;

describe("Header Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    mockUseCart.mockReturnValue([[]]);
    useCategory.mockReturnValue([]);
  });

  describe("Logged Out State", () => {
    it("should render Register and Login links when user is not authenticated", () => {
      mockUseAuth.mockReturnValue([{ user: null, token: "" }, mockSetAuth]);

      render(
        <BrowserRouter>
          <Header />
        </BrowserRouter>
      );

      expect(screen.getByText("Register")).toBeInTheDocument();
      expect(screen.getByText("Login")).toBeInTheDocument();
      expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
      expect(screen.queryByText("Logout")).not.toBeInTheDocument();
    });
  });

  describe("Logged In State", () => {
    it("should render user name and Dashboard/Logout when authenticated as user", () => {
      mockUseAuth.mockReturnValue([
        { user: { name: "John Doe", role: 0 }, token: "token123" },
        mockSetAuth,
      ]);

      render(
        <BrowserRouter>
          <Header />
        </BrowserRouter>
      );

      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.getByText("Dashboard")).toBeInTheDocument();
      expect(screen.getByText("Logout")).toBeInTheDocument();
      expect(screen.queryByText("Register")).not.toBeInTheDocument();
      expect(screen.queryByText("Login")).not.toBeInTheDocument();
    });

    it("should render admin dashboard link when authenticated as admin", () => {
      mockUseAuth.mockReturnValue([
        { user: { name: "Admin User", role: 1 }, token: "admintoken" },
        mockSetAuth,
      ]);

      render(
        <BrowserRouter>
          <Header />
        </BrowserRouter>
      );

      const dashboardLink = screen.getByText("Dashboard").closest("a");
      expect(dashboardLink).toHaveAttribute("href", "/dashboard/admin");
    });

    it("should render user dashboard link when authenticated as regular user", () => {
      mockUseAuth.mockReturnValue([
        { user: { name: "Regular User", role: 0 }, token: "usertoken" },
        mockSetAuth,
      ]);

      render(
        <BrowserRouter>
          <Header />
        </BrowserRouter>
      );

      const dashboardLink = screen.getByText("Dashboard").closest("a");
      expect(dashboardLink).toHaveAttribute("href", "/dashboard/user");
    });
  });

  describe("Logout Functionality", () => {
    it("should handle logout correctly", () => {
      const mockAuth = { user: { name: "John Doe", role: 0 }, token: "token123" };
      mockUseAuth.mockReturnValue([mockAuth, mockSetAuth]);

      localStorage.setItem("auth", JSON.stringify(mockAuth));

      render(
        <BrowserRouter>
          <Header />
        </BrowserRouter>
      );

      const logoutButton = screen.getByText("Logout");
      fireEvent.click(logoutButton);

      expect(mockSetAuth).toHaveBeenCalledWith({
        ...mockAuth,
        user: null,
        token: "",
      });
      expect(localStorage.getItem("auth")).toBeNull();
      expect(toast.success).toHaveBeenCalledWith("Logout Successfully");
    });
  });

  describe("Categories", () => {
    it("should render categories dropdown with links", () => {
      mockUseAuth.mockReturnValue([{ user: null, token: "" }, mockSetAuth]);
      useCategory.mockReturnValue([
        { _id: "1", name: "Electronics", slug: "electronics" },
        { _id: "2", name: "Clothing", slug: "clothing" },
      ]);

      render(
        <BrowserRouter>
          <Header />
        </BrowserRouter>
      );

      expect(screen.getByText("Categories")).toBeInTheDocument();
      expect(screen.getByText("All Categories")).toBeInTheDocument();
      expect(screen.getByText("Electronics")).toBeInTheDocument();
      expect(screen.getByText("Clothing")).toBeInTheDocument();

      const electronicsLink = screen.getByText("Electronics").closest("a");
      expect(electronicsLink).toHaveAttribute("href", "/category/electronics");
    });

    it("should render empty categories dropdown when no categories", () => {
      mockUseAuth.mockReturnValue([{ user: null, token: "" }, mockSetAuth]);
      useCategory.mockReturnValue([]);

      render(
        <BrowserRouter>
          <Header />
        </BrowserRouter>
      );

      expect(screen.getByText("Categories")).toBeInTheDocument();
      expect(screen.getByText("All Categories")).toBeInTheDocument();
    });

    it("should render categories link to /categories", () => {
      mockUseAuth.mockReturnValue([{ user: null, token: "" }, mockSetAuth]);
      useCategory.mockReturnValue([]);

      render(
        <BrowserRouter>
          <Header />
        </BrowserRouter>
      );

      const allCategoriesLink = screen.getByText("All Categories").closest("a");
      expect(allCategoriesLink).toHaveAttribute("href", "/categories");
    });
  });

  describe("Cart Badge", () => {
    it("should display cart badge with correct count", () => {
      mockUseAuth.mockReturnValue([{ user: null, token: "" }, mockSetAuth]);
      mockUseCart.mockReturnValue([[{ id: 1 }, { id: 2 }, { id: 3 }]]);

      render(
        <BrowserRouter>
          <Header />
        </BrowserRouter>
      );

      expect(screen.getByText("Cart")).toBeInTheDocument();
      expect(screen.getByText("3")).toBeInTheDocument();
    });

    it("should show zero when cart is empty", () => {
      mockUseAuth.mockReturnValue([{ user: null, token: "" }, mockSetAuth]);
      mockUseCart.mockReturnValue([[]]);

      render(
        <BrowserRouter>
          <Header />
        </BrowserRouter>
      );

      expect(screen.getByText("Cart")).toBeInTheDocument();
      expect(screen.getByText("0")).toBeInTheDocument();
    });

    it("should render cart link to /cart", () => {
      mockUseAuth.mockReturnValue([{ user: null, token: "" }, mockSetAuth]);
      mockUseCart.mockReturnValue([[]]);

      render(
        <BrowserRouter>
          <Header />
        </BrowserRouter>
      );

      const cartLink = screen.getByText("Cart").closest("a");
      expect(cartLink).toHaveAttribute("href", "/cart");
    });
  });

  describe("Common Elements", () => {
    it("should render brand logo and navigation links", () => {
      mockUseAuth.mockReturnValue([{ user: null, token: "" }, mockSetAuth]);

      render(
        <BrowserRouter>
          <Header />
        </BrowserRouter>
      );

      expect(screen.getByText("🛒 Virtual Vault")).toBeInTheDocument();
      expect(screen.getByText("Home")).toBeInTheDocument();
    });

    it("should render SearchInput component", () => {
      mockUseAuth.mockReturnValue([{ user: null, token: "" }, mockSetAuth]);

      render(
        <BrowserRouter>
          <Header />
        </BrowserRouter>
      );

      expect(screen.getByTestId("search-input")).toBeInTheDocument();
    });

    it("should render brand link to home page", () => {
      mockUseAuth.mockReturnValue([{ user: null, token: "" }, mockSetAuth]);

      render(
        <BrowserRouter>
          <Header />
        </BrowserRouter>
      );

      const brandLink = screen.getByText("🛒 Virtual Vault").closest("a");
      expect(brandLink).toHaveAttribute("href", "/");
    });

    it("should render navbar toggler button", () => {
      mockUseAuth.mockReturnValue([{ user: null, token: "" }, mockSetAuth]);

      const { container } = render(
        <BrowserRouter>
          <Header />
        </BrowserRouter>
      );

      const toggleButton = container.querySelector(".navbar-toggler");
      expect(toggleButton).toBeInTheDocument();
      expect(toggleButton).toHaveAttribute("type", "button");
      expect(toggleButton).toHaveAttribute("data-bs-toggle", "collapse");
    });
  });

  describe("Navigation Links", () => {
    it("should render Register link with correct href", () => {
      mockUseAuth.mockReturnValue([{ user: null, token: "" }, mockSetAuth]);

      render(
        <BrowserRouter>
          <Header />
        </BrowserRouter>
      );

      const registerLink = screen.getByText("Register").closest("a");
      expect(registerLink).toHaveAttribute("href", "/register");
    });

    it("should render Login link with correct href when logged out", () => {
      mockUseAuth.mockReturnValue([{ user: null, token: "" }, mockSetAuth]);

      render(
        <BrowserRouter>
          <Header />
        </BrowserRouter>
      );

      const loginLink = screen.getByText("Login").closest("a");
      expect(loginLink).toHaveAttribute("href", "/login");
    });

    it("should render Home link with correct href", () => {
      mockUseAuth.mockReturnValue([{ user: null, token: "" }, mockSetAuth]);

      render(
        <BrowserRouter>
          <Header />
        </BrowserRouter>
      );

      const homeLink = screen.getByText("Home").closest("a");
      expect(homeLink).toHaveAttribute("href", "/");
    });
  });
});