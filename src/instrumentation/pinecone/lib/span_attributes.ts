import { SpanAttributes } from "../../../span_attributes";

export const PineconeSpanAttributes: Record<string, string> = {
  ...SpanAttributes,
  REQUEST_INDEX: "request.index",
  REQUEST_NAMESPACE: "request.namespace",
  REQUEST_INDEX_HOST_URL: "request.indexHostUrl",
};

export const PineconeSpanEvents: Record<string, string> = {
  STREAM_START: "stream.start",
  STREAM_END: "stream.end",
  STREAM_OUTPUT: "stream.output",
};
