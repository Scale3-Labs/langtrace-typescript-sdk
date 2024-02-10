import { SpanStatusCode, trace } from "@opentelemetry/api";
import { estimateTokensInChunk } from "../lib";

export function chatCompletionCreate(
  originalMethod: (...args: any[]) => any
): (...args: any[]) => any {
  return async function (this: any, ...args: any[]) {
    const span = trace
      .getTracer("Langtrace OpenAI SDK")
      .startSpan("OpenAI: chat.completion.create");
    // Preserving `this` from the calling context
    const originalContext = this;
    span.setAttributes({
      request: JSON.stringify({
        baseURL: originalContext._client?.baseURL,
        maxRetries: originalContext._client?.maxRetries,
        timeout: originalContext._client?.timeout,
        body: args,
      }),
    });
    try {
      // Call the original create method
      const stream = await originalMethod.apply(originalContext, args);

      // If the stream option is not set, return the stream as-is
      if (!args[0].stream || args[0].stream === false) {
        // If the stream option is not set, return the stream as-is
        span.setAttribute("response", JSON.stringify(stream));
        span.setStatus({ code: SpanStatusCode.OK });
        span.end();
        return stream;
      }

      // If the stream option is set, wrap the stream to manage the span
      // Return a wrapped async iterable to manage the span during iteration
      span.addEvent("Stream Started");
      return (async function* () {
        try {
          let totalTokens = 0;
          let result = [];
          for await (const chunk of stream) {
            // add token count to span
            const tokenCount = estimateTokensInChunk(
              chunk.choices[0]?.delta?.content || ""
            );
            totalTokens += tokenCount;
            span.addEvent(chunk.choices[0]?.delta?.content || "", {
              tokenCount,
            });
            result.push(chunk.choices[0]?.delta?.content || "");
            yield chunk; // Pass through the chunk
          }
          span.setStatus({ code: SpanStatusCode.OK });
          span.setAttribute("tokens", totalTokens);
          span.setAttribute("response", result.join(""));
          span.addEvent("Stream Ended");
        } catch (error: any) {
          span.recordException(error);
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error.message,
          });
          throw error; // Rethrow the error to be handled by the caller
        } finally {
          span.end(); // End the span when the stream ends or an error occurs
        }
      })();
    } catch (error: any) {
      // Handle errors that occur before the stream is successfully initiated
      span.recordException(error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      span.end();
      throw error; // Rethrow the error to be handled by the caller
    }
  };
}

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
      request: JSON.stringify({
        baseURL: originalContext._client?.baseURL,
        maxRetries: originalContext._client?.maxRetries,
        timeout: originalContext._client?.timeout,
        body: args,
      }),
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
