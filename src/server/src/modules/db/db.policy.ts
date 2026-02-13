import { PolicyEntity } from "../../entities";
import { dbRepository } from "./db.repository";

export class Policy {
  private dbRepository: dbRepository;

  constructor(DB_PATH: string) {
    this.dbRepository = new dbRepository(DB_PATH);
  }

  public createPolicy(policyData: {
    userId: number;
    name: string;
    pattern: string;
    type: "keyword" | "regex";
    description?: string;
  }): PolicyEntity {
    return this.dbRepository.createPolicy(policyData);
  }

  public getPolicyById(id: number): PolicyEntity | null {
    return this.dbRepository.getPolicyById(id);
  }

  public getAllPoliciesByUserId(userId: number): PolicyEntity[] {
    return this.dbRepository.getAllPoliciesByUserId(userId);
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
    const policy = this.dbRepository.getPolicyById(id);

    if (!policy) {
      throw new Error("Policy not found");
    }

    if (policy.userId !== userId) {
      throw new Error("Unauthorized");
    }

    return this.dbRepository.updatePolicy(id, updates);
  }

  public togglePolicyStatus(id: number, userId: number): void {
    const policy = this.dbRepository.getPolicyById(id);

    if (!policy) {
      throw new Error("Policy not found");
    }

    if (policy.userId !== userId) {
      throw new Error("Unauthorized");
    }

    return this.dbRepository.togglePolicyStatus(id);
  }

  public deletePolicy(id: number, userId: number): void {
    const policy = this.dbRepository.getPolicyById(id);

    if (!policy) {
      throw new Error("Policy not found");
    }

    if (policy.userId !== userId) {
      throw new Error("Unauthorized");
    }

    return this.dbRepository.deletePolicyById(id);
  }
}
