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
    it("renders form with input field", () => {
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
    });

    it("renders submit button", () => {
      // Arrange & Act
      render(
        <CategoryForm
          handleSubmit={mockHandleSubmit}
          value=""
          setValue={mockSetValue}
        />
      );

      // Assert
      const submitButton = screen.getByRole("button", { name: /submit/i });
      expect(submitButton).toBeInTheDocument();
    });

    it("renders input with correct type attribute", () => {
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
      expect(input).toHaveAttribute("type", "text");
    });

    it("renders input with correct CSS class", () => {
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
      expect(input).toHaveClass("form-control");
    });

    it("renders submit button with correct CSS class", () => {
      // Arrange & Act
      render(
        <CategoryForm
          handleSubmit={mockHandleSubmit}
          value=""
          setValue={mockSetValue}
        />
      );

      // Assert
      const submitButton = screen.getByRole("button", { name: /submit/i });
      expect(submitButton).toHaveClass("btn", "btn-primary");
    });
  });

  describe("Input Value Display", () => {
    it("displays empty value when value prop is empty string", () => {
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

    it("displays provided value in input field", () => {
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

    it("calls setValue with correct value for each keystroke", () => {
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
      fireEvent.change(input, { target: { value: "E" } });
      fireEvent.change(input, { target: { value: "El" } });
      fireEvent.change(input, { target: { value: "Ele" } });

      // Assert
      expect(mockSetValue).toHaveBeenCalledTimes(3);
      expect(mockSetValue).toHaveBeenNthCalledWith(1, "E");
      expect(mockSetValue).toHaveBeenNthCalledWith(2, "El");
      expect(mockSetValue).toHaveBeenNthCalledWith(3, "Ele");
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
    it("calls handleSubmit when form is submitted", () => {
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
    });

    it("calls handleSubmit when submit button is clicked", () => {
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
    });

    it("calls handleSubmit with form event", () => {
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
    it("works correctly with all props provided", () => {
      // Arrange & Act
      render(
        <CategoryForm
          handleSubmit={mockHandleSubmit}
          value="Test Category"
          setValue={mockSetValue}
        />
      );

      // Assert
      const input = screen.getByPlaceholderText("Enter new category");
      expect(input).toHaveValue("Test Category");
      expect(
        screen.getByRole("button", { name: /submit/i })
      ).toBeInTheDocument();
    });

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
