/* eslint-disable no-console */
import { Span, SpanKind, SpanStatusCode, Tracer, context, trace } from '@opentelemetry/api'
import {
  ChatFn, ChatStreamFn, EmbeddingsFn, GenerateFn, GenerateStreamFn, IChatRequest, IChatResponse, IEmbeddingsRequest, IEmbeddingsResponse, IGenerateRequest, IGenerateResponse, IOllamaClient
} from '@langtrace-instrumentation/ollama/types'
import { LANGTRACE_ADDITIONAL_SPAN_ATTRIBUTES_KEY } from '@langtrace-constants/common'
import { APIS } from '@langtrace-constants/instrumentation/ollama'
import { Event } from '@langtrace-constants/instrumentation/common'
import { LLMSpanAttributes } from '@langtrase/trace-attributes'
import { createStreamProxy } from '@langtrace-utils/misc'

export const chatPatch = (original: ChatStreamFn | ChatFn, tracer: Tracer, langtraceVersion: string, sdkName: string, moduleVersion?: string) => {
  return async function (this: IOllamaClient, chatRequest: IChatRequest): Promise<IChatResponse | AsyncIterable<IChatResponse>> {
    if (chatRequest.stream === true) {
      return await chatStreamPatch(original as ChatStreamFn, tracer, langtraceVersion, sdkName, moduleVersion).apply(this, [chatRequest as IChatRequest & { stream: true }])
    }
    return await chatPatchNonStreamed(original as ChatFn, tracer, langtraceVersion, sdkName, moduleVersion).apply(this, [chatRequest])
  }
}

export const generatePatch = (original: GenerateStreamFn | GenerateFn, tracer: Tracer, langtraceVersion: string, sdkName: string, moduleVersion?: string) => {
  return async function (this: IOllamaClient, chatRequest: IGenerateRequest): Promise<IGenerateResponse | AsyncIterable<IGenerateResponse>> {
    if (chatRequest.stream === true) {
      return await generateStreamPatch(original as GenerateStreamFn, tracer, langtraceVersion, sdkName, moduleVersion).apply(this, [chatRequest as IGenerateRequest & { stream: true }])
    }
    return await generatePatchNonStreamed(original as GenerateFn, tracer, langtraceVersion, sdkName, moduleVersion).apply(this, [chatRequest])
  }
}

export const generateStreamPatch = (original: GenerateStreamFn, tracer: Tracer, langtraceVersion: string, sdkName: string, moduleVersion?: string) => {
  return async function (this: IOllamaClient, generateRequest: IGenerateRequest): Promise<IGenerateResponse> {
    const customAttributes = context.active().getValue(LANGTRACE_ADDITIONAL_SPAN_ATTRIBUTES_KEY) ?? {}
    const prompts = []
    if (generateRequest.system !== undefined) {
      prompts.push({ role: 'SYSTEM', content: generateRequest.system })
    }
    prompts.push({ role: 'USER', content: generateRequest.prompt })

    const attributes: LLMSpanAttributes = {
      'langtrace.sdk.name': sdkName,
      'langtrace.service.name': 'ollama',
      'langtrace.service.type': 'llm',
      'langtrace.service.version': moduleVersion,
      'llm.prompts': JSON.stringify(prompts),
      'langtrace.version': langtraceVersion,
      'url.full': this?.config?.host,
      'llm.api': APIS.GENERATE.ENDPOINT,
      'llm.model': generateRequest.model,
      'llm.stream': generateRequest.stream,
      'llm.temperature': generateRequest.options?.temperature,
      'llm.top_p': generateRequest.options?.top_p,
      'http.timeout': Number.isNaN(Number(generateRequest?.keep_alive)) ? undefined : Number(generateRequest?.keep_alive),
      'llm.frequency_penalty': generateRequest?.options?.frequency_penalty?.toString(),
      'llm.presence_penalty': generateRequest?.options?.presence_penalty?.toString(),
      'llm.response_format': generateRequest.format,
      ...customAttributes
    }
    const span = tracer.startSpan(APIS.GENERATE.METHOD, { attributes, kind: SpanKind.CLIENT }, context.active())
    return await context.with(
      trace.setSpan(context.active(), span),
      async () => {
        const resp = await original.apply(this, [generateRequest])
        return createStreamProxy(resp, handleGenerateStream(resp, attributes, span))
      })
  }
}

export const generatePatchNonStreamed = (original: GenerateFn, tracer: Tracer, langtraceVersion: string, sdkName: string, moduleVersion?: string) => {
  return async function (this: IOllamaClient, generateRequest: IGenerateRequest): Promise<IGenerateResponse> {
    const customAttributes = context.active().getValue(LANGTRACE_ADDITIONAL_SPAN_ATTRIBUTES_KEY) ?? {}
    const prompts = []
    if (generateRequest.system !== undefined) {
      prompts.push({ role: 'SYSTEM', content: generateRequest.system })
    }
    prompts.push({ role: 'USER', content: generateRequest.prompt })

    const attributes: LLMSpanAttributes = {
      'langtrace.sdk.name': sdkName,
      'langtrace.service.name': 'ollama',
      'langtrace.service.type': 'llm',
      'llm.prompts': JSON.stringify(prompts),
      'langtrace.service.version': moduleVersion,
      'langtrace.version': langtraceVersion,
      'url.full': this?.config?.host,
      'llm.api': APIS.GENERATE.ENDPOINT,
      'llm.model': generateRequest.model,
      'llm.stream': generateRequest.stream,
      'llm.temperature': generateRequest.options?.temperature,
      'llm.top_p': generateRequest.options?.top_p,
      'http.timeout': Number.isNaN(Number(generateRequest?.keep_alive)) ? undefined : Number(generateRequest?.keep_alive),
      'llm.frequency_penalty': generateRequest?.options?.frequency_penalty?.toString(),
      'llm.presence_penalty': generateRequest?.options?.presence_penalty?.toString(),
      'llm.response_format': generateRequest.format,
      ...customAttributes
    }
    const span = tracer.startSpan(APIS.GENERATE.METHOD, { attributes, kind: SpanKind.CLIENT }, context.active())
    return await context.with(
      trace.setSpan(context.active(), span),
      async () => {
        try {
          const resp = await original.apply(this, [generateRequest])
          const responses = [{ content: resp.response, role: 'assistant' }]
          span.addEvent(Event.RESPONSE, { 'llm.responses': JSON.stringify(responses) })

          const inputTokens = (typeof resp?.prompt_eval_count !== 'undefined') ? resp.prompt_eval_count : 0
          const outputTokens = (typeof resp?.eval_count !== 'undefined') ? resp.eval_count : 0

          span.setAttributes({
            'llm.token.counts': JSON.stringify({
              input_tokens: inputTokens,
              output_tokens: outputTokens,
              total_tokens: inputTokens + outputTokens
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

export const chatPatchNonStreamed = (original: ChatFn, tracer: Tracer, langtraceVersion: string, sdkName: string, moduleVersion?: string) => {
  return async function (this: IOllamaClient, chatRequest: IChatRequest): Promise<IChatResponse> {
    const customAttributes = context.active().getValue(LANGTRACE_ADDITIONAL_SPAN_ATTRIBUTES_KEY) ?? {}
    const prompts: Array<{ role: string, content: string }> | undefined = chatRequest.messages?.map(({ role, content }) => ({ role: role.toUpperCase(), content })) ?? undefined
    const attributes: LLMSpanAttributes = {
      'langtrace.sdk.name': sdkName,
      'langtrace.service.name': 'ollama',
      'llm.prompts': JSON.stringify(prompts),
      'langtrace.service.type': 'llm',
      'langtrace.service.version': moduleVersion,
      'langtrace.version': langtraceVersion,
      'url.full': this?.config?.host,
      'llm.api': APIS.CHAT.ENDPOINT,
      'llm.model': chatRequest.model,
      'llm.stream': chatRequest.stream,
      'llm.temperature': chatRequest.options?.temperature,
      'llm.top_p': chatRequest.options?.top_p,
      'http.timeout': Number.isNaN(Number(chatRequest?.keep_alive)) ? undefined : Number(chatRequest?.keep_alive),
      'llm.frequency_penalty': chatRequest?.options?.frequency_penalty?.toString(),
      'llm.presence_penalty': chatRequest?.options?.presence_penalty?.toString(),
      'llm.response_format': chatRequest.format,
      ...customAttributes
    }
    const span = tracer.startSpan(APIS.CHAT.METHOD, { attributes, kind: SpanKind.CLIENT }, context.active())
    return await context.with(
      trace.setSpan(context.active(), span),
      async () => {
        try {
          const resp = await original.apply(this, [chatRequest])
          const responses = [{ content: resp.message.content, role: resp.message.role }]
          span.addEvent(Event.RESPONSE, { 'llm.responses': JSON.stringify(responses) })

          const inputTokens = (typeof resp?.prompt_eval_count !== 'undefined') ? resp.prompt_eval_count : 0
          const outputTokens = (typeof resp?.eval_count !== 'undefined') ? resp.eval_count : 0
          span.setAttributes({
            'llm.token.counts': JSON.stringify({
              input_tokens: inputTokens,
              output_tokens: outputTokens,
              total_tokens: inputTokens + outputTokens
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
  return async function (this: IOllamaClient, chatRequest: IChatRequest & { stream: true }): Promise<AsyncIterable<IChatResponse>> {
    const customAttributes = context.active().getValue(LANGTRACE_ADDITIONAL_SPAN_ATTRIBUTES_KEY) ?? {}
    const prompts: Array<{ role: string, content: string }> | undefined = chatRequest.messages?.map(({ role, content }) => ({ role: role.toUpperCase(), content })) ?? undefined
    const attributes: LLMSpanAttributes = {
      'langtrace.sdk.name': sdkName,
      'langtrace.service.name': 'ollama',
      'llm.prompts': JSON.stringify(prompts),
      'langtrace.service.type': 'llm',
      'langtrace.service.version': moduleVersion,
      'langtrace.version': langtraceVersion,
      'url.full': this?.config.host,
      'llm.api': APIS.CHAT.ENDPOINT,
      'llm.model': chatRequest.model,
      'llm.stream': chatRequest.stream,
      'llm.temperature': chatRequest.options?.temperature,
      'http.timeout': Number.isNaN(Number(chatRequest?.keep_alive)) ? undefined : Number(chatRequest?.keep_alive),
      'llm.top_p': chatRequest.options?.top_p,
      'llm.frequency_penalty': chatRequest?.options?.frequency_penalty?.toString(),
      'llm.presence_penalty': chatRequest?.options?.presence_penalty?.toString(),
      'llm.response_format': chatRequest.format,
      ...customAttributes
    }
    const span = tracer.startSpan(APIS.CHAT.METHOD, { kind: SpanKind.CLIENT, attributes }, context.active())
    return await context.with(
      trace.setSpan(context.active(), span),
      async () => {
        const resp = await original.apply(this, [chatRequest])
        return createStreamProxy(resp, handleChatStream(resp, attributes, span))
      })
  }
}

export const embeddingsPatch = (original: EmbeddingsFn, tracer: Tracer, langtraceVersion: string, sdkName: string, moduleVersion?: string) => {
  return async function (this: IOllamaClient, request: IEmbeddingsRequest): Promise<IEmbeddingsResponse> {
    const customAttributes = context.active().getValue(LANGTRACE_ADDITIONAL_SPAN_ATTRIBUTES_KEY) ?? {}
    const attributes: LLMSpanAttributes = {
      'langtrace.sdk.name': sdkName,
      'langtrace.service.name': 'ollama',
      'langtrace.service.type': 'llm',
      'langtrace.version': langtraceVersion,
      'langtrace.service.version': moduleVersion,
      'url.full': this.config.host,
      'llm.api': APIS.EMBEDDINGS.ENDPOINT,
      'llm.model': request.model,
      'llm.embedding_inputs': JSON.stringify(request.prompt),
      'http.timeout': Number.isNaN(Number(request.keep_alive)) ? undefined : Number(request.keep_alive),
      ...customAttributes
    }
    const span = tracer.startSpan(APIS.EMBEDDINGS.METHOD, { kind: SpanKind.CLIENT, attributes }, context.active())
    try {
      return await context.with(trace.setSpan(context.active(), span), async () => {
        const resp = await original.apply(this, [request])
        span.addEvent(Event.RESPONSE, { 'llm.responses': JSON.stringify(resp) })
        span.setAttributes(attributes)
        span.setStatus({ code: SpanStatusCode.OK })
        return resp
      })
    } catch (e: unknown) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: (e as Error).message })
      throw e
    } finally {
      span.end()
    }
  }
}

async function * handleChatStream (stream: AsyncIterable<any>, attributes: LLMSpanAttributes, span: Span): any {
  const responseReconstructed: string[] = []
  try {
    span.addEvent(Event.STREAM_START)
    for await (const chunk of stream) {
      span.addEvent(Event.STREAM_OUTPUT, { response: chunk.message.content ?? '' })
      responseReconstructed.push(chunk.message.content as string ?? '')
      if (chunk.done === true) {
        const inputTokens = (typeof chunk?.prompt_eval_count !== 'undefined') ? chunk.prompt_eval_count as number : 0
        const outputTokens = (typeof chunk?.eval_count !== 'undefined') ? chunk.eval_count as number : 0
        attributes['llm.token.counts'] = JSON.stringify({
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          total_tokens: inputTokens + outputTokens
        })
      }
      yield chunk
    }
    span.addEvent(Event.STREAM_END)
    span.addEvent(Event.RESPONSE, { 'llm.responses': JSON.stringify({ role: 'assistant', content: responseReconstructed.join('') }) })
    span.setAttributes(attributes)
    span.setStatus({ code: SpanStatusCode.OK })
  } catch (error: unknown) {
    span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message })
    throw error
  } finally {
    span.end()
  }
}

async function * handleGenerateStream (stream: AsyncIterable<any>, attributes: LLMSpanAttributes, span: Span): any {
  const responseReconstructed: string[] = []
  try {
    span.addEvent(Event.STREAM_START)
    for await (const chunk of stream) {
      span.addEvent(Event.STREAM_OUTPUT, { response: chunk.response ?? '' })
      responseReconstructed.push(chunk.response as string ?? '')
      if (chunk.done === true) {
        const inputTokens = (typeof chunk?.prompt_eval_count !== 'undefined') ? chunk.prompt_eval_count as number : 0
        const outputTokens = (typeof chunk?.eval_count !== 'undefined') ? chunk.eval_count as number : 0
        attributes['llm.token.counts'] = JSON.stringify({
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          total_tokens: inputTokens + outputTokens
        })
      }
      yield chunk
    }
    span.addEvent(Event.STREAM_END)
    span.addEvent(Event.RESPONSE, { 'llm.responses': JSON.stringify({ role: 'assistant', content: responseReconstructed.join('') }) })
    span.setAttributes(attributes)
    span.setStatus({ code: SpanStatusCode.OK })
  } catch (error: unknown) {
    span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message })
    throw error
  } finally {
    span.end()
  }
}
