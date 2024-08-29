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

import { generateContentPatch } from '@langtrace-instrumentation/vertexai/patch'
import { APIS } from '@langtrase/trace-attributes'
import { diag } from '@opentelemetry/api'
import { InstrumentationBase, InstrumentationNodeModuleDefinition, isWrapped } from '@opentelemetry/instrumentation'
// eslint-disable-next-line no-restricted-imports
import { name, version } from '../../../package.json'

class VertexAIInstrumentation extends InstrumentationBase<any> {
  constructor () {
    super(name, version)
  }

  init (): Array<InstrumentationNodeModuleDefinition<any>> {
    const module = new InstrumentationNodeModuleDefinition<any>(
      '@google-cloud/vertexai',
      ['>=1.5.0'],
      (moduleExports, moduleVersion) => {
        diag.debug(`Patching Vertex AI SDK version ${moduleVersion}`)
        this._patch(moduleExports, moduleVersion as string)
        return moduleExports
      },
      (moduleExports, moduleVersion) => {
        diag.debug(`Unpatching Vertex AI SDK version ${moduleVersion}`)
        if (moduleExports !== undefined) {
          this._unpatch(moduleExports)
        }
      }
    )
    return [module]
  }

  private _patch (vertexai: any, moduleVersion?: string): void {
    if (isWrapped(vertexai.GenerativeModel.prototype)) {
      this._unpatch(vertexai)
    }

    this._wrap(vertexai.GenerativeModel.prototype,
      'generateContent',
      (originalMethod: (...args: any[]) => any) =>
        generateContentPatch(originalMethod, this.tracer, APIS.vertexai.GENERATE_CONTENT.METHOD, this.instrumentationVersion, name, moduleVersion)
    )

    this._wrap(vertexai.GenerativeModel.prototype,
      'generateContentStream',
      (originalMethod: (...args: any[]) => any) =>
        generateContentPatch(originalMethod, this.tracer, APIS.vertexai.GENERATE_CONTENT_STREAM.METHOD, this.instrumentationVersion, name, moduleVersion)
    )

    this._wrap(vertexai.ChatSession.prototype,
      'sendMessage',
      (originalMethod: (...args: any[]) => any) =>
        generateContentPatch(originalMethod, this.tracer, APIS.vertexai.SEND_MESSAGE.METHOD, this.instrumentationVersion, name, moduleVersion)
    )

    this._wrap(vertexai.ChatSession.prototype,
      'sendMessageStream',
      (originalMethod: (...args: any[]) => any) =>
        generateContentPatch(originalMethod, this.tracer, APIS.vertexai.SEND_MESSAGE_STREAM.METHOD, this.instrumentationVersion, name, moduleVersion)
    )
  }

  private _unpatch (vertexai: any): void {
    this._unwrap(vertexai.GoogleGenerativeAI.GenerativeModel, 'generateContent')
    this._unwrap(vertexai.GoogleGenerativeAI.GenerativeModel, 'generateContentStream')
    this._unwrap(vertexai.GoogleGenerativeAI.GenerativeModel, 'sendMessage')
    this._unwrap(vertexai.GoogleGenerativeAI.GenerativeModel, 'sendMessageStream')
  }
}

export const vertexAIInstrumentation = new VertexAIInstrumentation()
