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
import { LLMSpanAttributes, Event } from '@langtrase/trace-attributes'
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
  IRerankRequest
} from '@langtrace-instrumentation/cohere/types'

export const chatPatch = (original: ChatFn, tracer: Tracer, langtraceVersion: string, sdkName: string, moduleVersion?: string) => {
  return async function (this: ICohereClient, request: IChatRequest, requestOptions?: IRequestOptions): Promise<INonStreamedChatResponse> {
    const customAttributes = context.active().getValue(LANGTRACE_ADDITIONAL_SPAN_ATTRIBUTES_KEY) ?? {}
    const attributes: Partial<LLMSpanAttributes> = {
      'langtrace.sdk.name': sdkName,
      'langtrace.service.name': this._options.clientName ?? 'cohere',
      'langtrace.service.type': 'llm',
      'langtrace.version': langtraceVersion,
      'langtrace.service.version': moduleVersion,
      'url.full': 'https://api.cohere.ai',
      'llm.api': APIS.CHAT.API,
      'llm.model': request.model ?? 'command-r',
      'http.max.retries': requestOptions?.maxRetries,
      'llm.temperature': request.temperature,
      'llm.frequency_penalty': request.frequencyPenalty?.toString(),
      'llm.presence_penalty': request.presencePenalty?.toString(),
      'llm.top_p': request.p,
      'llm.top_k': request.k,
      'llm.seed': request.seed?.toString(),
      'llm.documents': request.documents !== undefined ? JSON.stringify(request.documents) : undefined,
      'llm.tools': request.tools !== undefined ? JSON.stringify(request.tools.map(t => { return { ...t, tool_type: t.parameterDefinitions !== undefined ? 'function' : undefined } })) : undefined,
      'llm.tool_results': request.tools !== undefined ? JSON.stringify(request.toolResults) : undefined,
      'llm.connectors': request.connectors !== undefined ? JSON.stringify(request.connectors) : undefined,
      'http.timeout': requestOptions?.timeoutInSeconds !== undefined ? requestOptions.timeoutInSeconds / 1000 : undefined,
      ...customAttributes
    }
    const span = tracer.startSpan(APIS.CHAT.METHOD, { kind: SpanKind.CLIENT, attributes })
    try {
      return await context.with(trace.setSpan(context.active(), trace.getSpan(context.active()) ?? span), async () => {
        const prompts: Array<{ role: string, content: string }> = []
        if (request.preamble !== undefined && request.preamble !== '') {
          prompts.push({ role: 'SYSTEM', content: request.preamble }, { role: 'USER', content: request.message })
        }
        if (request.chatHistory !== undefined) {
          prompts.push(...request.chatHistory.map((chat) => { return { role: chat.role, content: chat.message } }))
        } else {
          prompts.push({ role: 'USER', content: request.message })
        }
        attributes['llm.prompts'] = JSON.stringify(prompts)
        const response = await original.apply(this, [request, requestOptions])
        if (response.meta?.billedUnits?.inputTokens !== undefined) {
          attributes['llm.max_input_tokens'] = response.meta?.tokens?.inputTokens?.toString()
        }
        if (response.meta?.billedUnits?.outputTokens !== undefined) {
          attributes['llm.max_output_tokens'] = response.meta?.tokens?.outputTokens?.toString()
        }
        const totalTokens = Number(response.meta?.billedUnits?.inputTokens ?? 0) + Number(response.meta?.billedUnits?.outputTokens ?? 0)
        attributes['llm.token.counts'] = JSON.stringify({
          input_tokens: response.meta?.billedUnits?.inputTokens,
          output_tokens: response.meta?.billedUnits?.outputTokens,
          total_tokens: totalTokens
        })
        if (response.chatHistory !== undefined) {
          attributes['llm.responses'] = JSON.stringify(response.chatHistory.map((chat) => { return { message: { role: chat.role, content: chat.message } } }))
        } else {
          attributes['llm.responses'] = JSON.stringify(response)
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
    const attributes: Partial<LLMSpanAttributes> = {
      'langtrace.sdk.name': sdkName,
      'langtrace.service.name': this._options.clientName ?? 'cohere',
      'langtrace.service.type': 'llm',
      'langtrace.version': langtraceVersion,
      'langtrace.service.version': moduleVersion,
      'url.full': 'https://api.cohere.ai',
      'llm.api': APIS.CHAT.API,
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
      'llm.tools': request.tools !== undefined ? JSON.stringify(request.tools.map(t => { return { ...t, tool_type: t.parameterDefinitions !== undefined ? 'function' : undefined } })) : undefined,
      'llm.tool_results': request.tools !== undefined ? JSON.stringify(request.toolResults) : undefined,
      'llm.connectors': request.connectors !== undefined ? JSON.stringify(request.connectors) : undefined,
      'http.timeout': requestOptions?.timeoutInSeconds !== undefined ? requestOptions.timeoutInSeconds / 1000 : undefined,
      ...customAttributes
    }
    const span = tracer.startSpan(APIS.CHAT_STREAM.METHOD, { kind: SpanKind.CLIENT, attributes })
    return await context.with(trace.setSpan(context.active(), trace.getSpan(context.active()) ?? span), async () => {
      const prompts: Array<{ role: string, content: string }> = []
      if (request.preamble !== undefined && request.preamble !== '') {
        prompts.push({ role: 'CHATBOT', content: request.preamble }, { role: 'USER', content: request.message })
      }
      if (request.chatHistory !== undefined) {
        prompts.push(...request.chatHistory.map((chat) => { return { role: chat.role, content: chat.message } }))
      } else {
        prompts.push({ role: 'USER', content: request.message })
      }
      attributes['llm.prompts'] = JSON.stringify(prompts)
      const response = await original.apply(this, [request, requestOptions])
      return handleStream(response, attributes, span)
    })
  }
}

export const embedPatch = (original: EmbedFn, tracer: Tracer, langtraceVersion: string, sdkName: string, moduleVersion?: string) => {
  return async function (this: ICohereClient, request: IEmbedRequest, requestOptions?: IRequestOptions): Promise<IEmbedResponse> {
    const customAttributes = context.active().getValue(LANGTRACE_ADDITIONAL_SPAN_ATTRIBUTES_KEY) ?? {}
    const attributes: Partial<LLMSpanAttributes> = {
      'langtrace.sdk.name': sdkName,
      'langtrace.service.name': this._options.clientName ?? 'cohere',
      'langtrace.service.type': 'llm',
      'langtrace.version': langtraceVersion,
      'langtrace.service.version': moduleVersion,
      'url.full': 'https://api.cohere.ai',
      'llm.api': APIS.EMBED.API,
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
        attributes['llm.embedding_dataset_id'] = response.id
        attributes['llm.max_input_tokens'] = response.meta?.billedUnits?.inputTokens?.toString()
        attributes['llm.token.counts'] = JSON.stringify({
          input_tokens: response.meta?.billedUnits?.inputTokens,
          output_tokens: response.meta?.billedUnits?.outputTokens,
          total_tokens: Number(response.meta?.billedUnits?.inputTokens ?? 0) + Number(response.meta?.billedUnits?.outputTokens ?? 0)
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

async function * handleStream (stream: any, attributes: Partial<LLMSpanAttributes>, span: Span): AsyncGenerator<any, void> {
  try {
    span.addEvent(Event.STREAM_START)
    for await (const chat of stream) {
      if (chat.eventType === 'text-generation') {
        span.addEvent(Event.STREAM_OUTPUT, { response: chat.text })
      }
      if (chat.eventType === 'stream-end') {
        span.addEvent(Event.STREAM_END)
        if (chat.response.chatHistory !== undefined) {
          attributes['llm.responses'] = JSON.stringify(chat.response.chatHistory.map((chat: any) => { return { message: { role: chat.role, content: chat.message } } }))
        } else {
          attributes['llm.responses'] = JSON.stringify({ message: { role: 'CHATBOT', content: chat.response.text } })
        }
        const totalTokens = Number(chat.response.meta?.billedUnits?.inputTokens ?? 0) + Number(chat.response.meta?.billedUnits?.outputTokens ?? 0)
        attributes['llm.token.counts'] = JSON.stringify({
          input_tokens: chat.response.meta?.billedUnits?.inputTokens,
          output_tokens: chat.response.meta?.billedUnits?.outputTokens,
          total_tokens: totalTokens
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

export const rerankPatch = (original: RerankFn, tracer: Tracer, langtraceVersion: string, sdkName: string, moduleVersion?: string) => {
  return async function (this: ICohereClient, request: IRerankRequest, requestOptions?: IRequestOptions): Promise<IRerankResponse> {
    const customAttributes = context.active().getValue(LANGTRACE_ADDITIONAL_SPAN_ATTRIBUTES_KEY) ?? {}
    const attributes: LLMSpanAttributes = {
      'langtrace.sdk.name': sdkName,
      'langtrace.service.name': this._options.clientName ?? 'cohere',
      'langtrace.service.type': 'llm',
      'llm.prompts': JSON.stringify({ message: { role: 'USER', content: request.query } }),
      'langtrace.version': langtraceVersion,
      'langtrace.service.version': moduleVersion,
      'url.full': 'https://api.cohere.ai',
      'llm.api': APIS.RERANK.API,
      'llm.model': request.model,
      'http.max.retries': requestOptions?.maxRetries,
      'llm.documents': JSON.stringify(request.documents),
      'http.timeout': requestOptions?.timeoutInSeconds !== undefined ? requestOptions.timeoutInSeconds / 1000 : undefined,
      ...customAttributes
    }
    const span = tracer.startSpan(APIS.RERANK.METHOD, { kind: SpanKind.CLIENT, attributes })
    try {
      return await context.with(trace.setSpan(context.active(), trace.getSpan(context.active()) ?? span), async () => {
        const response = await original.apply(this, [request, requestOptions])
        attributes['llm.responses'] = JSON.stringify(response.results)
        attributes['llm.response_id'] = response.id
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
