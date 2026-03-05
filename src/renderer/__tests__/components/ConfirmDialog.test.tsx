import React from "react";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ConfirmDialog from "@/components/ConfirmDialog";

describe("ConfirmDialog", () => {
  it("does not render when isOpen is false", () => {
    render(
      <ConfirmDialog
        isOpen={false}
        title="Confirm Delete"
        message="Are you sure?"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );
    expect(
      screen.queryByText("Confirm Delete"),
    ).not.toBeInTheDocument();
  });

  it("renders title and message when open", async () => {
    render(
      <ConfirmDialog
        isOpen={true}
        title="Confirm Delete"
        message="This action cannot be undone."
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    // Allow animation frames to fire
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(screen.getByText("Confirm Delete")).toBeInTheDocument();
    expect(
      screen.getByText("This action cannot be undone."),
    ).toBeInTheDocument();
  });

  it("renders default button text", async () => {
    render(
      <ConfirmDialog
        isOpen={true}
        title="Test"
        message="Test message"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(screen.getByText("Confirm")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  it("renders custom button text", async () => {
    render(
      <ConfirmDialog
        isOpen={true}
        title="Test"
        message="Test message"
        confirmText="Delete Forever"
        cancelText="Go Back"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(screen.getByText("Delete Forever")).toBeInTheDocument();
    expect(screen.getByText("Go Back")).toBeInTheDocument();
  });

  it("calls onConfirm when confirm button is clicked", async () => {
    const user = userEvent.setup();
    const onConfirm = jest.fn();

    render(
      <ConfirmDialog
        isOpen={true}
        title="Test"
        message="Test"
        onConfirm={onConfirm}
        onCancel={jest.fn()}
      />,
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    await user.click(screen.getByText("Confirm"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel when cancel button is clicked", async () => {
    const user = userEvent.setup();
    const onCancel = jest.fn();

    render(
      <ConfirmDialog
        isOpen={true}
        title="Test"
        message="Test"
        onConfirm={jest.fn()}
        onCancel={onCancel}
      />,
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    await user.click(screen.getByText("Cancel"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("applies destructive styling when isDestructive is true", async () => {
    render(
      <ConfirmDialog
        isOpen={true}
        title="Danger"
        message="This is dangerous"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
        isDestructive={true}
      />,
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    const confirmButton = screen.getByText("Confirm");
    expect(confirmButton.className).toContain("bg-rose-600");
  });

  it("applies non-destructive styling by default", async () => {
    render(
      <ConfirmDialog
        isOpen={true}
        title="Info"
        message="Normal action"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    const confirmButton = screen.getByText("Confirm");
    expect(confirmButton.className).toContain("bg-indigo-600");
  });
});
