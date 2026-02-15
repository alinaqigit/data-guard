import { ScanEntity } from "../../entities";
import { dbModule } from "../db";

export class scanRepository {
  private db: dbModule;

  constructor(DB_PATH: string) {
    this.db = new dbModule(DB_PATH);
  }

  public createScan(scanData: {
    userId: number;
    scanType: "full" | "quick" | "custom";
    targetPath: string;
    status: "running" | "completed" | "failed" | "cancelled";
  }): ScanEntity {
    return this.db.dbService.scan.createScan(scanData);
  }

  public getScanById(id: number): ScanEntity | null {
    return this.db.dbService.scan.getScanById(id);
  }

  public getAllScansByUserId(
    userId: number,
    limit?: number,
  ): ScanEntity[] {
    return this.db.dbService.scan.getAllScansByUserId(userId, limit);
  }

  public updateScan(
    id: number,
    userId: number,
    updates: {
      status?: "running" | "completed" | "failed" | "cancelled";
      completedAt?: string;
      filesScanned?: number;
      filesWithThreats?: number;
      totalThreats?: number;
      errorMessage?: string;
    },
  ): void {
    return this.db.dbService.scan.updateScan(id, userId, updates);
  }

  public deleteScan(id: number, userId: number): void {
    return this.db.dbService.scan.deleteScan(id, userId);
  }
}
