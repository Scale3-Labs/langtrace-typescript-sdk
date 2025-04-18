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
import { addSpanEvent } from '@langtrace-utils/misc'
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
import { LangtraceSdkError } from 'errors/sdk_error'

export function sendCommand (
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
    const serviceProvider: string = Vendors.AWSBEDROCK
    let requestType = 'converse'
    let message_content: any = []
    let method = ''
    if (args[0]?.input?.messages !== undefined) {
      const message = args[0]?.input?.messages[0]
      message_content = message?.content?.map((content: any) => ({ content: content.text, role: message.role }))
      method = APIS.awsbedrock.CONVERSE.METHOD
    } else if (args[0]?.input?.body !== undefined) {
      const message = JSON.parse(args[0]?.input?.body as string)
      message_content = [{ content: message.inputText, role: 'assistant' }]
      requestType = 'invoke'
      method = APIS.awsbedrock.INVOKE_MODEL.METHOD
    }
    const attributes: LLMSpanAttributes = {
      'langtrace.sdk.name': '@langtrase/typescript-sdk',
      'gen_ai.operation.name': 'chat',
      'langtrace.service.name': serviceProvider,
      'langtrace.service.type': 'framework',
      'langtrace.service.version': version,
      'langtrace.version': langtraceVersion,
      'gen_ai.request.model': args[0]?.input.modelId,
      'url.full': originalContext?._client?.baseURL,
      'url.path': requestType === 'converse' ? APIS.awsbedrock.CONVERSE.ENDPOINT : APIS.awsbedrock.INVOKE_MODEL.ENDPOINT,
      'http.max.retries': originalContext?._client?.maxRetries,
      'http.timeout': originalContext?._client?.timeout,
      'gen_ai.request.temperature': args[0]?.input?.inferenceConfig?.temperature,
      'gen_ai.request.top_p': args[0]?.input?.inferenceConfig?.topP,
      'gen_ai.user': args[0]?.user,
      'gen_ai.request.max_tokens': args[0]?.input?.inferenceConfig?.maxTokens,
      'gen_ai.request.tools': JSON.stringify(args[0]?.input?.toolConfig?.tools),
      ...customAttributes
    }
    const spanName = customAttributes['langtrace.span.name' as keyof typeof customAttributes] ?? method
    const span = tracer.startSpan(spanName, { kind: SpanKind.CLIENT, attributes }, context.active())
    return await context.with(
      trace.setSpan(context.active(), span),
      async () => {
        try {
          const resp = await originalMethod.apply(this, args)
          addSpanEvent(span, Event.GEN_AI_PROMPT, { 'gen_ai.prompt': JSON.stringify(message_content) })
          if (resp.stream === undefined) {
            // Check the requestType to determine which API response format to handle
            if (requestType === 'converse') {
              // Handle converse API response
              const responses = resp?.output?.message?.content?.map((content: any) => {
                const result = {
                  role: resp?.output?.message?.role,
                  content: content?.text !== undefined && content?.text !== null
                    ? content?.text
                    : content?.toolUse !== undefined
                      ? JSON.stringify(content?.toolUse)
                      : JSON.stringify(content?.toolResult)
                }
                return result
              })
              addSpanEvent(span, Event.GEN_AI_COMPLETION, { 'gen_ai.completion': JSON.stringify(responses) })
              const responseAttributes: Partial<LLMSpanAttributes> = {
                'gen_ai.response.model': args[0]?.input.modelId,
                'gen_ai.usage.input_tokens': resp.usage?.inputTokens,
                'gen_ai.usage.output_tokens': resp.usage?.outputTokens,
                'gen_ai.usage.total_tokens': resp.usage?.totalTokens
              }
              span.setAttributes({ ...attributes, ...responseAttributes })
              span.setStatus({ code: SpanStatusCode.OK })
              span.end()
            } else if (requestType === 'invoke') {
              const decodedResponseBody = new TextDecoder().decode(resp.body as Uint8Array)
              const responseBody = JSON.parse(decodedResponseBody)
              const inputTokenCount: number = responseBody.inputTextTokenCount ?? 0
              const outputTokenCount: number = responseBody.results?.reduce((acc: number, result: any) => acc + (result.tokenCount as number ?? 0), 0) ?? 0

              const responses = responseBody.results?.map((result: any) => {
                const resultObj = {
                  role: 'assistant',
                  content: result?.outputText !== undefined && result?.outputText !== null
                    ? result?.outputText.trim()
                    : ''
                }
                return resultObj
              })
              addSpanEvent(span, Event.GEN_AI_COMPLETION, { 'gen_ai.completion': JSON.stringify(responses) })
              const responseAttributes: Partial<LLMSpanAttributes> = {
                'gen_ai.response.model': args[0]?.input.modelId,
                'gen_ai.usage.input_tokens': inputTokenCount,
                'gen_ai.usage.output_tokens': outputTokenCount,
                'gen_ai.usage.total_tokens': inputTokenCount + outputTokenCount
              }
              span.setAttributes({ ...attributes, ...responseAttributes })
              span.setStatus({ code: SpanStatusCode.OK })
              span.end()
            } else {
              // Handle unexpected requestType
              span.setStatus({
                code: SpanStatusCode.ERROR,
                message: 'Invalid request'
              })
              span.end()
            }
          } else {
            await processConverseStream(resp.stream, span, attributes)
          }

          return resp
        } catch (error: any) {
          span.recordException(error as Exception)
          span.setStatus({ code: SpanStatusCode.ERROR })
          span.end()
          throw new LangtraceSdkError(error.message as string, error.stack as string)
        }
      }
    )
  }
}

async function * processConverseStream (stream: any, span: Span, inputAttributes: Partial<LLMSpanAttributes>): any {
  const customAttributes = context.active().getValue(LANGTRACE_ADDITIONAL_SPAN_ATTRIBUTES_KEY) ?? {}
  addSpanEvent(span, Event.STREAM_START)

  const result: string[] = []
  let completionTokens = 0
  let promptTokens = 0

  try {
    for await (const chunk of stream) {
      const deserializedChunk = await stream.options.deserializer(chunk)
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      const content = deserializedChunk.contentBlockDelta?.delta?.text || ''
      promptTokens = deserializedChunk.metadata?.usage?.inputTokens ?? 0
      completionTokens = deserializedChunk.metadata?.usage?.outputTokens ?? 0
      result.push(content as string)

      yield deserializedChunk
    }

    addSpanEvent(span, Event.GEN_AI_COMPLETION, { 'gen_ai.completion': result.length > 0 ? JSON.stringify([{ role: 'assistant', content: result.join('') }]) : undefined })
    span.setStatus({ code: SpanStatusCode.OK })
    const stream_attributes: Partial<LLMSpanAttributes> = {
      'gen_ai.usage.output_tokens': promptTokens,
      'gen_ai.usage.input_tokens': completionTokens,
      'gen_ai.usage.total_tokens': promptTokens + completionTokens,
      'gen_ai.request.stream': true,
      ...customAttributes
    }
    span.setAttributes({ ...inputAttributes, ...stream_attributes })
    addSpanEvent(span, Event.STREAM_END)
  } catch (error: any) {
    span.recordException(error as Exception)
    span.setStatus({ code: SpanStatusCode.ERROR })
    throw new LangtraceSdkError(error.message as string, error.stack as string)
  } finally {
    span.end()
  }
}
