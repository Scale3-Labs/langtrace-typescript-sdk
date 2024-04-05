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
import * as llamaindex from 'llamaindex'

class LlamaIndexInstrumentation extends InstrumentationBase<any> {
  constructor () {
    super('@langtrase/node-sdk', '1.0.0')
  }

  public manuallyInstrument (llamaIndex: typeof llamaindex, version: string): void {
    diag.debug('Manually instrumenting llamaIndex')
    this._patch(llamaIndex, version)
  }

  init (): Array<InstrumentationModuleDefinition<typeof llamaindex>> {
    const module = new InstrumentationNodeModuleDefinition<any>(
      'llamaindex',
      ['>=0.1.10'],
      (moduleExports, moduleVersion) => {
        diag.debug(`Patching LlamaIndex SDK version ${moduleVersion}`)
        this._patch(moduleExports as typeof llamaindex, moduleVersion as string)
        return moduleExports
      },
      (moduleExports, moduleVersion) => {
        diag.debug(`Unpatching LlamaIndex SDK version ${moduleVersion}`)
        if (moduleExports !== undefined) {
          this._unpatch(moduleExports as typeof llamaindex)
        }
      }
    )

    return [module]
  }

  private _patch (llama: typeof llamaindex, version: string): void {
    // Note: Instrumenting only the core concepts of LlamaIndex SDK
    // https://github.com/run-llama/LlamaIndexTS?tab=readme-ov-file
    for (const key in llama) {
      const cls = (llama as any)[key]
      if (cls.prototype !== undefined) {
        if (cls.prototype.query !== undefined) {
          if (isWrapped(cls.prototype)) {
            this._unwrap(cls.prototype, 'query')
          }
          this._wrap(
            cls.prototype,
            'query',
            (originalMethod: (...args: any[]) => any) =>
              genericPatch(
                originalMethod,
                `llamaindex.${key}.query`,
                'query',
                this.tracer,
                version
              )
          )
        }
        if (cls.prototype.retrieve !== undefined) {
          if (isWrapped(cls.prototype)) {
            this._unwrap(cls.prototype, 'retrieve')
          }
          this._wrap(
            cls.prototype,
            'retrieve',
            (originalMethod: (...args: any[]) => any) =>
              genericPatch(
                originalMethod,
                `llamaindex.${key}.retrieve`,
                'retrieve_data',
                this.tracer,
                version
              )
          )
        }
        if (cls.prototype.chat !== undefined) {
          if (isWrapped(cls.prototype)) {
            this._unwrap(cls.prototype, 'chat')
          }
          this._wrap(
            cls.prototype,
            'chat',
            (originalMethod: (...args: any[]) => any) =>
              genericPatch(
                originalMethod,
                `llamaindex.${key}.chat`,
                'chat',
                this.tracer,
                version
              )
          )
        }
        if (cls.prototype.call !== undefined) {
          if (isWrapped(cls.prototype)) {
            this._unwrap(cls.prototype, 'call')
          }
          this._wrap(
            cls.prototype,
            'call',
            (originalMethod: (...args: any[]) => any) =>
              genericPatch(
                originalMethod,
                `llamaindex.${key}.call`,
                'prompt',
                this.tracer,
                version
              )
          )
        }
        if (cls.prototype.extract !== undefined) {
          if (isWrapped(cls.prototype)) {
            this._unwrap(cls.prototype, 'extract')
          }
          this._wrap(
            cls.prototype,
            'extract',
            (originalMethod: (...args: any[]) => any) =>
              genericPatch(
                originalMethod,
                `llamaindex.${key}.extract`,
                'extract_data',
                this.tracer,
                version
              )
          )
        }
        if (cls.prototype.loadData !== undefined) {
          if (isWrapped(cls.prototype)) {
            this._unwrap(cls.prototype, 'loadData')
          }
          this._wrap(
            cls.prototype,
            'loadData',
            (originalMethod: (...args: any[]) => any) =>
              genericPatch(
                originalMethod,
                `llamaindex.${key}.loadData`,
                'load_data',
                this.tracer,
                version
              )
          )
        }
      }
    }
  }

  private _unpatch (llama: typeof llamaindex): void {
    for (const key in llama) {
      const cls = (llama as any)[key]
      if (cls.prototype !== undefined) {
        if (cls.prototype.query !== undefined) {
          if (isWrapped(cls.prototype)) {
            this._unwrap(cls.prototype, 'query')
          }
        }
        if (cls.prototype.retrieve !== undefined) {
          if (isWrapped(cls.prototype)) {
            this._unwrap(cls.prototype, 'retrieve')
          }
        }
        if (cls.prototype.chat !== undefined) {
          if (isWrapped(cls.prototype)) {
            this._unwrap(cls.prototype, 'chat')
          }
        }
        if (cls.prototype.call !== undefined) {
          if (isWrapped(cls.prototype)) {
            this._unwrap(cls.prototype, 'call')
          }
        }
        if (cls.prototype.extract !== undefined) {
          if (isWrapped(cls.prototype)) {
            this._unwrap(cls.prototype, 'extract')
          }
        }
        if (cls.prototype.loadData !== undefined) {
          if (isWrapped(cls.prototype)) {
            this._unwrap(cls.prototype, 'loadData')
          }
        }
      }
    }
  }
}

export const llamaIndexInstrumentation = new LlamaIndexInstrumentation()
