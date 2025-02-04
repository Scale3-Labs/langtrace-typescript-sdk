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

interface MessageContent {
  content: string
  role: string
}

interface TokenUsage {
  inputTokens?: number
  outputTokens?: number
  totalTokens?: number
}

function extractPromptFromAnthropic(args: any[]): MessageContent[] | undefined {
  const message = args[0]?.input?.messages?.[0]
  if (typeof message?.content !== 'undefined') {
    return message.content.map((content: { text: string }) => ({
      content: content.text,
      role: String(message.role)
    }))
  }
  return undefined
}

function extractPromptFromAmazon(body: ArrayBuffer): MessageContent[] | undefined {
  const bodyText = Buffer.from(body).toString('utf-8')
  const completion: { outputText?: string, completion?: string } = JSON.parse(bodyText)
  const content = completion?.outputText ?? completion?.completion
  if (typeof content === 'string') {
    return [{
      content: bodyText,
      role: 'user'
    }]
  }
  return undefined
}

function extractPromptFromCohere(body: ArrayBuffer): MessageContent[] | undefined {
  const bodyText = Buffer.from(body).toString('utf-8')
  const completion: { generations?: Array<{ text: string }> } = JSON.parse(bodyText)
  if (Array.isArray(completion?.generations) && completion.generations.length > 0) {
    const text = completion.generations[0]?.text
    if (typeof text === 'string') {
      return [{
        role: 'assistant',
        content: text
      }]
    }
  }
  return undefined
}

function extractCompletionFromAnthropic(resp: any): MessageContent[] | undefined {
  const messageContent = resp?.output?.message?.content
  if (Array.isArray(messageContent) && messageContent.length > 0) {
    return messageContent.map((content: { text?: string, toolUse?: string, toolResult?: string }) => ({
      role: String(resp?.output?.message?.role ?? 'assistant'),
      content: String(content?.text ?? content?.toolUse ?? content?.toolResult ?? '')
    }))
  }
  return undefined
}

function extractCompletionFromAmazon(body: ArrayBuffer): MessageContent[] | undefined {
  const bodyText = Buffer.from(body).toString('utf-8')
  const completion: { outputText?: string, completion?: string } = JSON.parse(bodyText)
  const content = completion?.outputText ?? completion?.completion
  if (typeof content === 'string') {
    return [{
      role: 'assistant',
      content
    }]
  }
  return undefined
}

function extractCompletionFromCohere(body: ArrayBuffer): MessageContent[] | undefined {
  const bodyText = Buffer.from(body).toString('utf-8')
  const completion: { generations?: Array<{ text: string }> } = JSON.parse(bodyText)
  if (Array.isArray(completion?.generations) && completion.generations.length > 0) {
    const text = completion.generations[0]?.text
    if (typeof text === 'string') {
      return [{
        role: 'assistant',
        content: text
      }]
    }
  }
  return undefined
}

function extractTokenUsageFromAnthropic(resp: any): TokenUsage | undefined {
  const usage = resp?.usage
  if (typeof usage?.inputTokens === 'number' && typeof usage?.outputTokens === 'number') {
    return {
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      totalTokens: usage.totalTokens
    }
  }
  return undefined
}

function extractTokenUsageFromAmazon(body: ArrayBuffer): TokenUsage | undefined {
  const bodyText = Buffer.from(body).toString('utf-8')
  const completion: { amazon_bedrock_invoke?: { input_tokens: number, output_tokens: number } } = JSON.parse(bodyText)
  const tokens = completion?.amazon_bedrock_invoke
  if (typeof tokens?.input_tokens === 'number' && typeof tokens?.output_tokens === 'number') {
    return {
      inputTokens: tokens.input_tokens,
      outputTokens: tokens.output_tokens,
      totalTokens: tokens.input_tokens + tokens.output_tokens
    }
  }
  return undefined
}

function extractTokenUsageFromCohere(resp: any): TokenUsage | undefined {
  const billedUnits = resp?.meta?.billedUnits
  if (typeof billedUnits === 'number') {
    return {
      totalTokens: billedUnits
    }
  }
  return undefined
}

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
    // Determine the service provider
    const serviceProvider: string = Vendors.AWSBEDROCK
    const attributes: LLMSpanAttributes = {
      'langtrace.sdk.name': '@langtrase/typescript-sdk',
      'gen_ai.operation.name': 'chat',
      'langtrace.service.name': serviceProvider,
      'langtrace.service.type': 'framework',
      'langtrace.service.version': version,
      'langtrace.version': langtraceVersion,
      'gen_ai.request.model': args[0]?.input.modelId,
      'url.full': originalContext?._client?.baseURL,
      'url.path': APIS.awsbedrock.CONVERSE.ENDPOINT,
      'http.max.retries': originalContext?._client?.maxRetries,
      'http.timeout': originalContext?._client?.timeout,
      'gen_ai.request.temperature': args[0]?.input?.inferenceConfig?.temperature,
      'gen_ai.request.top_p': args[0]?.input?.inferenceConfig?.topP,
      'gen_ai.user': args[0]?.user,
      'gen_ai.request.max_tokens': args[0]?.input?.inferenceConfig?.maxTokens,
      'gen_ai.request.tools': JSON.stringify(args[0]?.input?.toolConfig?.tools),
      ...customAttributes
    }
    /* eslint-disable no-console */
    const spanName = customAttributes['langtrace.span.name' as keyof typeof customAttributes] ?? APIS.awsbedrock.CONVERSE.METHOD
    const span = tracer.startSpan(spanName, { kind: SpanKind.CLIENT, attributes }, context.active())
    return await context.with(
      trace.setSpan(context.active(), span),
      async () => {
        try {
          const resp = await originalMethod.apply(this, args)


          // Extract prompt based on model type
          const modelId = String(args[0]?.input?.modelId ?? '')
          let message_content: MessageContent[] | undefined

          try {
            if (modelId.startsWith('anthropic.')) {
              message_content = extractPromptFromAnthropic(args)
            } else if (modelId.startsWith('amazon.')) {
              message_content = extractPromptFromAmazon(resp.body as ArrayBuffer)
            } else if (modelId.startsWith('cohere.')) {
              message_content = extractPromptFromCohere(resp.body as ArrayBuffer)
            }
          } catch (e) {
            // If extraction fails, skip adding prompt event
          }

          if (typeof message_content !== 'undefined') {
            addSpanEvent(span, Event.GEN_AI_PROMPT, { 'gen_ai.prompt': JSON.stringify(message_content) })
          }

          if (resp.stream === undefined) {
            // Parse completion and token usage based on model type
            let responses: MessageContent[] | undefined
            let tokenUsage: TokenUsage | undefined

            try {
              if (modelId.startsWith('anthropic.')) {
                responses = extractCompletionFromAnthropic(resp)
                tokenUsage = extractTokenUsageFromAnthropic(resp)
              } else if (modelId.startsWith('amazon.')) {
                responses = extractCompletionFromAmazon(resp.body as ArrayBuffer)
                tokenUsage = extractTokenUsageFromAmazon(resp.body as ArrayBuffer)
              } else if (modelId.startsWith('cohere.')) {
                responses = extractCompletionFromCohere(resp.body as ArrayBuffer)
                tokenUsage = extractTokenUsageFromCohere(resp)
              }
            } catch (e) {
              // If extraction fails, skip adding completion and token usage events
            }

            if (typeof responses !== 'undefined') {
              addSpanEvent(span, Event.GEN_AI_COMPLETION, { 'gen_ai.completion': JSON.stringify(responses) })
            }

            // Add token usage to response attributes
            const responseAttributes: Partial<LLMSpanAttributes> = { 'gen_ai.response.model': modelId }
            if (tokenUsage?.inputTokens !== undefined) {
              responseAttributes['gen_ai.usage.input_tokens'] = tokenUsage.inputTokens
            }
            if (tokenUsage?.outputTokens !== undefined) {
              responseAttributes['gen_ai.usage.output_tokens'] = tokenUsage.outputTokens
            }
            if (tokenUsage?.totalTokens !== undefined) {
              responseAttributes['gen_ai.usage.total_tokens'] = tokenUsage.totalTokens
            }
            span.setAttributes({ ...attributes, ...responseAttributes })
            span.setStatus({ code: SpanStatusCode.OK })
            return resp
          } else {
            await processConverseStream(resp.stream, span, attributes)
            return resp
          }
        } catch (error: any) {
          span.recordException(error as Exception)
          span.setStatus({ code: SpanStatusCode.ERROR })
          throw new LangtraceSdkError(error.message as string, error.stack as string)
        } finally {
          span.end()
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
