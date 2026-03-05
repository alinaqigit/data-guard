import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CustomSelect from "@/components/CustomSelect";

const options = [
  {
    value: "keyword",
    label: "Keyword",
    description: "Match exact words",
  },
  { value: "regex", label: "RegEx", description: "Match patterns" },
  { value: "ml", label: "ML Model", description: "Machine learning" },
];

describe("CustomSelect", () => {
  it("renders with placeholder when no value selected", () => {
    render(
      <CustomSelect
        value=""
        onChange={jest.fn()}
        options={options}
        placeholder="Select type..."
      />,
    );
    expect(screen.getByText("Select type...")).toBeInTheDocument();
  });

  it("renders selected option label", () => {
    render(
      <CustomSelect
        value="keyword"
        onChange={jest.fn()}
        options={options}
      />,
    );
    expect(screen.getByText("Keyword")).toBeInTheDocument();
  });

  it("opens dropdown on click", async () => {
    const user = userEvent.setup();
    render(
      <CustomSelect
        value=""
        onChange={jest.fn()}
        options={options}
        placeholder="Select..."
      />,
    );

    await user.click(screen.getByText("Select..."));

    // All options should be visible
    expect(screen.getByText("Keyword")).toBeInTheDocument();
    expect(screen.getByText("RegEx")).toBeInTheDocument();
    expect(screen.getByText("ML Model")).toBeInTheDocument();
  });

  it("shows option descriptions in dropdown", async () => {
    const user = userEvent.setup();
    render(
      <CustomSelect
        value=""
        onChange={jest.fn()}
        options={options}
        placeholder="Select..."
      />,
    );

    await user.click(screen.getByText("Select..."));

    expect(screen.getByText("Match exact words")).toBeInTheDocument();
    expect(screen.getByText("Match patterns")).toBeInTheDocument();
  });

  it("calls onChange when option is selected", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();

    render(
      <CustomSelect
        value=""
        onChange={onChange}
        options={options}
        placeholder="Select..."
      />,
    );

    await user.click(screen.getByText("Select..."));

    // mouseDown on the option
    const regexOption = screen.getByText("RegEx").closest("button")!;
    await user.pointer({ keys: "[MouseLeft>]", target: regexOption });

    expect(onChange).toHaveBeenCalledWith("regex");
  });

  it("closes dropdown on Escape key", async () => {
    const user = userEvent.setup();
    render(
      <CustomSelect
        value=""
        onChange={jest.fn()}
        options={options}
        placeholder="Select..."
      />,
    );

    await user.click(screen.getByText("Select..."));
    expect(screen.getByText("Match exact words")).toBeInTheDocument();

    await user.keyboard("{Escape}");

    // Dropdown should close - descriptions hidden
    expect(
      screen.queryByText("Match exact words"),
    ).not.toBeInTheDocument();
  });

  it("toggles dropdown open/closed on repeated clicks", async () => {
    const user = userEvent.setup();
    render(
      <CustomSelect
        value=""
        onChange={jest.fn()}
        options={options}
        placeholder="Select..."
      />,
    );

    // Open
    await user.click(screen.getByText("Select..."));
    expect(screen.getByText("Match exact words")).toBeInTheDocument();

    // Close
    await user.click(screen.getByText("Select..."));
    expect(
      screen.queryByText("Match exact words"),
    ).not.toBeInTheDocument();
  });

  it("shows checkmark on selected option", async () => {
    const user = userEvent.setup();
    render(
      <CustomSelect
        value="regex"
        onChange={jest.fn()}
        options={options}
      />,
    );

    await user.click(screen.getByText("RegEx"));

    // The selected option should have a highlighted style
    const selectedButton = screen
      .getAllByRole("button")
      .find((btn) => btn.className.includes("bg-indigo-600/20"));
    expect(selectedButton).toBeTruthy();
  });

  it("applies custom className", () => {
    render(
      <CustomSelect
        value=""
        onChange={jest.fn()}
        options={options}
        className="w-full max-w-md"
      />,
    );
    const wrapper = document.querySelector(".w-full.max-w-md");
    expect(wrapper).toBeInTheDocument();
  });
});
