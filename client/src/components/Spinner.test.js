import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import Spinner from "./Spinner";
import "@testing-library/jest-dom/extend-expect";

const mockNavigate = jest.fn();
const mockLocation = { pathname: "/current-path" };

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
  useLocation: () => mockLocation,
}));

describe("Spinner Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it("should render spinner with count 3", () => {
    render(
      <BrowserRouter>
        <Spinner />
      </BrowserRouter>
    );

    expect(screen.getByText("redirecting to you in 3 second")).toBeInTheDocument();
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("should navigate to default login path after countdown", async () => {
    render(
      <BrowserRouter>
        <Spinner />
      </BrowserRouter>
    );

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/login", {
        state: "/current-path",
      });
    });
  });

  it("should navigate to custom path after countdown", async () => {
    render(
      <BrowserRouter>
        <Spinner path="dashboard" />
      </BrowserRouter>
    );

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard", {
        state: "/current-path",
      });
    });
  });

  it("should decrement count each second", async () => {
    render(
      <BrowserRouter>
        <Spinner />
      </BrowserRouter>
    );

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(screen.getByText("redirecting to you in 2 second")).toBeInTheDocument();
    });
  });
});