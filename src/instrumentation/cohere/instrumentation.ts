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
import { InstrumentationBase, InstrumentationModuleDefinition, InstrumentationNodeModuleDefinition } from '@opentelemetry/instrumentation'
// eslint-disable-next-line no-restricted-imports
import { version, name } from '../../../package.json'
import { ChatFn } from '@langtrace-instrumentation/cohere/types'
import { chatPatch } from '@langtrace-instrumentation/cohere/patch'

class CohereInstrumentation extends InstrumentationBase<any> {
  constructor () {
    super(name, version)
  }

  public manualPatch (chroma: any): void {
    diag.debug('Manually instrumenting ChromaDB')
    this._patch(chroma)
  }

  init (): Array<InstrumentationModuleDefinition<any>> {
    const module = new InstrumentationNodeModuleDefinition<any>(
      'cohere-ai',
      ['>= 7.2.0'],
      (moduleExports, moduleVersion) => {
        diag.debug(`Patching cohere SDK version ${moduleVersion}`)
        this._patch(moduleExports, moduleVersion as string)
        return moduleExports
      },
      (moduleExports, moduleVersion) => {
        diag.debug(`Unpatching cohere SDK version ${moduleVersion}`)
        if (moduleExports !== undefined) {
          this._unpatch(moduleExports)
        }
      }
    )
    return [module]
  }

  private _patch (cohere: any, moduleVersion?: string): void {
    this._wrap(
      cohere.CohereClient.prototype,
      cohere.CohereClient.prototype.chat.name,
      (original: ChatFn) => chatPatch(original, this.tracer, this.instrumentationVersion, name, moduleVersion)
    )
  }

  private _unpatch (cohere: any): void {
    this._unwrap(cohere.CohereClient.prototype, cohere.CohereClient.prototype.chat.name as string)
  }
}

export const cohereInstrumentation = new CohereInstrumentation()
