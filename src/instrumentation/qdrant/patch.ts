import { LANGTRACE_ADDITIONAL_SPAN_ATTRIBUTES_KEY } from '@langtrace-constants/common'
import { SERVICE_PROVIDERS } from '@langtrace-constants/instrumentation/common'
import { APIS } from '@langtrace-constants/instrumentation/qdrant'
import { DatabaseSpanAttributes } from '@langtrase/trace-attributes'
import { Exception, SpanKind, SpanStatusCode, Tracer, context, trace } from '@opentelemetry/api'

export function genericCollectionPatch (
  originalMethod: (...args: any[]) => any,
  method: string,
  tracer: Tracer,
  langtraceVersion: string,
  sdkName: string,
  version?: string
): (...args: any[]) => any {
  return async function (this: any, ...args: any[]): Promise<any> {
    const api = APIS[method]
    const customAttributes = context.active().getValue(LANGTRACE_ADDITIONAL_SPAN_ATTRIBUTES_KEY) ?? {}

    const attributes: DatabaseSpanAttributes = {
      'langtrace.sdk.name': sdkName,
      'langtrace.service.name': SERVICE_PROVIDERS.QDRANT,
      'langtrace.service.type': 'vectordb',
      'langtrace.service.version': version,
      'langtrace.version': langtraceVersion,
      'db.system': 'qdrant',
      'db.operation': api.OPERATION,
      ...customAttributes
    }

    const span = tracer.startSpan(api.METHOD, { kind: SpanKind.CLIENT, attributes })
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return await context.with(
      trace.setSpan(context.active(), trace.getSpan(context.active()) ?? span),
      async () => {
        try {
          const response = await originalMethod.apply(this, args)

          span.setStatus({ code: SpanStatusCode.OK })
          span.end()

          // eslint-disable-next-line @typescript-eslint/no-unsafe-return
          return response
        } catch (error: any) {
          // If an error occurs, record the exception and end the span
          span.recordException(error as Exception)
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error.message
          })
          span.end()
          throw error
        }
      }
    )
  }
}
