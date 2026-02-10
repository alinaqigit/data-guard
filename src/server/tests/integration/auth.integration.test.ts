import request from "supertest";
import { createDataGuardApp, Config } from "../../src/app";
import {
  createTestDbPath,
  cleanupTestDb,
  generateTestUser,
} from "../helpers";
import { SessionManager } from "../../src/modules/auth/auth.session";
import { Application } from "express";

describe("Auth API Integration Tests", () => {
  let app: Application;
  let testDbPath: string;

  beforeEach(() => {
    testDbPath = createTestDbPath();
    const config: Config = {
      IS_PRODUCTION: false,
      DB_PATH: testDbPath,
    };
    app = createDataGuardApp(config);
    SessionManager.clearAllSessions();
  });

  afterEach(() => {
    cleanupTestDb(testDbPath);
  });

  describe("POST /api/auth/register", () => {
    it("should register a new user successfully", async () => {
      const userData = generateTestUser();

      const response = await request(app)
        .post("/api/auth/register")
        .send(userData)
        .expect(201);

      expect(response.body.user).toBeDefined();
      expect(response.body.user.username).toBe(userData.username);
      expect(response.body.user.id).toBeDefined();
      expect(response.body.sessionId).toBeDefined();
      expect(response.body.user.password).toBeUndefined();
      expect(response.body.user.passwordHash).toBeUndefined();
    });

    it("should return 409 for duplicate username", async () => {
      const userData = generateTestUser();

      await request(app)
        .post("/api/auth/register")
        .send(userData)
        .expect(201);

      const response = await request(app)
        .post("/api/auth/register")
        .send(userData)
        .expect(409);

      expect(response.body.error).toBe("User already exists");
    });

    it("should return 400 for missing username", async () => {
      const response = await request(app)
        .post("/api/auth/register")
        .send({ password: "password123" })
        .expect(400);

      expect(response.body).toContain("username is required");
    });

    it("should return 400 for missing password", async () => {
      const response = await request(app)
        .post("/api/auth/register")
        .send({ username: "testuser" })
        .expect(400);

      expect(response.body).toContain("password is required");
    });

    it("should return 400 for wrong data types", async () => {
      const response = await request(app)
        .post("/api/auth/register")
        .send({ username: 123, password: "password" })
        .expect(400);

      expect(response.body).toContain(
        "username should be of type string",
      );
    });

    it("should create a valid session", async () => {
      const userData = generateTestUser();

      const response = await request(app)
        .post("/api/auth/register")
        .send(userData)
        .expect(201);

      const sessionId = response.body.sessionId;
      const sessionPayload = SessionManager.verifySession(sessionId);

      expect(sessionPayload).toBeDefined();
      expect(sessionPayload!.username).toBe(userData.username);
    });
  });

  describe("POST /api/auth/login", () => {
    let registeredUser: any;

    beforeEach(async () => {
      registeredUser = generateTestUser();
      await request(app)
        .post("/api/auth/register")
        .send(registeredUser);
      SessionManager.clearAllSessions(); // Clear registration session
    });

    it("should login successfully with correct credentials", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send(registeredUser)
        .expect(200);

      expect(response.body.user).toBeDefined();
      expect(response.body.user.username).toBe(
        registeredUser.username,
      );
      expect(response.body.sessionId).toBeDefined();
      expect(response.body.user.passwordHash).toBeUndefined();
    });

    it("should return 404 for non-existent user", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({ username: "nonexistent", password: "password" })
        .expect(404);

      expect(response.body.error).toBe("User not found");
    });

    it("should return 401 for incorrect password", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          username: registeredUser.username,
          password: "wrongpassword",
        })
        .expect(401);

      expect(response.body.error).toBe("Invalid credentials");
    });

    it("should return 400 for missing fields", async () => {
      await request(app)
        .post("/api/auth/login")
        .send({ username: "testuser" })
        .expect(400);
    });

    it("should create a new session on login", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send(registeredUser)
        .expect(200);

      const sessionId = response.body.sessionId;
      const sessionPayload = SessionManager.verifySession(sessionId);

      expect(sessionPayload).toBeDefined();
      expect(sessionPayload!.username).toBe(registeredUser.username);
    });
  });

  describe("POST /api/auth/logout", () => {
    let sessionId: string;

    beforeEach(async () => {
      const userData = generateTestUser();
      const response = await request(app)
        .post("/api/auth/register")
        .send(userData);
      sessionId = response.body.sessionId;
    });

    it("should logout successfully with valid session", async () => {
      const response = await request(app)
        .post("/api/auth/logout")
        .set("x-session-id", sessionId)
        .expect(200);

      expect(response.body.message).toBe("Logged out successfully");
    });

    it("should delete the session", async () => {
      await request(app)
        .post("/api/auth/logout")
        .set("x-session-id", sessionId)
        .expect(200);

      const sessionPayload = SessionManager.verifySession(sessionId);
      expect(sessionPayload).toBeNull();
    });

    it("should return 400 if no session ID provided", async () => {
      const response = await request(app)
        .post("/api/auth/logout")
        .expect(400);

      expect(response.body.error).toBe("No session ID provided");
    });

    it("should return 404 for invalid session ID", async () => {
      const response = await request(app)
        .post("/api/auth/logout")
        .set("x-session-id", "invalid-session-id")
        .expect(404);

      expect(response.body.error).toBe("Session not found");
    });
  });

  describe("GET /api/auth/verify", () => {
    let sessionId: string;
    let username: string;

    beforeEach(async () => {
      const userData = generateTestUser();
      username = userData.username;
      const response = await request(app)
        .post("/api/auth/register")
        .send(userData);
      sessionId = response.body.sessionId;
    });

    it("should verify valid session", async () => {
      const response = await request(app)
        .get("/api/auth/verify")
        .set("x-session-id", sessionId)
        .expect(200);

      expect(response.body.username).toBe(username);
      expect(response.body.id).toBeDefined();
      expect(response.body.passwordHash).toBeUndefined();
    });

    it("should return 401 for missing session ID", async () => {
      const response = await request(app)
        .get("/api/auth/verify")
        .expect(401);

      expect(response.body.error).toBe("No session ID provided");
    });

    it("should return 401 for invalid session ID", async () => {
      const response = await request(app)
        .get("/api/auth/verify")
        .set("x-session-id", "invalid-session-id")
        .expect(401);

      expect(response.body.error).toBe("Invalid or expired session");
    });
  });

  describe("GET /api/auth/me", () => {
    let sessionId: string;
    let username: string;

    beforeEach(async () => {
      const userData = generateTestUser();
      username = userData.username;
      const response = await request(app)
        .post("/api/auth/register")
        .send(userData);
      sessionId = response.body.sessionId;
    });

    it("should return current user profile", async () => {
      const response = await request(app)
        .get("/api/auth/me")
        .set("x-session-id", sessionId)
        .expect(200);

      expect(response.body.user).toBeDefined();
      expect(response.body.user.username).toBe(username);
    });

    it("should return 401 for missing session", async () => {
      await request(app).get("/api/auth/me").expect(401);
    });

    it("should return 401 for invalid session", async () => {
      await request(app)
        .get("/api/auth/me")
        .set("x-session-id", "invalid")
        .expect(401);
    });
  });

  describe("Full Authentication Flow", () => {
    it("should complete register -> login -> verify -> logout flow", async () => {
      const userData = generateTestUser();

      // Register
      const registerRes = await request(app)
        .post("/api/auth/register")
        .send(userData)
        .expect(201);

      const registerSessionId = registerRes.body.sessionId;

      // Logout from registration session
      await request(app)
        .post("/api/auth/logout")
        .set("x-session-id", registerSessionId)
        .expect(200);

      // Login
      const loginRes = await request(app)
        .post("/api/auth/login")
        .send(userData)
        .expect(200);

      const loginSessionId = loginRes.body.sessionId;

      // Verify
      await request(app)
        .get("/api/auth/verify")
        .set("x-session-id", loginSessionId)
        .expect(200);

      // Get profile
      await request(app)
        .get("/api/auth/me")
        .set("x-session-id", loginSessionId)
        .expect(200);

      // Logout
      await request(app)
        .post("/api/auth/logout")
        .set("x-session-id", loginSessionId)
        .expect(200);

      // Verify session is deleted
      await request(app)
        .get("/api/auth/verify")
        .set("x-session-id", loginSessionId)
        .expect(401);
    });

    it("should allow multiple concurrent users", async () => {
      const user1 = generateTestUser();
      const user2 = generateTestUser();

      const res1 = await request(app)
        .post("/api/auth/register")
        .send(user1)
        .expect(201);

      const res2 = await request(app)
        .post("/api/auth/register")
        .send(user2)
        .expect(201);

      // Both sessions should be valid
      await request(app)
        .get("/api/auth/me")
        .set("x-session-id", res1.body.sessionId)
        .expect(200);

      await request(app)
        .get("/api/auth/me")
        .set("x-session-id", res2.body.sessionId)
        .expect(200);

      // Logout one user
      await request(app)
        .post("/api/auth/logout")
        .set("x-session-id", res1.body.sessionId)
        .expect(200);

      // First user's session should be invalid
      await request(app)
        .get("/api/auth/me")
        .set("x-session-id", res1.body.sessionId)
        .expect(401);

      // Second user's session should still be valid
      await request(app)
        .get("/api/auth/me")
        .set("x-session-id", res2.body.sessionId)
        .expect(200);
    });
  });
});
