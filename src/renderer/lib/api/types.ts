// API Types based on server documentation

// Auth Module Types
export interface AuthRegisterRequest {
  username: string;
  password: string;
}

export interface AuthLoginRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: number;
    username: string;
  };
  sessionId: string;
}

export interface User {
  id: number;
  username: string;
}

// Policy Module Types
export interface Policy {
  id: number;
  userId: number;
  name: string;
  pattern: string;
  type: "keyword" | "regex";
  description?: string;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePolicyRequest {
  name: string;
  pattern: string;
  type: "keyword" | "regex";
  description?: string;
}

export interface UpdatePolicyRequest {
  name?: string;
  pattern?: string;
  type?: "keyword" | "regex";
  description?: string;
  isEnabled?: boolean;
}

// Scanner Module Types
export type ScanType = "full" | "quick" | "custom";
export type ScanStatus =
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export interface ScanOptions {
  includePaths?: string[];
  includeExtensions?: string[];
  excludePaths?: string[];
  maxFileSize?: number;
  maxDepth?: number;
  followSymlinks?: boolean;
  maxMatchesPerFile?: number;
}

export interface StartScanRequest {
  scanType: ScanType;
  targetPath: string;
  options?: ScanOptions;
}

export interface StartScanResponse {
  scanId: number;
  message: string;
}

export interface Scan {
  id: number;
  userId: number;
  scanType: ScanType;
  targetPath: string;
  status: ScanStatus;
  startedAt: string;
  completedAt?: string;
  filesScanned: number;
  filesWithThreats: number;
  totalThreats: number;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

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

// Live Scanner Module Types
export type LiveScannerStatus = "active" | "paused" | "stopped";
export type WatchMode = "file-changes" | "directory-changes" | "both";

export interface LiveScannerOptions {
  includeExtensions?: string[];
  excludePaths?: string[];
  maxFileSize?: number;
  followSymlinks?: boolean;
  debounceDelay?: number;
  maxMatchesPerFile?: number;
}

export interface CreateLiveScannerRequest {
  name: string;
  targetPath: string;
  watchMode: WatchMode;
  isRecursive: boolean;
  options?: LiveScannerOptions;
}

export interface LiveScanner {
  id: number;
  userId: number;
  name: string;
  targetPath: string;
  status: LiveScannerStatus;
  watchMode: WatchMode;
  isRecursive: boolean;
  startedAt: string;
  stoppedAt?: string;
  filesMonitored: number;
  filesScanned: number;
  threatsDetected: number;
  lastActivityAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LiveScannerActivity {
  scannerId: number;
  filePath: string;
  changeType: "add" | "change" | "unlink" | "addDir" | "unlinkDir";
  timestamp: string;
  threatsFound: number;
}

export interface LiveScannerStats {
  scanner: LiveScanner;
  recentActivity: LiveScannerActivity[];
  uptime: number;
  averageResponseTime?: number;
}

// API Error Response
export interface ApiError {
  error: string;
  details?: any;
}
