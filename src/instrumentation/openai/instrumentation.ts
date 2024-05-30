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
import { chatCompletionCreate, embeddingsCreate, imageEdit, imagesGenerate } from '@langtrace-instrumentation/openai/patch'
// eslint-disable-next-line no-restricted-imports
import { version, name } from '../../../package.json'
class OpenAIInstrumentation extends InstrumentationBase<any> {
  constructor () {
    super(name, version)
  }

  public manualPatch (openai: any): void {
    diag.debug('Manually patching openai')
    this._patch(openai)
  }

  init (): Array<InstrumentationNodeModuleDefinition<any>> {
    const module = new InstrumentationNodeModuleDefinition<any>(
      'openai',
      ['>=4.26.1 <6.0.0'],
      (moduleExports, moduleVersion) => {
        diag.debug(`Patching OpenAI SDK version ${moduleVersion}`)
        this._patch(moduleExports, moduleVersion as string)
        return moduleExports
      },
      (moduleExports, moduleVersion) => {
        diag.debug(`Unpatching OpenAI SDK version ${moduleVersion}`)
        if (moduleExports !== undefined) {
          this._unpatch(moduleExports)
        }
      }
    )

    return [module]
  }

  private _patch (openai: any, moduleVersion?: string): void {
    if (isWrapped(openai.OpenAI.Chat.Completions.prototype)) {
      this._unwrap(openai.OpenAI.Chat.Completions.prototype, 'create')
    }
    if (isWrapped(openai.OpenAI.Images.prototype)) {
      this._unwrap(openai.OpenAI.Images.prototype, 'generate')
      this._unwrap(openai.OpenAI.Images.prototype, 'edit')
    }
    if (isWrapped(openai.OpenAI.Embeddings.prototype)) {
      this._unwrap(openai.OpenAI.Embeddings.prototype, 'create')
    }

    this._wrap(
      openai.OpenAI.Chat.Completions.prototype,
      'create',
      (originalMethod: (...args: any[]) => any) =>
        chatCompletionCreate(originalMethod, this.tracer, this.instrumentationVersion, moduleVersion)
    )

    this._wrap(
      openai.OpenAI.Images.prototype,
      'generate',
      (originalMethod: (...args: any[]) => any) =>
        imagesGenerate(originalMethod, this.tracer, this.instrumentationVersion, moduleVersion)
    )

    this._wrap(
      openai.OpenAI.Embeddings.prototype,
      'create',
      (originalMethod: (...args: any[]) => any) =>
        embeddingsCreate(originalMethod, this.tracer, this.instrumentationVersion, moduleVersion)
    )
    this._wrap(openai.OpenAI.Images.prototype,
      'edit',
      (originalMethod: (...args: any[]) => any) => imageEdit(originalMethod, this.tracer, this.instrumentationVersion, moduleVersion))
  }

  private _unpatch (openai: any): void {
    this._unwrap(openai.OpenAI.Chat.Completions.prototype, 'create')
    this._unwrap(openai.OpenAI.Images.prototype, 'generate')
    this._unwrap(openai.OpenAI.Images.prototype, 'edit')
    this._unwrap(openai.OpenAI.Embeddings.prototype, 'create')
  }
}

export const openAIInstrumentation = new OpenAIInstrumentation()
