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
// eslint-disable-next-line no-restricted-imports
import { version, name } from '../../../package.json'
import { chatPatch } from '@langtrace-instrumentation/groq/patch'
import { ChatFn, ChatStreamFn } from '@langtrace-instrumentation/groq/types'

class GroqInstrumentation extends InstrumentationBase<any> {
  constructor () {
    super(name, version)
  }

  public manualPatch (groq: any): void {
    diag.debug('Manually instrumenting groq')
    this._patch(groq)
  }

  init (): Array<InstrumentationModuleDefinition<any>> {
    const module = new InstrumentationNodeModuleDefinition<any>(
      'groq-sdk',
      ['>= 0.3.3'],
      (moduleExports, moduleVersion) => {
        diag.debug(`Patching groq SDK version ${moduleVersion}`)
        this._patch(moduleExports, moduleVersion as string)
        return moduleExports
      },
      (moduleExports, moduleVersion) => {
        diag.debug(`Unpatching groq SDK version ${moduleVersion}`)
        if (moduleExports !== undefined) {
          this._unpatch(moduleExports)
        }
      }
    )
    return [module]
  }

  private _patch (groq: any, moduleVersion?: string): void {
    if (isWrapped(groq.Groq.prototype)) {
      this._unpatch(groq)
    }
    this._wrap(
      groq.Groq.Chat.Completions.prototype,
      groq.Groq.Chat.Completions.prototype.create.name,
      (original: ChatFn | ChatStreamFn) => chatPatch(original, this.tracer, this.instrumentationVersion, name, moduleVersion)
    )
  }

  private _unpatch (groq: any): void {
    this._unwrap(groq.Groq.Chat.Completions.prototype, 'create')
  }
}

export const groqInstrumentation = new GroqInstrumentation()
