import { PolicyEntity } from "../../entities";

/**
 * Represents a single match found when evaluating content against a policy
 */
export interface PolicyMatch {
  /** The policy that matched */
  policy: PolicyEntity;
  /** The matched text/content */
  matchedText: string;
  /** Position of match in content (character index) */
  startIndex: number;
  /** End position of match in content */
  endIndex: number;
  /** Line number where match was found (1-based) */
  lineNumber: number;
  /** Column number where match starts (1-based) */
  columnNumber: number;
  /** Context: lines surrounding the match (for display) */
  contextBefore: string[];
  contextAfter: string[];
}

/**
 * Result of evaluating content against a single policy
 */
export interface PolicyEvaluationResult {
  /** The policy that was evaluated */
  policy: PolicyEntity;
  /** Whether any matches were found */
  hasMatches: boolean;
  /** Number of matches found */
  matchCount: number;
  /** All matches found */
  matches: PolicyMatch[];
  /** Error if evaluation failed */
  error?: string;
}

/**
 * Result of evaluating content against multiple policies
 */
export interface PolicyEngineResult {
  /** Total number of policies evaluated */
  policiesEvaluated: number;
  /** Number of policies with matches */
  policiesMatched: number;
  /** Total matches found across all policies */
  totalMatches: number;
  /** Results for each policy */
  results: PolicyEvaluationResult[];
  /** Policies that had errors during evaluation */
  errors: Array<{ policyId: number; error: string }>;
}

/**
 * Options for policy evaluation
 */
export interface EvaluationOptions {
  /** Maximum number of matches to return per policy (0 = unlimited) */
  maxMatchesPerPolicy?: number;
  /** Number of lines to include before match for context */
  contextLinesBefore?: number;
  /** Number of lines to include after match for context */
  contextLinesAfter?: number;
  /** Case-insensitive matching for keyword policies */
  caseInsensitive?: boolean;
  /** Include disabled policies in evaluation */
  includeDisabled?: boolean;
}

/**
 * Default evaluation options
 */
export const DEFAULT_EVALUATION_OPTIONS: Required<EvaluationOptions> =
  {
    maxMatchesPerPolicy: 100,
    contextLinesBefore: 2,
    contextLinesAfter: 2,
    caseInsensitive: false,
    includeDisabled: false,
  };
