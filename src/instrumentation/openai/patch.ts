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
import { SERVICE_PROVIDERS } from '@langtrace-constants/instrumentation/common'
import { APIS } from '@langtrace-constants/instrumentation/openai'
import { attachMetadataChunkToStreamedResponse, attachMetadataToResponse } from '@langtrace-utils/instrumentation'
import { calculatePromptTokens, estimateTokens } from '@langtrace-utils/llm'
import { Event, LLMSpanAttributes } from '@langtrase/trace-attributes'
import {
  context, Exception,
  Span,
  SpanKind,
  SpanStatusCode, trace, Tracer
} from '@opentelemetry/api'

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
    let serviceProvider = SERVICE_PROVIDERS.OPENAI
    if (originalContext?._client?.baseURL?.includes('azure') === true) {
      serviceProvider = SERVICE_PROVIDERS.AZURE
    }
    const customAttributes = context.active().getValue(LANGTRACE_ADDITIONAL_SPAN_ATTRIBUTES_KEY) ?? {}

    const attributes: LLMSpanAttributes = {
      'langtrace.sdk.name': '@langtrase/typescript-sdk',
      'langtrace.service.name': serviceProvider,
      'langtrace.service.type': 'llm',
      'langtrace.service.version': version,
      'langtrace.version': langtraceVersion,
      'url.full': originalContext?._client?.baseURL,
      'llm.api': APIS.IMAGES_GENERATION.ENDPOINT,
      'llm.model': args[0]?.model,
      'http.max.retries': originalContext?._client?.maxRetries,
      'http.timeout': originalContext?._client?.timeout,
      'llm.prompts': JSON.stringify([{ role: 'user', content: args[0]?.prompt }]),
      ...customAttributes
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    const span = tracer.startSpan(APIS.IMAGES_GENERATION.METHOD, { kind: SpanKind.SERVER, attributes })
    const f = await context.with(
      trace.setSpan(context.active(), trace.getSpan(context.active()) ?? span),
      async () => {
        try {
          const response = attachMetadataToResponse(await originalMethod.apply(originalContext, args), span)
          attributes['llm.responses'] = JSON.stringify(response?.data?.map((data: any) => {
            return {
              content: JSON.stringify(data),
              role: 'assistant'
            }
          }))

          span.setAttributes(attributes)
          span.setStatus({ code: SpanStatusCode.OK })
          span.end()
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return
          return response
        } catch (error: any) {
          span.recordException(error as Exception)
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error.message
          })
          span.end()
          throw error
        }
      }
    )
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
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
    let serviceProvider = SERVICE_PROVIDERS.OPENAI
    if (originalContext?._client?.baseURL?.includes('azure') === true) {
      serviceProvider = SERVICE_PROVIDERS.AZURE
    } else if (originalContext?._client?.baseURL?.includes('perplexity') === true) {
      serviceProvider = SERVICE_PROVIDERS.PPLX
    }
    const attributes: LLMSpanAttributes = {
      'langtrace.sdk.name': '@langtrase/typescript-sdk',
      'langtrace.service.name': serviceProvider,
      'langtrace.service.type': 'llm',
      'langtrace.service.version': version,
      'langtrace.version': langtraceVersion,
      'url.full': originalContext?._client?.baseURL,
      'llm.api': APIS.CHAT_COMPLETION.ENDPOINT,
      'http.max.retries': originalContext?._client?.maxRetries,
      'http.timeout': originalContext?._client?.timeout,
      'llm.prompts': JSON.stringify(args[0]?.messages),
      'llm.stream': args[0]?.stream,
      ...customAttributes
    }

    if (args[0]?.temperature !== undefined) {
      attributes['llm.temperature'] = args[0]?.temperature
    }

    if (args[0]?.top_p !== undefined) {
      attributes['llm.top_p'] = args[0]?.top_p
    }

    if (args[0]?.user !== undefined) {
      attributes['llm.user'] = args[0]?.user
    }
    if (args[0]?.functions !== undefined) {
      const functionsToTools = args[0].functions.map((func: any) => {
        return {
          function: func,
          type: 'function'
        }
      })
      attributes['llm.tools'] = JSON.stringify(functionsToTools)
    }
    if (args[0]?.tools !== undefined) {
      attributes['llm.tools'] = JSON.stringify(args[0]?.tools)
    }

    if (!(args[0].stream as boolean) || args[0].stream === false) {
      // eslint-disable-next-\line @typescript-eslint/no-unsafe-return
      const span = tracer.startSpan(APIS.CHAT_COMPLETION.METHOD, { kind: SpanKind.CLIENT, attributes })
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return await context.with(
        trace.setSpan(context.active(), trace.getSpan(context.active()) ?? span),
        async () => {
          try {
            const resp = attachMetadataToResponse(await originalMethod.apply(this, args), span)
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
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            return resp
          } catch (error: any) {
            span.recordException(error as Exception)
            span.setStatus({
              code: SpanStatusCode.ERROR,
              message: error.message
            })
            throw error
          } finally {
            span.end()
          }
        }
      )
    } else {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      const span = tracer.startSpan(APIS.CHAT_COMPLETION.METHOD, { kind: SpanKind.CLIENT, attributes })
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return await context.with(
        trace.setSpan(
          context.active(),
          trace.getSpan(context.active()) ?? span
        ),
        async () => {
          const model = args[0].model

          // iterate over messages and calculate tokens
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return
          const promptContent: string = args[0].messages.map((message: any) => message?.content).join(' ')
          const promptTokens = calculatePromptTokens(promptContent, model as string)

          const resp = await originalMethod.apply(this, args)
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return
          return handleStreamResponse(
            span,
            resp,
            promptTokens
          )
        }
      )
    }
  }
}

async function * handleStreamResponse (
  span: Span,
  stream: any,
  promptTokens: number
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
      span.addEvent(Event.STREAM_OUTPUT, {
        tokens: tokenCount,
        response: JSON.stringify(content)
      })
      yield chunk
    }
    yield attachMetadataChunkToStreamedResponse(span)
    span.setStatus({ code: SpanStatusCode.OK })
    span.setAttributes({
      'llm.model': model,
      'llm.token.counts': JSON.stringify({
        input_tokens: promptTokens,
        output_tokens: completionTokens,
        total_tokens: completionTokens + promptTokens,
        ...customAttributes
      }),
      'llm.responses': JSON.stringify([
        { role: 'assistant', content: result.join('') } // [{message: <>, type: 'image-generation'}]
      ])
    })
    span.addEvent(Event.STREAM_END)
  } catch (error: any) {
    span.recordException(error as Exception)
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message })
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
    let serviceProvider = SERVICE_PROVIDERS.OPENAI
    if (originalContext?._client?.baseURL?.includes('azure') === true) {
      serviceProvider = SERVICE_PROVIDERS.AZURE
    }
    const attributes: LLMSpanAttributes = {
      'langtrace.sdk.name': '@langtrase/typescript-sdk',
      'langtrace.service.name': serviceProvider,
      'langtrace.service.type': 'llm',
      'langtrace.service.version': version,
      'langtrace.version': langtraceVersion,
      'url.full': originalContext?._client?.baseURL,
      'llm.api': APIS.EMBEDDINGS_CREATE.ENDPOINT,
      'llm.model': args[0]?.model,
      'http.max.retries': originalContext?._client?.maxRetries,
      'http.timeout': originalContext?._client?.timeout,
      'llm.embedding_inputs': JSON.stringify([args[0]?.input]),
      'llm.encoding.formats': JSON.stringify([args[0]?.encoding_format]),
      ...customAttributes
    }

    if (args[0]?.dimensions !== undefined) {
      attributes['llm.dimensions'] = args[0]?.dimensions
    }

    if (args[0]?.user !== undefined) {
      attributes['llm.user'] = args[0]?.user
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    const span = tracer.startSpan(APIS.EMBEDDINGS_CREATE.METHOD, { kind: SpanKind.SERVER, attributes })
    const f = await context.with(
      trace.setSpan(context.active(), trace.getSpan(context.active()) ?? span),
      async () => {
        try {
          const resp = attachMetadataToResponse(await originalMethod.apply(originalContext, args), span)

          span.setStatus({ code: SpanStatusCode.OK })
          span.end()
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return
          return resp
        } catch (error: any) {
          span.recordException(error as Exception)
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error.message
          })
          span.end()
          throw error
        }
      }
    )
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return f
  }
}
