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
import { addSpanEvent } from '@langtrace-utils/misc'
import { APIS, DatabaseSpanAttributes, Event, Vendors } from '@langtrase/trace-attributes'
import { Exception, SpanKind, SpanStatusCode, Tracer, context, trace } from '@opentelemetry/api'
import { LangtraceSdkError } from 'errors/sdk_error'

export function genericCollectionPatch (
  originalMethod: (...args: any[]) => any,
  method: string,
  tracer: Tracer,
  langtraceVersion: string,
  sdkName: string,
  version?: string
): (...args: any[]) => any {
  return async function (this: any, ...args: any[]): Promise<any> {
    const api = APIS.qdrant[method as keyof typeof APIS.qdrant]
    const customAttributes = context.active().getValue(LANGTRACE_ADDITIONAL_SPAN_ATTRIBUTES_KEY) ?? {}

    const attributes: DatabaseSpanAttributes = {
      'langtrace.sdk.name': sdkName,
      'langtrace.service.name': Vendors.QDRANT,
      'langtrace.service.type': 'vectordb',
      'langtrace.service.version': version,
      'langtrace.version': langtraceVersion,
      'db.system': 'qdrant',
      'db.operation': api.OPERATION,
      'db.query': JSON.stringify(args),
      ...customAttributes
    }
    const spanName = customAttributes['langtrace.span.name' as keyof typeof customAttributes] ?? api.METHOD
    const span = tracer.startSpan(spanName, { attributes, kind: SpanKind.CLIENT }, context.active())
    return await context.with(
      trace.setSpan(context.active(), span),
      async () => {
        try {
          const response = await originalMethod.apply(this, args)
          if (response !== undefined) addSpanEvent(span, Event.RESPONSE, { 'db.response': JSON.stringify(response) })
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
