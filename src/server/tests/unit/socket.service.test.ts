import { createServer, Server as HttpServer } from "http";
import {
  SocketService,
  initSocketService,
  getSocketService,
} from "../../src/modules/socket/socket.service";

// Mock os module for predictable metrics
jest.mock("os", () => ({
  cpus: jest.fn(() => [
    { times: { user: 100, nice: 0, sys: 50, idle: 50, irq: 0 } },
    { times: { user: 80, nice: 0, sys: 40, idle: 80, irq: 0 } },
  ]),
  totalmem: jest.fn(() => 16 * 1024 * 1024 * 1024), // 16 GB
  freemem: jest.fn(() => 8 * 1024 * 1024 * 1024), // 8 GB free
}));

describe("SocketService", () => {
  let httpServer: HttpServer;
  let socketService: SocketService;

  beforeEach((done) => {
    httpServer = createServer();
    httpServer.listen(0, () => done()); // random port
    socketService = new SocketService(httpServer, false);
  });

  afterEach((done) => {
    socketService.destroy();
    httpServer.close(done);
  });

  // ── Construction ──────────────────────────────────────────────────────────

  describe("constructor", () => {
    it("should create a SocketService successfully", () => {
      expect(socketService).toBeDefined();
      expect(socketService.getIO()).toBeDefined();
    });

    it("should expose the Socket.IO server via getIO()", () => {
      const io = socketService.getIO();
      expect(io).toBeDefined();
      expect(typeof io.emit).toBe("function");
    });
  });

  // ── Emit methods ──────────────────────────────────────────────────────────

  describe("emitScanStart", () => {
    it("should emit scan:start event without throwing", () => {
      expect(() => {
        socketService.emitScanStart({
          scanId: 1,
          totalFiles: 100,
          scanType: "quick",
          targetPath: "/home/user/docs",
        });
      }).not.toThrow();
    });
  });

  describe("emitScanProgress", () => {
    it("should emit scan:progress event without throwing", () => {
      expect(() => {
        socketService.emitScanProgress({
          scanId: 1,
          status: "running",
          filesScanned: 50,
          filesWithThreats: 2,
          totalThreats: 5,
          totalFiles: 100,
          currentFile: "/home/user/docs/file.txt",
        });
      }).not.toThrow();
    });
  });

  describe("emitScanComplete", () => {
    it("should emit scan:complete event without throwing", () => {
      expect(() => {
        socketService.emitScanComplete({
          scanId: 1,
          status: "completed",
          filesScanned: 100,
          totalThreats: 3,
          totalFiles: 100,
        });
      }).not.toThrow();
    });
  });

  describe("emitAlert", () => {
    it("should emit alert:new event without throwing", () => {
      expect(() => {
        socketService.emitAlert({
          id: 1,
          severity: "High",
          time: "2025-01-01 12:00:00",
          type: "Policy Violation",
          description: "Sensitive data detected",
          source: "Content Scanner",
          status: "New",
          filePath: "/path/to/file.txt",
        });
      }).not.toThrow();
    });

    it("should support different severity levels", () => {
      for (const severity of ["High", "Medium", "Low"] as const) {
        expect(() => {
          socketService.emitAlert({
            id: Date.now(),
            severity,
            time: new Date().toISOString(),
            type: "Test Alert",
            description: `${severity} severity alert`,
            source: "test",
            status: "New",
          });
        }).not.toThrow();
      }
    });
  });

  describe("emitLiveScannerActivity", () => {
    it("should emit liveScanner:activity event without throwing", () => {
      expect(() => {
        socketService.emitLiveScannerActivity({
          scannerId: 1,
          filePath: "/home/user/docs/test.txt",
          changeType: "change",
          threatsFound: 2,
          timestamp: new Date().toISOString(),
        });
      }).not.toThrow();
    });
  });

  // ── Verify io.emit is actually called ──────────────────────────────────────

  describe("event emission verification", () => {
    it("should call io.emit with correct event name for scan:start", () => {
      const emitSpy = jest.spyOn(socketService.getIO(), "emit");

      socketService.emitScanStart({
        scanId: 1,
        totalFiles: 50,
        scanType: "full",
        targetPath: "/tmp",
      });

      expect(emitSpy).toHaveBeenCalledWith(
        "scan:start",
        expect.objectContaining({
          scanId: 1,
          totalFiles: 50,
        }),
      );
    });

    it("should call io.emit with correct event name for alert:new", () => {
      const emitSpy = jest.spyOn(socketService.getIO(), "emit");

      socketService.emitAlert({
        id: 42,
        severity: "High",
        time: "now",
        type: "Test",
        description: "desc",
        source: "src",
        status: "New",
      });

      expect(emitSpy).toHaveBeenCalledWith(
        "alert:new",
        expect.objectContaining({
          id: 42,
          severity: "High",
        }),
      );
    });

    it("should call io.emit with correct event name for scan:progress", () => {
      const emitSpy = jest.spyOn(socketService.getIO(), "emit");

      socketService.emitScanProgress({
        scanId: 5,
        status: "running",
        filesScanned: 10,
        filesWithThreats: 1,
        totalThreats: 3,
        totalFiles: 20,
        currentFile: "/tmp/file.txt",
      });

      expect(emitSpy).toHaveBeenCalledWith(
        "scan:progress",
        expect.objectContaining({
          scanId: 5,
          filesScanned: 10,
        }),
      );
    });

    it("should call io.emit with correct event name for scan:complete", () => {
      const emitSpy = jest.spyOn(socketService.getIO(), "emit");

      socketService.emitScanComplete({
        scanId: 3,
        status: "completed",
        filesScanned: 100,
        totalThreats: 0,
        totalFiles: 100,
      });

      expect(emitSpy).toHaveBeenCalledWith(
        "scan:complete",
        expect.objectContaining({
          scanId: 3,
          status: "completed",
        }),
      );
    });

    it("should call io.emit with correct event name for liveScanner:activity", () => {
      const emitSpy = jest.spyOn(socketService.getIO(), "emit");

      socketService.emitLiveScannerActivity({
        scannerId: 7,
        filePath: "/file.txt",
        changeType: "add",
        threatsFound: 1,
        timestamp: "2025-01-01",
      });

      expect(emitSpy).toHaveBeenCalledWith(
        "liveScanner:activity",
        expect.objectContaining({
          scannerId: 7,
          threatsFound: 1,
        }),
      );
    });
  });

  // ── destroy ────────────────────────────────────────────────────────────────

  describe("destroy", () => {
    it("should clean up resources without throwing", () => {
      // Create a fresh instance so we can destroy it independently
      const server2 = createServer();
      const svc2 = new SocketService(server2, true);

      expect(() => svc2.destroy()).not.toThrow();
      server2.close();
    });
  });

  // ── Module-level helpers ───────────────────────────────────────────────────

  describe("initSocketService / getSocketService", () => {
    it("should initialize and return the same instance", () => {
      const server3 = createServer();
      const svc = initSocketService(server3, false);
      expect(svc).toBeDefined();

      const got = getSocketService();
      expect(got).toBe(svc);

      svc.destroy();
      server3.close();
    });
  });
});
