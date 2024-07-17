import { LANGTRACE_ADDITIONAL_SPAN_ATTRIBUTES_KEY } from '@langtrace-constants/common'
import { FrameworkSpanAttributes, LLMSpanAttributes, Vendors, Event } from '@langtrase/trace-attributes'
import { Tracer, context, SpanKind, trace, Exception, SpanStatusCode, Span } from '@opentelemetry/api'

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
