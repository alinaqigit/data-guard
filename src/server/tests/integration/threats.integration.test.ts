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

describe("Threats API Integration Tests", () => {
  let app: Application;
  let testDbPath: string;
  let sessionId: string;
  let userId: number;

  beforeEach(async () => {
    testDbPath = createTestDbPath();
    const config: Config = {
      IS_PRODUCTION: false,
      DB_PATH: testDbPath,
    };
    app = createDataGuardApp(config);
    SessionManager.clearAllSessions();

    // Create and login a test user
    const userData = generateTestUser();
    const registerResponse = await request(app)
      .post("/api/auth/register")
      .send(userData);

    sessionId = registerResponse.body.sessionId;
    userId = registerResponse.body.user.id;
  });

  afterEach(() => {
    cleanupTestDb(testDbPath);
    SessionManager.clearAllSessions();
  });

  describe("GET /api/threats", () => {
    it("should return empty threats list initially", async () => {
      const response = await request(app)
        .get("/api/threats")
        .set("x-session-id", sessionId);

      expect(response.status).toBe(200);
      expect(response.body.threats).toBeDefined();
      expect(response.body.threats).toEqual([]);
    });

    it("should require authentication", async () => {
      const response = await request(app).get("/api/threats");

      expect(response.status).toBe(401);
    });
  });

  describe("Threat CRUD via scan", () => {
    let testDir: string;

    beforeEach(async () => {
      // Create test directory with sensitive files
      testDir = fs.mkdtempSync(
        path.join(os.tmpdir(), "threat-test-"),
      );

      fs.writeFileSync(
        path.join(testDir, "secrets.txt"),
        "password=secret123\napi_key=abc123xyz",
      );

      // Create a policy so scanner can detect threats
      await request(app)
        .post("/api/policies")
        .set("x-session-id", sessionId)
        .send({
          name: "Password Policy",
          pattern: "password",
          type: "keyword",
          description: "Detects password keywords",
        });
    });

    afterEach(() => {
      if (testDir && fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true });
      }
    });

    it("should persist threats found during a scan", async () => {
      // Start a scan on the test directory
      const scanResponse = await request(app)
        .post("/api/scans")
        .set("x-session-id", sessionId)
        .send({
          scanType: "custom",
          targetPath: testDir,
        });

      expect(scanResponse.status).toBe(201);
      const scanId = scanResponse.body.scanId;
      expect(scanId).toBeDefined();

      // Wait for scan to complete (it runs async in background)
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Now fetch threats — they should have been persisted
      const threatsResponse = await request(app)
        .get("/api/threats")
        .set("x-session-id", sessionId);

      expect(threatsResponse.status).toBe(200);
      expect(threatsResponse.body.threats.length).toBeGreaterThan(0);

      const threat = threatsResponse.body.threats[0];
      expect(threat.id).toBeDefined();
      expect(threat.userId).toBe(userId);
      expect(threat.scanId).toBe(scanId);
      expect(threat.severity).toMatch(/^(High|Medium|Low)$/);
      expect(threat.status).toBe("New");
      expect(threat.filePath).toBeDefined();
      expect(threat.type).toBe("Policy Violation: Sensitive Content");
      expect(threat.source).toBe("Content Scanner");
    });
  });

  describe("PATCH /api/threats/:id/status", () => {
    it("should update threat status", async () => {
      // First, directly create a threat via the DB layer for testing
      const { threatsModule } =
        await import("../../src/modules/threats");
      const threats = new threatsModule(testDbPath);
      const threat = threats.threatsService.createThreat({
        userId,
        scanId: 1,
        severity: "High",
        type: "Test Threat",
        description: "Test description",
        source: "Test",
        status: "New",
        filePath: "/test/path.txt",
      });

      // Update the status
      const response = await request(app)
        .patch(`/api/threats/${threat.id}/status`)
        .set("x-session-id", sessionId)
        .send({ status: "Resolved" });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Threat status updated");

      // Verify the update persisted
      const getResponse = await request(app)
        .get("/api/threats")
        .set("x-session-id", sessionId);

      const updated = getResponse.body.threats.find(
        (t: any) => t.id === threat.id,
      );
      expect(updated.status).toBe("Resolved");
    });

    it("should reject invalid status", async () => {
      const response = await request(app)
        .patch("/api/threats/1/status")
        .set("x-session-id", sessionId)
        .send({ status: "InvalidStatus" });

      expect(response.status).toBe(400);
    });
  });

  describe("DELETE /api/threats/:id", () => {
    it("should delete a single threat", async () => {
      const { threatsModule } =
        await import("../../src/modules/threats");
      const threats = new threatsModule(testDbPath);
      const threat = threats.threatsService.createThreat({
        userId,
        scanId: 1,
        severity: "Medium",
        type: "Test",
        description: "To be deleted",
        source: "Test",
        status: "New",
        filePath: "/test/delete.txt",
      });

      const response = await request(app)
        .delete(`/api/threats/${threat.id}`)
        .set("x-session-id", sessionId);

      expect(response.status).toBe(200);

      // Verify deletion
      const getResponse = await request(app)
        .get("/api/threats")
        .set("x-session-id", sessionId);

      expect(
        getResponse.body.threats.find((t: any) => t.id === threat.id),
      ).toBeUndefined();
    });
  });

  describe("DELETE /api/threats (clear all)", () => {
    it("should delete all threats for the user", async () => {
      const { threatsModule } =
        await import("../../src/modules/threats");
      const threats = new threatsModule(testDbPath);

      // Create multiple threats
      threats.threatsService.createThreat({
        userId,
        scanId: 1,
        severity: "High",
        type: "Test1",
        description: "First",
        source: "Test",
        status: "New",
        filePath: "/a.txt",
      });
      threats.threatsService.createThreat({
        userId,
        scanId: 1,
        severity: "Low",
        type: "Test2",
        description: "Second",
        source: "Test",
        status: "New",
        filePath: "/b.txt",
      });

      // Verify they exist
      let getResponse = await request(app)
        .get("/api/threats")
        .set("x-session-id", sessionId);
      expect(getResponse.body.threats.length).toBe(2);

      // Delete all
      const response = await request(app)
        .delete("/api/threats")
        .set("x-session-id", sessionId);

      expect(response.status).toBe(200);

      // Verify all deleted
      getResponse = await request(app)
        .get("/api/threats")
        .set("x-session-id", sessionId);
      expect(getResponse.body.threats.length).toBe(0);
    });
  });
});
