import React from "react";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Toast from "@/components/Toast";

describe("Toast", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders success toast with correct message", () => {
    render(
      <Toast
        message="Operation successful"
        type="success"
        onClose={jest.fn()}
      />,
    );
    expect(screen.getByText("Success")).toBeInTheDocument();
    expect(
      screen.getByText("Operation successful"),
    ).toBeInTheDocument();
  });

  it("renders error toast with correct message", () => {
    render(
      <Toast
        message="Something went wrong"
        type="error"
        onClose={jest.fn()}
      />,
    );
    expect(screen.getByText("Error")).toBeInTheDocument();
    expect(
      screen.getByText("Something went wrong"),
    ).toBeInTheDocument();
  });

  it("auto-dismisses after default duration (3000ms)", () => {
    const onClose = jest.fn();
    render(
      <Toast
        message="Auto dismiss"
        type="success"
        onClose={onClose}
      />,
    );

    expect(onClose).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("auto-dismisses after custom duration", () => {
    const onClose = jest.fn();
    render(
      <Toast
        message="Custom duration"
        type="success"
        onClose={onClose}
        duration={5000}
      />,
    );

    act(() => {
      jest.advanceTimersByTime(3000);
    });
    expect(onClose).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when dismiss button is clicked", async () => {
    jest.useRealTimers();
    const user = userEvent.setup();
    const onClose = jest.fn();
    render(
      <Toast
        message="Dismissable"
        type="success"
        onClose={onClose}
      />,
    );

    // Find the close button (the X button)
    const buttons = screen.getAllByRole("button");
    await user.click(buttons[0]);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("cleans up timer on unmount", () => {
    const onClose = jest.fn();
    const { unmount } = render(
      <Toast
        message="Cleanup test"
        type="success"
        onClose={onClose}
      />,
    );

    unmount();

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    // onClose should not be called after unmount
    expect(onClose).not.toHaveBeenCalled();
  });
});
