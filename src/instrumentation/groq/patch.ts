import { Span, SpanKind, SpanStatusCode, Tracer, context, trace } from '@opentelemetry/api'
import {
  ChatFn, ChatStreamFn, IChatCompletionCreateParamsNonStreaming, IChatCompletionCreateParamsStreaming, IChatCompletionResponse, IChatCompletionResponseStreamed, IGroqClient, IRequestOptions
} from '@langtrace-instrumentation/groq/types'
import { LANGTRACE_ADDITIONAL_SPAN_ATTRIBUTES_KEY } from '@langtrace-constants/common'
import { APIS, LLMSpanAttributes, Event } from '@langtrase/trace-attributes'
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
      'url.path': APIS.groq.CHAT_COMPLETION.ENDPOINT,
      'gen_ai.request.model': body.model,
      'http.max.retries': options?.maxRetries ?? this._client.maxRetries,
      'http.timeout': options?.timeout ?? this._client.timeout,
      'gen_ai.request.stream': body?.stream ?? false,
      'gen_ai.request.temperature': body.temperature,
      'gen_ai.request.top_p': body.top_p,
      'gen_ai.request.top_logprobs': body.top_logprobs,
      'gen_ai.request.top_k': body.n,
      'gen_ai.user': body.user,
      'gen_ai.request.frequency_penalty': body?.frequency_penalty,
      'gen_ai.request.presence_penalty': body?.presence_penalty,
      'gen_ai.request.max_tokens': body?.max_tokens,
      'gen_ai.request.tools': JSON.stringify(body.tools),
      ...customAttributes
    }
    const span = tracer.startSpan(APIS.groq.CHAT_COMPLETION.METHOD, { attributes, kind: SpanKind.CLIENT }, context.active())
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
          span.addEvent(Event.GEN_AI_COMPLETION, { 'gen_ai.completion': JSON.stringify(responses) })
          attributes['gen_ai.system_fingerprint'] = resp?.system_fingerprint
          attributes['gen_ai.response.model'] = resp.model
          attributes['gen_ai.usage.prompt_tokens'] = resp?.usage?.prompt_tokens
          attributes['gen_ai.usage.completion_tokens'] = resp?.usage?.completion_tokens
          attributes['gen_ai.usage.total_tokens'] = resp?.usage?.total_tokens

          span.setAttributes(attributes)
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
      'url.path': APIS.groq.CHAT_COMPLETION.ENDPOINT,
      'gen_ai.request.model': body.model,
      'http.max.retries': options?.maxRetries ?? this._client.maxRetries,
      'http.timeout': options?.timeout ?? this._client.timeout,
      'gen_ai.request.stream': body?.stream ?? true,
      'gen_ai.request.temperature': body.temperature,
      'gen_ai.request.top_p': body.top_p,
      'gen_ai.request.top_logprobs': body.top_logprobs,
      'gen_ai.request.top_k': body.n,
      'gen_ai.user': body.user,
      'gen_ai.request.frequency_penalty': body?.frequency_penalty,
      'gen_ai.request.presence_penalty': body?.presence_penalty,
      'gen_ai.request.max_tokens': body?.max_tokens,
      'gen_ai.request.tools': JSON.stringify(body.tools),
      ...customAttributes
    }
    const span = tracer.startSpan(APIS.groq.CHAT_COMPLETION.METHOD, { kind: SpanKind.CLIENT, attributes }, context.active())
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
    let role: string | undefined
    for await (const chunk of stream) {
      const content = chunk.choices[0].delta.content as string
      const r = chunk.choices[0].delta.role
      if (r !== undefined) {
        role = r
      }
      if (content !== undefined) {
        span.addEvent(Event.STREAM_OUTPUT, { 'gen_ai.completion.chunk': JSON.stringify({ role, content }) })
      }
      responseReconstructed.push(chunk.choices[0].delta.content as string ?? '')

      if (chunk.choices[0].finish_reason === 'stop') {
        attributes['gen_ai.usage.completion_tokens'] = chunk.x_groq?.usage?.completion_tokens
        attributes['gen_ai.usage.prompt_tokens'] = chunk.x_groq?.usage?.prompt_tokens
        attributes['gen_ai.usage.total_tokens'] = Number(chunk.x_groq?.usage?.completion_tokens ?? 0) + Number(chunk.x_groq?.usage?.prompt_tokens ?? 0)
        attributes['gen_ai.response.model'] = chunk?.model
        attributes['gen_ai.system_fingerprint'] = chunk?.system_fingerprint
      }
      yield chunk
    }
    span.addEvent(Event.STREAM_END)
    span.addEvent(Event.GEN_AI_COMPLETION, { 'gen_ai.completion': JSON.stringify([{ role: 'assistant', content: responseReconstructed.join('') }]) })
    span.setAttributes(attributes)
    span.setStatus({ code: SpanStatusCode.OK })
  } catch (error: unknown) {
    span.recordException(error as Error)
    span.setStatus({ code: SpanStatusCode.ERROR })
    throw error
  } finally {
    span.end()
  }
}
