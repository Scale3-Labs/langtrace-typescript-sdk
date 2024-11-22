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
import { collectionPatch } from '@langtrace-instrumentation/chroma/patch'
// eslint-disable-next-line no-restricted-imports
import { version, name } from '../../../package.json'
import { APIS } from '@langtrase/trace-attributes'

class ChromaInstrumentation extends InstrumentationBase<any> {
  private originalGetOrCreateCollection: any
  private originalCreateCollection: any
  private originalGetCollection: any

  constructor () {
    super(name, version)
  }

  public manualPatch (chroma: any): void {
    diag.debug('Manually instrumenting ChromaDB')
    this._patch(chroma)
  }

  init (): Array<InstrumentationModuleDefinition<any>> {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this
    const module = new InstrumentationNodeModuleDefinition<any>(
      'chromadb',
      ['>=1.8.1'],
      (moduleExports, moduleVersion) => {
        diag.debug(`Patching ChromaDB SDK version ${moduleVersion}`)

        const ChromaClient = moduleExports.ChromaClient

        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
        if (!ChromaClient?.prototype) {
          diag.error('ChromaClient not found in exports')
          return moduleExports
        }

        // Store original methods
        this.originalGetOrCreateCollection = ChromaClient.prototype.getOrCreateCollection
        this.originalCreateCollection = ChromaClient.prototype.createCollection
        this.originalGetCollection = ChromaClient.prototype.getCollection

        // Patch getOrCreateCollection
        ChromaClient.prototype.getOrCreateCollection = async function (...args: any[]) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          const collection = await self.originalGetOrCreateCollection.apply(this, args)
          // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
          if (collection) {
            self._patchCollectionMethods(collection, moduleVersion)
          }
          return collection
        }

        // Patch createCollection
        ChromaClient.prototype.createCollection = async function (...args: any[]) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          const collection = await self.originalCreateCollection.apply(this, args)
          // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
          if (collection) {
            self._patchCollectionMethods(collection, moduleVersion)
          }
          return collection
        }

        // Patch getCollection
        ChromaClient.prototype.getCollection = async function (...args: any[]) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          const collection = await self.originalGetCollection.apply(this, args)
          // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
          if (collection) {
            self._patchCollectionMethods(collection, moduleVersion)
          }
          return collection
        }

        return moduleExports
      },
      (moduleExports, moduleVersion) => {
        diag.debug(`Unpatching ChromaDB SDK version ${moduleVersion}`)
        const ChromaClient = moduleExports.ChromaClient
        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
        if (ChromaClient?.prototype) {
          ChromaClient.prototype.getOrCreateCollection = this.originalGetOrCreateCollection
          ChromaClient.prototype.createCollection = this.originalCreateCollection
          ChromaClient.prototype.getCollection = this.originalGetCollection
        }
      }
    )

    return [module]
  }

  private _patchCollectionMethods (collection: any, moduleVersion?: string): void {
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (!collection) return

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this
    Object.keys(APIS.chromadb).forEach((api) => {
      const operation = APIS.chromadb[api as keyof typeof APIS.chromadb].OPERATION as string
      const original = collection[operation]

      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      if (original && !isWrapped(original)) {
        // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
        const wrapped = (...args: any[]) => {
          const patchedMethod = collectionPatch(
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
            function (...methodArgs: any[]) {
              return original.apply(collection, methodArgs)
            },
            api,
            self.tracer,
            self.instrumentationVersion,
            moduleVersion
          )
          return patchedMethod.apply(this, args)
        }

        Object.assign(wrapped, original)
        wrapped.__original = original
        wrapped.__wrapped = true

        collection[operation] = wrapped
      }
    })
  }

  private _patch (chromadb: any, moduleVersion?: string): void {
    const ChromaClient = chromadb.ChromaClient
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (ChromaClient?.prototype) {
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      const self = this

      // Store original methods if not already stored
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      if (!this.originalGetOrCreateCollection) {
        this.originalGetOrCreateCollection = ChromaClient.prototype.getOrCreateCollection
      }
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      if (!this.originalCreateCollection) {
        this.originalCreateCollection = ChromaClient.prototype.createCollection
      }
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      if (!this.originalGetCollection) {
        this.originalGetCollection = ChromaClient.prototype.getCollection
      }

      // Patch getOrCreateCollection
      ChromaClient.prototype.getOrCreateCollection = async function (...args: any[]) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        const collection = await self.originalGetOrCreateCollection.apply(this, args)
        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
        if (collection) {
          self._patchCollectionMethods(collection, moduleVersion)
        }
        return collection
      }

      // Patch createCollection
      ChromaClient.prototype.createCollection = async function (...args: any[]) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        const collection = await self.originalCreateCollection.apply(this, args)
        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
        if (collection) {
          self._patchCollectionMethods(collection, moduleVersion)
        }
        return collection
      }

      // Patch getCollection
      ChromaClient.prototype.getCollection = async function (...args: any[]) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        const collection = await self.originalGetCollection.apply(this, args)
        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
        if (collection) {
          self._patchCollectionMethods(collection, moduleVersion)
        }
        return collection
      }
    }
  }

  private _unpatch (chromadb: any): void {
    const ChromaClient = chromadb.ChromaClient
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (ChromaClient?.prototype) {
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      if (this.originalGetOrCreateCollection) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        ChromaClient.prototype.getOrCreateCollection = this.originalGetOrCreateCollection
      }
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      if (this.originalCreateCollection) {
        ChromaClient.prototype.createCollection = this.originalCreateCollection
      }
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      if (this.originalGetCollection) {
        ChromaClient.prototype.getCollection = this.originalGetCollection
      }
    }
  }
}

export const chromaInstrumentation = new ChromaInstrumentation()
