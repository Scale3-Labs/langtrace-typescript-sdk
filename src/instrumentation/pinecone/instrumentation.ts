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

import { APIS } from '@langtrace-constants/instrumentation/chroma'
import { diag } from '@opentelemetry/api'
import { InstrumentationBase, InstrumentationModuleDefinition, InstrumentationNodeModuleDefinition, isWrapped } from '@opentelemetry/instrumentation'
import { Pinecone } from '@pinecone-database/pinecone'
import { genericPatch } from '@langtrace-instrumentation/pinecone/patch'

class PineconeInstrumentation extends InstrumentationBase<any> {
  constructor () {
    super('@langtrase/node-sdk', '1.0.0')
  }

  public manuallyInstrument (pinecone: typeof Pinecone, version: string): void {
    diag.debug('Manually instrumenting pinecone')
    this._patch(pinecone, version)
  }

  init (): Array<InstrumentationModuleDefinition<typeof Pinecone>> {
    const module = new InstrumentationNodeModuleDefinition<typeof Pinecone>(
      '@pinecone-database/pinecone',
      ['>=2.0.0'],
      (moduleExports, moduleVersion) => {
        diag.debug(`Patching Pinecone SDK version ${moduleVersion}`)
        this._patch(moduleExports, moduleVersion as string)
        return moduleExports
      },
      (moduleExports, moduleVersion) => {
        diag.debug(`Unpatching Pinecone SDK version ${moduleVersion}`)
        if (moduleExports !== undefined) {
          this._unpatch(moduleExports)
        }
      }
    )

    return [module]
  }

  private _patch (pinecone: any, version: string): void {
    if (isWrapped(pinecone.Index.prototype)) {
      Object.keys(APIS).forEach((api) => {
        this._unwrap(pinecone.Index.prototype, APIS[api].OPERATION)
      })
    }

    Object.keys(APIS).forEach((api) => {
      this._wrap(
        pinecone.Index.prototype,
        APIS[api].OPERATION,
        (originalMethod: (...args: any[]) => any) =>
          genericPatch(originalMethod, api, this.tracer, version)
      )
    })
  }

  private _unpatch (pinecone: any): void {
    Object.keys(APIS).forEach((api) => {
      this._unwrap(pinecone.Index.prototype, APIS[api].OPERATION)
    })
  }
}

export const pineconeInstrumentation = new PineconeInstrumentation()
