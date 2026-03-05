import path from "path";
import fs from "fs";
import os from "os";
import { liveScannerService } from "../../src/modules/liveScanner/liveScanner.service";
import { createTestDbPath, cleanupTestDb, wait } from "../helpers";
import { dbModule } from "../../src/modules/db";
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from "../../src/utils/errors";

// Mock socket service
jest.mock("../../src/modules/socket/socket.service", () => ({
  getSocketService: jest.fn(() => null),
}));

describe("liveScannerService", () => {
  let service: liveScannerService;
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
    service = new liveScannerService(testDbPath);

    // Create temp dir for target path
    tmpDir = path.join(os.tmpdir(), `livescanner-test-${Date.now()}`);
    fs.mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(async () => {
    await service.cleanup();
    cleanupTestDb(testDbPath);
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  // ── Helper: seed policies ──────────────────────────────────────────────────
  function seedPolicy(
    pattern: string,
    type: "keyword" | "regex" = "keyword",
  ) {
    db.dbService.policy.createPolicy({
      userId: testUserId,
      name: `Policy ${pattern}`,
      pattern,
      type,
      description: `Detects ${pattern}`,
    });
  }

  // ── startLiveScanner (legacy specific path) ────────────────────────────────

  describe("startLiveScanner", () => {
    it("should start a live scanner on a valid directory", async () => {
      seedPolicy("secret");

      const result = await service.startLiveScanner(testUserId, {
        name: "Test Watcher",
        targetPath: tmpDir,
        watchMode: "both",
        isRecursive: false,
      });

      expect(result.scannerId).toBeGreaterThan(0);
      expect(result.message).toContain("started");
    });

    it("should throw ValidationError for non-existent path", async () => {
      seedPolicy("test");

      await expect(
        service.startLiveScanner(testUserId, {
          name: "Bad",
          targetPath: "/nonexistent/xyz",
          watchMode: "both",
          isRecursive: false,
        }),
      ).rejects.toThrow(ValidationError);
    });

    it("should throw ValidationError for file path (not directory)", async () => {
      seedPolicy("test");
      const filePath = path.join(tmpDir, "file.txt");
      fs.writeFileSync(filePath, "content");

      await expect(
        service.startLiveScanner(testUserId, {
          name: "Bad",
          targetPath: filePath,
          watchMode: "both",
          isRecursive: false,
        }),
      ).rejects.toThrow(ValidationError);
    });

    it("should throw ValidationError for system paths", async () => {
      seedPolicy("test");

      await expect(
        service.startLiveScanner(testUserId, {
          name: "Bad",
          targetPath: "C:\\Windows",
          watchMode: "both",
          isRecursive: false,
        }),
      ).rejects.toThrow(ValidationError);
    });

    it("should throw ValidationError when no active policies", async () => {
      await expect(
        service.startLiveScanner(testUserId, {
          name: "No policies",
          targetPath: tmpDir,
          watchMode: "both",
          isRecursive: false,
        }),
      ).rejects.toThrow(ValidationError);
    });
  });

  // ── stopLiveScanner ────────────────────────────────────────────────────────

  describe("stopLiveScanner", () => {
    it("should stop an active scanner", async () => {
      seedPolicy("test");
      const { scannerId } = await service.startLiveScanner(
        testUserId,
        {
          name: "Stopper",
          targetPath: tmpDir,
          watchMode: "both",
          isRecursive: false,
        },
      );

      const result = await service.stopLiveScanner(
        testUserId,
        scannerId,
      );
      expect(result.message).toContain("stopped");
    });

    it("should throw NotFoundError for non-existent scanner", async () => {
      await expect(
        service.stopLiveScanner(testUserId, 99999),
      ).rejects.toThrow(NotFoundError);
    });

    it("should throw ForbiddenError for wrong user", async () => {
      seedPolicy("test");
      const { scannerId } = await service.startLiveScanner(
        testUserId,
        {
          name: "Auth Test",
          targetPath: tmpDir,
          watchMode: "both",
          isRecursive: false,
        },
      );

      await expect(
        service.stopLiveScanner(999, scannerId),
      ).rejects.toThrow(ForbiddenError);
    });

    it("should throw ValidationError for already stopped scanner", async () => {
      seedPolicy("test");
      const { scannerId } = await service.startLiveScanner(
        testUserId,
        {
          name: "Double Stop",
          targetPath: tmpDir,
          watchMode: "both",
          isRecursive: false,
        },
      );

      await service.stopLiveScanner(testUserId, scannerId);

      await expect(
        service.stopLiveScanner(testUserId, scannerId),
      ).rejects.toThrow(ValidationError);
    });
  });

  // ── pauseLiveScanner ──────────────────────────────────────────────────────

  describe("pauseLiveScanner", () => {
    it("should pause an active scanner", async () => {
      seedPolicy("test");
      const { scannerId } = await service.startLiveScanner(
        testUserId,
        {
          name: "Pauser",
          targetPath: tmpDir,
          watchMode: "both",
          isRecursive: false,
        },
      );

      const result = await service.pauseLiveScanner(
        testUserId,
        scannerId,
      );
      expect(result.message).toContain("paused");
    });

    it("should throw NotFoundError for non-existent scanner", async () => {
      await expect(
        service.pauseLiveScanner(testUserId, 99999),
      ).rejects.toThrow(NotFoundError);
    });

    it("should throw ValidationError for non-active scanner", async () => {
      seedPolicy("test");
      const { scannerId } = await service.startLiveScanner(
        testUserId,
        {
          name: "Pause Test",
          targetPath: tmpDir,
          watchMode: "both",
          isRecursive: false,
        },
      );

      await service.stopLiveScanner(testUserId, scannerId);

      await expect(
        service.pauseLiveScanner(testUserId, scannerId),
      ).rejects.toThrow(ValidationError);
    });
  });

  // ── resumeLiveScanner ─────────────────────────────────────────────────────

  describe("resumeLiveScanner", () => {
    it("should resume a paused scanner", async () => {
      seedPolicy("test");
      const { scannerId } = await service.startLiveScanner(
        testUserId,
        {
          name: "Resumer",
          targetPath: tmpDir,
          watchMode: "both",
          isRecursive: false,
        },
      );

      await service.pauseLiveScanner(testUserId, scannerId);
      const result = await service.resumeLiveScanner(
        testUserId,
        scannerId,
      );
      expect(result.message).toContain("resumed");
    });

    it("should throw ValidationError for non-paused scanner", async () => {
      seedPolicy("test");
      const { scannerId } = await service.startLiveScanner(
        testUserId,
        {
          name: "Resume Test",
          targetPath: tmpDir,
          watchMode: "both",
          isRecursive: false,
        },
      );

      // Active, not paused
      await expect(
        service.resumeLiveScanner(testUserId, scannerId),
      ).rejects.toThrow(ValidationError);
    });
  });

  // ── getAllLiveScanners ──────────────────────────────────────────────────────

  describe("getAllLiveScanners", () => {
    it("should return scanners for user", async () => {
      seedPolicy("test");
      await service.startLiveScanner(testUserId, {
        name: "Scanner 1",
        targetPath: tmpDir,
        watchMode: "both",
        isRecursive: false,
      });

      const scanners = service.getAllLiveScanners(testUserId);
      expect(scanners.length).toBeGreaterThanOrEqual(1);
    });

    it("should return empty for user with no scanners", () => {
      const scanners = service.getAllLiveScanners(999);
      expect(scanners).toEqual([]);
    });
  });

  // ── getLiveScannerById ────────────────────────────────────────────────────

  describe("getLiveScannerById", () => {
    it("should return scanner by ID", async () => {
      seedPolicy("test");
      const { scannerId } = await service.startLiveScanner(
        testUserId,
        {
          name: "Get Test",
          targetPath: tmpDir,
          watchMode: "both",
          isRecursive: false,
        },
      );

      const scanner = service.getLiveScannerById(
        testUserId,
        scannerId,
      );
      expect(scanner.id).toBe(scannerId);
      expect(scanner.name).toBe("Get Test");
    });

    it("should throw NotFoundError for non-existent scanner", () => {
      expect(() =>
        service.getLiveScannerById(testUserId, 99999),
      ).toThrow(NotFoundError);
    });

    it("should throw ForbiddenError for wrong user", async () => {
      seedPolicy("test");
      const { scannerId } = await service.startLiveScanner(
        testUserId,
        {
          name: "Auth Test",
          targetPath: tmpDir,
          watchMode: "both",
          isRecursive: false,
        },
      );

      expect(() =>
        service.getLiveScannerById(999, scannerId),
      ).toThrow(ForbiddenError);
    });
  });

  // ── getLiveScannerStats ───────────────────────────────────────────────────

  describe("getLiveScannerStats", () => {
    it("should return stats for an active scanner", async () => {
      seedPolicy("test");
      const { scannerId } = await service.startLiveScanner(
        testUserId,
        {
          name: "Stats Test",
          targetPath: tmpDir,
          watchMode: "both",
          isRecursive: false,
        },
      );

      const stats = service.getLiveScannerStats(
        testUserId,
        scannerId,
      );
      expect(stats.scanner).toBeDefined();
      expect(stats.recentActivity).toEqual([]);
      expect(stats.uptime).toBeGreaterThanOrEqual(0);
    });
  });

  // ── deleteLiveScanner ──────────────────────────────────────────────────────

  describe("deleteLiveScanner", () => {
    it("should delete a stopped scanner", async () => {
      seedPolicy("test");
      const { scannerId } = await service.startLiveScanner(
        testUserId,
        {
          name: "Deleter",
          targetPath: tmpDir,
          watchMode: "both",
          isRecursive: false,
        },
      );

      await service.stopLiveScanner(testUserId, scannerId);
      const result = await service.deleteLiveScanner(
        testUserId,
        scannerId,
      );
      expect(result.message).toContain("deleted");

      expect(() =>
        service.getLiveScannerById(testUserId, scannerId),
      ).toThrow(NotFoundError);
    });

    it("should delete an active scanner (stops it first)", async () => {
      seedPolicy("test");
      const { scannerId } = await service.startLiveScanner(
        testUserId,
        {
          name: "Active Deleter",
          targetPath: tmpDir,
          watchMode: "both",
          isRecursive: false,
        },
      );

      const result = await service.deleteLiveScanner(
        testUserId,
        scannerId,
      );
      expect(result.message).toContain("deleted");
    });

    it("should throw NotFoundError for non-existent scanner", async () => {
      await expect(
        service.deleteLiveScanner(testUserId, 99999),
      ).rejects.toThrow(NotFoundError);
    });

    it("should throw ForbiddenError for wrong user", async () => {
      seedPolicy("test");
      const { scannerId } = await service.startLiveScanner(
        testUserId,
        {
          name: "Auth Delete",
          targetPath: tmpDir,
          watchMode: "both",
          isRecursive: false,
        },
      );

      await expect(
        service.deleteLiveScanner(999, scannerId),
      ).rejects.toThrow(ForbiddenError);
    });
  });

  // ── updateAutoResponse ──────────────────────────────────────────────────────

  describe("updateAutoResponse", () => {
    it("should not throw when no active watchers exist", () => {
      expect(() =>
        service.updateAutoResponse(testUserId, true),
      ).not.toThrow();
    });

    it("should update auto-response for active watcher", async () => {
      seedPolicy("test");
      await service.startLiveScanner(testUserId, {
        name: "Auto Test",
        targetPath: tmpDir,
        watchMode: "both",
        isRecursive: false,
      });

      // Should not throw
      expect(() =>
        service.updateAutoResponse(testUserId, true),
      ).not.toThrow();
      expect(() =>
        service.updateAutoResponse(testUserId, false),
      ).not.toThrow();
    });
  });

  // ── cleanup ────────────────────────────────────────────────────────────────

  describe("cleanup", () => {
    it("should close all active watchers", async () => {
      seedPolicy("test");
      await service.startLiveScanner(testUserId, {
        name: "Cleanup 1",
        targetPath: tmpDir,
        watchMode: "both",
        isRecursive: false,
      });

      // Should not throw
      await expect(service.cleanup()).resolves.not.toThrow();
    });

    it("should work when no watchers exist", async () => {
      await expect(service.cleanup()).resolves.not.toThrow();
    });
  });

  // ── getMonitoringStatus ───────────────────────────────────────────────────

  describe("getMonitoringStatus", () => {
    it("should return inactive when no monitoring", () => {
      const status = service.getMonitoringStatus(testUserId);
      expect(status.isActive).toBe(false);
      expect(status.monitoredPaths).toEqual([]);
    });
  });
});
