import request from "supertest";
import { createDataGuardApp, Config } from "../../src/app";
import { createTestDbPath, cleanupTestDb } from "../helpers";

describe("Application Integration Tests", () => {
  let testDbPath: string;
  let app: any;

  beforeEach(() => {
    testDbPath = createTestDbPath();
    const config: Config = {
      IS_PRODUCTION: false,
      DB_PATH: testDbPath,
    };
    app = createDataGuardApp(config);
  });

  afterEach(() => {
    cleanupTestDb(testDbPath);
  });

  describe("Application Setup", () => {
    it("should create app successfully", () => {
      expect(app).toBeDefined();
    });

    it("should respond to health check", async () => {
      const response = await request(app)
        .get("/api/health")
        .expect(200);

      expect(response.body.status).toBe("OK");
    });

    it("should have CORS enabled", async () => {
      const response = await request(app)
        .options("/api/auth/login")
        .expect(204);

      expect(
        response.headers["access-control-allow-origin"],
      ).toBeDefined();
    });

    it("should parse JSON bodies", async () => {
      const response = await request(app)
        .post("/api/auth/register")
        .send({ username: "test", password: "test123" })
        .set("Content-Type", "application/json");

      // Should not fail with body parsing error
      expect(response.status).not.toBe(500);
    });

    it("should return 404 for unknown routes", async () => {
      await request(app).get("/api/unknown").expect(404);
    });
  });

  describe("CORS Configuration", () => {
    it("should allow configured methods", async () => {
      const response = await request(app).options("/api/auth/login");

      const allowedMethods =
        response.headers["access-control-allow-methods"];
      expect(allowedMethods).toContain("POST");
      expect(allowedMethods).toContain("GET");
    });

    it("should allow required headers", async () => {
      const response = await request(app).options("/api/auth/login");

      const allowedHeaders =
        response.headers["access-control-allow-headers"];
      expect(allowedHeaders).toContain("Content-Type");
      expect(allowedHeaders).toContain("Authorization");
    });
  });
});
