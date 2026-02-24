import { api, getSessionId } from "./client";

export interface ReportRecord {
  id: number;
  name: string;
  reportType: "quick" | "full" | "deep";
  format: "pdf" | "xlsx" | "json";
  dateRange: "today" | "weekly" | "all";
  status: "pending" | "completed" | "failed";
  fileSizeBytes: number;
  createdAt: string;
}

export interface GenerateReportPayload {
  reportType: "quick" | "full" | "deep";
  format: "pdf" | "xlsx" | "json";
  dateRange: "today" | "weekly" | "all";
  reportName?: string;
}

export const reportsService = {
  async generateReport(payload: GenerateReportPayload): Promise<{ reportId: number }> {
    return api.post<{ reportId: number }>("/api/reports", payload, true);
  },

  async getReports(): Promise<ReportRecord[]> {
    const res = await api.get<{ reports: ReportRecord[] }>("/api/reports", true);
    return res.reports;
  },

  async downloadReport(reportId: number, filename: string, format: string): Promise<void> {
    const sessionId = getSessionId();
    const response = await fetch(`http://localhost:4000/api/reports/${reportId}/download`, {
      headers: {
        "x-session-id": sessionId || "",
      },
    });

    if (!response.ok) throw new Error("Download failed");

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  async deleteReport(reportId: number): Promise<void> {
    await api.delete(`/api/reports/${reportId}`, true);
  },
};