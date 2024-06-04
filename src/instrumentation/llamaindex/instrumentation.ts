/* eslint-disable @typescript-eslint/no-unused-vars */
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
import { getValueFromPath } from '@langtrace-utils/misc'

class LlamaIndexInstrumentation extends InstrumentationBase<any> {
  private module: Record<string, any> | undefined

  constructor () {
    super(name, version)
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
        this.module = moduleExports
        return moduleExports
      },
      (moduleExports, moduleVersion) => {
        diag.debug(`Unpatching LlamaIndex SDK version ${moduleVersion}`)
        if (moduleExports !== undefined) {
          this.module = moduleExports
          this._unpatch(moduleExports)
        }
      }
    )

    return [module]
  }

  private _patch (llama: any, moduleVersion?: string): void {
    // Note: Instrumenting only the core concepts of LlamaIndex SDK
    // https://github.com/run-llama/LlamaIndexTS?tab=readme-ov-file

    for (const key in llama) {
      const cls = (llama)[key]
      if (cls.prototype !== undefined) {
        if (cls.prototype.query !== undefined) {
          // eslint-disable-next-line no-console
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
                this.instrumentationVersion,
                moduleVersion
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
                this.instrumentationVersion,
                moduleVersion
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
                this.instrumentationVersion,
                moduleVersion
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
                this.instrumentationVersion,
                moduleVersion
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
                this.instrumentationVersion,
                moduleVersion
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
                this.instrumentationVersion,
                moduleVersion
              )
          )
        }
      }
    }
  }

  public disableTracingForMethods (methods: string[]): void {
    // eslint-disable-next-line no-console
    const classPathToMethod: Record<string, string[]> = {}
    for (const method of methods) {
      const [_, className, methodName] = method.split('.')
      if (classPathToMethod[`${className}.prototype`] === undefined) {
        classPathToMethod[`${className}.prototype`] = [methodName]
      } else {
        classPathToMethod[`${className}.prototype`].push(methodName)
      }
    }
    // eslint-disable-next-line no-console
    Object.entries(classPathToMethod).forEach(([key, value]) => {
      const proto = getValueFromPath(this.module ?? {}, key)
      if (proto !== undefined) {
        value.forEach((methodName) => {
          if (proto[methodName] !== undefined) {
            this._unwrap(proto, methodName)
          }
        })
      }
    })
    this._unpatch(this.module)
  }

  private _unpatch (llama: any): void {
    // for (const key in llama) {
    //   const cls = (llama)[key]
    //   if (cls.prototype !== undefined) {
    //     if (cls.prototype.query !== undefined) {
    //       this._unwrap(cls.prototype, 'query')
    //     }
    //     if (cls.prototype.retrieve !== undefined) {
    //       this._unwrap(cls.prototype, 'retrieve')
    //     }
    //     if (cls.prototype.chat !== undefined) {
    //       this._unwrap(cls.prototype, 'chat')
    //     }
    //     if (cls.prototype.call !== undefined) {
    //       this._unwrap(cls.prototype, 'call')
    //     }
    //     if (cls.prototype.extract !== undefined) {
    //       this._unwrap(cls.prototype, 'extract')
    //     }
    //     if (cls.prototype.loadData !== undefined) {
    //       this._unwrap(cls.prototype, 'loadData')
    //     }
    //   }
    // }
  }
}

export const llamaIndexInstrumentation = new LlamaIndexInstrumentation()
