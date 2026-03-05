import request from "supertest";
import { createDataGuardApp, Config } from "../../src/app";
import {
  createTestDbPath,
  cleanupTestDb,
  generateTestUser,
} from "../helpers";
import { SessionManager } from "../../src/modules/auth/auth.session";
import { Application } from "express";
import fs from "fs";
import path from "path";
import os from "os";

describe("FileActions API Integration Tests", () => {
  let app: Application;
  let testDbPath: string;
  let sessionId: string;
  let tmpDir: string;

  async function registerAndLogin(): Promise<string> {
    const userData = generateTestUser();
    const res = await request(app)
      .post("/api/auth/register")
      .send(userData)
      .expect(201);
    return res.body.sessionId;
  }

  beforeEach(async () => {
    testDbPath = createTestDbPath();
    const config: Config = {
      IS_PRODUCTION: false,
      DB_PATH: testDbPath,
    };
    app = createDataGuardApp(config);
    SessionManager.clearAllSessions();
    sessionId = await registerAndLogin();

    tmpDir = path.join(
      os.tmpdir(),
      `fileactions-integ-${Date.now()}`,
    );
    fs.mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    cleanupTestDb(testDbPath);
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  function createTempFile(name: string, content: string): string {
    const fp = path.join(tmpDir, name);
    fs.writeFileSync(fp, content, "utf-8");
    return fp;
  }

  // ── POST /api/files/encrypt ────────────────────────────────────────────────

  describe("POST /api/files/encrypt", () => {
    it("should encrypt a file successfully", async () => {
      const filePath = createTempFile(
        "encrypt-me.txt",
        "sensitive data",
      );

      const res = await request(app)
        .post("/api/files/encrypt")
        .set("x-session-id", sessionId)
        .send({ filePath })
        .expect(200);

      expect(res.body.newPath).toBeDefined();
      expect(res.body.newPath).toContain(".enc");
      // Original should be gone
      expect(fs.existsSync(filePath)).toBe(false);
      // Encrypted should exist
      expect(fs.existsSync(res.body.newPath)).toBe(true);
    });

    it("should return 400 without filePath", async () => {
      await request(app)
        .post("/api/files/encrypt")
        .set("x-session-id", sessionId)
        .send({})
        .expect(400);
    });

    it("should return 401 without session", async () => {
      await request(app)
        .post("/api/files/encrypt")
        .send({ filePath: "/tmp/test.txt" })
        .expect(401);
    });
  });

  // ── POST /api/files/decrypt ────────────────────────────────────────────────

  describe("POST /api/files/decrypt", () => {
    it("should decrypt a previously encrypted file", async () => {
      const filePath = createTempFile(
        "roundtrip.txt",
        "roundtrip content",
      );

      // First encrypt
      const encRes = await request(app)
        .post("/api/files/encrypt")
        .set("x-session-id", sessionId)
        .send({ filePath })
        .expect(200);

      // Then decrypt
      const decRes = await request(app)
        .post("/api/files/decrypt")
        .set("x-session-id", sessionId)
        .send({ filePath: encRes.body.newPath })
        .expect(200);

      expect(decRes.body.newPath).toBeDefined();
      expect(fs.existsSync(decRes.body.newPath)).toBe(true);
      expect(
        fs.readFileSync(decRes.body.newPath, "utf-8"),
      ).toBe("roundtrip content");
    });

    it("should return 400 without filePath", async () => {
      await request(app)
        .post("/api/files/decrypt")
        .set("x-session-id", sessionId)
        .send({})
        .expect(400);
    });
  });

  // ── POST /api/files/quarantine ─────────────────────────────────────────────

  describe("POST /api/files/quarantine", () => {
    it("should quarantine a file", async () => {
      const filePath = createTempFile(
        "quarantine-me.txt",
        "malicious",
      );

      const res = await request(app)
        .post("/api/files/quarantine")
        .set("x-session-id", sessionId)
        .send({ filePath })
        .expect(200);

      expect(res.body.newPath).toBeDefined();
      // Original should be gone
      expect(fs.existsSync(filePath)).toBe(false);
    });

    it("should return 400 without filePath", async () => {
      await request(app)
        .post("/api/files/quarantine")
        .set("x-session-id", sessionId)
        .send({})
        .expect(400);
    });

    it("should return 401 without session", async () => {
      await request(app)
        .post("/api/files/quarantine")
        .send({ filePath: "/tmp/test.txt" })
        .expect(401);
    });
  });

  // ── POST /api/files/delete ─────────────────────────────────────────────────

  describe("POST /api/files/delete", () => {
    it("should delete a file", async () => {
      const filePath = createTempFile("delete-me.txt", "delete this");

      await request(app)
        .post("/api/files/delete")
        .set("x-session-id", sessionId)
        .send({ filePath })
        .expect(200);

      expect(fs.existsSync(filePath)).toBe(false);
    });

    it("should return 400 without filePath", async () => {
      await request(app)
        .post("/api/files/delete")
        .set("x-session-id", sessionId)
        .send({})
        .expect(400);
    });
  });

  // ── GET /api/files/encrypted ───────────────────────────────────────────────

  describe("GET /api/files/encrypted", () => {
    it("should return empty list initially", async () => {
      const res = await request(app)
        .get("/api/files/encrypted")
        .set("x-session-id", sessionId)
        .expect(200);

      expect(res.body.files).toEqual([]);
    });

    it("should list encrypted files after encrypt", async () => {
      const filePath = createTempFile("list-test.txt", "data");

      await request(app)
        .post("/api/files/encrypt")
        .set("x-session-id", sessionId)
        .send({ filePath })
        .expect(200);

      const res = await request(app)
        .get("/api/files/encrypted")
        .set("x-session-id", sessionId)
        .expect(200);

      expect(res.body.files.length).toBeGreaterThanOrEqual(1);
    });

    it("should return 401 without session", async () => {
      await request(app).get("/api/files/encrypted").expect(401);
    });
  });

  // ── Cross-user isolation ───────────────────────────────────────────────────

  describe("cross-user isolation", () => {
    it("should not list another user's encrypted files", async () => {
      // User 1 encrypts a file
      const filePath = createTempFile("user1-file.txt", "user1 data");

      await request(app)
        .post("/api/files/encrypt")
        .set("x-session-id", sessionId)
        .send({ filePath })
        .expect(200);

      // Register user 2
      const user2 = generateTestUser();
      const reg2 = await request(app)
        .post("/api/auth/register")
        .send(user2)
        .expect(201);

      // User 2 should see no encrypted files
      const res = await request(app)
        .get("/api/files/encrypted")
        .set("x-session-id", reg2.body.sessionId)
        .expect(200);

      expect(res.body.files).toEqual([]);
    });
  });
});
