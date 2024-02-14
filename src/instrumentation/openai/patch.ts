import { Span, SpanKind, SpanStatusCode, trace } from "@opentelemetry/api";
import { SERVICE_PROVIDERS, TRACE_NAMESPACES } from "../../constants";
import { calculatePromptTokens, estimateTokens } from "../../utils";
import { APIS } from "./lib/apis";
import { OpenAISpanAttributes, OpenAISpanEvents } from "./lib/span_attributes";

export function imagesGenerate(
  originalMethod: (...args: any[]) => any
): (...args: any[]) => any {
  return async function (this: any, ...args: any[]) {
    // Preserving `this` from the calling context
    const originalContext = this;

    // Start a new span
    const span = trace
      .getTracer(TRACE_NAMESPACES.OPENAI)
      .startSpan(APIS.IMAGES_GENERATION.METHOD, {
        attributes: {
          [OpenAISpanAttributes.SERVICE_PROVIDER]: SERVICE_PROVIDERS.OPENAI,
          [OpenAISpanAttributes.BASE_URL]: originalContext._client?.baseURL,
          [OpenAISpanAttributes.API]: [APIS.IMAGES_GENERATION.ENDPOINT],
          [OpenAISpanAttributes.MODEL]: args[0]?.model,
          [OpenAISpanAttributes.REQUEST_PROMPTS]: JSON.stringify([
            args[0]?.prompt,
          ]),
          [OpenAISpanAttributes.REQUEST_MAXRETRIES]:
            originalContext._client?.maxRetries,
          [OpenAISpanAttributes.REQUEST_TIMEOUT]:
            originalContext._client?.timeout,
        },
        kind: SpanKind.CLIENT,
      });

    // Wrap the original method in a try/catch block
    try {
      // Call the original create method
      const response = await originalMethod.apply(originalContext, args);

      // Set the span status and end the span
      span.setAttribute(
        OpenAISpanAttributes.RESPONSE_RESPONSES,
        JSON.stringify(response?.data)
      );
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

export function chatCompletionCreate(
  originalMethod: (...args: any[]) => any
): (...args: any[]) => any {
  return async function (this: any, ...args: any[]) {
    // Preserving `this` from the calling context
    const originalContext = this;

    // Start a new span
    const span = trace
      .getTracer(TRACE_NAMESPACES.OPENAI)
      .startSpan(APIS.CHAT_COMPLETION.METHOD, {
        attributes: {
          [OpenAISpanAttributes.SERVICE_PROVIDER]: SERVICE_PROVIDERS.OPENAI,
          [OpenAISpanAttributes.BASE_URL]: originalContext._client?.baseURL,
          [OpenAISpanAttributes.API]: APIS.CHAT_COMPLETION.ENDPOINT,
          [OpenAISpanAttributes.MODEL]: args[0]?.model,
          [OpenAISpanAttributes.REQUEST_MAXRETRIES]:
            originalContext._client?.maxRetries,
          [OpenAISpanAttributes.REQUEST_TIMEOUT]:
            originalContext._client?.timeout,
          [OpenAISpanAttributes.REQUEST_STREAM]: args[0]?.stream,
        },
        kind: SpanKind.SERVER,
      });

    span.setAttribute(
      OpenAISpanAttributes.REQUEST_PROMPTS,
      JSON.stringify(args[0].messages)
    );

    if (args[0]?.temperature) {
      span.setAttribute(
        OpenAISpanAttributes.REQUEST_TEMPERATURE,
        args[0]?.temperature
      );
    }

    if (args[0]?.top_p) {
      span.setAttribute(OpenAISpanAttributes.REQUEST_TOP_P, args[0]?.top_p);
    }

    if (args[0]?.user) {
      span.setAttribute(OpenAISpanAttributes.REQUEST_USER, args[0]?.user);
    }

    try {
      const model = args[0].model;
      const promptContent = JSON.stringify(args[0].messages[0]);
      const promptTokens = calculatePromptTokens(promptContent, model);

      // Call the original create method
      const resp = await originalMethod.apply(this, args);

      // Handle non-stream responses immediately
      if (!args[0].stream || args[0].stream === false) {
        const responses = resp?.choices?.map((choice: any) => choice?.message);
        span.setAttribute(
          OpenAISpanAttributes.RESPONSE_RESPONSES,
          JSON.stringify(responses)
        );
        if (resp?.system_fingerprint) {
          span.setAttribute(
            OpenAISpanAttributes.RESPONSE_SYSTEM_FINGERPRINT,
            resp?.system_fingerprint
          );
        }
        span.setAttribute(
          OpenAISpanAttributes.TOKEN_COUNTS,
          JSON.stringify({
            prompt_tokens: promptTokens,
            completion_tokens: resp?.usage?.completion_tokens || 0,
            total_tokens: resp?.usage?.total_tokens || 0,
          })
        );
        span.setStatus({ code: SpanStatusCode.OK });
        span.end();
        return resp;
      }

      // Handle streaming responses
      return handleStreamResponse(span, resp, promptTokens);
    } catch (error: any) {
      span.recordException(error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      span.end();
      throw error;
    }
  };
}

async function* handleStreamResponse(
  span: Span,
  stream: any,
  promptTokens: number
) {
  let completionTokens = 0;
  let result: string[] = [];

  span.addEvent(OpenAISpanEvents.STREAM_START);
  try {
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      const tokenCount = estimateTokens(content);
      completionTokens += tokenCount;
      result.push(content);
      span.addEvent(OpenAISpanEvents.STREAM_OUTPUT, {
        tokenCount,
        chunk,
        response: content,
      });
      yield chunk;
    }

    span.setStatus({ code: SpanStatusCode.OK });
    span.setAttributes({
      [OpenAISpanAttributes.TOKEN_COUNTS]: JSON.stringify({
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: completionTokens + promptTokens,
      }),
      [OpenAISpanAttributes.RESPONSE_RESPONSES]: JSON.stringify([
        { role: "assistant", content: result.join("") },
      ]),
    });
    span.addEvent(OpenAISpanEvents.STREAM_END);
  } catch (error: any) {
    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    throw error;
  } finally {
    span.end();
  }
}

export function embeddingsCreate(
  originalMethod: (...args: any[]) => any
): (...args: any[]) => any {
  return async function (this: any, ...args: any[]) {
    // Preserving `this` from the calling context
    const originalContext = this;

    // Start a new span
    const span = trace
      .getTracer(TRACE_NAMESPACES.OPENAI)
      .startSpan(APIS.EMBEDDINGS_CREATE.METHOD, {
        attributes: {
          [OpenAISpanAttributes.SERVICE_PROVIDER]: SERVICE_PROVIDERS.OPENAI,
          [OpenAISpanAttributes.BASE_URL]: originalContext._client?.baseURL,
          [OpenAISpanAttributes.API]: APIS.EMBEDDINGS_CREATE.ENDPOINT,
          [OpenAISpanAttributes.MODEL]: args[0]?.model,
          [OpenAISpanAttributes.REQUEST_MAXRETRIES]:
            originalContext._client?.maxRetries,
          [OpenAISpanAttributes.REQUEST_TIMEOUT]:
            originalContext._client?.timeout,
          [OpenAISpanAttributes.REQUEST_STREAM]: args[0]?.stream,
        },
        kind: SpanKind.SERVER,
      });

    if (args[0]?.encoding_format) {
      span.setAttribute(
        OpenAISpanAttributes.REQUEST_ENCODING_FORMAT,
        args[0]?.encoding_format
      );
    }

    if (args[0]?.dimensions) {
      span.setAttribute(
        OpenAISpanAttributes.REQUEST_DIMENSIONS,
        args[0]?.dimensions
      );
    }

    if (args[0]?.user) {
      span.setAttribute(OpenAISpanAttributes.REQUEST_USER, args[0]?.user);
    }

    try {
      // Call the original create method
      const resp = await originalMethod.apply(this, args);

      span.setStatus({ code: SpanStatusCode.OK });
      span.end();
      return resp;
    } catch (error: any) {
      span.recordException(error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      span.end();
      throw error;
    }
  };
}
