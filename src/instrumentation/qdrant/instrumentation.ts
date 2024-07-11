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

import { InstrumentationBase, InstrumentationModuleDefinition, InstrumentationNodeModuleDefinition, isWrapped } from '@opentelemetry/instrumentation'
// eslint-disable-next-line no-restricted-imports
import { version, name } from '../../../package.json'
import { diag } from '@opentelemetry/api'
import { genericCollectionPatch } from '@langtrace-instrumentation/qdrant/patch'
import { APIS } from '@langtrase/trace-attributes'

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
        this._unwrap(qdrant.QdrantClient.prototype, APIS.qdrant[api as keyof typeof APIS.qdrant].OPERATION as string)
      })
    }
    Object.keys(APIS).forEach((api) => {
      this._wrap(
        qdrant.QdrantClient.prototype,
        APIS.qdrant[api as keyof typeof APIS.qdrant].OPERATION,
        (originalMethod: (...args: any[]) => any) =>
          genericCollectionPatch(originalMethod, api, this.tracer, this.instrumentationVersion, name, moduleVersion)
      )
    })
  }

  private _unpatch (qdrant: any): void {
    Object.keys(APIS).forEach((api) => {
      this._unwrap(qdrant.QdrantClient.prototype, APIS.qdrant[api as keyof typeof APIS.qdrant].OPERATION as string)
    })
  }
}

export const qdrantInstrumentation = new QdrantInstrumentation()
