export interface LiveScannerEntity {
  id: number;
  userId: number;
  name: string;
  targetPath: string;
  status: "active" | "paused" | "stopped";
  watchMode: "file-changes" | "directory-changes" | "both";
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
