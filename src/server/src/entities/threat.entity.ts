/**
 * Structured detail for a single policy match inside a threat.
 */
export interface ThreatMatchDetail {
  lineNumber: number;
  columnNumber: number;
  matchedText: string;
  contextBefore: string[];
  contextAfter: string[];
}

/**
 * Structured detail for a single policy violation inside a threat.
 */
export interface ThreatPolicyDetail {
  policyId: number;
  policyName: string;
  matchCount: number;
  matches: ThreatMatchDetail[];
}

/**
 * Full structured details stored as JSON in the `details` column.
 */
export interface ThreatDetails {
  totalMatches: number;
  policiesViolated: ThreatPolicyDetail[];
}

export interface ThreatEntity {
  id: number;
  userId: number;
  scanId: number;
  severity: "High" | "Medium" | "Low";
  type: string;
  description: string;
  details?: ThreatDetails | null;
  source: string;
  status: "New" | "Investigating" | "Quarantined" | "Resolved";
  filePath: string;
  createdAt: string;
  updatedAt: string;
}
