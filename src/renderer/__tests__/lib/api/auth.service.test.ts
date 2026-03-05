import { authService } from "@/lib/api/auth.service";
import { api, setSessionId, clearSession } from "@/lib/api/client";

// Mock the client module
jest.mock("@/lib/api/client", () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
  },
  setSessionId: jest.fn(),
  clearSession: jest.fn(),
}));

const mockApi = api as jest.Mocked<typeof api>;

describe("authService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("register", () => {
    it("calls POST /api/auth/register and stores session", async () => {
      const response = {
        user: { id: 1, username: "newuser" },
        sessionId: "session-abc",
      };
      mockApi.post.mockResolvedValueOnce(response);

      const result = await authService.register({
        username: "newuser",
        password: "pass123",
      });

      expect(mockApi.post).toHaveBeenCalledWith(
        "/api/auth/register",
        {
          username: "newuser",
          password: "pass123",
        },
      );
      expect(setSessionId).toHaveBeenCalledWith("session-abc");
      expect(result).toEqual(response);
    });
  });

  describe("login", () => {
    it("calls POST /api/auth/login and stores session", async () => {
      const response = {
        user: { id: 1, username: "user1" },
        sessionId: "session-xyz",
      };
      mockApi.post.mockResolvedValueOnce(response);

      const result = await authService.login({
        username: "user1",
        password: "secret",
      });

      expect(mockApi.post).toHaveBeenCalledWith("/api/auth/login", {
        username: "user1",
        password: "secret",
      });
      expect(setSessionId).toHaveBeenCalledWith("session-xyz");
      expect(result).toEqual(response);
    });
  });

  describe("logout", () => {
    it("calls POST /api/auth/logout and clears session", async () => {
      mockApi.post.mockResolvedValueOnce({ message: "Logged out" });

      await authService.logout();

      expect(mockApi.post).toHaveBeenCalledWith(
        "/api/auth/logout",
        undefined,
        true,
      );
      expect(clearSession).toHaveBeenCalled();
    });

    it("clears session even if API call fails", async () => {
      mockApi.post.mockRejectedValueOnce(new Error("Network error"));

      // logout() uses try/finally so the error is rethrown
      await expect(authService.logout()).rejects.toThrow(
        "Network error",
      );
      expect(clearSession).toHaveBeenCalled();
    });
  });

  describe("verifySession", () => {
    it("calls GET /api/auth/verify with auth", async () => {
      const user = { id: 1, username: "user1" };
      mockApi.get.mockResolvedValueOnce(user);

      const result = await authService.verifySession();

      expect(mockApi.get).toHaveBeenCalledWith(
        "/api/auth/verify",
        true,
      );
      expect(result).toEqual(user);
    });
  });

  describe("getCurrentUser", () => {
    it("calls GET /api/auth/me with auth", async () => {
      const user = { id: 2, username: "user2" };
      mockApi.get.mockResolvedValueOnce(user);

      const result = await authService.getCurrentUser();

      expect(mockApi.get).toHaveBeenCalledWith("/api/auth/me", true);
      expect(result).toEqual(user);
    });
  });
});
