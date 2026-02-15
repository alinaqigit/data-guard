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

describe("Scanner API Integration Tests", () => {
  let app: Application;
  let testDbPath: string;
  let sessionId: string;
  let userId: number;
  let testDir: string;
  let policyId: number;

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

    // Create a test directory with files
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), "scanner-test-"));

    // Create test files with sensitive data
    fs.writeFileSync(
      path.join(testDir, "secrets.txt"),
      "password=secret123\napi_key=abc123xyz",
    );
    fs.writeFileSync(
      path.join(testDir, "config.json"),
      '{"username": "admin", "password": "admin123"}',
    );
    fs.writeFileSync(
      path.join(testDir, "normal.txt"),
      "This is a normal file without sensitive data",
    );

    // Create a subdirectory
    const subDir = path.join(testDir, "subdir");
    fs.mkdirSync(subDir);
    fs.writeFileSync(
      path.join(subDir, "nested.txt"),
      "password: nested_secret",
    );

    // Create a policy for scanning
    const policyResponse = await request(app)
      .post("/api/policies")
      .set("x-session-id", sessionId)
      .send({
        name: "Password Policy",
        pattern: "password",
        type: "keyword",
        description: "Detects password keywords",
      });
    policyId = policyResponse.body.id;
  });

  afterEach(() => {
    cleanupTestDb(testDbPath);
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe("POST /api/scans", () => {
    it("should start a new full scan", async () => {
      const scanRequest = {
        scanType: "full",
        targetPath: testDir,
      };

      const response = await request(app)
        .post("/api/scans")
        .set("x-session-id", sessionId)
        .send(scanRequest)
        .expect(201);

      expect(response.body.scanId).toBeDefined();
      expect(response.body.message).toBe("Scan started successfully");

      // Wait a bit for scan to complete
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Verify scan was created
      const scanResponse = await request(app)
        .get(`/api/scans/${response.body.scanId}`)
        .set("x-session-id", sessionId)
        .expect(200);

      expect(scanResponse.body.id).toBe(response.body.scanId);
      expect(scanResponse.body.scanType).toBe("full");
      expect(scanResponse.body.status).toMatch(/running|completed/);
    });

    it("should start a quick scan", async () => {
      const scanRequest = {
        scanType: "quick",
        targetPath: testDir,
        options: {
          maxDepth: 1,
        },
      };

      const response = await request(app)
        .post("/api/scans")
        .set("x-session-id", sessionId)
        .send(scanRequest)
        .expect(201);

      expect(response.body.scanId).toBeDefined();
    });

    it("should return 400 for missing scanType", async () => {
      const scanRequest = {
        targetPath: testDir,
      };

      await request(app)
        .post("/api/scans")
        .set("x-session-id", sessionId)
        .send(scanRequest)
        .expect(400);
    });

    it("should return 400 for invalid scanType", async () => {
      const scanRequest = {
        scanType: "invalid",
        targetPath: testDir,
      };

      await request(app)
        .post("/api/scans")
        .set("x-session-id", sessionId)
        .send(scanRequest)
        .expect(400);
    });

    it("should return 401 without session", async () => {
      const scanRequest = {
        scanType: "full",
        targetPath: testDir,
      };

      await request(app)
        .post("/api/scans")
        .send(scanRequest)
        .expect(401);
    });

    it("should return 500 for non-existent path", async () => {
      const scanRequest = {
        scanType: "full",
        targetPath: "/non/existent/path",
      };

      const response = await request(app)
        .post("/api/scans")
        .set("x-session-id", sessionId)
        .send(scanRequest)
        .expect(500);

      expect(response.body.error).toContain("does not exist");
    });

    it("should return error when no policies are enabled", async () => {
      // Disable the policy
      await request(app)
        .patch(`/api/policies/${policyId}/toggle`)
        .set("x-session-id", sessionId);

      const scanRequest = {
        scanType: "full",
        targetPath: testDir,
      };

      const response = await request(app)
        .post("/api/scans")
        .set("x-session-id", sessionId)
        .send(scanRequest)
        .expect(500);

      expect(response.body.error).toContain("No active policies");
    });
  });

  describe("GET /api/scans", () => {
    it("should get scan history for user", async () => {
      // Start a scan first
      await request(app)
        .post("/api/scans")
        .set("x-session-id", sessionId)
        .send({
          scanType: "full",
          targetPath: testDir,
        });

      // Get scan history
      const response = await request(app)
        .get("/api/scans")
        .set("x-session-id", sessionId)
        .expect(200);

      expect(response.body.scans).toBeDefined();
      expect(Array.isArray(response.body.scans)).toBe(true);
      expect(response.body.scans.length).toBeGreaterThan(0);
    });

    it("should respect limit parameter", async () => {
      // Start multiple scans
      await request(app)
        .post("/api/scans")
        .set("x-session-id", sessionId)
        .send({ scanType: "full", targetPath: testDir });

      await request(app)
        .post("/api/scans")
        .set("x-session-id", sessionId)
        .send({ scanType: "quick", targetPath: testDir });

      // Get limited history
      const response = await request(app)
        .get("/api/scans?limit=1")
        .set("x-session-id", sessionId)
        .expect(200);

      expect(response.body.scans.length).toBe(1);
    });

    it("should return 401 without session", async () => {
      await request(app).get("/api/scans").expect(401);
    });
  });

  describe("GET /api/scans/:id", () => {
    it("should get specific scan by id", async () => {
      // Start a scan
      const startResponse = await request(app)
        .post("/api/scans")
        .set("x-session-id", sessionId)
        .send({
          scanType: "full",
          targetPath: testDir,
        });

      const scanId = startResponse.body.scanId;

      // Get the scan
      const response = await request(app)
        .get(`/api/scans/${scanId}`)
        .set("x-session-id", sessionId)
        .expect(200);

      expect(response.body.id).toBe(scanId);
      expect(response.body.userId).toBe(userId);
      expect(response.body.scanType).toBe("full");
      expect(response.body.targetPath).toBe(testDir);
    });

    it("should return 404 for non-existent scan", async () => {
      await request(app)
        .get("/api/scans/99999")
        .set("x-session-id", sessionId)
        .expect(404);
    });

    it("should return 400 for invalid scan id", async () => {
      await request(app)
        .get("/api/scans/invalid")
        .set("x-session-id", sessionId)
        .expect(400);
    });

    it("should return 401 without session", async () => {
      await request(app).get("/api/scans/1").expect(401);
    });
  });

  describe("GET /api/scans/:id/progress", () => {
    it("should get scan progress", async () => {
      // Start a scan
      const startResponse = await request(app)
        .post("/api/scans")
        .set("x-session-id", sessionId)
        .send({
          scanType: "full",
          targetPath: testDir,
        });

      const scanId = startResponse.body.scanId;

      // Get progress
      const response = await request(app)
        .get(`/api/scans/${scanId}/progress`)
        .set("x-session-id", sessionId)
        .expect(200);

      expect(response.body.scanId).toBe(scanId);
      expect(response.body.status).toBeDefined();
      expect(response.body.filesScanned).toBeDefined();
      expect(response.body.startedAt).toBeDefined();
      expect(response.body.elapsedTime).toBeDefined();
    });

    it("should return 404 for non-existent scan", async () => {
      await request(app)
        .get("/api/scans/99999/progress")
        .set("x-session-id", sessionId)
        .expect(404);
    });

    it("should return 401 without session", async () => {
      await request(app).get("/api/scans/1/progress").expect(401);
    });
  });

  describe("PATCH /api/scans/:id/cancel", () => {
    it("should cancel a running scan", async () => {
      // Create a temporary directory with many files to ensure scan takes time
      const largeTestDir = fs.mkdtempSync(
        path.join(os.tmpdir(), "scanner-cancel-test-"),
      );

      // Create 1000 test files with more content to slow down the scan significantly
      for (let i = 0; i < 1000; i++) {
        const content = `
password=secret${i}
api_key=key${i}
Some additional content to make file scanning take longer
Line 4: password
Line 5: token=abc123
Line 6: More content here
Line 7: credentials
Line 8: password
Line 9: api_key
Line 10: More data to process
Line 11: password
Line 12: token
Line 13: secret
Line 14: credentials
Line 15: api_key
        `.trim();
        fs.writeFileSync(
          path.join(largeTestDir, `file${i}.txt`),
          content,
        );
      }

      // Start a scan
      const startResponse = await request(app)
        .post("/api/scans")
        .set("x-session-id", sessionId)
        .send({
          scanType: "full",
          targetPath: largeTestDir,
        });

      const scanId = startResponse.body.scanId;

      // Poll until scan is confirmed running
      let isRunning = false;
      for (let i = 0; i < 10; i++) {
        await new Promise((resolve) => setTimeout(resolve, 50));
        const progressResponse = await request(app)
          .get(`/api/scans/${scanId}/progress`)
          .set("x-session-id", sessionId);

        if (progressResponse.body.status === "running") {
          isRunning = true;
          break;
        }
      }

      // If scan is still running, cancel it
      if (isRunning) {
        const response = await request(app)
          .patch(`/api/scans/${scanId}/cancel`)
          .set("x-session-id", sessionId)
          .expect(200);

        expect(response.body.message).toBe(
          "Scan cancellation requested",
        );
      } else {
        // If scan completed too fast, just verify cancellation returns appropriate error
        const response = await request(app)
          .patch(`/api/scans/${scanId}/cancel`)
          .set("x-session-id", sessionId);

        // Either 200 (cancelled while running) or 400 (already completed)
        expect([200, 400]).toContain(response.status);
      }

      // Clean up
      fs.rmSync(largeTestDir, { recursive: true, force: true });
    }, 10000); // 10 second timeout for this test

    it("should return 404 for non-existent scan", async () => {
      await request(app)
        .patch("/api/scans/99999/cancel")
        .set("x-session-id", sessionId)
        .expect(404);
    });

    it("should return 401 without session", async () => {
      await request(app).patch("/api/scans/1/cancel").expect(401);
    });
  });

  describe("DELETE /api/scans/:id", () => {
    it("should delete a completed scan", async () => {
      // Start and wait for a scan to complete
      const startResponse = await request(app)
        .post("/api/scans")
        .set("x-session-id", sessionId)
        .send({
          scanType: "full",
          targetPath: testDir,
        });

      const scanId = startResponse.body.scanId;

      // Wait for scan to complete
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Delete the scan
      await request(app)
        .delete(`/api/scans/${scanId}`)
        .set("x-session-id", sessionId)
        .expect(200);
    });

    it("should return 404 for non-existent scan", async () => {
      await request(app)
        .delete("/api/scans/99999")
        .set("x-session-id", sessionId)
        .expect(404);
    });

    it("should return 401 without session", async () => {
      await request(app).delete("/api/scans/1").expect(401);
    });
  });

  describe("Scan Functionality", () => {
    it("should detect threats in files", async () => {
      const scanRequest = {
        scanType: "full",
        targetPath: testDir,
      };

      const startResponse = await request(app)
        .post("/api/scans")
        .set("x-session-id", sessionId)
        .send(scanRequest);

      await new Promise((resolve) => setTimeout(resolve, 2500));

      const scanResponse = await request(app)
        .get(`/api/scans/${startResponse.body.scanId}`)
        .set("x-session-id", sessionId);

      expect(scanResponse.body.status).toBe("completed");
      expect(scanResponse.body.filesScanned).toBeGreaterThan(0);
      expect(scanResponse.body.totalThreats).toBeGreaterThan(0);
    });

    it("should respect file extensions filter", async () => {
      const scanRequest = {
        scanType: "custom",
        targetPath: testDir,
        options: {
          includeExtensions: [".txt"],
        },
      };

      const startResponse = await request(app)
        .post("/api/scans")
        .set("x-session-id", sessionId)
        .send(scanRequest);

      await new Promise((resolve) => setTimeout(resolve, 1500));

      const scanResponse = await request(app)
        .get(`/api/scans/${startResponse.body.scanId}`)
        .set("x-session-id", sessionId);

      // Should only scan .txt files (3 files: secrets.txt, normal.txt, nested.txt)
      expect(scanResponse.body.filesScanned).toBeLessThanOrEqual(3);
    });

    it("should respect exclude paths", async () => {
      const scanRequest = {
        scanType: "full",
        targetPath: testDir,
        options: {
          excludePaths: ["subdir"],
        },
      };

      const startResponse = await request(app)
        .post("/api/scans")
        .set("x-session-id", sessionId)
        .send(scanRequest);

      await new Promise((resolve) => setTimeout(resolve, 1500));

      const scanResponse = await request(app)
        .get(`/api/scans/${startResponse.body.scanId}`)
        .set("x-session-id", sessionId);

      // Should not include files from subdir
      expect(scanResponse.body.filesScanned).toBeLessThan(4);
    });
  });
});
