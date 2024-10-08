import { DatabaseSpanAttributes, Vendors, Event, APIS } from '@langtrase/trace-attributes'
import { context, Exception, SpanKind, SpanStatusCode, trace, Tracer } from '@opentelemetry/api'
import { addSpanEvent, stringify } from '@langtrace-utils/misc'
import { LANGTRACE_ADDITIONAL_SPAN_ATTRIBUTES_KEY } from '@langtrace-constants/common'
import { LangtraceSdkError } from 'errors/sdk_error'

export const patchPgQuery = (original: any, tracer: Tracer, sdkName: string, langtraceVersion: string, version?: string): any => {
  return async function (this: any, queryOrTextConfig: any, values: any, callback: any) {
    const customAttributes = context.active().getValue(LANGTRACE_ADDITIONAL_SPAN_ATTRIBUTES_KEY) ?? {}
    const attributes: DatabaseSpanAttributes = {
      'langtrace.sdk.name': sdkName,
      'langtrace.service.name': Vendors.PG,
      'langtrace.service.type': 'vectordb',
      'langtrace.service.version': version,
      'langtrace.version': langtraceVersion,
      'db.system': 'postgres',
      'db.collection.name': this.connectionParameters.database,
      'server.address': this.connectionParameters.host,
      'db.query': stringify({ queryOrTextConfig, values }),
      ...customAttributes
    }
    const spanName = customAttributes['langtrace.span.name' as keyof typeof customAttributes] ?? APIS.pg.QUERY.METHOD
    const span = tracer.startSpan(spanName, { kind: SpanKind.CLIENT, attributes })
    return await context.with(
      trace.setSpan(context.active(), trace.getSpan(context.active()) ?? span), async () => {
        try {
          const resp = await original.apply(this, [queryOrTextConfig, values, callback])
          attributes['db.operation'] = resp.command
          attributes['db.top_k'] = resp.rowCount
          span.setAttributes(attributes)
          if (resp !== undefined) addSpanEvent(span, Event.RESPONSE, { 'db.response': stringify(resp) })
          span.setStatus({ code: SpanStatusCode.OK })
          span.end()
          return resp
        } catch (error: any) {
          span.recordException(error as Exception)
          span.setStatus({ code: SpanStatusCode.ERROR })
          span.end()
          throw new LangtraceSdkError(error.message as string, error.stack as string)
        }
      })
  }
}
