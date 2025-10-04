import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react";
import SearchInput from "./SearchInput";
import { useSearch } from "../../context/search";
import axios from "axios";
import { useNavigate } from "react-router-dom";

jest.mock("../../context/search");
jest.mock("axios");
jest.mock("react-router-dom", () => ({
    useNavigate: jest.fn(),
}));

describe("SearchInput component", () => {
    const mockSetValues = jest.fn();
    const mockNavigate = jest.fn();

    beforeEach(() => {
        useSearch.mockReturnValue([
            { keyword: "", results: [] },
            mockSetValues,
        ]);
        require("react-router-dom").useNavigate.mockReturnValue(mockNavigate);
        jest.spyOn(console, "log").mockImplementation(() => {});
        jest.clearAllMocks();
    });

    it("renders input and button", () => {
        const { getByTestId } = render(<SearchInput />);
        expect(getByTestId("search-input")).toBeInTheDocument();
        expect(getByTestId("search-button")).toBeInTheDocument();
    });

    it("updates keyword on input change", () => {
        const { getByTestId } = render(<SearchInput />);
        const input = getByTestId("search-input");
        fireEvent.change(input, { target: { value: "laptop" } });
        expect(mockSetValues).toHaveBeenCalledWith({ keyword: "laptop", results: [] });
    });

    it("submits form, calls API, updates results, and navigates", async () => {
        useSearch.mockReturnValue([
            { keyword: "phone", results: [] },
            mockSetValues,
        ]);
        axios.get.mockResolvedValueOnce({ data: ["mockResult"] });

        const { getByTestId } = render(<SearchInput />);
        fireEvent.click(getByTestId("search-button"));

        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith("/api/v1/product/search/phone");
            expect(mockSetValues).toHaveBeenCalledWith({
                keyword: "phone",
                results: ["mockResult"],
            });
            expect(mockNavigate).toHaveBeenCalledWith("/search");
        });
    });

    it("does not navigate on API error", async () => {
        useSearch.mockReturnValue([
            { keyword: "error", results: [] },
            mockSetValues,
        ]);
        axios.get.mockRejectedValueOnce(new Error("API Error"));

        const { getByTestId } = render(<SearchInput />);
        fireEvent.click(getByTestId("search-button"));

        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith("/api/v1/product/search/error");
            expect(mockNavigate).not.toHaveBeenCalledWith("/search");
        });
    });
});