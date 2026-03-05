import { ThreatEntity } from "../../entities";
import { dbRepository } from "./db.repository";

export class Threat {
  private dbRepository: dbRepository;

  constructor(DB_PATH: string) {
    this.dbRepository = new dbRepository(DB_PATH);
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
    return this.dbRepository.createThreat(threatData);
  }

  /**
   * Create-or-update: if an active (non-Resolved) threat already exists for
   * the same user + file path, refresh it with the latest scan data instead
   * of inserting a duplicate.  Returns { threat, isNew }.
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
    const existing = this.dbRepository.findActiveThreatByUserAndPath(
      threatData.userId,
      threatData.filePath,
    );

    if (existing) {
      // Update the existing record with the latest scan info
      this.dbRepository.refreshThreat(existing.id, {
        scanId: threatData.scanId,
        severity: threatData.severity,
        description: threatData.description,
        details: threatData.details,
      });
      return {
        threat: {
          ...existing,
          scanId: threatData.scanId,
          severity: threatData.severity,
          description: threatData.description,
          details: threatData.details
            ? JSON.parse(threatData.details)
            : null,
          status: "New",
          updatedAt: new Date().toISOString(),
        },
        isNew: false,
      };
    }

    return {
      threat: this.dbRepository.createThreat(threatData),
      isNew: true,
    };
  }

  public getThreatById(id: number): ThreatEntity | null {
    return this.dbRepository.getThreatById(id);
  }

  public getAllThreatsByUserId(userId: number): ThreatEntity[] {
    return this.dbRepository.getAllThreatsByUserId(userId);
  }

  public updateThreatStatus(
    id: number,
    userId: number,
    status: "New" | "Investigating" | "Quarantined" | "Resolved",
  ): void {
    const threat = this.dbRepository.getThreatById(id);

    if (!threat) {
      throw new Error("Threat not found");
    }

    if (threat.userId !== userId) {
      throw new Error("Unauthorized");
    }

    this.dbRepository.updateThreatStatus(id, status);
  }

  public deleteThreat(id: number, userId: number): void {
    const threat = this.dbRepository.getThreatById(id);

    if (!threat) {
      throw new Error("Threat not found");
    }

    if (threat.userId !== userId) {
      throw new Error("Unauthorized");
    }

    this.dbRepository.deleteThreatById(id);
  }

  public deleteAllThreatsByUserId(userId: number): void {
    this.dbRepository.deleteAllThreatsByUserId(userId);
  }
}
