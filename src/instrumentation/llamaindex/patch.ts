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
import { FrameworkSpanAttributes, Vendors } from '@langtrase/trace-attributes'
import {
  Exception,
  SpanKind,
  SpanStatusCode,
  Tracer,
  context,
  trace
} from '@opentelemetry/api'

export function genericPatch (
  originalMethod: (...args: any[]) => any,
  method: string,
  task: string,
  tracer: Tracer,
  langtraceVersion: string,
  version?: string
): (...args: any[]) => any {
  return async function (this: any, ...args: any[]) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    const customAttributes = context.active().getValue(LANGTRACE_ADDITIONAL_SPAN_ATTRIBUTES_KEY) ?? {}
    const attributes: FrameworkSpanAttributes = {
      'langtrace.sdk.name': '@langtrase/typescript-sdk',
      'langtrace.service.name': Vendors.LLAMAINDEX,
      'langtrace.service.type': 'framework',
      'langtrace.service.version': version,
      'langtrace.version': langtraceVersion,
      'llamaindex.task.name': task,
      ...customAttributes
    }
    const spanName = customAttributes['langtrace.span.name' as keyof typeof customAttributes] ?? method
    const span = tracer.startSpan(spanName, { kind: SpanKind.CLIENT, attributes }, context.active())
    return await context.with(
      trace.setSpan(context.active(), span),
      async () => {
        try {
          const response = await originalMethod.apply(this, args)
          span.setStatus({ code: SpanStatusCode.OK })
          span.end()
          return response
        } catch (error: any) {
          span.recordException(error as Exception)
          span.setStatus({ code: SpanStatusCode.ERROR })
          span.end()
          throw error
        }
      }
    )
  }
}
