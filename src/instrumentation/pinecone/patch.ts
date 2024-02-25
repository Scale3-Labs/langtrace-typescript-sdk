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

export function genericPatch(
  originalMethod: (...args: any[]) => any,
  method: string,
  tracer: Tracer,
  rootSpan?: Span
): (...args: any[]) => any {
  return async function (this: any, ...args: any[]) {
    const originalContext = this;
    let api = APIS[method];
    const attributes: Partial<LangTraceAttributes> = {
      "service.provider": SERVICE_PROVIDERS.PINECONE,
      "db.system": "pinecone",
      "db.operation": api.OPERATION,
    };

    return context.with(
      trace.setSpan(context.active(), rootSpan as Span),
      async () => {
        const span = new LangTraceSpan(tracer, api.METHOD, {
          kind: SpanKind.CLIENT,
        });
        span.addAttribute(attributes);
        try {
          if (this.target?.index) {
            span.addAttribute({
              "db.index": this.target?.index,
            });
          }
          if (this.target?.namespace) {
            span.addAttribute({
              "db.namespace": this.target?.namespace,
            });
          }
          if (this.target?.indexHostUrl) {
            span.addAttribute({
              "server.address": this.target?.indexHostUrl + api.ENDPOINT,
            });
          }
          if (args[0]?.topK) {
            span.addAttribute({ "db.top_k": args[0]?.topK });
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
