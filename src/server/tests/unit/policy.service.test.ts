import { policyService } from "../../src/modules/policy/policy.service";
import { policyRepository } from "../../src/modules/policy/policy.repository";
import {
  createTestDbPath,
  cleanupTestDb,
  generateTestUser,
} from "../helpers";
import { authRepository } from "../../src/modules/auth/auth.repository";
import * as argon from "argon2";

describe("policyService", () => {
  let service: policyService;
  let testDbPath: string;
  let testUserId: number;

  beforeEach(async () => {
    testDbPath = createTestDbPath();
    service = new policyService(testDbPath);

    // Create a test user for policy ownership
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
    it("should successfully create a keyword policy", async () => {
      const dto = {
        name: "Credit Card Policy",
        pattern: "4111-1111-1111-1111",
        type: "keyword" as const,
        description: "Detect credit card numbers",
      };

      const response = await service.createPolicy(dto, testUserId);

      expect(response.status).toBe(201);
      expect(response.body).toBeDefined();
      expect(response.body.id).toBeDefined();
      expect(response.body.name).toBe(dto.name);
      expect(response.body.pattern).toBe(dto.pattern);
      expect(response.body.type).toBe("keyword");
      expect(response.body.userId).toBe(testUserId);
      expect(response.body.createdAt).toBeDefined();
    });

    it("should successfully create a regex policy", async () => {
      const dto = {
        name: "Email Policy",
        pattern: "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}",
        type: "regex" as const,
        description: "Detect email addresses",
      };

      const response = await service.createPolicy(dto, testUserId);

      expect(response.status).toBe(201);
      expect(response.body).toBeDefined();
      expect(response.body.type).toBe("regex");
      expect(response.body.pattern).toBe(dto.pattern);
    });

    it("should create policy without description", async () => {
      const dto = {
        name: "Simple Policy",
        pattern: "secret",
        type: "keyword" as const,
        description: "",
      };

      const response = await service.createPolicy(dto, testUserId);

      expect(response.status).toBe(201);
      expect(response.body.description).toBeUndefined();
    });

    it("should return 400 for invalid type", async () => {
      const dto = {
        name: "Invalid Policy",
        pattern: "test",
        type: "invalid" as any,
        description: "",
      };

      const response = await service.createPolicy(dto, testUserId);

      expect(response.status).toBe(400);
      expect(response.error).toBe(
        "Type must be either 'keyword' or 'regex'",
      );
    });

    it("should return 400 for invalid regex pattern", async () => {
      const dto = {
        name: "Bad Regex",
        pattern: "[invalid(regex",
        type: "regex" as const,
        description: "",
      };

      const response = await service.createPolicy(dto, testUserId);

      expect(response.status).toBe(400);
      expect(response.error).toBe("Invalid regex pattern");
    });

    it("should accept valid regex patterns", async () => {
      const validPatterns = [
        "\\d{3}-\\d{2}-\\d{4}", // SSN
        "^[A-Z][a-z]+$", // Names
        "(\\w+)@(\\w+\\.)(\\w+)", // Email
      ];

      for (const pattern of validPatterns) {
        const dto = {
          name: `Pattern Test ${pattern}`,
          pattern,
          type: "regex" as const,
          description: "",
        };

        const response = await service.createPolicy(dto, testUserId);
        expect(response.status).toBe(201);
      }
    });
  });

  describe("getPolicyById", () => {
    it("should retrieve policy by ID", async () => {
      const dto = {
        name: "Test Policy",
        pattern: "test",
        type: "keyword" as const,
        description: "",
      };

      const created = await service.createPolicy(dto, testUserId);
      const response = await service.getPolicyById(
        created.body.id,
        testUserId,
      );

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(created.body.id);
      expect(response.body.name).toBe(dto.name);
    });

    it("should return 404 for non-existent policy", async () => {
      const response = await service.getPolicyById(99999, testUserId);

      expect(response.status).toBe(404);
      expect(response.error).toBe("Policy not found");
    });

    it("should return 403 when accessing another user's policy", async () => {
      // Create another user
      const authRepo = new authRepository(testDbPath);
      const otherUser = generateTestUser();
      const passwordHash = await argon.hash(otherUser.password);
      const user = authRepo.registerUser({
        username: otherUser.username,
        passwordHash,
      });

      // Create policy for first user
      const dto = {
        name: "Private Policy",
        pattern: "private",
        type: "keyword" as const,
        description: "",
      };
      const created = await service.createPolicy(dto, testUserId);

      // Try to access with different user
      const response = await service.getPolicyById(
        created.body.id,
        user.id,
      );

      expect(response.status).toBe(403);
      expect(response.error).toBe("Access denied");
    });
  });

  describe("getAllPolicies", () => {
    it("should return all policies for user", async () => {
      // Create multiple policies
      await service.createPolicy(
        {
          name: "Policy 1",
          pattern: "test1",
          type: "keyword",
          description: "",
        },
        testUserId,
      );
      await service.createPolicy(
        {
          name: "Policy 2",
          pattern: "test2",
          type: "regex",
          description: "",
        },
        testUserId,
      );
      await service.createPolicy(
        {
          name: "Policy 3",
          pattern: "test3",
          type: "keyword",
          description: "",
        },
        testUserId,
      );

      const response = await service.getAllPolicies(testUserId);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(3);
      expect(response.body[0].name).toBe("Policy 3"); // Most recent first
    });

    it("should return empty array for user with no policies", async () => {
      const response = await service.getAllPolicies(testUserId);

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it("should not return policies from other users", async () => {
      // Create policy for first user
      await service.createPolicy(
        {
          name: "User 1 Policy",
          pattern: "test",
          type: "keyword",
          description: "",
        },
        testUserId,
      );

      // Create another user
      const authRepo = new authRepository(testDbPath);
      const otherUser = generateTestUser();
      const passwordHash = await argon.hash(otherUser.password);
      const user2 = authRepo.registerUser({
        username: otherUser.username,
        passwordHash,
      });

      // Get policies for second user
      const response = await service.getAllPolicies(user2.id);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(0);
    });
  });

  describe("updatePolicy", () => {
    it("should successfully update policy name", async () => {
      const created = await service.createPolicy(
        {
          name: "Original Name",
          pattern: "test",
          type: "keyword",
          description: "",
        },
        testUserId,
      );

      const response = await service.updatePolicy(
        created.body.id,
        {
          name: "Updated Name",
          pattern: "",
          type: "",
          description: "",
        },
        testUserId,
      );

      expect(response.status).toBe(200);
      expect(response.body.name).toBe("Updated Name");
      expect(response.body.pattern).toBe("test"); // Unchanged
    });

    it("should successfully update pattern", async () => {
      const created = await service.createPolicy(
        {
          name: "Policy",
          pattern: "old",
          type: "keyword",
          description: "",
        },
        testUserId,
      );

      const response = await service.updatePolicy(
        created.body.id,
        { name: "", pattern: "new", type: "", description: "" },
        testUserId,
      );

      expect(response.status).toBe(200);
      expect(response.body.pattern).toBe("new");
    });

    it("should successfully update type", async () => {
      const created = await service.createPolicy(
        {
          name: "Policy",
          pattern: "\\d+",
          type: "keyword",
          description: "",
        },
        testUserId,
      );

      const response = await service.updatePolicy(
        created.body.id,
        { name: "", pattern: "", type: "regex", description: "" },
        testUserId,
      );

      expect(response.status).toBe(200);
      expect(response.body.type).toBe("regex");
    });

    it("should return 404 for non-existent policy", async () => {
      const response = await service.updatePolicy(
        99999,
        { name: "Test", pattern: "", type: "", description: "" },
        testUserId,
      );

      expect(response.status).toBe(404);
      expect(response.error).toBe("Policy not found");
    });

    it("should return 403 when updating another user's policy", async () => {
      const created = await service.createPolicy(
        {
          name: "Policy",
          pattern: "test",
          type: "keyword",
          description: "",
        },
        testUserId,
      );

      // Create another user
      const authRepo = new authRepository(testDbPath);
      const otherUser = generateTestUser();
      const passwordHash = await argon.hash(otherUser.password);
      const user2 = authRepo.registerUser({
        username: otherUser.username,
        passwordHash,
      });

      const response = await service.updatePolicy(
        created.body.id,
        { name: "Hacked", pattern: "", type: "", description: "" },
        user2.id,
      );

      expect(response.status).toBe(403);
      expect(response.error).toBe("Access denied");
    });

    it("should return 400 for invalid type", async () => {
      const created = await service.createPolicy(
        {
          name: "Policy",
          pattern: "test",
          type: "keyword",
          description: "",
        },
        testUserId,
      );

      const response = await service.updatePolicy(
        created.body.id,
        {
          name: "",
          pattern: "",
          type: "invalid" as any,
          description: "",
        },
        testUserId,
      );

      expect(response.status).toBe(400);
      expect(response.error).toBe(
        "Type must be either 'keyword' or 'regex'",
      );
    });

    it("should return 400 for invalid regex pattern", async () => {
      const created = await service.createPolicy(
        {
          name: "Policy",
          pattern: "test",
          type: "regex",
          description: "",
        },
        testUserId,
      );

      const response = await service.updatePolicy(
        created.body.id,
        { name: "", pattern: "[invalid(", type: "", description: "" },
        testUserId,
      );

      expect(response.status).toBe(400);
      expect(response.error).toBe("Invalid regex pattern");
    });
  });

  describe("deletePolicy", () => {
    it("should successfully delete policy", async () => {
      const created = await service.createPolicy(
        {
          name: "To Delete",
          pattern: "test",
          type: "keyword",
          description: "",
        },
        testUserId,
      );

      const response = await service.deletePolicy(
        created.body.id,
        testUserId,
      );

      expect(response.status).toBe(200);
      expect(response.body.message).toBe(
        "Policy deleted successfully",
      );

      // Verify policy is deleted
      const getResponse = await service.getPolicyById(
        created.body.id,
        testUserId,
      );
      expect(getResponse.status).toBe(404);
    });

    it("should return 404 for non-existent policy", async () => {
      const response = await service.deletePolicy(99999, testUserId);

      expect(response.status).toBe(404);
      expect(response.error).toBe("Policy not found");
    });

    it("should return 403 when deleting another user's policy", async () => {
      const created = await service.createPolicy(
        {
          name: "Policy",
          pattern: "test",
          type: "keyword",
          description: "",
        },
        testUserId,
      );

      // Create another user
      const authRepo = new authRepository(testDbPath);
      const otherUser = generateTestUser();
      const passwordHash = await argon.hash(otherUser.password);
      const user2 = authRepo.registerUser({
        username: otherUser.username,
        passwordHash,
      });

      const response = await service.deletePolicy(
        created.body.id,
        user2.id,
      );

      expect(response.status).toBe(403);
      expect(response.error).toBe("Access denied");
    });
  });

  describe("togglePolicyStatus", () => {
    it("should toggle policy from enabled to disabled", async () => {
      const created = await service.createPolicy(
        {
          name: "Policy",
          pattern: "test",
          type: "keyword",
          description: "Test",
        },
        testUserId,
      );

      expect(created.body.isEnabled).toBe(true);

      const response = await service.togglePolicyStatus(
        created.body.id,
        testUserId,
      );

      expect(response.status).toBe(200);
      expect(response.body.isEnabled).toBe(false);
      expect(response.body.id).toBe(created.body.id);
    });

    it("should toggle policy from disabled to enabled", async () => {
      const created = await service.createPolicy(
        {
          name: "Policy",
          pattern: "test",
          type: "keyword",
          description: "Test",
        },
        testUserId,
      );

      // Toggle to disabled
      await service.togglePolicyStatus(created.body.id, testUserId);

      // Toggle back to enabled
      const response = await service.togglePolicyStatus(
        created.body.id,
        testUserId,
      );

      expect(response.status).toBe(200);
      expect(response.body.isEnabled).toBe(true);
    });

    it("should return 404 for non-existent policy", async () => {
      const response = await service.togglePolicyStatus(
        99999,
        testUserId,
      );

      expect(response.status).toBe(404);
      expect(response.error).toBe("Policy not found");
    });

    it("should return 403 when toggling another user's policy", async () => {
      const created = await service.createPolicy(
        {
          name: "Policy",
          pattern: "test",
          type: "keyword",
          description: "Test",
        },
        testUserId,
      );

      // Create another user
      const authRepo = new authRepository(testDbPath);
      const otherUser = generateTestUser();
      const passwordHash = await argon.hash(otherUser.password);
      const user2 = authRepo.registerUser({
        username: otherUser.username,
        passwordHash,
      });

      const response = await service.togglePolicyStatus(
        created.body.id,
        user2.id,
      );

      expect(response.status).toBe(403);
      expect(response.error).toBe("Access denied");
    });

    it("should preserve other policy fields when toggling", async () => {
      const created = await service.createPolicy(
        {
          name: "Test Policy",
          pattern: "test123",
          type: "keyword",
          description: "Important policy",
        },
        testUserId,
      );

      const response = await service.togglePolicyStatus(
        created.body.id,
        testUserId,
      );

      expect(response.body.name).toBe("Test Policy");
      expect(response.body.pattern).toBe("test123");
      expect(response.body.type).toBe("keyword");
      expect(response.body.description).toBe("Important policy");
      expect(response.body.isEnabled).toBe(false);
    });
  });
});
