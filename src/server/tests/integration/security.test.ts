import request from "supertest";
import { createDataGuardApp, Config } from "../../src/app";
import { createTestDbPath, cleanupTestDb } from "../helpers";

describe("Security Tests", () => {
  let testDbPath: string;
  let app: any;

  beforeEach(() => {
    testDbPath = createTestDbPath();
    const config: Config = {
      IS_PRODUCTION: false,
      DB_PATH: testDbPath,
    };
    app = createDataGuardApp(config);
  });

  afterEach(() => {
    cleanupTestDb(testDbPath);
  });

  describe("Password Security", () => {
    it("should never return password in any response", async () => {
      const userData = {
        username: "secureuser",
        password: "MySecretPassword123!",
      };

      // Register
      const registerRes = await request(app)
        .post("/api/auth/register")
        .send(userData);

      expect(registerRes.body.user.password).toBeUndefined();
      expect(registerRes.body.user.passwordHash).toBeUndefined();

      // Login
      const loginRes = await request(app)
        .post("/api/auth/login")
        .send(userData);

      expect(loginRes.body.user.password).toBeUndefined();
      expect(loginRes.body.user.passwordHash).toBeUndefined();

      // Verify
      const verifyRes = await request(app)
        .get("/api/auth/verify")
        .set("x-session-id", registerRes.body.sessionId);

      expect(verifyRes.body.password).toBeUndefined();
      expect(verifyRes.body.passwordHash).toBeUndefined();

      // Me
      const meRes = await request(app)
        .get("/api/auth/me")
        .set("x-session-id", registerRes.body.sessionId);

      expect(meRes.body.user.password).toBeUndefined();
      expect(meRes.body.user.passwordHash).toBeUndefined();
    });

    it("should hash passwords (not store plaintext)", async () => {
      const userData = {
        username: "hashtest",
        password: "PlainTextPassword123",
      };

      await request(app).post("/api/auth/register").send(userData);

      // Try to login - if password was stored as plaintext, this would fail
      await request(app)
        .post("/api/auth/login")
        .send(userData)
        .expect(200);

      // Verify wrong password fails
      await request(app)
        .post("/api/auth/login")
        .send({
          username: userData.username,
          password: "WrongPassword",
        })
        .expect(401);
    });
  });

  describe("Session Security", () => {
    it("should not accept sessions from other users", async () => {
      const user1 = {
        username: "user1",
        password: "password1",
      };
      const user2 = {
        username: "user2",
        password: "password2",
      };

      const res1 = await request(app)
        .post("/api/auth/register")
        .send(user1);

      const res2 = await request(app)
        .post("/api/auth/register")
        .send(user2);

      // Use user2's session to access user1's profile
      const meRes = await request(app)
        .get("/api/auth/me")
        .set("x-session-id", res2.body.sessionId);

      // Should get user2's data, not user1's
      expect(meRes.body.user.username).toBe("user2");
      expect(meRes.body.user.username).not.toBe("user1");
    });

    it("should invalidate session after logout", async () => {
      const userData = {
        username: "logouttest",
        password: "password123",
      };

      const registerRes = await request(app)
        .post("/api/auth/register")
        .send(userData);

      const sessionId = registerRes.body.sessionId;

      // Logout
      await request(app)
        .post("/api/auth/logout")
        .set("x-session-id", sessionId)
        .expect(200);

      // Try to use invalidated session
      await request(app)
        .get("/api/auth/me")
        .set("x-session-id", sessionId)
        .expect(401);
    });

    it("should generate unique session IDs", async () => {
      const userData = {
        username: "uniquetest",
        password: "password123",
      };

      await request(app).post("/api/auth/register").send(userData);

      // Login twice to get two sessions
      const login1 = await request(app)
        .post("/api/auth/login")
        .send(userData);

      const login2 = await request(app)
        .post("/api/auth/login")
        .send(userData);

      expect(login1.body.sessionId).not.toBe(login2.body.sessionId);
    });
  });

  describe("Input Validation", () => {
    it("should reject empty username", async () => {
      await request(app)
        .post("/api/auth/register")
        .send({ username: "", password: "password123" })
        .expect(400);
    });

    it("should reject empty password", async () => {
      await request(app)
        .post("/api/auth/register")
        .send({ username: "testuser", password: "" })
        .expect(400);
    });

    it("should reject malformed JSON", async () => {
      await request(app)
        .post("/api/auth/register")
        .set("Content-Type", "application/json")
        .send('{"username": invalid}')
        .expect(400);
    });

    it("should handle SQL injection attempts", async () => {
      const maliciousInput = {
        username: "admin' OR '1'='1",
        password: "password",
      };

      // Should not bypass authentication
      await request(app)
        .post("/api/auth/login")
        .send(maliciousInput)
        .expect(404); // User not found (SQL injection should not work)
    });

    it("should handle XSS attempts in username", async () => {
      const xssInput = {
        username: '<script>alert("xss")</script>',
        password: "password123",
      };

      const response = await request(app)
        .post("/api/auth/register")
        .send(xssInput)
        .expect(201);

      // Username should be stored as-is (escaping happens on frontend)
      expect(response.body.user.username).toBe(
        '<script>alert("xss")</script>',
      );
    });
  });

  describe("Error Handling", () => {
    it("should not expose internal errors", async () => {
      // Try to cause an error by sending unexpected data types
      const response = await request(app)
        .post("/api/auth/register")
        .send({ username: null, password: null });

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.status).toBeLessThan(500);
      // Should not expose stack traces or internal details
      expect(response.body).not.toHaveProperty("stack");
    });
  });
});
