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
import { ChatFn, ChatStreamFn, ChatV2Fn, ChatV2StreamFn, EmbedFn, EmbedJobsCreateFn, RerankFn } from '@langtrace-instrumentation/cohere/types'
import { chatPatch, chatPatchV2, chatStreamPatch, chatStreamPatchV2, embedJobsCreatePatch, embedPatch, rerankPatch } from '@langtrace-instrumentation/cohere/patch'

class CohereInstrumentation extends InstrumentationBase<any> {
  constructor () {
    super(name, version)
  }

  public manualPatch (cohere: any): void {
    diag.debug('Manually instrumenting cohere')
    this._patch(cohere)
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
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const that = this
    if (isWrapped(cohere.CohereClient.prototype)) {
      this._unpatch(cohere)
    }
    this._wrap(
      cohere.CohereClient.prototype,
      cohere.CohereClient.prototype.chat.name,
      (original: ChatFn) => chatPatch(original, this.tracer, this.instrumentationVersion, name, moduleVersion)
    )
    this._wrap(
      cohere,
      'CohereClientV2',
      (OriginalClient: typeof cohere.CohereClientV2) => {
        return function (this: any, ...args: any[]) {
          const instance: any = new OriginalClient(...args)
          const originalChat: ChatV2Fn = instance.chat
          instance.chat = chatPatchV2(originalChat, that.tracer, that.instrumentationVersion, name, moduleVersion)
          return instance
        }
      }
    )
    this._wrap(
      cohere,
      'CohereClientV2',
      (OriginalClient: typeof cohere.CohereClientV2) => {
        return function (this: any, ...args: any[]) {
          const instance: any = new OriginalClient(...args)
          const originalChat: ChatV2StreamFn = instance.chatStream
          instance.chatStream = chatStreamPatchV2(originalChat, that.tracer, that.instrumentationVersion, name, moduleVersion)
          return instance
        }
      }
    )
    this._wrap(cohere.CohereClient.prototype,
      cohere.CohereClient.prototype.chatStream.name,
      (original: ChatStreamFn) => chatStreamPatch(original, this.tracer, this.instrumentationVersion, name, moduleVersion))

    this._wrap(cohere.CohereClient.prototype,
      cohere.CohereClient.prototype.embed.name,
      (original: EmbedFn) => embedPatch(original, this.tracer, this.instrumentationVersion, name, moduleVersion))

    this._wrap(
      cohere,
      'CohereClientV2',
      (OriginalClient: typeof cohere.CohereClientV2) => {
        return function (this: any, ...args: any[]) {
          const instance: any = new OriginalClient(...args)
          const originalChat: EmbedFn = instance.embed
          instance.embed = embedPatch(originalChat, that.tracer, that.instrumentationVersion, name, moduleVersion, true)
          return instance
        }
      }
    )

    this._wrap(cohere.CohereClient.prototype,
      cohere.CohereClient.prototype.rerank.name,
      (original: RerankFn) => rerankPatch(original, this.tracer, this.instrumentationVersion, name, moduleVersion))

    this._wrap(
      cohere,
      'CohereClientV2',
      (OriginalClient: typeof cohere.CohereClientV2) => {
        return function (this: any, ...args: any[]) {
          const instance: any = new OriginalClient(...args)
          const originalChat: RerankFn = instance.rerank
          instance.rerank = rerankPatch(originalChat, that.tracer, that.instrumentationVersion, name, moduleVersion, true)
          return instance
        }
      }
    )

    this._wrap(cohere.CohereClient.prototype.embedJobs,
      'create',
      (original: EmbedJobsCreateFn) => embedJobsCreatePatch(original, this.tracer, this.instrumentationVersion, name, moduleVersion))
  }

  private _unpatch (cohere: any): void {
    this._unwrap(cohere.CohereClient.prototype, 'chat')
    this._unwrap(cohere.CohereClient.prototype, 'chatStream')
    this._unwrap(cohere.CohereClient.prototype, 'embed')
    this._unwrap(cohere.CohereClient.prototype, 'rerank')
    this._unwrap(cohere.CohereClient.prototype.embedJobs, 'create')
  }
}

export const cohereInstrumentation = new CohereInstrumentation()
