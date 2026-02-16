import { liveScannerRepository } from "../../src/modules/liveScanner/liveScanner.repository";
import { createTestDbPath, cleanupTestDb } from "../helpers";

describe("liveScannerRepository", () => {
  let repository: liveScannerRepository;
  let testDbPath: string;
  let userId: number;

  beforeEach(() => {
    testDbPath = createTestDbPath();
    repository = new liveScannerRepository(testDbPath);

    // Create a test user
    const db = repository["db"];
    const user = db.dbService.user.createUser({
      username: "testuser",
      passwordHash: "hashedpassword",
    });
    userId = user.id;
  });

  afterEach(() => {
    cleanupTestDb(testDbPath);
  });

  describe("createLiveScanner", () => {
    it("should create a new live scanner in database", () => {
      const liveScannerData = {
        userId,
        name: "Test Scanner",
        targetPath: "/test/path",
        watchMode: "file-changes" as const,
        isRecursive: true,
        status: "active" as const,
      };

      const liveScanner =
        repository.createLiveScanner(liveScannerData);

      expect(liveScanner).toBeDefined();
      expect(liveScanner.id).toBeDefined();
      expect(liveScanner.name).toBe("Test Scanner");
      expect(liveScanner.targetPath).toBe("/test/path");
      expect(liveScanner.watchMode).toBe("file-changes");
      expect(liveScanner.isRecursive).toBe(true);
      expect(liveScanner.status).toBe("active");
      expect(liveScanner.filesMonitored).toBe(0);
      expect(liveScanner.filesScanned).toBe(0);
      expect(liveScanner.threatsDetected).toBe(0);
    });

    it("should auto-increment live scanner IDs", () => {
      const scanner1 = repository.createLiveScanner({
        userId,
        name: "Scanner 1",
        targetPath: "/path1",
        watchMode: "file-changes",
        isRecursive: true,
        status: "active",
      });

      const scanner2 = repository.createLiveScanner({
        userId,
        name: "Scanner 2",
        targetPath: "/path2",
        watchMode: "both",
        isRecursive: false,
        status: "active",
      });

      expect(scanner2.id).toBeGreaterThan(scanner1.id);
    });

    it("should create scanner with different watch modes", () => {
      const scanner1 = repository.createLiveScanner({
        userId,
        name: "File Scanner",
        targetPath: "/path",
        watchMode: "file-changes",
        isRecursive: true,
        status: "active",
      });

      const scanner2 = repository.createLiveScanner({
        userId,
        name: "Dir Scanner",
        targetPath: "/path",
        watchMode: "directory-changes",
        isRecursive: false,
        status: "paused",
      });

      const scanner3 = repository.createLiveScanner({
        userId,
        name: "Both Scanner",
        targetPath: "/path",
        watchMode: "both",
        isRecursive: true,
        status: "stopped",
      });

      expect(scanner1.watchMode).toBe("file-changes");
      expect(scanner2.watchMode).toBe("directory-changes");
      expect(scanner3.watchMode).toBe("both");
    });
  });

  describe("getLiveScannerById", () => {
    it("should retrieve live scanner by id", () => {
      const created = repository.createLiveScanner({
        userId,
        name: "Test Scanner",
        targetPath: "/test/path",
        watchMode: "file-changes",
        isRecursive: true,
        status: "active",
      });

      const retrieved = repository.getLiveScannerById(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe(created.id);
      expect(retrieved!.name).toBe("Test Scanner");
      expect(retrieved!.targetPath).toBe("/test/path");
    });

    it("should return null for non-existent live scanner", () => {
      const retrieved = repository.getLiveScannerById(999);
      expect(retrieved).toBeNull();
    });
  });

  describe("getAllLiveScannersByUserId", () => {
    it("should retrieve all live scanners for a user", () => {
      repository.createLiveScanner({
        userId,
        name: "Scanner 1",
        targetPath: "/path1",
        watchMode: "file-changes",
        isRecursive: true,
        status: "active",
      });

      repository.createLiveScanner({
        userId,
        name: "Scanner 2",
        targetPath: "/path2",
        watchMode: "both",
        isRecursive: false,
        status: "paused",
      });

      const scanners = repository.getAllLiveScannersByUserId(userId);

      expect(scanners).toHaveLength(2);
      expect(scanners[0].name).toBe("Scanner 2"); // Most recent first
      expect(scanners[1].name).toBe("Scanner 1");
    });

    it("should return empty array for user with no live scanners", () => {
      const scanners = repository.getAllLiveScannersByUserId(userId);
      expect(scanners).toHaveLength(0);
    });

    it("should only return scanners for the specified user", () => {
      // Create another user
      const db = repository["db"];
      const user2 = db.dbService.user.createUser({
        username: "testuser2",
        passwordHash: "hashedpassword2",
      });

      repository.createLiveScanner({
        userId,
        name: "User 1 Scanner",
        targetPath: "/path1",
        watchMode: "file-changes",
        isRecursive: true,
        status: "active",
      });

      repository.createLiveScanner({
        userId: user2.id,
        name: "User 2 Scanner",
        targetPath: "/path2",
        watchMode: "both",
        isRecursive: false,
        status: "active",
      });

      const user1Scanners =
        repository.getAllLiveScannersByUserId(userId);
      const user2Scanners = repository.getAllLiveScannersByUserId(
        user2.id,
      );

      expect(user1Scanners).toHaveLength(1);
      expect(user2Scanners).toHaveLength(1);
      expect(user1Scanners[0].name).toBe("User 1 Scanner");
      expect(user2Scanners[0].name).toBe("User 2 Scanner");
    });
  });

  describe("getActiveLiveScannersByUserId", () => {
    it("should only return active live scanners", () => {
      repository.createLiveScanner({
        userId,
        name: "Active Scanner",
        targetPath: "/path1",
        watchMode: "file-changes",
        isRecursive: true,
        status: "active",
      });

      repository.createLiveScanner({
        userId,
        name: "Paused Scanner",
        targetPath: "/path2",
        watchMode: "both",
        isRecursive: false,
        status: "paused",
      });

      repository.createLiveScanner({
        userId,
        name: "Stopped Scanner",
        targetPath: "/path3",
        watchMode: "directory-changes",
        isRecursive: true,
        status: "stopped",
      });

      const activeScanners =
        repository.getActiveLiveScannersByUserId(userId);

      expect(activeScanners).toHaveLength(1);
      expect(activeScanners[0].name).toBe("Active Scanner");
      expect(activeScanners[0].status).toBe("active");
    });
  });

  describe("updateLiveScanner", () => {
    it("should update live scanner name", () => {
      const scanner = repository.createLiveScanner({
        userId,
        name: "Old Name",
        targetPath: "/path",
        watchMode: "file-changes",
        isRecursive: true,
        status: "active",
      });

      repository.updateLiveScanner(scanner.id, userId, {
        name: "New Name",
      });

      const updated = repository.getLiveScannerById(scanner.id);
      expect(updated!.name).toBe("New Name");
    });

    it("should update live scanner status", () => {
      const scanner = repository.createLiveScanner({
        userId,
        name: "Test Scanner",
        targetPath: "/path",
        watchMode: "file-changes",
        isRecursive: true,
        status: "active",
      });

      repository.updateLiveScanner(scanner.id, userId, {
        status: "paused",
      });

      const updated = repository.getLiveScannerById(scanner.id);
      expect(updated!.status).toBe("paused");
    });

    it("should update statistics", () => {
      const scanner = repository.createLiveScanner({
        userId,
        name: "Test Scanner",
        targetPath: "/path",
        watchMode: "file-changes",
        isRecursive: true,
        status: "active",
      });

      repository.updateLiveScanner(scanner.id, userId, {
        filesMonitored: 100,
        filesScanned: 50,
        threatsDetected: 5,
        lastActivityAt: "2026-02-16T10:00:00.000Z",
      });

      const updated = repository.getLiveScannerById(scanner.id);
      expect(updated!.filesMonitored).toBe(100);
      expect(updated!.filesScanned).toBe(50);
      expect(updated!.threatsDetected).toBe(5);
      expect(updated!.lastActivityAt).toBe(
        "2026-02-16T10:00:00.000Z",
      );
    });

    it("should throw error for non-existent scanner", () => {
      expect(() => {
        repository.updateLiveScanner(999, userId, {
          name: "New Name",
        });
      }).toThrow("Live scanner not found");
    });

    it("should throw error for unauthorized update", () => {
      // Create another user
      const db = repository["db"];
      const user2 = db.dbService.user.createUser({
        username: "testuser2",
        passwordHash: "hashedpassword2",
      });

      const scanner = repository.createLiveScanner({
        userId,
        name: "Test Scanner",
        targetPath: "/path",
        watchMode: "file-changes",
        isRecursive: true,
        status: "active",
      });

      expect(() => {
        repository.updateLiveScanner(scanner.id, user2.id, {
          name: "Hacked Name",
        });
      }).toThrow("Unauthorized");
    });
  });

  describe("deleteLiveScanner", () => {
    it("should delete live scanner", () => {
      const scanner = repository.createLiveScanner({
        userId,
        name: "Test Scanner",
        targetPath: "/path",
        watchMode: "file-changes",
        isRecursive: true,
        status: "active",
      });

      repository.deleteLiveScanner(scanner.id, userId);

      const retrieved = repository.getLiveScannerById(scanner.id);
      expect(retrieved).toBeNull();
    });

    it("should throw error for non-existent scanner", () => {
      expect(() => {
        repository.deleteLiveScanner(999, userId);
      }).toThrow("Live scanner not found");
    });

    it("should throw error for unauthorized deletion", () => {
      // Create another user
      const db = repository["db"];
      const user2 = db.dbService.user.createUser({
        username: "testuser2",
        passwordHash: "hashedpassword2",
      });

      const scanner = repository.createLiveScanner({
        userId,
        name: "Test Scanner",
        targetPath: "/path",
        watchMode: "file-changes",
        isRecursive: true,
        status: "active",
      });

      expect(() => {
        repository.deleteLiveScanner(scanner.id, user2.id);
      }).toThrow("Unauthorized");
    });
  });
});
