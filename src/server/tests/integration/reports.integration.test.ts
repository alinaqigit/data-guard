import request from "supertest";
import { createDataGuardApp, Config } from "../../src/app";
import {
  createTestDbPath,
  cleanupTestDb,
  generateTestUser,
} from "../helpers";
import { SessionManager } from "../../src/modules/auth/auth.session";
import { Application } from "express";
import fs from "fs";
import path from "path";
import os from "os";

// Mock generators to avoid real PDF/XLSX dependencies
jest.mock("../../src/modules/reports/pdf.generator", () => ({
  generatePDF: async (_data: any, filePath: string) => {
    const fs = require("fs");
    fs.writeFileSync(filePath, "mock-pdf");
  },
}));
jest.mock("../../src/modules/reports/xlsx.generator", () => ({
  generateXLSX: async (_data: any, filePath: string) => {
    const fs = require("fs");
    fs.writeFileSync(filePath, "mock-xlsx");
  },
}));

describe("Reports API Integration Tests", () => {
  let app: Application;
  let testDbPath: string;
  let sessionId: string;

  async function registerAndLogin(): Promise<string> {
    const userData = generateTestUser();
    const res = await request(app)
      .post("/api/auth/register")
      .send(userData)
      .expect(201);
    return res.body.sessionId;
  }

  beforeEach(async () => {
    testDbPath = createTestDbPath();
    const config: Config = {
      IS_PRODUCTION: false,
      DB_PATH: testDbPath,
    };
    app = createDataGuardApp(config);
    SessionManager.clearAllSessions();
    sessionId = await registerAndLogin();
  });

  afterEach(() => {
    // Clean report files
    const outputDir = path.join(os.tmpdir(), "dataguard", "reports");
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

  // ── POST /api/reports ──────────────────────────────────────────────────────

  describe("POST /api/reports", () => {
    it("should generate a JSON report", async () => {
      const res = await request(app)
        .post("/api/reports")
        .set("x-session-id", sessionId)
        .send({
          reportType: "quick",
          format: "json",
          dateRange: "all",
        })
        .expect(201);

      expect(res.body.reportId).toBeGreaterThan(0);
      expect(res.body.message).toContain("generated");
    });

    it("should generate a PDF report", async () => {
      const res = await request(app)
        .post("/api/reports")
        .set("x-session-id", sessionId)
        .send({
          reportType: "full",
          format: "pdf",
          dateRange: "today",
        })
        .expect(201);

      expect(res.body.reportId).toBeGreaterThan(0);
    });

    it("should generate an XLSX report", async () => {
      const res = await request(app)
        .post("/api/reports")
        .set("x-session-id", sessionId)
        .send({
          reportType: "deep",
          format: "xlsx",
          dateRange: "weekly",
        })
        .expect(201);

      expect(res.body.reportId).toBeGreaterThan(0);
    });

    it("should return 400 for invalid reportType", async () => {
      await request(app)
        .post("/api/reports")
        .set("x-session-id", sessionId)
        .send({
          reportType: "invalid",
          format: "json",
          dateRange: "all",
        })
        .expect(400);
    });

    it("should return 400 for invalid format", async () => {
      await request(app)
        .post("/api/reports")
        .set("x-session-id", sessionId)
        .send({
          reportType: "quick",
          format: "csv",
          dateRange: "all",
        })
        .expect(400);
    });

    it("should return 400 for invalid dateRange", async () => {
      await request(app)
        .post("/api/reports")
        .set("x-session-id", sessionId)
        .send({
          reportType: "quick",
          format: "json",
          dateRange: "monthly",
        })
        .expect(400);
    });

    it("should return 401 without session", async () => {
      await request(app)
        .post("/api/reports")
        .send({
          reportType: "quick",
          format: "json",
          dateRange: "all",
        })
        .expect(401);
    });
  });

  // ── GET /api/reports ───────────────────────────────────────────────────────

  describe("GET /api/reports", () => {
    it("should return empty list initially", async () => {
      const res = await request(app)
        .get("/api/reports")
        .set("x-session-id", sessionId)
        .expect(200);

      expect(res.body.reports).toEqual([]);
    });

    it("should return generated reports", async () => {
      await request(app)
        .post("/api/reports")
        .set("x-session-id", sessionId)
        .send({
          reportType: "quick",
          format: "json",
          dateRange: "all",
        })
        .expect(201);

      const res = await request(app)
        .get("/api/reports")
        .set("x-session-id", sessionId)
        .expect(200);

      expect(res.body.reports).toHaveLength(1);
      expect(res.body.reports[0].reportType).toBe("quick");
    });

    it("should return 401 without session", async () => {
      await request(app).get("/api/reports").expect(401);
    });
  });

  // ── GET /api/reports/:id/download ──────────────────────────────────────────

  describe("GET /api/reports/:id/download", () => {
    it("should download a generated report", async () => {
      const createRes = await request(app)
        .post("/api/reports")
        .set("x-session-id", sessionId)
        .send({
          reportType: "quick",
          format: "json",
          dateRange: "all",
        })
        .expect(201);

      const res = await request(app)
        .get(`/api/reports/${createRes.body.reportId}/download`)
        .set("x-session-id", sessionId)
        .expect(200);

      expect(res.headers["content-disposition"]).toContain(
        "attachment",
      );
    });

    it("should return 400 for invalid ID", async () => {
      await request(app)
        .get("/api/reports/abc/download")
        .set("x-session-id", sessionId)
        .expect(400);
    });

    it("should return 404 for non-existent report", async () => {
      await request(app)
        .get("/api/reports/99999/download")
        .set("x-session-id", sessionId)
        .expect(404);
    });

    it("should return 401 without session", async () => {
      await request(app).get("/api/reports/1/download").expect(401);
    });
  });

  // ── DELETE /api/reports/:id ────────────────────────────────────────────────

  describe("DELETE /api/reports/:id", () => {
    it("should delete a report", async () => {
      const createRes = await request(app)
        .post("/api/reports")
        .set("x-session-id", sessionId)
        .send({
          reportType: "quick",
          format: "json",
          dateRange: "all",
        })
        .expect(201);

      await request(app)
        .delete(`/api/reports/${createRes.body.reportId}`)
        .set("x-session-id", sessionId)
        .expect(200);

      // Verify it's gone
      const listRes = await request(app)
        .get("/api/reports")
        .set("x-session-id", sessionId)
        .expect(200);

      expect(listRes.body.reports).toHaveLength(0);
    });

    it("should return 400 for invalid ID", async () => {
      await request(app)
        .delete("/api/reports/abc")
        .set("x-session-id", sessionId)
        .expect(400);
    });

    it("should return 404 for non-existent report", async () => {
      await request(app)
        .delete("/api/reports/99999")
        .set("x-session-id", sessionId)
        .expect(404);
    });

    it("should return 401 without session", async () => {
      await request(app).delete("/api/reports/1").expect(401);
    });
  });

  // ── Cross-user isolation ───────────────────────────────────────────────────

  describe("cross-user isolation", () => {
    it("should not allow downloading another user's report", async () => {
      // User 1 creates a report
      const createRes = await request(app)
        .post("/api/reports")
        .set("x-session-id", sessionId)
        .send({
          reportType: "quick",
          format: "json",
          dateRange: "all",
        })
        .expect(201);

      // Register a second user
      const user2 = generateTestUser();
      const reg2 = await request(app)
        .post("/api/auth/register")
        .send(user2)
        .expect(201);

      // User 2 tries to download User 1's report
      await request(app)
        .get(`/api/reports/${createRes.body.reportId}/download`)
        .set("x-session-id", reg2.body.sessionId)
        .expect(403);
    });

    it("should not allow deleting another user's report", async () => {
      const createRes = await request(app)
        .post("/api/reports")
        .set("x-session-id", sessionId)
        .send({
          reportType: "quick",
          format: "json",
          dateRange: "all",
        })
        .expect(201);

      const user2 = generateTestUser();
      const reg2 = await request(app)
        .post("/api/auth/register")
        .send(user2)
        .expect(201);

      await request(app)
        .delete(`/api/reports/${createRes.body.reportId}`)
        .set("x-session-id", reg2.body.sessionId)
        .expect(403);
    });
  });
});
