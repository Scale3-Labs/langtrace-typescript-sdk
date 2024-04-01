/*
 * Copyright (c) 2024 Scale3 Labs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
