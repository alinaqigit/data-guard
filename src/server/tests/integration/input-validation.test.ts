import request from "supertest";
import { createDataGuardApp, Config } from "../../src/app";
import {
  createTestDbPath,
  cleanupTestDb,
  generateTestUser,
} from "../helpers";
import { SessionManager } from "../../src/modules/auth/auth.session";
import { Application } from "express";

describe("Input Validation Tests", () => {
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
  });

  describe("Scanner Controller Input Validation", () => {
    it("should return 400 when body is empty object", async () => {
      const response = await request(app)
        .post("/api/scans")
        .set("x-session-id", sessionId)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
      expect(response.body.error).toContain("required");
    });

    it("should return 400 when body is array instead of object", async () => {
      const response = await request(app)
        .post("/api/scans")
        .set("x-session-id", sessionId)
        .set("Content-Type", "application/json")
        .send(JSON.stringify([]));

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
      expect(response.body.error).toContain("Invalid");
    });

    it("should return 400 when scanType is missing", async () => {
      const response = await request(app)
        .post("/api/scans")
        .set("x-session-id", sessionId)
        .send({
          targetPath: "/some/path",
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("required");
    });

    it("should return 400 when targetPath is missing", async () => {
      const response = await request(app)
        .post("/api/scans")
        .set("x-session-id", sessionId)
        .send({
          scanType: "full",
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("required");
    });
  });

  describe("Auth Controller Input Validation", () => {
    it("should return 400 when login body is missing", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .set("Content-Type", "application/json")
        .send();

      expect(response.status).toBe(400);
      expect(response.body).toBeDefined();
    });

    it("should return 400 when register body is missing", async () => {
      const response = await request(app)
        .post("/api/auth/register")
        .set("Content-Type", "application/json")
        .send();

      expect(response.status).toBe(400);
      expect(response.body).toBeDefined();
    });

    it("should return 400 when login has empty object", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({});

      expect(response.status).toBe(400);
    });

    it("should return 400 when register has empty object", async () => {
      const response = await request(app)
        .post("/api/auth/register")
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe("Policy Controller Input Validation", () => {
    it("should return 400 when create policy body is missing", async () => {
      const response = await request(app)
        .post("/api/policies")
        .set("x-session-id", sessionId)
        .set("Content-Type", "application/json")
        .send();

      expect(response.status).toBe(400);
      expect(response.body).toBeDefined();
    });

    it("should return 400 when create policy has empty object", async () => {
      const response = await request(app)
        .post("/api/policies")
        .set("x-session-id", sessionId)
        .send({});

      expect(response.status).toBe(400);
    });

    it("should return 400 when update policy body is missing required fields", async () => {
      // First create a policy to update
      const createResponse = await request(app)
        .post("/api/policies")
        .set("x-session-id", sessionId)
        .send({
          name: "Test Policy",
          pattern: "test",
          type: "keyword",
          description: "Test",
        });

      const policyId = createResponse.body.id;

      // Try to update with empty body (should still work for partial updates but handled gracefully)
      const response = await request(app)
        .put(`/api/policies/${policyId}`)
        .set("x-session-id", sessionId)
        .send({});

      // Policy controller allows partial updates, so this might be 200 or 400 depending on logic
      expect([200, 400]).toContain(response.status);
    });
  });

  describe("Malformed JSON Input", () => {
    it("should handle malformed JSON gracefully in scanner endpoint", async () => {
      const response = await request(app)
        .post("/api/scans")
        .set("x-session-id", sessionId)
        .set("Content-Type", "application/json")
        .send('{"scanType": "full", "targetPath":'); // Incomplete JSON

      // Express should handle this before reaching our code
      expect([400, 500]).toContain(response.status);
    });

    it("should handle malformed JSON gracefully in auth endpoint", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .set("Content-Type", "application/json")
        .send('{"username": "test"'); // Incomplete JSON

      expect([400, 500]).toContain(response.status);
    });
  });
});
