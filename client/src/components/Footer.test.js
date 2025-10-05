import React from "react";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import Footer from "./Footer";
import "@testing-library/jest-dom/extend-expect";

describe("Footer Component", () => {
  it("should render footer with all links and text", () => {
    render(
      <BrowserRouter>
        <Footer />
      </BrowserRouter>
    );

    // Check copyright text
    expect(screen.getByText(/All Rights Reserved © TestingComp/)).toBeInTheDocument();

    // Check links exist
    const aboutLink = screen.getByText("About");
    const contactLink = screen.getByText("Contact");
    const privacyLink = screen.getByText("Privacy Policy");

    expect(aboutLink).toBeInTheDocument();
    expect(contactLink).toBeInTheDocument();
    expect(privacyLink).toBeInTheDocument();

    // Check link destinations
    expect(aboutLink.closest("a")).toHaveAttribute("href", "/about");
    expect(contactLink.closest("a")).toHaveAttribute("href", "/contact");
    expect(privacyLink.closest("a")).toHaveAttribute("href", "/policy");
  });

  it("should have correct CSS classes", () => {
    const { container } = render(
      <BrowserRouter>
        <Footer />
      </BrowserRouter>
    );

    expect(container.querySelector(".footer")).toBeInTheDocument();
    expect(container.querySelector(".text-center")).toBeInTheDocument();
    expect(container.querySelector(".mt-3")).toBeInTheDocument();
  });
});