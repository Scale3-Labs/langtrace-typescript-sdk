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
import { sendCommand } from '@langtrace-instrumentation/awsbedrock/patch'
// eslint-disable-next-line no-restricted-imports
import { version, name } from '../../../package.json'
class AWSBedrockInstrumentation extends InstrumentationBase<any> {
  constructor () {
    super(name, version)
  }

  public manualPatch (awsbedrock: any): void {
    diag.debug('Manually patching awsbedrock')
    this._patch(awsbedrock)
  }

  init (): Array<InstrumentationNodeModuleDefinition<any>> {
    const module = new InstrumentationNodeModuleDefinition<any>(
      '@aws-sdk/client-bedrock-runtime',
      ['>=3.668.0'],
      (moduleExports, moduleVersion) => {
        diag.debug(`Patching AWS Bedrock SDK version ${moduleVersion}`)
        this._patch(moduleExports, moduleVersion as string)
        return moduleExports
      },
      (moduleExports, moduleVersion) => {
        diag.debug(`Unpatching AWS Bedrock SDK version ${moduleVersion}`)
        if (moduleExports !== undefined) {
          this._unpatch(moduleExports)
        }
      }
    )

    return [module]
  }

  private _patch (awsbedrock: any, moduleVersion?: string): void {
    const wrapped = isWrapped(awsbedrock.BedrockRuntimeClient.prototype)
    if (wrapped) {
      this._unpatch(awsbedrock)
    }
    this._wrap(
      awsbedrock.BedrockRuntimeClient.prototype,
      'send',
      (originalMethod: (...args: any[]) => any) => {
        return sendCommand(originalMethod, this.tracer, this.instrumentationVersion, moduleVersion)
      }
    )

    // this._wrap(
    //   awsbedrock.BedrockRuntimeClient.prototype,
    //   'stream',
    //   (originalMethod: (...args: any[]) => any) => {
    //     return chatComplete(originalMethod, this.tracer, this.instrumentationVersion, moduleVersion, true)
    //   }
    // )

    // this._wrap(
    //   awsbedrock.Mistral.prototype.embeddings,
    //   'create',
    //   (originalMethod: (...args: any[]) => any) =>
    //     embeddingsCreate(originalMethod, this.tracer, this.instrumentationVersion, moduleVersion)
    // )
  }

  private _unpatch (awsbedrock: any): void {
    this._unwrap(awsbedrock.BedrockRuntimeClient.prototype, 'send')
  }
}

export const awsbedrockInstrumentation = new AWSBedrockInstrumentation()
