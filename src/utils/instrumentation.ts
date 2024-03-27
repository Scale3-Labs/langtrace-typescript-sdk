import { LANGTRACE_ADDITIONAL_SPAN_ATTRIBUTES_KEY } from '@langtrace-constants/common'
import { LLMSpanAttributes } from '@langtrase/trace-attributes'
import { SpanKind, trace, context, SpanStatusCode } from '@opentelemetry/api'
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
  const rootSpan = tracer.startSpan(name, { kind: spanKind })

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

// Function to set custom attributes in the current context
export async function withAdditionalAttributes <T> (fn: () => Promise<T>, attributes: Partial<LLMSpanAttributes>): Promise<T> {
  const currentContext = context.active()
  const contextWithAttributes = currentContext.setValue(LANGTRACE_ADDITIONAL_SPAN_ATTRIBUTES_KEY, attributes)

  // Execute the function within the context that has the custom attributes
  return await context.with(contextWithAttributes, fn)
}
