import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Policy from "./Policy";
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

describe("Policy Component", () => {
  it("should render policy page with all elements", () => {
    render(
      <MemoryRouter>
        <Policy />
      </MemoryRouter>
    );

    const policyTexts = screen.getAllByText("add privacy policy");
    expect(policyTexts).toHaveLength(7);
  });

  it("should render policy image with correct attributes", () => {
    render(
      <MemoryRouter>
        <Policy />
      </MemoryRouter>
    );

    const image = screen.getByAltText("contactus");
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute("src", "/images/contactus.jpeg");
    expect(image).toHaveStyle({ width: "100%" });
  });

  it("should pass correct title to Layout", () => {
    render(
      <MemoryRouter>
        <Policy />
      </MemoryRouter>
    );

    const layout = screen.getByTestId("layout");
    expect(layout).toHaveAttribute("title", "Privacy Policy");
  });
});