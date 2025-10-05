import React from "react";
import { render, act } from "@testing-library/react";
import { useSearch, SearchProvider } from "./search";

const TestConsumer = () => {
    const [search, setSearch] = useSearch();
    return (
        <div>
            <span data-testid="keyword">{search.keyword}</span>
            <span data-testid="results">{search.results.length}</span>
            <button
                data-testid="set-keyword"
                onClick={() => setSearch((prev) => ({ ...prev, keyword: "test" }))}
            >
                Set Keyword
            </button>
            <button
                data-testid="set-results"
                onClick={() => setSearch((prev) => ({ ...prev, results: [1, 2, 3] }))}
            >
                Set Results
            </button>
        </div>
    );
};

describe("SearchProvider", () => {
    it("initializes with default values", () => {
        const { getByTestId } = render(
            <SearchProvider>
                <TestConsumer />
            </SearchProvider>
        );

        expect(getByTestId("keyword").textContent).toBe("");
        expect(getByTestId("results").textContent).toBe("0");
    });

    it("updates keyword", () => {
        const { getByTestId } = render(
            <SearchProvider>
                <TestConsumer />
            </SearchProvider>
        );

        expect(getByTestId("keyword").textContent).toBe("");
        act(() => {
            getByTestId("set-keyword").click();
        });
        expect(getByTestId("keyword").textContent).toBe("test");
    });

    it("updates results", () => {
        const { getByTestId } = render(
            <SearchProvider>
                <TestConsumer />
            </SearchProvider>
        );

        expect(getByTestId("results").textContent).toBe("0");
        act(() => {
            getByTestId("set-results").click();
        });
        expect(getByTestId("results").textContent).toBe("3");
    });
});