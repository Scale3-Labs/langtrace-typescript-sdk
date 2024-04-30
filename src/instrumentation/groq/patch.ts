import { SpanKind, SpanStatusCode, Tracer, context, trace } from '@opentelemetry/api'
import { ChatFn, IChatCompletionCreateParamsNonStreaming, IChatCompletionResponse, IGroqClient, IRequestOptions } from '@langtrace-instrumentation/groq/types'
import { LANGTRACE_ADDITIONAL_SPAN_ATTRIBUTES_KEY } from '@langtrace-constants/common'
import { APIS } from '@langtrace-constants/instrumentation/groq'
import { LLMSpanAttributes } from '@langtrase/trace-attributes'

export const chatPatch = (original: ChatFn, tracer: Tracer, langtraceVersion: string, sdkName: string, moduleVersion?: string) => {
  return async function (this: IGroqClient, body: IChatCompletionCreateParamsNonStreaming, options?: IRequestOptions): Promise<IChatCompletionResponse> {
    const customAttributes = context.active().getValue(LANGTRACE_ADDITIONAL_SPAN_ATTRIBUTES_KEY) ?? {}
    const attributes: LLMSpanAttributes = {
      'langtrace.sdk.name': sdkName,
      'langtrace.service.name': 'groq',
      'langtrace.service.type': 'llm',
      'langtrace.service.version': moduleVersion,
      'langtrace.version': langtraceVersion,
      'url.full': this?._client?.baseURL,
      'llm.api': APIS.CHAT_COMPLETION.METHOD,
      'llm.model': body.model,
      'http.max.retries': options?.maxRetries ?? this._client.maxRetries,
      'http.timeout': options?.timeout ?? this._client.timeout,
      'llm.stream': options?.stream ?? false,
      'llm.temperature': body.temperature,
      'llm.top_p': body.top_p,
      'llm.top_logprobs': body.top_logprobs,
      'llm.user': body.user,
      'llm.frequency_penalty': body?.frequency_penalty?.toString(),
      'llm.presence_penalty': body?.presence_penalty?.toString(),
      'llm.max_tokens': body?.max_tokens?.toString(),
      'llm.tools': JSON.stringify(body.tools),
      ...customAttributes
    }
    const span = tracer.startSpan(APIS.CHAT_COMPLETION.METHOD, { kind: SpanKind.CLIENT, attributes })
    return await context.with(
      trace.setSpan(context.active(), trace.getSpan(context.active()) ?? span),
      async () => {
        try {
          const resp = await original.apply(this, [body, options])
          const responses = resp?.choices?.map(({ message }) => {
            const result = {
              role: message?.role,
              content: message?.content !== undefined && message?.content !== null
                ? message?.content
                : JSON.stringify(message?.tool_calls)
            }
            return result
          })
          attributes['llm.responses'] = JSON.stringify(responses)
          span.setAttributes({
            'llm.responses': JSON.stringify(responses),
            'llm.model': resp.model
          })

          if (resp?.system_fingerprint !== undefined) {
            span.setAttributes({ 'llm.system.fingerprint': resp?.system_fingerprint })
          }
          span.setAttributes({
            'llm.token.counts': JSON.stringify({
              input_tokens: (typeof resp?.usage?.prompt_tokens !== 'undefined') ? resp.usage.prompt_tokens : 0,
              output_tokens: (typeof resp?.usage?.completion_tokens !== 'undefined') ? resp.usage.completion_tokens : 0,
              total_tokens: (typeof resp?.usage?.total_tokens !== 'undefined') ? resp.usage.total_tokens : 0
            })
          })
          span.setStatus({ code: SpanStatusCode.OK })
          return resp
        } finally {
          span.end()
        }
      })
  }
}
