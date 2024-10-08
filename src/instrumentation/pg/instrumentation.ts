/* eslint-disable @typescript-eslint/no-var-requires */
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

import { InstrumentationBase, InstrumentationModuleDefinition, InstrumentationNodeModuleDefinition, isWrapped } from '@opentelemetry/instrumentation'
// eslint-disable-next-line no-restricted-imports
import { version, name } from '../../../package.json'
import { diag } from '@opentelemetry/api'
import { patchPgQuery } from '@langtrace-instrumentation/pg/patch'

class PgInstrumentation extends InstrumentationBase<any> {
  constructor () {
    super(name, version)
  }

  public manualPatch (pg: any): void {
    diag.debug('Manually instrumenting pg SDK')
    this._patch(pg)
  }

  init (): Array<InstrumentationModuleDefinition<any>> {
    const pg = new InstrumentationNodeModuleDefinition<any>(
      'pg',
      ['>=8.11.0'],
      (moduleExports, moduleVersion) => {
        diag.debug(`Patching pg SDK version ${moduleVersion}`)
        this._patch(moduleExports, moduleVersion as string)
        return moduleExports
      },
      (moduleExports, moduleVersion) => {
        diag.debug(`Unpatching pg SDK version ${moduleVersion}`)
        if (moduleExports !== undefined) {
          this._unpatch(moduleExports)
        }
      }
    )
    return [pg]
  }

  private _patch (module: any, moduleVersion?: string): void {
    if (isWrapped(module.Client.prototype)) {
      this._unpatch(module)
    }
    this._wrap(module.Client.prototype, 'query', (original) => {
      return patchPgQuery(original, this.tracer, name, version, moduleVersion)
    })
  }

  private _unpatch (module: any): void {
    this._unwrap(module.Client.prototype, 'query')
  }
}

export const pgInstrumentation = new PgInstrumentation()
