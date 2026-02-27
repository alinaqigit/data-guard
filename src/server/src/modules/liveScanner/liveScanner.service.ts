import { liveScannerRepository } from "./liveScanner.repository";
import { policyRepository } from "../policy/policy.repository";
import { PolicyEngineService } from "../policyEngine/policyEngine.service";
import { fileActionsService } from "../fileActions/fileActions.service";
import { getQuickScanPaths, getFullScanPaths } from "../scanner/scanner.service";
import {
  LiveScannerOptions,
  DEFAULT_LIVE_SCANNER_OPTIONS,
  LiveScannerActivity,
  LiveScannerStats,
  FileChangeType,
} from "./liveScanner.types";
import { LiveScannerEntity, PolicyEntity } from "../../entities";
import { NotFoundError, ForbiddenError, ValidationError } from "../../utils/errors";
import { getSocketService } from "../socket/socket.service";
import fs from "fs";
import path from "path";
import os from "os";
import * as chokidar from "chokidar";

// ── Safe user paths to monitor ────────────────────────────────────────────────
// Never includes system directories — only user-owned data locations
function getUserMonitorPaths(): string[] {
  const home = os.homedir();
  const paths: string[] = [];

  // Always watch key user folders (not home root — too broad)
  const userDirs = [
    path.join(home, "Desktop"),
    path.join(home, "Documents"),
    path.join(home, "Downloads"),
    path.join(home, "Pictures"),
    path.join(home, "Videos"),
    path.join(home, "Music"),
  ];
  paths.push(...userDirs.filter((p) => {
    try { return fs.existsSync(p) && fs.statSync(p).isDirectory(); }
    catch { return false; }
  }));

  // Add non-system drives (D:\, E:\, etc.)
  if (process.platform === "win32") {
    const skipFolders = new Set([
      "system volume information",
      "windowsapps",
      "recovery",
      "$recycle.bin",
      "config.msi",
      "perflogs",
    ]);

    for (let i = 65; i <= 90; i++) {
      const drive = `${String.fromCharCode(i)}:\\`;
      try {
        if (!fs.existsSync(drive) || !fs.statSync(drive).isDirectory()) continue;
        const isSystemDrive =
          fs.existsSync(path.join(drive, "Windows")) &&
          fs.existsSync(path.join(drive, "Windows", "System32"));
        if (isSystemDrive) continue;

        // Watch top-level subdirectories individually, not the drive root
        const entries = fs.readdirSync(drive);
        for (const entry of entries) {
          if (skipFolders.has(entry.toLowerCase())) continue;
          const full = path.join(drive, entry);
          try {
            if (fs.statSync(full).isDirectory()) paths.push(full);
          } catch { /* skip inaccessible */ }
        }
      } catch { /* skip inaccessible drives */ }
    }
  }

  return [...new Set(paths)].filter((p) => {
    try { return fs.existsSync(p) && fs.statSync(p).isDirectory(); }
    catch { return false; }
  });
}

// ── System path safety check ───────────────────────────────────────────────────
const SYSTEM_PATH_PREFIXES = [
  "c:\\windows",
  "c:\\program files",
  "c:\\program files (x86)",
  "/usr", "/etc", "/bin", "/sbin", "/sys", "/proc", "/dev", "/boot", "/lib",
];

function isSafeToScan(filePath: string): boolean {
  const normalized = filePath.toLowerCase().replace(/\\/g, "/");
  return !SYSTEM_PATH_PREFIXES.some((p) => normalized.startsWith(p.replace(/\\/g, "/")));
}



interface ActiveWatcher {
  scannerId: number;
  userId: number;
  watcher: chokidar.FSWatcher;
  options: Required<LiveScannerOptions>;
  policies: PolicyEntity[];
  activityLog: LiveScannerActivity[];
  autoResponse: boolean;
}

export class liveScannerService {
  private liveScannerRepo: liveScannerRepository;
  private policyRepo: policyRepository;
  private policyEngine: PolicyEngineService;
  private fileActions: fileActionsService;
  private activeWatchers: Map<number, ActiveWatcher> = new Map();

  constructor(DB_PATH: string) {
    this.liveScannerRepo = new liveScannerRepository(DB_PATH);
    this.policyRepo = new policyRepository(DB_PATH);
    this.policyEngine = new PolicyEngineService();
    this.fileActions = new fileActionsService(DB_PATH);
  }

  // ── Start live monitoring for a user ─────────────────────────────────────────
  // Called when the user toggles "Real-time Monitoring" ON
  // Automatically resolves paths — no user input needed
  public async startMonitoring(
    userId: number,
    autoResponse: boolean = false,
  ): Promise<{ scannerId: number; message: string; monitoredPaths: string[] }> {
    // Stop any existing monitoring for this user first
    await this.stopMonitoringForUser(userId);

    const monitorPaths = getUserMonitorPaths();
    if (monitorPaths.length === 0) {
      throw new ValidationError("No accessible user directories found to monitor");
    }

    const policies = this.policyRepo
      .getAllPoliciesByUserId(userId)
      .filter((p) => p.isEnabled);

    if (policies.length === 0) {
      throw new ValidationError(
        "No active policies found. Enable at least one policy before starting live monitoring.",
      );
    }

    // Create a single scanner record that watches all user paths
    const liveScanner = this.liveScannerRepo.createLiveScanner({
      userId,
      name: "Auto Monitor",
      targetPath: monitorPaths.join("|"), // pipe-delimited for multi-path
      watchMode: "both",
      isRecursive: true,
      status: "active",
    });

    this.startWatching(liveScanner, userId, policies, DEFAULT_LIVE_SCANNER_OPTIONS, autoResponse)
      .catch((err) => console.error("[LiveScanner] Failed to start watcher:", err));

    return {
      scannerId: liveScanner.id,
      message: "Live monitoring started",
      monitoredPaths: monitorPaths,
    };
  }

  // ── Stop all monitoring for a user ───────────────────────────────────────────
  public async stopMonitoringForUser(userId: number): Promise<void> {
    const scanners = this.liveScannerRepo.getAllLiveScannersByUserId(userId);
    for (const scanner of scanners) {
      if (scanner.status === "active" || scanner.status === "paused") {
        await this.stopWatching(scanner.id);
        this.liveScannerRepo.updateLiveScanner(scanner.id, userId, {
          status: "stopped",
          stoppedAt: new Date().toISOString(),
        });
      }
    }
  }

  // ── Update auto-response setting for active watchers ─────────────────────────
  public updateAutoResponse(userId: number, autoResponse: boolean): void {
    for (const [, watcher] of this.activeWatchers) {
      if (watcher.userId === userId) {
        watcher.autoResponse = autoResponse;
      }
    }
  }

  // ── Get monitoring status for a user ─────────────────────────────────────────
  public getMonitoringStatus(userId: number): {
    isActive: boolean;
    monitoredPaths: string[];
    scannerId?: number;
  } {
    const scanners = this.liveScannerRepo.getAllLiveScannersByUserId(userId);
    const active = scanners.find((s) => s.status === "active");
    if (!active) return { isActive: false, monitoredPaths: [] };

    return {
      isActive: true,
      scannerId: active.id,
      monitoredPaths: active.targetPath.split("|"),
    };
  }

  // ── Legacy: start a specific live scanner (kept for compatibility) ────────────
  public async startLiveScanner(
    userId: number,
    request: { name: string; targetPath: string; watchMode: "file-changes" | "directory-changes" | "both"; isRecursive: boolean; options?: Partial<LiveScannerOptions> },
  ): Promise<{ scannerId: number; message: string }> {
    if (!fs.existsSync(request.targetPath)) {
      throw new ValidationError(`Target path does not exist: ${request.targetPath}`);
    }
    if (!fs.statSync(request.targetPath).isDirectory()) {
      throw new ValidationError("Target path must be a directory");
    }
    if (!isSafeToScan(request.targetPath)) {
      throw new ValidationError("Cannot monitor system paths");
    }

    const policies = this.policyRepo.getAllPoliciesByUserId(userId).filter((p) => p.isEnabled);
    if (policies.length === 0) {
      throw new ValidationError("No active policies found");
    }

    const liveScanner = this.liveScannerRepo.createLiveScanner({
      userId,
      name: request.name,
      targetPath: request.targetPath,
      watchMode: request.watchMode,
      isRecursive: request.isRecursive,
      status: "active",
    });

    await this.startWatching(
      liveScanner, userId, policies,
      { ...DEFAULT_LIVE_SCANNER_OPTIONS, ...request.options },
      false,
    );

    return { scannerId: liveScanner.id, message: "Live scanner started successfully" };
  }

  public async stopLiveScanner(userId: number, scannerId: number): Promise<{ message: string }> {
    const scanner = this.liveScannerRepo.getLiveScannerById(scannerId);
    if (!scanner) throw new NotFoundError("Live scanner not found");
    if (scanner.userId !== userId) throw new ForbiddenError("Unauthorized");
    if (scanner.status === "stopped") throw new ValidationError("Already stopped");

    await this.stopWatching(scannerId);
    this.liveScannerRepo.updateLiveScanner(scannerId, userId, {
      status: "stopped",
      stoppedAt: new Date().toISOString(),
    });
    return { message: "Live scanner stopped successfully" };
  }

  public async pauseLiveScanner(userId: number, scannerId: number): Promise<{ message: string }> {
    const scanner = this.liveScannerRepo.getLiveScannerById(scannerId);
    if (!scanner) throw new NotFoundError("Live scanner not found");
    if (scanner.userId !== userId) throw new ForbiddenError("Unauthorized");
    if (scanner.status !== "active") throw new ValidationError("Only active scanners can be paused");

    this.liveScannerRepo.updateLiveScanner(scannerId, userId, { status: "paused" });
    return { message: "Live scanner paused successfully" };
  }

  public async resumeLiveScanner(userId: number, scannerId: number): Promise<{ message: string }> {
    const scanner = this.liveScannerRepo.getLiveScannerById(scannerId);
    if (!scanner) throw new NotFoundError("Live scanner not found");
    if (scanner.userId !== userId) throw new ForbiddenError("Unauthorized");
    if (scanner.status !== "paused") throw new ValidationError("Only paused scanners can be resumed");

    this.liveScannerRepo.updateLiveScanner(scannerId, userId, { status: "active" });
    return { message: "Live scanner resumed successfully" };
  }

  public getAllLiveScanners(userId: number): LiveScannerEntity[] {
    return this.liveScannerRepo.getAllLiveScannersByUserId(userId);
  }

  public getLiveScannerById(userId: number, scannerId: number): LiveScannerEntity {
    const scanner = this.liveScannerRepo.getLiveScannerById(scannerId);
    if (!scanner) throw new NotFoundError("Live scanner not found");
    if (scanner.userId !== userId) throw new ForbiddenError("Unauthorized");
    return scanner;
  }

  public getLiveScannerStats(userId: number, scannerId: number): LiveScannerStats {
    const scanner = this.getLiveScannerById(userId, scannerId);
    const watcher = this.activeWatchers.get(scannerId);
    const uptime = Date.now() - new Date(scanner.startedAt).getTime();
    return { scanner, recentActivity: watcher?.activityLog.slice(-50) || [], uptime };
  }

  public async deleteLiveScanner(userId: number, scannerId: number): Promise<{ message: string }> {
    const scanner = this.liveScannerRepo.getLiveScannerById(scannerId);
    if (!scanner) throw new NotFoundError("Live scanner not found");
    if (scanner.userId !== userId) throw new ForbiddenError("Unauthorized");

    if (scanner.status === "active" || scanner.status === "paused") {
      await this.stopWatching(scannerId);
    }
    this.liveScannerRepo.deleteLiveScanner(scannerId, userId);
    return { message: "Live scanner deleted successfully" };
  }

  // ── Core: start watching directories ─────────────────────────────────────────
  private async startWatching(
    scanner: LiveScannerEntity,
    userId: number,
    policies: PolicyEntity[],
    options: Required<LiveScannerOptions>,
    autoResponse: boolean,
  ): Promise<void> {
    // Support pipe-delimited multi-path
    const watchPaths = scanner.targetPath.split("|").filter((p) => fs.existsSync(p));
    if (watchPaths.length === 0) throw new ValidationError("No valid paths to watch");
    console.log(`[LiveScanner] Starting watcher for paths:`, watchPaths);
    const watcher = chokidar.watch(watchPaths, {
      persistent: true,
      ignoreInitial: true,
      followSymlinks: false,
      usePolling: false,
      depth: 1,                    // ← only watch 1 level deep, not recursive
      awaitWriteFinish: {
        stabilityThreshold: 1500,
        pollInterval: 200,
      },
      ignored: [
        /(^|[\/\\])\../,
        "**/node_modules/**",
        "**/AppData/**",
        "**/.git/**",
        "**/*.tmp",
        "**/*.temp",
        "**/*.enc",
        "**/*.lnk",
        "**/*.db",
        "**/*.db-journal",
        "**/System Volume Information/**",
        "**/WindowsApps/**",
        "**/Recovery/**",
        "**/$Recycle.Bin/**",
      ],
    });
    const activeWatcher: ActiveWatcher = {
      scannerId: scanner.id,
      userId,
      watcher,
      options,
      policies,
      activityLog: [],
      autoResponse,
    };

    let isReady = false;

    watcher.on("add", (fp) => { if (isReady) this.handleFileChange(activeWatcher, fp, "add"); });
    watcher.on("change", (fp) => { if (isReady) this.handleFileChange(activeWatcher, fp, "change"); });
    watcher.on("unlink", (fp) => { if (isReady) this.handleFileChange(activeWatcher, fp, "unlink"); });
    watcher.on("addDir", (dp) => { if (isReady) this.logActivity(activeWatcher, dp, "add", 0); });
    watcher.on("unlinkDir", (dp) => { if (isReady) this.logActivity(activeWatcher, dp, "unlink", 0); });
    watcher.on("error", (error: any) => {
      if (error.code === "EPERM" || error.code === "EACCES") return; // silently skip protected paths
      console.error(`[LiveScanner ${scanner.id}] Error:`, error);
    });
    watcher.on("ready", () => {
      isReady = true;
      console.log(`[LiveScanner] Watcher ready. Watching:`, watchPaths);
    });

    this.activeWatchers.set(scanner.id, activeWatcher);

    return new Promise((resolve) => watcher.on("ready", resolve));
  }

  private async stopWatching(scannerId: number): Promise<void> {
    const aw = this.activeWatchers.get(scannerId);
    if (aw) {
      await aw.watcher.close();
      this.activeWatchers.delete(scannerId);
    }
  }

  // ── Handle a file change event ────────────────────────────────────────────────
  private async handleFileChange(
    aw: ActiveWatcher,
    filePath: string,
    changeType: FileChangeType,
  ): Promise<void> {
    console.log(`[LiveScanner] File change detected: ${filePath} (${changeType})`);
    const scanner = this.liveScannerRepo.getLiveScannerById(aw.scannerId);
    if (!scanner || scanner.status !== "active") {
      console.log(`[LiveScanner] Scanner not active, skipping`);
      return;
    }
    if (!isSafeToScan(filePath)) {
      console.log(`[LiveScanner] Path not safe, skipping`);
      return;
    }

    if (changeType === "unlink") {
      this.logActivity(aw, filePath, changeType, 0);
      this.updateScannerStats(aw.scannerId, aw.userId, 0);
      return;
    }

    try {
      const stats = fs.statSync(filePath);
      if (stats.size > aw.options.maxFileSize) return;
      if (stats.size === 0) return;
    } catch { return; }

    let fileContent: string;
    try {
      fileContent = fs.readFileSync(filePath, "utf-8");
    } catch {
      return; // Binary or unreadable file — skip
    }

    const result = this.policyEngine.evaluate(fileContent, aw.policies, {
      maxMatchesPerPolicy: aw.options.maxMatchesPerFile,
    });
    console.log(`[LiveScanner] Policy result for ${filePath}: ${result.totalMatches} matches, policies: ${aw.policies.length}`);
    const threatsFound = result.totalMatches;
    this.logActivity(aw, filePath, changeType, threatsFound);
    this.updateScannerStats(aw.scannerId, aw.userId, threatsFound);

    if (threatsFound > 0) {
      const socketService = getSocketService();
      const timestamp = new Date().toISOString().replace("T", " ").split(".")[0];

      // Emit alert via socket so frontend receives it immediately
      if (socketService) {
        socketService.emitAlert({
          id: Date.now(),
          severity: threatsFound > 5 ? "High" : "Medium",
          time: timestamp,
          type: "Live Monitor: Policy Violation",
          description: `${threatsFound} threat(s) found in ${path.basename(filePath)}`,
          source: "Live Monitor",
          status: "New",
          filePath, // ← actual file path for actions
        });

        socketService.emitLiveScannerActivity({
          scannerId: aw.scannerId,
          filePath,
          changeType,
          threatsFound,
          timestamp,
        });
      }


      // Auto-response: encrypt the file automatically if enabled
      if (aw.autoResponse) {
        try {
          this.fileActions.encryptFile(aw.userId, filePath);
          console.log(`[LiveScanner] Auto-encrypted: ${filePath}`);
          if (socketService) {
            socketService.emitAlert({
              id: Date.now() + 1,
              severity: "Low",
              time: timestamp,
              type: "Auto-Response: File Encrypted",
              description: `File automatically encrypted: ${path.basename(filePath)}`,
              source: "Auto-Response",
              status: "Resolved",
              filePath: filePath + ".enc",
            });
          }
        } catch (err: any) {
          console.error(`[LiveScanner] Auto-encrypt failed for ${filePath}:`, err.message);
        }
      }
    }

  }

  private logActivity(
    aw: ActiveWatcher,
    filePath: string,
    changeType: FileChangeType,
    threatsFound: number,
  ): void {
    const activity: LiveScannerActivity = {
      scannerId: aw.scannerId,
      filePath,
      changeType,
      timestamp: new Date().toISOString(),
      threatsFound,
    };
    aw.activityLog.push(activity);
    if (aw.activityLog.length > 100) aw.activityLog.shift();
  }

  private updateScannerStats(scannerId: number, userId: number, threatsFound: number): void {
    const scanner = this.liveScannerRepo.getLiveScannerById(scannerId);
    if (scanner) {
      this.liveScannerRepo.updateLiveScanner(scannerId, userId, {
        filesMonitored: scanner.filesMonitored + 1,
        filesScanned: scanner.filesScanned + 1,
        threatsDetected: scanner.threatsDetected + threatsFound,
        lastActivityAt: new Date().toISOString(),
      });
    }
  }

  public async cleanup(): Promise<void> {
    await Promise.all(Array.from(this.activeWatchers.keys()).map((id) => this.stopWatching(id)));
  }
}