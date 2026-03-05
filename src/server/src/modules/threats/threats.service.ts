import { ThreatEntity } from "../../entities";
import { threatRepository } from "./threats.repository";
import { NotFoundError, ForbiddenError } from "../../utils/errors";

export class threatsService {
  private threatRepo: threatRepository;

  constructor(DB_PATH: string) {
    this.threatRepo = new threatRepository(DB_PATH);
  }

  public createThreat(threatData: {
    userId: number;
    scanId: number;
    severity: "High" | "Medium" | "Low";
    type: string;
    description: string;
    source: string;
    status: "New" | "Investigating" | "Quarantined" | "Resolved";
    filePath: string;
  }): ThreatEntity {
    return this.threatRepo.createThreat(threatData);
  }

  public getAllThreatsByUserId(userId: number): ThreatEntity[] {
    return this.threatRepo.getAllThreatsByUserId(userId);
  }

  public updateThreatStatus(
    id: number,
    userId: number,
    status: "New" | "Investigating" | "Quarantined" | "Resolved",
  ): void {
    this.threatRepo.updateThreatStatus(id, userId, status);
  }

  public deleteThreat(id: number, userId: number): void {
    this.threatRepo.deleteThreat(id, userId);
  }

  public deleteAllThreats(userId: number): void {
    this.threatRepo.deleteAllThreatsByUserId(userId);
  }
}
