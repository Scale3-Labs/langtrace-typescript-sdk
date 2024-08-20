import { LANGTRACE_ADDITIONAL_SPAN_ATTRIBUTES_KEY } from '@langtrace-constants/common'
import {
  APIS,
  Event,
  FrameworkSpanAttributes,
  LLMSpanAttributes,
  Vendors
} from '@langtrase/trace-attributes'
import {
  context,
  Exception, Span, SpanKind,
  SpanStatusCode,
  trace,
  Tracer
} from '@opentelemetry/api'

import { calculatePromptTokens, estimateTokens } from '@langtrace-utils/llm'
import { addSpanEvent } from '@langtrace-utils/misc'

export async function generateTextPatchAnthropic (
  this: any,
  args: any[],
  originalMethod: (...args: any[]) => any,
  method: string,
  tracer: Tracer,
  langtraceVersion: string,
  sdkName: string,
  version?: string
): Promise<(...args: any[]) => any> {
  let url: string
  if (args[0]?.model?.config?.baseURL !== undefined) {
    url = args[0]?.model?.config?.baseURL
  } else {
    url = this?._client?.baseURL
  }

  const customAttributes = context.active().getValue(LANGTRACE_ADDITIONAL_SPAN_ATTRIBUTES_KEY) ?? {}
  const attributes: FrameworkSpanAttributes & LLMSpanAttributes = {
    'langtrace.sdk.name': sdkName,
    'langtrace.service.name': Vendors.VERCEL,
    'langtrace.service.type': 'framework',
    'langtrace.service.version': version,
    'gen_ai.operation.name': 'chat',
    'langtrace.version': langtraceVersion,
    'gen_ai.request.model': args[0]?.model?.modelId,
    'url.full': '',
    'url.path': '',
    'gen_ai.request.stream': false,
    'http.max.retries': args[0]?.maxRetries,
    'gen_ai.request.temperature': args[0]?.temperature,
    'gen_ai.request.top_p': args[0]?.topP,
    'gen_ai.user': args[0]?.model?.settings?.user,
    'gen_ai.request.top_logprobs': args[0]?.model?.settings?.logprobs,
    'gen_ai.request.logprobs': args[0]?.model?.settings?.logprobs !== undefined,
    'gen_ai.request.logit_bias': JSON.stringify(
      args[0]?.model?.settings?.logitBias
    ),
    'gen_ai.request.max_tokens': args[0]?.maxTokens,
    'gen_ai.request.tools': JSON.stringify(args[0]?.tools),
    ...customAttributes
  }
  const span = tracer.startSpan(
    method,
    { kind: SpanKind.CLIENT, attributes },
    context.active()
  )
  return await context.with(trace.setSpan(context.active(), span), async () => {
    try {
      const resp = await originalMethod.apply(this, args)
      const responses = JSON.stringify(resp?.responseMessages)
      span.addEvent(Event.GEN_AI_PROMPT, {
        'gen_ai.prompt': JSON.stringify([
          { role: 'user', content: args[0]?.prompt }
        ])
      })
      span.addEvent(Event.GEN_AI_COMPLETION, { 'gen_ai.completion': responses })
      const responseAttributes: Partial<LLMSpanAttributes> = {
        'url.full': url,
        'url.path': APIS.anthropic.MESSAGES_CREATE.ENDPOINT,
        'gen_ai.usage.input_tokens': resp.usage.promptTokens,
        'gen_ai.usage.output_tokens': resp.usage.completionTokens
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
  })
}

export async function streamTextPatchAnthropic (
  this: any,
  args: any[],
  originalMethod: (...args: any[]) => any,
  method: string,
  tracer: Tracer,
  langtraceVersion: string,
  sdkName: string,
  version?: string
): Promise<(...args: any[]) => any> {
  let url: string
  if (args[0]?.model?.config?.baseURL !== undefined) {
    url = args[0]?.model?.config?.baseURL
  } else {
    url = this?._client?.baseURL
  }

  const customAttributes = context.active().getValue(LANGTRACE_ADDITIONAL_SPAN_ATTRIBUTES_KEY) ?? {}
  const attributes: FrameworkSpanAttributes & LLMSpanAttributes = {
    'langtrace.sdk.name': sdkName,
    'langtrace.service.name': Vendors.VERCEL,
    'langtrace.service.type': 'framework',
    'gen_ai.operation.name': 'chat',
    'langtrace.service.version': version,
    'langtrace.version': langtraceVersion,
    'gen_ai.request.model': args[0]?.model?.modelId,
    'url.full': '',
    'url.path': '',
    'http.max.retries': args[0]?.maxRetries,
    'gen_ai.request.stream': true,
    'gen_ai.request.temperature': args[0]?.temperature,
    'gen_ai.request.top_p': args[0]?.topP,
    'gen_ai.user': args[0]?.model?.settings?.user,
    'gen_ai.request.top_logprobs': args[0]?.model?.settings?.logprobs,
    'gen_ai.request.logprobs': args[0]?.model?.settings?.logprobs !== undefined,
    'gen_ai.request.logit_bias': JSON.stringify(
      args[0]?.model?.settings?.logitBias
    ),
    'gen_ai.request.max_tokens': args[0]?.maxTokens,
    'gen_ai.request.tools': JSON.stringify(args[0]?.tools),
    ...customAttributes
  }
  const spanName = customAttributes['langtrace.span.name' as keyof typeof customAttributes] ?? method
  const span = tracer.startSpan(
    spanName,
    { kind: SpanKind.CLIENT, attributes },
    context.active()
  )
  return await context.with(trace.setSpan(context.active(), span), async () => {
    try {
      const resp: any = await originalMethod.apply(this, args)
      addSpanEvent(span, Event.GEN_AI_PROMPT, { 'gen_ai.prompt': JSON.stringify(args[0]?.prompt) })
      const responseAttributes: Partial<LLMSpanAttributes> = {
        'url.full': url,
        'url.path': APIS.anthropic.MESSAGES_CREATE.ENDPOINT
      }
      const proxiedResp = new Proxy(resp, {
        get (target, prop) {
          if (prop === 'fullStream' || prop === 'textStream') {
            const promptContent: string = args[0].prompt
            const promptTokens = calculatePromptTokens(
              promptContent,
              attributes['gen_ai.request.model']
            )
            return handleAnthropicStreamResponse(
              span,
              target[prop],
              prop,
              { ...attributes, ...responseAttributes },
              promptTokens
            )
          }
          return target[prop]
        }
      })
      return proxiedResp
    } catch (error: any) {
      span.recordException(error as Exception)
      span.setStatus({ code: SpanStatusCode.ERROR })
      span.end()
      throw error
    }
  })
}

export async function generateObjectPatchAnthropic (
  this: any,
  args: any[],
  originalMethod: (...args: any[]) => any,
  method: string,
  tracer: Tracer,
  langtraceVersion: string,
  sdkName: string,
  version?: string
): Promise<(...args: any[]) => any> {
  let url: string
  if (args[0]?.model?.config?.baseURL !== undefined) {
    url = args[0]?.model?.config?.baseURL
  } else {
    url = this?._client?.baseURL
  }

  const customAttributes = context.active().getValue(LANGTRACE_ADDITIONAL_SPAN_ATTRIBUTES_KEY) ?? {}
  const attributes: FrameworkSpanAttributes & LLMSpanAttributes = {
    'langtrace.sdk.name': sdkName,
    'langtrace.service.name': Vendors.VERCEL,
    'langtrace.service.type': 'framework',
    'langtrace.service.version': version,
    'gen_ai.operation.name': 'chat',
    'langtrace.version': langtraceVersion,
    'gen_ai.request.model': args[0]?.model?.modelId,
    'url.full': '',
    'url.path': '',
    'gen_ai.request.stream': false,
    'http.max.retries': args[0]?.maxRetries,
    'gen_ai.request.temperature': args[0]?.temperature,
    'gen_ai.request.top_p': args[0]?.topP,
    'gen_ai.user': args[0]?.model?.settings?.user,
    'gen_ai.request.top_logprobs': args[0]?.model?.settings?.logprobs,
    'gen_ai.request.logprobs': args[0]?.model?.settings?.logprobs !== undefined,
    'gen_ai.request.logit_bias': JSON.stringify(
      args[0]?.model?.settings?.logitBias
    ),
    'gen_ai.request.max_tokens': args[0]?.maxTokens,
    'gen_ai.request.tools': JSON.stringify(args[0]?.tools),
    ...customAttributes
  }
  const span = tracer.startSpan(
    method,
    { kind: SpanKind.CLIENT, attributes },
    context.active()
  )
  return await context.with(trace.setSpan(context.active(), span), async () => {
    try {
      const resp = await originalMethod.apply(this, args)
      const responses = JSON.stringify(resp?.object)
      span.addEvent(Event.GEN_AI_PROMPT, {
        'gen_ai.prompt': JSON.stringify([
          { role: 'user', content: args[0]?.prompt }
        ])
      })
      span.addEvent(Event.GEN_AI_COMPLETION, { 'gen_ai.completion': responses })
      const responseAttributes: Partial<LLMSpanAttributes> = {
        'url.full': url,
        'url.path': APIS.anthropic.MESSAGES_CREATE.ENDPOINT,
        'gen_ai.usage.input_tokens': resp.usage.promptTokens,
        'gen_ai.usage.output_tokens': resp.usage.completionTokens
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
  })
}

export async function streamObjectPatchAnthropic (
  this: any,
  args: any[],
  originalMethod: (...args: any[]) => any,
  method: string,
  tracer: Tracer,
  langtraceVersion: string,
  sdkName: string,
  version?: string
): Promise<(...args: any[]) => any> {
  let url: string
  if (args[0]?.model?.config?.baseURL !== undefined) {
    url = args[0]?.model?.config?.baseURL
  } else {
    url = this?._client?.baseURL
  }

  const customAttributes = context.active().getValue(LANGTRACE_ADDITIONAL_SPAN_ATTRIBUTES_KEY) ?? {}
  const attributes: FrameworkSpanAttributes & LLMSpanAttributes = {
    'langtrace.sdk.name': sdkName,
    'langtrace.service.name': Vendors.VERCEL,
    'langtrace.service.type': 'framework',
    'gen_ai.operation.name': 'chat',
    'langtrace.service.version': version,
    'langtrace.version': langtraceVersion,
    'gen_ai.request.model': args[0]?.model?.modelId,
    'url.full': '',
    'url.path': '',
    'http.max.retries': args[0]?.maxRetries,
    'gen_ai.request.stream': true,
    'gen_ai.request.temperature': args[0]?.temperature,
    'gen_ai.request.top_p': args[0]?.topP,
    'gen_ai.user': args[0]?.model?.settings?.user,
    'gen_ai.request.top_logprobs': args[0]?.model?.settings?.logprobs,
    'gen_ai.request.logprobs': args[0]?.model?.settings?.logprobs !== undefined,
    'gen_ai.request.logit_bias': JSON.stringify(
      args[0]?.model?.settings?.logitBias
    ),
    'gen_ai.request.max_tokens': args[0]?.maxTokens,
    'gen_ai.request.tools': JSON.stringify(args[0]?.tools),
    ...customAttributes
  }
  const spanName = customAttributes['langtrace.span.name' as keyof typeof customAttributes] ?? method
  const span = tracer.startSpan(
    spanName,
    { kind: SpanKind.CLIENT, attributes },
    context.active()
  )
  return await context.with(trace.setSpan(context.active(), span), async () => {
    try {
      const resp: any = await originalMethod.apply(this, args)
      addSpanEvent(span, Event.GEN_AI_PROMPT, { 'gen_ai.prompt': JSON.stringify(args[0]?.prompt) })
      const responseAttributes: Partial<LLMSpanAttributes> = {
        'url.full': url,
        'url.path': APIS.anthropic.MESSAGES_CREATE.ENDPOINT
      }
      const proxiedResp = new Proxy(resp, {
        get (target, prop) {
          if (prop === 'fullStream' || prop === 'textStream' || prop === 'partialObjectStream') {
            const promptContent: string = args[0].prompt
            const promptTokens = calculatePromptTokens(
              promptContent,
              attributes['gen_ai.request.model']
            )
            return handleAnthropicStreamResponse(
              span,
              target[prop],
              prop,
              { ...attributes, ...responseAttributes },
              promptTokens
            )
          }
          return target[prop]
        }
      })
      return proxiedResp
    } catch (error: any) {
      span.recordException(error as Exception)
      span.setStatus({ code: SpanStatusCode.ERROR })
      span.end()
      throw error
    }
  })
}

async function * handleAnthropicStreamResponse (
  span: Span,
  stream: any,
  streamType: string,
  inputAttributes: Partial<LLMSpanAttributes>,
  promptTokens: number
): any {
  const result: string[] = []
  let completionTokens = 0
  const customAttributes = context.active().getValue(LANGTRACE_ADDITIONAL_SPAN_ATTRIBUTES_KEY) ?? {}
  addSpanEvent(span, Event.STREAM_START)

  try {
    for await (const chunk of stream) {
      const content: string = chunk.textDelta ?? JSON.stringify(chunk)
      completionTokens += estimateTokens(content)
      if (chunk?.type === 'finish') {
        inputAttributes['gen_ai.usage.output_tokens'] = chunk?.usage?.completionTokens
        inputAttributes['gen_ai.usage.input_tokens'] = chunk?.usage?.promptTokens
        inputAttributes['gen_ai.usage.total_tokens'] = chunk?.usage?.totalTokens
      } else {
        inputAttributes['gen_ai.usage.output_tokens'] = completionTokens
        inputAttributes['gen_ai.usage.input_tokens'] = promptTokens
        inputAttributes['gen_ai.usage.total_tokens'] = promptTokens + completionTokens
      }
      if (content !== undefined && content.length > 0) {
        result.push(content)
        addSpanEvent(span, Event.GEN_AI_COMPLETION_CHUNK, { 'gen_ai.completion.chunk': JSON.stringify({ role: 'assistant', content }) })
      }
      yield chunk
    }
    addSpanEvent(span, Event.STREAM_END)
    if (streamType === 'partialObjectStream') {
      addSpanEvent(span, Event.GEN_AI_COMPLETION, { 'gen_ai.completion': result.length > 0 ? JSON.stringify([{ role: 'assistant', content: result.at(-1) }]) : undefined })
    } else {
      addSpanEvent(span, Event.GEN_AI_COMPLETION, { 'gen_ai.completion': result.length > 0 ? JSON.stringify([{ role: 'assistant', content: result.join('') }]) : undefined })
    }
    span.setStatus({ code: SpanStatusCode.OK })
    span.setAttributes({ ...inputAttributes, ...customAttributes })
  } catch (error: any) {
    span.recordException(error as Exception)
    span.setStatus({ code: SpanStatusCode.ERROR })
    throw error
  } finally {
    span.end()
  }
}
