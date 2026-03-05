import React from "react";
import { render, screen } from "@testing-library/react";
import Table, { Column } from "@/components/Table";

interface TestRow {
  id: number;
  name: string;
  status: string;
  count: number;
}

const testColumns: Column<TestRow>[] = [
  { header: "ID", accessor: "id" },
  { header: "Name", accessor: "name" },
  { header: "Status", accessor: "status" },
  { header: "Count", accessor: "count" },
];

const testData: TestRow[] = [
  { id: 1, name: "Alpha", status: "Active", count: 10 },
  { id: 2, name: "Beta", status: "Inactive", count: 20 },
  { id: 3, name: "Gamma", status: "Active", count: 30 },
];

describe("Table", () => {
  it("renders column headers", () => {
    render(<Table columns={testColumns} data={testData} />);
    expect(screen.getByText("ID")).toBeInTheDocument();
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Count")).toBeInTheDocument();
  });

  it("renders all data rows", () => {
    render(<Table columns={testColumns} data={testData} />);
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
    expect(screen.getByText("Gamma")).toBeInTheDocument();
  });

  it("renders correct values in cells", () => {
    render(<Table columns={testColumns} data={testData} />);
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("20")).toBeInTheDocument();
    expect(screen.getByText("30")).toBeInTheDocument();
  });

  it("supports function accessor", () => {
    const columnsWithFn: Column<TestRow>[] = [
      {
        header: "Display",
        accessor: (row) => `${row.name} (${row.count})`,
      },
    ];
    render(<Table columns={columnsWithFn} data={testData} />);
    expect(screen.getByText("Alpha (10)")).toBeInTheDocument();
    expect(screen.getByText("Beta (20)")).toBeInTheDocument();
  });

  it("supports custom render function", () => {
    const columnsWithRender: Column<TestRow>[] = [
      {
        header: "Status Badge",
        accessor: "status",
        render: (value: string) => (
          <span data-testid="badge">{value.toUpperCase()}</span>
        ),
      },
    ];
    render(<Table columns={columnsWithRender} data={testData} />);
    const badges = screen.getAllByTestId("badge");
    expect(badges).toHaveLength(3);
    expect(badges[0]).toHaveTextContent("ACTIVE");
    expect(badges[1]).toHaveTextContent("INACTIVE");
  });

  it("renders empty table when data is empty", () => {
    render(<Table columns={testColumns} data={[]} />);
    // Headers should still render
    expect(screen.getByText("ID")).toBeInTheDocument();
    // No data rows
    const tbody = document.querySelector("tbody");
    expect(tbody?.children).toHaveLength(0);
  });

  it("applies custom className to columns", () => {
    const columnsWithClass: Column<TestRow>[] = [
      {
        header: "Name",
        accessor: "name",
        className: "text-right w-40",
      },
    ];
    render(<Table columns={columnsWithClass} data={testData} />);
    const th = screen.getByText("Name").closest("th");
    expect(th?.className).toContain("text-right");
    expect(th?.className).toContain("w-40");
  });
});
