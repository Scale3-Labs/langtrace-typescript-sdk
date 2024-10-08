import { LANGTRACE_ADDITIONAL_SPAN_ATTRIBUTES_KEY } from '@langtrace-constants/common'
import { FrameworkSpanAttributes, Vendors } from '@langtrase/trace-attributes'
import { Tracer, context, SpanKind, SpanStatusCode, Exception, trace } from '@opentelemetry/api'
import { LangtraceSdkError } from 'errors/sdk_error'

export function genericPatch (
  originalMethod: (...args: any[]) => any,
  method: string,
  task: string,
  tracer: Tracer,
  langtraceVersion: string,
  version?: string
): (...args: any[]) => any {
  return function (this: any, ...args: any[]) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    const customAttributes = context.active().getValue(LANGTRACE_ADDITIONAL_SPAN_ATTRIBUTES_KEY) ?? {}
    const attributes: FrameworkSpanAttributes = {
      'langtrace.sdk.name': '@langtrase/typescript-sdk',
      'langtrace.service.name': Vendors.LLAMAINDEX,
      'langtrace.service.type': 'framework',
      'langtrace.service.version': version,
      'langtrace.version': langtraceVersion,
      'llamaindex.task.name': task,
      ...customAttributes
    }
    if (task !== 'llamaindex.SimpleVectorStore.query') {
      attributes['llamaindex.inputs'] = JSON.stringify(args)
    }
    const spanName = customAttributes['langtrace.span.name' as keyof typeof customAttributes] ?? method
    const span = tracer.startSpan(spanName, { kind: SpanKind.CLIENT, attributes }, context.active())

    const invokeMethod = (): any => {
      try {
        const result = originalMethod.apply(this, args)
        if (result instanceof Promise) {
          // Handle async function
          return result
            .then((response: any) => {
              if (task !== 'llamaindex.SimpleVectorStore.query') {
                span.setAttributes({ 'llamaindex.outputs': JSON.stringify(response) })
              }
              span.setStatus({ code: SpanStatusCode.OK })
              span.end()
              return response
            })
            .catch((error: any) => {
              span.recordException(error as Exception)
              span.setStatus({ code: SpanStatusCode.ERROR })
              span.end()
              throw error
            })
        } else {
          // Handle sync function
          if (task !== 'llamaindex.SimpleVectorStore.query') {
            span.setAttributes({ 'llamaindex.outputs': JSON.stringify(result) })
          }
          span.setStatus({ code: SpanStatusCode.OK })
          span.end()
          return result
        }
      } catch (error: any) {
        span.setStatus({ code: SpanStatusCode.ERROR })
        span.end()
        throw new LangtraceSdkError(error.message as string, error.stack as string)
      }
    }

    return context.with(trace.setSpan(context.active(), span), invokeMethod)
  }
}
