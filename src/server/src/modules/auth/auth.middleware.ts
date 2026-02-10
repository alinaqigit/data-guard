import { NextFunction, Response } from "express";
import { CustomRequest } from "./dto";
import { SessionManager, SessionPayload } from "./auth.session";

export interface AuthenticatedRequest extends CustomRequest {
  user?: SessionPayload;
}

export class authMiddleware {
  /**
   * Middleware to verify session and attach user payload to request
   */
  public static verifySession(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): void {
    const sessionId = req.headers["x-session-id"] as string;

    if (!sessionId) {
      res.status(401).json({ error: "No session ID provided" });
      return;
    }

    const payload = SessionManager.verifySession(sessionId);

    if (!payload) {
      res.status(401).json({ error: "Invalid or expired session" });
      return;
    }

    // Attach user payload to request
    req.user = payload;
    next();
  }

  /**
   * Optional auth middleware - continues even if session is invalid
   */
  public static optionalAuth(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): void {
    const sessionId = req.headers["x-session-id"] as string;

    if (sessionId) {
      const payload = SessionManager.verifySession(sessionId);

      if (payload) {
        req.user = payload;
      }
    }

    next();
  }
}
