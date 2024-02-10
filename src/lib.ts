import { TiktokenEncoding, get_encoding } from "tiktoken";

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
