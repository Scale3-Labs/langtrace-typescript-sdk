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

import { DiagLogLevel, DiagLogger } from '@opentelemetry/api'
import { SpanExporter } from '@opentelemetry/sdk-trace-base'

export type InstrumentationType = 'openai' | 'cohere' | 'anthropic' | 'groq' | 'pinecone' | 'llamaindex' | 'chromadb' | 'qdrant' | 'weaviate' | 'pg'

export interface LangtraceInitOptions {
  api_key?: string
  batch?: boolean
  write_spans_to_console?: boolean
  custom_remote_exporter?: SpanExporter
  api_host?: string
  disable_instrumentations?: {
    all_except?: InstrumentationType[]
    only?: InstrumentationType[]
  }
  logging?: {
    level?: DiagLogLevel
    logger?: DiagLogger
    disable?: boolean
  }
  instrumentations?: { [key in InstrumentationType]?: any }
}
export type LangTraceInit = (options?: LangtraceInitOptions) => void
