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

import { TiktokenEncoding, TiktokenModel } from 'tiktoken'

// https://github.com/dqbd/tiktoken/blob/main/wasm/src/lib.rs
export const TIKTOKEN_MODEL_MAPPING: Record<TiktokenModel | string, TiktokenEncoding> = {
  'gpt-4': 'cl100k_base',
  'gpt-4-32k': 'cl100k_base',
  'gpt-4-0125-preview': 'cl100k_base',
  'gpt-4-1106-preview': 'cl100k_base',
  'gpt-4-1106-vision-preview': 'cl100k_base',
  'gpt-4o': 'o200k_base',
  'gpt-4o-2024-05-13': 'o200k_base'
}

export const SERVICE_PROVIDERS = {
  OPENAI: 'OpenAI',
  ANTHROPIC: 'Anthropic',
  AZURE: 'Azure',
  LANGCHAIN: 'Langchain',
  PINECONE: 'Pinecone',
  LLAMAINDEX: 'LlamaIndex',
  CHROMA: 'Chroma',
  PPLX: 'Perplexity',
  QDRANT: 'Qdrant',
  WEAVIATE: 'Weaviate',
  PG: 'pg'
}
