import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import CategoryForm from "./CategoryForm";

describe("CategoryForm", () => {
  let mockHandleSubmit;
  let mockSetValue;

  beforeEach(() => {
    mockHandleSubmit = jest.fn();
    mockSetValue = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders form with input field and submit button", () => {
      // Arrange & Act
      render(
        <CategoryForm
          handleSubmit={mockHandleSubmit}
          value=""
          setValue={mockSetValue}
        />
      );

      // Assert
      const input = screen.getByPlaceholderText("Enter new category");
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute("type", "text");

      const submitButton = screen.getByRole("button", { name: /submit/i });
      expect(submitButton).toBeInTheDocument();
    });
  });

  describe("Input Value Display - Boundary Value Analysis", () => {
    it("displays empty value (boundary: 0 characters)", () => {
      // Arrange & Act
      render(
        <CategoryForm
          handleSubmit={mockHandleSubmit}
          value=""
          setValue={mockSetValue}
        />
      );

      // Assert
      const input = screen.getByPlaceholderText("Enter new category");
      expect(input).toHaveValue("");
    });

    it("displays single character value (boundary: 1 character)", () => {
      // Arrange & Act
      render(
        <CategoryForm
          handleSubmit={mockHandleSubmit}
          value="E"
          setValue={mockSetValue}
        />
      );

      // Assert
      const input = screen.getByPlaceholderText("Enter new category");
      expect(input).toHaveValue("E");
    });

    it("displays normal multi-character value", () => {
      // Arrange & Act
      render(
        <CategoryForm
          handleSubmit={mockHandleSubmit}
          value="Electronics"
          setValue={mockSetValue}
        />
      );

      // Assert
      const input = screen.getByPlaceholderText("Enter new category");
      expect(input).toHaveValue("Electronics");
    });

    it("updates displayed value when value prop changes", () => {
      // Arrange
      const { rerender } = render(
        <CategoryForm
          handleSubmit={mockHandleSubmit}
          value="Electronics"
          setValue={mockSetValue}
        />
      );

      // Act
      rerender(
        <CategoryForm
          handleSubmit={mockHandleSubmit}
          value="Books"
          setValue={mockSetValue}
        />
      );

      // Assert
      const input = screen.getByPlaceholderText("Enter new category");
      expect(input).toHaveValue("Books");
    });
  });

  describe("User Interactions", () => {
    it("calls setValue when user types in input field", () => {
      // Arrange
      render(
        <CategoryForm
          handleSubmit={mockHandleSubmit}
          value=""
          setValue={mockSetValue}
        />
      );
      const input = screen.getByPlaceholderText("Enter new category");

      // Act
      fireEvent.change(input, { target: { value: "Sports" } });

      // Assert
      expect(mockSetValue).toHaveBeenCalledTimes(1);
      expect(mockSetValue).toHaveBeenCalledWith("Sports");
    });

    it("calls setValue with empty string when input is cleared", () => {
      // Arrange
      render(
        <CategoryForm
          handleSubmit={mockHandleSubmit}
          value="Electronics"
          setValue={mockSetValue}
        />
      );
      const input = screen.getByPlaceholderText("Enter new category");

      // Act
      fireEvent.change(input, { target: { value: "" } });

      // Assert
      expect(mockSetValue).toHaveBeenCalledWith("");
    });
  });

  describe("Form Submission", () => {
    it("calls handleSubmit with form event when submit button is clicked", () => {
      // Arrange
      render(
        <CategoryForm
          handleSubmit={mockHandleSubmit}
          value="Electronics"
          setValue={mockSetValue}
        />
      );
      const submitButton = screen.getByRole("button", { name: /submit/i });

      // Act
      fireEvent.click(submitButton);

      // Assert
      expect(mockHandleSubmit).toHaveBeenCalledTimes(1);
      expect(mockHandleSubmit).toHaveBeenCalledWith(expect.any(Object));
      expect(mockHandleSubmit.mock.calls[0][0]).toHaveProperty("target");
    });

    it("calls handleSubmit with empty value", () => {
      // Arrange
      render(
        <CategoryForm
          handleSubmit={mockHandleSubmit}
          value=""
          setValue={mockSetValue}
        />
      );
      const submitButton = screen.getByRole("button", { name: /submit/i });

      // Act
      fireEvent.click(submitButton);

      // Assert
      expect(mockHandleSubmit).toHaveBeenCalledTimes(1);
    });

    it("does not call setValue when form is submitted", () => {
      // Arrange
      render(
        <CategoryForm
          handleSubmit={mockHandleSubmit}
          value="Electronics"
          setValue={mockSetValue}
        />
      );
      const submitButton = screen.getByRole("button", { name: /submit/i });

      // Act
      fireEvent.click(submitButton);

      // Assert
      expect(mockSetValue).not.toHaveBeenCalled();
    });
  });

  describe("Props Integration", () => {
    it("handles setValue and handleSubmit independently", () => {
      // Arrange
      render(
        <CategoryForm
          handleSubmit={mockHandleSubmit}
          value=""
          setValue={mockSetValue}
        />
      );
      const input = screen.getByPlaceholderText("Enter new category");
      const submitButton = screen.getByRole("button", { name: /submit/i });

      // Act
      fireEvent.change(input, { target: { value: "New Category" } });
      fireEvent.click(submitButton);

      // Assert
      expect(mockSetValue).toHaveBeenCalledTimes(1);
      expect(mockHandleSubmit).toHaveBeenCalledTimes(1);
    });
  });
});
