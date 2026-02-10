import {
  SessionManager,
  SessionPayload,
} from "../../src/modules/auth/auth.session";

describe("SessionManager", () => {
  beforeEach(() => {
    SessionManager.clearAllSessions();
  });

  describe("createSession", () => {
    it("should create a new session and return sessionId", () => {
      const payload: SessionPayload = {
        userId: 1,
        username: "testuser",
        createdAt: new Date(),
      };

      const sessionId = SessionManager.createSession(payload);

      expect(sessionId).toBeDefined();
      expect(typeof sessionId).toBe("string");
      expect(sessionId.length).toBe(64); // 32 bytes = 64 hex chars
    });

    it("should generate unique session IDs", () => {
      const payload: SessionPayload = {
        userId: 1,
        username: "testuser",
        createdAt: new Date(),
      };

      const sessionId1 = SessionManager.createSession(payload);
      const sessionId2 = SessionManager.createSession(payload);

      expect(sessionId1).not.toBe(sessionId2);
    });

    it("should store session data correctly", () => {
      const payload: SessionPayload = {
        userId: 123,
        username: "john_doe",
        createdAt: new Date("2026-01-01"),
      };

      const sessionId = SessionManager.createSession(payload);
      const retrieved = SessionManager.verifySession(sessionId);

      expect(retrieved).toEqual(payload);
    });
  });

  describe("verifySession", () => {
    it("should return session payload for valid session", () => {
      const payload: SessionPayload = {
        userId: 1,
        username: "testuser",
        createdAt: new Date(),
      };

      const sessionId = SessionManager.createSession(payload);
      const verified = SessionManager.verifySession(sessionId);

      expect(verified).toEqual(payload);
    });

    it("should return null for invalid session ID", () => {
      const result = SessionManager.verifySession(
        "invalid-session-id",
      );

      expect(result).toBeNull();
    });

    it("should return null for non-existent session", () => {
      const result = SessionManager.verifySession("a".repeat(64));

      expect(result).toBeNull();
    });

    it("should not expose sessionId in returned payload", () => {
      const payload: SessionPayload = {
        userId: 1,
        username: "testuser",
        createdAt: new Date(),
      };

      const sessionId = SessionManager.createSession(payload);
      const verified = SessionManager.verifySession(sessionId);

      expect(verified).not.toHaveProperty("sessionId");
    });
  });

  describe("deleteSession", () => {
    it("should delete existing session and return true", () => {
      const payload: SessionPayload = {
        userId: 1,
        username: "testuser",
        createdAt: new Date(),
      };

      const sessionId = SessionManager.createSession(payload);
      const deleted = SessionManager.deleteSession(sessionId);

      expect(deleted).toBe(true);
      expect(SessionManager.verifySession(sessionId)).toBeNull();
    });

    it("should return false for non-existent session", () => {
      const deleted = SessionManager.deleteSession("non-existent-id");

      expect(deleted).toBe(false);
    });

    it("should not affect other sessions", () => {
      const payload1: SessionPayload = {
        userId: 1,
        username: "user1",
        createdAt: new Date(),
      };
      const payload2: SessionPayload = {
        userId: 2,
        username: "user2",
        createdAt: new Date(),
      };

      const sessionId1 = SessionManager.createSession(payload1);
      const sessionId2 = SessionManager.createSession(payload2);

      SessionManager.deleteSession(sessionId1);

      expect(SessionManager.verifySession(sessionId1)).toBeNull();
      expect(SessionManager.verifySession(sessionId2)).toEqual(
        payload2,
      );
    });
  });

  describe("clearAllSessions", () => {
    it("should remove all sessions", () => {
      const payload: SessionPayload = {
        userId: 1,
        username: "testuser",
        createdAt: new Date(),
      };

      const sessionId1 = SessionManager.createSession(payload);
      const sessionId2 = SessionManager.createSession(payload);

      SessionManager.clearAllSessions();

      expect(SessionManager.verifySession(sessionId1)).toBeNull();
      expect(SessionManager.verifySession(sessionId2)).toBeNull();
      expect(SessionManager.getActiveSessionCount()).toBe(0);
    });
  });

  describe("getActiveSessionCount", () => {
    it("should return 0 when no sessions exist", () => {
      expect(SessionManager.getActiveSessionCount()).toBe(0);
    });

    it("should return correct count of active sessions", () => {
      const payload: SessionPayload = {
        userId: 1,
        username: "testuser",
        createdAt: new Date(),
      };

      SessionManager.createSession(payload);
      expect(SessionManager.getActiveSessionCount()).toBe(1);

      SessionManager.createSession(payload);
      expect(SessionManager.getActiveSessionCount()).toBe(2);

      SessionManager.createSession(payload);
      expect(SessionManager.getActiveSessionCount()).toBe(3);
    });

    it("should decrease count when sessions are deleted", () => {
      const payload: SessionPayload = {
        userId: 1,
        username: "testuser",
        createdAt: new Date(),
      };

      const sessionId1 = SessionManager.createSession(payload);
      const sessionId2 = SessionManager.createSession(payload);

      expect(SessionManager.getActiveSessionCount()).toBe(2);

      SessionManager.deleteSession(sessionId1);
      expect(SessionManager.getActiveSessionCount()).toBe(1);

      SessionManager.deleteSession(sessionId2);
      expect(SessionManager.getActiveSessionCount()).toBe(0);
    });
  });
});
