import { Span, SpanKind, SpanStatusCode, trace } from "@opentelemetry/api";
import { OPENAI_TRACE_NAMESPACE } from "../../constants";
import { calculatePromptTokens, estimateTokens } from "../../utils";

export function imagesGenerate(
  originalMethod: (...args: any[]) => any
): (...args: any[]) => any {
  return async function (this: any, ...args: any[]) {
    // Preserving `this` from the calling context
    const originalContext = this;

    // Start a new span
    const span = trace
      .getTracer(OPENAI_TRACE_NAMESPACE)
      .startSpan("openai.images.generate", {
        attributes: {
          service_provider: "OpenAI",
          baseURL: originalContext._client?.baseURL,
          api: "openai.images.generate",
          model: args[0]?.model,
          "request.prompt": args[0]?.prompt,
          "request.maxRetries": originalContext._client?.maxRetries,
          "request.timeout": originalContext._client?.timeout,
        },
        kind: SpanKind.CLIENT,
      });

    // Wrap the original method in a try/catch block
    try {
      // Call the original create method
      const response = await originalMethod.apply(originalContext, args);

      // Set the span status and end the span
      span.setAttribute("response.responses", JSON.stringify(response?.data));
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
      .getTracer(OPENAI_TRACE_NAMESPACE)
      .startSpan("openai.chat.completion.create", {
        attributes: {
          service_provider: "OpenAI",
          baseURL: originalContext._client?.baseURL,
          api: "/chat/completions",
          model: args[0]?.model,
          "request.maxRetries": originalContext._client?.maxRetries,
          "request.timeout": originalContext._client?.timeout,
          "request.stream": args[0]?.stream,
        },
        kind: SpanKind.SERVER,
      });

    span.setAttribute("request.prompts", JSON.stringify(args[0].messages));

    if (args[0]?.temperature) {
      span.setAttribute("request.temperature", args[0]?.temperature);
    }

    if (args[0]?.top_p) {
      span.setAttribute("request.top_p", args[0]?.top_p);
    }

    if (args[0]?.user) {
      span.setAttribute("request.user", args[0]?.user);
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
        span.setAttribute("response.responses", JSON.stringify(responses));
        if (resp?.system_fingerprint) {
          span.setAttribute(
            "response.system_fingerprint",
            resp?.system_fingerprint
          );
        }
        span.setAttribute(
          "token_counts",
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

  span.addEvent("stream_start");
  try {
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      const tokenCount = estimateTokens(content);
      completionTokens += tokenCount;
      result.push(content);
      span.addEvent("stream_output", { tokenCount, chunk, response: content });
      yield chunk;
    }

    span.setStatus({ code: SpanStatusCode.OK });
    span.setAttributes({
      token_counts: JSON.stringify({
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: completionTokens + promptTokens,
      }),
      "response.response": JSON.stringify([
        { role: "assistant", content: result.join("") },
      ]),
    });
    span.addEvent("stream_end");
  } catch (error: any) {
    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    throw error;
  } finally {
    span.end();
  }
}
