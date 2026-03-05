// Threats API Service — communicates with /api/threats endpoints

import { api } from "./client";

export interface ApiThreatMatchDetail {
  lineNumber: number;
  columnNumber: number;
  matchedText: string;
  contextBefore: string[];
  contextAfter: string[];
}

export interface ApiThreatPolicyDetail {
  policyId: number;
  policyName: string;
  matchCount: number;
  matches: ApiThreatMatchDetail[];
}

export interface ApiThreatDetails {
  totalMatches: number;
  policiesViolated: ApiThreatPolicyDetail[];
}

export interface ApiThreat {
  id: number;
  userId: number;
  scanId: number;
  severity: "High" | "Medium" | "Low";
  type: string;
  description: string;
  details?: ApiThreatDetails | null;
  source: string;
  status: "New" | "Investigating" | "Quarantined" | "Resolved";
  filePath: string;
  createdAt: string;
  updatedAt: string;
}

export const threatsService = {
  /** Fetch all threats for the authenticated user */
  getAllThreats: () =>
    api.get<{ threats: ApiThreat[] }>("/api/threats", true),

  /** Update a threat's status */
  updateThreatStatus: (
    id: number,
    status: "New" | "Investigating" | "Quarantined" | "Resolved",
  ) =>
    api.patch<{ message: string }>(
      `/api/threats/${id}/status`,
      { status },
      true,
    ),

  /** Delete a single threat */
  deleteThreat: (id: number) =>
    api.delete<{ message: string }>(`/api/threats/${id}`, true),

  /** Delete all threats */
  deleteAllThreats: () =>
    api.delete<{ message: string }>("/api/threats", true),
};
