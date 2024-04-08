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

import { InstrumentationBase } from '@opentelemetry/instrumentation'
// eslint-disable-next-line no-restricted-imports
import { version, name } from '../../package.json'
export interface Patch {
  manualPatch: (module: any, moduleName: string) => void
  SetInstrumentations: (...instrumentations: Patch[]) => Patch
  SetNextInstrumentation: (instrumentation: Patch) => Patch
}

export abstract class LangtraceInstrumentationBase<T> extends InstrumentationBase<T> implements Patch {
  protected nextManualPatcher: Patch | undefined
  constructor () {
    super(name, version)
  }

  SetNextInstrumentation (instrumentation: Patch): Patch {
    this.nextManualPatcher = instrumentation
    return this
  }

  SetInstrumentations (...instrumentations: Patch[]): Patch {
    if (instrumentations.length > 0) {
      this.SetNextInstrumentation(instrumentations[0])
      for (let i = 0; i < instrumentations.length - 1; i++) {
        instrumentations[i].SetNextInstrumentation(instrumentations[i + 1])
      }
    }
    return this
  }

  manualPatch (module: any, moduleName: string): void {
    if (this.nextManualPatcher != null) {
      return this.nextManualPatcher.manualPatch(module, moduleName)
    }
    throw new Error('Manual patch not implemented')
  }
}
