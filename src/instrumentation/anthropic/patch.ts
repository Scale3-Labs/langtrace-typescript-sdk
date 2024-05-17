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
import { APIS } from '@langtrace-constants/instrumentation/anthropic'
import { SERVICE_PROVIDERS } from '@langtrace-constants/instrumentation/common'
import { attachMetadataChunkToStreamedResponse, attachMetadataToResponse } from '@langtrace-utils/instrumentation'
import { Event, LLMSpanAttributes } from '@langtrase/trace-attributes'
import {
  Exception,
  Span,
  SpanKind,
  SpanStatusCode,
  Tracer,
  context,
  trace
} from '@opentelemetry/api'

export function messagesCreate (
  originalMethod: (...args: any[]) => any,
  tracer: Tracer,
  langtraceVersion: string,
  version?: string
): (...args: any[]) => any {
  return async function (this: any, ...args: any[]) {
    // Determine the service provider
    const serviceProvider = SERVICE_PROVIDERS.ANTHROPIC
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
      'langtrace.service.version': version,
      'langtrace.version': langtraceVersion,
      'url.full': this?._client?.baseURL,
      'llm.api': APIS.MESSAGES_CREATE.ENDPOINT,
      'llm.model': args[0]?.model,
      'http.max.retries': this?._client?.maxRetries,
      'http.timeout': this?._client?.timeout,
      'llm.prompts': JSON.stringify(prompts),
      'llm.max_tokens': args[0]?.max_tokens,
      ...customAttributes
    }

    if (args[0]?.temperature !== undefined) {
      attributes['llm.temperature'] = args[0]?.temperature
    }

    if (args[0]?.top_p !== undefined) {
      attributes['llm.top_p'] = args[0]?.top_p
    }

    if (args[0]?.top_k !== undefined) {
      attributes['llm.top_k'] = args[0]?.top_k
    }

    if (args[0]?.user !== undefined) {
      attributes['llm.user'] = args[0]?.user
    }

    if (!(args[0].stream as boolean) || args[0].stream === false) {
      const span = tracer.startSpan(APIS.MESSAGES_CREATE.METHOD, { kind: SpanKind.CLIENT, attributes })
      return await context.with(
        trace.setSpan(
          context.active(),
          trace.getSpan(context.active()) ?? span
        ),
        async () => {
          try {
            const resp = attachMetadataToResponse(await originalMethod.apply(this, args), span)

            span.setAttributes({
              'llm.responses': JSON.stringify(resp.content.map((c: any) => {
                return { content: c.text, role: 'assistant' }
              }))
            })

            if (resp?.system_fingerprint !== undefined) {
              span.setAttributes({ 'llm.system.fingerprint': resp?.system_fingerprint })
            }
            span.setAttributes({
              'llm.token.counts': JSON.stringify({
                input_tokens: (resp?.usage?.input_tokens) ?? 0,
                output_tokens: (resp?.usage?.output_tokens) ?? 0,
                total_tokens: Number(resp?.usage?.input_tokens) + Number(resp?.usage?.output_tokens) ?? 0
              })
            })
            span.setStatus({ code: SpanStatusCode.OK })
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
      const span = tracer.startSpan(APIS.MESSAGES_CREATE.METHOD, { kind: SpanKind.CLIENT, attributes })
      return await context.with(
        trace.setSpan(
          context.active(),
          trace.getSpan(context.active()) ?? span
        ),
        async () => {
          const resp: AsyncIterable<unknown> = await originalMethod.apply(this, args)
          return handleStreamResponse(span, resp, attributes)
        }
      )
    }
  }
}

async function * handleStreamResponse (span: Span, stream: any, attributes: LLMSpanAttributes): any {
  const result: string[] = []
  span.addEvent(Event.STREAM_START)
  try {
    let input_tokens = 0
    let output_tokens = 0
    for await (const chunk of stream) {
      const content = chunk.delta?.text !== undefined ? ((chunk.delta.text) as string).length > 0 ? chunk.delta.text : '' : ''
      result.push(content as string)
      input_tokens += chunk.message?.usage?.input_tokens !== undefined ? Number(chunk.message?.usage?.input_tokens) : 0
      output_tokens +=
        chunk.message?.usage?.output_tokens !== undefined ? Number(chunk.message?.usage?.output_tokens) : chunk.usage?.output_tokens !== undefined ? Number(chunk.usage?.output_tokens) : 0
      span.addEvent(Event.STREAM_OUTPUT, { response: JSON.stringify(content) })
      yield chunk
    }
    yield attachMetadataChunkToStreamedResponse(span)
    span.setStatus({ code: SpanStatusCode.OK })
    span.setAttributes({
      'llm.token.counts': JSON.stringify({
        input_tokens,
        output_tokens,
        total_tokens: input_tokens + output_tokens
      }),
      'llm.responses': JSON.stringify([{ content: result.join(''), role: 'assistant' }])
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
