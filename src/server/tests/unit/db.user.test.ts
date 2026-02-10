import { User } from "../../src/modules/db/db.user";
import { createTestDbPath, cleanupTestDb } from "../helpers";

describe("User (db.user)", () => {
  let userService: User;
  let testDbPath: string;

  beforeEach(() => {
    testDbPath = createTestDbPath();
    userService = new User(testDbPath);
  });

  afterEach(() => {
    cleanupTestDb(testDbPath);
  });

  describe("createUser", () => {
    it("should create a new user", () => {
      const userData = {
        username: "testuser",
        passwordHash: "hashed_password",
      };

      const user = userService.createUser(userData);

      expect(user).toBeDefined();
      expect(user.id).toBeDefined();
      expect(user.username).toBe("testuser");
      expect(user.passwordHash).toBe("hashed_password");
    });

    it("should throw error if user already exists", () => {
      const userData = {
        username: "duplicate",
        passwordHash: "hash",
      };

      userService.createUser(userData);

      expect(() => {
        userService.createUser(userData);
      }).toThrow("User already exists");
    });
  });

  describe("getUserByUsername", () => {
    beforeEach(() => {
      userService.createUser({
        username: "existinguser",
        passwordHash: "hash123",
      });
    });

    it("should return user for existing username", () => {
      const user = userService.getUserByUsername("existinguser");

      expect(user).toBeDefined();
      expect(user!.username).toBe("existinguser");
      expect(user!.passwordHash).toBe("hash123");
    });

    it("should return null for non-existent username", () => {
      const user = userService.getUserByUsername("nonexistent");

      expect(user).toBeNull();
    });
  });

  describe("updateUserName", () => {
    beforeEach(() => {
      userService.createUser({
        username: "oldname",
        passwordHash: "hash",
      });
    });

    it("should update username successfully", () => {
      userService.updateUserName("oldname", "newname");

      const oldUser = userService.getUserByUsername("oldname");
      const newUser = userService.getUserByUsername("newname");

      expect(oldUser).toBeNull();
      expect(newUser).toBeDefined();
      expect(newUser!.username).toBe("newname");
    });

    it("should throw error if user does not exist", () => {
      expect(() => {
        userService.updateUserName("nonexistent", "newname");
      }).toThrow("User not found");
    });

    it("should preserve password hash when updating username", () => {
      userService.updateUserName("oldname", "newname");

      const user = userService.getUserByUsername("newname");
      expect(user!.passwordHash).toBe("hash");
    });
  });

  describe("deleteUserByUsername", () => {
    beforeEach(() => {
      userService.createUser({
        username: "todelete",
        passwordHash: "hash",
      });
    });

    it("should delete user successfully", () => {
      userService.deleteUserByUsername("todelete");

      const user = userService.getUserByUsername("todelete");
      expect(user).toBeNull();
    });

    it("should throw error if user does not exist", () => {
      expect(() => {
        userService.deleteUserByUsername("nonexistent");
      }).toThrow("User not found");
    });
  });
});
