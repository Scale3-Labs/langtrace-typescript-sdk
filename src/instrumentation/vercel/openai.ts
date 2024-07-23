import { LANGTRACE_ADDITIONAL_SPAN_ATTRIBUTES_KEY } from '@langtrace-constants/common'
import { calculatePromptTokens, estimateTokens } from '@langtrace-utils/llm'
import { FrameworkSpanAttributes, LLMSpanAttributes, Vendors, Event } from '@langtrase/trace-attributes'
import { Tracer, context, SpanKind, trace, Exception, SpanStatusCode, Span } from '@opentelemetry/api'

export async function streamTextPatchOpenAI (
  this: any,
  patchThis: any,
  args: any[],
  originalMethod: (...args: any[]) => any,
  method: string,
  tracer: Tracer,
  langtraceVersion: string,
  sdkName: string,
  version?: string
): Promise<(...args: any[]) => any> {
  let url: string
  let path: string
  // wrap the url method to get the url and path
  patchThis._wrap(args[0]?.model?.config, 'url', (originalMethod: (...args: any[]) => any) => {
    return function (this: any, ...args: any[]): any {
      const result = originalMethod.apply(this, args)
      const uri = new URL(result as string)
      path = uri.pathname
      url = uri.origin
      return result
    }
  })

  const customAttributes = context.active().getValue(LANGTRACE_ADDITIONAL_SPAN_ATTRIBUTES_KEY) ?? {}
  const attributes: FrameworkSpanAttributes & LLMSpanAttributes = {
    'langtrace.sdk.name': sdkName,
    'langtrace.service.name': Vendors.VERCEL,
    'langtrace.service.type': 'framework',
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
    'gen_ai.request.logit_bias': JSON.stringify(args[0]?.model?.settings?.logitBias),
    'gen_ai.request.max_tokens': args[0]?.maxTokens,
    'gen_ai.request.tools': JSON.stringify(args[0]?.tools),
    ...customAttributes
  }
  const span = tracer.startSpan(method, { kind: SpanKind.CLIENT, attributes }, context.active())
  return await context.with(
    trace.setSpan(context.active(), span),
    async () => {
      try {
        const resp: any = await originalMethod.apply(this, args)
        span.addEvent(Event.GEN_AI_PROMPT, { 'gen_ai.prompt': JSON.stringify(args[0]?.messages) })
        const responseAttributes: Partial<LLMSpanAttributes> = {
          'url.full': url,
          'url.path': path
        }
        const proxiedResp = new Proxy(resp, {
          get (target, prop) {
            if (prop === 'fullStream' || prop === 'textStream') {
              const promptContent: string = args[0].messages.map((message: any) => message?.content).join(' ')
              const promptTokens = calculatePromptTokens(promptContent, attributes['gen_ai.request.model'] as string)
              return handleOpenAIStreamResponse(span, target[prop], { ...attributes, ...responseAttributes }, promptTokens)
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
    }
  )
}

export async function generateTextPatchOpenAI (
  this: any,
  patchThis: any,
  args: any[],
  originalMethod: (...args: any[]) => any,
  method: string,
  tracer: Tracer,
  langtraceVersion: string,
  sdkName: string,
  version?: string
): Promise<(...args: any[]) => any> {
  let url: string
  let path: string
  // wrap the url method to get the url and path
  patchThis._wrap(args[0]?.model?.config, 'url', (originalMethod: (...args: any[]) => any) => {
    return function (this: any, ...args: any[]): any {
      const result = originalMethod.apply(this, args)
      const uri = new URL(result as string)
      path = uri.pathname
      url = uri.origin
      return result
    }
  })
  const customAttributes = context.active().getValue(LANGTRACE_ADDITIONAL_SPAN_ATTRIBUTES_KEY) ?? {}
  const attributes: FrameworkSpanAttributes & LLMSpanAttributes = {
    'langtrace.sdk.name': sdkName,
    'langtrace.service.name': Vendors.VERCEL,
    'langtrace.service.type': 'framework',
    'langtrace.service.version': version,
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
    'gen_ai.request.logit_bias': JSON.stringify(args[0]?.model?.settings?.logitBias),
    'gen_ai.request.max_tokens': args[0]?.maxTokens,
    'gen_ai.request.tools': JSON.stringify(args[0]?.tools),
    ...customAttributes
  }
  const span = tracer.startSpan(method, { kind: SpanKind.CLIENT, attributes }, context.active())
  return await context.with(
    trace.setSpan(context.active(), span),
    async () => {
      try {
        const resp = await originalMethod.apply(this, args)
        const responses = JSON.stringify(resp?.responseMessages)
        span.addEvent(Event.GEN_AI_PROMPT, { 'gen_ai.prompt': JSON.stringify(args[0]?.messages) })
        span.addEvent(Event.GEN_AI_COMPLETION, { 'gen_ai.completion': responses })
        const responseAttributes: Partial<LLMSpanAttributes> = {
          'url.full': url,
          'url.path': path,
          'gen_ai.usage.prompt_tokens': resp.usage.promptTokens,
          'gen_ai.usage.completion_tokens': resp.usage.completionTokens
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
}

export async function embedPatchOpenAI (
  this: any,
  patchThis: any,
  args: any[],
  originalMethod: (...args: any[]) => any,
  method: string,
  tracer: Tracer,
  langtraceVersion: string,
  sdkName: string,
  version?: string
): Promise<(...args: any[]) => any> {
  let url: string
  let path: string
  // wrap the url method to get the url and path
  patchThis._wrap(args[0]?.model?.config, 'url', (originalMethod: (...args: any[]) => any) => {
    return function (this: any, ...args: any[]): any {
      const result = originalMethod.apply(this, args)
      const uri = new URL(result as string)
      path = uri.pathname
      url = uri.origin
      return result
    }
  })
  const customAttributes = context.active().getValue(LANGTRACE_ADDITIONAL_SPAN_ATTRIBUTES_KEY) ?? {}
  const attributes: FrameworkSpanAttributes & LLMSpanAttributes = {
    'langtrace.sdk.name': sdkName,
    'langtrace.service.name': Vendors.VERCEL,
    'langtrace.service.type': 'framework',
    'langtrace.service.version': version,
    'langtrace.version': langtraceVersion,
    'gen_ai.request.model': args[0]?.model?.modelId,
    'url.full': '',
    'url.path': '',
    'gen_ai.request.dimensions': args[0]?.model?.settings?.dimensions,
    'gen_ai.request.embedding_inputs': args[0]?.value ?? JSON.stringify(args[0]?.values),
    'http.max.retries': args[0]?.maxRetries,
    'gen_ai.user': args[0]?.model?.settings?.user,
    ...customAttributes
  }
  const span = tracer.startSpan(method, { kind: SpanKind.CLIENT, attributes }, context.active())
  return await context.with(
    trace.setSpan(context.active(), span),
    async () => {
      try {
        const resp = await originalMethod.apply(this, args)
        const responseAttributes: Partial<LLMSpanAttributes> = {
          'url.full': url,
          'url.path': path,
          'gen_ai.usage.total_tokens': Number.isNaN(resp?.usage?.tokens) ? undefined : resp?.usage?.tokens,
          'gen_ai.usage.prompt_tokens': resp.usage.promptTokens,
          'gen_ai.usage.completion_tokens': resp.usage.completionTokens
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
}

async function * handleOpenAIStreamResponse (
  span: Span,
  stream: any,
  inputAttributes: Partial<LLMSpanAttributes>,
  promptTokens: number
): any {
  const result: string[] = []
  let completionTokens = 0
  const customAttributes = context.active().getValue(LANGTRACE_ADDITIONAL_SPAN_ATTRIBUTES_KEY) ?? {}
  span.addEvent(Event.STREAM_START)
  try {
    for await (const chunk of stream) {
      const content: string = chunk.textDelta ?? chunk
      completionTokens += estimateTokens(content)
      if (chunk?.type === 'finish') {
        inputAttributes['gen_ai.usage.completion_tokens'] = chunk?.usage?.completionTokens
        inputAttributes['gen_ai.usage.prompt_tokens'] = chunk?.usage?.promptTokens
        inputAttributes['gen_ai.usage.total_tokens'] = chunk?.usage?.totalTokens
      } else {
        inputAttributes['gen_ai.usage.completion_tokens'] = completionTokens
        inputAttributes['gen_ai.usage.prompt_tokens'] = promptTokens
        inputAttributes['gen_ai.usage.total_tokens'] = promptTokens + completionTokens
      }
      if (content !== undefined && content.length > 0) {
        result.push(content)
        span.addEvent(Event.GEN_AI_COMPLETION_CHUNK, { 'gen_ai.completion.chunk': JSON.stringify({ role: 'assistant', content }) })
      }
      yield chunk
    }
    span.addEvent(Event.STREAM_END)
    span.addEvent(Event.GEN_AI_COMPLETION, { 'gen_ai.completion': result.length > 0 ? JSON.stringify([{ role: 'assistant', content: result.join('') }]) : undefined })
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
