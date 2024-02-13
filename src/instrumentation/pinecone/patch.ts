import { SpanKind, SpanStatusCode, trace } from "@opentelemetry/api";
import { SERVICE_PROVIDERS, TRACE_NAMESPACES } from "../../constants";
import { APIS } from "./lib/apis";
import { PineconeSpanAttributes } from "./lib/span_attributes";

export function patchUpsert(
  originalMethod: (...args: any[]) => any
): (...args: any[]) => any {
  return async function (this: any, ...args: any[]) {
    // Preserving `this` from the calling context
    const originalContext = this;

    // Start a new span
    const span = trace
      .getTracer(TRACE_NAMESPACES.PINECONE)
      .startSpan(APIS.UPSERT.METHOD, {
        attributes: {
          [PineconeSpanAttributes.SERVICE_PROVIDER]: SERVICE_PROVIDERS.PINECONE,
          [PineconeSpanAttributes.API]: APIS.UPSERT.ENDPOINT,
        },
        kind: SpanKind.CLIENT,
      });

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

    // Wrap the original method in a try/catch block
    try {
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
