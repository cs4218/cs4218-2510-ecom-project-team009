import React from "react";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import About from "./About";
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

describe("About Component", () => {
  it("should render about page with image and text", () => {
    render(
      <BrowserRouter>
        <About />
      </BrowserRouter>
    );

    expect(screen.getByText("Add text")).toBeInTheDocument();
    
    const image = screen.getByAltText("contactus");
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute("src", "/images/about.jpeg");
    expect(image).toHaveStyle({ width: "100%" });
  });

  it("should pass correct title to Layout", () => {
    render(
      <BrowserRouter>
        <About />
      </BrowserRouter>
    );

    const layout = screen.getByTestId("layout");
    expect(layout).toHaveAttribute("title", "About us - Ecommerce app");
  });
});