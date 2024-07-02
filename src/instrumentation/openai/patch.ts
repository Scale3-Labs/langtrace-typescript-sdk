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
import { calculatePromptTokens, estimateTokens } from '@langtrace-utils/llm'
import { createStreamProxy } from '@langtrace-utils/misc'
import { APIS, LLMSpanAttributes, Event, Vendors } from '@langtrase/trace-attributes'
import {
  Exception,
  Span,
  SpanKind,
  SpanStatusCode,
  Tracer,
  context,
  trace
} from '@opentelemetry/api'

export function imageEdit (
  originalMethod: (...args: any[]) => any,
  tracer: Tracer,
  langtraceVersion: string,
  version?: string
): (...args: any[]) => any {
  return async function (this: any, ...args: any[]) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const originalContext = this
    const customAttributes = context.active().getValue(LANGTRACE_ADDITIONAL_SPAN_ATTRIBUTES_KEY) ?? {}
    // Determine the service provider
    let serviceProvider: string = Vendors.OPENAI
    if (originalContext?._client?.baseURL?.includes('azure') === true) {
      serviceProvider = 'azure'
    }
    const attributes: LLMSpanAttributes = {
      'langtrace.sdk.name': '@langtrase/typescript-sdk',
      'langtrace.service.name': serviceProvider,
      'langtrace.service.type': 'llm',
      'langtrace.service.version': version,
      'langtrace.version': langtraceVersion,
      'url.full': originalContext?._client?.baseURL,
      'url.path': APIS.openai.IMAGES_EDIT.ENDPOINT,
      'gen_ai.request.model': args[0]?.model,
      'http.max.retries': originalContext?._client?.maxRetries,
      'http.timeout': originalContext?._client?.timeout,
      'gen_ai.prompt': JSON.stringify(args[0]?.prompt),
      'gen_ai.request.top_k': args[0]?.n,
      'gen_ai.image.size': args[0]?.size,
      'gen_ai.response_format': args[0]?.response_format?.type ?? args[0]?.response_format,
      ...customAttributes
    }

    const span = tracer.startSpan(APIS.openai.IMAGES_EDIT.METHOD, { kind: SpanKind.SERVER, attributes }, context.active())
    const f = await context.with(
      trace.setSpan(context.active(), span),
      async () => {
        try {
          const response = await originalMethod.apply(originalContext, args)
          span.addEvent(Event.RESPONSE, { 'gen_ai.completion': JSON.stringify(response?.data?.map((data: any) => ({ content: JSON.stringify(data), role: 'assistant' }))) })

          span.setAttributes(attributes)
          span.setStatus({ code: SpanStatusCode.OK })
          span.end()
          return response
        } catch (error: any) {
          span.recordException(error as Exception)
          span.setStatus({ code: SpanStatusCode.ERROR })
          span.end()
          throw error
        }
      }
    )
    return f
  }
}

export function imagesGenerate (
  originalMethod: (...args: any[]) => any,
  tracer: Tracer,
  langtraceVersion: string,
  version?: string
): (...args: any[]) => any {
  return async function (this: any, ...args: any[]) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const originalContext = this

    // Determine the service provider
    let serviceProvider: string = Vendors.OPENAI
    if (originalContext?._client?.baseURL?.includes('azure') === true) {
      serviceProvider = 'azure'
    }
    const customAttributes = context.active().getValue(LANGTRACE_ADDITIONAL_SPAN_ATTRIBUTES_KEY) ?? {}

    const attributes: LLMSpanAttributes = {
      'langtrace.sdk.name': '@langtrase/typescript-sdk',
      'langtrace.service.name': serviceProvider,
      'langtrace.service.type': 'llm',
      'langtrace.service.version': version,
      'langtrace.version': langtraceVersion,
      'url.full': originalContext?._client?.baseURL,
      'url.path': APIS.openai.IMAGES_GENERATION.ENDPOINT,
      'gen_ai.request.model': args[0]?.model,
      'http.max.retries': originalContext?._client?.maxRetries,
      'http.timeout': originalContext?._client?.timeout,
      'gen_ai.prompt': JSON.stringify([{ role: 'user', content: args[0]?.prompt }]),
      ...customAttributes
    }

    const span = tracer.startSpan(APIS.openai.IMAGES_GENERATION.METHOD, { kind: SpanKind.SERVER, attributes }, context.active())
    const f = await context.with(
      trace.setSpan(context.active(), span),
      async () => {
        try {
          const response = await originalMethod.apply(originalContext, args)
          span.addEvent(Event.RESPONSE, { 'gen_ai.completion': JSON.stringify(response?.data?.map((data: any) => (({ content: JSON.stringify(data), role: 'assistant' })))) })
          span.setStatus({ code: SpanStatusCode.OK })
          span.end()
          return response
        } catch (error: any) {
          span.recordException(error as Exception)
          span.setStatus({ code: SpanStatusCode.ERROR })
          span.end()
          throw error
        }
      }
    )

    return f
  }
}

export function chatCompletionCreate (
  originalMethod: (...args: any[]) => any,
  tracer: Tracer,
  langtraceVersion: string,
  version?: string
): (...args: any[]) => any {
  return async function (this: any, ...args: any[]) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const originalContext = this
    const customAttributes = context.active().getValue(LANGTRACE_ADDITIONAL_SPAN_ATTRIBUTES_KEY) ?? {}
    // Determine the service provider
    let serviceProvider: string = Vendors.OPENAI
    if (originalContext?._client?.baseURL?.includes('azure') === true) {
      serviceProvider = 'azure'
    } else if (originalContext?._client?.baseURL?.includes('perplexity') === true) {
      serviceProvider = 'perplexity'
    }
    const attributes: LLMSpanAttributes = {
      'langtrace.sdk.name': '@langtrase/typescript-sdk',
      'langtrace.service.name': serviceProvider,
      'langtrace.service.type': 'llm',
      'langtrace.service.version': version,
      'langtrace.version': langtraceVersion,
      'gen_ai.request.model': args[0]?.model,
      'url.full': originalContext?._client?.baseURL,
      'url.path': APIS.openai.CHAT_COMPLETION.ENDPOINT,
      'http.max.retries': originalContext?._client?.maxRetries,
      'http.timeout': originalContext?._client?.timeout,
      'gen_ai.prompt': JSON.stringify(args[0]?.messages),
      'gen_ai.request.stream': args[0]?.stream,
      'gen_ai.request.temperature': args[0]?.temperature,
      'gen_ai.request.top_p': args[0]?.top_p,
      'gen_ai.user': args[0]?.user,
      'gen_ai.request.max_tokens': args[0]?.max_tokens,
      'gen_ai.request.tools': JSON.stringify(args[0]?.tools),
      ...customAttributes
    }
    if (args[0]?.functions !== undefined) {
      const functionsToTools = args[0].functions.map((func: any) => {
        return {
          function: func,
          type: 'function'
        }
      })
      attributes['gen_ai.request.tools'] = JSON.stringify(functionsToTools)
    }
    if (!(args[0].stream as boolean) || args[0].stream === false) {
      const span = tracer.startSpan(APIS.openai.CHAT_COMPLETION.METHOD, { kind: SpanKind.CLIENT, attributes }, context.active())
      return await context.with(
        trace.setSpan(context.active(), span),
        async () => {
          try {
            const resp = await originalMethod.apply(this, args)
            const responses = resp?.choices?.map((choice: any) => {
              const result = {
                role: choice?.message?.role,
                content: choice?.message?.content !== undefined && choice?.message?.content !== null
                  ? choice?.message?.content
                  : choice?.message?.function_call !== undefined
                    ? JSON.stringify(choice?.message?.function_call)
                    : JSON.stringify(choice?.message?.tool_calls)
              }
              return result
            })
            span.addEvent(Event.RESPONSE, { 'gen_ai.completion': JSON.stringify(responses) })
            const responseAttributes: Partial<LLMSpanAttributes> = {
              'gen_ai.response.model': resp.model,
              'gen_ai.system_fingerprint': resp.system_fingerprint,
              'gen_ai.usage.prompt_tokens': resp.usage.prompt_tokens,
              'gen_ai.usage.completion_tokens': resp.usage.completion_tokens
            }
            span.setAttributes({ ...attributes, ...responseAttributes })
            span.setStatus({ code: SpanStatusCode.OK })
            return resp
          } catch (error: any) {
            span.recordException(error as Exception)
            span.setStatus({ code: SpanStatusCode.ERROR })
            throw error
          } finally {
            span.end()
          }
        }
      )
    } else {
      const span = tracer.startSpan(APIS.openai.CHAT_COMPLETION.METHOD, { kind: SpanKind.CLIENT, attributes }, context.active())
      return await context.with(
        trace.setSpan(
          context.active(),
          span
        ),
        async () => {
          const model = args[0].model

          // iterate over messages and calculate tokens
          const promptContent: string = args[0].messages.map((message: any) => message?.content).join(' ')
          const promptTokens = calculatePromptTokens(promptContent, model as string)

          const resp = await originalMethod.apply(this, args)
          return createStreamProxy(resp, handleStreamResponse(
            span,
            resp,
            promptTokens,
            attributes
          ))
        }
      )
    }
  }
}

async function * handleStreamResponse (
  span: Span,
  stream: any,
  promptTokens: number,
  inputAttributes: Partial<LLMSpanAttributes>
): any {
  let completionTokens = 0
  const result: string[] = []
  const customAttributes = context.active().getValue(LANGTRACE_ADDITIONAL_SPAN_ATTRIBUTES_KEY) ?? {}
  span.addEvent(Event.STREAM_START)
  try {
    let model = ''
    for await (const chunk of stream) {
      if (model === '') {
        model = chunk.model
      }
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      const content = chunk.choices[0]?.delta?.content || ''
      const tokenCount = estimateTokens(content as string)
      completionTokens += tokenCount
      result.push(content as string)
      if (chunk.choices[0]?.delta?.content !== undefined) {
        span.addEvent(Event.STREAM_OUTPUT, { 'gen_ai.completion.chunk': JSON.stringify({ role: chunk.choices[0]?.delta?.role ?? 'assistant', content: chunk.choices[0]?.delta?.content }) })
      }
      yield chunk
    }
    span.addEvent(Event.RESPONSE, { 'gen_ai.completion': result.length > 0 ? JSON.stringify([{ role: 'assistant', content: result.join('') }]) : undefined })
    span.setStatus({ code: SpanStatusCode.OK })
    const attributes: Partial<LLMSpanAttributes> = {
      'gen_ai.response.model': model,
      'gen_ai.usage.prompt_tokens': promptTokens,
      'gen_ai.usage.completion_tokens': completionTokens,
      ...customAttributes
    }
    span.setAttributes({ ...inputAttributes, ...attributes })
    span.addEvent(Event.STREAM_END)
  } catch (error: any) {
    span.recordException(error as Exception)
    span.setStatus({ code: SpanStatusCode.ERROR })
    throw error
  } finally {
    span.end()
  }
}

export function embeddingsCreate (
  originalMethod: (...args: any[]) => any,
  tracer: Tracer,
  langtraceVersion: string,
  version?: string
): (...args: any[]) => any {
  return async function (this: any, ...args: any[]) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const originalContext = this
    const customAttributes = context.active().getValue(LANGTRACE_ADDITIONAL_SPAN_ATTRIBUTES_KEY) ?? {}
    // Determine the service provider
    let serviceProvider: string = Vendors.OPENAI
    if (originalContext?._client?.baseURL?.includes('azure') === true) {
      serviceProvider = 'azure'
    }
    const attributes: LLMSpanAttributes = {
      'langtrace.sdk.name': '@langtrase/typescript-sdk',
      'langtrace.service.name': serviceProvider,
      'langtrace.service.type': 'llm',
      'langtrace.service.version': version,
      'langtrace.version': langtraceVersion,
      'url.full': originalContext?._client?.baseURL,
      'url.path': APIS.openai.EMBEDDINGS_CREATE.ENDPOINT,
      'gen_ai.request.model': args[0]?.model,
      'http.max.retries': originalContext?._client?.maxRetries,
      'http.timeout': originalContext?._client?.timeout,
      'gen_ai.request.embedding_inputs': JSON.stringify([args[0]?.input]),
      'gen_ai.request.encoding_formats': args[0]?.encoding_format === undefined ? undefined : [args[0]?.encoding_format],
      'gen_ai.request.dimensions': args[0]?.dimensions,
      'gen_ai.user': args[0]?.user,
      ...customAttributes
    }

    const span = tracer.startSpan(APIS.openai.EMBEDDINGS_CREATE.METHOD, { kind: SpanKind.SERVER, attributes }, context.active())
    const f = await context.with(
      trace.setSpan(context.active(), span),
      async () => {
        try {
          const resp = await originalMethod.apply(originalContext, args)

          span.setStatus({ code: SpanStatusCode.OK })
          span.end()
          return resp
        } catch (error: any) {
          span.recordException(error as Exception)
          span.setStatus({ code: SpanStatusCode.ERROR })
          span.end()
          throw error
        }
      }
    )
    return f
  }
}
