export type ReportType = "quick" | "full" | "deep";
export type ReportFormat = "pdf" | "xlsx" | "json";
export type ReportDateRange = "today" | "weekly" | "all";
export type ReportStatus = "pending" | "completed" | "failed";

export interface GenerateReportRequest {
  reportType: ReportType;
  format: ReportFormat;
  dateRange: ReportDateRange;
  reportName?: string;
}

export interface ReportEntity {
  id: number;
  userId: number;
  name: string;
  reportType: ReportType;
  format: ReportFormat;
  dateRange: ReportDateRange;
  status: ReportStatus;
  filePath: string;
  fileSizeBytes: number;
  createdAt: string;
}

export interface ReportSummary {
  totalScans: number;
  totalThreats: number;
  totalAlerts: number;
  criticalAlerts: number;
  activePolicies: number;
  systemStatus: "SECURE" | "THREATS DETECTED";
}

export interface ReportData {
  meta: {
    reportType: ReportType;
    reportName: string;
    dateRange: ReportDateRange;
    generatedAt: string;
    generatedBy: string;
  };
  summary: ReportSummary;
  scans?: Array<{
    id: number;
    type: string;
    time: string;
    filesScanned: number;
    filesWithThreats: number;
    totalThreats: number;
    status: string;
  }>;
  alerts?: Array<{
    id: number;
    severity: string;
    type: string;
    description: string;
    source: string;
    status: string;
    time: string;
  }>;
  policies?: Array<{
    name: string;
    type: string;
    pattern: string;
    status: string;
  }>;
  recommendations?: string[];
  auditTrail?: {
    totalEventsLogged: number;
    dataRetentionPeriod: string;
    lastAuditDate: string;
  };
}
