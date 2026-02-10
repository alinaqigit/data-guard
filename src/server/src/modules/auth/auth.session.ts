import crypto from "crypto";

// Session-based authentication for offline Electron app
// No JWT tokens needed - sessions persist in memory until logout or app close

export interface SessionPayload {
  userId: number;
  username: string;
  createdAt: Date;
}

interface Session extends SessionPayload {
  sessionId: string;
}

export class SessionManager {
  private static sessions: Map<string, Session> = new Map();

  /**
   * Create a new session for a user
   */
  public static createSession(payload: SessionPayload): string {
    const sessionId = crypto.randomBytes(32).toString("hex");
    
    this.sessions.set(sessionId, {
      ...payload,
      sessionId,
    });

    return sessionId;
  }

  /**
   * Verify and retrieve session data
   */
  public static verifySession(sessionId: string): SessionPayload | null {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return null;
    }

    return {
      userId: session.userId,
      username: session.username,
      createdAt: session.createdAt,
    };
  }

  /**
   * Delete a session (logout)
   */
  public static deleteSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  /**
   * Clear all sessions (app restart/cleanup)
   */
  public static clearAllSessions(): void {
    this.sessions.clear();
  }

  /**
   * Get active session count
   */
  public static getActiveSessionCount(): number {
    return this.sessions.size;
  }
}
