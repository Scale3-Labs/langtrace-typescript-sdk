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

import { AnthropicFunctions } from '@langtrace-constants/instrumentation/anthropic'
import { ChromadbFunctions } from '@langtrace-constants/instrumentation/chroma'
import { CohereFunctions } from '@langtrace-constants/instrumentation/cohere'
import { GroqFunctions } from '@langtrace-constants/instrumentation/groq'
import { LlamaIndexFunctions } from '@langtrace-constants/instrumentation/llamaindex'
import { OpenAIFunctions } from '@langtrace-constants/instrumentation/openai'
import { PgFunctions } from '@langtrace-constants/instrumentation/pg'
import { PineConeFunctions } from '@langtrace-constants/instrumentation/pinecone'
import { QdrantFunctions } from '@langtrace-constants/instrumentation/qdrant'
import { WeaviateFunctions } from '@langtrace-constants/instrumentation/weaviate'
import { DiagLogLevel, DiagLogger } from '@opentelemetry/api'
import { SpanExporter } from '@opentelemetry/sdk-trace-base'

export const Vendors = {
  OPENAI: 'openai',
  COHERE: 'cohere',
  ANTHROPIC: 'anthropic',
  GROQ: 'groq',
  PINECONE: 'pinecone',
  LLAMAINDEX: 'llamaindex',
  CHROMADB: 'chromadb',
  QDRANT: 'qdrant',
  WEAVIATE: 'weaviate',
  PG: 'pg'
} as const

export type Vendor = typeof Vendors[keyof typeof Vendors]

export interface LangtraceInitOptions {
  api_key?: string
  batch?: boolean
  write_spans_to_console?: boolean
  custom_remote_exporter?: SpanExporter
  api_host?: string
  disable_instrumentations?: {
    all_except?: Vendor[]
    only?: Vendor[]
  }
  logging?: {
    level?: DiagLogLevel
    logger?: DiagLogger
    disable?: boolean
  }
  disable_latest_version_check?: boolean
  disable_tracing_for_functions?: Partial<VendorTracedFunctions>
  instrumentations?: { [key in Vendor]?: any }
}

interface VendorInstrumentationFunctions {
  openai: OpenAIFunctions[]
  cohere: CohereFunctions[]
  anthropic: AnthropicFunctions[]
  groq: GroqFunctions[]
  pinecone: PineConeFunctions[]
  llamaindex: LlamaIndexFunctions[]
  chromadb: ChromadbFunctions[]
  qdrant: QdrantFunctions[]
  weaviate: WeaviateFunctions[]
  pg: PgFunctions[]
}

// DisableTracing interface that enforces keys to match InstrumentationType
export type VendorTracedFunctions = {
  [key in Vendor]: VendorInstrumentationFunctions[key]
}

export type LangTraceInit = (options?: LangtraceInitOptions) => void
