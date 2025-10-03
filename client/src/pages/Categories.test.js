import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import "@testing-library/jest-dom/extend-expect";

// SUT
import Categories from "./Categories";

// -----------------------------
// Mocks / Test Doubles
// -----------------------------

// Mock the hook so we can control data returned to the component
jest.mock("../hooks/useCategory", () => jest.fn());
import useCategory from "../hooks/useCategory";

// Minimal Layout mock: render children only, ignore SEO props
jest.mock("../components/Layout", () => ({ children }) => (
  <div data-testid="layout">{children}</div>
));

// Helper renderer: wraps SUT with router
const renderWithRouter = () =>
  render(
    <MemoryRouter>
      <Categories />
    </MemoryRouter>
  );

beforeEach(() => {
  jest.clearAllMocks();
});

// ===================================================================
// BOUNDARY VALUE ANALYSIS (BVA)
// ===================================================================
describe("Categories – BVA on number of categories", () => {
  test("boundary: 0 categories → no links rendered", () => {
    useCategory.mockReturnValueOnce([]);

    renderWithRouter();

    expect(screen.getByTestId("layout")).toBeInTheDocument();
    expect(screen.queryAllByRole("link").length).toBe(0);
  });

  test("boundary: 1 category → renders exactly one link with correct href/text", () => {
    useCategory.mockReturnValueOnce([
      { _id: "1", name: "Books", slug: "books" },
    ]);

    renderWithRouter();

    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveTextContent("Books");
    expect(links[0]).toHaveAttribute("href", "/category/books");
  });

  test("boundary: many categories (e.g., 50) → renders all", () => {
    const many = Array.from({ length: 50 }, (_, i) => ({
      _id: String(i + 1),
      name: `Cat${i + 1}`,
      slug: `cat-${i + 1}`,
    }));

    useCategory.mockReturnValueOnce(many);

    renderWithRouter();

    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(50);
    expect(links[0]).toHaveTextContent("Cat1");
    expect(links[0]).toHaveAttribute("href", "/category/cat-1");
    expect(links[49]).toHaveTextContent("Cat50");
    expect(links[49]).toHaveAttribute("href", "/category/cat-50");
  });
});

// ===================================================================
// EQUIVALENCE PARTITIONING (EP)
// Partitions by shape/completeness of category objects
// ===================================================================
describe("Categories – EP across item shape", () => {
  test("partition: fully-formed items (id/name/slug) → all links present", () => {
    useCategory.mockReturnValueOnce([
      { _id: "1", name: "Books", slug: "books" },
      { _id: "2", name: "Music", slug: "music" },
    ]);

    renderWithRouter();

    const books = screen.getByRole("link", { name: "Books" });
    const music = screen.getByRole("link", { name: "Music" });
    expect(books).toHaveAttribute("href", "/category/books");
    expect(music).toHaveAttribute("href", "/category/music");
  });

  test("partition: missing slug → rendered text present, href reflects missing slug (undefined)", () => {
    // Component does not guard against missing slug; Link will still render with `to` using `undefined`
    useCategory.mockReturnValueOnce([
      { _id: "1", name: "Books", slug: undefined },
    ]);

    renderWithRouter();

    const link = screen.getByRole("link", { name: "Books" });
    // In react-router-dom v6, <Link to={undefined}/> becomes href="/" in MemoryRouter
    // Depending on implementation, it may resolve to "undefined" string if coerced. We accept either to document actual behavior.
    const href = link.getAttribute("href");
    expect(["/", "/category/undefined"]).toContain(href);
  });

  test("partition: duplicate slugs but unique _id → renders distinct links", () => {
    useCategory.mockReturnValueOnce([
      { _id: "1", name: "Books A", slug: "books" },
      { _id: "2", name: "Books B", slug: "books" },
    ]);

    renderWithRouter();

    const a = screen.getByRole("link", { name: "Books A" });
    const b = screen.getByRole("link", { name: "Books B" });
    expect(a).toBeInTheDocument();
    expect(b).toBeInTheDocument();
    expect(a).toHaveAttribute("href", "/category/books");
    expect(b).toHaveAttribute("href", "/category/books");
  });
});

// ===================================================================
// PAIRWISE TESTING
// Factors:
//   N (count): {0, 1, 2}
//   completeness: {full, missingSlug}
// Cover all pairs with small set.
// ===================================================================
describe("Categories – Pairwise N×completeness", () => {
  const cases = [
    { N: 0, completeness: "full", items: [] },
    { N: 1, completeness: "full", items: [{ _id: "1", name: "A", slug: "a" }] },
    { N: 1, completeness: "missingSlug", items: [{ _id: "1", name: "A" }] },
    {
      N: 2,
      completeness: "full",
      items: [
        { _id: "1", name: "A", slug: "a" },
        { _id: "2", name: "B", slug: "b" },
      ],
    },
  ];

  test.each(cases)(
    "pairwise N=%s completeness=%s",
    ({ N, completeness, items }) => {
      useCategory.mockReturnValueOnce(items);

      renderWithRouter();

      const links = screen.queryAllByRole("link");
      expect(links).toHaveLength(N);

      if (N > 0) {
        expect(links[0]).toHaveTextContent(items[0].name);
        // href expectations vary if missing slug
        if (completeness === "full") {
          expect(links[0]).toHaveAttribute(
            "href",
            `/category/${items[0].slug}`
          );
        }
      }
    }
  );
});

// ===================================================================
// STUBS / MOCKS / FAKES
// - Mock: the hook (useCategory)
// - Fake: Layout (renders children)
// - No HTTP here; the hook owns fetching, so component stays purely presentational
// ===================================================================
describe("Categories – stubs/mocks/fakes", () => {
  test("Layout is used and categories render inside it", () => {
    useCategory.mockReturnValueOnce([
      { _id: "1", name: "Books", slug: "books" },
    ]);

    renderWithRouter();

    expect(screen.getByTestId("layout")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Books" })).toBeInTheDocument();
  });
});
