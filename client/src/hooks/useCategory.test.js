import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import axios from "axios";

// SUT
import useCategory from "./useCategory";

// ---------------------------------
// Mocks / Test Doubles
// ---------------------------------
jest.mock("axios"); // Mock (test double) for HTTP client

// Fake consumer component to exercise the hook
function CategoryConsumer() {
  const categories = useCategory();
  return (
    <div>
      <div data-testid="type">
        {Array.isArray(categories) ? "array" : String(categories)}
      </div>
      <div data-testid="len">
        {Array.isArray(categories) ? String(categories.length) : "NA"}
      </div>
    </div>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ===================================================================
// BOUNDARY VALUE ANALYSIS (BVA)
// ===================================================================
describe("useCategory – BVA on result sizes", () => {
  test("boundary: empty list (size = 0)", async () => {
    axios.get.mockResolvedValueOnce({ data: { category: [] } });

    render(<CategoryConsumer />);

    // Wait explicitly for len to stabilize to 0
    await waitFor(() =>
      expect(screen.getByTestId("len")).toHaveTextContent("0")
    );
    expect(screen.getByTestId("type")).toHaveTextContent("array");
  });

  test("boundary: single item (size = 1)", async () => {
    axios.get.mockResolvedValueOnce({
      data: { category: [{ id: 1, name: "A" }] },
    });

    render(<CategoryConsumer />);

    // Important: wait on *length* (initial render is already an array of size 0)
    await waitFor(() =>
      expect(screen.getByTestId("len")).toHaveTextContent("1")
    );
    expect(screen.getByTestId("type")).toHaveTextContent("array");
  });

  test("boundary: large list (size = 100)", async () => {
    const big = Array.from({ length: 100 }, (_, i) => ({
      id: i + 1,
      name: `C${i + 1}`,
    }));
    axios.get.mockResolvedValueOnce({ data: { category: big } });

    render(<CategoryConsumer />);

    await waitFor(() =>
      expect(screen.getByTestId("len")).toHaveTextContent("100")
    );
    expect(screen.getByTestId("type")).toHaveTextContent("array");
  });
});

// ===================================================================
// EQUIVALENCE PARTITIONING (EP)
// ===================================================================
describe("useCategory – EP on response/outcome", () => {
  test("partition: valid array → hook returns that array", async () => {
    axios.get.mockResolvedValueOnce({
      data: { category: [{ id: 1, name: "A" }] },
    });

    render(<CategoryConsumer />);

    await waitFor(() =>
      expect(screen.getByTestId("len")).toHaveTextContent("1")
    );
    expect(screen.getByTestId("type")).toHaveTextContent("array");
  });

  test("partition: missing field (data.category is undefined) → hook returns undefined", async () => {
    axios.get.mockResolvedValueOnce({ data: {} });

    render(<CategoryConsumer />);

    await waitFor(() =>
      expect(screen.getByTestId("type")).toHaveTextContent("undefined")
    );
    expect(screen.getByTestId("len")).toHaveTextContent("NA");
  });

  test("partition: null field (data.category === null) → hook returns null", async () => {
    axios.get.mockResolvedValueOnce({ data: { category: null } });

    render(<CategoryConsumer />);

    await waitFor(() =>
      expect(screen.getByTestId("type")).toHaveTextContent("null")
    );
    expect(screen.getByTestId("len")).toHaveTextContent("NA");
  });

  test("partition: request rejects → logs and retains initial []", async () => {
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    axios.get.mockRejectedValueOnce(new Error("boom"));

    render(<CategoryConsumer />);

    await waitFor(() => expect(logSpy).toHaveBeenCalled());
    // After error, state wasn't set; hook still returns initial []
    await waitFor(() =>
      expect(screen.getByTestId("len")).toHaveTextContent("0")
    );
    expect(screen.getByTestId("type")).toHaveTextContent("array");
    logSpy.mockRestore();
  });
});

// ===================================================================
// PAIRWISE TESTING
// ===================================================================
describe("useCategory – Pairwise A×B", () => {
  const cases = [
    {
      A: "resolve",
      B: "array",
      mock: { data: { category: [{ id: 1 }] } },
      expType: "array",
      expLen: "1",
    },
    {
      A: "resolve",
      B: "undefined",
      mock: { data: {} },
      expType: "undefined",
      expLen: "NA",
    },
    {
      A: "reject",
      B: "array",
      error: new Error("x"),
      expType: "array",
      expLen: "0",
    },
  ];

  test.each(cases)(
    "pairwise A=%s B=%s",
    async ({ A, B, mock, error, expType, expLen }) => {
      const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});

      if (A === "resolve") {
        axios.get.mockResolvedValueOnce(mock);
      } else {
        axios.get.mockRejectedValueOnce(error || new Error("e"));
      }

      render(<CategoryConsumer />);

      // Wait for the expected stabilized output
      if (expLen !== "NA") {
        await waitFor(() =>
          expect(screen.getByTestId("len")).toHaveTextContent(expLen)
        );
      }
      await waitFor(() =>
        expect(screen.getByTestId("type")).toHaveTextContent(expType)
      );

      logSpy.mockRestore();
    }
  );
});

// ===================================================================
// STUBS / MOCKS / FAKES EXPLICITLY
// ===================================================================
describe("useCategory – stubs/mocks/fakes behavior", () => {
  test("effect runs once: axios.get called exactly once even if re-rendered", async () => {
    // Stubbed response
    axios.get.mockResolvedValueOnce({ data: { category: [{ id: 1 }] } });

    const { rerender } = render(<CategoryConsumer />);

    // Wait until we see the first response applied
    await waitFor(() =>
      expect(screen.getByTestId("len")).toHaveTextContent("1")
    );
    expect(axios.get).toHaveBeenCalledTimes(1);

    // Re-render same tree (no unmount/mount), useEffect with [] should not fire again
    rerender(<CategoryConsumer />);

    // No extra call
    expect(axios.get).toHaveBeenCalledTimes(1);
  });
});
