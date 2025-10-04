import React from "react";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import Contact from "./Contact";
import "@testing-library/jest-dom/extend-expect";

jest.mock("react-icons/bi", () => ({
  BiMailSend: () => <span data-testid="mail-icon">📧</span>,
  BiPhoneCall: () => <span data-testid="phone-icon">📞</span>,
  BiSupport: () => <span data-testid="support-icon">💬</span>,
}));

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
  default: ({ children }) => (
    <div data-testid="layout">
      {children}
    </div>
  ),
}));

describe("Contact Component", () => {
  it("should render contact page with all elements", () => {
    render(
      <BrowserRouter>
        <Contact />
      </BrowserRouter>
    );

    expect(screen.getByText("CONTACT US")).toBeInTheDocument();
    expect(
      screen.getByText(
        /For any query or info about product, feel free to call anytime/
      )
    ).toBeInTheDocument();
    expect(screen.getByText(/www.help@ecommerceapp.com/)).toBeInTheDocument();
    expect(screen.getByText(/012-3456789/)).toBeInTheDocument();
    expect(screen.getByText(/1800-0000-0000/)).toBeInTheDocument();
  });

  it("should render contact image with correct attributes", () => {
    render(
      <BrowserRouter>
        <Contact />
      </BrowserRouter>
    );

    const image = screen.getByAltText("contactus");
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute("src", "/images/contactus.jpeg");
  });

  it("should render layout wrapper", () => {
    render(
      <BrowserRouter>
        <Contact />
      </BrowserRouter>
    );

    expect(screen.getByTestId("layout")).toBeInTheDocument();
  });
});