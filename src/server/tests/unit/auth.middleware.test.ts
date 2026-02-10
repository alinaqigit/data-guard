import {
  authMiddleware,
  AuthenticatedRequest,
} from "../../src/modules/auth/auth.middleware";
import {
  SessionManager,
  SessionPayload,
} from "../../src/modules/auth/auth.session";
import { mockRequest, mockResponse, mockNext } from "../helpers";

describe("authMiddleware", () => {
  beforeEach(() => {
    SessionManager.clearAllSessions();
  });

  describe("verifySession", () => {
    it("should call next() for valid session", () => {
      const payload: SessionPayload = {
        userId: 1,
        username: "testuser",
        createdAt: new Date(),
      };

      const sessionId = SessionManager.createSession(payload);

      const req = mockRequest({
        headers: { "x-session-id": sessionId },
      }) as AuthenticatedRequest;
      const res = mockResponse();
      const next = mockNext();

      authMiddleware.verifySession(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(req.user).toEqual(payload);
      expect(res.status).not.toHaveBeenCalled();
    });

    it("should return 401 if no session ID provided", () => {
      const req = mockRequest({
        headers: {},
      }) as AuthenticatedRequest;
      const res = mockResponse();
      const next = mockNext();

      authMiddleware.verifySession(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: "No session ID provided",
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should return 401 for invalid session ID", () => {
      const req = mockRequest({
        headers: { "x-session-id": "invalid-session-id" },
      }) as AuthenticatedRequest;
      const res = mockResponse();
      const next = mockNext();

      authMiddleware.verifySession(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: "Invalid or expired session",
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should attach user payload to request", () => {
      const payload: SessionPayload = {
        userId: 42,
        username: "john_doe",
        createdAt: new Date("2026-01-15"),
      };

      const sessionId = SessionManager.createSession(payload);

      const req = mockRequest({
        headers: { "x-session-id": sessionId },
      }) as AuthenticatedRequest;
      const res = mockResponse();
      const next = mockNext();

      authMiddleware.verifySession(req, res, next);

      expect(req.user).toBeDefined();
      expect(req.user?.userId).toBe(42);
      expect(req.user?.username).toBe("john_doe");
    });
  });

  describe("optionalAuth", () => {
    it("should attach user if valid session provided", () => {
      const payload: SessionPayload = {
        userId: 1,
        username: "testuser",
        createdAt: new Date(),
      };

      const sessionId = SessionManager.createSession(payload);

      const req = mockRequest({
        headers: { "x-session-id": sessionId },
      }) as AuthenticatedRequest;
      const res = mockResponse();
      const next = mockNext();

      authMiddleware.optionalAuth(req, res, next);

      expect(req.user).toEqual(payload);
      expect(next).toHaveBeenCalledTimes(1);
    });

    it("should call next() without user if no session provided", () => {
      const req = mockRequest({
        headers: {},
      }) as AuthenticatedRequest;
      const res = mockResponse();
      const next = mockNext();

      authMiddleware.optionalAuth(req, res, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    });

    it("should call next() without user if invalid session", () => {
      const req = mockRequest({
        headers: { "x-session-id": "invalid-session" },
      }) as AuthenticatedRequest;
      const res = mockResponse();
      const next = mockNext();

      authMiddleware.optionalAuth(req, res, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalledTimes(1);
    });

    it("should not send error response for invalid session", () => {
      const req = mockRequest({
        headers: { "x-session-id": "invalid" },
      }) as AuthenticatedRequest;
      const res = mockResponse();
      const next = mockNext();

      authMiddleware.optionalAuth(req, res, next);

      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });
});
