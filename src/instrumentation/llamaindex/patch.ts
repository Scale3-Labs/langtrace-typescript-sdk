import { SpanKind, SpanStatusCode, trace } from "@opentelemetry/api";
import { TRACE_NAMESPACES } from "../../constants";

export function genericPatch(
  originalMethod: (...args: any[]) => any,
  task: string
): (...args: any[]) => any {
  return async function (this: any, ...args: any[]) {
    const span = trace.getTracer(TRACE_NAMESPACES.LLAMAINDEX).startSpan(task, {
      kind: SpanKind.CLIENT,
    });

    try {
      const response = await originalMethod.apply(this, args);
      span.setStatus({ code: SpanStatusCode.OK });
      span.end();
      return response;
    } catch (error: any) {
      span.recordException(error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      span.end();
      throw error;
    }
  };
}
