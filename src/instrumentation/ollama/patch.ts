/* eslint-disable no-console */
import { Span, SpanKind, SpanStatusCode, Tracer, context, trace } from '@opentelemetry/api'
import {
  ChatFn, ChatStreamFn, EmbeddingsFn, GenerateFn, GenerateStreamFn, IChatRequest, IChatResponse, IEmbeddingsRequest, IEmbeddingsResponse, IGenerateRequest, IGenerateResponse, IOllamaClient
} from '@langtrace-instrumentation/ollama/types'
import { LANGTRACE_ADDITIONAL_SPAN_ATTRIBUTES_KEY } from '@langtrace-constants/common'
import { LLMSpanAttributes, Event, APIS } from '@langtrase/trace-attributes'
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
      prompts.push({ role: 'system', content: generateRequest.system })
    }
    prompts.push({ role: 'user', content: generateRequest.prompt })

    const attributes: LLMSpanAttributes = {
      'langtrace.sdk.name': sdkName,
      'langtrace.service.name': 'ollama',
      'langtrace.service.type': 'llm',
      'langtrace.service.version': moduleVersion,
      'langtrace.version': langtraceVersion,
      'url.full': this?.config?.host,
      'url.path': APIS.ollama.GENERATE.ENDPOINT,
      'gen_ai.request.model': generateRequest.model,
      'gen_ai.request.stream': generateRequest.stream,
      'gen_ai.request.temperature': generateRequest.options?.temperature,
      'gen_ai.request.top_p': generateRequest.options?.top_p,
      'http.timeout': Number.isNaN(Number(generateRequest?.keep_alive)) ? undefined : Number(generateRequest?.keep_alive),
      'gen_ai.request.frequency_penalty': generateRequest?.options?.frequency_penalty,
      'gen_ai.request.presence_penalty': generateRequest?.options?.presence_penalty,
      'gen_ai.request.response_format': generateRequest.format,
      ...customAttributes
    }
    const span = tracer.startSpan(APIS.ollama.GENERATE.METHOD, { attributes, kind: SpanKind.CLIENT }, context.active())
    span.addEvent(Event.GEN_AI_PROMPT, { 'gen_ai.prompt': JSON.stringify(prompts) })
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
      prompts.push({ role: 'system', content: generateRequest.system })
    }
    prompts.push({ role: 'user', content: generateRequest.prompt })

    const attributes: LLMSpanAttributes = {
      'langtrace.sdk.name': sdkName,
      'langtrace.service.name': 'ollama',
      'langtrace.service.type': 'llm',
      'langtrace.service.version': moduleVersion,
      'langtrace.version': langtraceVersion,
      'url.full': this?.config?.host,
      'url.path': APIS.ollama.GENERATE.ENDPOINT,
      'gen_ai.request.model': generateRequest.model,
      'gen_ai.request.stream': generateRequest.stream,
      'gen_ai.request.temperature': generateRequest.options?.temperature,
      'gen_ai.request.top_p': generateRequest.options?.top_p,
      'http.timeout': Number.isNaN(Number(generateRequest?.keep_alive)) ? undefined : Number(generateRequest?.keep_alive),
      'gen_ai.request.frequency_penalty': generateRequest?.options?.frequency_penalty,
      'gen_ai.request.presence_penalty': generateRequest?.options?.presence_penalty,
      'gen_ai.request.response_format': generateRequest.format,
      ...customAttributes
    }
    const span = tracer.startSpan(APIS.ollama.GENERATE.METHOD, { attributes, kind: SpanKind.CLIENT }, context.active())
    span.addEvent(Event.GEN_AI_PROMPT, { 'gen_ai.prompt': JSON.stringify(prompts) })
    return await context.with(
      trace.setSpan(context.active(), span),
      async () => {
        try {
          const resp = await original.apply(this, [generateRequest])
          const responses = [{ content: resp.response, role: 'assistant' }]
          span.addEvent(Event.GEN_AI_COMPLETION, { 'gen_ai.completion': JSON.stringify(responses) })
          attributes['gen_ai.usage.prompt_tokens'] = resp?.prompt_eval_count
          attributes['gen_ai.usage.completion_tokens'] = resp?.eval_count
          attributes['gen_ai.usage.total_tokens'] = Number(resp?.prompt_eval_count ?? 0) + Number(resp?.eval_count ?? 0)
          attributes['gen_ai.response.model'] = resp.model

          span.setAttributes(attributes)
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
    const prompts: Array<{ role: string, content: string }> | undefined = chatRequest.messages?.map(({ role, content }) => ({ role: role.toLowerCase(), content })) ?? undefined
    const attributes: LLMSpanAttributes = {
      'langtrace.sdk.name': sdkName,
      'langtrace.service.name': 'ollama',
      'langtrace.service.type': 'llm',
      'langtrace.service.version': moduleVersion,
      'langtrace.version': langtraceVersion,
      'url.full': this?.config?.host,
      'url.path': APIS.ollama.CHAT.ENDPOINT,
      'gen_ai.request.model': chatRequest.model,
      'gen_ai.request.stream': chatRequest.stream,
      'gen_ai.request.temperature': chatRequest.options?.temperature,
      'gen_ai.request.top_p': chatRequest.options?.top_p,
      'http.timeout': Number.isNaN(Number(chatRequest?.keep_alive)) ? undefined : Number(chatRequest?.keep_alive),
      'gen_ai.request.frequency_penalty': chatRequest?.options?.frequency_penalty,
      'gen_ai.request.presence_penalty': chatRequest?.options?.presence_penalty,
      'gen_ai.request.response_format': chatRequest.format,
      ...customAttributes
    }
    const span = tracer.startSpan(APIS.ollama.CHAT.METHOD, { attributes, kind: SpanKind.CLIENT }, context.active())
    return await context.with(
      trace.setSpan(context.active(), span),
      async () => {
        try {
          const resp = await original.apply(this, [chatRequest])
          const responses = [{ content: resp.message.content, role: resp.message.role.toLowerCase() }]
          span.addEvent(Event.GEN_AI_PROMPT, { 'gen_ai.prompt': JSON.stringify(prompts) })
          span.addEvent(Event.GEN_AI_COMPLETION, { 'gen_ai.completion': JSON.stringify(responses) })
          attributes['gen_ai.usage.prompt_tokens'] = resp?.prompt_eval_count
          attributes['gen_ai.usage.completion_tokens'] = resp?.eval_count
          attributes['gen_ai.usage.total_tokens'] = Number(resp?.prompt_eval_count ?? 0) + Number(resp?.eval_count ?? 0)
          attributes['gen_ai.response.model'] = resp.model

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
  return async function (this: IOllamaClient, chatRequest: IChatRequest & { stream: true }): Promise<AsyncIterable<IChatResponse>> {
    const customAttributes = context.active().getValue(LANGTRACE_ADDITIONAL_SPAN_ATTRIBUTES_KEY) ?? {}
    const prompts: Array<{ role: string, content: string }> | undefined = chatRequest.messages?.map(({ role, content }) => ({ role: role.toLowerCase(), content })) ?? undefined
    const attributes: LLMSpanAttributes = {
      'langtrace.sdk.name': sdkName,
      'langtrace.service.name': 'ollama',
      'langtrace.service.type': 'llm',
      'langtrace.service.version': moduleVersion,
      'langtrace.version': langtraceVersion,
      'url.full': this?.config.host,
      'url.path': APIS.ollama.CHAT.ENDPOINT,
      'gen_ai.request.model': chatRequest.model,
      'gen_ai.request.stream': chatRequest.stream,
      'gen_ai.request.temperature': chatRequest.options?.temperature,
      'http.timeout': Number.isNaN(Number(chatRequest?.keep_alive)) ? undefined : Number(chatRequest?.keep_alive),
      'gen_ai.request.top_p': chatRequest.options?.top_p,
      'gen_ai.request.frequency_penalty': chatRequest?.options?.frequency_penalty,
      'gen_ai.request.presence_penalty': chatRequest?.options?.presence_penalty,
      'gen_ai.request.response_format': chatRequest.format,
      ...customAttributes
    }
    const span = tracer.startSpan(APIS.ollama.CHAT.METHOD, { kind: SpanKind.CLIENT, attributes }, context.active())
    span.addEvent(Event.GEN_AI_PROMPT, { 'gen_ai.prompt': JSON.stringify(prompts) })
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
      'url.path': APIS.ollama.EMBEDDINGS.ENDPOINT,
      'gen_ai.request.model': request.model,
      'gen_ai.request.embedding_inputs': JSON.stringify(request.prompt),
      'http.timeout': Number.isNaN(Number(request.keep_alive)) ? undefined : Number(request.keep_alive),
      ...customAttributes
    }
    const span = tracer.startSpan(APIS.ollama.EMBEDDINGS.METHOD, { kind: SpanKind.CLIENT, attributes }, context.active())
    try {
      return await context.with(trace.setSpan(context.active(), span), async () => {
        const resp = await original.apply(this, [request])
        span.addEvent(Event.GEN_AI_COMPLETION, { 'gen_ai.completion': JSON.stringify(resp) })
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
      span.addEvent(Event.STREAM_OUTPUT, { 'gen_ai.completion.chunk': JSON.stringify({ content: chunk.response ?? '', role: 'assistant' }) })
      responseReconstructed.push(chunk.message.content as string ?? '')
      if (chunk.done === true) {
        attributes['gen_ai.usage.prompt_tokens'] = chunk?.prompt_eval_count
        attributes['gen_ai.usage.completion_tokens'] = chunk?.eval_count
        attributes['gen_ai.usage.total_tokens'] = Number(chunk?.prompt_eval_count ?? 0) + Number(chunk?.eval_count ?? 0)
        attributes['gen_ai.response.model'] = chunk.model
      }
      yield chunk
    }
    span.addEvent(Event.STREAM_END)
    span.addEvent(Event.GEN_AI_COMPLETION, { 'gen_ai.completion': JSON.stringify({ role: 'assistant', content: responseReconstructed.join('') }) })
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
      span.addEvent(Event.STREAM_OUTPUT, { 'gen_ai.completion.chunk': JSON.stringify({ content: chunk.response ?? '', role: 'assistant' }) })
      responseReconstructed.push(chunk.response as string ?? '')
      if (chunk.done === true) {
        attributes['gen_ai.usage.prompt_tokens'] = chunk?.prompt_eval_count
        attributes['gen_ai.usage.completion_tokens'] = chunk?.eval_count
        attributes['gen_ai.usage.total_tokens'] = Number(chunk?.prompt_eval_count ?? 0) + Number(chunk?.eval_count ?? 0)
        attributes['gen_ai.response.model'] = chunk.model
      }
      yield chunk
    }
    span.addEvent(Event.STREAM_END)
    span.addEvent(Event.GEN_AI_COMPLETION, { 'gen_ai.completion': JSON.stringify({ role: 'assistant', content: responseReconstructed.join('') }) })
    span.setAttributes(attributes)
    span.setStatus({ code: SpanStatusCode.OK })
  } catch (error: unknown) {
    span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message })
    throw error
  } finally {
    span.end()
  }
}
