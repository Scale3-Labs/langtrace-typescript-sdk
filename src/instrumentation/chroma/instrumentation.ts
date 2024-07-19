/*
 * Copyright (c) 2024 Scale3 Labs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { diag } from '@opentelemetry/api'
import { InstrumentationBase, InstrumentationModuleDefinition, InstrumentationNodeModuleDefinition, isWrapped } from '@opentelemetry/instrumentation'
import { collectionPatch } from '@langtrace-instrumentation/chroma/patch'
// eslint-disable-next-line no-restricted-imports
import { version, name } from '../../../package.json'
import { APIS } from '@langtrase/trace-attributes'

class ChromaInstrumentation extends InstrumentationBase<any> {
  constructor () {
    super(name, version)
  }

  public manualPatch (chroma: any): void {
    diag.debug('Manually instrumenting ChromaDB')
    this._patch(chroma)
  }

  init (): Array<InstrumentationModuleDefinition<any>> {
    const module = new InstrumentationNodeModuleDefinition<any>(
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

  private _patch (chromadb: any, moduleVersion?: string): void {
    if (isWrapped(chromadb.Collection.prototype)) {
      Object.keys(APIS.chromadb).forEach((api) => {
        this._unwrap(chromadb.Collection.prototype, APIS.chromadb[api as keyof typeof APIS.chromadb].OPERATION as string)
      })
    }

    Object.keys(APIS.chromadb).forEach((api) => {
      this._wrap(
        chromadb.Collection.prototype,
        APIS.chromadb[api as keyof typeof APIS.chromadb].OPERATION,
        (originalMethod: (...args: any[]) => any) =>
          collectionPatch(originalMethod, api, this.tracer, this.instrumentationVersion, moduleVersion)
      )
    })
  }

  private _unpatch (chromadb: any): void {
    Object.keys(APIS.chromadb).forEach((api) => {
      this._unwrap(chromadb.Collection.prototype, APIS.chromadb[api as keyof typeof APIS.chromadb].OPERATION as string)
    })
  }
}

export const chromaInstrumentation = new ChromaInstrumentation()
