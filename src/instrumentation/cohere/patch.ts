/* eslint-disable @typescript-eslint/no-unsafe-return */
/*
 * Copyright (c) 2024 Scale3 Labs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { LANGTRACE_ADDITIONAL_SPAN_ATTRIBUTES_KEY } from '@langtrace-constants/common'
import {
  Exception,
  Span,
  SpanKind,
  SpanStatusCode,
  Tracer,
  context,
  trace
} from '@opentelemetry/api'
import {
  ICohereClient, IChatRequest, IV2ChatRequest, IRequestOptions, ChatFn, INonStreamedChatResponse, ChatStreamFn, IEmbedRequest, IEmbedResponse,
  EmbedFn,
  RerankFn,
  IRerankResponse,
  IRerankRequest,
  EmbedJobsCreateFn,
  ICreateEmbedJobRequest,
  ICreateEmbedJobResponse,
  IV2ChatResponse,
  ChatV2Fn,
  ChatV2StreamFn
} from '@langtrace-instrumentation/cohere/types'
import { APIS, LLMSpanAttributes, Event } from '@langtrase/trace-attributes'
import { addSpanEvent, createStreamProxy } from '@langtrace-utils/misc'
import { LangtraceSdkError } from 'errors/sdk_error'

export const chatPatch = (original: ChatFn, tracer: Tracer, langtraceVersion: string, sdkName: string, moduleVersion?: string) => {
  return async function (this: ICohereClient, request: IChatRequest, requestOptions?: IRequestOptions): Promise<INonStreamedChatResponse> {
    const customAttributes = context.active().getValue(LANGTRACE_ADDITIONAL_SPAN_ATTRIBUTES_KEY) ?? {}
    const attributes: LLMSpanAttributes = {
      'langtrace.sdk.name': sdkName,
      'langtrace.service.name': this._options.clientName ?? 'cohere',
      'langtrace.service.type': 'llm',
      'gen_ai.operation.name': 'chat',
      'langtrace.version': langtraceVersion,
      'langtrace.service.version': moduleVersion,
      'url.full': 'https://api.cohere.ai',
      'url.path': APIS.cohere.CHAT.ENDPOINT,
      'gen_ai.request.model': request.model ?? 'command-r',
      'http.max.retries': requestOptions?.maxRetries,
      'gen_ai.request.temperature': request.temperature,
      'gen_ai.request.frequency_penalty': request.frequencyPenalty,
      'gen_ai.request.presence_penalty': request.presencePenalty,
      'gen_ai.request.top_p': request.p,
      'gen_ai.request.top_k': request.k,
      'gen_ai.request.seed': request.seed?.toString(),
      'gen_ai.request.max_tokens': request.maxTokens,
      'gen_ai.request.documents': request.documents !== undefined ? JSON.stringify(request.documents) : undefined,
      'gen_ai.request.tools': request.tools !== undefined ? JSON.stringify(request.tools) : undefined,
      'gen_ai.request.tool_results': request.tools !== undefined ? JSON.stringify(request.toolResults) : undefined,
      'gen_ai.request.connectors': request.connectors !== undefined ? JSON.stringify(request.connectors) : undefined,
      'http.timeout': requestOptions?.timeoutInSeconds !== undefined ? requestOptions.timeoutInSeconds / 1000 : undefined,
      ...customAttributes
    }
    const spanName = customAttributes['langtrace.span.name' as keyof typeof customAttributes] ?? APIS.cohere.CHAT.METHOD
    const span = tracer.startSpan(spanName, { attributes, kind: SpanKind.CLIENT }, context.active())
    try {
      return await context.with(trace.setSpan(context.active(), span), async () => {
        const prompts: Array<{ role: string, content: string }> = []
        if (request.preamble !== undefined && request.preamble !== '') {
          prompts.push({ role: 'system', content: request.preamble })
        }
        if (request.chatHistory !== undefined) {
          prompts.push(...request.chatHistory.map((chat) => { return { role: chat.role === 'CHATBOT' ? 'assistant' : chat.role.toLowerCase(), content: chat.message } }))
        }
        prompts.push({ role: 'user', content: request.message })
        const response = await original.apply(this, [request, requestOptions])
        const responseAttributes: Partial<LLMSpanAttributes> = {
          'gen_ai.usage.output_tokens': response.meta?.billedUnits?.inputTokens,
          'gen_ai.usage.input_tokens': response.meta?.billedUnits?.outputTokens,
          'gen_ai.usage.total_tokens': Number(response.meta?.billedUnits?.inputTokens ?? 0) + Number(response.meta?.billedUnits?.outputTokens ?? 0),
          'gen_ai.usage.search_units': response.meta?.billedUnits?.searchUnits,
          'gen_ai.response_id': response.response_id,
          'gen_ai.response.tool_calls': response.toolCalls !== undefined ? JSON.stringify(response.toolCalls) : undefined
        }
        addSpanEvent(span, Event.GEN_AI_PROMPT, { 'gen_ai.prompt': JSON.stringify(prompts) })
        if (response.chatHistory !== undefined) {
          addSpanEvent(span, Event.GEN_AI_COMPLETION, { 'gen_ai.completion': JSON.stringify(response.chatHistory.map((chat) => { return { role: chat.role === 'CHATBOT' ? 'assistant' : chat.role.toLowerCase(), content: chat.message } })) })
        } else {
          addSpanEvent(span, Event.GEN_AI_COMPLETION, { 'gen_ai.completion': JSON.stringify([{ role: 'assistant', content: response.text }]) })
        }
        span.setAttributes({ ...attributes, ...responseAttributes })
        span.setStatus({ code: SpanStatusCode.OK })
        return response
      })
    } catch (error: any) {
      span.recordException(error as Exception)
      span.setStatus({ code: SpanStatusCode.ERROR })
      throw new LangtraceSdkError(error.message as string, error.stack as string)
    } finally {
      span.end()
    }
  }
}

export const chatPatchV2 = (
  original: ChatV2Fn,
  tracer: Tracer,
  langtraceVersion: string,
  sdkName: string,
  moduleVersion?: string
) => {
  return async function (
    this: ICohereClient,
    request: IV2ChatRequest,
    requestOptions?: IRequestOptions
  ): Promise<IV2ChatResponse> {
    const customAttributes = context.active().getValue(LANGTRACE_ADDITIONAL_SPAN_ATTRIBUTES_KEY) ?? {}
    const attributes: LLMSpanAttributes = {
      'langtrace.sdk.name': sdkName,
      'langtrace.service.name': this._options.clientName ?? 'cohere',
      'langtrace.service.type': 'llm',
      'gen_ai.operation.name': 'chat',
      'langtrace.version': langtraceVersion,
      'langtrace.service.version': moduleVersion,
      'url.full': 'https://api.cohere.ai',
      'url.path': APIS.cohere.CHATV2.ENDPOINT,
      'gen_ai.request.model': request.model ?? 'command-r',
      'http.max.retries': requestOptions?.maxRetries,
      'gen_ai.request.temperature': request.temperature,
      'gen_ai.request.frequency_penalty': request.frequencyPenalty,
      'gen_ai.request.presence_penalty': request.presencePenalty,
      'gen_ai.request.top_p': request.p,
      'gen_ai.request.top_k': request.k,
      'gen_ai.request.seed': request.seed?.toString(),
      'gen_ai.request.max_tokens': request.maxTokens,
      'gen_ai.request.documents': request.documents !== undefined ? JSON.stringify(request.documents) : undefined,
      'gen_ai.request.tools': request.tools !== undefined ? JSON.stringify(request.tools) : undefined,
      'http.timeout': requestOptions?.timeoutInSeconds !== undefined ? requestOptions.timeoutInSeconds / 1000 : undefined,
      ...customAttributes
    }

    const spanName = customAttributes['langtrace.span.name' as keyof typeof customAttributes] ?? APIS.cohere.CHAT.METHOD
    const span = tracer.startSpan(spanName, { attributes, kind: SpanKind.CLIENT }, context.active())

    try {
      return await context.with(trace.setSpan(context.active(), span), async () => {
        const prompts = [...request.messages]

        const response = await original.apply(this, [request, requestOptions])

        const responseAttributes: Partial<LLMSpanAttributes> = {
          'gen_ai.usage.input_tokens': response.usage.billedUnits.inputTokens,
          'gen_ai.usage.output_tokens': response.usage.billedUnits.outputTokens,
          'gen_ai.usage.total_tokens': response.usage.billedUnits.inputTokens + response.usage.billedUnits.outputTokens,
          'gen_ai.response_id': response.id
        }

        addSpanEvent(span, Event.GEN_AI_PROMPT, { 'gen_ai.prompt': JSON.stringify(prompts) })

        const assistantMessage = {
          role: response.message.role,
          content: response.message.content[0]?.text ?? ''
        }

        addSpanEvent(span, Event.GEN_AI_COMPLETION, { 'gen_ai.completion': JSON.stringify([assistantMessage]) })

        span.setAttributes({ ...attributes, ...responseAttributes })
        span.setStatus({ code: SpanStatusCode.OK })

        return response
      })
    } catch (error: any) {
      span.recordException(error as Exception)
      span.setStatus({ code: SpanStatusCode.ERROR })
      throw new LangtraceSdkError(error.message as string, error.stack as string)
    } finally {
      span.end()
    }
  }
}

export const chatStreamPatch = (original: ChatStreamFn, tracer: Tracer, langtraceVersion: string, sdkName: string, moduleVersion?: string) => {
  return async function (this: ICohereClient, request: IChatRequest, requestOptions?: IRequestOptions): Promise<any> {
    const customAttributes = context.active().getValue(LANGTRACE_ADDITIONAL_SPAN_ATTRIBUTES_KEY) ?? {}
    const attributes: LLMSpanAttributes = {
      'langtrace.sdk.name': sdkName,
      'langtrace.service.name': this._options.clientName ?? 'cohere',
      'langtrace.service.type': 'llm',
      'gen_ai.operation.name': 'chat',
      'langtrace.version': langtraceVersion,
      'langtrace.service.version': moduleVersion,
      'url.full': 'https://api.cohere.ai',
      'url.path': APIS.cohere.CHAT.ENDPOINT,
      'gen_ai.request.stream': true,
      'gen_ai.request.model': request.model ?? 'command-r',
      'http.max.retries': requestOptions?.maxRetries,
      'gen_ai.request.temperature': request.temperature,
      'gen_ai.request.frequency_penalty': request.frequencyPenalty,
      'gen_ai.request.presence_penalty': request.presencePenalty,
      'gen_ai.request.top_p': request.p,
      'gen_ai.request.top_k': request.k,
      'gen_ai.request.max_tokens': request.maxTokens,
      'gen_ai.request.seed': request.seed?.toString(),
      'gen_ai.request.documents': request.documents !== undefined ? JSON.stringify(request.documents) : undefined,
      'gen_ai.request.tools': request.tools !== undefined ? JSON.stringify(request.tools) : undefined,
      'gen_ai.request.tool_results': request.tools !== undefined ? JSON.stringify(request.toolResults) : undefined,
      'gen_ai.request.connectors': request.connectors !== undefined ? JSON.stringify(request.connectors) : undefined,
      'http.timeout': requestOptions?.timeoutInSeconds !== undefined ? requestOptions.timeoutInSeconds / 1000 : undefined,
      ...customAttributes
    }
    const spanName = customAttributes['langtrace.span.name' as keyof typeof customAttributes] ?? APIS.cohere.CHAT_STREAM.METHOD
    const span = tracer.startSpan(spanName, { kind: SpanKind.CLIENT, attributes }, context.active())
    return await context.with(trace.setSpan(context.active(), span), async () => {
      const prompts: Array<{ role: string, content: string }> = []
      if (request.preamble !== undefined && request.preamble !== '') {
        prompts.push({ role: 'system', content: request.preamble })
      }
      if (request.chatHistory !== undefined) {
        prompts.push(...request.chatHistory.map((chat) => { return { role: chat.role === 'CHATBOT' ? 'assistant' : chat.role.toLowerCase(), content: chat.message } }))
      }
      prompts.push({ role: 'user', content: request.message })
      addSpanEvent(span, Event.GEN_AI_PROMPT, { 'gen_ai.prompt': JSON.stringify(prompts) })
      const response = await original.apply(this, [request, requestOptions])
      return createStreamProxy(response, handleStream(response, attributes, span))
    })
  }
}

export const chatStreamPatchV2 = (original: ChatV2StreamFn, tracer: Tracer, langtraceVersion: string, sdkName: string, moduleVersion?: string) => {
  return async function (this: ICohereClient, request: IV2ChatRequest, requestOptions?: IRequestOptions): Promise<any> {
    const customAttributes = context.active().getValue(LANGTRACE_ADDITIONAL_SPAN_ATTRIBUTES_KEY) ?? {}
    const attributes: LLMSpanAttributes = {
      'langtrace.sdk.name': sdkName,
      'langtrace.service.name': this._options.clientName ?? 'cohere',
      'langtrace.service.type': 'llm',
      'gen_ai.operation.name': 'chat',
      'langtrace.version': langtraceVersion,
      'langtrace.service.version': moduleVersion,
      'url.full': 'https://api.cohere.ai',
      'url.path': APIS.cohere.CHAT_STREAM_V2.ENDPOINT,
      'gen_ai.request.stream': true,
      'gen_ai.request.model': request.model ?? 'command-r',
      'http.max.retries': requestOptions?.maxRetries,
      'gen_ai.request.temperature': request.temperature,
      'gen_ai.request.frequency_penalty': request.frequencyPenalty,
      'gen_ai.request.presence_penalty': request.presencePenalty,
      'gen_ai.request.top_p': request.p,
      'gen_ai.request.top_k': request.k,
      'gen_ai.request.max_tokens': request.maxTokens,
      'gen_ai.request.seed': request.seed?.toString(),
      'gen_ai.request.documents': request.documents !== undefined ? JSON.stringify(request.documents) : undefined,
      'gen_ai.request.tools': request.tools !== undefined ? JSON.stringify(request.tools) : undefined,
      'http.timeout': requestOptions?.timeoutInSeconds !== undefined ? requestOptions.timeoutInSeconds / 1000 : undefined,
      ...customAttributes
    }
    const spanName = customAttributes['langtrace.span.name' as keyof typeof customAttributes] ?? 'cohere.chatStream'
    const span = tracer.startSpan(spanName, { kind: SpanKind.CLIENT, attributes }, context.active())
    return await context.with(trace.setSpan(context.active(), span), async () => {
      addSpanEvent(span, Event.GEN_AI_PROMPT, { 'gen_ai.prompt': JSON.stringify(request.messages) })
      const response = await original.apply(this, [request, requestOptions])
      return createStreamProxy(response, handleStreamV2(response, attributes, span))
    })
  }
}

export const embedPatch = (original: EmbedFn, tracer: Tracer, langtraceVersion: string, sdkName: string, moduleVersion?: string, v2 = false) => {
  return async function (this: ICohereClient, request: IEmbedRequest, requestOptions?: IRequestOptions): Promise<IEmbedResponse> {
    const customAttributes = context.active().getValue(LANGTRACE_ADDITIONAL_SPAN_ATTRIBUTES_KEY) ?? {}
    const attributes: LLMSpanAttributes = {
      'langtrace.sdk.name': sdkName,
      'langtrace.service.name': this._options.clientName ?? 'cohere',
      'langtrace.service.type': 'llm',
      'gen_ai.operation.name': 'embed',
      'langtrace.version': langtraceVersion,
      'langtrace.service.version': moduleVersion,
      'url.full': 'https://api.cohere.ai',
      'url.path': v2 ? APIS.cohere.EMBEDV2.ENDPOINT : APIS.cohere.EMBED.ENDPOINT,
      'gen_ai.request.model': request.model ?? 'embed-english-v2.0',
      'http.max.retries': requestOptions?.maxRetries,
      'gen_ai.request.embedding_input_type': request.inputType,
      'gen_ai.request.encoding_formats': request.embeddingTypes,
      'gen_ai.request.embedding_inputs': JSON.stringify(request.texts),
      'http.timeout': requestOptions?.timeoutInSeconds !== undefined ? requestOptions.timeoutInSeconds / 1000 : undefined,
      ...customAttributes
    }
    const spanName = customAttributes['langtrace.span.name' as keyof typeof customAttributes] ?? v2 ? APIS.cohere.EMBEDV2.METHOD : APIS.cohere.EMBED.METHOD
    const span = tracer.startSpan(spanName, { kind: SpanKind.CLIENT, attributes }, context.active())
    try {
      return await context.with(trace.setSpan(context.active(), span), async () => {
        const response = await original.apply(this, [request, requestOptions])
        attributes['gen_ai.usage.input_tokens'] = response.meta?.billedUnits?.outputTokens
        attributes['gen_ai.usage.output_tokens'] = response.meta?.billedUnits?.inputTokens
        attributes['gen_ai.usage.total_tokens'] = Number(response.meta?.billedUnits?.inputTokens ?? 0) + Number(response.meta?.billedUnits?.outputTokens ?? 0)
        attributes['gen_ai.usage.search_units'] = response.meta?.billedUnits?.searchUnits
        span.setAttributes(attributes)
        span.setStatus({ code: SpanStatusCode.OK })
        return response
      })
    } catch (error: any) {
      span.recordException(error as Exception)
      span.setStatus({ code: SpanStatusCode.ERROR })
      throw new LangtraceSdkError(error.message as string, error.stack as string)
    } finally {
      span.end()
    }
  }
}

export const embedJobsCreatePatch = (original: EmbedJobsCreateFn, tracer: Tracer, langtraceVersion: string, sdkName: string, moduleVersion?: string) => {
  return async function (this: ICohereClient, request: ICreateEmbedJobRequest, requestOptions?: IRequestOptions): Promise<ICreateEmbedJobResponse> {
    const customAttributes = context.active().getValue(LANGTRACE_ADDITIONAL_SPAN_ATTRIBUTES_KEY) ?? {}
    const attributes: Partial<LLMSpanAttributes> = {
      'langtrace.sdk.name': sdkName,
      'langtrace.service.name': this._options.clientName ?? 'cohere',
      'langtrace.service.type': 'llm',
      'langtrace.version': langtraceVersion,
      'langtrace.service.version': moduleVersion,
      'url.full': 'https://api.cohere.ai',
      'url.path': APIS.cohere.EMBED_JOBS.ENDPOINT,
      'gen_ai.request.model': request.model,
      'http.max.retries': requestOptions?.maxRetries,
      'gen_ai.request.embedding_input_type': request.inputType,
      'gen_ai.request.encoding_formats': request.embeddingTypes,
      'gen_ai.request.embedding_job_name': request.name,
      'gen_ai.request.embedding_dataset_id': request.datasetId,
      'http.timeout': requestOptions?.timeoutInSeconds !== undefined ? requestOptions.timeoutInSeconds / 1000 : undefined,
      ...customAttributes
    }
    const spanName = customAttributes['langtrace.span.name' as keyof typeof customAttributes] ?? APIS.cohere.EMBED_JOBS.METHOD
    const span = tracer.startSpan(spanName, { kind: SpanKind.CLIENT, attributes }, context.active())
    try {
      return await context.with(trace.setSpan(context.active(), span), async () => {
        const response = await original.apply(this, [request, requestOptions])
        attributes['gen_ai.usage.input_tokens'] = response.meta?.billedUnits?.outputTokens
        attributes['gen_ai.usage.output_tokens'] = response.meta?.billedUnits?.inputTokens
        attributes['gen_ai.usage.total_tokens'] = Number(response.meta?.billedUnits?.inputTokens ?? 0) + Number(response.meta?.billedUnits?.outputTokens ?? 0)
        attributes['gen_ai.usage.search_units'] = response.meta?.billedUnits?.searchUnits
        span.setAttributes(attributes)
        span.setStatus({ code: SpanStatusCode.OK })
        return response
      })
    } catch (error: any) {
      span.setStatus({ code: SpanStatusCode.ERROR })
      span.recordException(error as Exception)
      throw new LangtraceSdkError(error.message as string, error.stack as string)
    } finally {
      span.end()
    }
  }
}

export const rerankPatch = (original: RerankFn, tracer: Tracer, langtraceVersion: string, sdkName: string, moduleVersion?: string, v2 = false) => {
  return async function (this: ICohereClient, request: IRerankRequest, requestOptions?: IRequestOptions): Promise<IRerankResponse> {
    const customAttributes = context.active().getValue(LANGTRACE_ADDITIONAL_SPAN_ATTRIBUTES_KEY) ?? {}
    const attributes: LLMSpanAttributes = {
      'langtrace.sdk.name': sdkName,
      'langtrace.service.name': this._options.clientName ?? 'cohere',
      'langtrace.service.type': 'llm',
      'gen_ai.cohere.rerank.query': request.query,
      'langtrace.version': langtraceVersion,
      'langtrace.service.version': moduleVersion,
      'url.full': 'https://api.cohere.ai',
      'url.path': v2 ? APIS.cohere.RERANKV2.ENDPOINT : APIS.cohere.RERANK.ENDPOINT,
      'gen_ai.request.model': request.model ?? '',
      'gen_ai.operation.name': 'rerank',
      'http.max.retries': requestOptions?.maxRetries,
      'gen_ai.request.documents': JSON.stringify(request.documents),
      'gen_ai.request.top_k': request.topN,
      'http.timeout': requestOptions?.timeoutInSeconds !== undefined ? requestOptions.timeoutInSeconds / 1000 : undefined,
      ...customAttributes
    }
    const spanName = customAttributes['langtrace.span.name' as keyof typeof customAttributes] ?? v2 ? APIS.cohere.RERANKV2.METHOD : APIS.cohere.RERANK.METHOD
    const span = tracer.startSpan(spanName, { kind: SpanKind.CLIENT, attributes }, context.active())
    try {
      return await context.with(trace.setSpan(context.active(), span), async () => {
        const response = await original.apply(this, [request, requestOptions])
        attributes['gen_ai.cohere.rerank.results'] = JSON.stringify(response.results)
        attributes['gen_ai.response_id'] = response.id
        attributes['gen_ai.usage.input_tokens'] = response.meta?.billedUnits?.outputTokens
        attributes['gen_ai.usage.total_tokens'] = Number(response.meta?.billedUnits?.inputTokens ?? 0) + Number(response.meta?.billedUnits?.outputTokens ?? 0)
        attributes['gen_ai.usage.output_tokens'] = response.meta?.billedUnits?.inputTokens
        attributes['gen_ai.usage.search_units'] = response.meta?.billedUnits?.searchUnits

        span.setAttributes(attributes)
        span.setStatus({ code: SpanStatusCode.OK })
        return response
      })
    } catch (error: any) {
      span.recordException(error as Exception)
      span.setStatus({ code: SpanStatusCode.ERROR })
      throw new LangtraceSdkError(error.message as string, error.stack as string)
    } finally {
      span.end()
    }
  }
}

async function * handleStream (stream: any, attributes: LLMSpanAttributes, span: Span): any {
  try {
    addSpanEvent(span, Event.STREAM_START)
    for await (const chat of stream) {
      if (chat.eventType === 'stream-end') {
        addSpanEvent(span, Event.STREAM_END)
        let response: Array<{ role: string, content: string }> | { role: string, content: string } = []
        if (chat.response.chatHistory !== undefined) {
          response = chat.response.chatHistory.map((chat: any) => { return { role: chat.role === 'CHATBOT' ? 'assistant' : chat.role.toLowerCase(), content: chat.message } })
        } else {
          response = { role: chat.role === 'CHATBOT' ? 'assistant' : chat.role === 'SYSTEM' ? 'system' : 'user', content: chat.response.text }
        }
        addSpanEvent(span, Event.GEN_AI_COMPLETION, { 'gen_ai.completion': JSON.stringify(response) })
        attributes['gen_ai.usage.input_tokens'] = chat.response.meta?.billedUnits?.outputTokens
        attributes['gen_ai.usage.output_tokens'] = chat.response.meta?.billedUnits?.inputTokens
        attributes['gen_ai.usage.total_tokens'] = Number(chat.response.meta?.billedUnits?.inputTokens ?? 0) + Number(chat.response.meta?.billedUnits?.outputTokens ?? 0)
        attributes['gen_ai.usage.search_units'] = chat.response.meta?.billedUnits?.searchUnits
        attributes['gen_ai.response.tool_calls'] = chat.response.toolCalls !== undefined ? JSON.stringify(chat.response.toolCalls) : undefined
        attributes['gen_ai.response_id'] = chat.response.response_id
      }
      yield chat
    }

    span.setAttributes(attributes)
    span.setStatus({ code: SpanStatusCode.OK })
  } catch (error: any) {
    span.recordException(error as Exception)
    span.setStatus({ code: SpanStatusCode.ERROR })
    throw new LangtraceSdkError(error.message as string, error.stack as string)
  } finally {
    span.end()
  }
}

async function * handleStreamV2 (stream: any, attributes: LLMSpanAttributes, span: Span): AsyncGenerator {
  let accumulatedText = ''

  try {
    addSpanEvent(span, Event.STREAM_START)

    for await (const chunk of stream) {
      if (chunk.type === 'message-start') {
        attributes['gen_ai.response_id'] = chunk.id
      } else if (chunk.type === 'content-delta') {
        accumulatedText += chunk.delta?.message?.content?.text as string
      } else if (chunk.type === 'message-end') {
        addSpanEvent(span, Event.STREAM_END)

        const response = {
          role: 'assistant',
          content: accumulatedText
        }

        addSpanEvent(span, Event.GEN_AI_COMPLETION, { 'gen_ai.completion': JSON.stringify([response]) })

        if (chunk.delta?.usage?.billedUnits !== undefined) {
          const { inputTokens, outputTokens } = chunk.delta.usage.billedUnits
          attributes['gen_ai.usage.input_tokens'] = inputTokens
          attributes['gen_ai.usage.output_tokens'] = outputTokens
          attributes['gen_ai.usage.total_tokens'] = Number(inputTokens ?? 0) + Number(outputTokens ?? 0)
        }
      }

      yield chunk
    }

    span.setAttributes(attributes)
    span.setStatus({ code: SpanStatusCode.OK })
  } catch (error: any) {
    span.recordException(error as Exception)
    span.setStatus({ code: SpanStatusCode.ERROR })
    throw new LangtraceSdkError(error.message as string, error.stack as string)
  } finally {
    span.end()
  }
}
