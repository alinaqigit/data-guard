// Policy API Service

import { api } from "./client";
import {
  Policy,
  CreatePolicyRequest,
  UpdatePolicyRequest,
} from "./types";

export const policyService = {
  /**
   * Get all policies for the current user
   */
  async getAllPolicies(): Promise<Policy[]> {
    return api.get<Policy[]>("/api/policies", true);
  },

  /**
   * Get a single policy by ID
   */
  async getPolicyById(id: number): Promise<Policy> {
    return api.get<Policy>(`/api/policies/${id}`, true);
  },

  /**
   * Create a new policy
   */
  async createPolicy(data: CreatePolicyRequest): Promise<Policy> {
    return api.post<Policy>("/api/policies", data, true);
  },

  /**
   * Update an existing policy
   */
  async updatePolicy(
    id: number,
    data: UpdatePolicyRequest,
  ): Promise<Policy> {
    return api.put<Policy>(`/api/policies/${id}`, data, true);
  },

  /**
   * Toggle policy enabled status
   */
  async togglePolicy(id: number): Promise<Policy> {
    return api.patch<Policy>(
      `/api/policies/${id}/toggle`,
      undefined,
      true,
    );
  },

  /**
   * Delete a policy
   */
  async deletePolicy(id: number): Promise<{ message: string }> {
    return api.delete<{ message: string }>(
      `/api/policies/${id}`,
      true,
    );
  },
};
