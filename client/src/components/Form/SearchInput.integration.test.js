import React from "react";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, MemoryRouter } from "react-router-dom";
import { renderTopDown } from "../../test-utils/renderTopDown";
import SearchInput from "./SearchInput";
import axios from "axios";

jest.mock("axios");

const renderSearchRoute = (options) =>
    renderTopDown(
        <Route path="/" element={<SearchInput />} />,
        options
    );

describe("SearchInput integration tests", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        localStorage.clear();
    });

    it("renders the search input and button", () => {
        renderSearchRoute({
            initialSearchState: { keyword: "", results: [] },
            route: "/",
        });

        expect(screen.getByTestId("search-input")).toBeInTheDocument();
        expect(screen.getByTestId("search-button")).toBeInTheDocument();
    });

    it("updates keyword value on input change", async () => {
        renderSearchRoute({
            initialSearchState: { keyword: "", results: [] },
            route: "/",
        });

        const input = screen.getByTestId("search-input");
        userEvent.type(input, "laptop");
        expect(input).toHaveValue("laptop");
    });

    it("submits search and navigates to /search", async () => {
        axios.get.mockResolvedValueOnce({ data: [{ name: "Laptop" }] });

        renderSearchRoute({
            initialSearchState: { keyword: "", results: [] },
            route: "/",
        });

        const input = screen.getByTestId("search-input");
        userEvent.type(input, "laptop");
        userEvent.click(screen.getByTestId("search-button"));

        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith("/api/v1/product/search/laptop");
        });

    });
});