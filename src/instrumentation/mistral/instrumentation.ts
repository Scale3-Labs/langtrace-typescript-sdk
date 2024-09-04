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
import {
  InstrumentationBase,
  InstrumentationNodeModuleDefinition,
  isWrapped
} from '@opentelemetry/instrumentation'
import { chatComplete, embeddingsCreate } from '@langtrace-instrumentation/mistral/patch'
// eslint-disable-next-line no-restricted-imports
import { version, name } from '../../../package.json'
class MistralInstrumentation extends InstrumentationBase<any> {
  constructor () {
    super(name, version)
  }

  public manualPatch (mistral: any): void {
    diag.debug('Manually patching mistral')
    this._patch(mistral)
  }

  init (): Array<InstrumentationNodeModuleDefinition<any>> {
    const module = new InstrumentationNodeModuleDefinition<any>(
      '@mistralai/mistralai',
      ['>=1.0.4'],
      (moduleExports, moduleVersion) => {
        diag.debug(`Patching MistralAI SDK version ${moduleVersion}`)
        this._patch(moduleExports, moduleVersion as string)
        return moduleExports
      },
      (moduleExports, moduleVersion) => {
        diag.debug(`Unpatching MistralAI SDK version ${moduleVersion}`)
        if (moduleExports !== undefined) {
          this._unpatch(moduleExports)
        }
      }
    )

    return [module]
  }

  private _patch (mistral: any, moduleVersion?: string): void {
    const wrapped = isWrapped(mistral.Mistral.prototype.chat) ||
      isWrapped(mistral.Mistral.prototype.embeddings)
    if (wrapped) {
      this._unpatch(mistral)
    }
    this._wrap(
      mistral.Mistral.prototype.chat,
      'complete',
      (originalMethod: (...args: any[]) => any) => {
        return chatComplete(originalMethod, this.tracer, this.instrumentationVersion, moduleVersion)
      }
    )

    this._wrap(
      mistral.Mistral.prototype.embeddings,
      'create',
      (originalMethod: (...args: any[]) => any) =>
        embeddingsCreate(originalMethod, this.tracer, this.instrumentationVersion, moduleVersion)
    )
  }

  private _unpatch (openai: any): void {
    this._unwrap(openai.OpenAI.Chat.Completions.prototype, 'create')
    this._unwrap(openai.OpenAI.Images.prototype, 'generate')
    this._unwrap(openai.OpenAI.Images.prototype, 'edit')
    this._unwrap(openai.OpenAI.Embeddings.prototype, 'create')
  }
}

export const mistralInstrumentation = new MistralInstrumentation()
