import React from "react";
import { render, waitFor } from "@testing-library/react";
import Orders from "./Orders";
import axios from "axios";
import * as authContext from "../../context/auth";
import moment from "moment";

jest.mock("axios");
jest.mock("../../components/UserMenu", () => () => <div data-testid="user-menu">UserMenu</div>);
jest.mock("./../../components/Layout", () => (props) => <div data-testid="layout">{props.children}</div>);

const mockSetAuth = jest.fn();

describe("Orders Page", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(authContext, "useAuth").mockReturnValue([
            { token: "mock-token" },
            mockSetAuth,
        ]);
        jest.spyOn(console, "error").mockImplementation(() => { });
        jest.spyOn(console, "log").mockImplementation(() => { });
    });

    it("renders layout and user menu", () => {
        axios.get.mockResolvedValueOnce({ data: [] });
        const { getByTestId, getByText } = render(<Orders />);
        expect(getByTestId("layout")).toBeInTheDocument();
        expect(getByTestId("user-menu")).toBeInTheDocument();
        expect(getByText("All Orders")).toBeInTheDocument();
    });

    it("fetches and displays orders", async () => {
        const mockOrders = [
            {
                _id: "order1",
                status: "Delivered",
                buyer: { name: "Alice" },
                createdAt: "2025-02-04T13:42:16.741Z",
                payment: { success: true },
                products: [
                    {
                        _id: "prod1",
                        name: "T-shirt",
                        description: "From NUS",
                        price: 10.5,
                    },
                ],
            },
        ];
        axios.get.mockResolvedValueOnce({ data: { orders: mockOrders } });

        const { getByText, getByTestId } = render(<Orders />);
        await waitFor(() => {
            expect(getByText("Delivered")).toBeInTheDocument();
            expect(getByText("Alice")).toBeInTheDocument();
            expect(getByText("Success")).toBeInTheDocument();
            expect(getByTestId("order-quantity").textContent).toBe("1");
            expect(getByText("T-shirt")).toBeInTheDocument();
            expect(getByText("From NUS")).toBeInTheDocument();
            expect(getByText("Price : 10.5")).toBeInTheDocument();
        });
    });

    it("shows 'Failed' if payment is not successful", async () => {
        const mockOrders = [
            {
                _id: "order2",
                status: "Pending",
                buyer: { name: "Bob" },
                createAt: "2025-02-04T13:42:16.741Z",
                payment: { success: false },
                products: [],
            },
        ];
        axios.get.mockResolvedValueOnce({ data: { orders: mockOrders } });

        const { getByText } = render(<Orders />);
        await waitFor(() => {
            expect(getByText("Failed")).toBeInTheDocument();
        });
    });

    it("does not fetch orders if no token", () => {
        jest.spyOn(authContext, "useAuth").mockReturnValue([{}, mockSetAuth]);
        render(<Orders />);
        expect(axios.get).not.toHaveBeenCalled();
    });

    it("does not display any products if order fetch fails", async () => {
        axios.get.mockRejectedValueOnce(new Error("API Error"));
        const { getByTestId, queryByTestId } = render(<Orders />);
        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/orders");
            expect(getByTestId("layout")).toBeInTheDocument();
            expect(getByTestId("user-menu")).toBeInTheDocument();
            expect(queryByTestId("order-status-container")).toBeNull();
            expect(queryByTestId("order-products-container")).toBeNull();
        });
    });
});