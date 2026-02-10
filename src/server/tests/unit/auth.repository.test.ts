import { authRepository } from "../../src/modules/auth/auth.repository";
import { createTestDbPath, cleanupTestDb } from "../helpers";
import * as argon from "argon2";

describe("authRepository", () => {
  let repository: authRepository;
  let testDbPath: string;

  beforeEach(() => {
    testDbPath = createTestDbPath();
    repository = new authRepository(testDbPath);
  });

  afterEach(() => {
    cleanupTestDb(testDbPath);
  });

  describe("registerUser", () => {
    it("should create a new user in database", () => {
      const userData = {
        username: "newuser",
        passwordHash: "hashed_password_123",
      };

      const user = repository.registerUser(userData);

      expect(user).toBeDefined();
      expect(user.id).toBeDefined();
      expect(user.username).toBe("newuser");
      expect(user.passwordHash).toBe("hashed_password_123");
    });

    it("should auto-increment user IDs", () => {
      const user1 = repository.registerUser({
        username: "user1",
        passwordHash: "hash1",
      });

      const user2 = repository.registerUser({
        username: "user2",
        passwordHash: "hash2",
      });

      expect(user2.id).toBeGreaterThan(user1.id);
    });

    it("should throw error for duplicate username", () => {
      const userData = {
        username: "duplicate",
        passwordHash: "hash",
      };

      repository.registerUser(userData);

      expect(() => {
        repository.registerUser(userData);
      }).toThrow();
    });
  });

  describe("retreiveUserFromDB", () => {
    beforeEach(() => {
      repository.registerUser({
        username: "existinguser",
        passwordHash: "hashed_password",
      });
    });

    it("should retrieve user by username", () => {
      const user = repository.retreiveUserFromDB({
        username: "existinguser",
      });

      expect(user).toBeDefined();
      expect(user!.username).toBe("existinguser");
      expect(user!.passwordHash).toBe("hashed_password");
      expect(user!.id).toBeDefined();
    });

    it("should return null for non-existent user", () => {
      const user = repository.retreiveUserFromDB({
        username: "nonexistent",
      });

      expect(user).toBeNull();
    });

    it("should be case-sensitive for username", () => {
      const user = repository.retreiveUserFromDB({
        username: "EXISTINGUSER",
      });

      expect(user).toBeNull();
    });

    it("should include all user fields", () => {
      const user = repository.retreiveUserFromDB({
        username: "existinguser",
      });

      expect(user).toHaveProperty("id");
      expect(user).toHaveProperty("username");
      expect(user).toHaveProperty("passwordHash");
    });
  });

  describe("Integration with real password hashing", () => {
    it("should work with actual argon2 hashed passwords", async () => {
      const password = "mySecurePassword123!";
      const passwordHash = await argon.hash(password);

      const user = repository.registerUser({
        username: "argonuser",
        passwordHash,
      });

      const retrieved = repository.retreiveUserFromDB({
        username: "argonuser",
      });

      expect(retrieved).toBeDefined();
      const isValid = await argon.verify(
        retrieved!.passwordHash,
        password,
      );
      expect(isValid).toBe(true);

      const wrongPassword = await argon.verify(
        retrieved!.passwordHash,
        "wrongpassword",
      );
      expect(wrongPassword).toBe(false);
    });
  });
});
