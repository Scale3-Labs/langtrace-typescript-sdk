import { Span, SpanStatusCode, trace } from "@opentelemetry/api";
import { TIKTOKEN_MODEL_MAPPING } from "../constants";
import { estimateTokens, estimateTokensUsingTikToken } from "../lib";

export function imagesGenerate(
  originalMethod: (...args: any[]) => any
): (...args: any[]) => any {
  return async function (this: any, ...args: any[]) {
    const span = trace
      .getTracer("Langtrace OpenAI SDK")
      .startSpan("OpenAI: images.generate");
    // Preserving `this` from the calling context
    const originalContext = this;

    span.setAttributes({
      baseURL: originalContext._client?.baseURL,
      maxRetries: originalContext._client?.maxRetries,
      timeout: originalContext._client?.timeout,
      body: args,
    });
    try {
      // Call the original create method
      const image = await originalMethod.apply(originalContext, args);

      span.setAttribute("response", JSON.stringify(image));
      span.setStatus({ code: SpanStatusCode.OK });
      span.end();
      return image;
    } catch (error: any) {
      span.recordException(error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      span.end();
      throw error; // Rethrow the error to be handled by the caller
    }
  };
}

export function chatCompletionCreate(
  originalMethod: (...args: any[]) => any
): (...args: any[]) => any {
  return async function (this: any, ...args: any[]) {
    const originalContext = this;
    const tracer = trace.getTracer("Langtrace OpenAI SDK");
    const promptContent = JSON.stringify(args[0].messages[0]);
    const model = args[0].model;
    const promptTokens = calculatePromptTokens(promptContent, model);

    const span = tracer.startSpan("OpenAI: chat.completion.create", {
      attributes: {
        model: args[0]?.model,
        prompt: JSON.stringify(args[0]?.messages?.[0] || ""),
        baseURL: originalContext._client?.baseURL,
        maxRetries: originalContext._client?.maxRetries,
        timeout: originalContext._client?.timeout,
        body: args,
      },
    });

    try {
      const resp = await originalMethod.apply(this, args);

      // Handle non-stream responses immediately
      if (!args[0].stream || args[0].stream === false) {
        span.setAttribute("response", resp.choices?.[0].message?.content || "");
        span.setAttribute("usage", JSON.stringify(resp.usage));
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

function calculatePromptTokens(promptContent: string, model: string): number {
  try {
    const tiktokenModel = TIKTOKEN_MODEL_MAPPING[model];
    return estimateTokensUsingTikToken(promptContent, tiktokenModel);
  } catch (error) {
    return estimateTokens(promptContent); // Fallback method
  }
}

async function* handleStreamResponse(
  span: Span,
  stream: any,
  promptTokens: number
) {
  let completionTokens = 0;
  let result: string[] = [];

  span.addEvent("Stream Started");
  try {
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      const tokenCount = estimateTokens(content);
      completionTokens += tokenCount;
      result.push(content);
      span.addEvent(content, { tokenCount, chunk });
      yield chunk;
    }

    span.setStatus({ code: SpanStatusCode.OK });
    const usage = {
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: completionTokens + promptTokens,
    };
    span.setAttributes({
      usage: JSON.stringify(usage),
      response: result.join(""),
    });
    span.addEvent("Stream Ended");
  } catch (error: any) {
    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    throw error;
  } finally {
    span.end();
  }
}
