import path from "path";
import fs from "fs";
import os from "os";
import { reportsService } from "../../src/modules/reports/reports.service";
import { createTestDbPath, cleanupTestDb } from "../helpers";
import { dbModule } from "../../src/modules/db";
import {
  NotFoundError,
  ForbiddenError,
} from "../../src/utils/errors";

// Mock generators — we don't want real PDF/XLSX generation in unit tests
// Plain functions (not jest.fn) since resetMocks: true would clear jest.fn implementations
jest.mock("../../src/modules/reports/pdf.generator", () => ({
  generatePDF: async (_data: any, filePath: string) => {
    require("fs").writeFileSync(filePath, "mock-pdf-content");
  },
}));
jest.mock("../../src/modules/reports/xlsx.generator", () => ({
  generateXLSX: async (_data: any, filePath: string) => {
    require("fs").writeFileSync(filePath, "mock-xlsx-content");
  },
}));
jest.mock("../../src/modules/reports/json.generator", () => ({
  generateJSON: (_data: any, filePath: string) => {
    require("fs").writeFileSync(
      filePath,
      JSON.stringify({ mock: true }),
    );
  },
}));

describe("reportsService", () => {
  let service: reportsService;
  let db: dbModule;
  let testDbPath: string;
  const testUserId = 1;
  const testUsername = "testuser";
  let outputDir: string;

  beforeEach(() => {
    testDbPath = createTestDbPath();
    service = new reportsService(testDbPath);
    db = new dbModule(testDbPath);

    // Seed a user for foreign key references
    db.dbService.user.createUser({
      username: testUsername,
      passwordHash: "hashedpass",
    });

    outputDir = path.join(os.tmpdir(), "dataguard", "reports");
  });

  afterEach(() => {
    // Clean generated report files
    if (fs.existsSync(outputDir)) {
      try {
        for (const f of fs.readdirSync(outputDir)) {
          if (f.startsWith("report_")) {
            try {
              fs.unlinkSync(path.join(outputDir, f));
            } catch {
              /* ok */
            }
          }
        }
      } catch {
        /* ok */
      }
    }
    cleanupTestDb(testDbPath);
  });

  // ── Helper: seed scan records ──────────────────────────────────────────────
  function seedScans(
    count: number,
    options: { threats?: number } = {},
  ) {
    for (let i = 0; i < count; i++) {
      const scan = db.dbService.scan.createScan({
        userId: testUserId,
        scanType: "quick",
        targetPath: "/tmp/test",
        status: "completed",
      });
      db.dbService.scan.updateScan(scan.id, testUserId, {
        filesScanned: 10,
        filesWithThreats: options.threats ? 2 : 0,
        totalThreats: options.threats ?? 0,
        completedAt: new Date().toISOString(),
      });
    }
  }

  function seedPolicies(count: number) {
    for (let i = 0; i < count; i++) {
      db.dbService.policy.createPolicy({
        userId: testUserId,
        name: `Policy ${i + 1}`,
        pattern: `secret${i}`,
        type: "keyword",
        description: `Test policy ${i + 1}`,
      });
    }
  }

  // ── generateReport ────────────────────────────────────────────────────────

  describe("generateReport", () => {
    it("should generate a JSON report (quick)", async () => {
      seedScans(2);
      seedPolicies(1);

      const result = await service.generateReport(
        testUserId,
        testUsername,
        {
          reportType: "quick",
          format: "json",
          dateRange: "all",
        },
      );

      expect(result.reportId).toBeGreaterThan(0);
      expect(result.filePath).toContain(".json");
      expect(fs.existsSync(result.filePath)).toBe(true);
    });

    it("should generate a PDF report (full)", async () => {
      seedScans(3, { threats: 2 });
      seedPolicies(2);

      const result = await service.generateReport(
        testUserId,
        testUsername,
        {
          reportType: "full",
          format: "pdf",
          dateRange: "all",
        },
      );

      expect(result.filePath).toContain(".pdf");
      expect(fs.existsSync(result.filePath)).toBe(true);
    });

    it("should generate an XLSX report (deep)", async () => {
      seedScans(1);
      seedPolicies(1);

      const result = await service.generateReport(
        testUserId,
        testUsername,
        {
          reportType: "deep",
          format: "xlsx",
          dateRange: "all",
        },
      );

      expect(result.filePath).toContain(".xlsx");
      expect(fs.existsSync(result.filePath)).toBe(true);
    });

    it("should use custom report name when provided", async () => {
      seedScans(1);

      const result = await service.generateReport(
        testUserId,
        testUsername,
        {
          reportType: "quick",
          format: "json",
          dateRange: "all",
          reportName: "My Custom Report",
        },
      );

      const history = service.getReportHistory(testUserId);
      const report = history.find((r) => r.id === result.reportId);
      expect(report?.name).toBe("My Custom Report");
    });

    it("should auto-generate report name if not provided", async () => {
      seedScans(1);

      const result = await service.generateReport(
        testUserId,
        testUsername,
        {
          reportType: "quick",
          format: "json",
          dateRange: "today",
        },
      );

      const history = service.getReportHistory(testUserId);
      const report = history.find((r) => r.id === result.reportId);
      expect(report?.name).toContain("quick_report_");
    });

    it("should mark report as completed with file size", async () => {
      seedScans(1);

      const result = await service.generateReport(
        testUserId,
        testUsername,
        {
          reportType: "quick",
          format: "json",
          dateRange: "all",
        },
      );

      const history = service.getReportHistory(testUserId);
      const report = history.find((r) => r.id === result.reportId);
      expect(report?.status).toBe("completed");
      expect(report?.fileSizeBytes).toBeGreaterThan(0);
    });

    it("should generate report with zero scans/policies", async () => {
      const result = await service.generateReport(
        testUserId,
        testUsername,
        {
          reportType: "quick",
          format: "json",
          dateRange: "all",
        },
      );

      expect(result.reportId).toBeGreaterThan(0);
    });

    it("should generate deep report with recommendations", async () => {
      seedScans(2, { threats: 10 });
      seedPolicies(2);

      const result = await service.generateReport(
        testUserId,
        testUsername,
        {
          reportType: "deep",
          format: "json",
          dateRange: "all",
        },
      );

      expect(result.reportId).toBeGreaterThan(0);
      // Deep report is generated — verify it didn't throw
    });
  });

  // ── getReportHistory ────────────────────────────────────────────────────────

  describe("getReportHistory", () => {
    it("should return empty array for user with no reports", () => {
      expect(service.getReportHistory(testUserId)).toEqual([]);
    });

    it("should return all reports for the user", async () => {
      seedScans(1);
      await service.generateReport(testUserId, testUsername, {
        reportType: "quick",
        format: "json",
        dateRange: "all",
      });
      await service.generateReport(testUserId, testUsername, {
        reportType: "full",
        format: "pdf",
        dateRange: "all",
      });

      const history = service.getReportHistory(testUserId);
      expect(history).toHaveLength(2);
    });

    it("should not return other users' reports", async () => {
      seedScans(1);
      await service.generateReport(testUserId, testUsername, {
        reportType: "quick",
        format: "json",
        dateRange: "all",
      });

      const history = service.getReportHistory(999);
      expect(history).toHaveLength(0);
    });
  });

  // ── getReportFilePath ───────────────────────────────────────────────────────

  describe("getReportFilePath", () => {
    it("should return file path for completed report", async () => {
      seedScans(1);
      const { reportId, filePath } = await service.generateReport(
        testUserId,
        testUsername,
        {
          reportType: "quick",
          format: "json",
          dateRange: "all",
        },
      );

      const result = service.getReportFilePath(reportId, testUserId);
      expect(result).toBe(filePath);
    });

    it("should throw NotFoundError for non-existent report", () => {
      expect(() =>
        service.getReportFilePath(99999, testUserId),
      ).toThrow(NotFoundError);
    });

    it("should throw ForbiddenError for wrong user", async () => {
      seedScans(1);
      const { reportId } = await service.generateReport(
        testUserId,
        testUsername,
        {
          reportType: "quick",
          format: "json",
          dateRange: "all",
        },
      );

      expect(() => service.getReportFilePath(reportId, 999)).toThrow(
        ForbiddenError,
      );
    });
  });

  // ── deleteReport ─────────────────────────────────────────────────────────

  describe("deleteReport", () => {
    it("should delete report and its file", async () => {
      seedScans(1);
      const { reportId, filePath } = await service.generateReport(
        testUserId,
        testUsername,
        {
          reportType: "quick",
          format: "json",
          dateRange: "all",
        },
      );

      expect(fs.existsSync(filePath)).toBe(true);

      service.deleteReport(reportId, testUserId);

      expect(fs.existsSync(filePath)).toBe(false);
      expect(service.getReportHistory(testUserId)).toHaveLength(0);
    });

    it("should throw NotFoundError for non-existent report", () => {
      expect(() => service.deleteReport(99999, testUserId)).toThrow(
        NotFoundError,
      );
    });

    it("should throw ForbiddenError for wrong user", async () => {
      seedScans(1);
      const { reportId } = await service.generateReport(
        testUserId,
        testUsername,
        {
          reportType: "quick",
          format: "json",
          dateRange: "all",
        },
      );

      expect(() => service.deleteReport(reportId, 999)).toThrow(
        ForbiddenError,
      );
    });

    it("should succeed even if file was already deleted", async () => {
      seedScans(1);
      const { reportId, filePath } = await service.generateReport(
        testUserId,
        testUsername,
        {
          reportType: "quick",
          format: "json",
          dateRange: "all",
        },
      );

      // Manually delete the file first
      fs.unlinkSync(filePath);

      // Should not throw
      expect(() =>
        service.deleteReport(reportId, testUserId),
      ).not.toThrow();
    });
  });
});
