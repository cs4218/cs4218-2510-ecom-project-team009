import React from "react";
import { render, waitFor } from "@testing-library/react";
import axios from "axios";
import UserList from "./UserList";
import toast from "react-hot-toast";

jest.mock("axios");
jest.mock("react-hot-toast");

const mockUsers = [
    {
        _id: "1",
        name: "Alice",
        email: "alice@example.com",
        phone: "93245131",
        address: "Pasir ris",
    },
    {
        _id: "2",
        name: "Bob",
        email: "bob@example.com",
        phone: "84293141",
        address: "Clementi",
    },
];

beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

describe("UserList Component", () => {
    it("shows loading before data is fetched", () => {
        const { getByText } = render(<UserList />);
        expect(getByText("Loading...")).toBeInTheDocument();
    });

    it("renders user table after fetch", async () => {
        axios.get.mockResolvedValueOnce({
            data: { success: true, users: mockUsers },
        });

        const { getByText } = render(<UserList />);
        await waitFor(() => {
            expect(getByText("Alice")).toBeInTheDocument();
            expect(getByText("alice@example.com")).toBeInTheDocument();
            expect(getByText("Pasir ris")).toBeInTheDocument();
            expect(getByText("Bob")).toBeInTheDocument();
            expect(getByText("bob@example.com")).toBeInTheDocument();
            expect(getByText("Clementi")).toBeInTheDocument();
        });
    });

    it("handles fetch error gracefully and shows toast", async () => {
        axios.get.mockRejectedValueOnce(new Error("Network Error"));
        const { queryByText } = render(<UserList />);
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith("Unable to get users due to network error");
            expect(queryByText("Loading...")).toBeFalsy();
        });
    });
});