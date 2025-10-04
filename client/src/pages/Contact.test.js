import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Contact from "./Contact";
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

describe("Contact Component", () => {
  it("should render contact page with all elements", () => {
    render(
      <MemoryRouter>
        <Contact />
      </MemoryRouter>
    );

    expect(screen.getByText("CONTACT US")).toBeInTheDocument();
    expect(
      screen.getByText(
        /For any query or info about product, feel free to call anytime. We are available 24X7./
      )
    ).toBeInTheDocument();
    expect(screen.getByText(/www.help@ecommerceapp.com/)).toBeInTheDocument();
    expect(screen.getByText(/012-3456789/)).toBeInTheDocument();
    expect(screen.getByText(/1800-0000-0000 \(toll free\)/)).toBeInTheDocument();
  });

  it("should render contact image with correct attributes", () => {
    render(
      <MemoryRouter>
        <Contact />
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
        <Contact />
      </MemoryRouter>
    );

    const layout = screen.getByTestId("layout");
    expect(layout).toHaveAttribute("title", "Contact us");
  });
});