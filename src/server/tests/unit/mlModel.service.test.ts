import {
  classifyText,
  classifyMatches,
  sensitivityToTier,
  ModelTier,
} from "../../src/modules/mlModel/mlModel.service";

// Mock global fetch
const originalFetch = global.fetch;

describe("mlModel Service", () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, "warn").mockImplementation();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    consoleSpy.mockRestore();
  });

  describe("sensitivityToTier", () => {
    it('should map "Low" to "base" tier', () => {
      expect(sensitivityToTier("Low")).toBe("base");
    });

    it('should map "Medium" to "small" tier', () => {
      expect(sensitivityToTier("Medium")).toBe("small");
    });

    it('should map "High" to "tiny" tier', () => {
      expect(sensitivityToTier("High")).toBe("tiny");
    });
  });

  describe("classifyText", () => {
    it("should return LEAK result for LEAK prediction", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          prediction: "🔴 LEAK",
          confidence: "95.5%",
          model_tier: "small",
          text_analyzed: "password=secret123",
        }),
      }) as jest.Mock;

      const result = await classifyText(
        "password=secret123",
        "small",
      );

      expect(result).toBeDefined();
      expect(result!.verdict).toBe("LEAK");
      expect(result!.confidence).toBe(95.5);
      expect(result!.modelTier).toBe("small");
      expect(result!.textAnalyzed).toBe("password=secret123");
    });

    it("should return SAFE result for SAFE prediction", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          prediction: "🟢 SAFE",
          confidence: "99.1%",
          model_tier: "base",
          text_analyzed: "Hello world",
        }),
      }) as jest.Mock;

      const result = await classifyText("Hello world", "base");

      expect(result).toBeDefined();
      expect(result!.verdict).toBe("SAFE");
      expect(result!.confidence).toBe(99.1);
    });

    it("should return null when API returns non-ok response", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
      }) as jest.Mock;

      const result = await classifyText("test", "small");

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("API returned 500"),
      );
    });

    it("should return null when fetch throws an error", async () => {
      global.fetch = jest
        .fn()
        .mockRejectedValue(new Error("Network error")) as jest.Mock;

      const result = await classifyText("test", "tiny");

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("API call failed: Network error"),
      );
    });

    it("should handle missing confidence field", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          prediction: "🔴 LEAK",
          // no confidence field
        }),
      }) as jest.Mock;

      const result = await classifyText("test", "small");

      expect(result).toBeDefined();
      expect(result!.confidence).toBe(0);
    });

    it("should handle missing prediction field", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          // no prediction field
          confidence: "50%",
        }),
      }) as jest.Mock;

      const result = await classifyText("test", "small");

      expect(result).toBeDefined();
      expect(result!.verdict).toBe("SAFE"); // "" doesn't contain "LEAK"
    });

    it("should use provided tier as fallback for model_tier", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          prediction: "🟢 SAFE",
          confidence: "90%",
          // no model_tier field
        }),
      }) as jest.Mock;

      const result = await classifyText("test", "tiny");

      expect(result).toBeDefined();
      expect(result!.modelTier).toBe("tiny");
    });

    it("should send correct request body and headers", async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          prediction: "🟢 SAFE",
          confidence: "90%",
        }),
      }) as jest.Mock;
      global.fetch = mockFetch;

      await classifyText("test input", "base");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            "X-API-Key": expect.any(String),
          }),
          body: JSON.stringify({ text: "test input", tier: "base" }),
        }),
      );
    });
  });

  describe("classifyMatches", () => {
    it("should return only LEAK matches", async () => {
      let callCount = 0;
      global.fetch = jest.fn().mockImplementation(async () => {
        callCount++;
        // Capture count at fetch-time, not at json()-time
        // (Promise.all means both fetches run before either json() is called)
        const currentCount = callCount;
        return {
          ok: true,
          json: async () => ({
            prediction: currentCount === 1 ? "🔴 LEAK" : "🟢 SAFE",
            confidence: currentCount === 1 ? "95%" : "80%",
          }),
        };
      }) as jest.Mock;

      const results = await classifyMatches(
        ["password=123", "hello world"],
        "small",
      );

      expect(results).toHaveLength(1);
      expect(results[0].line).toBe("password=123");
      expect(results[0].confidence).toBe(95);
    });

    it("should return empty array when all matches are SAFE", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          prediction: "🟢 SAFE",
          confidence: "99%",
        }),
      }) as jest.Mock;

      const results = await classifyMatches(
        ["normal text", "another text"],
        "base",
      );

      expect(results).toHaveLength(0);
    });

    it("should return empty array when API calls fail", async () => {
      global.fetch = jest
        .fn()
        .mockRejectedValue(new Error("Offline")) as jest.Mock;

      const results = await classifyMatches(
        ["test1", "test2"],
        "tiny",
      );

      expect(results).toHaveLength(0);
    });

    it("should handle empty input array", async () => {
      const results = await classifyMatches([], "small");
      expect(results).toHaveLength(0);
    });

    it("should process all matches in parallel", async () => {
      const times: number[] = [];
      global.fetch = jest.fn().mockImplementation(async () => {
        times.push(Date.now());
        return {
          ok: true,
          json: async () => ({
            prediction: "🔴 LEAK",
            confidence: "90%",
          }),
        };
      }) as jest.Mock;

      const results = await classifyMatches(["a", "b", "c"], "small");

      expect(results).toHaveLength(3);
      // All calls should be made (parallel via Promise.all)
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });
  });
});
