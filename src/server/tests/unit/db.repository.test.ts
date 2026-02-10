import { dbRepository } from "../../src/modules/db/db.repository";
import { createTestDbPath, cleanupTestDb } from "../helpers";

describe("dbRepository", () => {
  let repository: dbRepository;
  let testDbPath: string;

  beforeEach(() => {
    testDbPath = createTestDbPath();
    repository = new dbRepository(testDbPath);
  });

  afterEach(() => {
    cleanupTestDb(testDbPath);
  });

  describe("Database Initialization", () => {
    it("should create database file if it does not exist", () => {
      // Already created in beforeEach, just verify it works
      expect(() => {
        new dbRepository(testDbPath);
      }).not.toThrow();
    });

    it("should create users table on initialization", () => {
      // Insert should work, proving table exists
      expect(() => {
        repository.createUser({
          username: "testuser",
          passwordHash: "hash",
        });
      }).not.toThrow();
    });
  });

  describe("createUser", () => {
    it("should insert user into database", () => {
      const userData = {
        username: "newuser",
        passwordHash: "hashed_password",
      };

      const user = repository.createUser(userData);

      expect(user).toBeDefined();
      expect(user.id).toBeDefined();
      expect(user.username).toBe("newuser");
      expect(user.passwordHash).toBe("hashed_password");
    });

    it("should auto-increment IDs", () => {
      const user1 = repository.createUser({
        username: "user1",
        passwordHash: "hash1",
      });

      const user2 = repository.createUser({
        username: "user2",
        passwordHash: "hash2",
      });

      expect(user2.id).toBeGreaterThan(user1.id);
      expect(user2.id).toBe(user1.id + 1);
    });
  });

  describe("getUserByUsername", () => {
    beforeEach(() => {
      repository.createUser({
        username: "testuser",
        passwordHash: "test_hash",
      });
    });

    it("should retrieve user by username", () => {
      const user = repository.getUserByUsername("testuser");

      expect(user).toBeDefined();
      expect(user!.username).toBe("testuser");
      expect(user!.passwordHash).toBe("test_hash");
      expect(user!.id).toBeDefined();
    });

    it("should return null for non-existent user", () => {
      const user = repository.getUserByUsername("nonexistent");

      expect(user).toBeNull();
    });

    it("should map database fields correctly", () => {
      const user = repository.getUserByUsername("testuser");

      expect(user).toHaveProperty("id");
      expect(user).toHaveProperty("username");
      expect(user).toHaveProperty("passwordHash");
    });
  });

  describe("updateUserName", () => {
    beforeEach(() => {
      repository.createUser({
        username: "oldusername",
        passwordHash: "hash",
      });
    });

    it("should update username", () => {
      repository.updateUserName("oldusername", "newusername");

      const oldUser = repository.getUserByUsername("oldusername");
      const newUser = repository.getUserByUsername("newusername");

      expect(oldUser).toBeNull();
      expect(newUser).toBeDefined();
      expect(newUser!.username).toBe("newusername");
    });

    it("should preserve other fields when updating", () => {
      const originalUser =
        repository.getUserByUsername("oldusername");
      const originalId = originalUser!.id;
      const originalHash = originalUser!.passwordHash;

      repository.updateUserName("oldusername", "newusername");

      const updatedUser = repository.getUserByUsername("newusername");
      expect(updatedUser!.id).toBe(originalId);
      expect(updatedUser!.passwordHash).toBe(originalHash);
    });
  });

  describe("deleteUserByUsername", () => {
    beforeEach(() => {
      repository.createUser({
        username: "todelete",
        passwordHash: "hash",
      });
    });

    it("should delete user from database", () => {
      repository.deleteUserByUsername("todelete");

      const user = repository.getUserByUsername("todelete");
      expect(user).toBeNull();
    });

    it("should not throw error if user does not exist", () => {
      expect(() => {
        repository.deleteUserByUsername("nonexistent");
      }).not.toThrow();
    });
  });

  describe("UNIQUE Constraint", () => {
    it("should enforce unique username constraint", () => {
      repository.createUser({
        username: "unique",
        passwordHash: "hash1",
      });

      expect(() => {
        repository.createUser({
          username: "unique",
          passwordHash: "hash2",
        });
      }).toThrow();
    });
  });
});
