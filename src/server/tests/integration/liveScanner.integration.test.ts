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

describe("Live Scanner API Integration Tests", () => {
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
    testDir = fs.mkdtempSync(
      path.join(os.tmpdir(), "live-scanner-test-"),
    );

    // Create test files
    fs.writeFileSync(
      path.join(testDir, "safe.txt"),
      "This is safe content",
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

  afterEach(async () => {
    // Get all live scanners and stop them
    try {
      const scannersResponse = await request(app)
        .get("/api/live-scanners")
        .set("x-session-id", sessionId);

      if (
        scannersResponse.body &&
        Array.isArray(scannersResponse.body)
      ) {
        for (const scanner of scannersResponse.body) {
          await request(app)
            .post(`/api/live-scanners/${scanner.id}/stop`)
            .set("x-session-id", sessionId);
        }
      }
    } catch (error) {
      // Ignore errors during cleanup
    }

    cleanupTestDb(testDbPath);

    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe("POST /api/live-scanners", () => {
    it("should start a new live scanner", async () => {
      const scannerRequest = {
        name: "Test Scanner",
        targetPath: testDir,
        watchMode: "file-changes",
        isRecursive: true,
      };

      const response = await request(app)
        .post("/api/live-scanners")
        .set("x-session-id", sessionId)
        .send(scannerRequest)
        .expect(201);

      expect(response.body.scannerId).toBeDefined();
      expect(response.body.message).toBe(
        "Live scanner started successfully",
      );
    });

    it("should fail without authentication", async () => {
      const scannerRequest = {
        name: "Test Scanner",
        targetPath: testDir,
        watchMode: "file-changes",
        isRecursive: true,
      };

      await request(app)
        .post("/api/live-scanners")
        .send(scannerRequest)
        .expect(401);
    });

    it("should fail with invalid session", async () => {
      const scannerRequest = {
        name: "Test Scanner",
        targetPath: testDir,
        watchMode: "file-changes",
        isRecursive: true,
      };

      await request(app)
        .post("/api/live-scanners")
        .set("x-session-id", "invalid-session")
        .send(scannerRequest)
        .expect(401);
    });

    it("should fail with non-existent target path", async () => {
      const scannerRequest = {
        name: "Test Scanner",
        targetPath: "/non/existent/path",
        watchMode: "file-changes",
        isRecursive: true,
      };

      const response = await request(app)
        .post("/api/live-scanners")
        .set("x-session-id", sessionId)
        .send(scannerRequest)
        .expect(400);

      expect(response.body.error).toContain("does not exist");
    });

    it("should fail with invalid watch mode", async () => {
      const scannerRequest = {
        name: "Test Scanner",
        targetPath: testDir,
        watchMode: "invalid-mode",
        isRecursive: true,
      };

      const response = await request(app)
        .post("/api/live-scanners")
        .set("x-session-id", sessionId)
        .send(scannerRequest)
        .expect(400);

      expect(response.body.error).toContain("Invalid watchMode");
    });

    it("should fail when path is a file not directory", async () => {
      const filePath = path.join(testDir, "safe.txt");

      const scannerRequest = {
        name: "Test Scanner",
        targetPath: filePath,
        watchMode: "file-changes",
        isRecursive: true,
      };

      const response = await request(app)
        .post("/api/live-scanners")
        .set("x-session-id", sessionId)
        .send(scannerRequest)
        .expect(400);

      expect(response.body.error).toContain("must be a directory");
    });

    it("should fail without active policies", async () => {
      // Disable the policy
      await request(app)
        .patch(`/api/policies/${policyId}/toggle`)
        .set("x-session-id", sessionId);

      const scannerRequest = {
        name: "Test Scanner",
        targetPath: testDir,
        watchMode: "file-changes",
        isRecursive: true,
      };

      const response = await request(app)
        .post("/api/live-scanners")
        .set("x-session-id", sessionId)
        .send(scannerRequest)
        .expect(400);

      expect(response.body.error).toContain("No active policies");
    });

    it("should accept custom options", async () => {
      const scannerRequest = {
        name: "Test Scanner",
        targetPath: testDir,
        watchMode: "both",
        isRecursive: false,
        options: {
          includeExtensions: [".txt"],
          maxFileSize: 5000000,
          debounceDelay: 2000,
        },
      };

      const response = await request(app)
        .post("/api/live-scanners")
        .set("x-session-id", sessionId)
        .send(scannerRequest)
        .expect(201);

      expect(response.body.scannerId).toBeDefined();
    });
  });

  describe("GET /api/live-scanners", () => {
    it("should return empty array when no scanners exist", async () => {
      const response = await request(app)
        .get("/api/live-scanners")
        .set("x-session-id", sessionId)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(0);
    });

    it("should return all live scanners for the user", async () => {
      // Create two scanners
      await request(app)
        .post("/api/live-scanners")
        .set("x-session-id", sessionId)
        .send({
          name: "Scanner 1",
          targetPath: testDir,
          watchMode: "file-changes",
          isRecursive: true,
        });

      await request(app)
        .post("/api/live-scanners")
        .set("x-session-id", sessionId)
        .send({
          name: "Scanner 2",
          targetPath: testDir,
          watchMode: "both",
          isRecursive: false,
        });

      const response = await request(app)
        .get("/api/live-scanners")
        .set("x-session-id", sessionId)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);
      expect(response.body[0].name).toBe("Scanner 2"); // Most recent first
      expect(response.body[1].name).toBe("Scanner 1");
    });

    it("should require authentication", async () => {
      await request(app).get("/api/live-scanners").expect(401);
    });
  });

  describe("GET /api/live-scanners/:id", () => {
    it("should get a specific live scanner", async () => {
      const createResponse = await request(app)
        .post("/api/live-scanners")
        .set("x-session-id", sessionId)
        .send({
          name: "Test Scanner",
          targetPath: testDir,
          watchMode: "file-changes",
          isRecursive: true,
        });

      const scannerId = createResponse.body.scannerId;

      const response = await request(app)
        .get(`/api/live-scanners/${scannerId}`)
        .set("x-session-id", sessionId)
        .expect(200);

      expect(response.body.id).toBe(scannerId);
      expect(response.body.name).toBe("Test Scanner");
      expect(response.body.status).toBe("active");
    });

    it("should return 404 for non-existent scanner", async () => {
      await request(app)
        .get("/api/live-scanners/999")
        .set("x-session-id", sessionId)
        .expect(404);
    });

    it("should return 400 for invalid scanner ID", async () => {
      await request(app)
        .get("/api/live-scanners/invalid")
        .set("x-session-id", sessionId)
        .expect(400);
    });
  });

  describe("GET /api/live-scanners/:id/stats", () => {
    it("should get scanner statistics", async () => {
      const createResponse = await request(app)
        .post("/api/live-scanners")
        .set("x-session-id", sessionId)
        .send({
          name: "Test Scanner",
          targetPath: testDir,
          watchMode: "file-changes",
          isRecursive: true,
        });

      const scannerId = createResponse.body.scannerId;

      const response = await request(app)
        .get(`/api/live-scanners/${scannerId}/stats`)
        .set("x-session-id", sessionId)
        .expect(200);

      expect(response.body.scanner).toBeDefined();
      expect(response.body.scanner.id).toBe(scannerId);
      expect(response.body.recentActivity).toBeDefined();
      expect(Array.isArray(response.body.recentActivity)).toBe(true);
      expect(response.body.uptime).toBeDefined();
      expect(typeof response.body.uptime).toBe("number");
    });

    it("should return 404 for non-existent scanner", async () => {
      await request(app)
        .get("/api/live-scanners/999/stats")
        .set("x-session-id", sessionId)
        .expect(404);
    });
  });

  describe("POST /api/live-scanners/:id/pause", () => {
    it("should pause an active scanner", async () => {
      const createResponse = await request(app)
        .post("/api/live-scanners")
        .set("x-session-id", sessionId)
        .send({
          name: "Test Scanner",
          targetPath: testDir,
          watchMode: "file-changes",
          isRecursive: true,
        });

      const scannerId = createResponse.body.scannerId;

      const pauseResponse = await request(app)
        .post(`/api/live-scanners/${scannerId}/pause`)
        .set("x-session-id", sessionId)
        .expect(200);

      expect(pauseResponse.body.message).toContain("paused");

      // Verify status changed
      const getResponse = await request(app)
        .get(`/api/live-scanners/${scannerId}`)
        .set("x-session-id", sessionId);

      expect(getResponse.body.status).toBe("paused");
    });

    it("should fail to pause non-active scanner", async () => {
      const createResponse = await request(app)
        .post("/api/live-scanners")
        .set("x-session-id", sessionId)
        .send({
          name: "Test Scanner",
          targetPath: testDir,
          watchMode: "file-changes",
          isRecursive: true,
        });

      const scannerId = createResponse.body.scannerId;

      // Stop the scanner first
      await request(app)
        .post(`/api/live-scanners/${scannerId}/stop`)
        .set("x-session-id", sessionId);

      // Try to pause stopped scanner
      const response = await request(app)
        .post(`/api/live-scanners/${scannerId}/pause`)
        .set("x-session-id", sessionId)
        .expect(400);

      expect(response.body.error).toContain(
        "Only active live scanners can be paused",
      );
    });
  });

  describe("POST /api/live-scanners/:id/resume", () => {
    it("should resume a paused scanner", async () => {
      const createResponse = await request(app)
        .post("/api/live-scanners")
        .set("x-session-id", sessionId)
        .send({
          name: "Test Scanner",
          targetPath: testDir,
          watchMode: "file-changes",
          isRecursive: true,
        });

      const scannerId = createResponse.body.scannerId;

      // Pause first
      await request(app)
        .post(`/api/live-scanners/${scannerId}/pause`)
        .set("x-session-id", sessionId);

      // Resume
      const resumeResponse = await request(app)
        .post(`/api/live-scanners/${scannerId}/resume`)
        .set("x-session-id", sessionId)
        .expect(200);

      expect(resumeResponse.body.message).toContain("resumed");

      // Verify status changed
      const getResponse = await request(app)
        .get(`/api/live-scanners/${scannerId}`)
        .set("x-session-id", sessionId);

      expect(getResponse.body.status).toBe("active");
    });

    it("should fail to resume non-paused scanner", async () => {
      const createResponse = await request(app)
        .post("/api/live-scanners")
        .set("x-session-id", sessionId)
        .send({
          name: "Test Scanner",
          targetPath: testDir,
          watchMode: "file-changes",
          isRecursive: true,
        });

      const scannerId = createResponse.body.scannerId;

      // Try to resume active scanner
      const response = await request(app)
        .post(`/api/live-scanners/${scannerId}/resume`)
        .set("x-session-id", sessionId)
        .expect(400);

      expect(response.body.error).toContain(
        "Only paused live scanners can be resumed",
      );
    });
  });

  describe("POST /api/live-scanners/:id/stop", () => {
    it("should stop an active scanner", async () => {
      const createResponse = await request(app)
        .post("/api/live-scanners")
        .set("x-session-id", sessionId)
        .send({
          name: "Test Scanner",
          targetPath: testDir,
          watchMode: "file-changes",
          isRecursive: true,
        });

      const scannerId = createResponse.body.scannerId;

      const stopResponse = await request(app)
        .post(`/api/live-scanners/${scannerId}/stop`)
        .set("x-session-id", sessionId)
        .expect(200);

      expect(stopResponse.body.message).toContain("stopped");

      // Verify status changed
      const getResponse = await request(app)
        .get(`/api/live-scanners/${scannerId}`)
        .set("x-session-id", sessionId);

      expect(getResponse.body.status).toBe("stopped");
      expect(getResponse.body.stoppedAt).toBeDefined();
    });

    it("should fail to stop already stopped scanner", async () => {
      const createResponse = await request(app)
        .post("/api/live-scanners")
        .set("x-session-id", sessionId)
        .send({
          name: "Test Scanner",
          targetPath: testDir,
          watchMode: "file-changes",
          isRecursive: true,
        });

      const scannerId = createResponse.body.scannerId;

      // Stop once
      await request(app)
        .post(`/api/live-scanners/${scannerId}/stop`)
        .set("x-session-id", sessionId);

      // Try to stop again
      const response = await request(app)
        .post(`/api/live-scanners/${scannerId}/stop`)
        .set("x-session-id", sessionId)
        .expect(400);

      expect(response.body.error).toContain("already stopped");
    });
  });

  describe("DELETE /api/live-scanners/:id", () => {
    it("should delete a live scanner", async () => {
      const createResponse = await request(app)
        .post("/api/live-scanners")
        .set("x-session-id", sessionId)
        .send({
          name: "Test Scanner",
          targetPath: testDir,
          watchMode: "file-changes",
          isRecursive: true,
        });

      const scannerId = createResponse.body.scannerId;

      const deleteResponse = await request(app)
        .delete(`/api/live-scanners/${scannerId}`)
        .set("x-session-id", sessionId)
        .expect(200);

      expect(deleteResponse.body.message).toContain("deleted");

      // Verify scanner is gone
      await request(app)
        .get(`/api/live-scanners/${scannerId}`)
        .set("x-session-id", sessionId)
        .expect(404);
    });

    it("should automatically stop scanner when deleting", async () => {
      const createResponse = await request(app)
        .post("/api/live-scanners")
        .set("x-session-id", sessionId)
        .send({
          name: "Test Scanner",
          targetPath: testDir,
          watchMode: "file-changes",
          isRecursive: true,
        });

      const scannerId = createResponse.body.scannerId;

      // Delete without stopping first
      await request(app)
        .delete(`/api/live-scanners/${scannerId}`)
        .set("x-session-id", sessionId)
        .expect(200);
    });

    it("should return 404 for non-existent scanner", async () => {
      await request(app)
        .delete("/api/live-scanners/999")
        .set("x-session-id", sessionId)
        .expect(404);
    });
  });

  describe("File monitoring functionality", () => {
    it("should detect new file and update stats", async () => {
      const createResponse = await request(app)
        .post("/api/live-scanners")
        .set("x-session-id", sessionId)
        .send({
          name: "Test Scanner",
          targetPath: testDir,
          watchMode: "file-changes",
          isRecursive: false,
          options: {
            debounceDelay: 500,
          },
        });

      const scannerId = createResponse.body.scannerId;

      // Wait for scanner to be ready
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Create a new file with sensitive content
      fs.writeFileSync(
        path.join(testDir, "secret.txt"),
        "password: secret123",
      );

      // Wait for debounce and scanning
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Check stats
      const statsResponse = await request(app)
        .get(`/api/live-scanners/${scannerId}/stats`)
        .set("x-session-id", sessionId);

      expect(statsResponse.body.scanner.filesScanned).toBeGreaterThan(
        0,
      );
      expect(
        statsResponse.body.scanner.threatsDetected,
      ).toBeGreaterThan(0);
      expect(
        statsResponse.body.recentActivity.length,
      ).toBeGreaterThan(0);

      // Stop scanner
      await request(app)
        .post(`/api/live-scanners/${scannerId}/stop`)
        .set("x-session-id", sessionId);
    });

    it("should detect modified file", async () => {
      // Create initial file
      const testFile = path.join(testDir, "modify.txt");
      fs.writeFileSync(testFile, "safe content");

      const createResponse = await request(app)
        .post("/api/live-scanners")
        .set("x-session-id", sessionId)
        .send({
          name: "Test Scanner",
          targetPath: testDir,
          watchMode: "file-changes",
          isRecursive: false,
          options: {
            debounceDelay: 500,
          },
        });

      const scannerId = createResponse.body.scannerId;

      // Wait for scanner to be ready
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Modify file with sensitive content
      fs.writeFileSync(testFile, "password: modified_secret");

      // Wait for debounce and scanning
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Check stats
      const statsResponse = await request(app)
        .get(`/api/live-scanners/${scannerId}/stats`)
        .set("x-session-id", sessionId);

      expect(statsResponse.body.scanner.filesScanned).toBeGreaterThan(
        0,
      );
      expect(
        statsResponse.body.recentActivity.length,
      ).toBeGreaterThan(0);

      // Stop scanner
      await request(app)
        .post(`/api/live-scanners/${scannerId}/stop`)
        .set("x-session-id", sessionId);
    });

    it("should not scan when paused", async () => {
      const createResponse = await request(app)
        .post("/api/live-scanners")
        .set("x-session-id", sessionId)
        .send({
          name: "Test Scanner",
          targetPath: testDir,
          watchMode: "file-changes",
          isRecursive: false,
          options: {
            debounceDelay: 500,
          },
        });

      const scannerId = createResponse.body.scannerId;

      // Wait for scanner to be ready and pause
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await request(app)
        .post(`/api/live-scanners/${scannerId}/pause`)
        .set("x-session-id", sessionId);

      const initialStats = await request(app)
        .get(`/api/live-scanners/${scannerId}/stats`)
        .set("x-session-id", sessionId);

      const initialCount = initialStats.body.scanner.filesScanned;

      // Create a file while paused
      fs.writeFileSync(
        path.join(testDir, "paused.txt"),
        "password: secret",
      );

      // Wait
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Check stats - should not have changed
      const afterStats = await request(app)
        .get(`/api/live-scanners/${scannerId}/stats`)
        .set("x-session-id", sessionId);

      expect(afterStats.body.scanner.filesScanned).toBe(initialCount);

      // Stop scanner
      await request(app)
        .post(`/api/live-scanners/${scannerId}/stop`)
        .set("x-session-id", sessionId);
    });
  });

  describe("User isolation", () => {
    it("should not allow access to other user's scanners", async () => {
      // Create scanner with first user
      const createResponse = await request(app)
        .post("/api/live-scanners")
        .set("x-session-id", sessionId)
        .send({
          name: "User 1 Scanner",
          targetPath: testDir,
          watchMode: "file-changes",
          isRecursive: true,
        });

      const scannerId = createResponse.body.scannerId;

      // Create second user
      const user2Data = generateTestUser();
      const user2Response = await request(app)
        .post("/api/auth/register")
        .send(user2Data);

      const user2SessionId = user2Response.body.sessionId;

      // Create policy for user 2
      await request(app)
        .post("/api/policies")
        .set("x-session-id", user2SessionId)
        .send({
          name: "User 2 Policy",
          pattern: "test",
          type: "keyword",
        });

      // User 2 tries to access User 1's scanner
      await request(app)
        .get(`/api/live-scanners/${scannerId}`)
        .set("x-session-id", user2SessionId)
        .expect(403);

      // User 2 tries to stop User 1's scanner
      await request(app)
        .post(`/api/live-scanners/${scannerId}/stop`)
        .set("x-session-id", user2SessionId)
        .expect(403);

      // User 2 tries to delete User 1's scanner
      await request(app)
        .delete(`/api/live-scanners/${scannerId}`)
        .set("x-session-id", user2SessionId)
        .expect(403);

      // Clean up - stop scanner as user 1
      await request(app)
        .post(`/api/live-scanners/${scannerId}/stop`)
        .set("x-session-id", sessionId);
    });
  });
});
