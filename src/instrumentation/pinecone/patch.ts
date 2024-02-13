import { SpanKind, trace } from "@opentelemetry/api";
import { SERVICE_PROVIDERS, TRACE_NAMESPACES } from "../../constants";
import { APIS } from "./lib/apis";
import { PineconeSpanAttributes } from "./lib/span_attributes";

export function patchUpsert(
  originalMethod: (...args: any[]) => any
): (...args: any[]) => any {
  return async function (this: any, ...args: any[]) {
    // Preserving `this` from the calling context
    const originalContext = this;

    console.log(this.target);

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
  };
}
