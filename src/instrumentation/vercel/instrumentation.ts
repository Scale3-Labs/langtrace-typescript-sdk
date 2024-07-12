/* eslint-disable no-restricted-imports */
import { diag } from '@opentelemetry/api'
import { InstrumentationBase, InstrumentationModuleDefinition, InstrumentationNodeModuleDefinition } from '@opentelemetry/instrumentation'
import { version, name } from '../../../package.json'
import { APIS } from '@langtrase/trace-attributes'
import { generateTextPatch } from './patch'

class VercelAIInstrumentation extends InstrumentationBase<any> {
  constructor () {
    super(name, version)
  }

  public manualPatch (module: any): void {
    this._patch(module, version)
  }

  init (): Array<InstrumentationModuleDefinition<any>> {
    const module = new InstrumentationNodeModuleDefinition<any>(
      '../../module-wrappers/ai',
      ['*'],
      (moduleExports, moduleVersion) => {
        diag.debug(`Patching Vercel AI SDK version ${moduleVersion}`)
        this._patch(moduleExports, moduleVersion)
        return moduleExports
      },
      (moduleExports, moduleVersion) => {
        diag.debug(`Unpatching Vercel AI SDK version ${moduleVersion}`)
        if (moduleExports !== undefined) {
          this._unpatch(moduleExports)
        }
      }
    )
    return [module]
  }

  public _patch (moduleExports: any, moduleVersion?: string): any {
    this._wrap(moduleExports, 'generateText', (original: any) => generateTextPatch.call(this, original as (...args: any[]) => any, APIS.ai.GENERATE_TEXT.METHOD, this.tracer, version, name, moduleVersion))
  }

  public _unpatch (module: any): void {
    this._unwrap(module, 'generateText')
  }
}
export const vercelAIInstrumentation = new VercelAIInstrumentation()
