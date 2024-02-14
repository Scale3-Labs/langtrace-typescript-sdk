import { SpanKind, SpanStatusCode, trace } from "@opentelemetry/api";
import { SERVICE_PROVIDERS, TRACE_NAMESPACES } from "../../constants";
import { APIS } from "./lib/apis";
import { PineconeSpanAttributes } from "./lib/span_attributes";

export function genericPatch(
  originalMethod: (...args: any[]) => any,
  method: string
): (...args: any[]) => any {
  return async function (this: any, ...args: any[]) {
    // Preserving `this` from the calling context
    const originalContext = this;
    let api: any = {};
    if (method === "upsert") {
      api = APIS.UPSERT;
    } else if (method === "query") {
      api = APIS.QUERY;
    } else if (method === "deleteOne") {
      api = APIS.DELETE_ONE;
    } else if (method === "deleteMany") {
      api = APIS.DELETE_MANY;
    } else {
      api = { METHOD: method, ENDPOINT: "unknown" };
    }

    const span = trace
      .getTracer(TRACE_NAMESPACES.PINECONE)
      .startSpan(api.METHOD, {
        attributes: {
          [PineconeSpanAttributes.SERVICE_PROVIDER]: SERVICE_PROVIDERS.PINECONE,
          [PineconeSpanAttributes.API]: api.ENDPOINT,
        },
        kind: SpanKind.CLIENT,
      });

    try {
      if (this.target?.index) {
        span.setAttribute(
          PineconeSpanAttributes.REQUEST_INDEX,
          this.target?.index
        );
      }
      if (this.target?.namespace) {
        span.setAttribute(
          PineconeSpanAttributes.REQUEST_NAMESPACE,
          this.target?.namespace
        );
      }
      if (this.target?.indexHostUrl) {
        span.setAttribute(
          PineconeSpanAttributes.REQUEST_INDEX_HOST_URL,
          this.target?.indexHostUrl
        );
      }

      // Call the original create method
      const response = await originalMethod.apply(originalContext, args);

      // Set the span status and end the span
      if (response) {
        span.setAttribute("response", JSON.stringify(response?.data));
      }
      span.setStatus({ code: SpanStatusCode.OK });
      span.end();
      return response;
    } catch (error: any) {
      // If an error occurs, record the exception and end the span
      span.recordException(error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      span.end();
      throw error;
    }
  };
}
