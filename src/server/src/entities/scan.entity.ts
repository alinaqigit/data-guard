export interface ScanEntity {
  id: number;
  userId: number;
  scanType: "full" | "quick" | "custom";
  targetPath: string;
  status: "running" | "completed" | "failed" | "cancelled";
  startedAt: string;
  completedAt?: string;
  filesScanned: number;
  filesWithThreats: number;
  totalThreats: number;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}
