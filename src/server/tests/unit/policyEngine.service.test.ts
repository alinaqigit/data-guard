import { PolicyEngineService } from "../../src/modules/policyEngine/policyEngine.service";
import { PolicyEntity } from "../../src/entities";

describe("PolicyEngineService", () => {
  let service: PolicyEngineService;

  beforeEach(() => {
    service = new PolicyEngineService();
  });

  describe("Keyword Policy Evaluation", () => {
    it("should find simple keyword matches", () => {
      const policy: PolicyEntity = {
        id: 1,
        userId: 1,
        name: "API Key",
        pattern: "api_key",
        type: "keyword",
        isEnabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const content = "const api_key = '12345';";

      const result = service.evaluatePolicy(content, policy);

      expect(result.hasMatches).toBe(true);
      expect(result.matchCount).toBe(1);
      expect(result.matches[0].matchedText).toBe("api_key");
      expect(result.matches[0].lineNumber).toBe(1);
      expect(result.matches[0].columnNumber).toBe(7);
    });

    it("should find multiple keyword matches", () => {
      const policy: PolicyEntity = {
        id: 1,
        userId: 1,
        name: "Password",
        pattern: "password",
        type: "keyword",
        isEnabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const content = `
const password = 'secret123';
const old_password = 'old_secret';
console.log('password is set');
`;

      const result = service.evaluatePolicy(content, policy);

      expect(result.hasMatches).toBe(true);
      expect(result.matchCount).toBe(3);
    });

    it("should handle case-sensitive matching by default", () => {
      const policy: PolicyEntity = {
        id: 1,
        userId: 1,
        name: "Secret",
        pattern: "SECRET",
        type: "keyword",
        isEnabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const content = "secret SECRET Secret";

      const result = service.evaluatePolicy(content, policy);

      expect(result.matchCount).toBe(1);
      expect(result.matches[0].matchedText).toBe("SECRET");
    });

    it("should handle case-insensitive matching when enabled", () => {
      const policy: PolicyEntity = {
        id: 1,
        userId: 1,
        name: "Secret",
        pattern: "SECRET",
        type: "keyword",
        isEnabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const content = "secret SECRET Secret";

      const result = service.evaluatePolicy(content, policy, {
        caseInsensitive: true,
      });

      expect(result.matchCount).toBe(3);
    });

    it("should respect maxMatchesPerPolicy limit", () => {
      const policy: PolicyEntity = {
        id: 1,
        userId: 1,
        name: "Test",
        pattern: "test",
        type: "keyword",
        isEnabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const content = "test test test test test";

      const result = service.evaluatePolicy(content, policy, {
        maxMatchesPerPolicy: 3,
      });

      expect(result.matchCount).toBe(3);
    });

    it("should return empty matches for no matches", () => {
      const policy: PolicyEntity = {
        id: 1,
        userId: 1,
        name: "Test",
        pattern: "notfound",
        type: "keyword",
        isEnabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const content = "some content here";

      const result = service.evaluatePolicy(content, policy);

      expect(result.hasMatches).toBe(false);
      expect(result.matchCount).toBe(0);
      expect(result.matches).toEqual([]);
    });
  });

  describe("Regex Policy Evaluation", () => {
    it("should find regex matches", () => {
      const policy: PolicyEntity = {
        id: 1,
        userId: 1,
        name: "Email",
        pattern: "[a-z]+@[a-z]+\\.[a-z]+",
        type: "regex",
        isEnabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const content = "Contact: user@example.com";

      const result = service.evaluatePolicy(content, policy);

      expect(result.hasMatches).toBe(true);
      expect(result.matchCount).toBe(1);
      expect(result.matches[0].matchedText).toBe("user@example.com");
    });

    it("should find multiple regex matches", () => {
      const policy: PolicyEntity = {
        id: 1,
        userId: 1,
        name: "Credit Card",
        pattern: "\\d{4}-\\d{4}-\\d{4}-\\d{4}",
        type: "regex",
        isEnabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const content = `
Card 1: 1234-5678-9012-3456
Card 2: 4111-1111-1111-1111
`;

      const result = service.evaluatePolicy(content, policy);

      expect(result.matchCount).toBe(2);
      expect(result.matches[0].matchedText).toBe(
        "1234-5678-9012-3456",
      );
      expect(result.matches[1].matchedText).toBe(
        "4111-1111-1111-1111",
      );
    });

    it("should handle invalid regex gracefully", () => {
      const policy: PolicyEntity = {
        id: 1,
        userId: 1,
        name: "Bad Regex",
        pattern: "[invalid(regex",
        type: "regex",
        isEnabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const content = "some content";

      const result = service.evaluatePolicy(content, policy);

      expect(result.hasMatches).toBe(false);
      expect(result.error).toBe("Invalid regex pattern");
    });

    it("should support case-insensitive regex", () => {
      const policy: PolicyEntity = {
        id: 1,
        userId: 1,
        name: "Word",
        pattern: "SECRET",
        type: "regex",
        isEnabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const content = "secret SECRET Secret";

      const result = service.evaluatePolicy(content, policy, {
        caseInsensitive: true,
      });

      expect(result.matchCount).toBe(3);
    });

    it("should handle complex regex patterns", () => {
      const policy: PolicyEntity = {
        id: 1,
        userId: 1,
        name: "SSN",
        pattern: "\\d{3}-\\d{2}-\\d{4}",
        type: "regex",
        isEnabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const content = "SSN: 123-45-6789, Invalid: 12-345-6789";

      const result = service.evaluatePolicy(content, policy);

      expect(result.matchCount).toBe(1);
      expect(result.matches[0].matchedText).toBe("123-45-6789");
    });
  });

  describe("Context Extraction", () => {
    it("should extract context lines before and after match", () => {
      const policy: PolicyEntity = {
        id: 1,
        userId: 1,
        name: "Test",
        pattern: "password",
        type: "keyword",
        isEnabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const content = `line 1
line 2
const password = 'secret';
line 4
line 5`;

      const result = service.evaluatePolicy(content, policy, {
        contextLinesBefore: 2,
        contextLinesAfter: 2,
      });

      expect(result.matches[0].contextBefore).toEqual([
        "line 1",
        "line 2",
      ]);
      expect(result.matches[0].contextAfter).toEqual([
        "line 4",
        "line 5",
      ]);
    });

    it("should handle context at beginning of file", () => {
      const policy: PolicyEntity = {
        id: 1,
        userId: 1,
        name: "Test",
        pattern: "secret",
        type: "keyword",
        isEnabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const content = "secret on first line\nline 2\nline 3";

      const result = service.evaluatePolicy(content, policy, {
        contextLinesBefore: 5,
        contextLinesAfter: 2,
      });

      expect(result.matches[0].contextBefore).toEqual([]);
      expect(result.matches[0].contextAfter).toEqual([
        "line 2",
        "line 3",
      ]);
    });

    it("should handle context at end of file", () => {
      const policy: PolicyEntity = {
        id: 1,
        userId: 1,
        name: "Test",
        pattern: "secret",
        type: "keyword",
        isEnabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const content = "line 1\nline 2\nsecret on last line";

      const result = service.evaluatePolicy(content, policy, {
        contextLinesBefore: 2,
        contextLinesAfter: 5,
      });

      expect(result.matches[0].contextBefore).toEqual([
        "line 1",
        "line 2",
      ]);
      expect(result.matches[0].contextAfter).toEqual([]);
    });
  });

  describe("Multiple Policies Evaluation", () => {
    it("should evaluate multiple policies", () => {
      const policies: PolicyEntity[] = [
        {
          id: 1,
          userId: 1,
          name: "Password",
          pattern: "password",
          type: "keyword",
          isEnabled: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 2,
          userId: 1,
          name: "API Key",
          pattern: "api_key",
          type: "keyword",
          isEnabled: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      const content =
        "const password = 'test'; const api_key = '123';";

      const result = service.evaluate(content, policies);

      expect(result.policiesEvaluated).toBe(2);
      expect(result.policiesMatched).toBe(2);
      expect(result.totalMatches).toBe(2);
    });

    it("should skip disabled policies by default", () => {
      const policies: PolicyEntity[] = [
        {
          id: 1,
          userId: 1,
          name: "Enabled",
          pattern: "test",
          type: "keyword",
          isEnabled: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 2,
          userId: 1,
          name: "Disabled",
          pattern: "test",
          type: "keyword",
          isEnabled: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      const content = "test content";

      const result = service.evaluate(content, policies);

      expect(result.policiesEvaluated).toBe(1);
    });

    it("should include disabled policies when requested", () => {
      const policies: PolicyEntity[] = [
        {
          id: 1,
          userId: 1,
          name: "Enabled",
          pattern: "test",
          type: "keyword",
          isEnabled: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 2,
          userId: 1,
          name: "Disabled",
          pattern: "test",
          type: "keyword",
          isEnabled: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      const content = "test content";

      const result = service.evaluate(content, policies, {
        includeDisabled: true,
      });

      expect(result.policiesEvaluated).toBe(2);
      expect(result.policiesMatched).toBe(2);
    });

    it("should track errors for failed policies", () => {
      const policies: PolicyEntity[] = [
        {
          id: 1,
          userId: 1,
          name: "Good",
          pattern: "test",
          type: "keyword",
          isEnabled: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 2,
          userId: 1,
          name: "Bad Regex",
          pattern: "[invalid(",
          type: "regex",
          isEnabled: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      const content = "test content";

      const result = service.evaluate(content, policies);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].policyId).toBe(2);
      expect(result.errors[0].error).toBe("Invalid regex pattern");
    });
  });

  describe("hasAnyMatch", () => {
    it("should return true if any policy matches", () => {
      const policies: PolicyEntity[] = [
        {
          id: 1,
          userId: 1,
          name: "Test1",
          pattern: "notfound",
          type: "keyword",
          isEnabled: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 2,
          userId: 1,
          name: "Test2",
          pattern: "found",
          type: "keyword",
          isEnabled: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      const content = "this will be found";

      const hasMatch = service.hasAnyMatch(content, policies);

      expect(hasMatch).toBe(true);
    });

    it("should return false if no policies match", () => {
      const policies: PolicyEntity[] = [
        {
          id: 1,
          userId: 1,
          name: "Test1",
          pattern: "notfound",
          type: "keyword",
          isEnabled: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      const content = "nothing matches here";

      const hasMatch = service.hasAnyMatch(content, policies);

      expect(hasMatch).toBe(false);
    });
  });

  describe("getSummary", () => {
    it("should calculate summary statistics", () => {
      const policies: PolicyEntity[] = [
        {
          id: 1,
          userId: 1,
          name: "Test1",
          pattern: "test",
          type: "keyword",
          isEnabled: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 2,
          userId: 1,
          name: "Test2",
          pattern: "example",
          type: "keyword",
          isEnabled: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      const content = "test test example";

      const result = service.evaluate(content, policies);
      const summary = service.getSummary(result);

      expect(summary.policiesEvaluated).toBe(2);
      expect(summary.policiesMatched).toBe(2);
      expect(summary.totalMatches).toBe(3);
      expect(summary.avgMatchesPerPolicy).toBe(1.5);
    });
  });

  describe("Line and Column Calculation", () => {
    it("should calculate correct line and column numbers", () => {
      const policy: PolicyEntity = {
        id: 1,
        userId: 1,
        name: "Test",
        pattern: "target",
        type: "keyword",
        isEnabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const content = `line 1
line 2 with target here
line 3`;

      const result = service.evaluatePolicy(content, policy);

      expect(result.matches[0].lineNumber).toBe(2);
      expect(result.matches[0].columnNumber).toBe(13);
    });

    it("should handle first line correctly", () => {
      const policy: PolicyEntity = {
        id: 1,
        userId: 1,
        name: "Test",
        pattern: "start",
        type: "keyword",
        isEnabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const content = "start of file";

      const result = service.evaluatePolicy(content, policy);

      expect(result.matches[0].lineNumber).toBe(1);
      expect(result.matches[0].columnNumber).toBe(1);
    });
  });
});
