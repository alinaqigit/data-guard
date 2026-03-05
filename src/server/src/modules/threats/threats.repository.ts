import { ThreatEntity } from "../../entities";
import { dbModule } from "../db";

export class threatRepository {
  private db: dbModule;

  constructor(DB_PATH: string) {
    this.db = new dbModule(DB_PATH);
  }

  public createThreat(threatData: {
    userId: number;
    scanId: number;
    severity: "High" | "Medium" | "Low";
    type: string;
    description: string;
    details?: string | null;
    source: string;
    status: "New" | "Investigating" | "Quarantined" | "Resolved";
    filePath: string;
  }): ThreatEntity {
    return this.db.dbService.threat.createThreat(threatData);
  }

  /**
   * Create-or-update: deduplicates by (userId, filePath) for active threats.
   */
  public upsertThreat(threatData: {
    userId: number;
    scanId: number;
    severity: "High" | "Medium" | "Low";
    type: string;
    description: string;
    details?: string | null;
    source: string;
    status: "New" | "Investigating" | "Quarantined" | "Resolved";
    filePath: string;
  }): { threat: ThreatEntity; isNew: boolean } {
    return this.db.dbService.threat.upsertThreat(threatData);
  }

  public getThreatById(id: number): ThreatEntity | null {
    return this.db.dbService.threat.getThreatById(id);
  }

  public getAllThreatsByUserId(userId: number): ThreatEntity[] {
    return this.db.dbService.threat.getAllThreatsByUserId(userId);
  }

  public updateThreatStatus(
    id: number,
    userId: number,
    status: "New" | "Investigating" | "Quarantined" | "Resolved",
  ): void {
    this.db.dbService.threat.updateThreatStatus(id, userId, status);
  }

  public deleteThreat(id: number, userId: number): void {
    this.db.dbService.threat.deleteThreat(id, userId);
  }

  public deleteAllThreatsByUserId(userId: number): void {
    this.db.dbService.threat.deleteAllThreatsByUserId(userId);
  }
}
