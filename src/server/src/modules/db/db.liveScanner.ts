import { LiveScannerEntity } from "../../entities";
import { dbRepository } from "./db.repository";

export class LiveScanner {
  private dbRepository: dbRepository;

  constructor(DB_PATH: string) {
    this.dbRepository = new dbRepository(DB_PATH);
  }

  public createLiveScanner(liveScannerData: {
    userId: number;
    name: string;
    targetPath: string;
    watchMode: "file-changes" | "directory-changes" | "both";
    isRecursive: boolean;
    status: "active" | "paused" | "stopped";
  }): LiveScannerEntity {
    return this.dbRepository.createLiveScanner(liveScannerData);
  }

  public getLiveScannerById(id: number): LiveScannerEntity | null {
    return this.dbRepository.getLiveScannerById(id);
  }

  public getAllLiveScannersByUserId(
    userId: number,
  ): LiveScannerEntity[] {
    return this.dbRepository.getAllLiveScannersByUserId(userId);
  }

  public getActiveLiveScannersByUserId(
    userId: number,
  ): LiveScannerEntity[] {
    return this.dbRepository.getActiveLiveScannersByUserId(userId);
  }

  public updateLiveScanner(
    id: number,
    userId: number,
    updates: {
      name?: string;
      status?: "active" | "paused" | "stopped";
      stoppedAt?: string;
      filesMonitored?: number;
      filesScanned?: number;
      threatsDetected?: number;
      lastActivityAt?: string;
    },
  ): void {
    const liveScanner = this.dbRepository.getLiveScannerById(id);

    if (!liveScanner) {
      throw new Error("Live scanner not found");
    }

    if (liveScanner.userId !== userId) {
      throw new Error("Unauthorized");
    }

    return this.dbRepository.updateLiveScanner(id, updates);
  }

  public deleteLiveScanner(id: number, userId: number): void {
    const liveScanner = this.dbRepository.getLiveScannerById(id);

    if (!liveScanner) {
      throw new Error("Live scanner not found");
    }

    if (liveScanner.userId !== userId) {
      throw new Error("Unauthorized");
    }

    return this.dbRepository.deleteLiveScannerById(id);
  }
}
