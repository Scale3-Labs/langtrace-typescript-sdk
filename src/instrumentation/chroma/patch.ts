import {
  Span,
  SpanKind,
  SpanStatusCode,
  Tracer,
  context,
  trace,
} from "@opentelemetry/api";
import { SERVICE_PROVIDERS } from "../../constants";
import { LangTraceAttributes, LangTraceSpan } from "../../span";
import { APIS } from "./lib/apis";

export function collectionPatch(
  originalMethod: (...args: any[]) => any,
  method: string,
  tracer: Tracer,
  rootSpan?: Span
): (...args: any[]) => any {
  return async function (this: any, ...args: any[]) {
    const originalContext = this;
    let api = APIS[method];

    const attributes: Partial<LangTraceAttributes> = {
      "service.provider": SERVICE_PROVIDERS.CHROMA,
      "db.system": "chromadb",
      "db.operation": api.OPERATION,
    };

    if (this.name) {
      attributes["db.chromadb.collection"] = this.name;
    }

    if (this.api?.basePath) {
      attributes["server.address"] = this.api.basePath;
    }

    if (this.embeddingFunction?.model) {
      attributes["db.chromadb.embedding_model"] = this.embeddingFunction.model;
    }

    return context.with(
      trace.setSpan(context.active(), rootSpan as Span),
      async () => {
        const span = new LangTraceSpan(tracer, api.METHOD, {
          kind: SpanKind.CLIENT,
        });
        span.addAttribute(attributes);

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
