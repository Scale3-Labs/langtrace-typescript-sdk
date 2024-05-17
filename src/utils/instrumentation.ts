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
import { LLMSpanAttributes } from '@langtrase/trace-attributes'
import { SpanKind, trace, context, SpanStatusCode, Span } from '@opentelemetry/api'
import { LangtraceMetadata } from '@langtrace-utils/types'
/**
 *
 * @param fn  The function to be executed within the context of the root span
 * @param name Name of the root span
 * @param spanAttributes Attributes to be added to the root span
 * @param spanKind The kind of span to be created
 * @returns result of the function
 */
export async function withLangTraceRootSpan<T> (
  fn: () => Promise<T>,
  name = 'LangtraceRootSpan',
  spanKind: SpanKind = SpanKind.INTERNAL
): Promise<T> {
  const tracer = trace.getTracer('langtrace')
  const rootSpan = tracer.startSpan(name, { kind: spanKind, attributes: { 'langtrace.sdk.name': '@langtrase/typescript-sdk' } })

  // Use the OpenTelemetry context management API to set the current span
  return await context.with(trace.setSpan(context.active(), rootSpan), async () => {
    try {
      // Execute the wrapped function
      const result = await fn()
      rootSpan.setStatus({ code: SpanStatusCode.OK })
      return result
    } catch (error: any) {
      rootSpan.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message
      })
      throw error
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
export async function withAdditionalAttributes <T> (fn: () => Promise<T>, attributes: Partial<LLMSpanAttributes>): Promise<T> {
  const currentContext = context.active()
  const contextWithAttributes = currentContext.setValue(LANGTRACE_ADDITIONAL_SPAN_ATTRIBUTES_KEY, attributes)

  // Execute the function within the context that has the custom attributes
  return await context.with(contextWithAttributes, fn)
}

/**
 *
 * @param response response object to which metadata is to be attached
 * @param span span object
 * @param attributes attributes to extract metadata from
 * @returns response object with metadata attached
 */
export function attachMetadataToResponse <T> (response: T, span: Span): T & { langtrace_metadata: LangtraceMetadata } {
  const metadata: LangtraceMetadata = {
    spanId: span.spanContext().spanId,
    traceId: span.spanContext().traceId
  }
  const res: T & { langtrace_metadata: LangtraceMetadata } = response as T & { langtrace_metadata: LangtraceMetadata }
  res.langtrace_metadata = metadata
  return res
}
/**
 *
 * @param span span object
 * @param attributes attributes to extract metadata from
 * @returns metadata object
 */
export function attachMetadataChunkToStreamedResponse (span: Span): { langtrace_metadata: LangtraceMetadata } {
  const metadata: LangtraceMetadata = {
    spanId: span.spanContext().spanId,
    traceId: span.spanContext().traceId
  }
  return { langtrace_metadata: metadata }
}

/**
 *
 * @param  response is the response of the traced function which is either a stream chunk object or a response object from the function call
 * @returns LangtraceMetadata
 */
export function extractLangtraceMetadata (response: Record<string, any>): LangtraceMetadata | undefined {
  return response?.langtrace_metadata as LangtraceMetadata
}
