import React from "react";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import Pagenotfound from "./Pagenotfound";
import "@testing-library/jest-dom/extend-expect";

// Mock context providers
jest.mock("../context/auth", () => ({
  useAuth: () => [{ user: null, token: "" }, jest.fn()],
}));

jest.mock("../context/cart", () => ({
  useCart: () => [[], jest.fn()],
}));

jest.mock("../hooks/useCategory", () => ({
  __esModule: true,
  default: () => [],
}));

// Mock Layout component
jest.mock("../components/Layout", () => ({
  __esModule: true,
  default: ({ children, title }) => (
    <div data-testid="layout" title={title}>
      {children}
    </div>
  ),
}));

describe("Pagenotfound Component", () => {
  it("should render 404 page with all elements", () => {
    render(
      <BrowserRouter>
        <Pagenotfound />
      </BrowserRouter>
    );

    expect(screen.getByText("404")).toBeInTheDocument();
    expect(screen.getByText("Oops ! Page Not Found")).toBeInTheDocument();
    
    const goBackLink = screen.getByText("Go Back");
    expect(goBackLink).toBeInTheDocument();
    expect(goBackLink.closest("a")).toHaveAttribute("href", "/");
  });

  it("should pass correct title to Layout", () => {
    render(
      <BrowserRouter>
        <Pagenotfound />
      </BrowserRouter>
    );

    const layout = screen.getByTestId("layout");
    expect(layout).toHaveAttribute("title", "go back- page not found");
  });
});