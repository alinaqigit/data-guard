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
    // 1. Validate type field
    if (dto.type !== "keyword" && dto.type !== "regex") {
      return {
        status: 400,
        error: "Type must be either 'keyword' or 'regex'",
      };
    }

    // 2. Validate regex pattern if type is regex
    if (dto.type === "regex") {
      try {
        new RegExp(dto.pattern);
      } catch (error) {
        return {
          status: 400,
          error: "Invalid regex pattern",
        };
      }
    }

    // 3. Create policy
    try {
      const policy = this.policyRepository.createPolicy({
        userId,
        name: dto.name,
        pattern: dto.pattern,
        type: dto.type as "keyword" | "regex",
        description: dto.description || undefined,
      });

      return {
        status: 201,
        body: policy,
      };
    } catch (error: any) {
      return {
        status: 500,
        error: error.message || "Failed to create policy",
      };
    }
  }

  public async getPolicyById(
    id: number,
    userId: number,
  ): Promise<policyResponse> {
    const policy = this.policyRepository.getPolicyById(id);

    if (!policy) {
      return {
        status: 404,
        error: "Policy not found",
      };
    }

    // Ensure user owns this policy
    if (policy.userId !== userId) {
      return {
        status: 403,
        error: "Access denied",
      };
    }

    return {
      status: 200,
      body: policy,
    };
  }

  public async getAllPolicies(
    userId: number,
  ): Promise<policyResponse> {
    const policies =
      this.policyRepository.getAllPoliciesByUserId(userId);

    return {
      status: 200,
      body: policies,
    };
  }

  public async updatePolicy(
    id: number,
    dto: updatePolicyDTO,
    userId: number,
  ): Promise<policyResponse> {
    // 1. Check if policy exists and user owns it
    const existingPolicy = this.policyRepository.getPolicyById(id);

    if (!existingPolicy) {
      return {
        status: 404,
        error: "Policy not found",
      };
    }

    if (existingPolicy.userId !== userId) {
      return {
        status: 403,
        error: "Access denied",
      };
    }

    // 2. Validate type if provided
    if (dto.type && dto.type !== "keyword" && dto.type !== "regex") {
      return {
        status: 400,
        error: "Type must be either 'keyword' or 'regex'",
      };
    }

    // 3. Validate regex pattern if type is regex
    if (
      dto.type === "regex" ||
      (existingPolicy.type === "regex" && dto.pattern)
    ) {
      try {
        new RegExp(dto.pattern || existingPolicy.pattern);
      } catch (error) {
        return {
          status: 400,
          error: "Invalid regex pattern",
        };
      }
    }

    // 4. Update policy
    try {
      this.policyRepository.updatePolicy(id, userId, {
        name: dto.name,
        pattern: dto.pattern,
        type: dto.type as "keyword" | "regex" | undefined,
        description: dto.description,
      });

      // Get updated policy
      const updatedPolicy = this.policyRepository.getPolicyById(id);

      return {
        status: 200,
        body: updatedPolicy,
      };
    } catch (error: any) {
      return {
        status: 500,
        error: error.message || "Failed to update policy",
      };
    }
  }

  public async togglePolicyStatus(
    id: number,
    userId: number,
  ): Promise<policyResponse> {
    // 1. Check if policy exists and user owns it
    const policy = this.policyRepository.getPolicyById(id);

    if (!policy) {
      return {
        status: 404,
        error: "Policy not found",
      };
    }

    if (policy.userId !== userId) {
      return {
        status: 403,
        error: "Access denied",
      };
    }

    // 2. Toggle policy status
    try {
      this.policyRepository.togglePolicyStatus(id, userId);

      // Get updated policy
      const updatedPolicy = this.policyRepository.getPolicyById(id);

      return {
        status: 200,
        body: updatedPolicy,
      };
    } catch (error: any) {
      return {
        status: 500,
        error: error.message || "Failed to toggle policy status",
      };
    }
  }

  public async deletePolicy(
    id: number,
    userId: number,
  ): Promise<policyResponse> {
    // 1. Check if policy exists and user owns it
    const policy = this.policyRepository.getPolicyById(id);

    if (!policy) {
      return {
        status: 404,
        error: "Policy not found",
      };
    }

    if (policy.userId !== userId) {
      return {
        status: 403,
        error: "Access denied",
      };
    }

    // 2. Delete policy
    try {
      this.policyRepository.deletePolicy(id, userId);

      return {
        status: 200,
        body: {
          message: "Policy deleted successfully",
        },
      };
    } catch (error: any) {
      return {
        status: 500,
        error: error.message || "Failed to delete policy",
      };
    }
  }
}
