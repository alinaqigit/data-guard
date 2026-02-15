import { scanRepository } from "./scanner.repository";
import { policyRepository } from "../policy/policy.repository";
import { PolicyEngineService } from "../policyEngine/policyEngine.service";
import {
  ScanOptions,
  DEFAULT_SCAN_OPTIONS,
  FileScanlResult,
  ScanProgress,
  ScanResult,
  StartScanRequest,
  ScanType,
} from "./scanner.types";
import { ScanEntity, PolicyEntity } from "../../entities";
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from "../../utils/errors";
import fs from "fs";
import path from "path";

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

  /**
   * Start a new scan
   */
  public async startScan(
    userId: number,
    request: StartScanRequest,
  ): Promise<{ scanId: number; message: string }> {
    // Validate target path exists
    if (!fs.existsSync(request.targetPath)) {
      throw new ValidationError(
        `Target path does not exist: ${request.targetPath}`,
      );
    }

    // Get active policies for the user
    const policies = this.policyRepo
      .getAllPoliciesByUserId(userId)
      .filter((p) => p.isEnabled);

    if (policies.length === 0) {
      throw new ValidationError(
        "No active policies found. Please create and enable at least one policy before scanning.",
      );
    }

    // Create scan record
    const scan = this.scanRepo.createScan({
      userId,
      scanType: request.scanType,
      targetPath: request.targetPath,
      status: "running",
    });

    // Start scanning in background (don't await)
    this.performScan(scan.id, userId, request.targetPath, policies, {
      ...DEFAULT_SCAN_OPTIONS,
      ...request.options,
    }).catch((error) => {
      // Update scan with error
      this.scanRepo.updateScan(scan.id, userId, {
        status: "failed",
        completedAt: new Date().toISOString(),
        errorMessage: error.message || "Unknown error occurred",
      });
    });

    return {
      scanId: scan.id,
      message: "Scan started successfully",
    };
  }

  /**
   * Perform the actual scanning
   */
  private async performScan(
    scanId: number,
    userId: number,
    targetPath: string,
    policies: PolicyEntity[],
    options: Required<ScanOptions>,
  ): Promise<void> {
    const startTime = Date.now();
    const fileResults: FileScanlResult[] = [];
    let filesScanned = 0;
    let filesWithThreats = 0;
    let totalThreats = 0;

    try {
      // Get all files to scan
      const filesToScan = this.getFilesToScan(targetPath, options);

      for (const filePath of filesToScan) {
        // Check if scan was cancelled
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

        // Scan the file
        const fileResult = await this.scanFile(
          filePath,
          policies,
          options,
        );
        fileResults.push(fileResult);

        if (fileResult.success) {
          filesScanned++;
          if (fileResult.threatsFound > 0) {
            filesWithThreats++;
            totalThreats += fileResult.threatsFound;
          }

          // Update progress periodically (every 10 files)
          if (filesScanned % 10 === 0) {
            this.scanRepo.updateScan(scanId, userId, {
              filesScanned,
              filesWithThreats,
              totalThreats,
            });
          }
        }
      }

      // Mark scan as completed
      this.scanRepo.updateScan(scanId, userId, {
        status: "completed",
        completedAt: new Date().toISOString(),
        filesScanned,
        filesWithThreats,
        totalThreats,
      });
    } catch (error: any) {
      // Mark scan as failed
      this.scanRepo.updateScan(scanId, userId, {
        status: "failed",
        completedAt: new Date().toISOString(),
        filesScanned,
        filesWithThreats,
        totalThreats,
        errorMessage: error.message || "Unknown error occurred",
      });
      throw error;
    }
  }

  /**
   * Scan a single file
   */
  private async scanFile(
    filePath: string,
    policies: PolicyEntity[],
    options: Required<ScanOptions>,
  ): Promise<FileScanlResult> {
    try {
      // Check file size
      const stats = fs.statSync(filePath);
      if (stats.size > options.maxFileSize) {
        return {
          filePath,
          success: false,
          error: `File exceeds maximum size (${options.maxFileSize} bytes)`,
          threatsFound: 0,
        };
      }

      // Read file content
      const content = fs.readFileSync(filePath, "utf-8");

      // Evaluate with PolicyEngine
      const result = this.policyEngine.evaluate(content, policies, {
        maxMatchesPerPolicy: options.maxMatchesPerFile,
        contextLinesBefore: 2,
        contextLinesAfter: 2,
        caseInsensitive: false,
        includeDisabled: false,
      });

      return {
        filePath,
        success: true,
        threatsFound: result.totalMatches,
        policyEngineResult: result,
      };
    } catch (error: any) {
      return {
        filePath,
        success: false,
        error: error.message || "Unknown error",
        threatsFound: 0,
      };
    }
  }

  /**
   * Get all files to scan based on options
   */
  private getFilesToScan(
    targetPath: string,
    options: Required<ScanOptions>,
  ): string[] {
    const files: string[] = [];

    const traverse = (currentPath: string, depth: number = 0) => {
      // Check max depth
      if (options.maxDepth > 0 && depth > options.maxDepth) {
        return;
      }

      try {
        const stats = fs.statSync(currentPath);

        if (stats.isFile()) {
          // Check if file should be included
          if (this.shouldIncludeFile(currentPath, options)) {
            files.push(currentPath);
          }
        } else if (stats.isDirectory()) {
          // Check if directory should be excluded
          const dirName = path.basename(currentPath);
          if (
            options.excludePaths.some((excluded) =>
              currentPath.includes(excluded),
            )
          ) {
            return;
          }

          // Traverse directory
          const entries = fs.readdirSync(currentPath);
          for (const entry of entries) {
            const entryPath = path.join(currentPath, entry);
            traverse(entryPath, depth + 1);
          }
        } else if (stats.isSymbolicLink() && options.followSymlinks) {
          const resolved = fs.realpathSync(currentPath);
          traverse(resolved, depth);
        }
      } catch (error) {
        // Skip files/directories that can't be accessed
        console.warn(`Skipping ${currentPath}: ${error}`);
      }
    };

    // Handle custom scan with specific include paths
    if (options.includePaths.length > 0) {
      for (const includePath of options.includePaths) {
        traverse(includePath, 0);
      }
    } else {
      traverse(targetPath, 0);
    }

    return files;
  }

  /**
   * Check if file should be included in scan
   */
  private shouldIncludeFile(
    filePath: string,
    options: Required<ScanOptions>,
  ): boolean {
    // Check exclude paths
    if (
      options.excludePaths.some((excluded) =>
        filePath.includes(excluded),
      )
    ) {
      return false;
    }

    // Check file extensions
    if (options.includeExtensions.length > 0) {
      const ext = path.extname(filePath);
      return options.includeExtensions.includes(ext);
    }

    // Try to determine if file is text (exclude binary files)
    try {
      const buffer = fs.readFileSync(filePath);
      // Simple heuristic: check first 8000 bytes for null bytes
      const sample = buffer.slice(0, 8000);
      for (let i = 0; i < sample.length; i++) {
        if (sample[i] === 0) {
          return false; // Binary file
        }
      }
      return true; // Text file
    } catch {
      return false;
    }
  }

  /**
   * Get scan by ID
   */
  public getScan(scanId: number, userId: number): ScanEntity | null {
    const scan = this.scanRepo.getScanById(scanId);

    if (!scan) {
      return null;
    }

    if (scan.userId !== userId) {
      throw new ForbiddenError("Unauthorized");
    }

    return scan;
  }

  /**
   * Get scan history for user
   */
  public getScanHistory(
    userId: number,
    limit?: number,
  ): ScanEntity[] {
    return this.scanRepo.getAllScansByUserId(userId, limit);
  }

  /**
   * Cancel a running scan
   */
  public cancelScan(scanId: number, userId: number): void {
    const scan = this.scanRepo.getScanById(scanId);

    if (!scan) {
      throw new NotFoundError("Scan not found");
    }

    if (scan.userId !== userId) {
      throw new ForbiddenError("Unauthorized");
    }

    if (scan.status !== "running") {
      throw new ValidationError("Can only cancel running scans");
    }

    // Mark for cancellation
    this.activeScansCancellation.set(scanId, true);
  }

  /**
   * Get scan progress
   */
  public getScanProgress(
    scanId: number,
    userId: number,
  ): ScanProgress {
    const scan = this.getScan(scanId, userId);

    if (!scan) {
      throw new NotFoundError("Scan not found");
    }

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

  /**
   * Delete a scan
   */
  public deleteScan(scanId: number, userId: number): void {
    const scan = this.scanRepo.getScanById(scanId);

    if (!scan) {
      throw new NotFoundError("Scan not found");
    }

    if (scan.userId !== userId) {
      throw new ForbiddenError("Unauthorized");
    }

    if (scan.status === "running") {
      throw new ValidationError(
        "Cannot delete a running scan. Cancel it first.",
      );
    }

    this.scanRepo.deleteScan(scanId, userId);
  }
}
