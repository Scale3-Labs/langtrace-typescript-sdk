import { APIS } from "@langtrace-constants/instrumentation/chroma";
import { SERVICE_PROVIDERS } from "@langtrace-constants/instrumentation/common";
import { DatabaseSpanAttributes } from "@langtrase/trace-attributes";
import {
  Span,
  SpanKind,
  SpanStatusCode,
  Tracer,
  context,
  trace,
} from "@opentelemetry/api";

export function collectionPatch(
  originalMethod: (...args: any[]) => any,
  method: string,
  tracer: Tracer,
  version: string
): (...args: any[]) => any {
  return async function (this: any, ...args: any[]) {
    const originalContext = this;
    const api = APIS[method];

    const attributes: DatabaseSpanAttributes = {
      "langtrace.service.name": SERVICE_PROVIDERS.CHROMA,
      "langtrace.service.type": "vectordb",
      "langtrace.service.version": version,
      "langtrace.version": "1.0.0",
      "db.system": "chromadb",
      "db.operation": api.OPERATION,
    };

    if (this.name) {
      attributes["db.collection.name"] = this.name;
    }

    if (this.api?.basePath) {
      attributes["server.address"] = this.api.basePath;
    }

    if (this.embeddingFunction?.model) {
      attributes["db.chromadb.embedding_model"] = this.embeddingFunction.model;
    }

    return context.with(
      trace.setSpan(context.active(), trace.getSpan(context.active()) as Span),
      async () => {
        const span = tracer.startSpan(api.METHOD, {
          kind: SpanKind.CLIENT,
        });
        span.setAttributes(attributes);

        try {
          // NOTE: Not tracing the response data as it can contain sensitive information
          const response = await originalMethod.apply(originalContext, args);

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
