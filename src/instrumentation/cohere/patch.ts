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
import { APIS } from '@langtrace-constants/instrumentation/cohere'
import { Event } from '@langtrace-constants/instrumentation/common'
import {
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
import { LLMSpanAttributes } from '@langtrase/trace-attributes'

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
      'llm.api': APIS.CHAT.ENDPOINT,
      'llm.model': request.model ?? 'command-r',
      'http.max.retries': requestOptions?.maxRetries,
      'llm.temperature': request.temperature,
      'llm.frequency_penalty': request.frequencyPenalty?.toString(),
      'llm.presence_penalty': request.presencePenalty?.toString(),
      'llm.top_p': request.p,
      'llm.top_k': request.k,
      'llm.seed': request.seed?.toString(),
      'llm.documents': request.documents !== undefined ? JSON.stringify(request.documents) : undefined,
      'llm.tools': request.tools !== undefined ? JSON.stringify(request.tools) : undefined,
      'llm.tool_results': request.tools !== undefined ? JSON.stringify(request.toolResults) : undefined,
      'llm.connectors': request.connectors !== undefined ? JSON.stringify(request.connectors) : undefined,
      'http.timeout': requestOptions?.timeoutInSeconds !== undefined ? requestOptions.timeoutInSeconds / 1000 : undefined,
      'llm.max_input_tokens': request.maxInputTokens?.toString(),
      'llm.max_tokens': request.maxTokens?.toString(),
      ...customAttributes
    }
    const span = tracer.startSpan(APIS.CHAT.METHOD, { kind: SpanKind.CLIENT, attributes })
    try {
      return await context.with(trace.setSpan(context.active(), trace.getSpan(context.active()) ?? span), async () => {
        const prompts: Array<{ role: string, content: string }> = []
        if (request.preamble !== undefined && request.preamble !== '') {
          prompts.push({ role: 'SYSTEM', content: request.preamble })
        }
        if (request.chatHistory !== undefined) {
          prompts.push(...request.chatHistory.map((chat) => { return { role: chat.role, content: chat.message } }))
        }
        prompts.push({ role: 'USER', content: request.message })
        attributes['llm.prompts'] = JSON.stringify(prompts)
        const response = await original.apply(this, [request, requestOptions])
        const totalTokens = Number(response.meta?.billedUnits?.inputTokens ?? 0) + Number(response.meta?.billedUnits?.outputTokens ?? 0)
        attributes['llm.token.counts'] = JSON.stringify({
          input_tokens: response.meta?.billedUnits?.inputTokens ?? 0,
          output_tokens: response.meta?.billedUnits?.outputTokens ?? 0,
          total_tokens: totalTokens,
          search_units: response.meta?.billedUnits?.searchUnits ?? 0
        })
        if (response.chatHistory !== undefined) {
          attributes['llm.responses'] = JSON.stringify(response.chatHistory.map((chat) => { return { role: chat.role, content: chat.message } }))
        } else {
          attributes['llm.responses'] = JSON.stringify([{ role: 'CHATBOT', content: response.text }])
        }
        attributes['llm.response_id'] = response.response_id
        attributes['llm.tool_calls'] = response.toolCalls !== undefined ? JSON.stringify(response.toolCalls) : undefined
        attributes['llm.generation_id'] = response.generationId
        attributes['llm.is_search_required'] = response.isSearchRequired
        span.setAttributes(attributes)
        span.setStatus({ code: SpanStatusCode.OK })
        return response
      })
    } catch (e: unknown) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: (e as Error).message })
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
      'llm.api': APIS.CHAT.ENDPOINT,
      'llm.model': request.model ?? 'command-r',
      'http.max.retries': requestOptions?.maxRetries,
      'llm.temperature': request.temperature,
      'llm.frequency_penalty': request.frequencyPenalty?.toString(),
      'llm.presence_penalty': request.presencePenalty?.toString(),
      'llm.top_p': request.p,
      'llm.top_k': request.k,
      'llm.seed': request.seed?.toString(),
      'llm.stream': true,
      'llm.documents': request.documents !== undefined ? JSON.stringify(request.documents) : undefined,
      'llm.tools': request.tools !== undefined ? JSON.stringify(request.tools) : undefined,
      'llm.tool_results': request.tools !== undefined ? JSON.stringify(request.toolResults) : undefined,
      'llm.connectors': request.connectors !== undefined ? JSON.stringify(request.connectors) : undefined,
      'http.timeout': requestOptions?.timeoutInSeconds !== undefined ? requestOptions.timeoutInSeconds / 1000 : undefined,
      'llm.max_input_tokens': request.maxInputTokens?.toString(),
      'llm.max_tokens': request.maxTokens?.toString(),
      ...customAttributes
    }
    const span = tracer.startSpan(APIS.CHAT_STREAM.METHOD, { kind: SpanKind.CLIENT, attributes })
    return await context.with(trace.setSpan(context.active(), trace.getSpan(context.active()) ?? span), async () => {
      const prompts: Array<{ role: string, content: string }> = []
      if (request.preamble !== undefined && request.preamble !== '') {
        prompts.push({ role: 'SYSTEM', content: request.preamble })
      }
      if (request.chatHistory !== undefined) {
        prompts.push(...request.chatHistory.map((chat) => { return { role: chat.role, content: chat.message } }))
      }
      prompts.push({ role: 'USER', content: request.message })
      attributes['llm.prompts'] = JSON.stringify(prompts)
      const response = await original.apply(this, [request, requestOptions])
      return handleStream(response, attributes, span)
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
      'llm.api': APIS.EMBED.ENDPOINT,
      'llm.model': request.model ?? 'embed-english-v2.0',
      'http.max.retries': requestOptions?.maxRetries,
      'llm.embedding_input_type': request.inputType,
      'llm.encoding.formats': JSON.stringify(request.embeddingTypes),
      'llm.embedding_inputs': JSON.stringify(request.texts),
      'http.timeout': requestOptions?.timeoutInSeconds !== undefined ? requestOptions.timeoutInSeconds / 1000 : undefined,
      ...customAttributes
    }
    const span = tracer.startSpan(APIS.EMBED.METHOD, { kind: SpanKind.CLIENT, attributes })
    try {
      return await context.with(trace.setSpan(context.active(), trace.getSpan(context.active()) ?? span), async () => {
        const response = await original.apply(this, [request, requestOptions])
        attributes['llm.token.counts'] = JSON.stringify({
          input_tokens: response.meta?.billedUnits?.inputTokens ?? 0,
          output_tokens: response.meta?.billedUnits?.outputTokens ?? 0,
          total_tokens: Number(response.meta?.billedUnits?.inputTokens ?? 0) + Number(response.meta?.billedUnits?.outputTokens ?? 0),
          search_units: response.meta?.billedUnits?.searchUnits ?? 0
        })
        span.setAttributes(attributes)
        span.setStatus({ code: SpanStatusCode.OK })
        return response
      })
    } catch (e: unknown) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: (e as Error).message })
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
      'llm.api': APIS.EMBED_JOBS.ENDPOINT,
      'llm.model': request.model,
      'http.max.retries': requestOptions?.maxRetries,
      'llm.embedding_input_type': request.inputType,
      'llm.encoding.formats': JSON.stringify(request.embeddingTypes),
      'llm.embedding_job_name': request.name,
      'http.timeout': requestOptions?.timeoutInSeconds !== undefined ? requestOptions.timeoutInSeconds / 1000 : undefined,
      'llm.embedding_dataset_id': request.datasetId,
      ...customAttributes
    }
    const span = tracer.startSpan(APIS.EMBED_JOBS.METHOD, { kind: SpanKind.CLIENT, attributes })
    try {
      return await context.with(trace.setSpan(context.active(), trace.getSpan(context.active()) ?? span), async () => {
        const response = await original.apply(this, [request, requestOptions])
        attributes['llm.token.counts'] = JSON.stringify({
          input_tokens: response.meta?.billedUnits?.inputTokens ?? 0,
          output_tokens: response.meta?.billedUnits?.outputTokens ?? 0,
          total_tokens: Number(response.meta?.billedUnits?.inputTokens ?? 0) + Number(response.meta?.billedUnits?.outputTokens ?? 0),
          search_units: response.meta?.billedUnits?.searchUnits ?? 0
        })
        span.setAttributes(attributes)
        span.setStatus({ code: SpanStatusCode.OK })
        return response
      })
    } catch (e: unknown) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: (e as Error).message })
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
      'llm.retrieval.query': request.query,
      'langtrace.version': langtraceVersion,
      'langtrace.service.version': moduleVersion,
      'url.full': 'https://api.cohere.ai',
      'llm.api': APIS.RERANK.ENDPOINT,
      'llm.model': request.model,
      'http.max.retries': requestOptions?.maxRetries,
      'llm.documents': JSON.stringify(request.documents),
      'llm.top_k': request.topN,
      'http.timeout': requestOptions?.timeoutInSeconds !== undefined ? requestOptions.timeoutInSeconds / 1000 : undefined,
      ...customAttributes
    }
    const span = tracer.startSpan(APIS.RERANK.METHOD, { kind: SpanKind.CLIENT, attributes })
    try {
      return await context.with(trace.setSpan(context.active(), trace.getSpan(context.active()) ?? span), async () => {
        const response = await original.apply(this, [request, requestOptions])
        const totalTokens = Number(response.meta?.billedUnits?.inputTokens ?? 0) + Number(response.meta?.billedUnits?.outputTokens ?? 0)
        attributes['llm.retrieval.results'] = JSON.stringify(response.results)
        attributes['llm.response_id'] = response.id
        attributes['llm.token.counts'] = JSON.stringify({
          input_tokens: response.meta?.billedUnits?.inputTokens ?? 0,
          output_tokens: response.meta?.billedUnits?.outputTokens ?? 0,
          search_units: response.meta?.billedUnits?.searchUnits ?? 0,
          total_tokens: totalTokens
        })
        span.setAttributes(attributes)
        span.setStatus({ code: SpanStatusCode.OK })
        return response
      })
    } catch (e: unknown) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: (e as Error).message })
      throw e
    } finally {
      span.end()
    }
  }
}

async function * handleStream (stream: any, attributes: LLMSpanAttributes, span: Span): AsyncGenerator<any, void> {
  try {
    span.addEvent(Event.STREAM_START)
    for await (const chat of stream) {
      if (chat.eventType === 'text-generation') {
        span.addEvent(Event.STREAM_OUTPUT, { response: chat.text })
      }
      if (chat.eventType === 'stream-end') {
        span.addEvent(Event.STREAM_END)
        if (chat.response.chatHistory !== undefined) {
          attributes['llm.responses'] = JSON.stringify(chat.response.chatHistory.map((chat: any) => { return { role: chat.role, content: chat.message } }))
        } else {
          attributes['llm.responses'] = JSON.stringify({ role: 'CHATBOT', content: chat.response.text })
        }
        const totalTokens = Number(chat.response.meta?.billedUnits?.inputTokens ?? 0) + Number(chat.response.meta?.billedUnits?.outputTokens ?? 0)
        attributes['llm.token.counts'] = JSON.stringify({
          input_tokens: chat.response.meta?.billedUnits?.inputTokens ?? 0,
          output_tokens: chat.response.meta?.billedUnits?.outputTokens ?? 0,
          total_tokens: totalTokens,
          search_units: chat.response.meta?.billedUnits?.searchUnits ?? 0
        })
        attributes['llm.tool_calls'] = chat.response.toolCalls !== undefined ? JSON.stringify(chat.response.toolCalls) : undefined
        attributes['llm.response_id'] = chat.response.response_id
        attributes['llm.generation_id'] = chat.response.generationId
      }
      yield chat
    }

    span.setAttributes(attributes)
    span.setStatus({ code: SpanStatusCode.OK })
  } catch (error: unknown) {
    span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message })
    throw error
  } finally {
    span.end()
  }
}
