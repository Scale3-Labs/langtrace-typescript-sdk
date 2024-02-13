const SpanAttributes: Record<string, string> = {
  SERVICE_PROVIDER: "service_provider",
  BASE_URL: "baseURL",
  API: "api",
  MODEL: "model",
  REQUEST_PROMPTS: "request.prompts",
  RESPONSE_RESPONSES: "response.responses",
};

export const OpenAISpanAttributes: Record<string, string> = {
  ...SpanAttributes,
  REQUEST_MAXRETRIES: "request.maxRetries",
  REQUEST_TIMEOUT: "request.timeout",
  REQUEST_STREAM: "request.stream",
  REQUEST_TEMPERATURE: "request.temperature",
  REQUEST_TOP_P: "request.top_p",
  REQUEST_USER: "request.user",
  RESPONSE_SYSTEM_FINGERPRINT: "response.system_fingerprint",
  TOKEN_COUNTS: "token_counts",
};

export const OpenAISpanEvents: Record<string, string> = {
  STREAM_START: "stream.start",
  STREAM_END: "stream.end",
  STREAM_OUTPUT: "stream.output",
};
