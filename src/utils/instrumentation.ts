import { DatabaseSpanAttributes, LLMSpanAttributes, FrameworkSpanAttributes } from '@langtrase/trace-attributes'
import { SpanKind, trace, context, SpanStatusCode } from '@opentelemetry/api'

// This function wraps another function with a root span context
export async function withLangTraceRootSpan<T> (
  fn: () => Promise<T>,
  name = 'LangtraceRootSpan', // "LangtraceRootSpan" is the default name for the root span
  tracerName = 'langtrace',
  spanAttributes?: Partial<LLMSpanAttributes> | Partial<DatabaseSpanAttributes> | Partial<FrameworkSpanAttributes>,
  spanKind: SpanKind = SpanKind.INTERNAL
): Promise<T> {
  const tracer = trace.getTracer(tracerName)
  const rootSpan = tracer.startSpan(name, {
    kind: spanKind,
    attributes: spanAttributes
  })

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
