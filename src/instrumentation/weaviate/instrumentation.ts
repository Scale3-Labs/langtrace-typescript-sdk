
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
import { patchBuilderFunctions } from '@langtrace-instrumentation/weaviate/patch'

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

  private _patch (weaviate: any, moduleVersion?: string): void {
    if (isWrapped(weaviate.default)) {
      this._unpatch(weaviate)
    }
    this._wrap(weaviate.default, 'client', (original) => {
      return (params: Record<string, any>) => {
        const clientInstance = original.apply(this, [params])
        patchBuilderFunctions.call(this, {
          clientInstance,
          clientArgs: params,
          tracer: this.tracer,
          moduleVersion: moduleVersion as string,
          sdkName: name,
          sdkVersion: version
        })
        return clientInstance
      }
    })
  }

  private _unpatch (weaviate: any): void {
    this._unwrap(weaviate.default, 'client')
  }
}

export const weaviateInstrumentation = new WeaviateInstrumentation()
