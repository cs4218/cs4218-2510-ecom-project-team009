import React from "react";
import { screen, waitFor } from "@testing-library/react";
import { Route } from "react-router-dom";
import { renderTopDown } from "../../test-utils/renderTopDown";
import Users from "./Users";
import axios from "axios";

jest.mock("axios");
jest.mock("../../hooks/useCategory", () => ({
    __esModule: true,
    default: jest.fn(() => []),
}));

const renderUsersRoute = (options) =>
    renderTopDown(
        <Route path="/dashboard/admin/users" element={<Users />} />,
        options
    );

describe("Users admin page integration", () => {
    const mockUsers = [
        { _id: "1", name: "User One", email: "one@example.com", phone: "111", address: "Addr 1" },
        { _id: "2", name: "User Two", email: "two@example.com", phone: "222", address: "Addr 2" },
    ];

    const mockAdmin = { name: "Admin", email: "admin@example.com" }

    beforeEach(() => {
        jest.clearAllMocks();
        localStorage.clear();
    });

    it("renders a list of all users", async () => {
        axios.get.mockResolvedValueOnce({
            data: { success: true, users: mockUsers },
        });

        renderUsersRoute({
            initialAuthState: {
                user: mockAdmin,
                token: "admin-token",
            },
            route: "/dashboard/admin/users",
        });


        await waitFor(() => {
            expect(screen.getByText("All Users")).toBeInTheDocument();
            expect(screen.getByTestId("user-list-table")).toBeInTheDocument();
        });

        expect(screen.getByText("User One")).toBeInTheDocument();
        expect(screen.getByText("one@example.com")).toBeInTheDocument();
        expect(screen.getByText("User Two")).toBeInTheDocument();
        expect(screen.getByText("two@example.com")).toBeInTheDocument();
    });

    it("renders AdminMenu and UserList", async () => {
        renderUsersRoute({
            initialAuthState: {
                user: mockAdmin,
                token: "admin-token",
            },
            route: "/dashboard/admin/users",
        });

        await waitFor(() => {
            expect(screen.getByText("All Users")).toBeInTheDocument();
            expect(screen.getByText("Name")).toBeInTheDocument();
        });

        // AdminMenu and UserList are rendered
        expect(screen.getByTestId("admin-menu")).toBeInTheDocument();
        expect(screen.getByTestId("user-list-table")).toBeInTheDocument();
    });
});