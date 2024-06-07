
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

// Import the necessary modules
import { init } from '@langtrace-init/init'
import { LangTraceInit, LangtraceInitOptions } from '@langtrace-init/types'
import { withLangTraceRootSpan, withAdditionalAttributes } from '@langtrace-utils/instrumentation'
import { getPromptFromRegistry, sendUserFeedback } from '@langtrace-utils/langtrace'
import { LangtracePrompt } from '@langtrace-utils/types'
import { OpenAIFunctions } from '@langtrace-constants/instrumentation/openai'
import { GroqFunctions } from '@langtrace-constants/instrumentation/groq'
import { PgFunctions } from '@langtrace-constants/instrumentation/pg'
import { LlamaIndexFunctions } from '@langtrace-constants/instrumentation/llamaindex'
import { AnthropicFunctions } from '@langtrace-constants/instrumentation/anthropic'
import { QdrantFunctions } from '@langtrace-constants/instrumentation/qdrant'
import { WeaviateFunctions } from '@langtrace-constants/instrumentation/weaviate'
import { ChromadbFunctions } from '@langtrace-constants/instrumentation/chroma'
import { PineConeFunctions } from '@langtrace-constants/instrumentation/pinecone'
import { CohereFunctions } from '@langtrace-constants/instrumentation/cohere'
import { Event } from '@langtrace-constants/common'

export {
  // Features
  init,
  withLangTraceRootSpan,
  LangTraceInit,
  LangtraceInitOptions,
  withAdditionalAttributes,
  getPromptFromRegistry,
  LangtracePrompt,
  sendUserFeedback,
  // Instrumentation functions
  OpenAIFunctions,
  GroqFunctions,
  PgFunctions,
  LlamaIndexFunctions,
  AnthropicFunctions,
  QdrantFunctions,
  WeaviateFunctions,
  ChromadbFunctions,
  PineConeFunctions,
  CohereFunctions,
  // Common
  Event
}
