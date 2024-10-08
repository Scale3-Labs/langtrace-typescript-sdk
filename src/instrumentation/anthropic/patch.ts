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
import { addSpanEvent, createStreamProxy } from '@langtrace-utils/misc'
import { APIS, LLMSpanAttributes, Vendors, Event } from '@langtrase/trace-attributes'

import {
  Exception,
  Span,
  SpanKind,
  SpanStatusCode,
  Tracer,
  context,
  trace
} from '@opentelemetry/api'
import { LangtraceSdkError } from 'errors/sdk_error'

export function messagesCreate (
  originalMethod: (...args: any[]) => any,
  tracer: Tracer,
  langtraceVersion: string,
  version?: string
): (...args: any[]) => any {
  return async function (this: any, ...args: any[]) {
    // Determine the service provider
    const serviceProvider = Vendors.ANTHROPIC
    const customAttributes = context.active().getValue(LANGTRACE_ADDITIONAL_SPAN_ATTRIBUTES_KEY) ?? {}

    // Get the prompt and deep copy it
    let prompts: Array<{ role: string, content: string }> = []

    // Get the system message if any from args and attach it to the prompt with system role
    if (args[0]?.system !== undefined) {
      prompts.push({ role: 'system', content: args[0]?.system })
    }
    // Check if there are messages and concatenate them to the prompts array.
    if (args[0]?.messages !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      prompts = prompts.concat(args[0].messages.map((msg: { role: string, content: string }) => ({ role: msg.role, content: msg.content })))
    }
    const attributes: LLMSpanAttributes = {
      'langtrace.sdk.name': '@langtrase/typescript-sdk',
      'langtrace.service.name': serviceProvider,
      'langtrace.service.type': 'llm',
      'gen_ai.operation.name': 'chat',
      'langtrace.service.version': version,
      'langtrace.version': langtraceVersion,
      'url.full': this?._client?.baseURL,
      'url.path': APIS.anthropic.MESSAGES_CREATE.ENDPOINT,
      'gen_ai.request.model': args[0]?.model,
      'http.max.retries': this?._client?.maxRetries,
      'http.timeout': this?._client?.timeout,
      'gen_ai.request.temperature': args[0]?.temperature,
      'gen_ai.request.top_p': args[0]?.top_p,
      'gen_ai.request.top_k': args[0]?.top_k,
      'gen_ai.user': args[0]?.metadata?.user_id,
      'gen_ai.request.max_tokens': args[0]?.max_tokens,
      'gen_ai.response.model': args[0]?.model,
      ...customAttributes
    }

    if (!(args[0].stream as boolean) || args[0].stream === false) {
      const spanName = customAttributes['langtrace.span.name' as keyof typeof customAttributes] ?? APIS.anthropic.MESSAGES_CREATE.METHOD
      const span = tracer.startSpan(spanName, { kind: SpanKind.CLIENT, attributes }, context.active())
      return await context.with(
        trace.setSpan(
          context.active(),
          span
        ),
        async () => {
          try {
            const resp = await originalMethod.apply(this, args)
            addSpanEvent(span, Event.GEN_AI_COMPLETION, { 'gen_ai.completion': JSON.stringify(resp.content.map((c: any) => ({ content: c.text, role: 'assistant' }))) })
            addSpanEvent(span, Event.GEN_AI_PROMPT, { 'gen_ai.prompt': JSON.stringify(prompts) })
            const respAttributes: Partial<LLMSpanAttributes> = {
              'gen_ai.usage.input_tokens': resp.usage.output_tokens,
              'gen_ai.usage.output_tokens': resp.usage.input_tokens,
              'gen_ai.usage.total_tokens': Number(resp.usage.output_tokens ?? 0) + Number(resp.usage.input_tokens ?? 0)
            }
            span.setAttributes({ ...attributes, ...respAttributes })
            span.setStatus({ code: SpanStatusCode.OK })
            return resp
          } catch (error: any) {
            span.setStatus({ code: SpanStatusCode.ERROR })
            span.recordException(error as Exception)
            throw new LangtraceSdkError(error.message as string, error.stack as string)
          } finally {
            span.end()
          }
        }
      )
    } else {
      const spanName = customAttributes['langtrace.span.name' as keyof typeof customAttributes] ?? APIS.anthropic.MESSAGES_CREATE.METHOD
      const span = tracer.startSpan(spanName, { kind: SpanKind.CLIENT, attributes }, context.active())
      return await context.with(
        trace.setSpan(
          context.active(),
          span
        ),
        async () => {
          const resp: AsyncIterable<unknown> = await originalMethod.apply(this, args)
          return createStreamProxy(resp, handleStreamResponse(span, resp, attributes))
        }
      )
    }
  }
}

async function * handleStreamResponse (span: Span, stream: any, attributes: LLMSpanAttributes): any {
  const result: string[] = []
  addSpanEvent(span, Event.STREAM_START)
  try {
    let streamStartMessage: { role: string, model: string, usage: { input_tokens: number, output_tokens: number } } | Record<string, any> = {}
    for await (const chunk of stream) {
      if (chunk.type === 'message_start') {
        streamStartMessage = chunk.message
      } else {
        const content = chunk.delta?.text !== undefined ? ((chunk.delta.text) as string).length > 0 ? chunk.delta.text : '' : ''
        result.push(content as string)
      }

      addSpanEvent(span, Event.GEN_AI_COMPLETION, { 'gen_ai.completion': JSON.stringify([{ content: result.join(''), role: streamStartMessage.role }]) })
      const responseAttributes: Partial<LLMSpanAttributes> = {
        'gen_ai.response.model': streamStartMessage.model,
        'gen_ai.usage.input_tokens': streamStartMessage.usage.output_tokens,
        'gen_ai.usage.output_tokens': streamStartMessage.usage.input_tokens,
        'gen_ai.usage.total_tokens': Number(streamStartMessage.usage.output_tokens ?? 0) + Number(streamStartMessage.usage.input_tokens ?? 0)
      }
      span.setAttributes({ ...attributes, ...responseAttributes })
      yield chunk
    }

    span.setStatus({ code: SpanStatusCode.OK })
    addSpanEvent(span, Event.STREAM_END)
  } catch (error: any) {
    span.setStatus({ code: SpanStatusCode.ERROR })
    span.recordException(error as Exception)
    throw new LangtraceSdkError(error.message as string, error.stack as string)
  } finally {
    span.end()
  }
}
