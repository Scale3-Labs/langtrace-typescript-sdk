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
import { addSpanEvent, createStreamProxy } from '@langtrace-utils/misc'
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

export function chatComplete (
  originalMethod: (...args: any[]) => any,
  tracer: Tracer,
  langtraceVersion: string,
  version?: string,
  stream = false
): (...args: any[]) => any {
  return async function (this: any, ...args: any[]) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const originalContext = this
    const customAttributes = context.active().getValue(LANGTRACE_ADDITIONAL_SPAN_ATTRIBUTES_KEY) ?? {}
    // Determine the service provider
    const serviceProvider: string = Vendors.MISTRAL
    const attributes: LLMSpanAttributes = {
      'langtrace.sdk.name': '@langtrase/typescript-sdk',
      'gen_ai.operation.name': 'chat',
      'langtrace.service.name': serviceProvider,
      'langtrace.service.type': 'llm',
      'langtrace.service.version': version,
      'langtrace.version': langtraceVersion,
      'gen_ai.request.model': args[0]?.model,
      'url.full': originalContext?._client?.baseURL,
      'url.path': APIS.mistral.CHAT_COMPLETE.ENDPOINT,
      'http.max.retries': originalContext?._client?.maxRetries,
      'http.timeout': originalContext?._client?.timeout,
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
    if (!stream) {
      const spanName = customAttributes['langtrace.span.name' as keyof typeof customAttributes] ?? APIS.mistral.CHAT_COMPLETE.METHOD
      const span = tracer.startSpan(spanName, { kind: SpanKind.CLIENT, attributes }, context.active())
      return await context.with(
        trace.setSpan(context.active(), span),
        async () => {
          try {
            // eslint-disable-next-line no-console
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
            addSpanEvent(span, Event.GEN_AI_PROMPT, { 'gen_ai.prompt': JSON.stringify(args[0]?.messages) })
            addSpanEvent(span, Event.GEN_AI_COMPLETION, { 'gen_ai.completion': JSON.stringify(responses) })
            const responseAttributes: Partial<LLMSpanAttributes> = {
              'gen_ai.response.model': resp.model,
              'gen_ai.usage.input_tokens': resp.usage.prompt_tokens,
              'gen_ai.usage.output_tokens': resp.usage.completion_tokens,
              'gen_ai.usage.total_tokens': resp.usage.total_tokens
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
      const spanName = customAttributes['langtrace.span.name' as keyof typeof customAttributes] ?? APIS.mistral.CHAT_STREAM.METHOD
      const span = tracer.startSpan(spanName, { kind: SpanKind.CLIENT, attributes }, context.active())
      addSpanEvent(span, Event.GEN_AI_PROMPT, { 'gen_ai.prompt': JSON.stringify(args[0]?.messages) })
      return await context.with(
        trace.setSpan(
          context.active(),
          span
        ),
        async () => {
          const resp = await originalMethod.apply(this, args)
          return createStreamProxy(resp, handleStreamResponse(
            span,
            resp,
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
  inputAttributes: Partial<LLMSpanAttributes>
): any {
  const result: string[] = []
  const customAttributes = context.active().getValue(LANGTRACE_ADDITIONAL_SPAN_ATTRIBUTES_KEY) ?? {}
  addSpanEvent(span, Event.STREAM_START)
  try {
    let model = ''
    let completionTokens = 0
    let promptTokens = 0
    for await (const chunk of stream) {
      if (model === '') {
        model = chunk.data.model
      }
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      const content = chunk.data.choices[0]?.delta?.content || ''
      promptTokens = chunk.data.usage?.promptTokens ?? 0
      completionTokens = chunk.data.usage?.completionTokens ?? 0
      result.push(content as string)
      yield chunk
    }
    addSpanEvent(span, Event.GEN_AI_COMPLETION, { 'gen_ai.completion': result.length > 0 ? JSON.stringify([{ role: 'assistant', content: result.join('') }]) : undefined })
    span.setStatus({ code: SpanStatusCode.OK })
    const attributes: Partial<LLMSpanAttributes> = {
      'gen_ai.response.model': model,
      'gen_ai.usage.output_tokens': promptTokens,
      'gen_ai.usage.input_tokens': completionTokens,
      'gen_ai.usage.total_tokens': promptTokens + completionTokens,
      ...customAttributes
    }
    span.setAttributes({ ...inputAttributes, ...attributes })
    addSpanEvent(span, Event.STREAM_END)
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
    const serviceProvider: string = Vendors.MISTRAL
    const attributes: LLMSpanAttributes = {
      'langtrace.sdk.name': '@langtrase/typescript-sdk',
      'gen_ai.operation.name': 'embed',
      'langtrace.service.name': serviceProvider,
      'langtrace.service.type': 'llm',
      'langtrace.service.version': version,
      'langtrace.version': langtraceVersion,
      'url.full': originalContext?._client?.baseURL,
      'url.path': APIS.mistral.EMBEDDINGS_CREATE.ENDPOINT,
      'gen_ai.request.model': args[0]?.model,
      'http.max.retries': originalContext?._client?.maxRetries,
      'http.timeout': originalContext?._client?.timeout,
      'gen_ai.request.embedding_inputs': JSON.stringify([args[0]?.input]),
      'gen_ai.request.encoding_formats': args[0]?.encoding_format === undefined ? undefined : [args[0]?.encoding_format],
      'gen_ai.request.dimensions': args[0]?.dimensions,
      'gen_ai.user': args[0]?.user,
      ...customAttributes
    }
    const spanName = customAttributes['langtrace.span.name' as keyof typeof customAttributes] ?? APIS.mistral.EMBEDDINGS_CREATE.METHOD
    const span = tracer.startSpan(spanName, { kind: SpanKind.CLIENT, attributes }, context.active())
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
