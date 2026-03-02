import { authRepository } from "./auth.repository";
import { authResponse } from "./auth.types";
import { loginDTO, registerDTO } from "./dto";
import * as argon from "argon2";
import crypto from "crypto";
import { SessionManager, SessionPayload } from "./auth.session";

export class authService {
  private readonly authRepository: authRepository;

  constructor(DB_PATH: string) {
    this.authRepository = new authRepository(DB_PATH);
  }

  public async login(dto: loginDTO): Promise<authResponse> {
    // 1. Retrieve user from database

    const user = this.authRepository.retreiveUserFromDB({
      username: dto.username,
    });

    // 2. If user not found, return error

    if (!user) {
      return {
        status: 404,
        error: "User not found",
      };
    }

    // 3. Validate passwordHash exists
    if (!user.passwordHash || typeof user.passwordHash !== "string") {
      return {
        status: 500,
        error: "Invalid user data in database",
      };
    }

    // 4. Verify password

    const isPasswordValid = await argon.verify(
      user.passwordHash,
      dto.password,
    );
    if (!isPasswordValid) {
      return {
        status: 401,
        error: "Invalid credentials",
      };
    }

    // 5. Create session (no JWT tokens - this is an offline app)
    const sessionPayload: SessionPayload = {
      userId: user.id,
      username: user.username,
      createdAt: new Date(),
    };

    const sessionId = SessionManager.createSession(sessionPayload);

    // 6. Create remember token if requested
    let rememberToken: string | undefined;
    if (dto.rememberMe) {
      rememberToken = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days
      this.authRepository.createRememberToken(rememberToken, user.id, expiresAt);
    }

    // 7. Remove password hash from response
    const { passwordHash, ...userWithoutPassword } = user;

    return {
      status: 200,
      body: {
        user: userWithoutPassword,
        sessionId,
        ...(rememberToken ? { rememberToken } : {}),
      },
    };
  }

  public async register(dto: registerDTO): Promise<authResponse> {
    // 1. Check if the user already exists

    const user = this.authRepository.retreiveUserFromDB({
      username: dto.username,
    });

    if (user) {
      return {
        status: 409,
        error: "User already exists",
      };
    }

    // 2. Hash the password

    const passwordHash = await argon.hash(dto.password);

    // 3. Store the user in the database

    const newUser = {
      username: dto.username,
      passwordHash,
    };

    const createdUser = this.authRepository.registerUser(newUser);

    // 4. Create session (no JWT tokens - this is an offline app)
    const sessionPayload: SessionPayload = {
      userId: createdUser.id,
      username: createdUser.username,
      createdAt: new Date(),
    };

    const sessionId = SessionManager.createSession(sessionPayload);

    // 5. Remove password hash from response
    const { passwordHash: _, ...userWithoutPassword } = createdUser;

    return {
      status: 201,
      body: {
        user: userWithoutPassword,
        sessionId,
      },
    };
  }

  public async logout(sessionId: string): Promise<authResponse> {
    // Delete the session
    const deleted = SessionManager.deleteSession(sessionId);

    if (!deleted) {
      return {
        status: 404,
        error: "Session not found",
      };
    }

    return {
      status: 200,
      body: {
        message: "Logged out successfully",
      },
    };
  }

  public async verifySession(
    sessionId: string,
  ): Promise<authResponse> {
    // 1. Verify session exists
    const sessionPayload = SessionManager.verifySession(sessionId);

    if (!sessionPayload) {
      return {
        status: 401,
        error: "Invalid or expired session",
      };
    }

    // 2. Verify user still exists
    const user = this.authRepository.retreiveUserFromDB({
      username: sessionPayload.username,
    });

    if (!user) {
      return {
        status: 404,
        error: "User not found",
      };
    }

    // 3. Return user data without password
    const { passwordHash, ...userWithoutPassword } = user;

    return {
      status: 200,
      body: userWithoutPassword,
    };
  }

  public async updateProfile(
    userId: number,
    data: { email?: string; bio?: string; name?: string },
  ): Promise<authResponse> {
    // Map 'name' from frontend to 'username' in DB
    const updateData: { email?: string; bio?: string; username?: string } = {};
    if (data.email !== undefined) updateData.email = data.email;
    if (data.bio !== undefined) updateData.bio = data.bio;
    if (data.name !== undefined) updateData.username = data.name;

    const updatedUser = this.authRepository.updateUserProfile(
      userId,
      updateData,
    );

    if (!updatedUser) {
      return {
        status: 404,
        error: "User not found",
      };
    }

    // If username changed, update the session
    if (data.name) {
      SessionManager.updateSessionUsername(userId, data.name);
    }

    const { passwordHash, ...userWithoutPassword } = updatedUser;

    return {
      status: 200,
      body: userWithoutPassword,
    };
  }

  /**
   * Verify a remember token and create a new session
   * Used after app restart when in-memory sessions are lost
   */
  public async verifyRememberToken(token: string): Promise<authResponse> {
    // 1. Look up remember token in DB
    const tokenData = this.authRepository.getRememberToken(token);
    if (!tokenData) {
      return { status: 401, error: "Invalid or expired remember token" };
    }

    // 2. Check if expired
    if (new Date(tokenData.expiresAt) < new Date()) {
      this.authRepository.deleteRememberToken(token);
      return { status: 401, error: "Remember token has expired" };
    }

    // 3. Retrieve user from DB
    const user = this.authRepository.getUserById(tokenData.userId);
    if (!user) {
      this.authRepository.deleteRememberToken(token);
      return { status: 404, error: "User not found" };
    }

    // 4. Create a new session
    const sessionPayload: SessionPayload = {
      userId: user.id,
      username: user.username,
      createdAt: new Date(),
    };
    const sessionId = SessionManager.createSession(sessionPayload);

    // 5. Return user data + new session
    const { passwordHash, ...userWithoutPassword } = user;
    return {
      status: 200,
      body: {
        user: userWithoutPassword,
        sessionId,
      },
    };
  }

  /**
   * Verify that an email address belongs to a registered account
   */
  public async verifyEmail(email: string): Promise<authResponse> {
    const user = this.authRepository.getUserByEmail(email);
    if (!user) {
      return { status: 404, error: "No account found with that email address" };
    }
    return {
      status: 200,
      body: { message: "Email verified", username: user.username },
    };
  }

  /**
   * Reset password using email verification
   * Since this is an offline Electron app, we verify via email match
   */
  public async resetPassword(email: string, newPassword: string): Promise<authResponse> {
    // 1. Find user by email
    const user = this.authRepository.getUserByEmail(email);
    if (!user) {
      return { status: 404, error: "No account found with that email address" };
    }

    // 2. Hash the new password
    const passwordHash = await argon.hash(newPassword);

    // 3. Update in DB
    this.authRepository.updateUserPassword(user.id, passwordHash);

    // 4. Clear any existing remember tokens (force re-login)
    this.authRepository.deleteRememberTokensByUserId(user.id);

    return {
      status: 200,
      body: { message: "Password reset successfully" },
    };
  }
}
