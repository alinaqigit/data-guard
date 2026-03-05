import { scanRepository } from "./scanner.repository";
import { policyRepository } from "../policy/policy.repository";
import { PolicyEngineService } from "../policyEngine/policyEngine.service";
import {
  extractText,
  isExtractable,
} from "../documentExtractor/documentExtractor.service";
import {
  ScanOptions,
  DEFAULT_SCAN_OPTIONS,
  FileScanlResult,
  ScanProgress,
  StartScanRequest,
  ScanType,
} from "./scanner.types";
import { ScanEntity, PolicyEntity } from "../../entities";
import { ThreatDetails } from "../../entities/threat.entity";
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from "../../utils/errors";
import { getSocketService } from "../socket/socket.service";
import {
  classifyMatches,
  sensitivityToTier,
  ModelTier,
} from "../mlModel/mlModel.service";
import { threatRepository } from "../threats/threats.repository";
import fs from "fs";
import path from "path";
import os from "os";

// ── System path safety ────────────────────────────────────────────────────────
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

function isSafeToScan(p: string): boolean {
  const n = p.toLowerCase().replace(/\\/g, "/");
  return !SYSTEM_PATH_PREFIXES.some((s) =>
    n.startsWith(s.replace(/\\/g, "/")),
  );
}

// ── Multi-drive path resolution ───────────────────────────────────────────────
function getAllDrivePaths(): string[] {
  const paths: string[] = [];
  const platform = process.platform;

  if (platform === "win32") {
    for (let i = 65; i <= 90; i++) {
      const drive = `${String.fromCharCode(i)}:\\`;
      try {
        if (
          !fs.existsSync(drive) ||
          !fs.statSync(drive).isDirectory()
        )
          continue;
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
          ]
            .filter((p) => {
              try {
                return fs.existsSync(p);
              } catch {
                return false;
              }
            })
            .forEach((p) => paths.push(p));
        } else {
          paths.push(drive); // Non-system drives: add root
        }
      } catch {
        /* skip inaccessible */
      }
    }
  } else if (platform === "darwin") {
    paths.push(os.homedir());
    try {
      for (const vol of fs.readdirSync("/Volumes")) {
        const p = path.join("/Volumes", vol);
        if (fs.statSync(p).isDirectory()) paths.push(p);
      }
    } catch {
      /* /Volumes may not exist */
    }
  } else {
    // Linux
    paths.push(os.homedir());
    for (const base of [
      `/media/${os.userInfo().username}`,
      "/media",
      "/mnt",
    ]) {
      try {
        if (!fs.existsSync(base)) continue;
        for (const entry of fs.readdirSync(base)) {
          const p = path.join(base, entry);
          if (fs.statSync(p).isDirectory()) paths.push(p);
        }
      } catch {
        /* skip */
      }
    }
  }

  return [...new Set(paths)].filter((p) => {
    try {
      return fs.existsSync(p) && fs.statSync(p).isDirectory();
    } catch {
      return false;
    }
  });
}

export function getQuickScanPaths(): string[] {
  return getAllDrivePaths();
}
export function getFullScanPaths(): string[] {
  return getAllDrivePaths();
}

function resolveTargetPath(
  scanType: ScanType,
  providedPath: string,
): { paths: string[]; recursive: boolean } {
  if (scanType === "quick")
    return { paths: getQuickScanPaths(), recursive: false };
  if (scanType === "full")
    return { paths: getFullScanPaths(), recursive: true };
  return { paths: [providedPath], recursive: true };
}

// ── Extract the full line containing a match position ────────────────────────
function extractMatchLine(
  content: string,
  matchIndex: number,
): string {
  const lines = content.split("\n");
  let pos = 0;
  for (const line of lines) {
    if (pos + line.length >= matchIndex) return line.trim();
    pos += line.length + 1; // +1 for \n
  }
  return content
    .slice(Math.max(0, matchIndex - 100), matchIndex + 100)
    .trim();
}

export class scannerService {
  private scanRepo: scanRepository;
  private policyRepo: policyRepository;
  private policyEngine: PolicyEngineService;
  private threatRepo: threatRepository;
  private activeScansCancellation: Map<number, boolean> = new Map();

  constructor(DB_PATH: string) {
    this.scanRepo = new scanRepository(DB_PATH);
    this.policyRepo = new policyRepository(DB_PATH);
    this.threatRepo = new threatRepository(DB_PATH);
    this.policyEngine = new PolicyEngineService();
  }

  public async startScan(
    userId: number,
    request: StartScanRequest,
  ): Promise<{ scanId: number; message: string }> {
    const { paths, recursive } = resolveTargetPath(
      request.scanType,
      request.targetPath,
    );

    if (request.scanType === "custom") {
      if (!request.targetPath || !fs.existsSync(request.targetPath))
        throw new ValidationError(
          `Target path does not exist: ${request.targetPath}`,
        );
      if (!isSafeToScan(request.targetPath))
        throw new ValidationError("Cannot scan system paths");
    }

    if (paths.length === 0)
      throw new ValidationError(
        "No accessible directories found to scan",
      );

    const policies = this.policyRepo
      .getAllPoliciesByUserId(userId)
      .filter((p) => p.isEnabled);
    if (policies.length === 0)
      throw new ValidationError(
        "No active policies found. Please create and enable at least one policy before scanning.",
      );

    const scan = this.scanRepo.createScan({
      userId,
      scanType: request.scanType,
      targetPath:
        request.scanType === "custom" ? request.targetPath : paths[0],
      status: "running",
    });

    const options: Required<ScanOptions> = {
      ...DEFAULT_SCAN_OPTIONS,
      ...request.options,
      maxDepth: recursive ? 0 : 1,
    };

    this.performScan(scan.id, userId, paths, policies, options).catch(
      (err) => {
        this.scanRepo.updateScan(scan.id, userId, {
          status: "failed",
          completedAt: new Date().toISOString(),
          errorMessage: err.message || "Unknown error",
        });
      },
    );

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

    try {
      // ── Emit scan:start IMMEDIATELY so the UI shows activity right away ──
      socketService?.emitScanStart({
        scanId,
        totalFiles: 0, // will update once discovery finishes
        scanType:
          options.includePaths?.length > 0 ? "custom" : "scan",
        targetPath: targetPaths[0],
      });

      // Give the frontend a moment to receive scan:start
      await new Promise((resolve) => setTimeout(resolve, 50));

      // ── Discover files with async yields so the event loop stays responsive ──
      const allFiles: string[] = [];
      for (const tp of targetPaths) {
        if (fs.existsSync(tp)) {
          const batch = await this.getFilesToScan(tp, options);
          allFiles.push(...batch);
          await new Promise((resolve) => setImmediate(resolve));
        }
      }
      const totalFiles = allFiles.length;

      // Send updated totalFiles now that discovery is complete
      socketService?.emitScanProgress({
        scanId,
        status: "running",
        filesScanned: 0,
        filesWithThreats: 0,
        totalThreats: 0,
        totalFiles,
        currentFile: "Starting scan...",
      });

      await new Promise((resolve) => setImmediate(resolve));

      for (const filePath of allFiles) {
        // Check cancellation
        if (this.activeScansCancellation.get(scanId)) {
          this.scanRepo.updateScan(scanId, userId, {
            status: "cancelled",
            completedAt: new Date().toISOString(),
            filesScanned,
            filesWithThreats,
            totalThreats,
          });
          this.activeScansCancellation.delete(scanId);
          return;
        }

        const fileResult = await this.scanFile(
          filePath,
          policies,
          options,
        );

        if (fileResult.success) {
          filesScanned++;
          if (fileResult.threatsFound > 0) {
            filesWithThreats++;
            totalThreats += fileResult.threatsFound;

            const severity =
              fileResult.threatsFound > 5 ? "High" : "Medium";
            const time = new Date()
              .toISOString()
              .replace("T", " ")
              .split(".")[0];

            // ── Build rich description & structured details from policy engine results ──
            let description: string;
            let detailsJson: string | null = null;

            const peResult = fileResult.policyEngineResult;
            if (peResult && peResult.results.length > 0) {
              const violatedPolicies = peResult.results.filter(
                (r) => r.hasMatches,
              );
              // Human-readable description
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

              // Structured details for the frontend
              const details: ThreatDetails = {
                totalMatches: peResult.totalMatches,
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
              description = `${fileResult.threatsFound} threat(s) found in ${path.basename(filePath)}`;
            }

            // Persist threat to database (deduplicated by user + file path)
            const { threat: savedThreat, isNew } =
              this.threatRepo.upsertThreat({
                userId,
                scanId,
                severity,
                type: "Policy Violation: Sensitive Content",
                description,
                details: detailsJson,
                source: "Content Scanner",
                status: "New",
                filePath,
              });

            socketService?.emitAlert({
              id: savedThreat.id,
              severity,
              time,
              type: isNew
                ? "Policy Violation: Sensitive Content"
                : "Policy Violation: Sensitive Content (Updated)",
              description: isNew
                ? description
                : `${description} — re-detected`,
              source: "Content Scanner",
              status: "New",
              filePath,
            });
          }

          // DB update every 25 files to avoid hammering SQLite
          if (
            filesScanned % 25 === 0 ||
            filesScanned === totalFiles
          ) {
            this.scanRepo.updateScan(scanId, userId, {
              filesScanned,
              filesWithThreats,
              totalThreats,
            });
          }

          // Emit progress every 10 files (or on last file) to avoid flooding the frontend
          if (
            filesScanned % 10 === 0 ||
            filesScanned === totalFiles
          ) {
            socketService?.emitScanProgress({
              scanId,
              status: "running",
              filesScanned,
              filesWithThreats,
              totalThreats,
              totalFiles,
              currentFile: filePath,
            });
          }

          // Yield every 10 files so socket events get sent and the event loop stays responsive
          if (filesScanned % 10 === 0) {
            await new Promise((resolve) => setImmediate(resolve));
          }
        }
      }

      this.scanRepo.updateScan(scanId, userId, {
        status: "completed",
        completedAt: new Date().toISOString(),
        filesScanned,
        filesWithThreats,
        totalThreats,
      });

      socketService?.emitScanComplete({
        scanId,
        status: "completed",
        filesScanned,
        totalThreats,
        totalFiles,
      });
    } catch (error: any) {
      this.scanRepo.updateScan(scanId, userId, {
        status: "failed",
        completedAt: new Date().toISOString(),
        filesScanned,
        filesWithThreats,
        totalThreats,
        errorMessage: error.message || "Unknown error",
      });
      throw error;
    }
  }

  private async scanFile(
    filePath: string,
    policies: PolicyEntity[],
    options: Required<ScanOptions>,
  ): Promise<FileScanlResult> {
    try {
      const stats = await fs.promises.stat(filePath);
      if (stats.size > options.maxFileSize) {
        return {
          filePath,
          success: true,
          error: "File too large",
          threatsFound: 0,
        };
      }

      // Extract text — documents need format-specific extraction,
      // plain text files are read directly
      let content: string;
      if (isExtractable(filePath)) {
        const extracted = await extractText(filePath);
        if (!extracted) {
          // Count as scanned but with no threats — don't block progress on unreadable docs
          return { filePath, success: true, threatsFound: 0 };
        }
        content = extracted;
      } else {
        // Plain text: read asynchronously, skip binaries via null-byte check
        const buffer = await fs.promises.readFile(filePath);
        const sample = buffer.slice(0, 8000);
        for (let i = 0; i < sample.length; i++) {
          if (sample[i] === 0) {
            return {
              filePath,
              success: true,
              error: "Binary file",
              threatsFound: 0,
            };
          }
        }
        content = buffer.toString("utf-8");
      }

      const result = this.policyEngine.evaluate(content, policies, {
        maxMatchesPerPolicy: options.maxMatchesPerFile,
        contextLinesBefore: 2,
        contextLinesAfter: 2,
        caseInsensitive: false,
        includeDisabled: false,
      });

      return { filePath, success: true, threatsFound: result.policiesMatched, policyEngineResult: result };
    } catch (error: any) {
      // Count as scanned with no threats so it doesn't break progress tracking
      console.warn(`[Scanner] Skipped ${filePath}: ${error.message}`);
      return { filePath, success: true, threatsFound: 0 };
    }
  }

  private async getFilesToScan(
    targetPath: string,
    options: Required<ScanOptions>,
  ): Promise<string[]> {
    const files: string[] = [];
    let visited = 0;

    const traverse = async (
      currentPath: string,
      depth: number = 0,
    ): Promise<void> => {
      if (options.maxDepth > 0 && depth > options.maxDepth) return;
      if (!isSafeToScan(currentPath)) return;
      try {
        const stats = await fs.promises.stat(currentPath);
        if (stats.isFile()) {
          if (this.shouldIncludeFile(currentPath, options))
            files.push(currentPath);
        } else if (stats.isDirectory()) {
          if (
            options.excludePaths.some((ex) =>
              currentPath
                .toLowerCase()
                .replace(/\\/g, "/")
                .includes(ex.toLowerCase().replace(/\\/g, "/")),
            )
          )
            return;
          const entries = await fs.promises.readdir(currentPath);
          for (const entry of entries) {
            await traverse(path.join(currentPath, entry), depth + 1);
            visited++;
            // Yield to event loop every 100 entries so the app stays responsive
            if (visited % 100 === 0) {
              await new Promise((resolve) => setImmediate(resolve));
            }
          }
        } else if (stats.isSymbolicLink() && options.followSymlinks) {
          const realPath = await fs.promises.realpath(currentPath);
          await traverse(realPath, depth);
        }
      } catch {
        /* skip inaccessible */
      }
    };

    if (options.includePaths?.length > 0) {
      for (const ip of options.includePaths) await traverse(ip, 0);
    } else {
      await traverse(targetPath, 0);
    }

    return files;
  }

  // ── Binary-extension skip list (fast reject without reading file) ─────────
  private static readonly BINARY_EXTENSIONS = new Set([
    ".exe",
    ".dll",
    ".so",
    ".dylib",
    ".bin",
    ".obj",
    ".o",
    ".a",
    ".lib",
    ".pdb",
    ".class",
    ".pyc",
    ".pyo",
    ".zip",
    ".gz",
    ".tar",
    ".bz2",
    ".7z",
    ".rar",
    ".xz",
    ".zst",
    ".jar",
    ".war",
    ".ear",
    ".whl",
    ".deb",
    ".rpm",
    ".msi",
    ".appx",
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".bmp",
    ".ico",
    ".svg",
    ".webp",
    ".tiff",
    ".tif",
    ".psd",
    ".ai",
    ".eps",
    ".mp3",
    ".mp4",
    ".avi",
    ".mkv",
    ".mov",
    ".wmv",
    ".flv",
    ".webm",
    ".wav",
    ".flac",
    ".aac",
    ".ogg",
    ".m4a",
    ".wma",
    ".ttf",
    ".otf",
    ".woff",
    ".woff2",
    ".eot",
    ".sqlite",
    ".db",
    ".mdb",
    ".ldb",
    ".iso",
    ".img",
    ".vmdk",
    ".vdi",
    ".qcow2",
    ".map",
    ".min.js",
    ".min.css",
    ".lock",
    ".pack",
    ".idx",
  ]);

  // ── Text-extension allow list (fast accept without reading file) ───────────
  private static readonly TEXT_EXTENSIONS = new Set([
    ".txt",
    ".log",
    ".cfg",
    ".conf",
    ".ini",
    ".env",
    ".properties",
    ".js",
    ".jsx",
    ".ts",
    ".tsx",
    ".mjs",
    ".cjs",
    ".py",
    ".rb",
    ".java",
    ".c",
    ".cpp",
    ".h",
    ".hpp",
    ".cs",
    ".go",
    ".rs",
    ".swift",
    ".kt",
    ".scala",
    ".php",
    ".pl",
    ".sh",
    ".bash",
    ".bat",
    ".cmd",
    ".ps1",
    ".psm1",
    ".sql",
    ".graphql",
    ".gql",
    ".yaml",
    ".yml",
    ".toml",
    ".jsonc",
    ".css",
    ".scss",
    ".sass",
    ".less",
    ".html",
    ".htm",
    ".xml",
    ".xsl",
    ".xsd",
    ".md",
    ".mdx",
    ".rst",
    ".tex",
    ".adoc",
    ".csv",
    ".tsv",
    ".json",
    ".geojson",
    ".ndjson",
    ".r",
    ".m",
    ".jl",
    ".lua",
    ".tcl",
    ".awk",
    ".sed",
    ".dockerfile",
    ".makefile",
    ".cmake",
    ".gitignore",
    ".gitattributes",
    ".editorconfig",
    ".prettierrc",
    ".eslintrc",
    ".babelrc",
  ]);

  private shouldIncludeFile(
    filePath: string,
    options: Required<ScanOptions>,
  ): boolean {
    if (options.excludePaths.some((ex) => filePath.includes(ex)))
      return false;

    const ext = path.extname(filePath).toLowerCase();

    if (options.includeExtensions.length > 0) {
      return options.includeExtensions.includes(ext);
    }

    // Known extractable documents always included
    if (isExtractable(filePath)) return true;

    // Fast reject known binary formats (no file I/O needed)
    if (scannerService.BINARY_EXTENSIONS.has(ext)) return false;

    // Fast accept known text formats (no file I/O needed)
    if (scannerService.TEXT_EXTENSIONS.has(ext)) return true;

    // Unknown extension — include it; binary check deferred to scanFile()
    return true;
  }

  public getScan(scanId: number, userId: number): ScanEntity | null {
    const scan = this.scanRepo.getScanById(scanId);
    if (!scan) return null;
    if (scan.userId !== userId)
      throw new ForbiddenError("Unauthorized");
    return scan;
  }

  public getScanHistory(
    userId: number,
    limit?: number,
  ): ScanEntity[] {
    return this.scanRepo.getAllScansByUserId(userId, limit);
  }

  public cancelScan(scanId: number, userId: number): void {
    const scan = this.scanRepo.getScanById(scanId);
    if (!scan) throw new NotFoundError("Scan not found");
    if (scan.userId !== userId)
      throw new ForbiddenError("Unauthorized");
    if (scan.status !== "running")
      throw new ValidationError("Can only cancel running scans");
    this.activeScansCancellation.set(scanId, true);
  }

  public getScanProgress(
    scanId: number,
    userId: number,
  ): ScanProgress {
    const scan = this.getScan(scanId, userId);
    if (!scan) throw new NotFoundError("Scan not found");
    const elapsedTime = scan.completedAt
      ? new Date(scan.completedAt).getTime() -
        new Date(scan.startedAt).getTime()
      : Date.now() - new Date(scan.startedAt).getTime();
    return {
      scanId: scan.id,
      status: scan.status,
      filesScanned: scan.filesScanned,
      filesWithThreats: scan.filesWithThreats,
      totalThreats: scan.totalThreats,
      startedAt: scan.startedAt,
      elapsedTime,
    };
  }

  public deleteScan(scanId: number, userId: number): void {
    const scan = this.scanRepo.getScanById(scanId);
    if (!scan) throw new NotFoundError("Scan not found");
    if (scan.userId !== userId)
      throw new ForbiddenError("Unauthorized");
    if (scan.status === "running")
      throw new ValidationError(
        "Cannot delete a running scan. Cancel it first.",
      );
    this.scanRepo.deleteScan(scanId, userId);
  }

  public deleteAllScans(userId: number): void {
    this.scanRepo.deleteAllScansByUserId(userId);
  }
}
