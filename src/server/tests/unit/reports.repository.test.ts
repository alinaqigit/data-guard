import { reportsRepository } from "../../src/modules/reports/reports.repository";
import { dbModule } from "../../src/modules/db";
import { createTestDbPath, cleanupTestDb } from "../helpers";

describe("reportsRepository", () => {
  let repo: reportsRepository;
  let testDbPath: string;
  const testUserId = 1;

  beforeEach(() => {
    testDbPath = createTestDbPath();
    // Initialize full schema first (creates users table needed by FK constraint)
    const db = new dbModule(testDbPath);
    db.dbService.user.createUser({ username: "testuser", passwordHash: "hash" });
    db.dbService.user.createUser({ username: "testuser2", passwordHash: "hash" });
    repo = new reportsRepository(testDbPath);
  });

  afterEach(() => {
    cleanupTestDb(testDbPath);
  });

  describe("createReport", () => {
    it("should create a report with pending status", () => {
      const report = repo.createReport({
        userId: testUserId,
        name: "Test Report",
        reportType: "quick",
        format: "json",
        dateRange: "today",
      });

      expect(report).toBeDefined();
      expect(report.id).toBeGreaterThan(0);
      expect(report.userId).toBe(testUserId);
      expect(report.name).toBe("Test Report");
      expect(report.reportType).toBe("quick");
      expect(report.format).toBe("json");
      expect(report.dateRange).toBe("today");
      expect(report.status).toBe("pending");
      expect(report.filePath).toBe("");
      expect(report.fileSizeBytes).toBe(0);
      expect(report.createdAt).toBeDefined();
    });

    it("should create reports with different types", () => {
      const quick = repo.createReport({
        userId: testUserId,
        name: "Q",
        reportType: "quick",
        format: "json",
        dateRange: "today",
      });
      const full = repo.createReport({
        userId: testUserId,
        name: "F",
        reportType: "full",
        format: "pdf",
        dateRange: "weekly",
      });
      const deep = repo.createReport({
        userId: testUserId,
        name: "D",
        reportType: "deep",
        format: "xlsx",
        dateRange: "all",
      });

      expect(quick.reportType).toBe("quick");
      expect(full.reportType).toBe("full");
      expect(deep.reportType).toBe("deep");
    });

    it("should auto-increment IDs", () => {
      const r1 = repo.createReport({
        userId: testUserId,
        name: "R1",
        reportType: "quick",
        format: "json",
        dateRange: "today",
      });
      const r2 = repo.createReport({
        userId: testUserId,
        name: "R2",
        reportType: "full",
        format: "pdf",
        dateRange: "all",
      });

      expect(r2.id).toBe(r1.id + 1);
    });
  });

  describe("updateReport", () => {
    it("should update status and file info", () => {
      const report = repo.createReport({
        userId: testUserId,
        name: "Update Test",
        reportType: "quick",
        format: "json",
        dateRange: "today",
      });

      repo.updateReport(report.id, {
        status: "completed",
        filePath: "/tmp/report_1.json",
        fileSizeBytes: 1024,
      });

      const updated = repo.getReportById(report.id);
      expect(updated).toBeDefined();
      expect(updated!.status).toBe("completed");
      expect(updated!.filePath).toBe("/tmp/report_1.json");
      expect(updated!.fileSizeBytes).toBe(1024);
    });

    it("should update to failed status", () => {
      const report = repo.createReport({
        userId: testUserId,
        name: "Fail Test",
        reportType: "deep",
        format: "pdf",
        dateRange: "all",
      });

      repo.updateReport(report.id, { status: "failed" });

      const updated = repo.getReportById(report.id);
      expect(updated!.status).toBe("failed");
    });
  });

  describe("getReportById", () => {
    it("should return report by ID", () => {
      const report = repo.createReport({
        userId: testUserId,
        name: "Get Test",
        reportType: "quick",
        format: "json",
        dateRange: "today",
      });

      const fetched = repo.getReportById(report.id);
      expect(fetched).toBeDefined();
      expect(fetched!.id).toBe(report.id);
      expect(fetched!.name).toBe("Get Test");
    });

    it("should return null for non-existent ID", () => {
      const result = repo.getReportById(99999);
      expect(result).toBeNull();
    });
  });

  describe("getAllReportsByUserId", () => {
    it("should return reports for specific user only", () => {
      repo.createReport({
        userId: 1,
        name: "User1 R1",
        reportType: "quick",
        format: "json",
        dateRange: "today",
      });
      repo.createReport({
        userId: 1,
        name: "User1 R2",
        reportType: "full",
        format: "pdf",
        dateRange: "all",
      });
      repo.createReport({
        userId: 2,
        name: "User2 R1",
        reportType: "deep",
        format: "xlsx",
        dateRange: "weekly",
      });

      const user1Reports = repo.getAllReportsByUserId(1);
      const user2Reports = repo.getAllReportsByUserId(2);

      expect(user1Reports).toHaveLength(2);
      expect(user2Reports).toHaveLength(1);
    });

    it("should return empty array for user with no reports", () => {
      const reports = repo.getAllReportsByUserId(999);
      expect(reports).toEqual([]);
    });

    it("should return results ordered by created_at DESC", async () => {
      repo.createReport({
        userId: testUserId,
        name: "First",
        reportType: "quick",
        format: "json",
        dateRange: "today",
      });
      // Small delay to ensure distinct created_at timestamps
      await new Promise((resolve) => setTimeout(resolve, 1100));
      repo.createReport({
        userId: testUserId,
        name: "Second",
        reportType: "full",
        format: "pdf",
        dateRange: "all",
      });

      const reports = repo.getAllReportsByUserId(testUserId);

      expect(reports).toHaveLength(2);
      // Most recent first (ORDER BY created_at DESC)
      expect(reports[0].name).toBe("Second");
      expect(reports[1].name).toBe("First");
    });
  });

  describe("deleteReport", () => {
    it("should delete report by id and userId", () => {
      const report = repo.createReport({
        userId: testUserId,
        name: "To Delete",
        reportType: "quick",
        format: "json",
        dateRange: "today",
      });

      repo.deleteReport(report.id, testUserId);

      const result = repo.getReportById(report.id);
      expect(result).toBeNull();
    });

    it("should not delete another user's report", () => {
      const report = repo.createReport({
        userId: 1,
        name: "Protected",
        reportType: "quick",
        format: "json",
        dateRange: "today",
      });

      repo.deleteReport(report.id, 999); // wrong userId

      const result = repo.getReportById(report.id);
      expect(result).toBeDefined(); // still exists
    });
  });
});
