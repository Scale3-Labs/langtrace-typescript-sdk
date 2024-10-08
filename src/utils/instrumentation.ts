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
import { SpanKind, trace, context, SpanStatusCode } from '@opentelemetry/api'
import { LangtraceSdkError } from 'errors/sdk_error'
/**
 *
 * @param fn  The function to be executed within the context of the root span. The function should accept the spanId and traceId as arguments
 * @param name Name of the root span
 * @param spanAttributes Attributes to be added to the root span
 * @param spanKind The kind of span to be created
 * @returns result of the function
 */
export async function withLangTraceRootSpan<T> (
  fn: (spanId: string, traceId: string) => Promise<T>,
  name = 'LangtraceRootSpan',
  spanKind: SpanKind = SpanKind.INTERNAL
): Promise<T> {
  // Use the OpenTelemetry context management API to set the current span
  const currentContext = context.active()
  const tracer = trace.getTracer('@langtrase/typescript-sdk')
  const rootSpan = tracer.startSpan(name, { kind: spanKind, attributes: { 'langtrace.sdk.name': '@langtrase/typescript-sdk' } }, currentContext)

  return await context.with(trace.setSpan(currentContext, rootSpan), async () => {
    try {
      // Execute the wrapped function
      const result = await fn(rootSpan.spanContext().spanId, rootSpan.spanContext().traceId)
      rootSpan.setStatus({ code: SpanStatusCode.OK })
      return result
    } catch (error: any) {
      rootSpan.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message
      })
      throw new LangtraceSdkError(error.message as string, error.stack as string)
    } finally {
      // Ensure the root span is ended after function execution
      rootSpan.end()
    }
  })
}

/**
 *
 * @param fn function to be executed within the context with the custom attributes added to the current context
 * @param attributes custom attributes to be added to the current context
 * @returns result of the function
 */
export async function withAdditionalAttributes <T> (fn: () => Promise<T>, attributes: { [key: string]: any, 'langtrace.span.name'?: string } | Promise<{ [key: string]: any, 'langtrace.span.name'?: string }>): Promise<T> {
  const currentContext = context.active()
  const contextWithAttributes = currentContext.setValue(LANGTRACE_ADDITIONAL_SPAN_ATTRIBUTES_KEY, attributes)
  if (attributes instanceof Promise) {
    attributes = await attributes
  }
  // Execute the function within the context that has the custom attributes
  return await context.with(contextWithAttributes, fn)
}
