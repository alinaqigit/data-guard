import { Policy } from "../../src/modules/db/db.policy";
import {
  createTestDbPath,
  cleanupTestDb,
  generateTestUser,
} from "../helpers";
import { authRepository } from "../../src/modules/auth/auth.repository";
import * as argon from "argon2";

describe("Policy (db.policy)", () => {
  let policy: Policy;
  let testDbPath: string;
  let testUserId: number;

  beforeEach(async () => {
    testDbPath = createTestDbPath();
    policy = new Policy(testDbPath);

    // Create a test user
    const authRepo = new authRepository(testDbPath);
    const testUser = generateTestUser();
    const passwordHash = await argon.hash(testUser.password);
    const user = authRepo.registerUser({
      username: testUser.username,
      passwordHash,
    });
    testUserId = user.id;
  });

  afterEach(() => {
    cleanupTestDb(testDbPath);
  });

  describe("createPolicy", () => {
    it("should create a policy successfully", () => {
      const policyData = {
        userId: testUserId,
        name: "Test Policy",
        pattern: "test-pattern",
        type: "keyword" as const,
        description: "A test policy",
      };

      const result = policy.createPolicy(policyData);

      expect(result.id).toBeDefined();
      expect(result.userId).toBe(testUserId);
      expect(result.name).toBe(policyData.name);
      expect(result.pattern).toBe(policyData.pattern);
      expect(result.type).toBe("keyword");
      expect(result.description).toBe(policyData.description);
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });

    it("should create policy without description", () => {
      const policyData = {
        userId: testUserId,
        name: "Simple Policy",
        pattern: "simple",
        type: "regex" as const,
      };

      const result = policy.createPolicy(policyData);

      expect(result.id).toBeDefined();
      expect(result.description).toBeUndefined();
    });
  });

  describe("getPolicyById", () => {
    it("should retrieve policy by ID", () => {
      const created = policy.createPolicy({
        userId: testUserId,
        name: "Retrieve Test",
        pattern: "retrieve",
        type: "keyword",
      });

      const result = policy.getPolicyById(created.id);

      expect(result).toBeDefined();
      expect(result!.id).toBe(created.id);
      expect(result!.name).toBe("Retrieve Test");
    });

    it("should return null for non-existent policy", () => {
      const result = policy.getPolicyById(99999);

      expect(result).toBeNull();
    });
  });

  describe("getAllPoliciesByUserId", () => {
    it("should return all policies for a user", () => {
      policy.createPolicy({
        userId: testUserId,
        name: "Policy 1",
        pattern: "p1",
        type: "keyword",
      });

      policy.createPolicy({
        userId: testUserId,
        name: "Policy 2",
        pattern: "p2",
        type: "regex",
      });

      policy.createPolicy({
        userId: testUserId,
        name: "Policy 3",
        pattern: "p3",
        type: "keyword",
      });

      const result = policy.getAllPoliciesByUserId(testUserId);

      expect(result).toHaveLength(3);
      expect(result[0].name).toBe("Policy 3"); // Most recent first
      expect(result[1].name).toBe("Policy 2");
      expect(result[2].name).toBe("Policy 1");
    });

    it("should return empty array for user with no policies", () => {
      const result = policy.getAllPoliciesByUserId(testUserId);

      expect(result).toEqual([]);
    });

    it("should only return policies for specified user", async () => {
      // Create policy for first user
      policy.createPolicy({
        userId: testUserId,
        name: "User 1 Policy",
        pattern: "u1",
        type: "keyword",
      });

      // Create second user
      const authRepo = new authRepository(testDbPath);
      const user2Data = generateTestUser();
      const passwordHash = await argon.hash(user2Data.password);
      const user2 = authRepo.registerUser({
        username: user2Data.username,
        passwordHash,
      });

      // Create policy for second user
      policy.createPolicy({
        userId: user2.id,
        name: "User 2 Policy",
        pattern: "u2",
        type: "keyword",
      });

      const user1Policies = policy.getAllPoliciesByUserId(testUserId);
      const user2Policies = policy.getAllPoliciesByUserId(user2.id);

      expect(user1Policies).toHaveLength(1);
      expect(user2Policies).toHaveLength(1);
      expect(user1Policies[0].name).toBe("User 1 Policy");
      expect(user2Policies[0].name).toBe("User 2 Policy");
    });
  });

  describe("updatePolicy", () => {
    it("should update policy name", () => {
      const created = policy.createPolicy({
        userId: testUserId,
        name: "Original",
        pattern: "test",
        type: "keyword",
      });

      policy.updatePolicy(created.id, testUserId, {
        name: "Updated",
      });

      const updated = policy.getPolicyById(created.id);
      expect(updated!.name).toBe("Updated");
      expect(updated!.pattern).toBe("test"); // Unchanged
    });

    it("should update policy pattern", () => {
      const created = policy.createPolicy({
        userId: testUserId,
        name: "Test",
        pattern: "old",
        type: "keyword",
      });

      policy.updatePolicy(created.id, testUserId, {
        pattern: "new",
      });

      const updated = policy.getPolicyById(created.id);
      expect(updated!.pattern).toBe("new");
    });

    it("should update policy type", () => {
      const created = policy.createPolicy({
        userId: testUserId,
        name: "Test",
        pattern: "\\d+",
        type: "keyword",
      });

      policy.updatePolicy(created.id, testUserId, {
        type: "regex",
      });

      const updated = policy.getPolicyById(created.id);
      expect(updated!.type).toBe("regex");
    });

    it("should throw error for non-existent policy", () => {
      expect(() => {
        policy.updatePolicy(99999, testUserId, { name: "Test" });
      }).toThrow("Policy not found");
    });

    it("should throw error when user doesn't own policy", async () => {
      const created = policy.createPolicy({
        userId: testUserId,
        name: "Test",
        pattern: "test",
        type: "keyword",
      });

      // Create another user
      const authRepo = new authRepository(testDbPath);
      const user2Data = generateTestUser();
      const passwordHash = await argon.hash(user2Data.password);
      const user2 = authRepo.registerUser({
        username: user2Data.username,
        passwordHash,
      });

      expect(() => {
        policy.updatePolicy(created.id, user2.id, { name: "Hacked" });
      }).toThrow("Unauthorized");
    });
  });

  describe("deletePolicy", () => {
    it("should delete policy successfully", () => {
      const created = policy.createPolicy({
        userId: testUserId,
        name: "To Delete",
        pattern: "delete",
        type: "keyword",
      });

      policy.deletePolicy(created.id, testUserId);

      const deleted = policy.getPolicyById(created.id);
      expect(deleted).toBeNull();
    });

    it("should throw error for non-existent policy", () => {
      expect(() => {
        policy.deletePolicy(99999, testUserId);
      }).toThrow("Policy not found");
    });

    it("should throw error when user doesn't own policy", async () => {
      const created = policy.createPolicy({
        userId: testUserId,
        name: "Test",
        pattern: "test",
        type: "keyword",
      });

      // Create another user
      const authRepo = new authRepository(testDbPath);
      const user2Data = generateTestUser();
      const passwordHash = await argon.hash(user2Data.password);
      const user2 = authRepo.registerUser({
        username: user2Data.username,
        passwordHash,
      });

      expect(() => {
        policy.deletePolicy(created.id, user2.id);
      }).toThrow("Unauthorized");
    });
  });

  describe("togglePolicyStatus", () => {
    it("should toggle policy from enabled to disabled", () => {
      const created = policy.createPolicy({
        userId: testUserId,
        name: "Test Policy",
        pattern: "test",
        type: "keyword",
      });

      expect(created.isEnabled).toBe(true);

      policy.togglePolicyStatus(created.id, testUserId);

      const updated = policy.getPolicyById(created.id);
      expect(updated!.isEnabled).toBe(false);
    });

    it("should toggle policy from disabled to enabled", () => {
      const created = policy.createPolicy({
        userId: testUserId,
        name: "Test Policy",
        pattern: "test",
        type: "keyword",
      });

      // Toggle to disabled
      policy.togglePolicyStatus(created.id, testUserId);
      let updated = policy.getPolicyById(created.id);
      expect(updated!.isEnabled).toBe(false);

      // Toggle back to enabled
      policy.togglePolicyStatus(created.id, testUserId);
      updated = policy.getPolicyById(created.id);
      expect(updated!.isEnabled).toBe(true);
    });

    it("should throw error for non-existent policy", () => {
      expect(() => {
        policy.togglePolicyStatus(99999, testUserId);
      }).toThrow("Policy not found");
    });

    it("should throw error when user doesn't own policy", async () => {
      const created = policy.createPolicy({
        userId: testUserId,
        name: "Test",
        pattern: "test",
        type: "keyword",
      });

      // Create another user
      const authRepo = new authRepository(testDbPath);
      const user2Data = generateTestUser();
      const passwordHash = await argon.hash(user2Data.password);
      const user2 = authRepo.registerUser({
        username: user2Data.username,
        passwordHash,
      });

      expect(() => {
        policy.togglePolicyStatus(created.id, user2.id);
      }).toThrow("Unauthorized");
    });

    it("should preserve other policy fields when toggling", () => {
      const created = policy.createPolicy({
        userId: testUserId,
        name: "Important Policy",
        pattern: "secret-data",
        type: "regex",
        description: "Critical policy",
      });

      policy.togglePolicyStatus(created.id, testUserId);

      const updated = policy.getPolicyById(created.id);
      expect(updated!.name).toBe("Important Policy");
      expect(updated!.pattern).toBe("secret-data");
      expect(updated!.type).toBe("regex");
      expect(updated!.description).toBe("Critical policy");
      expect(updated!.isEnabled).toBe(false);
    });
  });
});
