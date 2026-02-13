import { PolicyEntity } from "../../entities";
import { dbModule } from "../db";

export class policyRepository {
  private db: dbModule;

  constructor(DB_PATH: string) {
    this.db = new dbModule(DB_PATH);
  }

  public createPolicy(policyData: {
    userId: number;
    name: string;
    pattern: string;
    type: "keyword" | "regex";
    description?: string;
  }): PolicyEntity {
    return this.db.dbService.policy.createPolicy(policyData);
  }

  public getPolicyById(id: number): PolicyEntity | null {
    return this.db.dbService.policy.getPolicyById(id);
  }

  public getAllPoliciesByUserId(userId: number): PolicyEntity[] {
    return this.db.dbService.policy.getAllPoliciesByUserId(userId);
  }

  public updatePolicy(
    id: number,
    userId: number,
    updates: {
      name?: string;
      pattern?: string;
      type?: "keyword" | "regex";
      description?: string;
    },
  ): void {
    return this.db.dbService.policy.updatePolicy(id, userId, updates);
  }

  public togglePolicyStatus(id: number, userId: number): void {
    return this.db.dbService.policy.togglePolicyStatus(id, userId);
  }

  public deletePolicy(id: number, userId: number): void {
    return this.db.dbService.policy.deletePolicy(id, userId);
  }
}
