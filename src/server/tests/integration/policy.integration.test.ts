import request from "supertest";
import { createDataGuardApp, Config } from "../../src/app";
import {
  createTestDbPath,
  cleanupTestDb,
  generateTestUser,
} from "../helpers";
import { SessionManager } from "../../src/modules/auth/auth.session";
import { Application } from "express";

describe("Policy API Integration Tests", () => {
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

  describe("POST /api/policies", () => {
    it("should create a new keyword policy", async () => {
      const policyData = {
        name: "Credit Card Policy",
        pattern: "4111-1111-1111-1111",
        type: "keyword",
        description: "Detects credit card numbers",
      };

      const response = await request(app)
        .post("/api/policies")
        .set("x-session-id", sessionId)
        .send(policyData)
        .expect(201);

      expect(response.body.id).toBeDefined();
      expect(response.body.name).toBe(policyData.name);
      expect(response.body.pattern).toBe(policyData.pattern);
      expect(response.body.type).toBe("keyword");
      expect(response.body.userId).toBe(userId);
      expect(response.body.createdAt).toBeDefined();
    });

    it("should create a new regex policy", async () => {
      const policyData = {
        name: "Email Policy",
        pattern: "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}",
        type: "regex",
        description: "Detects email addresses",
      };

      const response = await request(app)
        .post("/api/policies")
        .set("x-session-id", sessionId)
        .send(policyData)
        .expect(201);

      expect(response.body.type).toBe("regex");
      expect(response.body.pattern).toBe(policyData.pattern);
    });

    it("should return 401 without session", async () => {
      const policyData = {
        name: "Test Policy",
        pattern: "test",
        type: "keyword",
        description: "",
      };

      await request(app)
        .post("/api/policies")
        .send(policyData)
        .expect(401);
    });

    it("should return 400 for invalid type", async () => {
      const policyData = {
        name: "Test",
        pattern: "test",
        type: "invalid",
        description: "",
      };

      const response = await request(app)
        .post("/api/policies")
        .set("x-session-id", sessionId)
        .send(policyData)
        .expect(400);

      expect(response.body.error).toBe(
        "Type must be either 'keyword' or 'regex'",
      );
    });

    it("should return 400 for invalid regex", async () => {
      const policyData = {
        name: "Bad Regex",
        pattern: "[invalid(regex",
        type: "regex",
        description: "",
      };

      const response = await request(app)
        .post("/api/policies")
        .set("x-session-id", sessionId)
        .send(policyData)
        .expect(400);

      expect(response.body.error).toBe("Invalid regex pattern");
    });

    it("should return 400 for missing fields", async () => {
      const response = await request(app)
        .post("/api/policies")
        .set("x-session-id", sessionId)
        .send({ name: "Test" })
        .expect(400);

      expect(response.body).toContain("pattern is required");
    });
  });

  describe("GET /api/policies", () => {
    it("should get all policies for current user", async () => {
      // Create multiple policies
      await request(app)
        .post("/api/policies")
        .set("x-session-id", sessionId)
        .send({
          name: "Policy 1",
          pattern: "p1",
          type: "keyword",
          description: "",
        });

      await request(app)
        .post("/api/policies")
        .set("x-session-id", sessionId)
        .send({
          name: "Policy 2",
          pattern: "p2",
          type: "regex",
          description: "",
        });

      const response = await request(app)
        .get("/api/policies")
        .set("x-session-id", sessionId)
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0].name).toBe("Policy 2"); // Most recent first
    });

    it("should return empty array when no policies", async () => {
      const response = await request(app)
        .get("/api/policies")
        .set("x-session-id", sessionId)
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it("should return 401 without session", async () => {
      await request(app).get("/api/policies").expect(401);
    });

    it("should only return policies for current user", async () => {
      // Create policy for first user
      await request(app)
        .post("/api/policies")
        .set("x-session-id", sessionId)
        .send({
          name: "User 1 Policy",
          pattern: "u1",
          type: "keyword",
          description: "",
        });

      // Create second user and login
      const user2Data = generateTestUser();
      const user2Response = await request(app)
        .post("/api/auth/register")
        .send(user2Data);
      const user2SessionId = user2Response.body.sessionId;

      // Get policies for second user
      const response = await request(app)
        .get("/api/policies")
        .set("x-session-id", user2SessionId)
        .expect(200);

      expect(response.body).toHaveLength(0);
    });
  });

  describe("GET /api/policies/:id", () => {
    it("should get specific policy by ID", async () => {
      const created = await request(app)
        .post("/api/policies")
        .set("x-session-id", sessionId)
        .send({
          name: "Test Policy",
          pattern: "test",
          type: "keyword",
          description: "",
        });

      const response = await request(app)
        .get(`/api/policies/${created.body.id}`)
        .set("x-session-id", sessionId)
        .expect(200);

      expect(response.body.id).toBe(created.body.id);
      expect(response.body.name).toBe("Test Policy");
    });

    it("should return 404 for non-existent policy", async () => {
      await request(app)
        .get("/api/policies/99999")
        .set("x-session-id", sessionId)
        .expect(404);
    });

    it("should return 403 for another user's policy", async () => {
      const created = await request(app)
        .post("/api/policies")
        .set("x-session-id", sessionId)
        .send({
          name: "Private Policy",
          pattern: "private",
          type: "keyword",
          description: "",
        });

      // Create and login as different user
      const user2Data = generateTestUser();
      const user2Response = await request(app)
        .post("/api/auth/register")
        .send(user2Data);
      const user2SessionId = user2Response.body.sessionId;

      const response = await request(app)
        .get(`/api/policies/${created.body.id}`)
        .set("x-session-id", user2SessionId)
        .expect(403);

      expect(response.body.error).toBe("Access denied");
    });

    it("should return 401 without session", async () => {
      await request(app).get("/api/policies/1").expect(401);
    });
  });

  describe("PUT /api/policies/:id", () => {
    it("should update policy successfully", async () => {
      const created = await request(app)
        .post("/api/policies")
        .set("x-session-id", sessionId)
        .send({
          name: "Original",
          pattern: "old",
          type: "keyword",
          description: "",
        });

      const response = await request(app)
        .put(`/api/policies/${created.body.id}`)
        .set("x-session-id", sessionId)
        .send({
          name: "Updated",
          pattern: "new",
          type: "regex",
          description: "Updated description",
        })
        .expect(200);

      expect(response.body.name).toBe("Updated");
      expect(response.body.pattern).toBe("new");
      expect(response.body.type).toBe("regex");
      expect(response.body.description).toBe("Updated description");
    });

    it("should return 404 for non-existent policy", async () => {
      await request(app)
        .put("/api/policies/99999")
        .set("x-session-id", sessionId)
        .send({
          name: "Updated",
          pattern: "",
          type: "",
          description: "",
        })
        .expect(404);
    });

    it("should return 403 for another user's policy", async () => {
      const created = await request(app)
        .post("/api/policies")
        .set("x-session-id", sessionId)
        .send({
          name: "Policy",
          pattern: "test",
          type: "keyword",
          description: "",
        });

      // Create different user
      const user2Data = generateTestUser();
      const user2Response = await request(app)
        .post("/api/auth/register")
        .send(user2Data);
      const user2SessionId = user2Response.body.sessionId;

      await request(app)
        .put(`/api/policies/${created.body.id}`)
        .set("x-session-id", user2SessionId)
        .send({
          name: "Hacked",
          pattern: "",
          type: "",
          description: "",
        })
        .expect(403);
    });

    it("should return 401 without session", async () => {
      await request(app)
        .put("/api/policies/1")
        .send({
          name: "Updated",
          pattern: "",
          type: "",
          description: "",
        })
        .expect(401);
    });

    it("should return 400 for invalid regex", async () => {
      const created = await request(app)
        .post("/api/policies")
        .set("x-session-id", sessionId)
        .send({
          name: "Policy",
          pattern: "test",
          type: "regex",
          description: "",
        });

      const response = await request(app)
        .put(`/api/policies/${created.body.id}`)
        .set("x-session-id", sessionId)
        .send({
          name: "",
          pattern: "[invalid(",
          type: "",
          description: "",
        })
        .expect(400);

      expect(response.body.error).toBe("Invalid regex pattern");
    });
  });

  describe("DELETE /api/policies/:id", () => {
    it("should delete policy successfully", async () => {
      const created = await request(app)
        .post("/api/policies")
        .set("x-session-id", sessionId)
        .send({
          name: "To Delete",
          pattern: "delete",
          type: "keyword",
          description: "",
        });

      const response = await request(app)
        .delete(`/api/policies/${created.body.id}`)
        .set("x-session-id", sessionId)
        .expect(200);

      expect(response.body.message).toBe(
        "Policy deleted successfully",
      );

      // Verify it's deleted
      await request(app)
        .get(`/api/policies/${created.body.id}`)
        .set("x-session-id", sessionId)
        .expect(404);
    });

    it("should return 404 for non-existent policy", async () => {
      await request(app)
        .delete("/api/policies/99999")
        .set("x-session-id", sessionId)
        .expect(404);
    });

    it("should return 403 for another user's policy", async () => {
      const created = await request(app)
        .post("/api/policies")
        .set("x-session-id", sessionId)
        .send({
          name: "Policy",
          pattern: "test",
          type: "keyword",
          description: "",
        });

      // Create different user
      const user2Data = generateTestUser();
      const user2Response = await request(app)
        .post("/api/auth/register")
        .send(user2Data);
      const user2SessionId = user2Response.body.sessionId;

      await request(app)
        .delete(`/api/policies/${created.body.id}`)
        .set("x-session-id", user2SessionId)
        .expect(403);
    });

    it("should return 401 without session", async () => {
      await request(app).delete("/api/policies/1").expect(401);
    });
  });

  describe("Integration Scenarios", () => {
    it("should handle complete CRUD workflow", async () => {
      // Create
      const createResponse = await request(app)
        .post("/api/policies")
        .set("x-session-id", sessionId)
        .send({
          name: "Workflow Test",
          pattern: "test",
          type: "keyword",
          description: "Original",
        })
        .expect(201);

      const policyId = createResponse.body.id;

      // Read
      const getResponse = await request(app)
        .get(`/api/policies/${policyId}`)
        .set("x-session-id", sessionId)
        .expect(200);

      expect(getResponse.body.name).toBe("Workflow Test");

      // Update
      const updateResponse = await request(app)
        .put(`/api/policies/${policyId}`)
        .set("x-session-id", sessionId)
        .send({
          name: "Updated",
          pattern: "updated",
          type: "regex",
          description: "Modified",
        })
        .expect(200);

      expect(updateResponse.body.name).toBe("Updated");

      // Delete
      await request(app)
        .delete(`/api/policies/${policyId}`)
        .set("x-session-id", sessionId)
        .expect(200);

      // Verify deletion
      await request(app)
        .get(`/api/policies/${policyId}`)
        .set("x-session-id", sessionId)
        .expect(404);
    });

    it("should maintain data isolation between users", async () => {
      // User 1 creates policies
      await request(app)
        .post("/api/policies")
        .set("x-session-id", sessionId)
        .send({
          name: "User 1 Policy 1",
          pattern: "u1p1",
          type: "keyword",
          description: "",
        });

      await request(app)
        .post("/api/policies")
        .set("x-session-id", sessionId)
        .send({
          name: "User 1 Policy 2",
          pattern: "u1p2",
          type: "keyword",
          description: "",
        });

      // User 2 creates policies
      const user2Data = generateTestUser();
      const user2Response = await request(app)
        .post("/api/auth/register")
        .send(user2Data);
      const user2SessionId = user2Response.body.sessionId;

      await request(app)
        .post("/api/policies")
        .set("x-session-id", user2SessionId)
        .send({
          name: "User 2 Policy 1",
          pattern: "u2p1",
          type: "keyword",
          description: "",
        });

      // Verify each user sees only their policies
      const user1Policies = await request(app)
        .get("/api/policies")
        .set("x-session-id", sessionId)
        .expect(200);

      const user2Policies = await request(app)
        .get("/api/policies")
        .set("x-session-id", user2SessionId)
        .expect(200);

      expect(user1Policies.body).toHaveLength(2);
      expect(user2Policies.body).toHaveLength(1);
      expect(user1Policies.body[0].name).toContain("User 1");
      expect(user2Policies.body[0].name).toContain("User 2");
    });
  });

  describe("PATCH /api/policies/:id/toggle", () => {
    it("should toggle policy status from enabled to disabled", async () => {
      // Create a policy (enabled by default)
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
      expect(createResponse.body.isEnabled).toBe(true);

      // Toggle to disabled
      const toggleResponse = await request(app)
        .patch(`/api/policies/${policyId}/toggle`)
        .set("x-session-id", sessionId)
        .expect(200);

      expect(toggleResponse.body.isEnabled).toBe(false);
      expect(toggleResponse.body.id).toBe(policyId);

      // Verify the change persisted
      const getResponse = await request(app)
        .get(`/api/policies/${policyId}`)
        .set("x-session-id", sessionId)
        .expect(200);

      expect(getResponse.body.isEnabled).toBe(false);
    });

    it("should toggle policy status from disabled to enabled", async () => {
      // Create a policy
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

      // Toggle to disabled
      await request(app)
        .patch(`/api/policies/${policyId}/toggle`)
        .set("x-session-id", sessionId)
        .expect(200);

      // Toggle back to enabled
      const toggleResponse = await request(app)
        .patch(`/api/policies/${policyId}/toggle`)
        .set("x-session-id", sessionId)
        .expect(200);

      expect(toggleResponse.body.isEnabled).toBe(true);
    });

    it("should return 404 for non-existent policy", async () => {
      const response = await request(app)
        .patch("/api/policies/99999/toggle")
        .set("x-session-id", sessionId)
        .expect(404);

      expect(response.body.error).toBe("Policy not found");
    });

    it("should return 403 when trying to toggle another user's policy", async () => {
      // Create policy for first user
      const createResponse = await request(app)
        .post("/api/policies")
        .set("x-session-id", sessionId)
        .send({
          name: "User 1 Policy",
          pattern: "test",
          type: "keyword",
          description: "Test",
        });

      const policyId = createResponse.body.id;

      // Create second user
      const user2Data = generateTestUser();
      const user2Response = await request(app)
        .post("/api/auth/register")
        .send(user2Data);
      const user2SessionId = user2Response.body.sessionId;

      // Try to toggle first user's policy as second user
      const response = await request(app)
        .patch(`/api/policies/${policyId}/toggle`)
        .set("x-session-id", user2SessionId)
        .expect(403);

      expect(response.body.error).toBe("Access denied");
    });

    it("should return 401 without session", async () => {
      await request(app).patch("/api/policies/1/toggle").expect(401);
    });

    it("should return 400 for invalid policy ID", async () => {
      await request(app)
        .patch("/api/policies/invalid/toggle")
        .set("x-session-id", sessionId)
        .expect(400);
    });
  });
});
