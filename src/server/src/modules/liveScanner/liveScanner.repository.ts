import { LiveScannerEntity } from "../../entities";
import { dbModule } from "../db";

export class liveScannerRepository {
  private db: dbModule;

  constructor(DB_PATH: string) {
    this.db = new dbModule(DB_PATH);
  }

  public createLiveScanner(liveScannerData: {
    userId: number;
    name: string;
    targetPath: string;
    watchMode: "file-changes" | "directory-changes" | "both";
    isRecursive: boolean;
    status: "active" | "paused" | "stopped";
  }): LiveScannerEntity {
    return this.db.dbService.liveScanner.createLiveScanner(
      liveScannerData,
    );
  }

  public getLiveScannerById(id: number): LiveScannerEntity | null {
    return this.db.dbService.liveScanner.getLiveScannerById(id);
  }

  public getAllLiveScannersByUserId(
    userId: number,
  ): LiveScannerEntity[] {
    return this.db.dbService.liveScanner.getAllLiveScannersByUserId(
      userId,
    );
  }

  public getActiveLiveScannersByUserId(
    userId: number,
  ): LiveScannerEntity[] {
    return this.db.dbService.liveScanner.getActiveLiveScannersByUserId(
      userId,
    );
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
    return this.db.dbService.liveScanner.updateLiveScanner(
      id,
      userId,
      updates,
    );
  }

  public deleteLiveScanner(id: number, userId: number): void {
    return this.db.dbService.liveScanner.deleteLiveScanner(
      id,
      userId,
    );
  }
}
