// Auth API Service

import { api, setSessionId, clearSession } from "./client";
import {
  AuthRegisterRequest,
  AuthLoginRequest,
  AuthResponse,
  User,
} from "./types";

export const authService = {
  /**
   * Register a new user
   */
  async register(data: AuthRegisterRequest): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>(
      "/api/auth/register",
      data,
    );
    // Store session ID
    setSessionId(response.sessionId);
    return response;
  },

  /**
   * Login existing user
   */
  async login(data: AuthLoginRequest): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>(
      "/api/auth/login",
      data,
    );
    // Store session ID
    setSessionId(response.sessionId);
    return response;
  },

  /**
   * Logout current user
   */
  async logout(): Promise<void> {
    try {
      await api.post<{ message: string }>(
        "/api/auth/logout",
        undefined,
        true,
      );
    } finally {
      // Clear session even if request fails
      clearSession();
    }
  },

  /**
   * Verify current session and get user data
   */
  async verifySession(): Promise<User> {
    return api.get<User>("/api/auth/verify", true);
  },

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<User> {
    return api.get<User>("/api/auth/me", true);
  },
};
