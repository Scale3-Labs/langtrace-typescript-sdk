/* eslint-disable @typescript-eslint/no-unsafe-return */
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

import { APIS, DatabaseSpanAttributes, Event, Vendors } from '@langtrase/trace-attributes'
import { Tracer, context, trace, SpanKind, SpanStatusCode, Exception } from '@opentelemetry/api'
import { LANGTRACE_ADDITIONAL_SPAN_ATTRIBUTES_KEY } from '@langtrace-constants/common'
import { addSpanEvent } from '@langtrace-utils/misc'
import { LangtraceSdkError } from 'errors/sdk_error'

export function genericPatch (
  originalMethod: (...args: any[]) => any,
  method: string,
  tracer: Tracer,
  langtraceVersion: string,
  version?: string
): (...args: any[]) => any {
  return async function (this: any, ...args: any[]): Promise<any> {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const originalContext = this
    const api = APIS.pinecone[method as keyof typeof APIS.pinecone]
    const customAttributes = context.active().getValue(LANGTRACE_ADDITIONAL_SPAN_ATTRIBUTES_KEY) ?? {}
    const attributes: DatabaseSpanAttributes = {
      'langtrace.sdk.name': '@langtrase/typescript-sdk',
      'langtrace.service.name': Vendors.PINECONE,
      'langtrace.service.type': 'vectordb',
      'langtrace.service.version': version,
      'langtrace.version': langtraceVersion,
      'db.system': 'pinecone',
      'db.operation': api.OPERATION,
      'db.query': JSON.stringify(args),
      ...customAttributes
    }
    const spanName = customAttributes['langtrace.span.name' as keyof typeof customAttributes] ?? api.METHOD
    const span = tracer.startSpan(spanName, { kind: SpanKind.CLIENT, attributes }, context.active())
    return await context.with(
      trace.setSpan(context.active(), span),
      async () => {
        try {
          if (this.target?.index !== undefined) {
            span.setAttributes({ 'db.index': this.target?.index })
          }
          if (this.target?.namespace !== undefined) {
            span.setAttributes({ 'db.namespace': this.target?.namespace })
          }
          if (this.target?.indexHostUrl !== undefined) {
            span.setAttributes({ 'server.address': `${this.target?.indexHostUrl}${api.ENDPOINT}` })
          }
          if (args[0]?.topK !== undefined) {
            span.setAttributes({ 'db.top_k': args[0]?.topK })
          }

          // Call the original create method
          // NOTE: Not tracing the response data as it can contain sensitive information
          const response = await originalMethod.apply(originalContext, args)
          if (response !== undefined) {
            addSpanEvent(span, Event.RESPONSE, { 'db.response': JSON.stringify(response) })
          }
          span.setStatus({ code: SpanStatusCode.OK })
          span.end()
          return response
        } catch (error: any) {
          // If an error occurs, record the exception and end the span
          span.recordException(error as Exception)
          span.setStatus({ code: SpanStatusCode.ERROR })
          span.end()
          throw new LangtraceSdkError(error.message as string, error.stack as string)
        }
      }
    )
  }
}
