export const PineconeSpanAttributes: Record<string, string> = {
  REQUEST_INDEX: "request.index",
  REQUEST_NAMESPACE: "request.namespace",
  REQUEST_INDEX_HOST_URL: "request.indexHostUrl",
  REQUEST_TOPK: "request.topK",
};

export const PineconeSpanEvents: Record<string, string> = {
  STREAM_START: "stream.start",
  STREAM_END: "stream.end",
  STREAM_OUTPUT: "stream.output",
};
