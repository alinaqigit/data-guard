import { SessionManager } from "../src/modules/auth/auth.session";

// Global test setup
beforeEach(() => {
  // Clear all sessions before each test
  SessionManager.clearAllSessions();
});

afterAll(() => {
  // Final cleanup
  SessionManager.clearAllSessions();
});

// Extend Jest matchers if needed
declare global {
  namespace jest {
    interface Matchers<R> {
      // Add custom matchers here if needed
    }
  }
}
