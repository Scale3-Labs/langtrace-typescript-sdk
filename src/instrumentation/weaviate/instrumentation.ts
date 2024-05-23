/* eslint-disable no-console */
import { InstrumentationBase, InstrumentationModuleDefinition, InstrumentationNodeModuleDefinition } from '@opentelemetry/instrumentation'
// eslint-disable-next-line no-restricted-imports
import { version, name } from '../../../package.json'
import { Exception, SpanKind, SpanStatusCode, context, diag, trace } from '@opentelemetry/api'
import { LANGTRACE_ADDITIONAL_SPAN_ATTRIBUTES_KEY } from '@langtrace-constants/common'
import { SERVICE_PROVIDERS } from '@langtrace-constants/instrumentation/common'
import { DatabaseSpanAttributes } from '@langtrase/trace-attributes'

class WeaviateInstrumentation extends InstrumentationBase<any> {
  constructor () {
    super(name, version)
  }

  public manualPatch (weaviate: any): void {
    diag.debug('Manually instrumenting weaviate')
    this._patch(weaviate)
  }

  init (): Array<InstrumentationModuleDefinition<any>> {
    const module = new InstrumentationNodeModuleDefinition<any>(
      'weaviate-ts-client',
      ['>=2.2.0'],
      (moduleExports, moduleVersion) => {
        diag.debug(`Patching weaviate SDK version ${moduleVersion}`)
        this._patch(moduleExports, moduleVersion as string)
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return moduleExports
      },
      (moduleExports, moduleVersion) => {
        diag.debug(`Unpatching weaviate SDK version ${moduleVersion}`)
        if (moduleExports !== undefined) {
          this._unpatch(moduleExports)
        }
      }
    )

    return [module]
  }

  private tempPatchCreate (weaviate: any, moduleVersion?: string): void {
    this._wrap(weaviate.default, 'client', (original) => {
      return (...args: any[]) => {
        const clientInstance = original.apply(this, args)
        // Patch the specific method you want to trace
        // Patch the classGetter method within clientInstance.schema
        clientInstance.schema.classCreator = this._wrap(clientInstance.schema, 'classCreator', (original) => {
          return (...args: any[]) => {
            // eslint-disable-next-line no-console
            const instance = original.apply(this, args)
            this._wrap(instance, 'do', (original) => {
              return async (...args: any[]) => {
                const customAttributes = context.active().getValue(LANGTRACE_ADDITIONAL_SPAN_ATTRIBUTES_KEY) ?? {}
                const attributes: DatabaseSpanAttributes = {
                  'langtrace.sdk.name': name,
                  'langtrace.service.name': SERVICE_PROVIDERS.WEAVIATE,
                  'langtrace.service.type': 'vectordb',
                  'langtrace.service.version': moduleVersion,
                  'langtrace.version': version,
                  'db.system': 'weaviate',
                  'db.operation': 'create',
                  'db.collection.name': instance.class.class,
                  ...customAttributes
                }

                const span = this.tracer.startSpan('schema.classCreator.create', { kind: SpanKind.CLIENT, attributes })
                // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                return await context.with(
                  trace.setSpan(context.active(), trace.getSpan(context.active()) ?? span),
                  async () => {
                    try {
                      const resp = await original.apply(this, args)
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
            })
            return instance
          }
        })
        return clientInstance
      }
    })
  }

  private _patch (weaviate: any, moduleVersion?: string): void {
    // this.tempPatchCreate(weaviate, moduleVersion)
    this._wrap(weaviate.default, 'client', (original) => {
      return (...args: any[]) => {
        const clientInstance = original.apply(this, args)
        // Patch the specific method you want to trace
        // Patch the classGetter method within clientInstance.schema
        clientInstance.graphql.get = this._wrap(clientInstance.graphql, 'get', (original) => {
          return (...args: any[]) => {
            // eslint-disable-next-line no-console
            const instance = original.apply(this, args)
            this._wrap(instance, 'do', (original) => {
              return async (...args: any[]) => {
                console.log(instance)
                const customAttributes = context.active().getValue(LANGTRACE_ADDITIONAL_SPAN_ATTRIBUTES_KEY) ?? {}
                const attributes: DatabaseSpanAttributes = {
                  'langtrace.sdk.name': name,
                  'langtrace.service.name': SERVICE_PROVIDERS.WEAVIATE,
                  'langtrace.service.type': 'vectordb',
                  'langtrace.service.version': moduleVersion,
                  'langtrace.version': version,
                  'db.system': 'weaviate',
                  'db.operation': 'create',
                  'db.collection.name': instance.className,
                  ...customAttributes
                }

                const span = this.tracer.startSpan('schema.classCreator.create', { kind: SpanKind.CLIENT, attributes })
                // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                return await context.with(
                  trace.setSpan(context.active(), trace.getSpan(context.active()) ?? span),
                  async () => {
                    try {
                      const resp = await original.apply(this, args)
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
            })
            return instance
          }
        })
        return clientInstance
      }
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private _unpatch (weaviate: any): void {

  }
}

export const weaviateInstrumentation = new WeaviateInstrumentation()
