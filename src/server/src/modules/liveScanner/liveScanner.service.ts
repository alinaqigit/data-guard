import { liveScannerRepository } from "./liveScanner.repository";
import { policyRepository } from "../policy/policy.repository";
import { PolicyEngineService } from "../policyEngine/policyEngine.service";
import { fileActionsService } from "../fileActions/fileActions.service";
import { threatRepository } from "../threats/threats.repository";
import {
  getQuickScanPaths,
  getFullScanPaths,
} from "../scanner/scanner.service";
import {
  LiveScannerOptions,
  DEFAULT_LIVE_SCANNER_OPTIONS,
  LiveScannerActivity,
  LiveScannerStats,
  FileChangeType,
} from "./liveScanner.types";
import { LiveScannerEntity, PolicyEntity } from "../../entities";
import { ThreatDetails } from "../../entities/threat.entity";
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from "../../utils/errors";
import { getSocketService } from "../socket/socket.service";
import fs from "fs";
import path from "path";
import os from "os";
import * as chokidar from "chokidar";

// ── Debug log helper — writes to a file so we can check from terminal ─────────
const DEBUG_LOG_PATH = path.join(
  os.tmpdir(),
  "dataguard-monitor-debug.log",
);
function debugLog(msg: string) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  try {
    fs.appendFileSync(DEBUG_LOG_PATH, line);
  } catch {
    /* ignore */
  }
  console.log(`[LiveScanner-DEBUG] ${msg}`);
}

// ── Safe user paths to monitor ────────────────────────────────────────────────
// Never includes system directories — only user-owned data locations
function getUserMonitorPaths(): string[] {
  const home = os.homedir();
  const paths: string[] = [];

  // Key user folder names to watch
  const folderNames = [
    "Desktop",
    "Documents",
    "Downloads",
    "Pictures",
    "Videos",
    "Music",
  ];

  // Build candidate paths: direct under home + OneDrive-backed locations
  const candidates: string[] = [];
  for (const name of folderNames) {
    candidates.push(path.join(home, name));
  }

  // OneDrive may host Desktop, Documents, Pictures on Windows
  if (process.platform === "win32") {
    const oneDrivePath =
      process.env.OneDrive ||
      process.env.OneDriveConsumer ||
      path.join(home, "OneDrive");
    if (oneDrivePath && fs.existsSync(oneDrivePath)) {
      for (const name of folderNames) {
        candidates.push(path.join(oneDrivePath, name));
      }
    }
  }

  // Keep only folders that actually exist (deduplicated)
  paths.push(
    ...candidates.filter((p) => {
      try {
        return fs.existsSync(p) && fs.statSync(p).isDirectory();
      } catch {
        return false;
      }
    }),
  );

  // NOTE: Non-system drives are intentionally NOT watched by the live monitor.
  // Watching large drive trees (D:\, E:\, F:\) recursively makes chokidar take
  // so long to initialise that the watcher never becomes active in practice.
  // Use the "Full Scan" feature for cross-drive scanning instead.

  return [...new Set(paths)].filter((p) => {
    try {
      return fs.existsSync(p) && fs.statSync(p).isDirectory();
    } catch {
      return false;
    }
  });
}

// ── System path safety check ───────────────────────────────────────────────────
const SYSTEM_PATH_PREFIXES = [
  "c:\\windows",
  "c:\\program files",
  "c:\\program files (x86)",
  "/usr",
  "/etc",
  "/bin",
  "/sbin",
  "/sys",
  "/proc",
  "/dev",
  "/boot",
  "/lib",
];

function isSafeToScan(filePath: string): boolean {
  const normalized = filePath.toLowerCase().replace(/\\/g, "/");
  return !SYSTEM_PATH_PREFIXES.some((p) =>
    normalized.startsWith(p.replace(/\\/g, "/")),
  );
}

interface ActiveWatcher {
  scannerId: number;
  userId: number;
  watcher: chokidar.FSWatcher;
  options: Required<LiveScannerOptions>;
  policies: PolicyEntity[];
  activityLog: LiveScannerActivity[];
  autoResponse: boolean;
  isReady: boolean;
  startTime: number;
}

export class liveScannerService {
  private liveScannerRepo: liveScannerRepository;
  private policyRepo: policyRepository;
  private policyEngine: PolicyEngineService;
  private fileActions: fileActionsService;
  private threatRepo: threatRepository;
  private activeWatchers: Map<number, ActiveWatcher> = new Map();

  constructor(DB_PATH: string) {
    this.liveScannerRepo = new liveScannerRepository(DB_PATH);
    this.policyRepo = new policyRepository(DB_PATH);
    this.policyEngine = new PolicyEngineService();
    this.fileActions = new fileActionsService(DB_PATH);
    this.threatRepo = new threatRepository(DB_PATH);
  }

  // ── Start live monitoring for a user ─────────────────────────────────────────
  // Called when the user toggles "Real-time Monitoring" ON
  // Automatically resolves paths — no user input needed
  public async startMonitoring(
    userId: number,
    autoResponse: boolean = false,
  ): Promise<{
    scannerId: number;
    message: string;
    monitoredPaths: string[];
  }> {
    debugLog(
      `startMonitoring called: userId=${userId}, autoResponse=${autoResponse}`,
    );
    // Stop any existing monitoring for this user first
    await this.stopMonitoringForUser(userId);
    debugLog(`stopMonitoringForUser done`);

    const monitorPaths = getUserMonitorPaths();
    debugLog(
      `getUserMonitorPaths returned ${monitorPaths.length} paths: ${monitorPaths.join(", ")}`,
    );
    if (monitorPaths.length === 0) {
      debugLog(`ERROR: No accessible user directories found`);
      throw new ValidationError(
        "No accessible user directories found to monitor",
      );
    }

    const policies = this.policyRepo
      .getAllPoliciesByUserId(userId)
      .filter((p) => p.isEnabled);
    debugLog(`Found ${policies.length} active policies`);

    // Create a single scanner record that watches all user paths
    const liveScanner = this.liveScannerRepo.createLiveScanner({
      userId,
      name: "Auto Monitor",
      targetPath: monitorPaths.join("|"), // pipe-delimited for multi-path
      watchMode: "both",
      isRecursive: true,
      status: "active",
    });
    debugLog(`Created scanner record: id=${liveScanner.id}`);

    // Start watching even without policies — the watcher will be ready
    // and policies are re-fetched from DB on every file change event
    this.startWatching(
      liveScanner,
      userId,
      policies,
      DEFAULT_LIVE_SCANNER_OPTIONS,
      autoResponse,
    ).catch((err) => {
      debugLog(`startWatching FAILED: ${err.message}`);
      console.error("[LiveScanner] Failed to start watcher:", err);
    });

    const result = {
      scannerId: liveScanner.id,
      message:
        policies.length === 0
          ? "Live monitoring started (no policies enabled — add policies to detect threats)"
          : "Live monitoring started",
      monitoredPaths: monitorPaths,
    };
    debugLog(
      `startMonitoring returning: scannerId=${result.scannerId}, paths=${result.monitoredPaths.length}`,
    );
    return result;
  }

  // ── Stop all monitoring for a user ───────────────────────────────────────────
  public async stopMonitoringForUser(userId: number): Promise<void> {
    const scanners =
      this.liveScannerRepo.getAllLiveScannersByUserId(userId);
    for (const scanner of scanners) {
      if (
        scanner.status === "active" ||
        scanner.status === "paused"
      ) {
        await this.stopWatching(scanner.id);
        this.liveScannerRepo.updateLiveScanner(scanner.id, userId, {
          status: "stopped",
          stoppedAt: new Date().toISOString(),
        });
      }
    }
  }

  // ── Update auto-response setting for active watchers ─────────────────────────
  public updateAutoResponse(
    userId: number,
    autoResponse: boolean,
  ): void {
    for (const [, watcher] of this.activeWatchers) {
      if (watcher.userId === userId) {
        watcher.autoResponse = autoResponse;
      }
    }
  }

  // ── Get monitoring status for a user ─────────────────────────────────────────
  public getMonitoringStatus(userId: number): {
    isActive: boolean;
    isReady: boolean;
    monitoredPaths: string[];
    scannerId?: number;
  } {
    const scanners =
      this.liveScannerRepo.getAllLiveScannersByUserId(userId);
    const active = scanners.find((s) => s.status === "active");
    if (!active)
      return { isActive: false, isReady: false, monitoredPaths: [] };

    // Check if the in-memory watcher is ready
    const aw = this.activeWatchers.get(active.id);
    const isReady = aw ? aw.isReady : false;

    return {
      isActive: true,
      isReady,
      scannerId: active.id,
      monitoredPaths: active.targetPath.split("|"),
    };
  }

  // ── Legacy: start a specific live scanner (kept for compatibility) ────────────
  public async startLiveScanner(
    userId: number,
    request: {
      name: string;
      targetPath: string;
      watchMode: "file-changes" | "directory-changes" | "both";
      isRecursive: boolean;
      options?: Partial<LiveScannerOptions>;
    },
  ): Promise<{ scannerId: number; message: string }> {
    if (!fs.existsSync(request.targetPath)) {
      throw new ValidationError(
        `Target path does not exist: ${request.targetPath}`,
      );
    }
    if (!fs.statSync(request.targetPath).isDirectory()) {
      throw new ValidationError("Target path must be a directory");
    }
    if (!isSafeToScan(request.targetPath)) {
      throw new ValidationError("Cannot monitor system paths");
    }

    const policies = this.policyRepo
      .getAllPoliciesByUserId(userId)
      .filter((p) => p.isEnabled);
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
      liveScanner,
      userId,
      policies,
      { ...DEFAULT_LIVE_SCANNER_OPTIONS, ...request.options },
      false,
    );

    return {
      scannerId: liveScanner.id,
      message: "Live scanner started successfully",
    };
  }

  public async stopLiveScanner(
    userId: number,
    scannerId: number,
  ): Promise<{ message: string }> {
    const scanner =
      this.liveScannerRepo.getLiveScannerById(scannerId);
    if (!scanner) throw new NotFoundError("Live scanner not found");
    if (scanner.userId !== userId)
      throw new ForbiddenError("Unauthorized");
    if (scanner.status === "stopped")
      throw new ValidationError("Already stopped");

    await this.stopWatching(scannerId);
    this.liveScannerRepo.updateLiveScanner(scannerId, userId, {
      status: "stopped",
      stoppedAt: new Date().toISOString(),
    });
    return { message: "Live scanner stopped successfully" };
  }

  public async pauseLiveScanner(
    userId: number,
    scannerId: number,
  ): Promise<{ message: string }> {
    const scanner =
      this.liveScannerRepo.getLiveScannerById(scannerId);
    if (!scanner) throw new NotFoundError("Live scanner not found");
    if (scanner.userId !== userId)
      throw new ForbiddenError("Unauthorized");
    if (scanner.status !== "active")
      throw new ValidationError("Only active scanners can be paused");

    this.liveScannerRepo.updateLiveScanner(scannerId, userId, {
      status: "paused",
    });
    return { message: "Live scanner paused successfully" };
  }

  public async resumeLiveScanner(
    userId: number,
    scannerId: number,
  ): Promise<{ message: string }> {
    const scanner =
      this.liveScannerRepo.getLiveScannerById(scannerId);
    if (!scanner) throw new NotFoundError("Live scanner not found");
    if (scanner.userId !== userId)
      throw new ForbiddenError("Unauthorized");
    if (scanner.status !== "paused")
      throw new ValidationError(
        "Only paused scanners can be resumed",
      );

    this.liveScannerRepo.updateLiveScanner(scannerId, userId, {
      status: "active",
    });
    return { message: "Live scanner resumed successfully" };
  }

  public getAllLiveScanners(userId: number): LiveScannerEntity[] {
    return this.liveScannerRepo.getAllLiveScannersByUserId(userId);
  }

  public getLiveScannerById(
    userId: number,
    scannerId: number,
  ): LiveScannerEntity {
    const scanner =
      this.liveScannerRepo.getLiveScannerById(scannerId);
    if (!scanner) throw new NotFoundError("Live scanner not found");
    if (scanner.userId !== userId)
      throw new ForbiddenError("Unauthorized");
    return scanner;
  }

  public getLiveScannerStats(
    userId: number,
    scannerId: number,
  ): LiveScannerStats {
    const scanner = this.getLiveScannerById(userId, scannerId);
    const watcher = this.activeWatchers.get(scannerId);
    const uptime = Date.now() - new Date(scanner.startedAt).getTime();
    return {
      scanner,
      recentActivity: watcher?.activityLog.slice(-50) || [],
      uptime,
    };
  }

  public async deleteLiveScanner(
    userId: number,
    scannerId: number,
  ): Promise<{ message: string }> {
    const scanner =
      this.liveScannerRepo.getLiveScannerById(scannerId);
    if (!scanner) throw new NotFoundError("Live scanner not found");
    if (scanner.userId !== userId)
      throw new ForbiddenError("Unauthorized");

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
    const watchPaths = scanner.targetPath
      .split("|")
      .filter((p) => fs.existsSync(p));
    if (watchPaths.length === 0)
      throw new ValidationError("No valid paths to watch");
    const startTime = Date.now();
    console.log(
      `[LiveScanner] Starting watcher for ${watchPaths.length} paths:`,
      watchPaths,
    );

    // Use polling on Windows for reliability (OneDrive, cloud-sync dirs)
    const usePolling = process.platform === "win32";

    const watcher = chokidar.watch(watchPaths, {
      persistent: true,
      ignoreInitial: true,
      followSymlinks: false,
      usePolling,
      interval: usePolling ? 1000 : undefined,
      // No depth limit — watch recursively
      awaitWriteFinish: {
        stabilityThreshold: 500,
        pollInterval: 100,
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
      isReady: false,
      startTime,
    };

    watcher.on("add", (fp) => {
      if (activeWatcher.isReady)
        this.handleFileChange(activeWatcher, fp, "add");
    });
    watcher.on("change", (fp) => {
      if (activeWatcher.isReady)
        this.handleFileChange(activeWatcher, fp, "change");
    });
    watcher.on("unlink", (fp) => {
      if (activeWatcher.isReady)
        this.handleFileChange(activeWatcher, fp, "unlink");
    });
    watcher.on("addDir", (dp) => {
      if (activeWatcher.isReady)
        this.logActivity(activeWatcher, dp, "add", 0);
    });
    watcher.on("unlinkDir", (dp) => {
      if (activeWatcher.isReady)
        this.logActivity(activeWatcher, dp, "unlink", 0);
    });
    watcher.on("error", (error: any) => {
      if (error.code === "EPERM" || error.code === "EACCES") return; // silently skip protected paths
      console.error(`[LiveScanner ${scanner.id}] Error:`, error);
    });
    watcher.on("ready", () => {
      activeWatcher.isReady = true;
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      debugLog(
        `Watcher READY in ${elapsed}s for scanner ${scanner.id}. Watching: ${watchPaths.join(", ")}`,
      );
      console.log(
        `[LiveScanner] ✓ Watcher READY in ${elapsed}s. Watching:`,
        watchPaths,
      );

      // Notify frontend that the live scanner is now active
      const socketService = getSocketService();
      if (socketService) {
        socketService.emitLiveScannerActivity({
          scannerId: scanner.id,
          filePath: "",
          changeType: "add",
          threatsFound: 0,
          timestamp: new Date().toISOString(),
          watcherReady: true,
        });
      }
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
    console.log(
      `[LiveScanner] File change detected: ${filePath} (${changeType})`,
    );
    const scanner = this.liveScannerRepo.getLiveScannerById(
      aw.scannerId,
    );
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
    } catch {
      return;
    }

    // ── Extract text using document extractor (supports PDF, DOCX, XLSX, etc.) ──
    let fileContent: string | null = null;
    const {
      isExtractable,
      extractText,
    } = require("../documentExtractor/documentExtractor.service");

    if (isExtractable(filePath)) {
      fileContent = await extractText(filePath);
    } else {
      // Plain text — skip binaries using null byte heuristic
      try {
        const buffer = fs.readFileSync(filePath);
        const sample = buffer.slice(0, 8000);
        for (let i = 0; i < sample.length; i++) {
          if (sample[i] === 0) return; // binary file, skip
        }
        fileContent = buffer.toString("utf-8");
      } catch {
        return;
      }
    }

    if (!fileContent) return;

    // Re-fetch policies from DB so newly added / toggled policies take effect
    // without requiring a monitor restart
    const currentPolicies = this.policyRepo
      .getAllPoliciesByUserId(aw.userId)
      .filter((p) => p.isEnabled);

    if (currentPolicies.length === 0) {
      // No policies to evaluate against — skip silently
      this.logActivity(aw, filePath, changeType, 0);
      this.updateScannerStats(aw.scannerId, aw.userId, 0);
      return;
    }

    const result = this.policyEngine.evaluate(
      fileContent,
      currentPolicies,
      {
        maxMatchesPerPolicy: aw.options.maxMatchesPerFile,
      },
    );
    console.log(
      `[LiveScanner] Policy result for ${filePath}: ${result.totalMatches} matches, policies: ${currentPolicies.length}`,
    );
    const threatsFound = result.totalMatches;
    this.logActivity(aw, filePath, changeType, threatsFound);
    this.updateScannerStats(aw.scannerId, aw.userId, threatsFound);

    if (threatsFound > 0) {
      const socketService = getSocketService();
      const timestamp = new Date()
        .toISOString()
        .replace("T", " ")
        .split(".")[0];
      const severity =
        threatsFound > 5
          ? "High"
          : ((threatsFound > 2 ? "Medium" : "Low") as
              | "High"
              | "Medium"
              | "Low");

      // ── Build rich description & structured details from policy engine results ──
      let description: string;
      let detailsJson: string | null = null;

      if (result.results && result.results.length > 0) {
        const violatedPolicies = result.results.filter(
          (r) => r.hasMatches,
        );
        const parts = violatedPolicies.map((r) => {
          const lines = r.matches.map((m) => m.lineNumber);
          const uniqueLines = [...new Set(lines)].sort(
            (a, b) => a - b,
          );
          const lineStr =
            uniqueLines.length > 5
              ? `${uniqueLines.slice(0, 5).join(", ")}… (+${uniqueLines.length - 5} more)`
              : uniqueLines.join(", ");
          return `'${r.policy.name}' (${r.matchCount} match${r.matchCount > 1 ? "es" : ""}, line${uniqueLines.length > 1 ? "s" : ""} ${lineStr})`;
        });
        description = `Violated ${parts.join("; ")} in ${path.basename(filePath)}`;

        const details: ThreatDetails = {
          totalMatches: result.totalMatches,
          policiesViolated: violatedPolicies.map((r) => ({
            policyId: r.policy.id,
            policyName: r.policy.name,
            matchCount: r.matchCount,
            matches: r.matches.map((m) => ({
              lineNumber: m.lineNumber,
              columnNumber: m.columnNumber,
              matchedText:
                m.matchedText.length > 80
                  ? m.matchedText.slice(0, 80) + "…"
                  : m.matchedText,
              contextBefore: m.contextBefore,
              contextAfter: m.contextAfter,
            })),
          })),
        };
        detailsJson = JSON.stringify(details);
      } else {
        description = `${threatsFound} threat(s) found in ${path.basename(filePath)}`;
      }

      // ── Persist threat to database (deduplicated by user + file path) ──
      const { threat: savedThreat, isNew } =
        this.threatRepo.upsertThreat({
          userId: aw.userId,
          scanId: aw.scannerId,
          severity,
          type: "Live Monitor: Policy Violation",
          description,
          details: detailsJson,
          source: "Live Monitor",
          status: "New",
          filePath,
        });

      console.log(
        `[LiveScanner] Threat ${isNew ? "created" : "updated"} (id=${savedThreat.id}) for ${filePath}`,
      );

      if (socketService) {
        socketService.emitAlert({
          id: savedThreat.id,
          severity,
          time: timestamp,
          type: isNew
            ? "Live Monitor: Policy Violation"
            : "Live Monitor: Policy Violation (Updated)",
          description: isNew
            ? description
            : `${description} — re-detected`,
          source: "Live Monitor",
          status: "New",
          filePath,
        });

        socketService.emitLiveScannerActivity({
          scannerId: aw.scannerId,
          filePath,
          changeType,
          threatsFound,
          timestamp,
        });
      }

      if (aw.autoResponse) {
        try {
          this.fileActions.encryptFile(aw.userId, filePath);
          console.log(`[LiveScanner] Auto-encrypted: ${filePath}`);

          // Mark the threat as resolved since it was auto-handled
          this.threatRepo.updateThreatStatus(
            savedThreat.id,
            aw.userId,
            "Resolved",
          );

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
          console.error(
            `[LiveScanner] Auto-encrypt failed for ${filePath}:`,
            err.message,
          );
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

  // ── Diagnostic: return internal state for debugging ──────────────────────────
  public getDiagnostics(userId: number): {
    activeWatchers: number;
    watcherDetails: Array<{
      scannerId: number;
      userId: number;
      isReady: boolean;
      initTimeMs: number;
      policiesCount: number;
      policyNames: string[];
      activityLogSize: number;
      lastActivity: string | null;
      autoResponse: boolean;
    }>;
    userMonitorPaths: string[];
  } {
    const details: Array<{
      scannerId: number;
      userId: number;
      isReady: boolean;
      initTimeMs: number;
      policiesCount: number;
      policyNames: string[];
      activityLogSize: number;
      lastActivity: string | null;
      autoResponse: boolean;
    }> = [];

    for (const [, aw] of this.activeWatchers) {
      if (aw.userId === userId) {
        details.push({
          scannerId: aw.scannerId,
          userId: aw.userId,
          isReady: aw.isReady,
          initTimeMs: Date.now() - aw.startTime,
          policiesCount: aw.policies.length,
          policyNames: aw.policies.map(
            (p) => `${p.name} (${p.type}: ${p.pattern.slice(0, 50)})`,
          ),
          activityLogSize: aw.activityLog.length,
          lastActivity:
            aw.activityLog.length > 0
              ? aw.activityLog[aw.activityLog.length - 1].timestamp
              : null,
          autoResponse: aw.autoResponse,
        });
      }
    }

    return {
      activeWatchers: details.length,
      watcherDetails: details,
      userMonitorPaths: getUserMonitorPaths(),
    };
  }

  public async cleanup(): Promise<void> {
    await Promise.all(
      Array.from(this.activeWatchers.keys()).map((id) =>
        this.stopWatching(id),
      ),
    );
  }
}
