import { Span, SpanKind, SpanStatusCode, Tracer, context, trace } from '@opentelemetry/api'
import {
  ChatFn, ChatStreamFn, IChatCompletionCreateParamsNonStreaming, IChatCompletionCreateParamsStreaming, IChatCompletionResponse, IChatCompletionResponseStreamed, IGroqClient, IRequestOptions
} from '@langtrace-instrumentation/groq/types'
import { LANGTRACE_ADDITIONAL_SPAN_ATTRIBUTES_KEY } from '@langtrace-constants/common'
import { APIS } from '@langtrace-constants/instrumentation/groq'
import { Event } from '@langtrace-constants/instrumentation/common'
import { LLMSpanAttributes } from '@langtrase/trace-attributes'
import { createStreamProxy } from '@langtrace-utils/misc'

export const chatPatch = (original: ChatStreamFn | ChatFn, tracer: Tracer, langtraceVersion: string, sdkName: string, moduleVersion?: string) => {
  return async function (this: IGroqClient, body: IChatCompletionCreateParamsStreaming | IChatCompletionCreateParamsNonStreaming,
    options?: IRequestOptions): Promise<IChatCompletionResponse | AsyncIterable<IChatCompletionResponseStreamed>> {
    if (body.stream === true) {
      return await chatStreamPatch(original as ChatStreamFn, tracer, langtraceVersion, sdkName, moduleVersion).apply(this, [body, options])
    }
    return await chatPatchNonStreamed(original as ChatFn, tracer, langtraceVersion, sdkName, moduleVersion).apply(this, [body, options])
  }
}

export const chatPatchNonStreamed = (original: ChatFn, tracer: Tracer, langtraceVersion: string, sdkName: string, moduleVersion?: string) => {
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
      'llm.stream': body?.stream ?? false,
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
    const span = tracer.startSpan(APIS.CHAT_COMPLETION.METHOD, { attributes, kind: SpanKind.CLIENT }, context.active())
    return await context.with(
      trace.setSpan(context.active(), span),
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

export const chatStreamPatch = (original: ChatStreamFn, tracer: Tracer, langtraceVersion: string, sdkName: string, moduleVersion?: string) => {
  return async function (this: IGroqClient, body: IChatCompletionCreateParamsStreaming, options?: IRequestOptions) {
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
      'llm.stream': body?.stream ?? false,
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
    const span = tracer.startSpan(APIS.CHAT_COMPLETION.METHOD, { kind: SpanKind.CLIENT, attributes }, context.active())
    return await context.with(
      trace.setSpan(context.active(), span),
      async () => {
        const resp = await original.apply(this, [body, options])
        return createStreamProxy(resp, handleStream(resp, attributes, span))
      })
  }
}

async function * handleStream (stream: AsyncIterable<any>, attributes: LLMSpanAttributes, span: Span): any {
  const responseReconstructed: string[] = []
  try {
    span.addEvent(Event.STREAM_START)
    for await (const chunk of stream) {
      span.addEvent(Event.STREAM_OUTPUT, { response: chunk.choices[0].delta.content ?? '' })
      responseReconstructed.push(chunk.choices[0].delta.content as string ?? '')

      if (chunk.choices[0].finish_reason === 'stop') {
        const totalTokens = Number(chunk.x_groq?.usage?.completion_tokens ?? 0)
        const inputTokens = chunk.x_groq?.usage?.prompt_tokens ?? 0
        attributes['llm.token.counts'] = JSON.stringify({
          input_tokens: inputTokens,
          output_tokens: totalTokens - inputTokens,
          total_tokens: totalTokens
        })
      }
      yield chunk
    }
    span.addEvent(Event.STREAM_END)
    attributes['llm.responses'] = JSON.stringify([{ role: 'assistant', content: responseReconstructed.join('') }])
    span.setAttributes(attributes)
    span.setStatus({ code: SpanStatusCode.OK })
  } catch (error: unknown) {
    span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message })
    throw error
  } finally {
    span.end()
  }
}
