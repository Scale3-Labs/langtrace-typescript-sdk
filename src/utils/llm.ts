import { TIKTOKEN_MODEL_MAPPING } from '@langtrace-constants/instrumentation/common'
import { TiktokenEncoding, get_encoding } from 'tiktoken'

export function estimateTokens (prompt: string): number {
  if (prompt.length > 0) {
    // Simplified token estimation: count the words.
    return prompt.split(/\s+/).filter(Boolean).length
  }
  return 0
}

export function estimateTokensUsingTikToken (
  prompt: string,
  model: TiktokenEncoding
): number {
  const encoding = get_encoding(model)
  const tokens = encoding.encode(prompt)
  return tokens.length
}

export function calculatePromptTokens (
  promptContent: string,
  model: string
): number {
  try {
    const tiktokenModel = TIKTOKEN_MODEL_MAPPING[model]
    return estimateTokensUsingTikToken(promptContent, tiktokenModel)
  } catch (error) {
    return estimateTokens(promptContent) // Fallback method
  }
}
