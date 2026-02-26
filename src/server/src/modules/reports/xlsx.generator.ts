import ExcelJS from "exceljs";
import { ReportData } from "./reports.types";

const INDIGO = "FF4F46E5";
const SUCCESS = "FF10B981";
const DANGER = "FFEF4444";
const WARNING = "FFF59E0B";
const MUTED = "FF6B7280";
const WHITE = "FFFFFFFF";
const LIGHT_BG = "FFF9FAFB";
const BORDER_COLOR = "FFE5E7EB";

function headerStyle(color = INDIGO): Partial<ExcelJS.Style> {
  return {
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: color } },
    font: { bold: true, color: { argb: WHITE }, size: 10 },
    alignment: { vertical: "middle", horizontal: "center" },
    border: {
      bottom: { style: "thin", color: { argb: BORDER_COLOR } },
    },
  };
}

function cellStyle(bold = false): Partial<ExcelJS.Style> {
  return {
    font: { bold, size: 9, color: { argb: "FF374151" } },
    alignment: { vertical: "middle" },
    border: {
      bottom: { style: "hair", color: { argb: BORDER_COLOR } },
    },
  };
}

export async function generateXLSX(data: ReportData, outputPath: string): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "DataGuard";
  workbook.created = new Date();

  // ── Sheet 1: Summary ──────────────────────────────────────
  const summarySheet = workbook.addWorksheet("Summary", {
    pageSetup: { paperSize: 9, orientation: "portrait" },
  });

  summarySheet.columns = [
    { width: 30 }, { width: 30 },
  ];

  // Title block
  summarySheet.mergeCells("A1:B1");
  const titleCell = summarySheet.getCell("A1");
  titleCell.value = "DataGuard — " + data.meta.reportName;
  titleCell.style = {
    font: { bold: true, size: 16, color: { argb: INDIGO } },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } },
    alignment: { vertical: "middle", horizontal: "left" },
  };
  summarySheet.getRow(1).height = 36;

  summarySheet.mergeCells("A2:B2");
  const subtitleCell = summarySheet.getCell("A2");
  subtitleCell.value = `${data.meta.reportType.toUpperCase()} REPORT  ·  ${data.meta.dateRange.toUpperCase()}  ·  Generated: ${new Date(data.meta.generatedAt).toLocaleString()}`;
  subtitleCell.style = {
    font: { size: 9, color: { argb: "FF94A3B8" } },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } },
    alignment: { vertical: "middle" },
  };
  summarySheet.getRow(2).height = 20;

  summarySheet.addRow([]); // spacer

  // Summary stats
  const stats = [
    ["Total Scans", data.summary.totalScans],
    ["Total Threats Found", data.summary.totalThreats],
    ["Total Alerts", data.summary.totalAlerts],
    ["Critical Alerts", data.summary.criticalAlerts],
    ["Active Policies", data.summary.activePolicies],
    ["System Status", data.summary.systemStatus],
  ];

  const headerRow = summarySheet.addRow(["Metric", "Value"]);
  headerRow.eachCell(cell => { cell.style = headerStyle(); });
  headerRow.height = 24;

  stats.forEach(([label, value]) => {
    const row = summarySheet.addRow([label, value]);
    row.height = 20;
    row.getCell(1).style = cellStyle(true);
    const valueCell = row.getCell(2);
    valueCell.style = cellStyle();
    // Color code threats and status
    if (label === "System Status") {
      valueCell.font = { bold: true, color: { argb: value === "SECURE" ? SUCCESS : DANGER } };
    }
    if ((label === "Total Threats Found" || label === "Critical Alerts") && Number(value) > 0) {
      valueCell.font = { bold: true, color: { argb: DANGER } };
    }
  });

  // ── Sheet 2: Scans ────────────────────────────────────────
  if (data.scans && data.scans.length > 0) {
    const scansSheet = workbook.addWorksheet("Scans");
    scansSheet.columns = [
      { header: "ID", key: "id", width: 10 },
      { header: "Type", key: "type", width: 15 },
      { header: "Time", key: "time", width: 20 },
      { header: "Files Scanned", key: "filesScanned", width: 16 },
      { header: "Files w/ Threats", key: "filesWithThreats", width: 18 },
      { header: "Total Threats", key: "totalThreats", width: 15 },
      { header: "Status", key: "status", width: 14 },
    ];

    const scanHeader = scansSheet.getRow(1);
    scanHeader.eachCell(cell => { cell.style = headerStyle(); });
    scanHeader.height = 24;

    data.scans.forEach(s => {
      const row = scansSheet.addRow(s);
      row.height = 20;
      row.eachCell(cell => { cell.style = cellStyle(); });
      const threatCell = row.getCell(6);
      if (s.totalThreats > 0) {
        threatCell.font = { bold: true, color: { argb: DANGER } };
      }
    });
  }

  // ── Sheet 3: Alerts ───────────────────────────────────────
  if (data.alerts && data.alerts.length > 0) {
    const alertsSheet = workbook.addWorksheet("Alerts");
    alertsSheet.columns = [
      { header: "ID", key: "id", width: 10 },
      { header: "Severity", key: "severity", width: 12 },
      { header: "Type", key: "type", width: 30 },
      { header: "Description", key: "description", width: 40 },
      { header: "Source", key: "source", width: 20 },
      { header: "Status", key: "status", width: 15 },
      { header: "Time", key: "time", width: 22 },
    ];

    const alertHeader = alertsSheet.getRow(1);
    alertHeader.eachCell(cell => { cell.style = headerStyle(DANGER.replace("FF", "")); });
    alertHeader.height = 24;

    data.alerts.forEach(a => {
      const row = alertsSheet.addRow(a);
      row.height = 20;
      row.eachCell(cell => { cell.style = cellStyle(); });
      const sevCell = row.getCell(2);
      sevCell.font = {
        bold: true,
        color: { argb: a.severity === "High" ? DANGER : a.severity === "Medium" ? WARNING : MUTED },
      };
    });
  }

  // ── Sheet 4: Policies ─────────────────────────────────────
  if (data.policies && data.policies.length > 0) {
    const policiesSheet = workbook.addWorksheet("Policies");
    policiesSheet.columns = [
      { header: "Name", key: "name", width: 30 },
      { header: "Type", key: "type", width: 14 },
      { header: "Pattern", key: "pattern", width: 40 },
      { header: "Status", key: "status", width: 12 },
    ];

    const policyHeader = policiesSheet.getRow(1);
    policyHeader.eachCell(cell => { cell.style = headerStyle("FF059669"); });
    policyHeader.height = 24;

    data.policies.forEach(p => {
      const row = policiesSheet.addRow(p);
      row.height = 20;
      row.eachCell(cell => { cell.style = cellStyle(); });
      const statusCell = row.getCell(4);
      statusCell.font = {
        bold: true,
        color: { argb: p.status === "Active" ? SUCCESS : MUTED },
      };
    });
  }

  // ── Sheet 5: Recommendations (Deep only) ──────────────────
  if (data.recommendations && data.recommendations.length > 0) {
    const recSheet = workbook.addWorksheet("Recommendations");
    recSheet.columns = [
      { header: "#", key: "num", width: 6 },
      { header: "Recommendation", key: "rec", width: 80 },
    ];

    const recHeader = recSheet.getRow(1);
    recHeader.eachCell(cell => { cell.style = headerStyle("FF7C3AED"); });
    recHeader.height = 24;

    data.recommendations.forEach((rec, i) => {
      const row = recSheet.addRow({ num: i + 1, rec });
      row.height = 20;
      row.getCell(1).style = cellStyle(true);
      row.getCell(2).style = { ...cellStyle(), alignment: { wrapText: true, vertical: "middle" } };
    });
  }

  await workbook.xlsx.writeFile(outputPath);
}
