// API Client for communicating with the Express server

import { ApiError } from "./types";

// Default API base URL - adjust based on environment
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

// Session management
let sessionId: string | null = null;

export function setSessionId(id: string | null) {
  sessionId = id;
  if (id) {
    localStorage.setItem("sessionId", id);
  } else {
    localStorage.removeItem("sessionId");
  }
}

export function getSessionId(): string | null {
  if (!sessionId && typeof window !== "undefined") {
    sessionId = localStorage.getItem("sessionId");
  }
  return sessionId;
}

export function clearSession() {
  setSessionId(null);
}

// Generic API request handler
interface RequestOptions extends RequestInit {
  requiresAuth?: boolean;
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<T> {
  const {
    requiresAuth = false,
    headers = {},
    ...fetchOptions
  } = options;

  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...(headers as Record<string, string>),
  };

  // Add session ID if authentication is required
  if (requiresAuth) {
    const session = getSessionId();
    if (session) {
      requestHeaders["x-session-id"] = session;
    }
  }

  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers: requestHeaders,
    });

    // Handle non-JSON responses
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      if (!response.ok) {
        throw new Error(
          `HTTP ${response.status}: ${response.statusText}`,
        );
      }
      return {} as T;
    }

    const data = await response.json();

    if (!response.ok) {
      const error = data as ApiError;
      throw new Error(
        error.error ||
          `HTTP ${response.status}: ${response.statusText}`,
      );
    }

    return data as T;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("An unknown error occurred");
  }
}

// Exported API methods
export const api = {
  get: <T>(endpoint: string, requiresAuth = false) =>
    apiRequest<T>(endpoint, { method: "GET", requiresAuth }),

  post: <T>(endpoint: string, body?: any, requiresAuth = false) =>
    apiRequest<T>(endpoint, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
      requiresAuth,
    }),

  put: <T>(endpoint: string, body?: any, requiresAuth = false) =>
    apiRequest<T>(endpoint, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
      requiresAuth,
    }),

  patch: <T>(endpoint: string, body?: any, requiresAuth = false) =>
    apiRequest<T>(endpoint, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
      requiresAuth,
    }),

  delete: <T>(endpoint: string, requiresAuth = false) =>
    apiRequest<T>(endpoint, { method: "DELETE", requiresAuth }),
};
