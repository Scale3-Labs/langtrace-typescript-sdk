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

import { generateContentPatch } from '@langtrace-instrumentation/gemini/patch'
import { diag } from '@opentelemetry/api'
import { InstrumentationBase, InstrumentationNodeModuleDefinition, isWrapped } from '@opentelemetry/instrumentation'
// eslint-disable-next-line no-restricted-imports
import { name, version } from '../../../package.json'

class GeminiInstrumentation extends InstrumentationBase<any> {
  constructor () {
    super(name, version)
  }

  init (): Array<InstrumentationNodeModuleDefinition<any>> {
    const module = new InstrumentationNodeModuleDefinition<any>(
      '@google/generative-ai',
      ['>=0.1.3'],
      (moduleExports, moduleVersion) => {
        diag.debug(`Patching Gemini SDK version ${moduleVersion}`)
        this._patch(moduleExports, moduleVersion as string)
        return moduleExports
      },
      (moduleExports, moduleVersion) => {
        diag.debug(`Unpatching Gemini SDK version ${moduleVersion}`)
        if (moduleExports !== undefined) {
          this._unpatch(moduleExports)
        }
      }
    )
    return [module]
  }

  private _patch (gemini: any, moduleVersion?: string): void {
    if (isWrapped(gemini.GenerativeModel.prototype)) {
      this._unpatch(gemini)
    }

    this._wrap(gemini.GenerativeModel.prototype,
      'generateContent',
      (originalMethod: (...args: any[]) => any) =>
        generateContentPatch(originalMethod, this.tracer, this.instrumentationVersion, name, moduleVersion)
    )

    this._wrap(gemini.GenerativeModel.prototype,
      'generateContentStream',
      (originalMethod: (...args: any[]) => any) =>
        generateContentPatch(originalMethod, this.tracer, this.instrumentationVersion, name, moduleVersion)
    )
  }

  private _unpatch (gemini: any): void {
    this._unwrap(gemini.GoogleGenerativeAI.GenerativeModel, 'generateContent')
    this._unwrap(gemini.GoogleGenerativeAI.GenerativeModel, 'generateContentStream')
  }
}

export const geminiInstrumentation = new GeminiInstrumentation()
