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

import { genericPatch } from '@langtrace-instrumentation/llamaindex/patch'
import { diag } from '@opentelemetry/api'
import {
  InstrumentationBase,
  InstrumentationModuleDefinition,
  InstrumentationNodeModuleDefinition,
  isWrapped
} from '@opentelemetry/instrumentation'
// eslint-disable-next-line no-restricted-imports
import { version, name } from '../../../package.json'

class LlamaIndexInstrumentation extends InstrumentationBase<any> {
  private readonly methodsToPatch: string[]
  constructor () {
    super(name, version)
    this.methodsToPatch =
    [
      'query', 'retrieve', 'chat',
      'call', 'extract', 'loadData',
      'run', 'evaluateResponse',
      'evaluate', '_getPrompts', '_updatePrompts',
      'transform', 'fromDocuments',
      'getNodesFromDocuments',
      'synthesize', 'validatePrompts',
      'splitText'
    ]
  }

  public manualPatch (llamaIndex: any): void {
    diag.debug('Manually patching llamaIndex')
    this._patch(llamaIndex)
  }

  init (): Array<InstrumentationModuleDefinition<any>> {
    const module = new InstrumentationNodeModuleDefinition<any>(
      'llamaindex',
      ['>=0.1.10'],
      (moduleExports, moduleVersion) => {
        diag.debug(`Patching LlamaIndex SDK version ${moduleVersion}`)
        this._patch(moduleExports, moduleVersion as string)
        return moduleExports
      },
      (moduleExports, moduleVersion) => {
        diag.debug(`Unpatching LlamaIndex SDK version ${moduleVersion}`)
        if (moduleExports !== undefined) {
          this._unpatch(moduleExports)
        }
      }
    )

    return [module]
  }

  private _patch (llama: any, moduleVersion?: string): void {
    // https://github.com/run-llama/LlamaIndexTS?tab=readme-ov-file
    for (const key in llama) {
      const cls = (llama)[key]
      if (cls.prototype !== undefined) {
        for (const method of this.methodsToPatch) {
          if (cls.prototype[method] !== undefined) {
            if (isWrapped(cls.prototype)) {
              this._unwrap(cls.prototype, method)
            }
            this._wrap(
              cls.prototype,
              method,
              (originalMethod: (...args: any[]) => any) =>
                genericPatch(
                  originalMethod,
                  `llamaindex.${key}.${method}`,
                  method,
                  this.tracer,
                  this.instrumentationVersion,
                  moduleVersion
                )
            )
          }
        }
      }
    }
  }

  private _unpatch (llama: any): void {
    for (const key in llama) {
      const cls = (llama)[key]
      if (cls.prototype !== undefined) {
        for (const method of this.methodsToPatch) {
          if (isWrapped(cls.prototype)) {
            this._unwrap(cls.prototype, method)
          }
        }
      }
    }
  }
}

export const llamaIndexInstrumentation = new LlamaIndexInstrumentation()
