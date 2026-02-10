import { authRepository } from "./auth.repository";
import { authResponse } from "./auth.types";
import { loginDTO, registerDTO } from "./dto";
import * as argon from "argon2";
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

    // 6. Remove password hash from response
    const { passwordHash, ...userWithoutPassword } = user;

    return {
      status: 200,
      body: {
        user: userWithoutPassword,
        sessionId,
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
}
