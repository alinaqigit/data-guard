import path from "path";
import fs from "fs";
import os from "os";
import { reportsRepository } from "./reports.repository";
import {
  GenerateReportRequest,
  ReportData,
  ReportEntity,
  ReportThreatItem,
} from "./reports.types";
import { generatePDF } from "./pdf.generator";
import { generateXLSX } from "./xlsx.generator";
import { generateJSON } from "./json.generator";
import { dbModule } from "../db";
import { NotFoundError, ForbiddenError } from "../../utils/errors";
import { ThreatEntity } from "../../entities/threat.entity";

export class reportsService {
  private reportsRepo: reportsRepository;
  private db: dbModule;
  private outputDir: string;

  constructor(DB_PATH: string) {
    this.reportsRepo = new reportsRepository(DB_PATH);
    this.db = new dbModule(DB_PATH);

    // Store generated reports in OS temp dir under dataguard/reports
    this.outputDir = path.join(os.tmpdir(), "dataguard", "reports");
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  public async generateReport(
    userId: number,
    username: string,
    request: GenerateReportRequest,
  ): Promise<{ reportId: number; filePath: string }> {
    const name =
      request.reportName?.trim() ||
      `${request.reportType}_report_${new Date().toISOString().split("T")[0]}`;

    // Create DB record
    const report = this.reportsRepo.createReport({
      userId,
      name,
      reportType: request.reportType,
      format: request.format,
      dateRange: request.dateRange,
    });

    const ext =
      request.format === "pdf"
        ? "pdf"
        : request.format === "xlsx"
          ? "xlsx"
          : "json";
    const filename = `report_${report.id}_${Date.now()}.${ext}`;
    const filePath = path.join(this.outputDir, filename);

    try {
      // Build report data from DB
      const data = this.buildReportData(
        userId,
        username,
        request,
        name,
      );

      // Generate file
      if (request.format === "pdf") {
        await generatePDF(data, filePath);
      } else if (request.format === "xlsx") {
        await generateXLSX(data, filePath);
      } else {
        generateJSON(data, filePath);
      }

      const stats = fs.statSync(filePath);
      this.reportsRepo.updateReport(report.id, {
        status: "completed",
        filePath,
        fileSizeBytes: stats.size,
      });

      return { reportId: report.id, filePath };
    } catch (err: any) {
      this.reportsRepo.updateReport(report.id, { status: "failed" });
      throw new Error(`Report generation failed: ${err.message}`);
    }
  }

  private buildReportData(
    userId: number,
    username: string,
    request: GenerateReportRequest,
    name: string,
  ): ReportData {
    // Fetch raw data from DB
    const allScans =
      this.db.dbService.scan.getAllScansByUserId(userId);
    const allPolicies =
      this.db.dbService.policy.getAllPoliciesByUserId(userId);
    const allThreats =
      this.db.dbService.threat.getAllThreatsByUserId(userId);

    // Date filtering
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const weekAgoStr = new Date(
      now.getTime() - 7 * 24 * 60 * 60 * 1000,
    )
      .toISOString()
      .split("T")[0];

    const inRange = (dateStr: string) => {
      const d =
        dateStr?.split("T")[0] || dateStr?.split(" ")[0] || "";
      if (request.dateRange === "today") return d === todayStr;
      if (request.dateRange === "weekly") return d >= weekAgoStr;
      return true;
    };

    const filteredScans = allScans.filter((s) =>
      inRange(s.startedAt),
    );
    const filteredThreats = allThreats.filter((t) =>
      inRange(t.createdAt),
    );
    const activePolicies = allPolicies.filter((p) => p.isEnabled);

    // Real threat-based metrics
    const highThreats = filteredThreats.filter(
      (t) => t.severity === "High",
    );
    const mediumThreats = filteredThreats.filter(
      (t) => t.severity === "Medium",
    );
    const newThreats = filteredThreats.filter(
      (t) => t.status === "New",
    );

    // Build summary with real data
    const summary = {
      totalScans: filteredScans.length,
      totalThreats: filteredThreats.length,
      totalAlerts: newThreats.length,
      criticalAlerts: highThreats.length,
      activePolicies: activePolicies.length,
      systemStatus: (filteredThreats.length === 0
        ? "SECURE"
        : "THREATS DETECTED") as "SECURE" | "THREATS DETECTED",
    };

    const base: ReportData = {
      meta: {
        reportType: request.reportType,
        reportName: name,
        dateRange: request.dateRange,
        generatedAt: new Date().toISOString(),
        generatedBy: username,
      },
      summary,
    };

    if (request.reportType === "quick") return base;

    // Build threats list from real threat records
    const threatItems: ReportThreatItem[] = filteredThreats.map(
      (t) => {
        const policyNames: string[] = [];
        let matchCount = 0;
        if (t.details && t.details.policiesViolated) {
          for (const pv of t.details.policiesViolated) {
            policyNames.push(pv.policyName);
            matchCount += pv.matchCount;
          }
        }
        return {
          id: t.id,
          filePath: t.filePath,
          severity: t.severity,
          type: t.type,
          description: t.description,
          status: t.status,
          policiesViolated: policyNames,
          matchCount,
          detectedAt: t.createdAt,
        };
      },
    );

    // Build real alerts from individual threat records
    const alertItems = filteredThreats
      .filter(
        (t) => t.status === "New" || t.status === "Investigating",
      )
      .map((t) => ({
        id: t.id,
        severity: t.severity,
        type: t.type,
        description: t.description,
        filePath: t.filePath,
        status: t.status,
        time: t.createdAt,
      }));

    // Full: add scans, threats, alerts, policies
    const full: ReportData = {
      ...base,
      scans: filteredScans.map((s) => ({
        id: s.id,
        type: s.scanType,
        time: s.completedAt || s.startedAt,
        filesScanned: s.filesScanned,
        filesWithThreats: s.filesWithThreats,
        totalThreats: s.totalThreats,
        status: s.status,
      })),
      threats: threatItems,
      alerts: alertItems,
      policies: allPolicies.map((p) => ({
        name: p.name,
        type: p.type,
        pattern: p.pattern,
        status: p.isEnabled ? "Active" : "Disabled",
      })),
    };

    if (request.reportType === "full") return full;

    // Deep: add recommendations + audit trail
    return {
      ...full,
      recommendations: [
        filteredThreats.length > 0
          ? `⚠ ${filteredThreats.length} threat(s) detected — investigate flagged files immediately.`
          : "✓ No threats detected in this period. System is secure.",
        highThreats.length > 0
          ? `⚠ ${highThreats.length} HIGH severity threat(s) require urgent attention.`
          : "✓ No high-severity threats in this period.",
        mediumThreats.length > 0
          ? `⚠ ${mediumThreats.length} MEDIUM severity threat(s) should be reviewed.`
          : "✓ No medium-severity threats detected.",
        newThreats.length > 0
          ? `⚠ ${newThreats.length} unresolved threat(s) still in "New" status.`
          : "✓ All threats have been triaged.",
        activePolicies.length === 0
          ? "⚠ No active policies — enable policies to begin monitoring."
          : `✓ ${activePolicies.length} policies actively enforcing data leak prevention.`,
        "Schedule regular full scans for continuous coverage.",
        "Review and update regex patterns periodically to reduce false positives.",
        "Ensure whitelisted paths exclude system directories to improve scan performance.",
      ],
      auditTrail: {
        totalEventsLogged:
          filteredScans.length + filteredThreats.length,
        dataRetentionPeriod: "90 days",
        lastAuditDate: new Date().toISOString(),
      },
    };
  }

  public getReportHistory(userId: number): ReportEntity[] {
    return this.reportsRepo.getAllReportsByUserId(userId);
  }

  public getReportFilePath(reportId: number, userId: number): string {
    const report = this.reportsRepo.getReportById(reportId);
    if (!report) throw new NotFoundError("Report not found");
    if (report.userId !== userId)
      throw new ForbiddenError("Unauthorized");
    if (
      report.status !== "completed" ||
      !fs.existsSync(report.filePath)
    ) {
      throw new Error("Report file not available");
    }
    return report.filePath;
  }

  public deleteReport(reportId: number, userId: number): void {
    const report = this.reportsRepo.getReportById(reportId);
    if (!report) throw new NotFoundError("Report not found");
    if (report.userId !== userId)
      throw new ForbiddenError("Unauthorized");
    if (report.filePath && fs.existsSync(report.filePath)) {
      fs.unlinkSync(report.filePath);
    }
    this.reportsRepo.deleteReport(reportId, userId);
  }
}
