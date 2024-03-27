
import { APIS } from '@langtrace-constants/instrumentation/chroma'
import { diag } from '@opentelemetry/api'
import {
  InstrumentationBase, InstrumentationModuleDefinition, InstrumentationNodeModuleDefinition, isWrapped
} from '@opentelemetry/instrumentation'
import { Collection } from 'chromadb'
import { collectionPatch } from '@langtrace-instrumentation/chroma/patch'

class ChromaInstrumentation extends InstrumentationBase<any> {
  constructor () {
    super('@langtrase/node-sdk', '1.0.0')
  }

  init (): Array<InstrumentationModuleDefinition<typeof Collection>> {
    const module = new InstrumentationNodeModuleDefinition<typeof Collection>(
      'chromadb',
      ['>=1.8.1'],
      (moduleExports, moduleVersion) => {
        diag.debug(`Patching ChromaDB SDK version ${moduleVersion}`)
        this._patch(moduleExports, moduleVersion as string)
        return moduleExports
      },
      (moduleExports, moduleVersion) => {
        diag.debug(`Unpatching ChromaDB SDK version ${moduleVersion}`)
        if (moduleExports !== undefined) {
          this._unpatch(moduleExports)
        }
      }
    )

    return [module]
  }

  private _patch (chromadb: any, version: string): void {
    if (isWrapped(chromadb.Collection.prototype)) {
      Object.keys(APIS).forEach((api) => {
        this._unwrap(chromadb.Collection.prototype, APIS[api].OPERATION)
      })
    }

    Object.keys(APIS).forEach((api) => {
      this._wrap(
        chromadb.Collection.prototype,
        APIS[api].OPERATION,
        (originalMethod: (...args: any[]) => any) =>
          collectionPatch(originalMethod, api, this.tracer, version)
      )
    })
  }

  private _unpatch (chromadb: any): void {
    Object.keys(APIS).forEach((api) => {
      this._unwrap(chromadb.Collection.prototype, APIS[api].OPERATION)
    })
  }
}

export const chromaInstrumentation = new ChromaInstrumentation()
