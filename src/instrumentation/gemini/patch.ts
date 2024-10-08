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
import { calculatePromptTokens, estimateTokens } from '@langtrace-utils/llm'
import { addSpanEvent, createStreamProxy } from '@langtrace-utils/misc'
import {
  APIS,
  Event,
  LLMSpanAttributes,
  Vendors
} from '@langtrase/trace-attributes'
import {
  context,
  diag,
  Exception,
  Span,
  SpanKind,
  SpanStatusCode,
  trace,
  Tracer
} from '@opentelemetry/api'
import { LangtraceSdkError } from 'errors/sdk_error'

export function generateContentPatch (
  originalMethod: (...args: any[]) => any,
  tracer: Tracer,
  langtraceVersion: string,
  sdkName: string,
  version?: string
): (...args: any[]) => any {
  return async function (this: any, ...args: any[]) {
    const serviceProvider = Vendors.GEMINI
    const customAttributes = context.active().getValue(LANGTRACE_ADDITIONAL_SPAN_ATTRIBUTES_KEY) ?? {}

    const prompts = args.map(arg => ({
      role: 'user',
      content: arg
    }))

    const attributes: LLMSpanAttributes = {
      'langtrace.sdk.name': sdkName,
      'langtrace.service.name': serviceProvider,
      'langtrace.service.type': 'llm',
      'gen_ai.operation.name': 'chat',
      'langtrace.service.version': version,
      'langtrace.version': langtraceVersion,
      'url.full': '',
      'url.path': '',
      'gen_ai.request.model': this?.model,
      'http.max.retries': this?._client?.maxRetries,
      'http.timeout': this?._client?.timeout,
      'gen_ai.request.temperature': this?.generationConfig?.temperature,
      'gen_ai.request.top_p': this?.generationConfig?.topP,
      'gen_ai.request.top_k': this?.generationConfig?.topK,
      'gen_ai.request.max_tokens': this?.generationConfig?.maxOutputTokens,
      'gen_ai.request.response_format': this?.generationConfig?.responseMimeType,
      'gen_ai.request.frequency_penalty': this?.generationConfig?.frequencyPenalty,
      'gen_ai.request.presence_penalty': this?.generationConfig?.presencePenalty,
      'gen_ai.request.seed': this?.generationConfig?.seed,
      ...customAttributes
    }

    const spanName = customAttributes['langtrace.span.name' as keyof typeof customAttributes] || APIS.gemini.GENERATE_CONTENT.METHOD

    const span = tracer.startSpan(
      spanName,
      { kind: SpanKind.CLIENT, attributes },
      context.active()
    )
    addSpanEvent(span, Event.GEN_AI_PROMPT, { 'gen_ai.prompt': JSON.stringify(prompts) })

    return await context.with(
      trace.setSpan(context.active(), span),
      async () => {
        try {
          const resp = await originalMethod.apply(this, args)
          if (Boolean(resp?.stream) && typeof resp?.stream[Symbol.asyncIterator] === 'function') {
            // Change the span name for streaming
            span.updateName(APIS.gemini.GENERATE_CONTENT_STREAM.METHOD)
            const model = this?.model
            const promptContent: string = JSON.stringify(prompts)
            const promptTokens = calculatePromptTokens(
              promptContent,
              model as string
            )

            const wrappedStream = createStreamProxy(
              resp.stream,
              handleStreamResponse(span, resp.stream, promptTokens, attributes)
            )

            return {
              ...resp,
              stream: wrappedStream
            }
          } else {
            addSpanEvent(span, Event.GEN_AI_COMPLETION, { 'gen_ai.completion': JSON.stringify(resp.response.text()) })

            const respAttributes: Partial<LLMSpanAttributes> = {
              'gen_ai.usage.input_tokens': Number(
                resp?.response?.usageMetadata?.promptTokenCount
              ),
              'gen_ai.usage.output_tokens': Number(
                resp?.response?.usageMetadata?.candidatesTokenCount
              ),
              'gen_ai.usage.total_tokens': Number(
                resp?.response?.usageMetadata?.totalTokenCount
              ),
              'gen_ai.response.finish_reasons':
                resp?.response?.candidates[0]?.finishReason
            }
            span.setAttributes({ ...attributes, ...respAttributes })
            span.setStatus({ code: SpanStatusCode.OK })
            span.end()
            return resp
          }
        } catch (error: any) {
          span.setStatus({ code: SpanStatusCode.ERROR })
          span.recordException(error as Exception)
          throw new LangtraceSdkError(error.message as string, error.stack as string)
        }
      }
    )
  }
}

async function * handleStreamResponse (
  span: Span,
  stream: any,
  promptTokens: number,
  inputAttributes: Partial<LLMSpanAttributes>
): AsyncGenerator {
  let completionTokens = 0
  const result: string[] = []
  diag.debug('handleStreamResponse for Gemini')
  const customAttributes =
    context.active().getValue(LANGTRACE_ADDITIONAL_SPAN_ATTRIBUTES_KEY) ?? {}
  addSpanEvent(span, Event.STREAM_START)
  try {
    for await (const chunk of stream) {
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      const content = chunk.text ? chunk.text() : ''
      const tokenCount = estimateTokens(content as string)
      completionTokens += tokenCount
      result.push(content as string)
      yield chunk
    }
    addSpanEvent(span, Event.GEN_AI_COMPLETION, {
      'gen_ai.completion':
        result.length > 0
          ? JSON.stringify([{ role: 'assistant', content: result.join('') }])
          : undefined
    })

    const attributes: Partial<LLMSpanAttributes> = {
      'gen_ai.usage.output_tokens': promptTokens,
      'gen_ai.usage.input_tokens': completionTokens,
      'gen_ai.usage.total_tokens': promptTokens + completionTokens,
      ...customAttributes
    }
    span.setAttributes({ ...inputAttributes, ...attributes })
    span.setStatus({ code: SpanStatusCode.OK })
    addSpanEvent(span, Event.STREAM_END)
    return stream
  } catch (error: any) {
    span.recordException(error as Exception)
    span.setStatus({ code: SpanStatusCode.ERROR })
    throw new LangtraceSdkError(error.message as string, error.stack as string)
  } finally {
    span.end()
  }
}
