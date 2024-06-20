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
import { chatPatch, embeddingsPatch, generatePatch } from '@langtrace-instrumentation/ollama/patch'
import { ChatFn, ChatStreamFn, EmbeddingsFn, GenerateFn, GenerateStreamFn } from '@langtrace-instrumentation/ollama/types'

class OllamaInstrumentation extends InstrumentationBase<any> {
  constructor () {
    super(name, version)
  }

  public manualPatch (ollama: any): void {
    diag.debug('Manually instrumenting ollama')
    this._patch(ollama)
  }

  init (): Array<InstrumentationModuleDefinition<any>> {
    const module = new InstrumentationNodeModuleDefinition<any>(
      'ollama',
      ['>= 0.5.2'],
      (moduleExports, moduleVersion) => {
        diag.debug(`Patching ollama SDK version ${moduleVersion}`)
        this._patch(moduleExports, moduleVersion as string)
        return moduleExports
      },
      (moduleExports, moduleVersion) => {
        diag.debug(`Unpatching ollama SDK version ${moduleVersion}`)
        if (moduleExports !== undefined) {
          this._unpatch(moduleExports)
        }
      }
    )
    return [module]
  }

  private _patch (ollama: any, moduleVersion?: string): void {
    if (isWrapped(ollama.Ollama.prototype)) {
      this._unpatch(ollama)
    }
    this._wrap(
      ollama.Ollama.prototype,
      ollama.Ollama.prototype.chat.name,
      (original: ChatStreamFn | ChatFn) => chatPatch(original, this.tracer, this.instrumentationVersion, name, moduleVersion)
    )
    this._wrap(
      ollama.Ollama.prototype,
      ollama.Ollama.prototype.generate.name,
      (original: GenerateFn | GenerateStreamFn) => generatePatch(original, this.tracer, this.instrumentationVersion, name, moduleVersion)
    )
    this._wrap(
      ollama.Ollama.prototype,
      ollama.Ollama.prototype.embeddings.name,
      (original: EmbeddingsFn) => embeddingsPatch(original, this.tracer, this.instrumentationVersion, name, moduleVersion)
    )
  }

  private _unpatch (ollama: any): void {
    this._unwrap(ollama.Ollama.prototype, 'chat')
    this._unwrap(ollama.Ollama.prototype, 'generate')
  }
}

export const ollamaInstrumentation = new OllamaInstrumentation()
