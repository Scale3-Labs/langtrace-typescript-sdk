/* eslint-disable no-prototype-builtins */
/* eslint-disable no-console */

/* eslint-disable no-restricted-imports */
import { diag } from '@opentelemetry/api'
import { InstrumentationBase, InstrumentationModuleDefinition, InstrumentationNodeModuleDefinition } from '@opentelemetry/instrumentation'
import { version, name } from '../../../package.json'
import { APIS } from '@langtrase/trace-attributes'
import { generateTextPatch } from './patch'
import _ from 'lodash'

class VercelAIInstrumentation extends InstrumentationBase<any> {
  patchedModule: any
  originalModule: any
  constructor () {
    super(name, version)
  }

  public manualPatch (vercelAI: any): void {
    diag.debug('Manually instrumenting vercel ai SDK')
    this._patch(vercelAI)
  }

  init (): Array<InstrumentationModuleDefinition<any>> {
    const module = new InstrumentationNodeModuleDefinition<any>(
      'ai',
      ['>= 0.3.3'],
      (moduleExports, moduleVersion) => {
        diag.debug(`Patching Vercel AI SDK version ${moduleVersion}`)
        this.originalModule = moduleExports
        const patchedModule = _.cloneDeep(moduleExports)
        this.patchedModule = patchedModule
        this._patch(patchedModule, moduleVersion)
        return patchedModule
      },
      (moduleExports, moduleVersion) => {
        diag.debug(`Unpatching Vercel AI SDK version ${moduleVersion}`)
        if (moduleExports !== undefined) {
          this._unpatch(this.patchedModule)
          return this.patchedModule
        }
      }
    )
    return [module]
  }

  private _patch (module: any, moduleVersion?: string): void {
    module.generateText = generateTextPatch.call(this, module.generateText as (...args: any[]) => any, APIS.ai.GENERATE_TEXT.METHOD, this.tracer, version, name, moduleVersion)
  }

  private _unpatch (module: any): void {
    module = Object.assign(module, this.originalModule)
  }
}

export const vercelAIInstrumentation = new VercelAIInstrumentation()
