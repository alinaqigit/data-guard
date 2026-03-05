import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import StatCard from "@/components/StatCard";
import {
  Shield,
  AlertTriangle,
  FileSearch,
  Activity,
} from "lucide-react";

describe("StatCard", () => {
  it("renders title and value", () => {
    render(<StatCard title="Total Scans" value="42" icon={Shield} />);
    expect(screen.getByText("Total Scans")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("renders with trend indicator (up)", () => {
    render(
      <StatCard
        title="Threats"
        value="15"
        icon={AlertTriangle}
        change="+12%"
        trend="up"
      />,
    );
    expect(screen.getByText("+12%")).toBeInTheDocument();
  });

  it("renders with trend indicator (down)", () => {
    render(
      <StatCard
        title="Files"
        value="100"
        icon={FileSearch}
        change="-5%"
        trend="down"
      />,
    );
    expect(screen.getByText("-5%")).toBeInTheDocument();
  });

  it("renders without change badge when no change prop", () => {
    render(<StatCard title="Active" value="3" icon={Activity} />);
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });

  it("calls onClick when clicked and cursor-pointer class is applied", async () => {
    const user = userEvent.setup();
    const onClick = jest.fn();

    render(
      <StatCard
        title="Clickable"
        value="7"
        icon={Shield}
        onClick={onClick}
      />,
    );

    const card = screen
      .getByText("Clickable")
      .closest("div[class*='rounded-2xl']")!;
    expect(card.className).toContain("cursor-pointer");

    await user.click(card);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does not have cursor-pointer when no onClick", () => {
    render(<StatCard title="Static" value="0" icon={Shield} />);
    const card = screen
      .getByText("Static")
      .closest("div[class*='rounded-2xl']")!;
    expect(card.className).not.toContain("cursor-pointer");
  });

  it("applies custom color and bgColor classes", () => {
    render(
      <StatCard
        title="Custom Colors"
        value="99"
        icon={Shield}
        color="text-rose-500"
        bgColor="bg-rose-500/10"
      />,
    );
    // The icon wrapper div should have the custom classes
    const iconWrapper = screen
      .getByText("Custom Colors")
      .closest("div[class*='rounded-2xl']")!
      .querySelector("div[class*='rounded-xl']")!;
    expect(iconWrapper.className).toContain("text-rose-500");
    expect(iconWrapper.className).toContain("bg-rose-500/10");
  });
});
