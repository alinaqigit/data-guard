import { ScanEntity } from "../../entities";
import { PolicyEngineResult } from "../policyEngine";

export type ScanType = "full" | "quick" | "custom";
export type ScanStatus =
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

/**
 * Options for configuring a scan
 */
export interface ScanOptions {
  /** Paths to include (for custom scans) */
  includePaths?: string[];

  /** File extensions to scan (e.g., ['.js', '.ts', '.txt']) */
  includeExtensions?: string[];

  /** Paths to exclude from scanning */
  excludePaths?: string[];

  /** Maximum file size in bytes (files larger will be skipped) */
  maxFileSize?: number;

  /** Maximum depth for directory recursion (0 = unlimited) */
  maxDepth?: number;

  /** Follow symbolic links */
  followSymlinks?: boolean;

  /** Maximum matches per file (passed to PolicyEngine) */
  maxMatchesPerFile?: number;
}

/**
 * Default scan options
 */
export const DEFAULT_SCAN_OPTIONS: Required<ScanOptions> = {
  includePaths: [],
  includeExtensions: [],
  excludePaths: [
    "node_modules",
    ".git",
    "dist",
    "build",
    "coverage",
    ".next",
    ".nuxt",
    "vendor",
    "__pycache__",
    ".venv",
    "venv",
  ],
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxDepth: 0, // unlimited
  followSymlinks: false,
  maxMatchesPerFile: 100,
};

/**
 * Result of scanning a single file
 */
export interface FileScanlResult {
  filePath: string;
  success: boolean;
  error?: string;
  threatsFound: number;
  policyEngineResult?: PolicyEngineResult;
}

/**
 * Progress information during a scan
 */
export interface ScanProgress {
  scanId: number;
  status: ScanStatus;
  filesScanned: number;
  filesWithThreats: number;
  totalThreats: number;
  currentFile?: string;
  startedAt: string;
  elapsedTime?: number;
}

/**
 * Detailed scan result with statistics
 */
export interface ScanResult {
  scan: ScanEntity;
  fileResults: FileScanlResult[];
  statistics: {
    totalFiles: number;
    filesScanned: number;
    filesSkipped: number;
    filesWithErrors: number;
    filesWithThreats: number;
    totalThreats: number;
    duration: number; // milliseconds
  };
}

/**
 * Request to start a new scan
 */
export interface StartScanRequest {
  scanType: ScanType;
  targetPath: string;
  options?: ScanOptions;
}

/**
 * Response when starting a scan
 */
export interface StartScanResponse {
  scanId: number;
  message: string;
}
