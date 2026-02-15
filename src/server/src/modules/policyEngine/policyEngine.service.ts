import { PolicyEntity } from "../../entities";
import { PolicyMatcher } from "./policyEngine.matcher";
import {
  PolicyEngineResult,
  PolicyEvaluationResult,
  EvaluationOptions,
  DEFAULT_EVALUATION_OPTIONS,
} from "./policyEngine.types";

/**
 * Policy Engine Service - Evaluates content against policies
 * This is an internal service (no HTTP controller)
 */
export class PolicyEngineService {
  private matcher: PolicyMatcher;

  constructor() {
    this.matcher = new PolicyMatcher();
  }

  /**
   * Evaluate content against multiple policies
   * @param content The content to evaluate (file content, text, etc.)
   * @param policies Array of policies to evaluate against
   * @param options Evaluation options
   * @returns Results of evaluation
   */
  public evaluate(
    content: string,
    policies: PolicyEntity[],
    options: EvaluationOptions = {},
  ): PolicyEngineResult {
    // Merge with default options
    const evalOptions: Required<EvaluationOptions> = {
      ...DEFAULT_EVALUATION_OPTIONS,
      ...options,
    };

    // Filter policies
    const activePolicies = evalOptions.includeDisabled
      ? policies
      : policies.filter((p) => p.isEnabled);

    // Evaluate each policy
    const results: PolicyEvaluationResult[] = [];
    const errors: Array<{ policyId: number; error: string }> = [];
    let policiesMatched = 0;
    let totalMatches = 0;

    for (const policy of activePolicies) {
      const result = this.evaluatePolicy(
        content,
        policy,
        evalOptions,
      );
      results.push(result);

      if (result.error) {
        errors.push({ policyId: policy.id, error: result.error });
      }

      if (result.hasMatches) {
        policiesMatched++;
        totalMatches += result.matchCount;
      }
    }

    return {
      policiesEvaluated: activePolicies.length,
      policiesMatched,
      totalMatches,
      results,
      errors,
    };
  }

  /**
   * Evaluate content against a single policy
   */
  public evaluatePolicy(
    content: string,
    policy: PolicyEntity,
    options: EvaluationOptions = {},
  ): PolicyEvaluationResult {
    const evalOptions: Required<EvaluationOptions> = {
      ...DEFAULT_EVALUATION_OPTIONS,
      ...options,
    };

    try {
      // Validate regex if policy type is regex
      if (policy.type === "regex") {
        try {
          new RegExp(policy.pattern);
        } catch (error) {
          return {
            policy,
            hasMatches: false,
            matchCount: 0,
            matches: [],
            error: "Invalid regex pattern",
          };
        }
      }

      // Find matches
      const matches = this.matcher.findMatches(
        policy,
        content,
        evalOptions,
      );

      return {
        policy,
        hasMatches: matches.length > 0,
        matchCount: matches.length,
        matches,
      };
    } catch (error: any) {
      return {
        policy,
        hasMatches: false,
        matchCount: 0,
        matches: [],
        error: error.message || "Unknown error during evaluation",
      };
    }
  }

  /**
   * Check if content matches any policy (fast check, returns on first match)
   * Useful for quick validation
   */
  public hasAnyMatch(
    content: string,
    policies: PolicyEntity[],
    options: EvaluationOptions = {},
  ): boolean {
    const evalOptions: Required<EvaluationOptions> = {
      ...DEFAULT_EVALUATION_OPTIONS,
      ...options,
      maxMatchesPerPolicy: 1, // We only need to know if there's at least one match
    };

    const activePolicies = evalOptions.includeDisabled
      ? policies
      : policies.filter((p) => p.isEnabled);

    for (const policy of activePolicies) {
      const matches = this.matcher.findMatches(
        policy,
        content,
        evalOptions,
      );
      if (matches.length > 0) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get summary statistics from evaluation result
   */
  public getSummary(result: PolicyEngineResult): {
    policiesEvaluated: number;
    policiesMatched: number;
    policiesFailed: number;
    totalMatches: number;
    avgMatchesPerPolicy: number;
  } {
    return {
      policiesEvaluated: result.policiesEvaluated,
      policiesMatched: result.policiesMatched,
      policiesFailed: result.errors.length,
      totalMatches: result.totalMatches,
      avgMatchesPerPolicy:
        result.policiesMatched > 0
          ? result.totalMatches / result.policiesMatched
          : 0,
    };
  }
}
