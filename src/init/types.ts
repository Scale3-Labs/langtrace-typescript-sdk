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

import { FrameworkSpanAttributeNames, Vendor } from '@langtrase/trace-attributes'
import { DatabaseSpanAttributeNames, LLMSpanAttributeNames, VendorTracedFunctions } from '@langtrase/trace-attributes/dist/constants/common'
import { DiagLogLevel, DiagLogger } from '@opentelemetry/api'
import { SpanExporter } from '@opentelemetry/sdk-trace-base'

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
  service_name?: string
  disable_latest_version_check?: boolean
  disable_tracing_for_functions?: Partial<VendorTracedFunctions>
  instrumentations?: { [key in Vendor]?: any }
  disable_tracing_attributes?: DropAttributes
}

type DropAttributes = typeof LLMSpanAttributeNames | typeof DatabaseSpanAttributeNames | typeof FrameworkSpanAttributeNames

export type LangTraceInit = (options?: LangtraceInitOptions) => void
