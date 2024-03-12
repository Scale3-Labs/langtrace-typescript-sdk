import { APIS } from "@langtrace-constants/instrumentation/pinecone";
import { SERVICE_PROVIDERS } from "@langtrace-constants/instrumentation/common";
import { DatabaseSpanAttributes } from "@langtrase/trace-attributes";
import { Tracer, context, trace, Span, SpanKind, SpanStatusCode } from "@opentelemetry/api";


export function genericPatch(
originalMethod: (...args: any[]) => any,
  method: string,
  tracer: Tracer,
  version: string
): (...args: any[]) => any {
  return async function (this: any, ...args: any[]) {
    const originalContext = this;
    const api = APIS[method];
    const attributes: DatabaseSpanAttributes = {
      "langtrace.service.name": SERVICE_PROVIDERS.PINECONE,
      "langtrace.service.type": "vectordb",
      "langtrace.service.version": version,
      "langtrace.version": "1.0.0",
      "db.system": "pinecone",
      "db.operation": api.OPERATION,
    };

    return context.with(
      trace.setSpan(context.active(), trace.getSpan(context.active()) as Span),
      async () => {
        const span = tracer.startSpan(api.METHOD, {
          kind: SpanKind.CLIENT,
        });
        span.setAttributes(attributes);
        try {
          if (this.target?.index) {
            span.setAttributes({
              "db.index": this.target?.index,
            });
          }
          if (this.target?.namespace) {
            span.setAttributes({
              "db.namespace": this.target?.namespace,
            });
          }
          if (this.target?.indexHostUrl) {
            span.setAttributes({
              "server.address": this.target?.indexHostUrl + api.ENDPOINT,
            });
          }
          if (args[0]?.topK) {
            span.setAttributes({ "db.top_k": args[0]?.topK });
          }

          // Call the original create method
          // NOTE: Not tracing the response data as it can contain sensitive information
          const response = await originalMethod.apply(originalContext, args);

          span.setStatus({ code: SpanStatusCode.OK });
          span.end();
          return response;
        } catch (error: any) {
          // If an error occurs, record the exception and end the span
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
