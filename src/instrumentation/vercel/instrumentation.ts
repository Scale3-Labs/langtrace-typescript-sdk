import { diag } from '@opentelemetry/api'
import { InstrumentationBase, InstrumentationModuleDefinition, InstrumentationNodeModuleDefinition } from '@opentelemetry/instrumentation'
/* eslint-disable no-restricted-imports */
import { version, name } from '../../../package.json'
import { APIS } from '@langtrase/trace-attributes'
import { embedPatch, generateTextPatch, streamTextPatch } from '@langtrace-instrumentation/vercel/patch'

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
    this._wrap(moduleExports, 'streamText', (original: any) => streamTextPatch.call(this, original as (...args: any[]) => any, APIS.ai.STREAM_TEXT.METHOD, this.tracer, version, name, moduleVersion))
    this._wrap(moduleExports, 'embed', (original: any) => embedPatch.call(this, original as (...args: any[]) => any, APIS.ai.EMBED.METHOD, this.tracer, version, name, moduleVersion))
    this._wrap(moduleExports, 'embedMany', (original: any) => embedPatch.call(this, original as (...args: any[]) => any, APIS.ai.EMBED_MANY.METHOD, this.tracer, version, name, moduleVersion))
  }

  public _unpatch (module: any): void {
    this._unwrap(module, 'generateText')
    this._unwrap(module, 'streamText')
    this._unwrap(module, 'embed')
    this._unwrap(module, 'embedMany')
  }
}
export const vercelAIInstrumentation = new VercelAIInstrumentation()
