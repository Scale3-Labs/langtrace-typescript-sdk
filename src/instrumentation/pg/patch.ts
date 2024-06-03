import { LANGTRACE_ADDITIONAL_SPAN_ATTRIBUTES_KEY } from '@langtrace-constants/common'
import { APIS } from '@langtrace-constants/instrumentation/pg'
import { SERVICE_PROVIDERS } from '@langtrace-constants/instrumentation/common'
import { DatabaseSpanAttributes, Event } from '@langtrase/trace-attributes'
import { context, Exception, SpanKind, SpanStatusCode, trace, Tracer } from '@opentelemetry/api'
import { stringify } from '@langtrace-utils/misc'

export const patchPgQuery = (original: any, tracer: Tracer, sdkName: string, langtraceVersion: string, version?: string): any => {
  return async function (this: any, queryOrTextConfig: any, values: any, callback: any) {
    const customAttributes = context.active().getValue(LANGTRACE_ADDITIONAL_SPAN_ATTRIBUTES_KEY) ?? {}
    const attributes: DatabaseSpanAttributes = {
      'langtrace.sdk.name': sdkName,
      'langtrace.service.name': SERVICE_PROVIDERS.PG,
      'langtrace.service.type': 'vectordb',
      'langtrace.service.version': version,
      'langtrace.version': langtraceVersion,
      'db.system': 'postgres',
      'db.collection.name': this.connectionParameters.database,
      'server.address': this.connectionParameters.host,
      'db.query': stringify({ queryOrTextConfig, values }),
      ...customAttributes
    }

    const span = tracer.startSpan(APIS.QUERY.METHOD, { kind: SpanKind.CLIENT, attributes })
    return await context.with(
      trace.setSpan(context.active(), trace.getSpan(context.active()) ?? span), async () => {
        try {
          const resp = await original.apply(this, [queryOrTextConfig, values, callback])
          attributes['db.operation'] = resp.command
          attributes['db.top_k'] = resp.rowCount
          span.setAttributes(attributes)
          if (resp !== undefined) span.addEvent(Event.RESPONSE, { 'db.response': stringify(resp) })
          span.setStatus({ code: SpanStatusCode.OK })
          span.end()
          return resp
        } catch (error: any) {
          span.recordException(error as Exception)
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error.message
          })
          span.end()
          throw error
        }
      })
  }
}
