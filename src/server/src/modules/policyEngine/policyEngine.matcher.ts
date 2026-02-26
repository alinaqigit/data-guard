import { PolicyEntity } from "../../entities";
import { PolicyMatch, EvaluationOptions } from "./policyEngine.types";

/**
 * Core pattern matching logic for policies
 */
export class PolicyMatcher {
  public findMatches(
    policy: PolicyEntity,
    content: string,
    options: Required<EvaluationOptions>,
  ): PolicyMatch[] {
    // Normalize type to lowercase — safety net for any case inconsistency
    const type = (policy.type || "").toLowerCase();

    if (type === "keyword") {
      return this.findKeywordMatches(policy, content, options);
    } else if (type === "regex") {
      return this.findRegexMatches(policy, content, options);
    }

    console.warn(`[PolicyMatcher] Unknown policy type: "${policy.type}" for policy ID ${policy.id}`);
    return [];
  }

  private findKeywordMatches(
    policy: PolicyEntity,
    content: string,
    options: Required<EvaluationOptions>,
  ): PolicyMatch[] {
    const matches: PolicyMatch[] = [];
    const pattern = options.caseInsensitive
      ? policy.pattern.toLowerCase()
      : policy.pattern;
    const searchContent = options.caseInsensitive
      ? content.toLowerCase()
      : content;

    let startIndex = 0;
    while (startIndex < searchContent.length) {
      const matchIndex = searchContent.indexOf(pattern, startIndex);
      if (matchIndex === -1) break;

      const endIndex = matchIndex + pattern.length;
      const matchedText = content.substring(matchIndex, endIndex);
      matches.push(this.createMatch(policy, matchedText, matchIndex, endIndex, content, options));

      if (options.maxMatchesPerPolicy > 0 && matches.length >= options.maxMatchesPerPolicy) break;
      startIndex = endIndex;
    }

    return matches;
  }

  private findRegexMatches(
    policy: PolicyEntity,
    content: string,
    options: Required<EvaluationOptions>,
  ): PolicyMatch[] {
    const matches: PolicyMatch[] = [];

    try {
      // "m" flag makes ^ and $ match line boundaries, not just start/end of entire string
      const flags = options.caseInsensitive ? "gim" : "gm";
      const regex = new RegExp(policy.pattern, flags);

      let match: RegExpExecArray | null;
      while ((match = regex.exec(content)) !== null) {
        const matchedText = match[0];
        const startIndex = match.index;
        const endIndex = startIndex + matchedText.length;

        matches.push(this.createMatch(policy, matchedText, startIndex, endIndex, content, options));

        if (options.maxMatchesPerPolicy > 0 && matches.length >= options.maxMatchesPerPolicy) break;

        // Prevent infinite loop on zero-length matches
        if (matchedText.length === 0) regex.lastIndex++;
      }
    } catch (error) {
      console.error(`[PolicyMatcher] Invalid regex pattern for policy "${policy.name}": ${policy.pattern}`);
      return [];
    }

    return matches;
  }

  private createMatch(
    policy: PolicyEntity,
    matchedText: string,
    startIndex: number,
    endIndex: number,
    content: string,
    options: Required<EvaluationOptions>,
  ): PolicyMatch {
    const { lineNumber, columnNumber } = this.getLineAndColumn(content, startIndex);
    const { contextBefore, contextAfter } = this.getContext(
      content, lineNumber, options.contextLinesBefore, options.contextLinesAfter,
    );

    return { policy, matchedText, startIndex, endIndex, lineNumber, columnNumber, contextBefore, contextAfter };
  }

  private getLineAndColumn(content: string, index: number): { lineNumber: number; columnNumber: number } {
    const beforeMatch = content.substring(0, index);
    const lines = beforeMatch.split("\n");
    return { lineNumber: lines.length, columnNumber: lines[lines.length - 1].length + 1 };
  }

  private getContext(
    content: string,
    lineNumber: number,
    linesBefore: number,
    linesAfter: number,
  ): { contextBefore: string[]; contextAfter: string[] } {
    const allLines = content.split("\n");
    const startLine = Math.max(0, lineNumber - linesBefore - 1);
    const endLine = Math.min(allLines.length, lineNumber + linesAfter);
    return {
      contextBefore: allLines.slice(startLine, lineNumber - 1),
      contextAfter: allLines.slice(lineNumber, endLine),
    };
  }
}