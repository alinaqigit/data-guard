import { authService } from "../../src/modules/auth/auth.service";
import { authRepository } from "../../src/modules/auth/auth.repository";
import { SessionManager } from "../../src/modules/auth/auth.session";
import { createTestDbPath, cleanupTestDb } from "../helpers";
import * as argon from "argon2";

describe("authService", () => {
  let service: authService;
  let testDbPath: string;

  beforeEach(() => {
    testDbPath = createTestDbPath();
    service = new authService(testDbPath);
    SessionManager.clearAllSessions();
  });

  afterEach(() => {
    cleanupTestDb(testDbPath);
  });

  describe("register", () => {
    it("should successfully register a new user", async () => {
      const dto = {
        username: "newuser",
        password: "password123",
      };

      const response = await service.register(dto);

      expect(response.status).toBe(201);
      expect(response.body).toBeDefined();
      expect(response.body.user).toBeDefined();
      expect(response.body.user.username).toBe("newuser");
      expect(response.body.user.id).toBeDefined();
      expect(response.body.sessionId).toBeDefined();
      expect(response.body.user.passwordHash).toBeUndefined();
    });

    it("should hash the password using argon2", async () => {
      const dto = {
        username: "testuser",
        password: "mySecurePassword",
      };

      await service.register(dto);

      // Verify password was hashed by checking we can verify it
      const repo = new authRepository(testDbPath);
      const user = repo.retreiveUserFromDB({ username: "testuser" });

      expect(user).toBeDefined();
      expect(user!.passwordHash).not.toBe("mySecurePassword");
      const isValid = await argon.verify(
        user!.passwordHash,
        "mySecurePassword",
      );
      expect(isValid).toBe(true);
    });

    it("should create a session for the new user", async () => {
      const dto = {
        username: "newuser",
        password: "password123",
      };

      const response = await service.register(dto);

      expect(response.body.sessionId).toBeDefined();
      const sessionPayload = SessionManager.verifySession(
        response.body.sessionId,
      );
      expect(sessionPayload).toBeDefined();
      expect(sessionPayload!.username).toBe("newuser");
    });

    it("should return 409 if user already exists", async () => {
      const dto = {
        username: "duplicate",
        password: "password123",
      };

      await service.register(dto);
      const response = await service.register(dto);

      expect(response.status).toBe(409);
      expect(response.error).toBe("User already exists");
      expect(response.body).toBeUndefined();
    });

    it("should not expose password in response", async () => {
      const dto = {
        username: "secureuser",
        password: "supersecret",
      };

      const response = await service.register(dto);

      expect(response.body.user.password).toBeUndefined();
      expect(response.body.user.passwordHash).toBeUndefined();
    });
  });

  describe("login", () => {
    beforeEach(async () => {
      // Register a user for login tests
      await service.register({
        username: "existinguser",
        password: "correctpassword",
      });
      SessionManager.clearAllSessions(); // Clear registration session
    });

    it("should successfully login with correct credentials", async () => {
      const dto = {
        username: "existinguser",
        password: "correctpassword",
      };

      const response = await service.login(dto);

      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
      expect(response.body.user.username).toBe("existinguser");
      expect(response.body.sessionId).toBeDefined();
    });

    it("should return 404 for non-existent user", async () => {
      const dto = {
        username: "nonexistent",
        password: "anypassword",
      };

      const response = await service.login(dto);

      expect(response.status).toBe(404);
      expect(response.error).toBe("User not found");
      expect(response.body).toBeUndefined();
    });

    it("should return 401 for incorrect password", async () => {
      const dto = {
        username: "existinguser",
        password: "wrongpassword",
      };

      const response = await service.login(dto);

      expect(response.status).toBe(401);
      expect(response.error).toBe("Invalid credentials");
    });

    it("should create a new session on successful login", async () => {
      const dto = {
        username: "existinguser",
        password: "correctpassword",
      };

      const response = await service.login(dto);

      const sessionPayload = SessionManager.verifySession(
        response.body.sessionId,
      );
      expect(sessionPayload).toBeDefined();
      expect(sessionPayload!.username).toBe("existinguser");
    });

    it("should not expose password hash in response", async () => {
      const dto = {
        username: "existinguser",
        password: "correctpassword",
      };

      const response = await service.login(dto);

      expect(response.body.user.passwordHash).toBeUndefined();
      expect(response.body.user.password).toBeUndefined();
    });
  });

  describe("logout", () => {
    it("should successfully logout with valid session", async () => {
      const registerResponse = await service.register({
        username: "logoutuser",
        password: "password123",
      });

      const sessionId = registerResponse.body.sessionId;
      const response = await service.logout(sessionId);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Logged out successfully");
    });

    it("should delete the session", async () => {
      const registerResponse = await service.register({
        username: "deleteuser",
        password: "password123",
      });

      const sessionId = registerResponse.body.sessionId;
      await service.logout(sessionId);

      const sessionPayload = SessionManager.verifySession(sessionId);
      expect(sessionPayload).toBeNull();
    });

    it("should return 404 for non-existent session", async () => {
      const response = await service.logout("invalid-session-id");

      expect(response.status).toBe(404);
      expect(response.error).toBe("Session not found");
    });
  });

  describe("verifySession", () => {
    let sessionId: string;

    beforeEach(async () => {
      const registerResponse = await service.register({
        username: "verifyuser",
        password: "password123",
      });
      sessionId = registerResponse.body.sessionId;
    });

    it("should return user data for valid session", async () => {
      const response = await service.verifySession(sessionId);

      expect(response.status).toBe(200);
      expect(response.body.username).toBe("verifyuser");
      expect(response.body.id).toBeDefined();
    });

    it("should return 401 for invalid session", async () => {
      const response = await service.verifySession(
        "invalid-session-id",
      );

      expect(response.status).toBe(401);
      expect(response.error).toBe("Invalid or expired session");
    });

    it("should not expose password hash", async () => {
      const response = await service.verifySession(sessionId);

      expect(response.body.passwordHash).toBeUndefined();
      expect(response.body.password).toBeUndefined();
    });

    it("should return 404 if user was deleted but session exists", async () => {
      const repo = new authRepository(testDbPath);
      repo["db"]["dbService"]["user"].deleteUserByUsername(
        "verifyuser",
      );

      const response = await service.verifySession(sessionId);

      expect(response.status).toBe(404);
      expect(response.error).toBe("User not found");
    });
  });
});
