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

import { SpanExporter } from '@opentelemetry/sdk-trace-base'
import * as openai from 'openai'
import * as anthropic from '@anthropic-ai/sdk'
import * as pinecone from '@pinecone-database/pinecone'
import * as llamaindex from 'llamaindex'
import * as chroma from 'chromadb'
export interface LangtraceInitOptions {
  // eslint-disable-next-line @typescript-eslint/member-delimiter-style
  api_key?: string, batch?: boolean, write_to_langtrace_cloud?: boolean, debug_log_to_console?: boolean, custom_remote_exporter?: SpanExporter, instrumentations?: {
    openai?: typeof openai.OpenAI
    anthropic?: typeof anthropic.Anthropic
    pinecone?: typeof pinecone.Pinecone
    llamaindex?: typeof llamaindex
    chromadb?: typeof chroma.ChromaClient
  }
}
export type LangTraceInit = (options?: LangtraceInitOptions) => void
