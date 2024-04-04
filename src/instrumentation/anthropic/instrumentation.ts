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

import type Anthropic from '@anthropic-ai/sdk'
import { diag } from '@opentelemetry/api'
import {
  InstrumentationBase,
  InstrumentationNodeModuleDefinition
} from '@opentelemetry/instrumentation'
import { messagesCreate } from '@langtrace-instrumentation/anthropic/patch'

class AnthropicInstrumentation extends InstrumentationBase<typeof Anthropic> {
  constructor () {
    super('@langtrase/node-sdk', '1.0.0')
  }

  public manuallyInstrument (anthropic: typeof Anthropic, version: string): void {
    this._diag.debug('Manually instrumenting anthropic')
    this._patch(anthropic, version)
  }

  init (): Array<InstrumentationNodeModuleDefinition<typeof Anthropic>> {
    const module = new InstrumentationNodeModuleDefinition<typeof Anthropic>(
      '@anthropic-ai/sdk',
      ['>=0.16.0'],
      (moduleExports, moduleVersion) => {
        diag.debug(`Patching Anthropic SDK version ${moduleVersion}`)
        this._patch(moduleExports, moduleVersion as string)
        return moduleExports
      },
      (moduleExports, moduleVersion) => {
        diag.debug(`Unpatching Anthropic SDK version ${moduleVersion}`)
        if (moduleExports !== undefined) {
          this._unpatch(moduleExports)
        }
      }
    )
    return [module]
  }

  private _patch (anthropic: typeof Anthropic, version: string): void {
    this._wrap(
      anthropic.Messages.prototype,
      'create',
      (originalMethod: (...args: any[]) => any) =>
        messagesCreate(originalMethod, this.tracer, version)
    )
  }

  private _unpatch (anthropic: typeof Anthropic): void {
    this._unwrap(anthropic.Anthropic.Messages.prototype, 'create')
  }
}

export const anthropicInstrumentation = new AnthropicInstrumentation()
