import { SpanKind, trace, Attributes, context, SpanStatusCode } from "@opentelemetry/api";

// This function wraps another function with a root span context
export async function withLangTraceRootSpan<T>(
  fn: () => Promise<T>,
  name = "LangtraceRootSpan", // "LangtraceRootSpan" is the default name for the root span
  tracerName = "langtrace",
  spanAttributes: Record<string, unknown> = {},
  spanKind: SpanKind = SpanKind.INTERNAL
): Promise<T> {
  const tracer = trace.getTracer(tracerName);
  const rootSpan = tracer.startSpan(name, {
    kind: spanKind,
    attributes: spanAttributes as Attributes,
  });

  // Use the OpenTelemetry context management API to set the current span
  return context.with(trace.setSpan(context.active(), rootSpan), async () => {
    try {
      // Execute the wrapped function
      const result = await fn();
      rootSpan.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error: any) {
      rootSpan.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message,
      });
      throw error;
    } finally {
      // Ensure the root span is ended after function execution
      rootSpan.end();
    }
  });
}
