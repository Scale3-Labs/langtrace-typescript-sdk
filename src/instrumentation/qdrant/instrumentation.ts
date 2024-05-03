import { InstrumentationBase, InstrumentationModuleDefinition, InstrumentationNodeModuleDefinition, isWrapped } from '@opentelemetry/instrumentation'
// eslint-disable-next-line no-restricted-imports
import { version, name } from '../../../package.json'
import { diag } from '@opentelemetry/api'
import { APIS } from '@langtrace-constants/instrumentation/qdrant'
import { genericCollectionPatch } from '@langtrace-instrumentation/qdrant/patch'

class QdrantInstrumentation extends InstrumentationBase<any> {
  constructor () {
    super(name, version)
  }

  public manualPatch (qdrant: any): void {
    diag.debug('Manually instrumenting Qdrant')
    this._patch(qdrant)
  }

  init (): Array<InstrumentationModuleDefinition<any>> {
    const module = new InstrumentationNodeModuleDefinition<any>(
      '@qdrant/js-client-rest',
      ['>=1.9.0'],
      (moduleExports, moduleVersion) => {
        diag.debug(`Patching Qdrant SDK version ${moduleVersion}`)
        this._patch(moduleExports, moduleVersion as string)
        return moduleExports
      },
      (moduleExports, moduleVersion) => {
        diag.debug(`Unpatching Qdrant SDK version ${moduleVersion}`)
        if (moduleExports !== undefined) {
          this._unpatch(moduleExports)
        }
      }
    )

    return [module]
  }

  private _patch (qdrant: any, moduleVersion?: string): void {
    if (isWrapped(qdrant.QdrantClient.prototype)) {
      Object.keys(APIS).forEach((api) => {
        this._unwrap(qdrant.QdrantClient.prototype, APIS[api].OPERATION)
      })
    }
    Object.keys(APIS).forEach((api) => {
      this._wrap(
        qdrant.QdrantClient.prototype,
        APIS[api].OPERATION,
        (originalMethod: (...args: any[]) => any) =>
          genericCollectionPatch(originalMethod, api, this.tracer, this.instrumentationVersion, name, moduleVersion)
      )
    })
  }

  private _unpatch (qdrant: any): void {
    Object.keys(APIS).forEach((api) => {
      this._unwrap(qdrant.QdrantClient.prototype, APIS[api].OPERATION)
    })
  }
}

export const qdrantInstrumentation = new QdrantInstrumentation()
