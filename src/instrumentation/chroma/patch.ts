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

import { LANGTRACE_ADDITIONAL_SPAN_ATTRIBUTES_KEY } from '@langtrace-constants/common'
import { APIS } from '@langtrace-constants/instrumentation/chroma'
import { SERVICE_PROVIDERS } from '@langtrace-constants/instrumentation/common'
import { DatabaseSpanAttributes } from '@langtrase/trace-attributes'
import {
  Exception,
  SpanKind,
  SpanStatusCode,
  Tracer,
  context,
  trace
} from '@opentelemetry/api'

export function collectionPatch (
  originalMethod: (...args: any[]) => any,
  method: string,
  tracer: Tracer,
  langtraceVersion: string,
  version?: string
): (...args: any[]) => any {
  return async function (this: any, ...args: any[]) {
    const originalContext = this
    const api = APIS[method]
    // Extract custom attributes from the current context
    const customAttributes = context.active().getValue(LANGTRACE_ADDITIONAL_SPAN_ATTRIBUTES_KEY) ?? {}
    const attributes: DatabaseSpanAttributes = {
      'langtrace.sdk.name': '@langtrase/typescript-sdk',
      'langtrace.service.name': SERVICE_PROVIDERS.CHROMA,
      'langtrace.service.type': 'vectordb',
      'langtrace.service.version': version ?? 'latest',
      'langtrace.version': langtraceVersion,
      'db.system': 'chromadb',
      'db.operation': api.OPERATION,
      ...customAttributes
    }

    if (this.name !== undefined) {
      attributes['db.collection.name'] = this.name
    }

    if (this.api?.basePath !== undefined) {
      attributes['server.address'] = this.api.basePath
    }

    if (this.embeddingFunction?.model !== undefined) {
      attributes['db.chromadb.embedding_model'] = this.embeddingFunction.model
    }

    const span = tracer.startSpan(api.METHOD, { kind: SpanKind.CLIENT, attributes })
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return await context.with(
      trace.setSpan(context.active(), trace.getSpan(context.active()) ?? span),
      async () => {
        try {
          // NOTE: Not tracing the response data as it can contain sensitive information
          const response = await originalMethod.apply(originalContext, args)

          span.setStatus({ code: SpanStatusCode.OK })
          span.end()
          return response
        } catch (error: any) {
          span.recordException(error as Exception)
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error.message
          })
          span.end()
          throw error
        }
      }
    )
  }
}
