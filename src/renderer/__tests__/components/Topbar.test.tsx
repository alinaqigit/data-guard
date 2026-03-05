import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Topbar from "@/components/Topbar";

describe("Topbar", () => {
  it("renders the menu button", () => {
    render(<Topbar />);
    expect(screen.getByLabelText("Open Menu")).toBeInTheDocument();
  });

  it("calls onMenuClick when menu button is clicked", async () => {
    const user = userEvent.setup();
    const onMenuClick = jest.fn();

    render(<Topbar onMenuClick={onMenuClick} />);
    await user.click(screen.getByLabelText("Open Menu"));

    expect(onMenuClick).toHaveBeenCalledTimes(1);
  });

  it("renders as a sticky header", () => {
    render(<Topbar />);
    const header = screen.getByRole("banner");
    expect(header.className).toContain("sticky");
    expect(header.className).toContain("top-0");
  });

  it("is hidden on md+ screens", () => {
    render(<Topbar />);
    const header = screen.getByRole("banner");
    expect(header.className).toContain("md:hidden");
  });
});
