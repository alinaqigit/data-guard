import { PolicyEntity } from "../../entities";
import { PolicyMatch, EvaluationOptions } from "./policyEngine.types";

/**
 * Core pattern matching logic for policies
 */
export class PolicyMatcher {
  /**
   * Find all matches for a policy in the given content
   */
  public findMatches(
    policy: PolicyEntity,
    content: string,
    options: Required<EvaluationOptions>,
  ): PolicyMatch[] {
    if (policy.type === "keyword") {
      return this.findKeywordMatches(policy, content, options);
    } else if (policy.type === "regex") {
      return this.findRegexMatches(policy, content, options);
    }
    return [];
  }

  /**
   * Find keyword matches (simple string search)
   */
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

      // Extract the actual matched text from original content (not lowercased)
      const matchedText = content.substring(matchIndex, endIndex);

      const match = this.createMatch(
        policy,
        matchedText,
        matchIndex,
        endIndex,
        content,
        options,
      );

      matches.push(match);

      // Check if we've reached the limit
      if (
        options.maxMatchesPerPolicy > 0 &&
        matches.length >= options.maxMatchesPerPolicy
      ) {
        break;
      }

      startIndex = endIndex;
    }

    return matches;
  }

  /**
   * Find regex matches
   */
  private findRegexMatches(
    policy: PolicyEntity,
    content: string,
    options: Required<EvaluationOptions>,
  ): PolicyMatch[] {
    const matches: PolicyMatch[] = [];

    try {
      // Create regex with global flag
      const flags = options.caseInsensitive ? "gi" : "g";
      const regex = new RegExp(policy.pattern, flags);

      let match: RegExpExecArray | null;

      while ((match = regex.exec(content)) !== null) {
        const matchedText = match[0];
        const startIndex = match.index;
        const endIndex = startIndex + matchedText.length;

        const policyMatch = this.createMatch(
          policy,
          matchedText,
          startIndex,
          endIndex,
          content,
          options,
        );

        matches.push(policyMatch);

        // Check if we've reached the limit
        if (
          options.maxMatchesPerPolicy > 0 &&
          matches.length >= options.maxMatchesPerPolicy
        ) {
          break;
        }

        // Prevent infinite loop on zero-length matches
        if (matchedText.length === 0) {
          regex.lastIndex++;
        }
      }
    } catch (error) {
      // Invalid regex - return empty matches (error will be caught at higher level)
      return [];
    }

    return matches;
  }

  /**
   * Create a PolicyMatch object with line/column info and context
   */
  private createMatch(
    policy: PolicyEntity,
    matchedText: string,
    startIndex: number,
    endIndex: number,
    content: string,
    options: Required<EvaluationOptions>,
  ): PolicyMatch {
    const { lineNumber, columnNumber } = this.getLineAndColumn(
      content,
      startIndex,
    );
    const { contextBefore, contextAfter } = this.getContext(
      content,
      lineNumber,
      options.contextLinesBefore,
      options.contextLinesAfter,
    );

    return {
      policy,
      matchedText,
      startIndex,
      endIndex,
      lineNumber,
      columnNumber,
      contextBefore,
      contextAfter,
    };
  }

  /**
   * Get line number and column number for a character index
   */
  private getLineAndColumn(
    content: string,
    index: number,
  ): { lineNumber: number; columnNumber: number } {
    const beforeMatch = content.substring(0, index);
    const lines = beforeMatch.split("\n");
    const lineNumber = lines.length;
    const columnNumber = lines[lines.length - 1].length + 1;

    return { lineNumber, columnNumber };
  }

  /**
   * Get context lines before and after a match
   */
  private getContext(
    content: string,
    lineNumber: number,
    linesBefore: number,
    linesAfter: number,
  ): { contextBefore: string[]; contextAfter: string[] } {
    const allLines = content.split("\n");
    const startLine = Math.max(0, lineNumber - linesBefore - 1);
    const endLine = Math.min(
      allLines.length,
      lineNumber + linesAfter,
    );

    const contextBefore = allLines.slice(startLine, lineNumber - 1);
    const contextAfter = allLines.slice(lineNumber, endLine);

    return { contextBefore, contextAfter };
  }
}
