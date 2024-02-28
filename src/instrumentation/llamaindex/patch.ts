import {
  Span,
  SpanKind,
  SpanStatusCode,
  Tracer,
  context,
  trace,
} from "@opentelemetry/api";
import { SERVICE_PROVIDERS } from "../../constants";

export function genericPatch(
  originalMethod: (...args: any[]) => any,
  task: string,
  tracer: Tracer
): (...args: any[]) => any {
  return async function (this: any, ...args: any[]) {
    return context.with(
      trace.setSpan(context.active(), trace.getSpan(context.active()) as Span),
      async () => {
        const span = tracer.startSpan(task, {
          kind: SpanKind.CLIENT,
        });
        span.setAttributes({
          "service.provider": SERVICE_PROVIDERS.LLAMAINDEX,
        });

        try {
          const response = await originalMethod.apply(this, args);
          span.setStatus({ code: SpanStatusCode.OK });
          span.end();
          return response;
        } catch (error: any) {
          span.recordException(error);
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error.message,
          });
          span.end();
          throw error;
        }
      }
    );
  };
}
