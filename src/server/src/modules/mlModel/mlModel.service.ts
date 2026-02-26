/**
 * ML Model Service
 * Calls the DataGuard HuggingFace API to classify text as LEAK or SAFE.
 * Acts as the authoritative final step in the DLP pipeline — regex finds
 * candidates, ML decides if they are real leaks.
 */

const ML_API_URL = "https://theinvinciblehasnainali-dataguard-api.hf.space/scan";
const ML_API_KEY = "DG-2026-Secure-786";

export type ModelTier = "base" | "small" | "tiny";
export type MLVerdict = "LEAK" | "SAFE";

export interface MLResult {
  verdict: MLVerdict;
  confidence: number; // 0-100
  modelTier: ModelTier;
  textAnalyzed: string;
}

// Map sensitivity setting → model tier
export function sensitivityToTier(sensitivity: "Low" | "Medium" | "High"): ModelTier {
  switch (sensitivity) {
    case "Low":    return "base";   // biggest, most accurate, slowest
    case "Medium": return "small";  // balanced
    case "High":   return "tiny";   // fastest, least accurate
  }
}

/**
 * Classify a single line of text using the ML model.
 * Returns null if the API call fails (treat as SAFE to avoid false positives).
 */
export async function classifyText(
  text: string,
  tier: ModelTier,
): Promise<MLResult | null> {
  try {
    const response = await fetch(ML_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": ML_API_KEY,
      },
      body: JSON.stringify({ text, tier }),
    });

    if (!response.ok) {
      console.warn(`[ML] API returned ${response.status} for tier=${tier}`);
      return null;
    }

    const data = await response.json();

    // Parse prediction: "🔴 LEAK" → "LEAK", "🟢 SAFE" → "SAFE"
    const predictionStr: string = data.prediction || "";
    const verdict: MLVerdict = predictionStr.includes("LEAK") ? "LEAK" : "SAFE";

    // Parse confidence: "98.5%" → 98.5
    const confidenceStr: string = data.confidence || "0%";
    const confidence = parseFloat(confidenceStr.replace("%", "")) || 0;

    return {
      verdict,
      confidence,
      modelTier: (data.model_tier as ModelTier) || tier,
      textAnalyzed: data.text_analyzed || text,
    };
  } catch (err: any) {
    console.warn(`[ML] API call failed: ${err.message}`);
    return null;
  }
}

/**
 * Classify multiple lines (one per regex match) in parallel.
 * Only returns lines the model confirmed as LEAK.
 */
export async function classifyMatches(
  matchedLines: string[],
  tier: ModelTier,
): Promise<{ line: string; confidence: number }[]> {
  const results = await Promise.all(
    matchedLines.map(async (line) => {
      const result = await classifyText(line, tier);
      if (!result || result.verdict === "SAFE") return null;
      return { line, confidence: result.confidence };
    }),
  );

  return results.filter((r): r is { line: string; confidence: number } => r !== null);
}