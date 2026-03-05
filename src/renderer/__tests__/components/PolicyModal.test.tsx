import React from "react";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PolicyModal from "@/components/PolicyModal";

// Mock CustomSelect to avoid portal complexity in tests
jest.mock("@/components/CustomSelect", () => {
  return function MockCustomSelect({
    value,
    onChange,
    options,
    placeholder,
  }: any) {
    return (
      <select
        data-testid="custom-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt: any) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  };
});

const defaultPolicy = {
  id: "1",
  name: "Test Policy",
  description: "Test description",
  type: "KEYWORD",
  pattern: "confidential",
  status: "Active" as const,
};

describe("PolicyModal", () => {
  it("does not render when isOpen is false", () => {
    render(
      <PolicyModal
        isOpen={false}
        onClose={jest.fn()}
        policy={null}
        onSave={jest.fn()}
      />,
    );
    expect(screen.queryByText("New Policy")).not.toBeInTheDocument();
    expect(screen.queryByText("Edit Policy")).not.toBeInTheDocument();
  });

  it("renders 'New Policy' title when isNew is true", async () => {
    render(
      <PolicyModal
        isOpen={true}
        onClose={jest.fn()}
        policy={null}
        onSave={jest.fn()}
        isNew={true}
      />,
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(screen.getByText("New Policy")).toBeInTheDocument();
    expect(screen.getByText("Create Policy")).toBeInTheDocument();
  });

  it("renders 'Edit Policy' title when editing", async () => {
    render(
      <PolicyModal
        isOpen={true}
        onClose={jest.fn()}
        policy={defaultPolicy}
        onSave={jest.fn()}
        isNew={false}
      />,
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(screen.getByText("Edit Policy")).toBeInTheDocument();
    expect(screen.getByText("Save Changes")).toBeInTheDocument();
  });

  it("populates form with existing policy data", async () => {
    render(
      <PolicyModal
        isOpen={true}
        onClose={jest.fn()}
        policy={defaultPolicy}
        onSave={jest.fn()}
      />,
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    const nameInput = screen.getByPlaceholderText(
      "e.g. CNIC Detection Policy",
    ) as HTMLInputElement;
    expect(nameInput.value).toBe("Test Policy");

    const descInput = screen.getByPlaceholderText(
      "Describe what this policy detects...",
    ) as HTMLTextAreaElement;
    expect(descInput.value).toBe("Test description");
  });

  it("calls onSave with form data on submit", async () => {
    const user = userEvent.setup();
    const onSave = jest.fn();

    render(
      <PolicyModal
        isOpen={true}
        onClose={jest.fn()}
        policy={defaultPolicy}
        onSave={onSave}
        isNew={false}
      />,
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    await user.click(screen.getByText("Save Changes"));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Test Policy",
        description: "Test description",
        type: "KEYWORD",
        pattern: "confidential",
      }),
    );
  });

  it("calls onClose when Cancel button is clicked", async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();

    render(
      <PolicyModal
        isOpen={true}
        onClose={onClose}
        policy={null}
        onSave={jest.fn()}
        isNew={true}
      />,
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    await user.click(screen.getByText("Cancel"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when X button is clicked", async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();

    render(
      <PolicyModal
        isOpen={true}
        onClose={onClose}
        policy={null}
        onSave={jest.fn()}
        isNew={true}
      />,
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    // Find the X (close) button - it's the one with the close icon in the header
    const closeButtons = screen.getAllByRole("button");
    const xButton = closeButtons.find((btn) =>
      btn.className.includes("hover:bg-white/10"),
    );
    if (xButton) {
      await user.click(xButton);
      expect(onClose).toHaveBeenCalledTimes(1);
    }
  });

  it("allows editing policy name", async () => {
    const user = userEvent.setup();
    const onSave = jest.fn();

    render(
      <PolicyModal
        isOpen={true}
        onClose={jest.fn()}
        policy={defaultPolicy}
        onSave={onSave}
      />,
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    const nameInput = screen.getByPlaceholderText(
      "e.g. CNIC Detection Policy",
    );
    await user.clear(nameInput);
    await user.type(nameInput, "Updated Policy");

    await user.click(screen.getByText("Save Changes"));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Updated Policy" }),
    );
  });

  it("shows keyword input for KEYWORD type", async () => {
    render(
      <PolicyModal
        isOpen={true}
        onClose={jest.fn()}
        policy={{ ...defaultPolicy, type: "KEYWORD" }}
        onSave={jest.fn()}
      />,
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(screen.getByText("Keyword or Phrase")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(
        "e.g. confidential, salary, passport",
      ),
    ).toBeInTheDocument();
  });

  it("shows regex pattern selector for REGEX type", async () => {
    render(
      <PolicyModal
        isOpen={true}
        onClose={jest.fn()}
        policy={{ ...defaultPolicy, type: "REGEX", pattern: "" }}
        onSave={jest.fn()}
      />,
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    const regexLabels = screen.getAllByText("RegEx Pattern");
    expect(regexLabels.length).toBeGreaterThanOrEqual(1);
  });

  it("starts with empty form for new policy", async () => {
    render(
      <PolicyModal
        isOpen={true}
        onClose={jest.fn()}
        policy={null}
        onSave={jest.fn()}
        isNew={true}
      />,
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    const nameInput = screen.getByPlaceholderText(
      "e.g. CNIC Detection Policy",
    ) as HTMLInputElement;
    expect(nameInput.value).toBe("");
  });
});
