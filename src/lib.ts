import { TiktokenEncoding, get_encoding } from "tiktoken";
import { COST_TABLE } from "./constants";

export function estimateTokens(prompt: string): number {
  if (prompt && prompt.length > 0) {
    // Simplified token estimation: count the words.
    return prompt.split(/\s+/).filter(Boolean).length;
  }
  return 0;
}

export function estimateTokensUsingTikToken(
  prompt: string,
  model: TiktokenEncoding
): number {
  const encoding = get_encoding(model);
  const tokens = encoding.encode(prompt);
  return tokens.length;
}

export function calculatePriceFromUsage(
  model: string,
  usage: { prompt_tokens: number; completion_tokens: number }
): number {
  const costTable = COST_TABLE[model];
  if (costTable) {
    return (
      (costTable.input * usage.prompt_tokens +
        costTable.output * usage.completion_tokens) /
      1000
    );
  }
  return 0;
}
