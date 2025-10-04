import React from "react";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import Layout from "./Layout";
import "@testing-library/jest-dom/extend-expect";
import { Helmet } from "react-helmet";

// Mock dependencies
jest.mock("./Header", () => ({
  __esModule: true,
  default: () => <div data-testid="header">Header</div>,
}));

jest.mock("./Footer", () => ({
  __esModule: true,
  default: () => <div data-testid="footer">Footer</div>,
}));

jest.mock("react-hot-toast", () => ({
  Toaster: () => <div data-testid="toaster">Toaster</div>,
}));

describe("Layout Component", () => {
  it("should render Header, Footer, and children", () => {
    render(
      <BrowserRouter>
        <Layout>
          <div data-testid="child-content">Test Content</div>
        </Layout>
      </BrowserRouter>
    );

    expect(screen.getByTestId("header")).toBeInTheDocument();
    expect(screen.getByTestId("footer")).toBeInTheDocument();
    expect(screen.getByTestId("child-content")).toBeInTheDocument();
    expect(screen.getByText("Test Content")).toBeInTheDocument();
  });

  it("should render Toaster component", () => {
    render(
      <BrowserRouter>
        <Layout>
          <div>Content</div>
        </Layout>
      </BrowserRouter>
    );

    expect(screen.getByTestId("toaster")).toBeInTheDocument();
  });

  it("should render main element with correct styles", () => {
    const { container } = render(
      <BrowserRouter>
        <Layout>
          <div>Content</div>
        </Layout>
      </BrowserRouter>
    );

    const mainElement = container.querySelector("main");
    expect(mainElement).toBeInTheDocument();
    expect(mainElement).toHaveStyle({ minHeight: "70vh" });
  });

  describe("Helmet Meta Tags", () => {
    it("should set default meta tags when no props provided", () => {
      render(
        <BrowserRouter>
          <Layout>
            <div>Content</div>
          </Layout>
        </BrowserRouter>
      );

      const helmet = Helmet.peek();
      expect(helmet.title).toBe("Ecommerce app - shop now");
      expect(helmet.metaTags).toContainEqual({
        name: "description",
        content: "mern stack project",
      });
      expect(helmet.metaTags).toContainEqual({
        name: "keywords",
        content: "mern,react,node,mongodb",
      });
      expect(helmet.metaTags).toContainEqual({
        name: "author",
        content: "Techinfoyt",
      });
    });

    it("should set custom meta tags when props provided", () => {
      render(
        <BrowserRouter>
          <Layout
            title="Custom Title"
            description="Custom description"
            keywords="custom,keywords"
            author="Custom Author"
          >
            <div>Content</div>
          </Layout>
        </BrowserRouter>
      );

      const helmet = Helmet.peek();
      expect(helmet.title).toBe("Custom Title");
      expect(helmet.metaTags).toContainEqual({
        name: "description",
        content: "Custom description",
      });
      expect(helmet.metaTags).toContainEqual({
        name: "keywords",
        content: "custom,keywords",
      });
      expect(helmet.metaTags).toContainEqual({
        name: "author",
        content: "Custom Author",
      });
    });

    it("should set charset meta tag", () => {
      render(
        <BrowserRouter>
          <Layout>
            <div>Content</div>
          </Layout>
        </BrowserRouter>
      );

      const helmet = Helmet.peek();
      expect(helmet.metaTags).toContainEqual({
        charset: "utf-8",
      });
    });

    it("should override only specific props while keeping defaults", () => {
      render(
        <BrowserRouter>
          <Layout title="Override Title Only">
            <div>Content</div>
          </Layout>
        </BrowserRouter>
      );

      const helmet = Helmet.peek();
      expect(helmet.title).toBe("Override Title Only");
      // Other props should still have defaults
      expect(helmet.metaTags).toContainEqual({
        name: "description",
        content: "mern stack project",
      });
      expect(helmet.metaTags).toContainEqual({
        name: "keywords",
        content: "mern,react,node,mongodb",
      });
      expect(helmet.metaTags).toContainEqual({
        name: "author",
        content: "Techinfoyt",
      });
    });
  });

  describe("Children Rendering", () => {
    it("should render multiple children", () => {
      render(
        <BrowserRouter>
          <Layout>
            <div data-testid="child1">Child 1</div>
            <div data-testid="child2">Child 2</div>
            <div data-testid="child3">Child 3</div>
          </Layout>
        </BrowserRouter>
      );

      expect(screen.getByTestId("child1")).toBeInTheDocument();
      expect(screen.getByTestId("child2")).toBeInTheDocument();
      expect(screen.getByTestId("child3")).toBeInTheDocument();
    });

    it("should render complex nested children", () => {
      render(
        <BrowserRouter>
          <Layout>
            <div>
              <h1>Title</h1>
              <p>Paragraph</p>
              <button>Button</button>
            </div>
          </Layout>
        </BrowserRouter>
      );

      expect(screen.getByText("Title")).toBeInTheDocument();
      expect(screen.getByText("Paragraph")).toBeInTheDocument();
      expect(screen.getByText("Button")).toBeInTheDocument();
    });

    it("should render when children is null", () => {
      render(
        <BrowserRouter>
          <Layout>{null}</Layout>
        </BrowserRouter>
      );

      expect(screen.getByTestId("header")).toBeInTheDocument();
      expect(screen.getByTestId("footer")).toBeInTheDocument();
    });
  });

  describe("Default Props", () => {
    it("should have correct defaultProps defined", () => {
      expect(Layout.defaultProps).toEqual({
        title: "Ecommerce app - shop now",
        description: "mern stack project",
        keywords: "mern,react,node,mongodb",
        author: "Techinfoyt",
      });
    });
  });
});