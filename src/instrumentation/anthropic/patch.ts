import { APIS } from "@langtrace-constants/instrumentation/anthropic";
import { SERVICE_PROVIDERS } from "@langtrace-constants/instrumentation/common";
import { LangTraceSpan } from "@langtrace-extensions/langtracespan/langtrace_span";
import { estimateTokens } from "@langtrace-utils/llm";
import { Event, LLMSpanAttributes } from "@langtrase/trace-attributes";
import {
  Span,
  SpanKind,
  SpanStatusCode,
  Tracer,
  context,
  trace,
} from "@opentelemetry/api";

export function messagesCreate(
  originalMethod: (...args: any[]) => any,
  tracer: Tracer,
  version: string
): (...args: any[]) => any {
  return async function (this: any, ...args: any[]) {
    const originalContext = this;

    // Determine the service provider
    let serviceProvider = SERVICE_PROVIDERS.ANTHROPIC;

    const attributes: Partial<LLMSpanAttributes> = {
      "langtrace.service.name": serviceProvider,
      "langtrace.service.type": "llm",
      "langtrace.service.version": version,
      "langtrace.version": "1.0.0",
      "url.full": originalContext?._client?.baseURL,
      "llm.api": APIS.MESSAGES_CREATE.ENDPOINT,
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

    if (args[0]?.top_k) {
      attributes["llm.top_k"] = args[0]?.top_k;
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
          const span = new LangTraceSpan(tracer, APIS.MESSAGES_CREATE.METHOD, {
            kind: SpanKind.CLIENT,
          });
          span.addAttributes(attributes);
          try {
            const resp = await originalMethod.apply(this, args);
            span.addAttributes({
              "llm.responses": JSON.stringify(resp.content),
            });

            if (resp?.system_fingerprint) {
              span.addAttributes({
                "llm.system.fingerprint": resp?.system_fingerprint,
              });
            }
            span.addAttributes({
              "llm.token.counts": JSON.stringify({
                input_tokens: resp?.usage?.input_tokens || 0,
                output_tokens: resp?.usage?.output_tokens || 0,
                total_tokens:
                  resp?.usage?.input_tokens + resp?.usage?.output_tokens || 0,
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
          const span = new LangTraceSpan(tracer, APIS.MESSAGES_CREATE.METHOD, {
            kind: SpanKind.CLIENT,
          });
          span.addAttributes(attributes);
          const resp = await originalMethod.apply(this, args);
          return handleStreamResponse(span, resp);
        }
      );
    }
  };
}

async function* handleStreamResponse(span: LangTraceSpan, stream: any) {
  let result: string[] = [];

  span.addEvent(Event.STREAM_START);
  try {
    let input_tokens = 0;
    let output_tokens = 0;
    for await (const chunk of stream) {
      const content = chunk.delta?.text || "";
      result.push(content);
      input_tokens += chunk.message?.usage?.input_tokens || 0;
      output_tokens +=
        chunk.message?.usage?.output_tokens || estimateTokens(content) || 0;
      span.addEvent(Event.STREAM_OUTPUT, {
        response: JSON.stringify(content),
      });
      yield chunk;
    }

    span.setStatus({ code: SpanStatusCode.OK });
    span.addAttributes({
      "llm.token.counts": JSON.stringify({
        input_tokens,
        output_tokens,
        total_tokens: input_tokens + output_tokens,
      }),
      "llm.responses": JSON.stringify([{ text: result.join("") }]),
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
