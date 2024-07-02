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
  ICohereClient, IChatRequest, IRequestOptions, ChatFn, INonStreamedChatResponse, ChatStreamFn, IEmbedRequest, IEmbedResponse,
  EmbedFn,
  RerankFn,
  IRerankResponse,
  IRerankRequest,
  EmbedJobsCreateFn,
  ICreateEmbedJobRequest,
  ICreateEmbedJobResponse
} from '@langtrace-instrumentation/cohere/types'
import { APIS, LLMSpanAttributes, Event } from '@langtrase/trace-attributes'
import { createStreamProxy } from '@langtrace-utils/misc'

export const chatPatch = (original: ChatFn, tracer: Tracer, langtraceVersion: string, sdkName: string, moduleVersion?: string) => {
  return async function (this: ICohereClient, request: IChatRequest, requestOptions?: IRequestOptions): Promise<INonStreamedChatResponse> {
    const customAttributes = context.active().getValue(LANGTRACE_ADDITIONAL_SPAN_ATTRIBUTES_KEY) ?? {}
    const attributes: LLMSpanAttributes = {
      'langtrace.sdk.name': sdkName,
      'langtrace.service.name': this._options.clientName ?? 'cohere',
      'langtrace.service.type': 'llm',
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
    const span = tracer.startSpan(APIS.cohere.CHAT.METHOD, { attributes, kind: SpanKind.CLIENT }, context.active())
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
        attributes['gen_ai.prompt'] = JSON.stringify(prompts)
        const response = await original.apply(this, [request, requestOptions])
        const responseAttributes: Partial<LLMSpanAttributes> = {
          'gen_ai.usage.prompt_tokens': response.meta?.billedUnits?.inputTokens,
          'gen_ai.usage.completion_tokens': response.meta?.billedUnits?.outputTokens,
          'gen_ai.usage.search_units': response.meta?.billedUnits?.searchUnits,
          'gen_ai.response_id': response.response_id,
          'gen_ai.response.tool_calls': response.toolCalls !== undefined ? JSON.stringify(response.toolCalls) : undefined
        }
        if (response.chatHistory !== undefined) {
          span.addEvent(Event.RESPONSE, { 'gen_ai.completion': JSON.stringify(response.chatHistory.map((chat) => { return { role: chat.role === 'CHATBOT' ? 'assistant' : chat.role.toLowerCase(), content: chat.message } })) })
        } else {
          span.addEvent(Event.RESPONSE, { 'gen_ai.completion': JSON.stringify([{ role: 'assistant', content: response.text }]) })
        }
        span.setAttributes({ ...attributes, ...responseAttributes })
        span.setStatus({ code: SpanStatusCode.OK })
        return response
      })
    } catch (e: unknown) {
      span.recordException(e as Exception)
      span.setStatus({ code: SpanStatusCode.ERROR })
      throw e
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
    const span = tracer.startSpan(APIS.cohere.CHAT_STREAM.METHOD, { kind: SpanKind.CLIENT, attributes }, context.active())
    return await context.with(trace.setSpan(context.active(), span), async () => {
      const prompts: Array<{ role: string, content: string }> = []
      if (request.preamble !== undefined && request.preamble !== '') {
        prompts.push({ role: 'system', content: request.preamble })
      }
      if (request.chatHistory !== undefined) {
        prompts.push(...request.chatHistory.map((chat) => { return { role: chat.role === 'CHATBOT' ? 'assistant' : chat.role.toLowerCase(), content: chat.message } }))
      }
      prompts.push({ role: 'user', content: request.message })
      attributes['gen_ai.prompt'] = JSON.stringify(prompts)
      const response = await original.apply(this, [request, requestOptions])
      return createStreamProxy(response, handleStream(response, attributes, span))
    })
  }
}

export const embedPatch = (original: EmbedFn, tracer: Tracer, langtraceVersion: string, sdkName: string, moduleVersion?: string) => {
  return async function (this: ICohereClient, request: IEmbedRequest, requestOptions?: IRequestOptions): Promise<IEmbedResponse> {
    const customAttributes = context.active().getValue(LANGTRACE_ADDITIONAL_SPAN_ATTRIBUTES_KEY) ?? {}
    const attributes: LLMSpanAttributes = {
      'langtrace.sdk.name': sdkName,
      'langtrace.service.name': this._options.clientName ?? 'cohere',
      'langtrace.service.type': 'llm',
      'langtrace.version': langtraceVersion,
      'langtrace.service.version': moduleVersion,
      'url.full': 'https://api.cohere.ai',
      'url.path': APIS.cohere.EMBED.ENDPOINT,
      'gen_ai.request.model': request.model ?? 'embed-english-v2.0',
      'http.max.retries': requestOptions?.maxRetries,
      'gen_ai.request.embedding_input_type': request.inputType,
      'gen_ai.request.encoding_formats': request.embeddingTypes,
      'gen_ai.request.embedding_inputs': JSON.stringify(request.texts),
      'http.timeout': requestOptions?.timeoutInSeconds !== undefined ? requestOptions.timeoutInSeconds / 1000 : undefined,
      ...customAttributes
    }
    const span = tracer.startSpan(APIS.cohere.EMBED.METHOD, { kind: SpanKind.CLIENT, attributes }, context.active())
    try {
      return await context.with(trace.setSpan(context.active(), span), async () => {
        const response = await original.apply(this, [request, requestOptions])
        attributes['gen_ai.usage.completion_tokens'] = response.meta?.billedUnits?.outputTokens
        attributes['gen_ai.usage.prompt_tokens'] = response.meta?.billedUnits?.inputTokens
        attributes['gen_ai.usage.search_units'] = response.meta?.billedUnits?.searchUnits
        span.setAttributes(attributes)
        span.setStatus({ code: SpanStatusCode.OK })
        return response
      })
    } catch (e: unknown) {
      span.recordException(e as Exception)
      span.setStatus({ code: SpanStatusCode.ERROR })
      throw e
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
    const span = tracer.startSpan(APIS.cohere.EMBED_JOBS.METHOD, { kind: SpanKind.CLIENT, attributes }, context.active())
    try {
      return await context.with(trace.setSpan(context.active(), span), async () => {
        const response = await original.apply(this, [request, requestOptions])
        attributes['gen_ai.usage.completion_tokens'] = response.meta?.billedUnits?.outputTokens
        attributes['gen_ai.usage.prompt_tokens'] = response.meta?.billedUnits?.inputTokens
        attributes['gen_ai.usage.search_units'] = response.meta?.billedUnits?.searchUnits
        span.setAttributes(attributes)
        span.setStatus({ code: SpanStatusCode.OK })
        return response
      })
    } catch (e: any) {
      span.setStatus({ code: SpanStatusCode.ERROR })
      span.recordException(e as Exception)
      throw e
    } finally {
      span.end()
    }
  }
}

export const rerankPatch = (original: RerankFn, tracer: Tracer, langtraceVersion: string, sdkName: string, moduleVersion?: string) => {
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
      'url.path': APIS.cohere.RERANK.ENDPOINT,
      'gen_ai.request.model': request.model,
      'http.max.retries': requestOptions?.maxRetries,
      'gen_ai.request.documents': JSON.stringify(request.documents),
      'gen_ai.request.top_k': request.topN,
      'http.timeout': requestOptions?.timeoutInSeconds !== undefined ? requestOptions.timeoutInSeconds / 1000 : undefined,
      ...customAttributes
    }
    const span = tracer.startSpan(APIS.cohere.RERANK.METHOD, { kind: SpanKind.CLIENT, attributes }, context.active())
    try {
      return await context.with(trace.setSpan(context.active(), span), async () => {
        const response = await original.apply(this, [request, requestOptions])
        attributes['gen_ai.cohere.rerank.results'] = JSON.stringify(response.results)
        attributes['gen_ai.response_id'] = response.id
        attributes['gen_ai.usage.completion_tokens'] = response.meta?.billedUnits?.outputTokens
        attributes['gen_ai.usage.prompt_tokens'] = response.meta?.billedUnits?.inputTokens
        attributes['gen_ai.usage.search_units'] = response.meta?.billedUnits?.searchUnits

        span.setAttributes(attributes)
        span.setStatus({ code: SpanStatusCode.OK })
        return response
      })
    } catch (e: unknown) {
      span.recordException(e as Exception)
      span.setStatus({ code: SpanStatusCode.ERROR })
      throw e
    } finally {
      span.end()
    }
  }
}

async function * handleStream (stream: any, attributes: LLMSpanAttributes, span: Span): any {
  try {
    span.addEvent(Event.STREAM_START)
    for await (const chat of stream) {
      if (chat.eventType === 'text-generation') {
        span.addEvent(Event.STREAM_OUTPUT, { 'gen_ai.completion.chunk': JSON.stringify({ role: 'assistant', content: chat.text }) })
      }
      if (chat.eventType === 'stream-end') {
        span.addEvent(Event.STREAM_END)
        let response: Array<{ role: string, content: string }> | { role: string, content: string } = []
        if (chat.response.chatHistory !== undefined) {
          response = chat.response.chatHistory.map((chat: any) => { return { role: chat.role === 'CHATBOT' ? 'assistant' : chat.role.toLowerCase(), content: chat.message } })
        } else {
          response = { role: chat.role === 'CHATBOT' ? 'assistant' : chat.role === 'SYSTEM' ? 'system' : 'user', content: chat.response.text }
        }
        span.addEvent(Event.RESPONSE, { 'gen_ai.completion': JSON.stringify(response) })
        attributes['gen_ai.usage.completion_tokens'] = chat.response.meta?.billedUnits?.outputTokens
        attributes['gen_ai.usage.prompt_tokens'] = chat.response.meta?.billedUnits?.inputTokens
        attributes['gen_ai.usage.search_units'] = chat.response.meta?.billedUnits?.searchUnits
        attributes['gen_ai.response.tool_calls'] = chat.response.toolCalls !== undefined ? JSON.stringify(chat.response.toolCalls) : undefined
        attributes['gen_ai.response_id'] = chat.response.response_id
      }
      yield chat
    }

    span.setAttributes(attributes)
    span.setStatus({ code: SpanStatusCode.OK })
  } catch (error: unknown) {
    span.recordException(error as Exception)
    span.setStatus({ code: SpanStatusCode.ERROR })
    throw error
  } finally {
    span.end()
  }
}
