import { scanRepository } from "./scanner.repository";
import { policyRepository } from "../policy/policy.repository";
import { PolicyEngineService } from "../policyEngine/policyEngine.service";
import {
  ScanOptions, DEFAULT_SCAN_OPTIONS, FileScanlResult,
  ScanProgress, StartScanRequest, ScanType,
} from "./scanner.types";
import { ScanEntity, PolicyEntity } from "../../entities";
import { NotFoundError, ForbiddenError, ValidationError } from "../../utils/errors";
import { getSocketService } from "../socket/socket.service";
import { classifyMatches, sensitivityToTier, ModelTier } from "../mlModel/mlModel.service";
import { extractText, isExtractable } from "../documentExtractor/documentExtractor.service";
import fs from "fs";
import path from "path";
import os from "os";

// ── System path safety ────────────────────────────────────────────────────────
const SYSTEM_PATH_PREFIXES = [
  "c:\\windows", "c:\\program files", "c:\\program files (x86)",
  "/usr", "/etc", "/bin", "/sbin", "/sys", "/proc", "/dev", "/boot", "/lib",
];

function isSafeToScan(p: string): boolean {
  const n = p.toLowerCase().replace(/\\/g, "/");
  return !SYSTEM_PATH_PREFIXES.some((s) => n.startsWith(s.replace(/\\/g, "/")));
}

// ── Multi-drive path resolution ───────────────────────────────────────────────
function getAllDrivePaths(): string[] {
  const paths: string[] = [];
  const platform = process.platform;

  if (platform === "win32") {
    for (let i = 65; i <= 90; i++) {
      const drive = `${String.fromCharCode(i)}:\\`;
      try {
        if (!fs.existsSync(drive) || !fs.statSync(drive).isDirectory()) continue;
        const isSystemDrive =
          fs.existsSync(path.join(drive, "Windows")) &&
          fs.existsSync(path.join(drive, "Windows", "System32"));
        if (isSystemDrive) {
          // Only safe user subdirectories on system drive
          const home = os.homedir();
          [
            home,
            path.join(home, "Desktop"),
            path.join(home, "Documents"),
            path.join(home, "Downloads"),
            path.join(home, "Pictures"),
            path.join(home, "Videos"),
            path.join(home, "Music"),
          ].filter((p) => { try { return fs.existsSync(p); } catch { return false; } })
           .forEach((p) => paths.push(p));
        } else {
          paths.push(drive); // Non-system drives: add root
        }
      } catch { /* skip inaccessible */ }
    }
  } else if (platform === "darwin") {
    paths.push(os.homedir());
    try {
      for (const vol of fs.readdirSync("/Volumes")) {
        const p = path.join("/Volumes", vol);
        if (fs.statSync(p).isDirectory()) paths.push(p);
      }
    } catch { /* /Volumes may not exist */ }
  } else {
    // Linux
    paths.push(os.homedir());
    for (const base of [`/media/${os.userInfo().username}`, "/media", "/mnt"]) {
      try {
        if (!fs.existsSync(base)) continue;
        for (const entry of fs.readdirSync(base)) {
          const p = path.join(base, entry);
          if (fs.statSync(p).isDirectory()) paths.push(p);
        }
      } catch { /* skip */ }
    }
  }

  return [...new Set(paths)].filter((p) => {
    try { return fs.existsSync(p) && fs.statSync(p).isDirectory(); }
    catch { return false; }
  });
}

export function getQuickScanPaths(): string[] { return getAllDrivePaths(); }
export function getFullScanPaths():  string[] { return getAllDrivePaths(); }

function resolveTargetPath(scanType: ScanType, providedPath: string): { paths: string[]; recursive: boolean } {
  if (scanType === "quick") return { paths: getQuickScanPaths(), recursive: false };
  if (scanType === "full")  return { paths: getFullScanPaths(),  recursive: true  };
  return { paths: [providedPath], recursive: true };
}

// ── Extract the full line containing a match position ────────────────────────
function extractMatchLine(content: string, matchIndex: number): string {
  const lines = content.split("\n");
  let pos = 0;
  for (const line of lines) {
    if (pos + line.length >= matchIndex) return line.trim();
    pos += line.length + 1; // +1 for \n
  }
  return content.slice(Math.max(0, matchIndex - 100), matchIndex + 100).trim();
}

export class scannerService {
  private scanRepo: scanRepository;
  private policyRepo: policyRepository;
  private policyEngine: PolicyEngineService;
  private activeScansCancellation: Map<number, boolean> = new Map();

  constructor(DB_PATH: string) {
    this.scanRepo = new scanRepository(DB_PATH);
    this.policyRepo = new policyRepository(DB_PATH);
    this.policyEngine = new PolicyEngineService();
  }

  public async startScan(
    userId: number,
    request: StartScanRequest,
  ): Promise<{ scanId: number; message: string }> {
    const { paths, recursive } = resolveTargetPath(request.scanType, request.targetPath);

    if (request.scanType === "custom") {
      if (!request.targetPath || !fs.existsSync(request.targetPath))
        throw new ValidationError(`Target path does not exist: ${request.targetPath}`);
      if (!isSafeToScan(request.targetPath))
        throw new ValidationError("Cannot scan system paths");
    }

    if (paths.length === 0)
      throw new ValidationError("No accessible directories found to scan");

    const policies = this.policyRepo.getAllPoliciesByUserId(userId).filter((p) => p.isEnabled);
    if (policies.length === 0)
      throw new ValidationError("No active policies found. Please create and enable at least one policy before scanning.");

    const scan = this.scanRepo.createScan({
      userId,
      scanType: request.scanType,
      targetPath: request.scanType === "custom" ? request.targetPath : paths[0],
      status: "running",
    });

    const options: Required<ScanOptions> = {
      ...DEFAULT_SCAN_OPTIONS,
      ...request.options,
      maxDepth: recursive ? 0 : 1,
    };

    this.performScan(scan.id, userId, paths, policies, options).catch((err) => {
      this.scanRepo.updateScan(scan.id, userId, {
        status: "failed",
        completedAt: new Date().toISOString(),
        errorMessage: err.message || "Unknown error",
      });
    });

    return { scanId: scan.id, message: "Scan started successfully" };
  }

  private async performScan(
    scanId: number,
    userId: number,
    targetPaths: string[],
    policies: PolicyEntity[],
    options: Required<ScanOptions>,
  ): Promise<void> {
    let filesScanned = 0;
    let filesWithThreats = 0;
    let totalThreats = 0;
    const socketService = getSocketService();

    // Determine ML tier from options (default to "small")
    const mlTier: ModelTier = (options as any).mlTier || "small";

    // Excluded keywords and whitelisted paths come through options
    const excludedKeywords: string[] = (options as any).excludedKeywords || [];
    const whitelistedPaths: string[] = (options as any).whitelistedPaths || [];

    // Merge whitelisted paths into excludePaths so they're skipped during traversal
    const mergedOptions: Required<ScanOptions> = {
      ...options,
      excludePaths: [...options.excludePaths, ...whitelistedPaths],
    };

    try {
      // ── Count all files first so frontend has totalFiles for % ──────────────
      const allFiles: string[] = [];
      for (const tp of targetPaths) {
        if (fs.existsSync(tp)) {
          allFiles.push(...this.getFilesToScan(tp, mergedOptions));
        }
      }
      const totalFiles = allFiles.length;

      // Emit scan:start with total count
      socketService?.emitScanStart({
        scanId, totalFiles,
        scanType: options.includePaths?.length > 0 ? "custom" : "scan",
        targetPath: targetPaths[0],
      });

      for (const filePath of allFiles) {
        // Check cancellation
        if (this.activeScansCancellation.get(scanId)) {
          this.scanRepo.updateScan(scanId, userId, {
            status: "cancelled",
            completedAt: new Date().toISOString(),
            filesScanned, filesWithThreats, totalThreats,
          });
          this.activeScansCancellation.delete(scanId);
          return;
        }

        const fileResult = await this.scanFile(
          filePath, policies, mergedOptions, mlTier, excludedKeywords,
        );

        if (fileResult.success) {
          filesScanned++;
          if (fileResult.threatsFound > 0) {
            filesWithThreats++;
            totalThreats += fileResult.threatsFound;

            socketService?.emitAlert({
              id: Date.now() + filesScanned,
              severity: fileResult.threatsFound > 5 ? "High" : "Medium",
              time: new Date().toISOString().replace("T", " ").split(".")[0],
              type: "Policy Violation: Sensitive Content",
              description: `${fileResult.threatsFound} confirmed leak(s) in ${path.basename(filePath)}`,
              source: "Content Scanner",
              status: "New",
              filePath,
            });
          }

          // Emit progress every 10 files or on last file
          if (filesScanned % 10 === 0 || filesScanned === totalFiles) {
            this.scanRepo.updateScan(scanId, userId, { filesScanned, filesWithThreats, totalThreats });
            socketService?.emitScanProgress({
              scanId, status: "running",
              filesScanned, filesWithThreats, totalThreats,
              totalFiles, currentFile: filePath,
            });
          }
        }
      }

      this.scanRepo.updateScan(scanId, userId, {
        status: "completed",
        completedAt: new Date().toISOString(),
        filesScanned, filesWithThreats, totalThreats,
      });

      socketService?.emitScanComplete({
        scanId, status: "completed",
        filesScanned, totalThreats, totalFiles,
      });

    } catch (err: any) {
      this.scanRepo.updateScan(scanId, userId, {
        status: "failed",
        completedAt: new Date().toISOString(),
        filesScanned, filesWithThreats, totalThreats,
        errorMessage: err.message || "Unknown error",
      });
      throw err;
    }
  }

  /**
   * Scan a single file:
   * 1. Regex/keyword matching (policy engine)
   * 2. Filter out excluded keywords
   * 3. ML classification of matched lines
   * 4. Only count threats confirmed by ML as LEAK
   */
  private async scanFile(
    filePath: string,
    policies: PolicyEntity[],
    options: Required<ScanOptions>,
    mlTier: ModelTier,
    excludedKeywords: string[],
  ): Promise<FileScanlResult> {
    try {
      const stats = fs.statSync(filePath);
      if (stats.size > options.maxFileSize)
        return { filePath, success: false, error: "File too large", threatsFound: 0 };

      // Extract text — documents (PDF/DOCX/XLSX etc.) need format-specific extraction,
      // plain text files are read directly
      let content: string;
      if (isExtractable(filePath)) {
        const extracted = await extractText(filePath);
        if (!extracted) return { filePath, success: false, error: "Could not extract text", threatsFound: 0 };
        content = extracted;
      } else {
        content = fs.readFileSync(filePath, "utf-8");
      }

      // Step 1: Policy engine finds regex/keyword candidates
      const engineResult = this.policyEngine.evaluate(content, policies, {
        maxMatchesPerPolicy: options.maxMatchesPerFile,
        contextLinesBefore: 2,
        contextLinesAfter: 2,
        caseInsensitive: false,
        includeDisabled: false,
      });

      if (engineResult.totalMatches === 0)
        return { filePath, success: true, threatsFound: 0, policyEngineResult: engineResult };

      // Step 2: Extract the full line for each match across all policy results
      let matchedLines: string[] = engineResult.results.flatMap(
        (policyResult) =>
          policyResult.matches.map((m) => extractMatchLine(content, m.startIndex ?? 0))
      ).filter((line) => line.length > 0);

      // Remove duplicates
      matchedLines = [...new Set(matchedLines)];

      // Step 3: Filter out lines containing excluded keywords
      if (excludedKeywords.length > 0) {
        matchedLines = matchedLines.filter((line: string) =>
          !excludedKeywords.some((kw) =>
            line.toLowerCase().includes(kw.toLowerCase())
          )
        );
      }

      if (matchedLines.length === 0)
        return { filePath, success: true, threatsFound: 0, policyEngineResult: engineResult };

      // Step 4: ML classification — only lines confirmed LEAK count as threats
      const confirmedLeaks = await classifyMatches(matchedLines, mlTier);

      return {
        filePath,
        success: true,
        threatsFound: confirmedLeaks.length,
        policyEngineResult: engineResult,
      };

    } catch (err: any) {
      return { filePath, success: false, error: err.message || "Unknown error", threatsFound: 0 };
    }
  }

  private getFilesToScan(targetPath: string, options: Required<ScanOptions>): string[] {
    const files: string[] = [];

    const traverse = (currentPath: string, depth: number = 0) => {
      if (options.maxDepth > 0 && depth > options.maxDepth) return;
      if (!isSafeToScan(currentPath)) return;
      try {
        const stats = fs.statSync(currentPath);
        if (stats.isFile()) {
          if (this.shouldIncludeFile(currentPath, options)) files.push(currentPath);
        } else if (stats.isDirectory()) {
          if (options.excludePaths.some((ex) =>
            currentPath.toLowerCase().replace(/\\/g, "/")
              .includes(ex.toLowerCase().replace(/\\/g, "/"))
          )) return;
          for (const entry of fs.readdirSync(currentPath)) {
            traverse(path.join(currentPath, entry), depth + 1);
          }
        } else if (stats.isSymbolicLink() && options.followSymlinks) {
          traverse(fs.realpathSync(currentPath), depth);
        }
      } catch { /* skip inaccessible */ }
    };

    if (options.includePaths?.length > 0) {
      for (const ip of options.includePaths) traverse(ip, 0);
    } else {
      traverse(targetPath, 0);
    }

    return files;
  }

  private shouldIncludeFile(filePath: string, options: Required<ScanOptions>): boolean {
    if (options.excludePaths.some((ex) =>
      filePath.toLowerCase().replace(/\\/g, "/")
        .includes(ex.toLowerCase().replace(/\\/g, "/"))
    )) return false;

    if (options.includeExtensions.length > 0)
      return options.includeExtensions.includes(path.extname(filePath));

    // Documents with known extractable formats are always included
    if (isExtractable(filePath)) return true;

    // For everything else: skip binary files (null byte heuristic)
    try {
      const buffer = fs.readFileSync(filePath);
      const sample = buffer.slice(0, 8000);
      for (let i = 0; i < sample.length; i++) {
        if (sample[i] === 0) return false;
      }
      return true;
    } catch { return false; }
  }

  public getScan(scanId: number, userId: number): ScanEntity | null {
    const scan = this.scanRepo.getScanById(scanId);
    if (!scan) return null;
    if (scan.userId !== userId) throw new ForbiddenError("Unauthorized");
    return scan;
  }

  public getScanHistory(userId: number, limit?: number): ScanEntity[] {
    return this.scanRepo.getAllScansByUserId(userId, limit);
  }

  public cancelScan(scanId: number, userId: number): void {
    const scan = this.scanRepo.getScanById(scanId);
    if (!scan) throw new NotFoundError("Scan not found");
    if (scan.userId !== userId) throw new ForbiddenError("Unauthorized");
    if (scan.status !== "running") throw new ValidationError("Can only cancel running scans");
    this.activeScansCancellation.set(scanId, true);
  }

  public getScanProgress(scanId: number, userId: number): ScanProgress {
    const scan = this.getScan(scanId, userId);
    if (!scan) throw new NotFoundError("Scan not found");
    const elapsedTime = scan.completedAt
      ? new Date(scan.completedAt).getTime() - new Date(scan.startedAt).getTime()
      : Date.now() - new Date(scan.startedAt).getTime();
    return {
      scanId: scan.id, status: scan.status,
      filesScanned: scan.filesScanned, filesWithThreats: scan.filesWithThreats,
      totalThreats: scan.totalThreats, startedAt: scan.startedAt, elapsedTime,
    };
  }

  public deleteScan(scanId: number, userId: number): void {
    const scan = this.scanRepo.getScanById(scanId);
    if (!scan) throw new NotFoundError("Scan not found");
    if (scan.userId !== userId) throw new ForbiddenError("Unauthorized");
    if (scan.status === "running") throw new ValidationError("Cannot delete a running scan. Cancel it first.");
    this.scanRepo.deleteScan(scanId, userId);
  }

  public deleteAllScans(userId: number): void {
    this.scanRepo.deleteAllScansByUserId(userId);
  }
}