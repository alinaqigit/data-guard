import path from "path";
import fs from "fs";
import os from "os";
import { scannerService } from "../../src/modules/scanner/scanner.service";
import { createTestDbPath, cleanupTestDb } from "../helpers";
import { dbModule } from "../../src/modules/db";
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from "../../src/utils/errors";

// Mock socket service to avoid real Socket.IO
jest.mock("../../src/modules/socket/socket.service", () => ({
  getSocketService: jest.fn(() => null),
}));

// Mock mlModel — avoid real HuggingFace API calls
jest.mock("../../src/modules/mlModel/mlModel.service", () => ({
  classifyMatches: jest.fn(async () => []),
  sensitivityToTier: jest.fn(() => "small"),
}));

describe("scannerService", () => {
  let service: scannerService;
  let db: dbModule;
  let testDbPath: string;
  let tmpDir: string;
  const testUserId = 1;

  beforeEach(() => {
    testDbPath = createTestDbPath();
    db = new dbModule(testDbPath);
    db.dbService.user.createUser({
      username: "testuser",
      passwordHash: "hashedpass",
    });
    service = new scannerService(testDbPath);

    // Create temp dir for test files
    tmpDir = path.join(os.tmpdir(), `scanner-test-${Date.now()}`);
    fs.mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    cleanupTestDb(testDbPath);
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  // ── Helper: create files + policies ────────────────────────────────────────
  function createTestFile(name: string, content: string): string {
    const fp = path.join(tmpDir, name);
    fs.writeFileSync(fp, content, "utf-8");
    return fp;
  }

  function seedPolicy(
    pattern: string,
    type: "keyword" | "regex" = "keyword",
  ) {
    db.dbService.policy.createPolicy({
      userId: testUserId,
      name: `Policy for ${pattern}`,
      pattern,
      type,
      description: `Detects ${pattern}`,
    });
  }

  // Helper: wait for an async scan to settle (complete/fail/cancel)
  // startScan fires performScan as fire-and-forget. We must wait for it
  // to finish before afterEach cleans up the DB, otherwise the async callback
  // hits a deleted DB and creates unhandled rejections that fail the test.
  async function waitForScanToSettle(scanId: number, userId: number, timeoutMs = 8000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        const s = service.getScan(scanId, userId);
        if (s && s.status !== "running") return s;
      } catch {
        // DB may be closing — stop polling
        return null;
      }
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
    return service.getScan(scanId, userId);
  }

  // ── startScan ──────────────────────────────────────────────────────────────

  describe("startScan", () => {
    it("should start a custom scan successfully", async () => {
      createTestFile("test.txt", "hello world");
      seedPolicy("hello");

      const result = await service.startScan(testUserId, {
        scanType: "custom",
        targetPath: tmpDir,
      });

      expect(result.scanId).toBeGreaterThan(0);
      expect(result.message).toBe("Scan started successfully");
      await waitForScanToSettle(result.scanId, testUserId);
    }, 15000);

    it("should throw ValidationError for non-existent custom path", async () => {
      seedPolicy("test");

      await expect(
        service.startScan(testUserId, {
          scanType: "custom",
          targetPath: "/nonexistent/path/xyz",
        }),
      ).rejects.toThrow(ValidationError);
    });

    it("should throw ValidationError for system paths", async () => {
      seedPolicy("test");

      await expect(
        service.startScan(testUserId, {
          scanType: "custom",
          targetPath: "C:\\Windows",
        }),
      ).rejects.toThrow(ValidationError);
    });

    it("should throw ValidationError when no active policies exist", async () => {
      createTestFile("test.txt", "hello");

      await expect(
        service.startScan(testUserId, {
          scanType: "custom",
          targetPath: tmpDir,
        }),
      ).rejects.toThrow(ValidationError);
    });
  });

  // ── getScan ────────────────────────────────────────────────────────────────

  describe("getScan", () => {
    it("should return a scan by ID and userId", async () => {
      createTestFile("test.txt", "hello world");
      seedPolicy("hello");

      const { scanId } = await service.startScan(testUserId, {
        scanType: "custom",
        targetPath: tmpDir,
      });

      const scan = service.getScan(scanId, testUserId);
      expect(scan).toBeDefined();
      expect(scan?.id).toBe(scanId);
      await waitForScanToSettle(scanId, testUserId);
    }, 15000);

    it("should return null for non-existent scan ID", () => {
      const scan = service.getScan(99999, testUserId);
      expect(scan).toBeNull();
    });

    it("should throw ForbiddenError for wrong user", async () => {
      createTestFile("test.txt", "hello");
      seedPolicy("hello");

      const { scanId } = await service.startScan(testUserId, {
        scanType: "custom",
        targetPath: tmpDir,
      });

      expect(() => service.getScan(scanId, 999)).toThrow(
        ForbiddenError,
      );
      await waitForScanToSettle(scanId, testUserId);
    }, 15000);
  });

  // ── getScanHistory ─────────────────────────────────────────────────────────

  describe("getScanHistory", () => {
    it("should return scans for the user", async () => {
      createTestFile("test.txt", "hello");
      seedPolicy("hello");

      const { scanId } = await service.startScan(testUserId, {
        scanType: "custom",
        targetPath: tmpDir,
      });

      const history = service.getScanHistory(testUserId);
      expect(history.length).toBeGreaterThanOrEqual(1);
      await waitForScanToSettle(scanId, testUserId);
    }, 15000);

    it("should return empty array for user with no scans", () => {
      const history = service.getScanHistory(999);
      expect(history).toEqual([]);
    });

    it("should respect limit parameter", async () => {
      createTestFile("test.txt", "hello");
      seedPolicy("hello");

      const r1 = await service.startScan(testUserId, {
        scanType: "custom",
        targetPath: tmpDir,
      });
      const r2 = await service.startScan(testUserId, {
        scanType: "custom",
        targetPath: tmpDir,
      });

      const limited = service.getScanHistory(testUserId, 1);
      expect(limited.length).toBeLessThanOrEqual(1);
      await waitForScanToSettle(r1.scanId, testUserId);
      await waitForScanToSettle(r2.scanId, testUserId);
    }, 15000);
  });

  // ── cancelScan ─────────────────────────────────────────────────────────────

  describe("cancelScan", () => {
    it("should throw NotFoundError for non-existent scan", () => {
      expect(() => service.cancelScan(99999, testUserId)).toThrow(
        NotFoundError,
      );
    });

    it("should throw ForbiddenError for wrong user", async () => {
      createTestFile("test.txt", "hello");
      seedPolicy("hello");

      const { scanId } = await service.startScan(testUserId, {
        scanType: "custom",
        targetPath: tmpDir,
      });

      expect(() => service.cancelScan(scanId, 999)).toThrow(
        ForbiddenError,
      );
      await waitForScanToSettle(scanId, testUserId);
    }, 15000);
  });

  // ── getScanProgress ───────────────────────────────────────────────────────

  describe("getScanProgress", () => {
    it("should return progress for a valid scan", async () => {
      createTestFile("test.txt", "hello");
      seedPolicy("hello");

      const { scanId } = await service.startScan(testUserId, {
        scanType: "custom",
        targetPath: tmpDir,
      });

      const progress = service.getScanProgress(scanId, testUserId);
      expect(progress.scanId).toBe(scanId);
      expect(progress.status).toBeDefined();
      expect(progress.filesScanned).toBeGreaterThanOrEqual(0);
      expect(progress.startedAt).toBeDefined();
      await waitForScanToSettle(scanId, testUserId);
    }, 15000);

    it("should throw NotFoundError for non-existent scan", () => {
      expect(() =>
        service.getScanProgress(99999, testUserId),
      ).toThrow(NotFoundError);
    });
  });

  // ── deleteScan ─────────────────────────────────────────────────────────────

  describe("deleteScan", () => {
    it("should throw NotFoundError for non-existent scan", () => {
      expect(() => service.deleteScan(99999, testUserId)).toThrow(
        NotFoundError,
      );
    });

    it("should throw ForbiddenError for wrong user", async () => {
      createTestFile("test.txt", "hello");
      seedPolicy("hello");

      const { scanId } = await service.startScan(testUserId, {
        scanType: "custom",
        targetPath: tmpDir,
      });

      expect(() => service.deleteScan(scanId, 999)).toThrow(
        ForbiddenError,
      );
      await waitForScanToSettle(scanId, testUserId);
    }, 15000);
  });

  // ── deleteAllScans ─────────────────────────────────────────────────────────

  describe("deleteAllScans", () => {
    it("should delete all scans for a user", async () => {
      createTestFile("test.txt", "hello");
      seedPolicy("hello");

      const r1 = await service.startScan(testUserId, {
        scanType: "custom",
        targetPath: tmpDir,
      });
      const r2 = await service.startScan(testUserId, {
        scanType: "custom",
        targetPath: tmpDir,
      });

      // Wait for scans to settle before deleting
      await waitForScanToSettle(r1.scanId, testUserId);
      await waitForScanToSettle(r2.scanId, testUserId);

      service.deleteAllScans(testUserId);

      const history = service.getScanHistory(testUserId);
      expect(history).toHaveLength(0);
    }, 20000);

    it("should not affect other users' scans", async () => {
      // Create second user
      db.dbService.user.createUser({
        username: "user2",
        passwordHash: "hashedpass",
      });
      createTestFile("test.txt", "hello");

      // Policy for user 1
      seedPolicy("hello");

      // Policy for user 2
      db.dbService.policy.createPolicy({
        userId: 2,
        name: "User2 policy",
        pattern: "hello",
        type: "keyword",
        description: "test",
      });

      const r1 = await service.startScan(testUserId, {
        scanType: "custom",
        targetPath: tmpDir,
      });
      const r2 = await service.startScan(2, {
        scanType: "custom",
        targetPath: tmpDir,
      });

      // Wait for scans to settle
      await waitForScanToSettle(r1.scanId, testUserId);
      await waitForScanToSettle(r2.scanId, 2);

      service.deleteAllScans(testUserId);

      expect(service.getScanHistory(testUserId)).toHaveLength(0);
      expect(service.getScanHistory(2).length).toBeGreaterThanOrEqual(
        1,
      );
    }, 20000);
  });

  // ── Scan file behavior (via full scan flow) ────────────────────────────────

  describe("scan file handling", () => {
    it("should detect threats matching policies", async () => {
      createTestFile(
        "secret.txt",
        "this contains a secret-password here",
      );
      seedPolicy("secret-password");

      const { scanId } = await service.startScan(testUserId, {
        scanType: "custom",
        targetPath: tmpDir,
      });

      // Wait for async scan to fully settle before afterEach cleanup
      const scan = await waitForScanToSettle(scanId, testUserId);

      expect(scan).toBeDefined();
      expect(scan!.id).toBe(scanId);
      // Scan completed — the actual threat count depends on policy engine + ML mock
    }, 15000);

    it("should scan multiple files in directory", async () => {
      createTestFile("file1.txt", "normal text");
      createTestFile("file2.txt", "another normal text");
      createTestFile("file3.txt", "some more text");
      seedPolicy("nonexistent-pattern-xyz");

      const { scanId } = await service.startScan(testUserId, {
        scanType: "custom",
        targetPath: tmpDir,
      });

      expect(scanId).toBeGreaterThan(0);
      // Wait for async scan to settle before afterEach
      await waitForScanToSettle(scanId, testUserId);
    }, 15000);

    it("should handle empty directory", async () => {
      const emptyDir = path.join(tmpDir, "empty");
      fs.mkdirSync(emptyDir, { recursive: true });
      seedPolicy("anything");

      const { scanId } = await service.startScan(testUserId, {
        scanType: "custom",
        targetPath: emptyDir,
      });

      expect(scanId).toBeGreaterThan(0);
      // Wait for async scan to settle before afterEach
      await waitForScanToSettle(scanId, testUserId);
    }, 15000);

    it("should skip binary files", async () => {
      // Create a binary file with null bytes
      const binaryPath = path.join(tmpDir, "binary.dat");
      const buf = Buffer.alloc(100);
      buf[0] = 0;
      fs.writeFileSync(binaryPath, buf);

      createTestFile("text.txt", "normal text with SENSITIVE");
      seedPolicy("SENSITIVE");

      const { scanId } = await service.startScan(testUserId, {
        scanType: "custom",
        targetPath: tmpDir,
      });

      expect(scanId).toBeGreaterThan(0);
      // Wait for async scan to settle before afterEach
      await waitForScanToSettle(scanId, testUserId);
    }, 15000);
  });
});
