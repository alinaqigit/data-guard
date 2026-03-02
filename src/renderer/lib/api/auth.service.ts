// Auth API Service

import { api, setSessionId, clearSession, setRememberToken, getRememberToken } from "./client";
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
    // Store remember token if returned (rememberMe was true)
    if (response.rememberToken) {
      setRememberToken(response.rememberToken);
    } else {
      // Clear any existing remember token when logging in without "Remember me"
      setRememberToken(null);
    }
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
      // Clear session and remember token
      clearSession();
      setRememberToken(null);
    }
  },

  /**
   * Verify current session and get user data
   */
  async verifySession(): Promise<User> {
    return api.get<User>("/api/auth/verify", true);
  },

  /**
   * Verify a remember token and restore session after app restart
   */
  async verifyRememberToken(): Promise<AuthResponse | null> {
    const token = getRememberToken();
    if (!token) return null;
    try {
      const response = await api.post<AuthResponse>(
        "/api/auth/verify-remember",
        { rememberToken: token },
      );
      // Store the new session ID
      setSessionId(response.sessionId);
      return response;
    } catch {
      // Token invalid or expired — clear it
      setRememberToken(null);
      return null;
    }
  },

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<User> {
    return api.get<User>("/api/auth/me", true);
  },

  /**
   * Update user profile (name, email, bio)
   */
  async updateProfile(data: { name?: string; email?: string; bio?: string }): Promise<User> {
    return api.put<User>("/api/auth/profile", data, true);
  },

  /**
   * Verify that an email belongs to a registered account
   */
  async verifyEmail(email: string): Promise<{ message: string; username: string }> {
    return api.post<{ message: string; username: string }>(
      "/api/auth/verify-email",
      { email },
    );
  },

  /**
   * Reset password using email verification
   */
  async resetPassword(email: string, newPassword: string): Promise<{ message: string }> {
    return api.post<{ message: string }>(
      "/api/auth/reset-password",
      { email, newPassword },
    );
  },
};
