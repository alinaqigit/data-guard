import { liveScannerRepository } from "./liveScanner.repository";
import { policyRepository } from "../policy/policy.repository";
import { PolicyEngineService } from "../policyEngine/policyEngine.service";
import {
  LiveScannerOptions,
  DEFAULT_LIVE_SCANNER_OPTIONS,
  StartLiveScannerRequest,
  LiveScanFileResult,
  LiveScannerActivity,
  LiveScannerStats,
  UpdateLiveScannerRequest,
  FileChangeType,
} from "./liveScanner.types";
import { LiveScannerEntity, PolicyEntity } from "../../entities";
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from "../../utils/errors";
import fs from "fs";
import path from "path";
import * as chokidar from "chokidar";

interface ActiveWatcher {
  scannerId: number;
  userId: number;
  watcher: chokidar.FSWatcher;
  options: Required<LiveScannerOptions>;
  policies: PolicyEntity[];
  activityLog: LiveScannerActivity[];
  debounceTimers: Map<string, NodeJS.Timeout>;
}

export class liveScannerService {
  private liveScannerRepo: liveScannerRepository;
  private policyRepo: policyRepository;
  private policyEngine: PolicyEngineService;
  private activeWatchers: Map<number, ActiveWatcher> = new Map();

  constructor(DB_PATH: string) {
    this.liveScannerRepo = new liveScannerRepository(DB_PATH);
    this.policyRepo = new policyRepository(DB_PATH);
    this.policyEngine = new PolicyEngineService();
  }

  /**
   * Start a new live scanner
   */
  public async startLiveScanner(
    userId: number,
    request: StartLiveScannerRequest,
  ): Promise<{ scannerId: number; message: string }> {
    // Validate target path exists
    if (!fs.existsSync(request.targetPath)) {
      throw new ValidationError(
        `Target path does not exist: ${request.targetPath}`,
      );
    }

    // Validate target path is a directory
    const stats = fs.statSync(request.targetPath);
    if (!stats.isDirectory()) {
      throw new ValidationError(
        "Target path must be a directory for live scanning",
      );
    }

    // Get active policies for the user
    const policies = this.policyRepo
      .getAllPoliciesByUserId(userId)
      .filter((p) => p.isEnabled);

    if (policies.length === 0) {
      throw new ValidationError(
        "No active policies found. Please create and enable at least one policy before starting live scanner.",
      );
    }

    // Create live scanner record
    const liveScanner = this.liveScannerRepo.createLiveScanner({
      userId,
      name: request.name,
      targetPath: request.targetPath,
      watchMode: request.watchMode,
      isRecursive: request.isRecursive,
      status: "active",
    });

    // Start watching in background
    try {
      await this.startWatching(liveScanner, userId, policies, {
        ...DEFAULT_LIVE_SCANNER_OPTIONS,
        ...request.options,
      });
    } catch (error) {
      // If watching fails, update status to stopped
      this.liveScannerRepo.updateLiveScanner(liveScanner.id, userId, {
        status: "stopped",
        stoppedAt: new Date().toISOString(),
      });
      throw error;
    }

    return {
      scannerId: liveScanner.id,
      message: "Live scanner started successfully",
    };
  }

  /**
   * Stop a live scanner
   */
  public async stopLiveScanner(
    userId: number,
    scannerId: number,
  ): Promise<{ message: string }> {
    const scanner =
      this.liveScannerRepo.getLiveScannerById(scannerId);

    if (!scanner) {
      throw new NotFoundError("Live scanner not found");
    }

    if (scanner.userId !== userId) {
      throw new ForbiddenError(
        "You don't have permission to stop this live scanner",
      );
    }

    if (scanner.status === "stopped") {
      throw new ValidationError("Live scanner is already stopped");
    }

    // Stop watching
    await this.stopWatching(scannerId);

    // Update status
    this.liveScannerRepo.updateLiveScanner(scannerId, userId, {
      status: "stopped",
      stoppedAt: new Date().toISOString(),
    });

    return { message: "Live scanner stopped successfully" };
  }

  /**
   * Pause a live scanner
   */
  public async pauseLiveScanner(
    userId: number,
    scannerId: number,
  ): Promise<{ message: string }> {
    const scanner =
      this.liveScannerRepo.getLiveScannerById(scannerId);

    if (!scanner) {
      throw new NotFoundError("Live scanner not found");
    }

    if (scanner.userId !== userId) {
      throw new ForbiddenError(
        "You don't have permission to pause this live scanner",
      );
    }

    if (scanner.status !== "active") {
      throw new ValidationError(
        "Only active live scanners can be paused",
      );
    }

    // Update status without stopping watcher (it will ignore events)
    this.liveScannerRepo.updateLiveScanner(scannerId, userId, {
      status: "paused",
    });

    return { message: "Live scanner paused successfully" };
  }

  /**
   * Resume a paused live scanner
   */
  public async resumeLiveScanner(
    userId: number,
    scannerId: number,
  ): Promise<{ message: string }> {
    const scanner =
      this.liveScannerRepo.getLiveScannerById(scannerId);

    if (!scanner) {
      throw new NotFoundError("Live scanner not found");
    }

    if (scanner.userId !== userId) {
      throw new ForbiddenError(
        "You don't have permission to resume this live scanner",
      );
    }

    if (scanner.status !== "paused") {
      throw new ValidationError(
        "Only paused live scanners can be resumed",
      );
    }

    // Update status
    this.liveScannerRepo.updateLiveScanner(scannerId, userId, {
      status: "active",
    });

    return { message: "Live scanner resumed successfully" };
  }

  /**
   * Get all live scanners for a user
   */
  public getAllLiveScanners(userId: number): LiveScannerEntity[] {
    return this.liveScannerRepo.getAllLiveScannersByUserId(userId);
  }

  /**
   * Get live scanner by ID
   */
  public getLiveScannerById(
    userId: number,
    scannerId: number,
  ): LiveScannerEntity {
    const scanner =
      this.liveScannerRepo.getLiveScannerById(scannerId);

    if (!scanner) {
      throw new NotFoundError("Live scanner not found");
    }

    if (scanner.userId !== userId) {
      throw new ForbiddenError(
        "You don't have permission to view this live scanner",
      );
    }

    return scanner;
  }

  /**
   * Get live scanner statistics
   */
  public getLiveScannerStats(
    userId: number,
    scannerId: number,
  ): LiveScannerStats {
    const scanner = this.getLiveScannerById(userId, scannerId);
    const watcher = this.activeWatchers.get(scannerId);

    const startTime = new Date(scanner.startedAt).getTime();
    const endTime = scanner.stoppedAt
      ? new Date(scanner.stoppedAt).getTime()
      : Date.now();
    const uptime = endTime - startTime;

    return {
      scanner,
      recentActivity: watcher?.activityLog.slice(-50) || [],
      uptime,
      averageResponseTime: undefined, // Could be calculated if we track response times
    };
  }

  /**
   * Delete a live scanner
   */
  public async deleteLiveScanner(
    userId: number,
    scannerId: number,
  ): Promise<{ message: string }> {
    const scanner =
      this.liveScannerRepo.getLiveScannerById(scannerId);

    if (!scanner) {
      throw new NotFoundError("Live scanner not found");
    }

    if (scanner.userId !== userId) {
      throw new ForbiddenError(
        "You don't have permission to delete this live scanner",
      );
    }

    // Stop watching if active
    if (scanner.status === "active" || scanner.status === "paused") {
      await this.stopWatching(scannerId);
    }

    // Delete from database
    this.liveScannerRepo.deleteLiveScanner(scannerId, userId);

    return { message: "Live scanner deleted successfully" };
  }

  /**
   * Start watching a directory
   */
  private async startWatching(
    scanner: LiveScannerEntity,
    userId: number,
    policies: PolicyEntity[],
    options: Required<LiveScannerOptions>,
  ): Promise<void> {
    const watcher = chokidar.watch(scanner.targetPath, {
      persistent: true,
      ignoreInitial: true,
      followSymlinks: options.followSymlinks,
      depth: scanner.isRecursive ? undefined : 0,
      ignored: [
        ...options.excludePaths.map((p) =>
          path.join(scanner.targetPath, p),
        ),
        ...(options.includeExtensions.length > 0
          ? [
              (filePath: string) => {
                const ext = path.extname(filePath);
                return !options.includeExtensions.includes(ext);
              },
            ]
          : []),
      ],
      awaitWriteFinish: {
        stabilityThreshold: options.debounceDelay,
        pollInterval: 100,
      },
    });

    const activeWatcher: ActiveWatcher = {
      scannerId: scanner.id,
      userId,
      watcher,
      options,
      policies,
      activityLog: [],
      debounceTimers: new Map(),
    };

    // Set up event handlers based on watch mode
    if (
      scanner.watchMode === "file-changes" ||
      scanner.watchMode === "both"
    ) {
      watcher.on("add", (filePath) =>
        this.handleFileChange(activeWatcher, filePath, "add"),
      );
      watcher.on("change", (filePath) =>
        this.handleFileChange(activeWatcher, filePath, "change"),
      );
      watcher.on("unlink", (filePath) =>
        this.handleFileChange(activeWatcher, filePath, "unlink"),
      );
    }

    if (
      scanner.watchMode === "directory-changes" ||
      scanner.watchMode === "both"
    ) {
      watcher.on("addDir", (dirPath) => {
        // Log directory addition
        this.logActivity(activeWatcher, dirPath, "add", 0);
      });
      watcher.on("unlinkDir", (dirPath) => {
        // Log directory removal
        this.logActivity(activeWatcher, dirPath, "unlink", 0);
      });
    }

    watcher.on("error", (error) => {
      console.error(`Error in live scanner ${scanner.id}:`, error);
    });

    this.activeWatchers.set(scanner.id, activeWatcher);

    return new Promise((resolve) => {
      watcher.on("ready", () => {
        resolve();
      });
    });
  }

  /**
   * Stop watching a directory
   */
  private async stopWatching(scannerId: number): Promise<void> {
    const activeWatcher = this.activeWatchers.get(scannerId);

    if (activeWatcher) {
      // Clear all debounce timers
      activeWatcher.debounceTimers.forEach((timer) =>
        clearTimeout(timer),
      );
      activeWatcher.debounceTimers.clear();

      // Close watcher
      await activeWatcher.watcher.close();

      // Remove from active watchers
      this.activeWatchers.delete(scannerId);
    }
  }

  /**
   * Handle file change event
   */
  private async handleFileChange(
    activeWatcher: ActiveWatcher,
    filePath: string,
    changeType: FileChangeType,
  ): Promise<void> {
    const { scannerId, userId, options } = activeWatcher;

    // Check if scanner is still active
    const scanner =
      this.liveScannerRepo.getLiveScannerById(scannerId);
    if (!scanner || scanner.status !== "active") {
      return;
    }

    // Skip if file is too large or doesn't exist anymore
    if (changeType !== "unlink") {
      try {
        const stats = fs.statSync(filePath);
        if (stats.size > options.maxFileSize) {
          return;
        }
      } catch (error) {
        // File might have been deleted
        return;
      }
    }

    // Don't scan deleted files, just log them
    if (changeType === "unlink") {
      this.logActivity(activeWatcher, filePath, changeType, 0);
      this.updateScannerFileCount(scannerId, userId);
      return;
    }

    // Scan the file
    try {
      const fileContent = fs.readFileSync(filePath, "utf-8");
      const result = this.policyEngine.evaluate(
        fileContent,
        activeWatcher.policies,
        { maxMatchesPerPolicy: options.maxMatchesPerFile },
      );

      const threatsFound = result.totalMatches;

      // Log activity
      this.logActivity(
        activeWatcher,
        filePath,
        changeType,
        threatsFound,
      );

      // Update scanner statistics
      this.updateScannerStats(scannerId, userId, threatsFound);
    } catch (error) {
      // If file can't be read (binary, permissions, etc), just skip it
      console.error(
        `Error scanning file ${filePath} in scanner ${scannerId}:`,
        error,
      );
    }
  }

  /**
   * Log activity
   */
  private logActivity(
    activeWatcher: ActiveWatcher,
    filePath: string,
    changeType: FileChangeType,
    threatsFound: number,
  ): void {
    const activity: LiveScannerActivity = {
      scannerId: activeWatcher.scannerId,
      filePath,
      changeType,
      timestamp: new Date().toISOString(),
      threatsFound,
    };

    // Keep only last 100 activities in memory
    activeWatcher.activityLog.push(activity);
    if (activeWatcher.activityLog.length > 100) {
      activeWatcher.activityLog.shift();
    }
  }

  /**
   * Update scanner file count
   */
  private updateScannerFileCount(
    scannerId: number,
    userId: number,
  ): void {
    const scanner =
      this.liveScannerRepo.getLiveScannerById(scannerId);
    if (scanner) {
      this.liveScannerRepo.updateLiveScanner(scannerId, userId, {
        filesMonitored: scanner.filesMonitored + 1,
        lastActivityAt: new Date().toISOString(),
      });
    }
  }

  /**
   * Update scanner statistics
   */
  private updateScannerStats(
    scannerId: number,
    userId: number,
    threatsFound: number,
  ): void {
    const scanner =
      this.liveScannerRepo.getLiveScannerById(scannerId);
    if (scanner) {
      this.liveScannerRepo.updateLiveScanner(scannerId, userId, {
        filesMonitored: scanner.filesMonitored + 1,
        filesScanned: scanner.filesScanned + 1,
        threatsDetected: scanner.threatsDetected + threatsFound,
        lastActivityAt: new Date().toISOString(),
      });
    }
  }

  /**
   * Cleanup - stop all active watchers
   */
  public async cleanup(): Promise<void> {
    const scannerIds = Array.from(this.activeWatchers.keys());
    await Promise.all(scannerIds.map((id) => this.stopWatching(id)));
  }
}
