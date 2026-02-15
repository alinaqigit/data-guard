import { ScanEntity } from "../../entities";
import { dbRepository } from "./db.repository";

export class Scan {
  private dbRepository: dbRepository;

  constructor(DB_PATH: string) {
    this.dbRepository = new dbRepository(DB_PATH);
  }

  public createScan(scanData: {
    userId: number;
    scanType: "full" | "quick" | "custom";
    targetPath: string;
    status: "running" | "completed" | "failed" | "cancelled";
  }): ScanEntity {
    return this.dbRepository.createScan(scanData);
  }

  public getScanById(id: number): ScanEntity | null {
    return this.dbRepository.getScanById(id);
  }

  public getAllScansByUserId(
    userId: number,
    limit?: number,
  ): ScanEntity[] {
    return this.dbRepository.getAllScansByUserId(userId, limit);
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
    const scan = this.dbRepository.getScanById(id);

    if (!scan) {
      throw new Error("Scan not found");
    }

    if (scan.userId !== userId) {
      throw new Error("Unauthorized");
    }

    return this.dbRepository.updateScan(id, updates);
  }

  public deleteScan(id: number, userId: number): void {
    const scan = this.dbRepository.getScanById(id);

    if (!scan) {
      throw new Error("Scan not found");
    }

    if (scan.userId !== userId) {
      throw new Error("Unauthorized");
    }

    return this.dbRepository.deleteScanById(id);
  }
}
