import {
  setSessionId,
  getSessionId,
  clearSession,
  setRememberedCredentials,
  getRememberedCredentials,
  clearRememberedCredentials,
  api,
} from "@/lib/api/client";

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn(
      (key: string): string | null => store[key] ?? null,
    ),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();
Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

describe("API Client", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    clearSession();
  });

  describe("Session Management", () => {
    it("setSessionId stores session in localStorage", () => {
      setSessionId("test-session-123");
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "sessionId",
        "test-session-123",
      );
    });

    it("setSessionId with null removes from localStorage", () => {
      setSessionId(null);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        "sessionId",
      );
    });

    it("getSessionId retrieves from localStorage", () => {
      localStorageMock.getItem.mockReturnValueOnce("stored-session");
      const session = getSessionId();
      expect(session).toBe("stored-session");
    });

    it("clearSession removes session", () => {
      setSessionId("to-clear");
      clearSession();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        "sessionId",
      );
    });
  });

  describe("Remember Me Credentials", () => {
    it("stores credentials as base64 encoded JSON", () => {
      setRememberedCredentials("user1", "pass123");
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "dlp_remember_me",
        btoa(
          JSON.stringify({ username: "user1", password: "pass123" }),
        ),
      );
    });

    it("retrieves stored credentials", () => {
      const encoded = btoa(
        JSON.stringify({ username: "user1", password: "pass123" }),
      );
      localStorageMock.getItem.mockReturnValueOnce(encoded);

      const creds = getRememberedCredentials();
      expect(creds).toEqual({
        username: "user1",
        password: "pass123",
      });
    });

    it("returns null when no credentials stored", () => {
      localStorageMock.getItem.mockReturnValueOnce(null);
      const creds = getRememberedCredentials();
      expect(creds).toBeNull();
    });

    it("returns null for corrupted stored data", () => {
      localStorageMock.getItem.mockReturnValueOnce(
        "not-valid-base64!!!!",
      );
      const creds = getRememberedCredentials();
      expect(creds).toBeNull();
    });

    it("clears credentials", () => {
      clearRememberedCredentials();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        "dlp_remember_me",
      );
    });
  });

  describe("API Request Methods", () => {
    it("GET request is made correctly", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve({ data: "test" }),
      });

      const result = await api.get<{ data: string }>("/api/test");

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:4000/api/test",
        expect.objectContaining({ method: "GET" }),
      );
      expect(result).toEqual({ data: "test" });
    });

    it("POST request sends body correctly", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve({ id: 1 }),
      });

      const result = await api.post("/api/create", { name: "test" });

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:4000/api/create",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ name: "test" }),
        }),
      );
      expect(result).toEqual({ id: 1 });
    });

    it("PUT request sends body correctly", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve({ updated: true }),
      });

      await api.put("/api/update/1", { name: "updated" });

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:4000/api/update/1",
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({ name: "updated" }),
        }),
      );
    });

    it("PATCH request works correctly", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve({ patched: true }),
      });

      await api.patch("/api/patch/1", { status: "active" });

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:4000/api/patch/1",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ status: "active" }),
        }),
      );
    });

    it("DELETE request works correctly", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve({ deleted: true }),
      });

      await api.delete("/api/items/1");

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:4000/api/items/1",
        expect.objectContaining({ method: "DELETE" }),
      );
    });

    it("includes session header when requiresAuth is true", async () => {
      setSessionId("auth-session-456");

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve({ data: "protected" }),
      });

      await api.get("/api/protected", true);

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:4000/api/protected",
        expect.objectContaining({
          headers: expect.objectContaining({
            "x-session-id": "auth-session-456",
          }),
        }),
      );
    });

    it("throws error on non-OK response with error message", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve({ error: "Invalid credentials" }),
      });

      await expect(api.get("/api/protected")).rejects.toThrow(
        "Invalid credentials",
      );
    });

    it("throws error on non-OK response without error message", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve({}),
      });

      await expect(api.get("/api/broken")).rejects.toThrow(
        "HTTP 500: Internal Server Error",
      );
    });

    it("handles non-JSON responses", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ "content-type": "text/plain" }),
      });

      const result = await api.get("/api/plain");
      expect(result).toEqual({});
    });

    it("throws on non-JSON error responses", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
        headers: new Headers({ "content-type": "text/html" }),
      });

      await expect(api.get("/api/missing")).rejects.toThrow(
        "HTTP 404: Not Found",
      );
    });

    it("handles network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      await expect(api.get("/api/test")).rejects.toThrow(
        "Network error",
      );
    });

    it("handles unknown errors", async () => {
      mockFetch.mockRejectedValueOnce("string error");

      await expect(api.get("/api/test")).rejects.toThrow(
        "An unknown error occurred",
      );
    });
  });
});
