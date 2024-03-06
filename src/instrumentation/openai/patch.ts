import { APIS } from "@langtrace-constants/instrumentation/openai";
import { SERVICE_PROVIDERS } from "@langtrace-constants/instrumentation/common";
import { LangTraceSpan } from "@langtrace-extensions/langtracespan/langtrace_span";
import { calculatePromptTokens, estimateTokens } from "@langtrace-utils/llm";
import { Event, LLMSpanAttributes } from "@langtrase/trace-attributes";
import { Tracer, context, trace, Span, SpanKind, SpanStatusCode } from "@opentelemetry/api";

export function imagesGenerate(
  originalMethod: (...args: any[]) => any,
  tracer: Tracer,
  version: string
): (...args: any[]) => any {
  return async function (this: any, ...args: any[]) {
    const originalContext = this;

    // Determine the service provider
    let serviceProvider = SERVICE_PROVIDERS.OPENAI;
    if (originalContext?._client?.baseURL?.includes("azure")) {
      serviceProvider = SERVICE_PROVIDERS.AZURE;
    }

    const attributes: LLMSpanAttributes = {
      "langtrace.service.name": serviceProvider,
      "langtrace.service.type": "llm",
      "langtrace.service.version": version,
      "langtrace.version": "1.0.0",
      "url.full": originalContext?._client?.baseURL,
      "llm.api": APIS.IMAGES_GENERATION.ENDPOINT,
      "llm.model": args[0]?.model,
      "http.max.retries": originalContext?._client?.maxRetries,
      "http.timeout": originalContext?._client?.timeout,
      "llm.prompts": JSON.stringify([args[0]?.prompt]),
    };

    return context.with(
      trace.setSpan(context.active(), trace.getSpan(context.active()) as Span),
      async () => {
        const span = new LangTraceSpan(tracer, APIS.IMAGES_GENERATION.METHOD, {
          kind: SpanKind.SERVER,
        });
        span.addAttributes(attributes);
        try {
          const response = await originalMethod.apply(originalContext, args);
          attributes["llm.responses"] = JSON.stringify(response?.data);
          span.setStatus({ code: SpanStatusCode.OK });
          span.end();
          return response;
        } catch (error: any) {
          span.recordException(error);
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error.message,
          });
          span.end();
          throw error;
        }
      }
    );
  };
}

export function chatCompletionCreate(
  originalMethod: (...args: any[]) => any,
  tracer: Tracer,
  version: string
): (...args: any[]) => any {
  return async function (this: any, ...args: any[]) {
    const originalContext = this;

    // Determine the service provider
    let serviceProvider = SERVICE_PROVIDERS.OPENAI;
    if (originalContext?._client?.baseURL?.includes("azure")) {
      serviceProvider = SERVICE_PROVIDERS.AZURE;
    }

    const attributes: Partial<LLMSpanAttributes> = {
      "langtrace.service.name": serviceProvider,
      "langtrace.service.type": "llm",
      "langtrace.service.version": version,
      "langtrace.version": "1.0.0",
      "url.full": originalContext?._client?.baseURL,
      "llm.api": APIS.CHAT_COMPLETION.ENDPOINT,
      "llm.model": args[0]?.model,
      "http.max.retries": originalContext?._client?.maxRetries,
      "http.timeout": originalContext?._client?.timeout,
      "llm.prompts": JSON.stringify(args[0]?.messages),
    };

    if (args[0]?.temperature) {
      attributes["llm.temperature"] = args[0]?.temperature;
    }

    if (args[0]?.top_p) {
      attributes["llm.top_p"] = args[0]?.top_p;
    }

    if (args[0]?.user) {
      attributes["llm.user"] = args[0]?.user;
    }

    if (!args[0].stream || args[0].stream === false) {
      return context.with(
        trace.setSpan(
          context.active(),
          trace.getSpan(context.active()) as Span
        ),
        async () => {
          const span = new LangTraceSpan(tracer, APIS.CHAT_COMPLETION.METHOD, {
            kind: SpanKind.CLIENT,
          });
          span.addAttributes(attributes);
          try {
            const model = args[0].model;
            const promptContent = JSON.stringify(args[0].messages[0]);
            const promptTokens = calculatePromptTokens(promptContent, model);
            const resp = await originalMethod.apply(this, args);
            const responses = resp?.choices?.map((choice: any) => {
              const result: Record<string, any> = {};
              result["message"] = choice?.message;
              if (choice?.content_filter_results) {
                result["content_filter_results"] =
                  choice?.content_filter_results;
              }
              return result;
            });
            span.addAttributes({
              "llm.responses": JSON.stringify(responses),
            });

            if (resp?.system_fingerprint) {
              span.addAttributes({
                "llm.system.fingerprint": resp?.system_fingerprint,
              });
            }
            span.addAttributes({
              "llm.token.counts": JSON.stringify({
                prompt_tokens: promptTokens,
                completion_tokens: resp?.usage?.completion_tokens || 0,
                total_tokens: resp?.usage?.total_tokens || 0,
              }),
            });
            span.setStatus({ code: SpanStatusCode.OK });
            return resp;
          } catch (error: any) {
            span.recordException(error);
            span.setStatus({
              code: SpanStatusCode.ERROR,
              message: error.message,
            });
            throw error;
          } finally {
            span.end();
          }
        }
      );
    } else {
      return context.with(
        trace.setSpan(
          context.active(),
          trace.getSpan(context.active()) as Span
        ),
        async () => {
          const span = new LangTraceSpan(tracer, APIS.CHAT_COMPLETION.METHOD, {
            kind: SpanKind.CLIENT,
          });
          span.addAttributes(attributes);
          const model = args[0].model;
          const promptContent = JSON.stringify(args[0].messages[0]);
          const promptTokens = calculatePromptTokens(promptContent, model);
          const resp = await originalMethod.apply(this, args);
          return handleStreamResponse(span, resp, promptTokens);
        }
      );
    }
  };
}

async function* handleStreamResponse(
  span: LangTraceSpan,
  stream: any,
  promptTokens: number
) {
  let completionTokens = 0;
  let result: string[] = [];

  span.addEvent(Event.STREAM_START);
  try {
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      const tokenCount = estimateTokens(content);
      completionTokens += tokenCount;
      result.push(content);
      span.addEvent(Event.STREAM_OUTPUT, {
        tokens: tokenCount,
        response: JSON.stringify(content),
      });
      yield chunk;
    }

    span.setStatus({ code: SpanStatusCode.OK });
    span.addAttributes({
      "llm.token.counts": JSON.stringify({
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: completionTokens + promptTokens,
      }),
      "llm.responses": JSON.stringify([
        { message: { role: "assistant", content: result.join("") } },
      ]),
    });
    span.addEvent(Event.STREAM_END);
  } catch (error: any) {
    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    throw error;
  } finally {
    span.end();
  }
}

export function embeddingsCreate(
  originalMethod: (...args: any[]) => any,
  tracer: Tracer,
  version: string
): (...args: any[]) => any {
  return async function (this: any, ...args: any[]) {
    const originalContext = this;

    // Determine the service provider
    let serviceProvider = SERVICE_PROVIDERS.OPENAI;
    if (originalContext?._client?.baseURL?.includes("azure")) {
      serviceProvider = SERVICE_PROVIDERS.AZURE;
    }

    const attributes: Partial<LLMSpanAttributes> = {
      "langtrace.service.name": serviceProvider,
      "langtrace.service.type": "llm",
      "langtrace.service.version": version,
      "langtrace.version": "1.0.0",
      "url.full": originalContext?._client?.baseURL,
      "llm.api": APIS.EMBEDDINGS_CREATE.ENDPOINT,
      "llm.model": args[0]?.model,
      "http.max.retries": originalContext?._client?.maxRetries,
      "http.timeout": originalContext?._client?.timeout,
      "llm.stream": args[0]?.stream,
    };

    if (args[0]?.encoding_format) {
      attributes["llm.encoding.format"] = args[0]?.encoding_format;
    }

    if (args[0]?.dimensions) {
      attributes["llm.dimensions"] = args[0]?.dimensions;
    }

    if (args[0]?.user) {
      attributes["llm.user"] = args[0]?.user;
    }

    return context.with(
      trace.setSpan(context.active(), trace.getSpan(context.active()) as Span),
      async () => {
        const span = new LangTraceSpan(tracer, APIS.EMBEDDINGS_CREATE.METHOD, {
          kind: SpanKind.SERVER,
        });
        span.addAttributes(attributes);
        try {
          const resp = await originalMethod.apply(originalContext, args);

          span.setStatus({ code: SpanStatusCode.OK });
          span.end();
          return resp;
        } catch (error: any) {
          span.recordException(error);
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error.message,
          });
          span.end();
          throw error;
        }
      }
    );
  };
}
