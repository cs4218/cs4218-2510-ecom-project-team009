import React from "react";
import { render } from "@testing-library/react";
import Search from "./Search";
import * as searchContext from "../context/search";

jest.mock("./../components/Layout", () => (props) => (
    <div data-testid="layout">{props.children}</div>
));

jest.mock("../context/search");

const mockProducts = [
    {
        _id: "1",
        name: "Product 1",
        description: "product 1 description",
        price: 1,
    },
    {
        _id: "2",
        name: "Product 2",
        description: "product 2 description",
        price: 2,
    },
];

describe("Search Page", () => {
    it("renders the page correctly", () => {
        searchContext.useSearch.mockReturnValue([
            {
                results: mockProducts,
            },
            jest.fn(),
        ]);
        const { getByTestId, getByText } = render(<Search />);
        expect(getByTestId("layout")).toBeInTheDocument();
        expect(getByTestId("search-page-container")).toBeInTheDocument();
        expect(getByTestId("search-page-card-container")).toBeInTheDocument();
        expect(getByText("Search Results")).toBeInTheDocument();
    });

    it("renders search results when products are found", () => {
        searchContext.useSearch.mockReturnValue([
            {
                results: mockProducts,
            },
            jest.fn(),
        ]);
        const { getByText, getAllByText } = render(<Search />);
        expect(getByText("Found 2")).toBeInTheDocument();
        expect(getByText("Product 1")).toBeInTheDocument();
        expect(getByText("Product 2")).toBeInTheDocument();
        expect(getAllByText("More Details")).toHaveLength(2);
        expect(getAllByText("ADD TO CART")).toHaveLength(2);
    });

    it("shows no product found when results is empty", () => {
        searchContext.useSearch.mockReturnValue([
            {
                results: [],
            },
            jest.fn(),
        ]);
        const { getByText } = render(<Search />);
        expect(getByText("No Products Found")).toBeInTheDocument();
    });
});