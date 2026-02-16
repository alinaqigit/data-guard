import { LiveScannerEntity } from "../../entities";
import { PolicyEngineResult } from "../policyEngine";

export type WatchMode = "file-changes" | "directory-changes" | "both";
export type LiveScannerStatus = "active" | "paused" | "stopped";
export type FileChangeType = "add" | "change" | "unlink";

/**
 * Options for configuring a live scanner
 */
export interface LiveScannerOptions {
  /** File extensions to monitor (e.g., ['.js', '.ts', '.txt']) */
  includeExtensions?: string[];

  /** Paths to exclude from monitoring */
  excludePaths?: string[];

  /** Maximum file size in bytes (files larger will be skipped) */
  maxFileSize?: number;

  /** Follow symbolic links */
  followSymlinks?: boolean;

  /** Debounce delay in milliseconds (to avoid scanning same file multiple times) */
  debounceDelay?: number;

  /** Maximum matches per file (passed to PolicyEngine) */
  maxMatchesPerFile?: number;
}

/**
 * Default live scanner options
 */
export const DEFAULT_LIVE_SCANNER_OPTIONS: Required<LiveScannerOptions> =
  {
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
      ".cache",
      "tmp",
      "temp",
    ],
    maxFileSize: 10 * 1024 * 1024, // 10MB
    followSymlinks: false,
    debounceDelay: 1000, // 1 second
    maxMatchesPerFile: 100,
  };

/**
 * Request to start a live scanner
 */
export interface StartLiveScannerRequest {
  name: string;
  targetPath: string;
  watchMode: WatchMode;
  isRecursive: boolean;
  options?: LiveScannerOptions;
}

/**
 * Result of scanning a file in live scanner
 */
export interface LiveScanFileResult {
  scannerId: number;
  filePath: string;
  changeType: FileChangeType;
  timestamp: string;
  success: boolean;
  error?: string;
  threatsFound: number;
  policyEngineResult?: PolicyEngineResult;
}

/**
 * Live scanner activity
 */
export interface LiveScannerActivity {
  scannerId: number;
  filePath: string;
  changeType: FileChangeType;
  timestamp: string;
  threatsFound: number;
}

/**
 * Live scanner statistics
 */
export interface LiveScannerStats {
  scanner: LiveScannerEntity;
  recentActivity: LiveScannerActivity[];
  uptime: number; // milliseconds
  averageResponseTime?: number; // milliseconds
}

/**
 * Update live scanner request
 */
export interface UpdateLiveScannerRequest {
  status?: LiveScannerStatus;
  options?: LiveScannerOptions;
}
