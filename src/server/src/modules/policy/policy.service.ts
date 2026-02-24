import { policyRepository } from "./policy.repository";
import { policyResponse } from "./policy.types";
import { createPolicyDTO, updatePolicyDTO } from "./dto";

export class policyService {
  private readonly policyRepository: policyRepository;

  constructor(DB_PATH: string) {
    this.policyRepository = new policyRepository(DB_PATH);
  }

  public async createPolicy(
    dto: createPolicyDTO,
    userId: number,
  ): Promise<policyResponse> {
    // Normalize to lowercase — frontend sends "KEYWORD"/"REGEX"
    const type = (dto.type || "").toLowerCase() as "keyword" | "regex";

    if (type !== "keyword" && type !== "regex") {
      return { status: 400, error: "Type must be either 'keyword' or 'regex'" };
    }

    if (type === "regex") {
      try {
        new RegExp(dto.pattern);
      } catch (error) {
        return { status: 400, error: "Invalid regex pattern" };
      }
    }

    try {
      const policy = this.policyRepository.createPolicy({
        userId,
        name: dto.name,
        pattern: dto.pattern,
        type,
        description: dto.description || undefined,
      });
      return { status: 201, body: policy };
    } catch (error: any) {
      return { status: 500, error: error.message || "Failed to create policy" };
    }
  }

  public async getPolicyById(id: number, userId: number): Promise<policyResponse> {
    const policy = this.policyRepository.getPolicyById(id);
    if (!policy) return { status: 404, error: "Policy not found" };
    if (policy.userId !== userId) return { status: 403, error: "Access denied" };
    return { status: 200, body: policy };
  }

  public async getAllPolicies(userId: number): Promise<policyResponse> {
    const policies = this.policyRepository.getAllPoliciesByUserId(userId);
    return { status: 200, body: policies };
  }

  public async updatePolicy(
    id: number,
    dto: updatePolicyDTO,
    userId: number,
  ): Promise<policyResponse> {
    const existingPolicy = this.policyRepository.getPolicyById(id);
    if (!existingPolicy) return { status: 404, error: "Policy not found" };
    if (existingPolicy.userId !== userId) return { status: 403, error: "Access denied" };

    // Normalize type to lowercase
    const type = dto.type
      ? (dto.type.toLowerCase() as "keyword" | "regex")
      : undefined;

    if (type && type !== "keyword" && type !== "regex") {
      return { status: 400, error: "Type must be either 'keyword' or 'regex'" };
    }

    const effectiveType = type || existingPolicy.type;
    if (effectiveType === "regex") {
      try {
        new RegExp(dto.pattern || existingPolicy.pattern);
      } catch (error) {
        return { status: 400, error: "Invalid regex pattern" };
      }
    }

    try {
      this.policyRepository.updatePolicy(id, userId, {
        name: dto.name,
        pattern: dto.pattern,
        type,
        description: dto.description,
      });
      const updatedPolicy = this.policyRepository.getPolicyById(id);
      return { status: 200, body: updatedPolicy };
    } catch (error: any) {
      return { status: 500, error: error.message || "Failed to update policy" };
    }
  }

  public async togglePolicyStatus(id: number, userId: number): Promise<policyResponse> {
    const policy = this.policyRepository.getPolicyById(id);
    if (!policy) return { status: 404, error: "Policy not found" };
    if (policy.userId !== userId) return { status: 403, error: "Access denied" };

    try {
      this.policyRepository.togglePolicyStatus(id, userId);
      const updatedPolicy = this.policyRepository.getPolicyById(id);
      return { status: 200, body: updatedPolicy };
    } catch (error: any) {
      return { status: 500, error: error.message || "Failed to toggle policy status" };
    }
  }

  public async deletePolicy(id: number, userId: number): Promise<policyResponse> {
    const policy = this.policyRepository.getPolicyById(id);
    if (!policy) return { status: 404, error: "Policy not found" };
    if (policy.userId !== userId) return { status: 403, error: "Access denied" };

    try {
      this.policyRepository.deletePolicy(id, userId);
      return { status: 200, body: { message: "Policy deleted successfully" } };
    } catch (error: any) {
      return { status: 500, error: error.message || "Failed to delete policy" };
    }
  }
}