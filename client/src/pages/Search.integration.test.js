import React from "react";
import { screen } from "@testing-library/react";
import { Route } from "react-router-dom";
import { renderTopDown } from "../test-utils/renderTopDown";
import Search from "./Search";

const renderSearchRoute = (searchValues = { keyword: "", results: [] }) =>
    renderTopDown(
        <Route path="/search" element={<Search />} />,
        {
            initialSearchState: searchValues,
            route: "/search",
        }
    );

describe("Search page integration", () => {
    it("renders heading and no products found message when results are empty", () => {
        renderSearchRoute({ keyword: "", results: [] });

        expect(screen.getByText(/Search Results/i)).toBeInTheDocument();
        expect(screen.getByText(/No Products Found/i)).toBeInTheDocument();
        expect(screen.queryByTestId("search-result-item")).not.toBeInTheDocument();
    });

    it("renders correct number of product cards when results are present", async () => {
        const mockResults = [
            {
                _id: "p1",
                name: "Laptop",
                description: "A powerful laptop for work and play.",
                price: 999.99,
            },
            {
                _id: "p2",
                name: "Phone",
                description: "A smart phone with great camera.",
                price: 499.99,
            },
        ];

        renderSearchRoute({ keyword: "", results: mockResults });

        expect(screen.getByText(/Found 2/i)).toBeInTheDocument();

        const cards = await screen.findAllByTestId("search-result-item");
        expect(cards).toHaveLength(2);

        expect(screen.getByText("Laptop")).toBeInTheDocument();
        expect(screen.getByText("Phone")).toBeInTheDocument();
        expect(screen.getByText(/\$ 999.99/)).toBeInTheDocument();
        expect(screen.getByText(/\$ 499.99/)).toBeInTheDocument();
    });

    it("renders product card buttons", () => {
        const mockResults = [
            {
                _id: "p1",
                name: "Laptop",
                description: "A powerful laptop for work and play.",
                price: 999.99,
            },
        ];

        renderSearchRoute({ results: mockResults });

        expect(screen.getByRole("button", { name: /More Details/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /ADD TO CART/i })).toBeInTheDocument();
    });
});